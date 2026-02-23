// src/shopper.js
const { chromium, devices } = require('playwright');
const FrictionEngine = require('./frictionEngine');
const fs = require('fs');
const path = require('path');
const Notifier = require('./notifier');
const aiClient = require('./aiClient');
const domUtils = require('./domUtils'); 
const systemPrompt = require('./prompts/systemPrompt'); // IMPORTED
const DEVICES = require('./config/devices'); // IMPORTED

const USER_DATA_DIR = path.join(__dirname, '../public/user_data');

class MysteryShopper {
    constructor() {
        this.frictionEngine = new FrictionEngine();
        this.notifier = new Notifier(process.env.SLACK_WEBHOOK_URL);
        this.missionRationale = null;
    }

    //this function guides the ai in an autonomous manner
    async discoverGoal(page) {
    console.log("🕵️  Autonomous Mode: Discovering primary test objective...");
    
    // Take a screenshot of the landing page
    const screenshotBuffer = await page.screenshot({ type: 'jpeg', quality: 60 });
    const base64Image = screenshotBuffer.toString('base64');

    const prompt = `
    You are a Senior QA Engineer. 
    Look at this page. Your goal is to find the most important journey for a NEW user.

    IMPORTANT RULES:
    1. If the page has a "Login" and a "Sign Up" option, and no credentials are provided, PRIORITIZE the "Sign Up" or "Registration" flow.
    2. If you choose a flow that requires data (email, name, etc.), you are authorized to use dummy test data (e.g., 'testuser_123@example.com').
    3. Avoid flows that require real credit cards or SMS verification.
    
    Return your answer in RAW JSON format:
    {
      "goal": "The primary goal string",
      "rationale": "Why this is the most important flow to test"
    }`;

    try {
        const result = await aiClient.analyze(prompt, base64Image);
        const cleanResult = result.replace(/```json|```/g, '').trim();
        const discovery = JSON.parse(cleanResult);
        console.log(`🎯  Autonomous Goal Selected: ${discovery.goal}`);
        console.log(`💡  Rationale: ${discovery.rationale}`);
        this.missionRationale = discovery.rationale || null;
        return discovery.goal;
    } catch (e) {
        console.error("Discovery failed, falling back to generic exploration.");
        this.missionRationale = "Fallback goal used because autonomous discovery failed.";
        return "Explore the main call-to-action flow of the website.";
        }
    }

    // async enableThrottling(page) {
    //     const client = await page.context().newCDPSession(page);
    //     await client.send('Network.emulateNetworkConditions', {
    //         offline: false,
    //         downloadThroughput: 750 * 1024 / 8,
    //         uploadThroughput: 250 * 1024 / 8,
    //         latency: 100
    //     });
    //     console.log("📡 Network throttled to Slow 3G (Universal Stress Test)");
    // }

    /**
     * NUCLEAR OPTION: Manually writes Chrome Preferences to disable
     * the Password Manager and Security Popups before launch.
     */
    preloadPreferences() {
        const defaultDir = path.join(USER_DATA_DIR, 'Default');
        const prefsFile = path.join(defaultDir, 'Preferences');

        try {
            // Ensure the directory exists
            if (!fs.existsSync(defaultDir)) {
                fs.mkdirSync(defaultDir, { recursive: true });
            }

            let prefs = {};
            if (fs.existsSync(prefsFile)) {
                try {
                    prefs = JSON.parse(fs.readFileSync(prefsFile, 'utf8'));
                } catch (e) { console.error("Corrupt prefs, resetting."); }
            }

            // --- THE CONFIGURATION THAT KILLS THE POPUPS ---
            const hardPrefs = {
                credentials_enable_service: false, // Disables "Save Password" bubble
                profile: {
                    password_manager_enabled: false, // Disables the manager logic
                    password_manager_leak_detection: false, // Disables "Data Breach" warning
                },
                safebrowsing: {
                    enabled: false, // Disables some security popups
                    enhanced: false
                },
                autofill: {
                    profile_enabled: false, // Disables "Save Address"
                    credit_card_enabled: false // Disables "Save Card"
                }
            };

            // Deep merge helper (simple version)
            const merge = (target, source) => {
                for (const key of Object.keys(source)) {
                    if (source[key] instanceof Object && key in target) {
                        Object.assign(source[key], merge(target[key], source[key]));
                    }
                }
                Object.assign(target || {}, source);
                return target;
            };

            prefs = merge(prefs, hardPrefs);
            
            fs.writeFileSync(prefsFile, JSON.stringify(prefs));
            console.log("🛡️  Chrome Preferences injected: Password Manager DISABLED.");
        } catch (e) {
            console.error("⚠️ Failed to inject preferences:", e.message);
        }
    }

