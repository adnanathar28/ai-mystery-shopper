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
        // Create session folder specifically for this run
        const sessionPath = path.join(__dirname, '../public/sessions', sessionDirName);
        fs.mkdirSync(sessionPath, { recursive: true });

        console.log(`[Shopper] Launching in Mobile Mode (${mobileDevice.userAgent})`);

        const context = await chromium.launchPersistentContext(USER_DATA_DIR, {
            headless: false,
            channel: 'chrome',
            args: [
                '--disable-blink-features=AutomationControlled',
                '--no-sandbox',
                '--disable-features=PasswordLeakDetection',
                '--disable-save-password-bubble',
                '--deny-permission-prompts',
                '--disable-infobars',
            ],
            ...mobileDevice,
            // RECORDING CONFIGURATION
            recordVideo: { 
                dir: sessionPath, // Save raw video here temporarily
                size: { width: 390, height: 844 } // Match iPhone 13
            } 
        });

        const page = context.pages().length > 0 ? context.pages()[0] : await context.newPage();
        
        // Listen for Network/Console logs
        const sessionLogs = { errors: [], console: [] };
        page.on('response', response => {
            const url = response.url();
            if (url.includes('backtrace.io') || url.includes('google-analytics') || url.includes('segment.io')) return;
            if (response.status() >= 400) sessionLogs.errors.push({ status: response.status(), url });
        });
        page.on('console', msg => {
            if (msg.type() === 'error') sessionLogs.console.push(msg.text());
        });

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
                await page.waitForTimeout(2000); 

                const screenshotBuffer = await page.screenshot({ type: 'jpeg', quality: 60 });
                const base64Image = screenshotBuffer.toString('base64');
                fs.writeFileSync(path.join(sessionPath, `step-${stepCount}.jpg`), screenshotBuffer);

                const recentLogs = {
                    networkErrors: sessionLogs.errors.slice(-3),
                    consoleErrors: sessionLogs.console.slice(-3)
                };

                const aiDecision = await this.analyzePage(base64Image, goal, steps, recentLogs);
                
                if (!aiDecision) {
                    console.log("⚠️ AI returned empty response. Retrying step...");
                    stepCount--; 
                    continue; 
                }

                this.frictionEngine.logEvent('ai_thought', {
                    thought: aiDecision.reasoning,
                    aiFrustrationLevel: aiDecision.frustration_level,
                    diagnosis: aiDecision.diagnosis,
                    severity: aiDecision.severity
                });

                steps.push({ step: stepCount, ...aiDecision });

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
            // SAVE VIDEO LOGIC
            // We must close the context for the video to be finalized on disk
            await context.close(); 
            
            // Rename the random hash video file to something predictable
            const videoFiles = fs.readdirSync(sessionPath).filter(f => f.endsWith('.webm'));
            if (videoFiles.length > 0) {
                const oldPath = path.join(sessionPath, videoFiles[0]);
                const newPath = path.join(sessionPath, 'recording.webm');
                fs.renameSync(oldPath, newPath);
                console.log(`[Evidence] Video saved to: ${newPath}`);
            }
        }

        const report = this.frictionEngine.getReport();
        
        // Attach the public URL for the video so Frontend can find it
        report.videoUrl = `/sessions/${sessionDirName}/recording.webm`;
        return report;
    }

    async analyzePage(base64Image, goal, history, logs) {
        const systemPrompt = `
            You are an AI Mystery Shopper on an iPhone 13. Goal: "${goal}".
            INPUT CONTEXT:
            - Network Errors: ${JSON.stringify(logs.networkErrors)}
            - Console Errors: ${JSON.stringify(logs.consoleErrors)}
            OUTPUT JSON ONLY:
            {
                "action": "click" | "type" | "scroll" | "finish",
                "selector": "visual description",
                "text": "string (if type)",
                "reasoning": "thought process",
                "frustration_level": 0-10,
                "diagnosis": "Healthy" | "Backend Error" | "Frontend Crash" | "UX Confusion" | "CRITICAL_FAILURE",
                "severity": "None" | "Low" | "Medium" | "High" | "Critical"
            }
            RULES: 
            - If logs show 500 error -> Backend Error (Critical).
            - "scroll" means swipe up (move page down).
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
        // ... (Same execute logic as previous version) ...
        const cleanSelector = decision.selector.replace(/button|input|field|link|bar|icon/gi, '').trim();
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
                await page.mouse.wheel(0, 600);
                await page.waitForTimeout(1000); 
                return;
            }
            if (decision.action === 'click') {
                const strategies = [
                    (p) => p.getByRole('button', { name: cleanSelector, exact: false }),
                    (p) => p.getByRole('link', { name: cleanSelector, exact: false }),
                    (p) => p.getByText(decision.selector, { exact: true }),
                    (p) => p.locator(`[aria-label*="${cleanSelector}" i]`),
                    (p) => p.locator('.shopping_cart_link'),
                ];
                let success = false;
                for (const strat of strategies) {
                    const el = await findInFrames(strat);
                    if (el) { await el.click({ timeout: 1500 }); success = true; break; }
                }
                if (!success) throw new Error(`Could not click "${decision.selector}"`);
            } 
            else if (decision.action === 'type') {
                const strategies = [
                    (p) => p.getByPlaceholder(cleanSelector, { exact: false }),
                    (p) => p.getByLabel(cleanSelector, { exact: false }),
                    (p) => p.locator(`input[name="q"]`), 
                    (p) => p.getByRole('textbox')
                ];
                let success = false;
                for (const strat of strategies) {
                    const el = await findInFrames(strat);
                    if (el) { await el.fill(decision.text); await page.keyboard.press('Enter'); success = true; break; }
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