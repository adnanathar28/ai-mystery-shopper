// src/shopper.js
const { chromium, devices } = require('playwright');
const OpenAI = require('openai');
const FrictionEngine = require('./frictionEngine');
const fs = require('fs');
const path = require('path');

const USER_DATA_DIR = path.join(__dirname, '../public/user_data');

class MysteryShopper {
    constructor(openaiApiKey) {
        this.openai = new OpenAI({ apiKey: openaiApiKey });
        this.frictionEngine = new FrictionEngine();
    }

    async runMission(url, goal) {
        const mobileDevice = devices['iPhone 13']; 
        const timestamp = Date.now();
        const sessionDirName = `session-${timestamp}`;
        const sessionPath = path.join(__dirname, '../public/sessions', sessionDirName);
        fs.mkdirSync(sessionPath, { recursive: true });

        console.log(`[Shopper] Launching Universal Mobile Agent (${mobileDevice.userAgent})`);

        // 1. UNIVERSAL BROWSER HARDENING
        // These flags prevent "Chrome is being controlled" banners, password popups, 
        // and security warnings that block automation on ANY site.
        const context = await chromium.launchPersistentContext(USER_DATA_DIR, {
            headless: false,
            channel: 'chrome',
            args: [
                '--disable-blink-features=AutomationControlled',
                '--no-sandbox',
                '--disable-infobars',
                '--disable-features=IsolateOrigins,site-per-process,PasswordLeakDetection,SafeBrowsingProtectionLevelToEnhanced,ExtensionsToolbarMenu',
                '--disable-save-password-bubble',
                '--deny-permission-prompts',
                '--disable-popup-blocking',
                '--disable-password-manager-reauthentication',
                '--password-store=basic', 
            ],
            ...mobileDevice,
            recordVideo: { 
                dir: sessionPath,
                size: { width: 390, height: 844 } // Standard Mobile Viewport
            } 
        });

        const page = context.pages().length > 0 ? context.pages()[0] : await context.newPage();
        
        // Universal Noise Filter (Blocks common analytics that clutter logs)
        const sessionLogs = { errors: [], console: [] };
        page.on('response', response => {
            const url = response.url();
            // Block common trackers to keep "Network Errors" clean
            if (url.match(/backtrace|google-analytics|segment|doubleclick|facebook|newrelic/)) return;
            
            if (response.status() >= 400) {
                sessionLogs.errors.push({ status: response.status(), url });
            }
        });
        page.on('console', msg => {
            if (msg.type() === 'error') sessionLogs.console.push(msg.text());
        });

        const steps = [];
        let completed = false;
        let stepCount = 0;
        const MAX_STEPS = 15;
        let lastScreenshot = ""; 

        try {
            console.log(`[Shopper] Navigating to target: ${url}`);
            await page.goto(url, { waitUntil: 'domcontentloaded' });
            
            while (!completed && stepCount < MAX_STEPS) {
                stepCount++;
                console.log(`\n--- Step ${stepCount} ---`);
                await page.waitForTimeout(2000); 

                const screenshotBuffer = await page.screenshot({ type: 'jpeg', quality: 60 });
                const base64Image = screenshotBuffer.toString('base64');
                fs.writeFileSync(path.join(sessionPath, `step-${stepCount}.jpg`), screenshotBuffer);

                // Universal Visual Loop Detection
                if (base64Image === lastScreenshot) {
                    console.log("⚠️ Visual Warning: Viewport static since last step.");
                }
                lastScreenshot = base64Image;

                const recentLogs = {
                    networkErrors: sessionLogs.errors.slice(-3),
                    consoleErrors: sessionLogs.console.slice(-3)
                };

                const aiDecision = await this.analyzePage(base64Image, goal, steps, recentLogs);
                
                if (!aiDecision) {
                    console.log("⚠️ AI glitch. Retrying step...");
                    stepCount--; 
                    continue; 
                }

                // Live Feedback
                console.log(`🧠 Thought: "${aiDecision.reasoning}"`);
                console.log(`👉 Action: ${aiDecision.action} on "${aiDecision.selector}"`);
                if (aiDecision.diagnosis !== 'Healthy') {
                     console.log(`🩺 Diagnosis: ${aiDecision.diagnosis} [${aiDecision.severity}]`);
                }

                this.frictionEngine.logEvent('ai_thought', {
                    thought: aiDecision.reasoning,
                    aiFrustrationLevel: aiDecision.frustration_level,
                    diagnosis: aiDecision.diagnosis,
                    severity: aiDecision.severity
                });

                steps.push({ step: stepCount, ...aiDecision });

                if (aiDecision.action === 'finish') {
                    console.log("[Shopper] Goal Achieved.");
                    completed = true;
                    break;
                }
                if (aiDecision.diagnosis === 'CRITICAL_FAILURE' || aiDecision.severity === 'Critical') {
                    console.log("🚨 ABORT: Critical Failure Detected");
                    break;
                }

                await this.executeAction(page, aiDecision);
            }

        } catch (error) {
            console.error("[Shopper] System Error:", error);
            this.frictionEngine.logEvent('error', { message: error.message });
        } finally {
            await context.close(); 
            
            // Standardize video filename
            const videoFiles = fs.readdirSync(sessionPath).filter(f => f.endsWith('.webm'));
            if (videoFiles.length > 0) {
                const oldPath = path.join(sessionPath, videoFiles[0]);
                const newPath = path.join(sessionPath, 'recording.webm');
                fs.renameSync(oldPath, newPath);
                console.log(`[Evidence] Video saved.`);
            }
        }

        const report = this.frictionEngine.getReport();
        report.videoUrl = `/sessions/${sessionDirName}/recording.webm`;
        return report;
    }