    async generateMissionPlan(goal) {
        console.log("🤔 Generating strategic plan...");
        const prompt = `
            You are an expert QA Strategist.
            The objective is to test: "${goal}".
            
            Create a 4-step mission plan that covers the happy path but also looks for common friction points.
            1. Navigation/Discovery (Finding the starting point)
            2. Data Entry/Interaction (Testing forms or buttons)
            3. Process Submission (The transition state)
            4. Verification (Confirming the final result)

            RETURN ONLY A RAW JSON ARRAY OF STRINGS.
            Example: ["Find Signup CTA", "Fill registration form", "Submit and wait for redirect", "Verify Dashboard access"]
            `;
        
        try {
            const result = await aiClient.analyze(prompt, null); 
            // Better cleaning: find the first '[' and last ']'
            const start = result.indexOf('[');
            const end = result.lastIndexOf(']');
            if (start === -1 || end === -1) throw new Error("No JSON array found");
            
            const cleanResult = result.substring(start, end + 1);
            const milestones = JSON.parse(cleanResult);
            console.log("🗺️  Mission Plan:", milestones);
            return milestones;
        } catch (e) {
            console.error("Plan generation failed, using fallback.");
            return ["Navigate to entry point", "Perform primary interaction", "Verify success"];
        }
    }

