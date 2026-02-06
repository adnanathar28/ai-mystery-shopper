// src/shopper.js
const { chromium, devices } = require('playwright');
const OpenAI = require('openai');
const FrictionEngine = require('./frictionEngine');
const fs = require('fs');
const path = require('path');

// Persistent User Data (saves cookies/local storage to mimic real user)
const USER_DATA_DIR = path.join(__dirname, '../public/user_data');

class MysteryShopper {
    constructor(openaiApiKey) {
        this.openai = new OpenAI({ apiKey: openaiApiKey });
        this.frictionEngine = new FrictionEngine();
    }

    async runMission(url, goal) {
        // 1. CONFIGURE MOBILE DEVICE (iPhone 13)
        const mobileDevice = devices['iPhone 13']; 
        
        console.log(`[Shopper] Launching in Mobile Mode (${mobileDevice.userAgent})`);

        const context = await chromium.launchPersistentContext(USER_DATA_DIR, {
            headless: false,
            channel: 'chrome', // Uses your installed Chrome if available
            args: [
                '--disable-blink-features=AutomationControlled',
                '--no-sandbox',
                // --- POPUP BLOCKERS (The Fix for your Screenshot) ---
                '--disable-features=PasswordLeakDetection', // Stops "Password found in breach"
                '--disable-save-password-bubble',           // Stops "Save password?"
                '--deny-permission-prompts',                // Stops "Allow Notifications?"
                '--disable-infobars',
                // ----------------------------------------------------
            ],
            ...mobileDevice, // INJECT MOBILE VIEWPORT & USER AGENT
            recordVideo: { dir: path.join(__dirname, '../public/sessions/videos') } // Video evidence
        });

        const page = context.pages().length > 0 ? context.pages()[0] : await context.newPage();
        
        // 2. SETUP DIAGNOSIS LISTENERS (With Noise Filtering)
        const sessionLogs = { errors: [], console: [] };
        
        page.on('response', response => {
            const status = response.status();
            const url = response.url();
            
            // --- NOISE FILTER: Ignore analytics that often throw 401s ---
            if (url.includes('backtrace.io') || 
                url.includes('google-analytics') || 
                url.includes('segment.io') ||
                url.includes('doubleclick')) {
                return;
            }

            if (status >= 400) {
                console.log(`[Network Error] ${status} at ${url}`);
                sessionLogs.errors.push({ status, url });
            }
        });

        page.on('console', msg => {
            if (msg.type() === 'error') {
                sessionLogs.console.push(msg.text());
            }
        });

        const sessionPath = path.join(__dirname, '../public/sessions', `session-${Date.now()}`);
        fs.mkdirSync(sessionPath, { recursive: true });

        const steps = [];
        let completed = false;
        let stepCount = 0;
        const MAX_STEPS = 15;

        try {
            console.log(`[Shopper] Navigating to: ${url}`);
            await page.goto(url, { waitUntil: 'domcontentloaded' });
            
            while (!completed && stepCount < MAX_STEPS) {
                stepCount++;
                console.log(`[Shopper] Step ${stepCount}...`);
                await page.waitForTimeout(2000); // Wait for animations/loading

                const screenshotBuffer = await page.screenshot({ type: 'jpeg', quality: 60 });
                const base64Image = screenshotBuffer.toString('base64');

                // 3. ANALYZE WITH LOGS
                const recentLogs = {
                    networkErrors: sessionLogs.errors.slice(-3), // Last 3 errors
                    consoleErrors: sessionLogs.console.slice(-3)
                };

                const aiDecision = await this.analyzePage(base64Image, goal, steps, recentLogs);
                
                // --- CRITICAL CRASH FIX: Check if AI returned null ---
                if (!aiDecision) {
                    console.log("⚠️ AI returned empty response. Retrying step...");
                    // Decrement step count so we don't burn a turn
                    stepCount--; 
                    continue; 
                }

                fs.writeFileSync(path.join(sessionPath, `step-${stepCount}.jpg`), screenshotBuffer);

                // Log to Friction Engine
                this.frictionEngine.logEvent('ai_thought', {
                    thought: aiDecision.reasoning,
                    aiFrustrationLevel: aiDecision.frustration_level,
                    diagnosis: aiDecision.diagnosis, // e.g., "Backend 500", "UX Confusion"
                    severity: aiDecision.severity // e.g., "Critical", "Low"
                });

                steps.push({
                    step: stepCount,
                    action: aiDecision.action,
                    reasoning: aiDecision.reasoning
                });

                if (aiDecision.action === 'finish') {
                    console.log("[Shopper] Mission Accomplished.");
                    completed = true;
                    break;
                }

                if (aiDecision.diagnosis === 'CRITICAL_FAILURE' || aiDecision.severity === 'Critical') {
                    console.log("🚨 AGENT ABORTING: Critical Technical Failure Detected");
                    break;
                }

                await this.executeAction(page, aiDecision);
            }

        } catch (error) {
            console.error("[Shopper] Critical Error:", error);
            this.frictionEngine.logEvent('error', { message: error.message });
        } finally {
            await context.close(); 
        }

        return this.frictionEngine.getReport();
    }