    async analyzePage(base64Image, goal, history, logs) {
        // 2. UNIVERSAL SYSTEM PROMPT
        // This teaches the AI general navigation principles, not specific site rules.
        const systemPrompt = `
            You are an AI QA Agent simulating a user on an iPhone 13. 
            GOAL: "${goal}".
            
            INPUT CONTEXT:
            - Recent 500/400 Errors: ${JSON.stringify(logs.networkErrors)}
            
            YOUR JOB:
            1. Analyze the Screenshot & Logs.
            2. Determine the next logical interaction.
            
            UNIVERSAL NAVIGATION STRATEGIES:
            - **Ambiguity**: If you see multiple generic buttons (e.g. "Add", "Select", "More"), DO NOT click them directly. Instead, click the **Unique Title or Header** of the item you want. This is safer.
            - **Scrolling**: If you need to find something not visible, "scroll". If the view doesn't change after scrolling, you are at the bottom.
            - **Forms**: If you see a login/signup form, click the input field before typing.
            
            DIAGNOSIS RULES:
            - **Backend Error**: 500-level network errors = Critical Severity.
            - **UX Confusion**: If you are repeating the same action (looping) or cannot find an element that *should* be there -> High Severity.
            
            OUTPUT JSON ONLY:
            {
                "action": "click" | "type" | "scroll" | "finish",
                "selector": "brief visual description or text",
                "text": "string (if action is type)",
                "reasoning": "Why are you doing this?",
                "frustration_level": 0-10,
                "diagnosis": "Healthy" | "Backend Error" | "UX Confusion" | "CRITICAL_FAILURE",
                "severity": "None" | "Low" | "Medium" | "High" | "Critical"
            }
        `;
        try {
            const response = await this.openai.chat.completions.create({
                model: "gpt-4o", 
                messages: [
                    { role: "system", content: systemPrompt },
                    { role: "user", content: [
                        { type: "text", text: `Goal: ${goal}. History: ${JSON.stringify(history.slice(-2))}` },
                        { type: "image_url", image_url: { url: `data:image/jpeg;base64,${base64Image}` } }
                    ]}
                ],
                response_format: { type: "json_object" },
                max_tokens: 400
            });
            return JSON.parse(response.choices[0].message.content);
        } catch (e) { return null; }
    }

    async executeAction(page, decision) {
        const cleanSelector = decision.selector.replace(/button|input|field|link|bar|icon/gi, '').trim();
        
        // Universal Frame Finder (Finds elements even inside iFrames)
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
            if (decision.action === 'scroll') {
                const startY = await page.evaluate(() => window.scrollY);
                await page.mouse.wheel(0, 600); // Standard mobile swipe
                await page.waitForTimeout(1000); 
                const endY = await page.evaluate(() => window.scrollY);
                if (Math.abs(startY - endY) < 10) console.log("   -> (Scroll reached end of page)");
                return;
            }

            if (decision.action === 'click') {
                // Universal Click Strategy: Try Specific -> Generic
                const strategies = [
                    (p) => p.getByRole('button', { name: cleanSelector, exact: false }),
                    (p) => p.getByRole('link', { name: cleanSelector, exact: false }),
                    (p) => p.getByText(decision.selector, { exact: true }), // Strict text match
                    (p) => p.locator(`[aria-label*="${cleanSelector}" i]`), // Accessibility label
                    (p) => p.getByText(cleanSelector, { exact: false }), // Fuzzy text match
                    (p) => p.locator(`img[alt*="${cleanSelector}" i]`), // Image alt text
                ];

                let success = false;
                for (const strat of strategies) {
                    const el = await findInFrames(strat);
                    if (el) { await el.click({ timeout: 1500 }); success = true; break; }
                }
                if (!success) throw new Error(`Element not found: "${decision.selector}"`);
            } 
            else if (decision.action === 'type') {
                const strategies = [
                    (p) => p.getByPlaceholder(cleanSelector, { exact: false }),
                    (p) => p.getByLabel(cleanSelector, { exact: false }),
                    (p) => p.getByRole('textbox', { name: cleanSelector, exact: false }),
                    (p) => p.locator('input[type="search"]'),
                    (p) => p.locator('input').first() // Fallback: First input if specific fails
                ];

                let success = false;
                for (const strat of strategies) {
                    const el = await findInFrames(strat);
                    if (el) { 
                        await el.fill(decision.text); 
                        await page.keyboard.press('Enter'); 
                        success = true; 
                        break; 
                    }
                }
                if (!success) throw new Error(`Input field not found: "${decision.selector}"`);
            }
        } catch (e) {
            console.log(`   -> [Action Failed] ${e.message}`);
            this.frictionEngine.logEvent('ui_error', { target: decision.selector });
        }
    }
}

module.exports = MysteryShopper;