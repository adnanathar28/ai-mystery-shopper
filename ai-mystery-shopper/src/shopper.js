// src/shopper.js
const { chromium, devices } = require('playwright');
const FrictionEngine = require('./frictionEngine');
const fs = require('fs');
const path = require('path');
const Notifier = require('./notifier');
const aiClient = require('./aiClient');
const domUtils = require('./domUtils'); // ADDED THIS IMPORT

const USER_DATA_DIR = path.join(__dirname, '../public/user_data');

class MysteryShopper {
    constructor() {
        this.frictionEngine = new FrictionEngine();
        this.notifier = new Notifier(process.env.SLACK_WEBHOOK_URL);
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
        The user wants to: "${goal}".
        Break this down into 3-5 abstract, high-level milestones.
        Example: ["Login", "Find Product", "Add to Cart", "Navigate to Cart", "Checkout"]
        RETURN ONLY A RAW JSON ARRAY OF STRINGS.
        `;
        
        try {
            const result = await aiClient.analyze(prompt, null); 
            const cleanResult = result.replace(/```json|```/g, '').trim();
            const milestones = JSON.parse(cleanResult);
            console.log("🗺️  Mission Plan:", milestones);
            return milestones;
        } catch (e) {
            console.error("Plan generation failed, using default.");
            return ["Explore page", "Interact with relevant element", "Verify result"];
        }
    }

    async runMission(url, goal) {
        const mobileDevice = devices['iPhone 13'];
        const timestamp = Date.now();
        const sessionDirName = `session-${timestamp}`;
        const sessionPath = path.join(__dirname, '../public/sessions', sessionDirName);

        fs.mkdirSync(sessionPath, { recursive: true });

        // 1. INJECT PREFERENCES BEFORE BROWSER START
        this.preloadPreferences();

        const milestones = await this.generateMissionPlan(goal);
        console.log(`[Shopper] Launching Agent...`);

        const context = await chromium.launchPersistentContext(USER_DATA_DIR, {
            headless: false,
            channel: 'chrome',
            // Stealth Mode args
            ignoreDefaultArgs: ['--enable-automation'], 
            args: [
                '--disable-blink-features=AutomationControlled',
                '--no-sandbox',
                '--disable-infobars',
                '--start-maximized',
                '--no-first-run',
                '--disable-session-crashed-bubble',
                '--disable-popup-blocking',
                // Redundant flags just to be safe
                '--disable-save-password-bubble',
                '--password-store=basic',
                '--deny-permission-prompts',
                '--disable-notifications'
            ],
            ...mobileDevice,
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
        
        let lastStepDescription = "Start of mission";
        let lastActionTaken = "Navigated to URL";
        let lastActionResult = "Success"; 
        let lastExpectedEffect = "Page should load";
        
        const steps = [];
        let completed = false;
        let stepCount = 0;
        
        const MAX_STEPS = 20; 

        try {
            console.log(`[Shopper] Navigating to target: ${url}`);
            await page.goto(url, { waitUntil: 'domcontentloaded' });
            //await this.enableThrottling(page);

            while (!completed && stepCount < MAX_STEPS) {
                stepCount++;
                console.log(`\n--- Step ${stepCount} ---`);
                
                try { await page.waitForLoadState('networkidle', { timeout: 3000 }); } catch(e) {}
                await page.waitForTimeout(1000);

                // --- 1. VISION (Using domUtils) ---
                const { count, elementMap } = await domUtils.markElements(page);
                console.log(`   👁️  Vision: Marked ${count} universal elements.`);

                // --- 2. CAPTURE ---
                const screenshotBuffer = await page.screenshot({ type: 'jpeg', quality: 60 });
                const base64Image = screenshotBuffer.toString('base64');
                fs.writeFileSync(path.join(sessionPath, `step-${stepCount}.jpg`), screenshotBuffer);

                // --- 3. ANALYZE ---
                const contextData = {
                    milestones,
                    lastStepDescription,
                    lastActionTaken,
                    lastActionResult, 
                    lastExpectedEffect,
                    currentUrl: page.url(),
                    elementMap,
                    technicalLogs: {
                        networkErrors: sessionLogs.errors.slice(-5), // last 5 errors
                        consoleErrors: sessionLogs.console.slice(-5)
                    }
                };

                const aiDecision = await this.analyzePage(base64Image, goal, contextData);

                if (!aiDecision) {
                    console.log('⚠️ AI glitch. Retrying step...');
                    continue;
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
        report.videoUrl = `/sessions/${sessionDirName}/recording.webm`;
        await this.notifier.sendAlert(report, goal, url);
        return report;
    }

    async analyzePage(base64Image, goal, context) {
        // THE FINAL PROMPT
        const prompt = `
USER GOAL: "${goal}"
MILESTONES: ${JSON.stringify(context.milestones)}
ELEMENT MAP (ID -> Text): ${JSON.stringify(context.elementMap)}

HISTORY:
- Last Action: "${context.lastActionTaken}"
- EXPECTED EFFECT: "${context.lastExpectedEffect}"

# TECHNICAL CONTEXT
- Network Errors: ${JSON.stringify(context.technicalLogs.networkErrors)}
- Console Errors: ${JSON.stringify(context.technicalLogs.consoleErrors)}

# DIAGNOSTIC RULE
- If you see a 500 status code in Network Errors, your diagnosis MUST be "Backend Error".
- If you see a Javascript error in Console, your diagnosis MUST be "Frontend Crash".
- If the screen looks empty but the elements exist, your diagnosis is "UI Glitch".

PRIME DIRECTIVE:
1. First, VERIFY if the "EXPECTED EFFECT" happened by looking at the screen.
2. **If VERIFIED_SUCCESS**: Your next 'current_milestone' MUST be the next one in the list. Your next 'action' MUST be to find an element related to this NEW milestone. Do NOT interact with elements from the old milestone.
3. **If VERIFICATION_FAILED**: Your next 'action' must be to try and fix the problem or try a different approach to the SAME milestone.

UNIVERSAL WEB LOGIC:
- **Toggle Rule**: If a button text flips state (Add->Remove), the action is COMPLETE.
- **Contextual Attention**: If Navigating, prioritize Headers/Menus. If Searching, prioritize Content/Scrolling.

DEAD-END RULE: If you have scrolled the entire length of the page (top to bottom) and the item is not found, do NOT keep scrolling. Change your action to finish, set your diagnosis to Stuck, and explain in reasoning that the item is missing from the catalog.

INSTRUCTIONS:
Follow the PRIME DIRECTIVE to decide your next move.

RESPONSE FORMAT (JSON):
{
  "verification_verdict": "VERIFIED_SUCCESS" | "VERIFICATION_FAILED",
  "verification_reasoning": "Why?",
  "current_page_description": "1 sentence describing the screen",
  "current_milestone": "Active milestone (MUST advance if VERIFIED_SUCCESS)",
  "action": "click" | "type" | "scroll" | "finish",
  "elementId": number,
  "text": "text (if type)",
  "reasoning": "Why this element? (Link it to the NEW milestone if verified)",
  "expected_effect": "Visual prediction of next state",
  "frustration_level": 0-10,
  "diagnosis": "Healthy" | "Stuck",
  "severity": "None" | "Low" | "Medium"
}
`;
        try {
            let textResponse = await aiClient.analyze(prompt, base64Image);
            let cleanedText = textResponse.replace(/```json|```/g, '').trim();
            const firstBracket = cleanedText.indexOf('{');
            const lastBracket = cleanedText.lastIndexOf('}');
            if (firstBracket === -1) return null;
            return JSON.parse(cleanedText.substring(firstBracket, lastBracket + 1));
        } catch (e) {
            return null;
        }
    }

    async executeAction(page, decision) {
        if (decision.action === 'scroll') {
            console.log("   📜 Scrolling page...");
            await page.keyboard.press('PageDown');
            await page.waitForTimeout(1000); // Small wait for scroll to settle
            return;
        }
        
        if (decision.action === 'finish') return;

        if (decision.action === 'click' || decision.action === 'type') {
            const selector = `[data-ai-id="${decision.elementId}"]`;
            const locator = page.locator(selector);
            
            if (await locator.count() === 0) throw new Error(`Element #${decision.elementId} not found`);

            // Visual feedback: Green outline on what the AI is about to touch
            await page.evaluate((sel) => {
                const el = document.querySelector(sel);
                if (el) el.style.outline = '4px solid #00ff00';
            }, selector);

            // Badges were already cleaned up in runMission right before calling this, 
            // but we do a final check here to ensure interaction logic is pure.
            if (decision.action === 'click') {
                await locator.click({ timeout: 5000 });
                console.log(`   [Action] Clicked element ID: ${decision.elementId}`);
            }
            else if (decision.action === 'type') {
                await locator.fill(decision.text || '');
                const tagName = await locator.evaluate(node => node.tagName);
                if (tagName.toLowerCase() === 'input') {
                    await page.keyboard.press('Enter');
                }
                console.log(`   [Action] Typed text into element ID: ${decision.elementId}`);
            }

            // --- THE FIX: WAIT AFTER THE ACTION ---
            // This ensures the next screenshot shows the RESULT of the click
            if (decision.action === 'click') {
                await page.waitForTimeout(3000); 
            } else {
                await page.waitForTimeout(1500);
            }
        }
    }
}
module.exports = MysteryShopper;