    async runMission(url, goal, config={persona: 'first_time_user', device: 'mobile'}) {
        // Keep mission scoring isolated per run.
        this.frictionEngine = new FrictionEngine();

        // Use the imported DEVICES config
        const deviceConfig = DEVICES[config.device] || DEVICES.mobile;
        
        const timestamp = Date.now();
        const sessionDirName = `session-${timestamp}`;
        const sessionPath = path.join(__dirname, '../public/sessions', sessionDirName);

        fs.mkdirSync(sessionPath, { recursive: true });

        // 1. INJECT PREFERENCES BEFORE BROWSER START
        this.preloadPreferences();

        console.log(`[Shopper] Launching Agent as ${config.persona} on ${deviceConfig.label}...`);

        const context = await chromium.launchPersistentContext(USER_DATA_DIR, {
            ...deviceConfig.settings, // Use settings from config/devices.js
            headless: false,
            channel: 'chrome',
            // Stealth Mode args
            ignoreDefaultArgs: ['--enable-automation'], 
            args: [ //makes it hard to detect as a bot
                '--disable-blink-features=AutomationControlled',
                '--no-sandbox',
                '--disable-infobars',
                '--start-maximized',
                '--no-first-run',
                '--disable-session-crashed-bubble',
                '--disable-popup-blocking',
                '--disable-save-password-bubble',
                '--password-store=basic',
                '--deny-permission-prompts',
                '--disable-notifications'
            ],
            recordVideo: { dir: sessionPath, size: { width: 390, height: 844 } },
        });

        const page = context.pages().length > 0 ? context.pages()[0] : await context.newPage();

        const sessionLogs = { errors: [], console: [] };

        page.on('response', (response) => {
          if (response.status() >= 400) {
            sessionLogs.errors.push(`[${response.status()}] ${response.url()}`);
          }
        });

        page.on('console', (msg) => {
          if (msg.type() === 'error') {
            sessionLogs.console.push(msg.text());
          }
        });

        // Add a "stuck counter"
        let sameActionCount = 0;
        let lastActionId = null;
        
        let lastStepDescription = "Start of mission";
        let lastActionTaken = "Navigated to URL";
        let lastActionResult = "Success"; 
        let lastExpectedEffect = "Page should load";
        
        const steps = [];
        let completed = false;
        let stepCount = 0;
        
        const MAX_STEPS = 20; 
        let milestones = [];
        
        try {
            console.log(`[Shopper] Navigating to target: ${url}`);

            // Block common ad/tracker requests before first paint.
            const blockedHostFragments = [
                'googleads.g.doubleclick.net',
                'doubleclick.net',
                'googlesyndication.com',
                'adservice.google.com',
                'adservice.google.',
                'adsystem.google.com',
                'taboola.com',
                'outbrain.com',
                'criteo.com',
                'adnxs.com'
            ];
            await page.route('**/*', (route) => {
                const reqUrl = route.request().url();
                const resourceType = route.request().resourceType();
                const shouldBlockByHost = blockedHostFragments.some((fragment) => reqUrl.includes(fragment));
                const shouldBlockByPattern =
                    reqUrl.includes('/ads?') ||
                    reqUrl.includes('adsbygoogle.js') ||
                    reqUrl.includes('prebid') ||
                    reqUrl.includes('google_vignette');
                const shouldBlockResource =
                    (resourceType === 'script' || resourceType === 'iframe') &&
                    (shouldBlockByHost || shouldBlockByPattern);

                if (shouldBlockByHost || shouldBlockResource) {
                    return route.abort();
                }
                return route.continue();
            });
            console.log('[Shopper] Network ad-block routing enabled.');
             
            await page.goto(url, { waitUntil: 'domcontentloaded' });
            //await this.enableThrottling(page);

            // This script runs inside the browser and "kills" ads as they appear
            await page.evaluate(() => {
                const killAds = () => {
                    const adSelectors = [
                        'iframe[id^="aswift"]', 
                        'iframe[src*="googleads"]', 
                        'div[id^="google_ads"]',
                        '.adsbygoogle',
                        '#dismiss-button' // Common "Close" button for ads
                    ];
                    adSelectors.forEach(selector => {
                        document.querySelectorAll(selector).forEach(el => el.remove());
                    });
                    // Remove the "vignette" background that freezes the page
                    document.body.style.overflow = 'auto';
                    document.body.classList.remove('google-anno-full-screen');
                };
                
                // Kill ads immediately and then every 1 second
                killAds();
                setInterval(killAds, 1000);
            });

        if (!goal || goal === "") { //if no goal entered, ai functions autonmously
            goal = await this.discoverGoal(page);
        } else if (!this.missionRationale) {
            this.missionRationale = "Goal was provided manually.";
        }

        milestones = await this.generateMissionPlan(goal);

            while (!completed && stepCount < MAX_STEPS) {
                stepCount++;
                console.log(`\n--- Step ${stepCount} ---`);
                
                try { await page.waitForLoadState('networkidle', { timeout: 3000 }); } catch(e) {}
                await page.waitForTimeout(1000);

                // --- 1. VISION (Using domUtils) ---
                const { count, elementMap } = await domUtils.markElements(page);
                console.log(`   👁️  Vision: Marked ${count} universal elements.`);

                if (stepCount > 1) {
                    // If we detect a known Google Ad overlay class, try to close it
                    const isAdVisible = await page.evaluate(() => document.body.classList.contains('google-anno-full-screen'));
                    if (isAdVisible) {
                        console.log("⚠️ Ad detected. Attempting to clear...");
                        await page.keyboard.press('Escape');
                        await page.waitForTimeout(1000);
                    }
                }

                // --- 2. CAPTURE ---
                const screenshotBuffer = await page.screenshot({ type: 'jpeg', quality: 60 });
                const base64Image = screenshotBuffer.toString('base64');
                fs.writeFileSync(path.join(sessionPath, `step-${stepCount}.jpg`), screenshotBuffer);

                // --- 3. ANALYZE (Using external System Prompt) ---
                const contextData = {
                    currentUrl: page.url(),
                    lastStepDescription,
                    lastActionTaken,
                    lastActionResult,
                    lastExpectedEffect,
                    technicalLogs: {
                        networkErrors: sessionLogs.errors.slice(-5),
                        consoleErrors: sessionLogs.console.slice(-5)
                    }
                };

                // Generate prompt using the new Persona logic
                const prompt = systemPrompt(
                    goal, 
                    milestones, 
                    elementMap, 
                    config.persona, 
                    deviceConfig.label, 
                    contextData
                );

                const aiDecision = await this.analyzePage(base64Image, prompt);

                if (!aiDecision) {
                    console.log('⚠️ AI glitch. Retrying step...');
                    continue;
                }

                if (aiDecision.elementId === lastActionId && aiDecision.action === lastActionTaken) {
                        sameActionCount++;
                    } else {
                        sameActionCount = 0;
                    }
                    lastActionId = aiDecision.elementId;

                    if (sameActionCount >= 3) {
                        console.log("🛑 AI is stuck in a loop. Terminating mission.");
                        this.frictionEngine.logEvent('ai_stuck', {
                            diagnosis: 'Logic Loop Detected',
                            severity: 'Critical',
                            thought: "I've tried the same thing 3 times with no result. The page is likely broken."
                        });
                        break; 
                    }

                // 🚨 REAL-TIME ALERTING CHECK
                if ((aiDecision.reasoning || '').includes('ISSUE_FOUND')) {
                    console.log("🔥 CRITICAL ISSUE DETECTED IN REAL-TIME!");
                    // Integration note: You can trigger an immediate Slack alert here
                }

                // *** INTEGRATION START: LOG TO FRICTION ENGINE ***
                this.frictionEngine.logEvent('ai_thought', {
                    thought: aiDecision.reasoning,
                    aiFrustrationLevel: aiDecision.frustration_level,
                    diagnosis: aiDecision.diagnosis,
                    severity: aiDecision.severity,
                    action: aiDecision.action,
                    url: page.url(),
                    currentMilestone: aiDecision.current_milestone
                });
                // *** INTEGRATION END ***

                if (aiDecision.verification_verdict === "VERIFIED_SUCCESS") {
                    console.log(`✅ VERIFIED: Previous action worked.`);
                } else {
                    console.log(`⚠️ VERIFICATION FAILED: ${aiDecision.verification_reasoning}`);
                }

                console.log(`🧠 Situation: ${aiDecision.current_page_description}`);
                console.log(`🎯 Milestone: ${aiDecision.current_milestone}`);
                console.log(`👉 Action: ${aiDecision.action} ${aiDecision.elementId ? `(ID ${aiDecision.elementId})` : ''}`);

                lastStepDescription = aiDecision.current_page_description;
                lastActionTaken = `${aiDecision.action} on ${aiDecision.reasoning}`;
                lastExpectedEffect = aiDecision.expected_effect;

                steps.push({ step: stepCount, ...aiDecision });

                if (aiDecision.action === 'finish') {
                    completed = true;
                    this.frictionEngine.logEvent('action_finish', { action: 'finish' });
                    break;
                }
                if (aiDecision.diagnosis === 'CRITICAL_FAILURE') break;

                // --- 4. EXECUTE ---
                try {
                    // Clean badges right before interaction to prevent blocking
                    await domUtils.cleanupMarkers(page); 
                    
                    await this.executeAction(page, aiDecision);
                    lastActionResult = "Success";
                } catch (err) {
                    console.log(`   ❌ Action Failed: ${err.message}`);
                    lastActionResult = `FAILED: ${err.message}`;
                    
                    this.frictionEngine.logEvent('ui_error', {
                        thought: `Interaction failed: ${err.message}`,
                        aiFrustrationLevel: 8,
                        diagnosis: 'UI Interaction Failed',
                        severity: 'Medium',
                        action: aiDecision.action,
                        url: page.url()
                    });

                    if (err.message.includes('intercepts pointer events') || err.message.includes('Timeout') || err.message.includes('closed')) {
                        if (!page.isClosed()) await page.keyboard.press('Escape'); 
                    }
                    if (err.message.includes('Target page, context or browser has been closed')) break; 
                }
            }
        } catch (error) {
            console.error('[Shopper] System Error:', error.message);
        } finally {
            if (context) {
                try { await context.close(); } catch (e) { }
            }
            await new Promise(resolve => setTimeout(resolve, 1000));

            const videoFiles = fs.readdirSync(sessionPath).filter((f) => f.endsWith('.webm'));
            if (videoFiles.length > 0) {
                try {
                    fs.renameSync(path.join(sessionPath, videoFiles[0]), path.join(sessionPath, 'recording.webm'));
                    console.log('🎥 Video recording saved.');
                } catch (e) { console.error('Failed to rename video:', e.message); }
            }
        }

        const report = this.frictionEngine.getReport();
        const recordingPath = path.join(sessionPath, 'recording.webm');
        report.videoUrl = fs.existsSync(recordingPath) ? `/sessions/${sessionDirName}/recording.webm` : null;
        report.goal = goal; // Pass the goal
        report.rationale = this.missionRationale || "No rationale captured.";
        report.milestones = milestones; // Pass the plan

        await this.notifier.sendAlert(report, goal, url);
        return report;
    }

