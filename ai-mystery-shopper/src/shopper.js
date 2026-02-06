// src/shopper.js
const { chromium } = require('playwright');
const OpenAI = require('openai');
const FrictionEngine = require('./frictionEngine');
const fs = require('fs');
const path = require('path');
const sessionPath = path.join(__dirname, '../public/sessions', `session-${Date.now()}`);

class MysteryShopper {
    constructor(openaiApiKey) {
        this.openai = new OpenAI({ apiKey: openaiApiKey });
        this.frictionEngine = new FrictionEngine();
    }

    /**
     * The core loop: See -> Think -> Act
     */
    async runMission(url, goal) {
        const browser = await chromium.launch({ headless: false }); // Headless: false to watch it live
        const context = await browser.newContext();
        const page = await context.newPage();
        
        const sessionPath = path.join(__dirname, '../public/sessions', `session-${Date.now()}`);
        fs.mkdirSync(sessionPath, { recursive: true });

        const steps = [];
        let completed = false;
        let stepCount = 0;
        const MAX_STEPS = 15; // Safety limit

        try {
            console.log(`[Shopper] Starting mission: ${goal}`);
            await page.goto(url);
            
            while (!completed && stepCount < MAX_STEPS) {
                stepCount++;
                console.log(`[Shopper] Step ${stepCount}...`);

                // 1. VISUAL PERCEPTION: Take screenshot
                const screenshotBuffer = await page.screenshot();
                const base64Image = screenshotBuffer.toString('base64');

                // 2. COGNITION: Ask AI what to do
                const aiDecision = await this.analyzePage(base64Image, goal, steps);
                
                // Save screenshot for frontend replay
                fs.writeFileSync(path.join(sessionPath, `step-${stepCount}.png`), screenshotBuffer);

                // 3. EMOTIONAL ENGINE LOGGING
                this.frictionEngine.logEvent('ai_thought', {
                    thought: aiDecision.reasoning,
                    aiFrustrationLevel: aiDecision.frustration_level // 1-10
                });

                steps.push({
                    step: stepCount,
                    action: aiDecision.action,
                    reasoning: aiDecision.reasoning,
                    image: `step-${stepCount}.png`
                });

                // 4. ACTION EXECUTION
                if (aiDecision.action === 'finish') {
                    console.log("[Shopper] Mission accomplished or abandoned.");
                    completed = true;
                    break;
                }

                await this.executeAction(page, aiDecision);
                
                // Wait briefly for UI to settle
                await page.waitForTimeout(2000);
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
            Analyze the screenshot of the website.
            
            Return a JSON object ONLY:
            {
                "action": "click" | "type" | "scroll" | "finish",
                "selector": "visual description or text of element to interact with",
                "text": "text to type (if action is type)",
                "reasoning": "Brief thought process",
                "frustration_level": 0-10 (How confused/annoyed are you based on UI clarity?)
            }
        `;

        const response = await this.openai.chat.completions.create({
            model: "gpt-4o",
            messages: [
                { role: "system", content: systemPrompt },
                { 
                    role: "user", 
                    content: [
                        { type: "text", text: `Current Goal: ${goal}. Previous actions: ${JSON.stringify(history.slice(-2))}` },
                        { type: "image_url", image_url: { url: `data:image/png;base64,${base64Image}` } }
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
        
        try {
            if (decision.action === 'click') {
                // Try multiple ways to find the element the AI is talking about
                const locators = [
                    page.getByRole('button', { name: decision.selector, exact: false }),
                    page.getByText(decision.selector, { exact: false }),
                    page.locator(`button:has-text("${decision.selector}")`),
                    page.locator(`a:has-text("${decision.selector}")`),
                    page.locator(`[aria-label*="${decision.selector}" i]`)
                ];

                let clicked = false;
                for (const l of locators) {
                    if (await l.count() > 0 && await l.first().isVisible()) {
                        await l.first().click();
                        clicked = true;
                        break;
                    }
                }
                if (!clicked) throw new Error(`Could not find clickable element: ${decision.selector}`);
                this.frictionEngine.logEvent('navigation', { url: page.url() });
            } 
            
            else if (decision.action === 'type') {
                // Try to find the best input field
                const locators = [
                    page.getByRole('textbox'),
                    page.locator('input[type="text"]'),
                    page.locator('input[type="search"]'),
                    page.locator(`[placeholder*="${decision.selector}" i]`),
                    page.locator(`[aria-label*="${decision.selector}" i]`)
                ];

                let typed = false;
                for (const l of locators) {
                    if (await l.count() > 0 && await l.first().isVisible()) {
                        await l.first().fill(decision.text);
                        await page.keyboard.press('Enter'); // Standard behavior after typing a search
                        typed = true;
                        break;
                    }
                }
                if (!typed) throw new Error(`Could not find input field for: ${decision.selector}`);
            } 
            
            else if (decision.action === 'scroll') {
                await page.mouse.wheel(0, 600);
            }
        } catch (e) {
            console.log(`[Action Failed] ${e.message}`);
            this.frictionEngine.logEvent('ui_error', { target: decision.selector, error: e.message });
            
            // Critical: If we can't find the element, the "Confusion Score" should go up!
            this.frictionEngine.logEvent('hesitation', { detail: `AI struggled to find ${decision.selector}` });
        }
    }
}
module.exports = MysteryShopper;