    async analyzePage(base64Image, goal, history, logs) {
        const systemPrompt = `
            You are an AI Mystery Shopper on an iPhone 13. Goal: "${goal}".
            
            INPUT CONTEXT:
            - Network Errors: ${JSON.stringify(logs.networkErrors)}
            - Console Errors: ${JSON.stringify(logs.consoleErrors)}
            
            YOUR JOB:
            1. Analyze the UI screenshot and the technical logs.
            2. Decide the next action.
            3. DIAGNOSE the state of the app.
            
            JSON OUTPUT FORMAT:
            {
                "action": "click" | "type" | "scroll" | "finish",
                "selector": "visual text or description",
                "text": "string (if type)",
                "reasoning": "Brief thought process.",
                "frustration_level": 0-10,
                "diagnosis": "Healthy" | "Backend Error" | "Frontend Crash" | "UX Confusion" | "CRITICAL_FAILURE",
                "severity": "None" | "Low" | "Medium" | "High" | "Critical"
            }
            
            RULES:
            - If you see a 500 error in logs, diagnosis = "Backend Error", severity = "Critical".
            - If you are stuck in a loop, diagnosis = "UX Confusion".
            - "scroll" moves the page down to see more products.
            - Ignore small console warnings.
        `;

        try {
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
                max_tokens: 400
            });

            return JSON.parse(response.choices[0].message.content);
        } catch (e) {
            console.error("AI Analysis Failed:", e.message);
            return null; // Return null so the main loop can handle it
        }
    }

    async executeAction(page, decision) {
        console.log(`[Action] ${decision.action} on "${decision.selector}"`);
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
            // --- SCROLL LOGIC ---
            if (decision.action === 'scroll') {
                // Simulate a finger swipe up (scrolling down)
                // 600px is roughly one screen height on mobile
                await page.mouse.wheel(0, 600);
                await page.waitForTimeout(1000); 
                return;
            }

            if (decision.action === 'click') {
                const strategies = [
                    (p) => p.getByRole('button', { name: cleanSelector, exact: false }),
                    (p) => p.getByRole('link', { name: cleanSelector, exact: false }),
                    (p) => p.getByText(decision.selector, { exact: true }),
                    (p) => p.getByLabel(cleanSelector),
                    (p) => p.locator(`[aria-label*="${cleanSelector}" i]`),
                    (p) => p.getByText(cleanSelector, { exact: false }),
                    // Fallback for cart icons/images
                    (p) => p.locator('.shopping_cart_link'),
                    (p) => p.locator('img[alt*="cart"]'), 
                ];

                let success = false;
                for (const strat of strategies) {
                    const el = await findInFrames(strat);
                    if (el) {
                        await el.click({ timeout: 1500 });
                        success = true;
                        break;
                    }
                }
                if (!success) throw new Error(`Could not click "${decision.selector}"`);
            } 
            
            else if (decision.action === 'type') {
                const strategies = [
                    (p) => p.getByPlaceholder(cleanSelector, { exact: false }),
                    (p) => p.getByLabel(cleanSelector, { exact: false }),
                    (p) => p.locator(`input[name="q"]`), 
                    (p) => p.locator('input[type="search"]'),
                    (p) => p.locator('textarea[name="q"]'),
                    (p) => p.getByRole('textbox')
                ];

                let success = false;
                for (const strat of strategies) {
                    const el = await findInFrames(strat);
                    if (el) {
                        const isEditable = await el.evaluate(e => e.isContentEditable || ['INPUT', 'TEXTAREA'].includes(e.tagName));
                        
                        if (isEditable) {
                            await el.fill(decision.text);
                            await page.keyboard.press('Enter');
                            success = true;
                            break;
                        } 
                    }
                }
                if (!success) throw new Error(`Could not type into "${decision.selector}"`);
            }
        } catch (e) {
            console.log(`[Action Failed] ${e.message}`);
            this.frictionEngine.logEvent('ui_error', { target: decision.selector });
        }
    }
}

module.exports = MysteryShopper;