    async analyzePage(base64Image, prompt) {
        try {
            let textResponse = await aiClient.analyze(prompt, base64Image);
            let cleanedText = textResponse.replace(/```json|```/g, '').trim();
            const firstBracket = cleanedText.indexOf('{');
            const lastBracket = cleanedText.lastIndexOf('}');
            if (firstBracket === -1) return null;
            return JSON.parse(cleanedText.substring(firstBracket, lastBracket + 1));
        } catch (e) {
            console.error("[Shopper] AI Analysis failed:", e.message);
            return null;
        }
    }

    async executeAction(page, decision) {
        if (decision.action === 'scroll') {
            console.log("   📜 Scrolling page...");
            await page.keyboard.press('PageDown');
            await page.waitForTimeout(1000); 
            return;
        }
        
        if (decision.action === 'finish') return;

        if (decision.action === 'click' || decision.action === 'type') {
            const selector = `[data-ai-id="${decision.elementId}"]`;
            const locator = page.locator(selector);
            
            
            if (await locator.count() === 0) throw new Error(`Element #${decision.elementId} not found`);

            // Visual feedback: Green outline
            await page.evaluate((sel) => {
                const el = document.querySelector(sel);
                if (el) el.style.outline = '4px solid #00ff00';
            }, selector);

            if (decision.action === 'click') {
                await locator.click({ timeout: 5000, force: true });
                console.log(`   [Action] Clicked element ID: ${decision.elementId}`);
            }
            else if (decision.action === 'type') {
                await locator.click(); // Click first to focus
                await page.keyboard.down('Control'); // Clear existing text (Select All)
                await page.keyboard.press('A');
                await page.keyboard.up('Control');
                await page.keyboard.press('Backspace');
                
                await locator.type(decision.text || '', { delay: 50 }); // Type like a human
                await page.keyboard.press('Enter');
                console.log(`   [Action] Human-typed text into element ID: ${decision.elementId}`);
            }

            if (decision.action === 'click') {
                await page.waitForTimeout(3000); 
            } else {
                await page.waitForTimeout(1500);
            }
        }
    }
}
module.exports = MysteryShopper;
