// src/shopper.js
const { chromium } = require('playwright-extra');
const stealth = require('puppeteer-extra-plugin-stealth')();
chromium.use(stealth);

const OpenAI = require('openai');
const FrictionEngine = require('./frictionEngine');
const fs = require('fs');
const path = require('path');

// NEW: Persistent User Data Directory (Saves Cookies/CAPTCHA solutions)
const USER_DATA_DIR = path.join(__dirname, '../public/user_data');

class MysteryShopper {
    constructor(openaiApiKey) {
        this.openai = new OpenAI({ apiKey: openaiApiKey });
        this.frictionEngine = new FrictionEngine();
    }

    async runMission(url, goal) {
        // 1. LAUNCH WITH PERSISTENCE
        // We use launchPersistentContext so cookies/localstorage are saved.
        // This stops Google from thinking we are a new bot every time.
        const context = await chromium.launchPersistentContext(USER_DATA_DIR, {
            headless: false,
            channel: 'chrome', // Use real Chrome if available, otherwise Chromium
            args: [
                '--disable-blink-features=AutomationControlled',
                '--start-maximized',
                '--no-sandbox'
            ],
            viewport: null, // Let browser decide (looks more human)
        });

        const page = context.pages().length > 0 ? context.pages()[0] : await context.newPage();
        
        // Setup session folder
        const sessionPath = path.join(__dirname, '../public/sessions', `session-${Date.now()}`);
        fs.mkdirSync(sessionPath, { recursive: true });

        const steps = [];
        let completed = false;
        let stepCount = 0;
        const MAX_STEPS = 15;

        try {
            console.log(`[Shopper] Starting mission: ${goal}`);
            await page.goto(url, { waitUntil: 'domcontentloaded' });
            
            while (!completed && stepCount < MAX_STEPS) {
                stepCount++;
                console.log(`[Shopper] Step ${stepCount}...`);
                await page.waitForTimeout(1500); // Slight human pause

                // Snapshot
                const screenshotBuffer = await page.screenshot({ type: 'jpeg', quality: 60 });
                const base64Image = screenshotBuffer.toString('base64');

                // AI Reasoning
                const aiDecision = await this.analyzePage(base64Image, goal, steps);
                
                fs.writeFileSync(path.join(sessionPath, `step-${stepCount}.jpg`), screenshotBuffer);

                // Log Thought
                this.frictionEngine.logEvent('ai_thought', {
                    thought: aiDecision.reasoning,
                    aiFrustrationLevel: aiDecision.frustration_level
                });

                steps.push({
                    step: stepCount,
                    action: aiDecision.action,
                    reasoning: aiDecision.reasoning
                });

                if (aiDecision.action === 'finish') {
                    console.log("[Shopper] Mission accomplished.");
                    completed = true;
                    break;
                }

                // CHECK FOR CAPTCHA
                if (aiDecision.selector.toLowerCase().includes('captcha')) {
                    console.log("🚨 CAPTCHA DETECTED! Pausing 20s for manual fix...");
                    await page.waitForTimeout(20000); 
                    // After manual fix, we assume we can continue
                } else {
                    await this.executeAction(page, aiDecision);
                }
            }

        } catch (error) {
            console.error("[Shopper] Critical Error:", error);
            this.frictionEngine.logEvent('error', { message: error.message });
        } finally {
            // Do NOT close context immediately if you want to keep the session alive for debugging
            // But for the script, we close it to save the profile.
            await context.close(); 
        }

        return this.frictionEngine.getReport();
    }

    async analyzePage(base64Image, goal, history) {
        const systemPrompt = `
            You are an AI Mystery Shopper. Goal: "${goal}".
            
            GUIDELINES:
            1. Look at the UI. If you see a Pop-up or CAPTCHA, deal with it.
            2. "selector": Visual text (e.g., "Search", "Sign In").
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
            model: "gpt-4o-mini",
            messages: [
                { role: "system", content: systemPrompt },
                { 
                    role: "user", 
                    content: [
                        { type: "text", text: `Goal: ${goal}. Last Actions: ${JSON.stringify(history.slice(-2))}` },
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

        // HELPER: Find element across all frames (reCAPTCHA support)
        const findInFrames = async (locatorFn) => {
            let loc = locatorFn(page);
            if (await loc.count() > 0 && await loc.first().isVisible()) return loc.first();
            for (const frame of page.frames()) {
                try {
                    loc = locatorFn(frame);
                    if (await loc.count() > 0 && await loc.first().isVisible()) return loc.first();
                } catch(e) {}
            }
            return null;
        };

        try {
            if (decision.action === 'click') {
                const strategies = [
                    (p) => p.getByRole('button', { name: cleanSelector, exact: false }),
                    (p) => p.getByRole('link', { name: cleanSelector, exact: false }),
                    (p) => p.getByText(decision.selector, { exact: true }),
                    (p) => p.getByLabel(cleanSelector),
                    (p) => p.locator(`[aria-label*="${cleanSelector}" i]`),
                    (p) => p.getByText(cleanSelector, { exact: false }),
                ];

                let success = false;
                for (const strat of strategies) {
                    const el = await findInFrames(strat);
                    if (el) {
                        await el.click({ timeout: 1500 }); // Fast timeout
                        success = true;
                        break;
                    }
                }
                if (!success) throw new Error(`Could not click "${decision.selector}"`);
            } 
            
            else if (decision.action === 'type') {
                // STRICT FILTERING: Only accept actual input fields
                // This prevents the "Images Link" crash
                const strategies = [
                    (p) => p.getByPlaceholder(cleanSelector, { exact: false }),
                    (p) => p.getByLabel(cleanSelector, { exact: false }),
                    (p) => p.locator(`input[name="q"]`), // Google specific fallback
                    (p) => p.locator('input[type="search"]'),
                    (p) => p.locator('textarea[name="q"]'),
                    (p) => p.getByRole('textbox')
                ];

                let success = false;
                for (const strat of strategies) {
                    const el = await findInFrames(strat);
                    if (el) {
                        // CRITICAL CHECK: Is it actually an input?
                        const tagName = await el.evaluate(e => e.tagName);
                        const isEditable = await el.evaluate(e => e.isContentEditable || ['INPUT', 'TEXTAREA'].includes(e.tagName));
                        
                        if (isEditable) {
                            await el.fill(decision.text);
                            await page.keyboard.press('Enter');
                            success = true;
                            break;
                        } else {
                            // If we found a label but it's a Link (<a>), ignore it and continue loop
                            console.log(`Skipping non-input element: ${tagName}`);
                        }
                    }
                }
                if (!success) throw new Error(`Could not type into "${decision.selector}"`);
            }
        } catch (e) {
            console.log(`[Action Failed] ${e.message}`);
            // Don't throw full error to keep agent alive, but log friction
            this.frictionEngine.logEvent('ui_error', { target: decision.selector });
        }
    }
}

module.exports = MysteryShopper;