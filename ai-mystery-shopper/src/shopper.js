// src/shopper.js
const { chromium } = require('playwright-extra'); // CHANGED: Use playwright-extra
const stealth = require('puppeteer-extra-plugin-stealth')(); // ADDED: Stealth plugin
chromium.use(stealth);

const OpenAI = require('openai');
const FrictionEngine = require('./frictionEngine');
const fs = require('fs');
const path = require('path');

class MysteryShopper {
    constructor(openaiApiKey) {
        this.openai = new OpenAI({ apiKey: openaiApiKey });
        this.frictionEngine = new FrictionEngine();
    }

    async runMission(url, goal) {
        // Launch with specific args to mimic a real user
        const browser = await chromium.launch({ 
            headless: false,
            args: ['--disable-blink-features=AutomationControlled'] // Extra stealth
        });
        
        const context = await browser.newContext({
            userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
            viewport: { width: 1280, height: 720 }
        });
        
        const page = await context.newPage();
        const sessionPath = path.join(__dirname, '../public/sessions', `session-${Date.now()}`);
        fs.mkdirSync(sessionPath, { recursive: true });

        const steps = [];
        let completed = false;
        let stepCount = 0;
        const MAX_STEPS = 15;

        try {
            console.log(`[Shopper] Starting mission: ${goal}`);
            await page.goto(url);
            
            while (!completed && stepCount < MAX_STEPS) {
                stepCount++;
                console.log(`[Shopper] Step ${stepCount}...`);

                // Wait a bit for potential animations/popups
                await page.waitForTimeout(2000);

                const screenshotBuffer = await page.screenshot({ type: 'jpeg', quality: 70 });
                const base64Image = screenshotBuffer.toString('base64');

                const aiDecision = await this.analyzePage(base64Image, goal, steps);
                
                fs.writeFileSync(path.join(sessionPath, `step-${stepCount}.jpg`), screenshotBuffer);

                this.frictionEngine.logEvent('ai_thought', {
                    thought: aiDecision.reasoning,
                    aiFrustrationLevel: aiDecision.frustration_level
                });

                steps.push({
                    step: stepCount,
                    action: aiDecision.action,
                    reasoning: aiDecision.reasoning,
                    image: `step-${stepCount}.jpg`
                });

                if (aiDecision.action === 'finish') {
                    console.log("[Shopper] Mission accomplished or abandoned.");
                    completed = true;
                    break;
                }

                // CHECK FOR CAPTCHA BEFORE ACTING
                if (aiDecision.selector.toLowerCase().includes('captcha') || 
                    aiDecision.selector.toLowerCase().includes('robot')) {
                    console.log("🚨 CAPTCHA DETECTED! Pausing for 15 seconds for manual intervention...");
                    // In a hackathon demo, this allows you to solve it manually if Stealth fails
                    await page.waitForTimeout(15000); 
                } else {
                    await this.executeAction(page, aiDecision);
                }
            }

        } catch (error) {
            console.error("[Shopper] Critical Error:", error);
            this.frictionEngine.logEvent('error', { message: error.message });
        } finally {
            await browser.close();
        }

        return this.frictionEngine.getReport();
    }

    async analyzePage(base64Image, goal, history) {
        const systemPrompt = `
            You are an AI Mystery Shopper. Your goal is: "${goal}".
            Analyze the screenshot.
            
            GUIDELINES:
            1. If you see a CAPTCHA or "I'm not a robot" checkbox, set selector to "CAPTCHA".
            2. "selector": Short visual text (e.g., "Search", "Sign In").
            3. "action": "type", "click", "scroll".
            
            Return JSON ONLY:
            {
                "action": "click" | "type" | "scroll" | "finish",
                "selector": "string",
                "text": "string (if type)",
                "reasoning": "string",
                "frustration_level": 0-10
            }
        `;

        const response = await this.openai.chat.completions.create({
            model: "gpt-4o",
            messages: [
                { role: "system", content: systemPrompt },
                { 
                    role: "user", 
                    content: [
                        { type: "text", text: `Goal: ${goal}. History: ${JSON.stringify(history.slice(-2))}` },
                        { type: "image_url", image_url: { url: `data:image/jpeg;base64,${base64Image}` } }
                    ] 
                }
            ],
            response_format: { type: "json_object" },
            max_tokens: 300
        });

        return JSON.parse(response.choices[0].message.content);
    }

    async executeAction(page, decision) {
        console.log(`[Action] Attempting ${decision.action} on "${decision.selector}"`);
        const cleanSelector = decision.selector.replace(/button|input|field|link|bar|icon/gi, '').trim();

        try {
            // Helper to search Main Page AND all Iframes
            const findInAllFrames = async (locatorFn) => {
                // Try main page first
                let loc = locatorFn(page);
                if (await loc.count() > 0 && await loc.first().isVisible()) return loc.first();

                // Try all frames (reCAPTCHA lives here)
                for (const frame of page.frames()) {
                    try {
                        loc = locatorFn(frame);
                        if (await loc.count() > 0 && await loc.first().isVisible()) return loc.first();
                    } catch (e) { /* ignore detached frames */ }
                }
                return null;
            };

            if (decision.action === 'click') {
                // Modified Waterfall with Frame Support
                const strategies = [
                    (p) => p.getByText(decision.selector, { exact: true }),
                    (p) => p.getByLabel(cleanSelector),
                    (p) => p.getByTitle(cleanSelector),
                    (p) => p.locator(`[aria-label*="${cleanSelector}" i]`),
                    (p) => p.getByRole('checkbox', { name: cleanSelector }), // Checkboxes specifically
                    (p) => p.getByText(cleanSelector, { exact: false }),
                ];

                let clicked = false;
                for (const strat of strategies) {
                    const element = await findInAllFrames(strat);
                    if (element) {
                        await element.click({ timeout: 2000 });
                        clicked = true;
                        break;
                    }
                }
                if (!clicked) throw new Error(`Element "${decision.selector}" not found in any frame.`);
                
            } else if (decision.action === 'type') {
                const strategies = [
                    (p) => p.getByPlaceholder(cleanSelector, { exact: false }),
                    (p) => p.getByLabel(cleanSelector, { exact: false }),
                    (p) => p.locator(`input[aria-label*="${cleanSelector}" i]`),
                    (p) => p.locator('input[type="search"]'),
                    (p) => p.getByRole('textbox')
                ];

                let typed = false;
                for (const strat of strategies) {
                    const element = await findInAllFrames(strat);
                    if (element) {
                        await element.fill(decision.text);
                        await page.keyboard.press('Enter');
                        typed = true;
                        break;
                    }
                }
                if (!typed) throw new Error(`Input "${decision.selector}" not found.`);
            }
        } catch (e) {
            console.log(`[Action Failed] ${e.message}`);
            this.frictionEngine.logEvent('ui_error', { target: decision.selector, error: e.message });
        }
    }
}

module.exports = MysteryShopper;