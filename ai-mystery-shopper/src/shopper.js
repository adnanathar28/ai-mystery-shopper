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
const { AIDecisionSchema, normalizeDecisionShape } = require('./schemas/aiDecisionSchema');
const { sanitizeDecision } = require('./decisionSanitizer');

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


    async generateRCA(report) {
        const compactLog = report.log.map(e => ({
            action: e.details?.action,
            diagnosis: e.details?.diagnosis,
            reasoning: e.details?.thought,
            url: e.details?.url
        }));

        const prompt = `
            You are a Lead QA Engineer. 
            Analyze this mission log and return ONLY a JSON object.
            Log: ${JSON.stringify(compactLog.slice(-10))}
            
            {
              "summary": "What happened?",
              "rootCause": "Why?",
              "suggestedFix": "How to fix?",
              "owner": "Frontend | Backend | UX | Infrastructure",
              "confidence": 0.9
            }
        `;

        let rawResponse = ""; // 1. Declare outside try/catch so it's accessible everywhere
        try {
            rawResponse = await aiClient.analyze(prompt, null);
            
            // 2. Robust Extraction
            const firstBracket = rawResponse.indexOf('{');
            const lastBracket = rawResponse.lastIndexOf('}');
            
            if (firstBracket === -1 || lastBracket === -1) {
                throw new Error("No JSON found");
            }

            const jsonString = rawResponse.substring(firstBracket, lastBracket + 1);
            return JSON.parse(jsonString);
            
        } catch (e) {
            console.error("⚠️ RCA Analysis failed. Error:", e.message);
            
            // If the score is low, the fallback should be "Success"
            if (report.confusionScore < 20) {
                return {
                    summary: "The mission completed successfully with no significant friction detected.",
                    rootCause: "None detected.",
                    suggestedFix: "No action required.",
                    owner: "None",
                    confidence: 1.0
                };
            }

            // If the score is high, use a generic "Failure" fallback
            return {
                summary: "The AI detected friction but failed to summarize the root cause.",
                rootCause: this.lastSystemError || "Unknown interaction or navigation error.",
                suggestedFix: "Review the session recording to identify the blocker.",
                owner: "Engineering",
                confidence: 0
            };
        }
    }


    async generateMissionPlan(goal) {
        console.log("🤔 Generating strategic plan...");
        const prompt = `
            You are an autonomous QA strategist.

            Generate a concise interaction-testing plan for the objective:
            "${goal}"

            The plan should adapt to:
            - the type of page
            - interaction patterns
            - expected browser behavior

            Plans may include:
            - interaction testing
            - state verification
            - structural mutation checks
            - navigation testing
            - CRUD actions
            - toggles
            - async behavior
            - form submission
            ONLY if relevant.

            Do not assume every site contains forms, submissions, or full-page transitions.

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
        this.frictionEngine = new FrictionEngine();
        this.missionRationale = null;

        const deviceConfig = DEVICES[config.device] || DEVICES.mobile;
        const timestamp = Date.now();
        const sessionDirName = `session-${timestamp}`;
        const sessionPath = path.join(__dirname, '../public/sessions', sessionDirName);

        let context;
        let page;
        let milestones = [];
        let infraFailure = null;
        const sessionLogs = { errors: [], console: [] };

        if (url && !url.startsWith('http')) {
            url = `https://${url}`;
        }

        try {
            fs.mkdirSync(sessionPath, { recursive: true });
            this.preloadPreferences();

            console.log(`[Shopper] Launching Agent as ${config.persona} on ${deviceConfig.label}...`);
            context = await chromium.launchPersistentContext(USER_DATA_DIR, {
                ...deviceConfig.settings,
                headless: false,
                channel: 'chrome',
                ignoreDefaultArgs: ['--enable-automation'],
                args: [
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

            page = context.pages().length > 0 ? context.pages()[0] : await context.newPage();

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

            console.log(`[Shopper] Navigating to target: ${url}`);

            let preflightResponse = null;
            try {
                preflightResponse = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
            } catch (navErr) {
                const msg = navErr?.message || 'Navigation failed';
                if (
                    msg.includes('ERR_CERT') ||
                    msg.includes('SSL') ||
                    msg.includes('NAME_NOT_RESOLVED') ||
                    msg.includes('net::ERR') ||
                    msg.includes('Timeout')
                ) {
                    infraFailure = `Navigation failure: ${msg}`;
                } else {
                    throw navErr;
                }
            }

            if (!infraFailure) {
                if (!preflightResponse) {
                    infraFailure = 'No response received during navigation';
                } else if (preflightResponse.status() >= 400) {
                    infraFailure = `HTTP ${preflightResponse.status()}`;
                } else {
                    const title = (await page.title()).toLowerCase();
                    if (
                        title.includes('privacy error') ||
                        title.includes('not found') ||
                        title.includes('invalid ssl') ||
                        title.includes("this site can\'t be reached") ||
                        title.includes("this site can�t be reached")
                    ) {
                        infraFailure = `Blocked by browser/title check: "${title}"`;
                    }
                }
            }

            if (infraFailure) {
                goal = 'Site Unreachable';
                milestones = ['N/A'];
                this.missionRationale = `Preflight aborted mission: ${infraFailure}`;
                this.frictionEngine.logEvent('ui_error', {
                    diagnosis: 'INFRASTRUCTURE_FAILURE',
                    severity: 'Critical',
                    thought: infraFailure,
                    url
                });
            } else {
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

                if (shouldBlockByHost || shouldBlockResource) return route.abort();
                return route.continue();
            });
            console.log('[Shopper] Network ad-block routing enabled.');

            await page.evaluate(() => {
                const killAds = () => {
                    const adSelectors = [
                        'iframe[id^="aswift"]',
                        'iframe[src*="googleads"]',
                        'div[id^="google_ads"]',
                        '.adsbygoogle',
                        '#dismiss-button'
                    ];
                    adSelectors.forEach((selector) => {
                        document.querySelectorAll(selector).forEach((el) => el.remove());
                    });
                    document.body.style.overflow = 'auto';
                    document.body.classList.remove('google-anno-full-screen');
                };
                killAds();
                setInterval(killAds, 1000);
            });

            if (!goal || goal === '') {
                goal = await this.discoverGoal(page);
            } else if (!this.missionRationale) {
                this.missionRationale = 'Goal was provided manually.';
            }

            milestones = await this.generateMissionPlan(goal);
            const currentPageClass = await this.classifyPage(page);
            console.log(`[Shopper] Page class detected: ${currentPageClass}`);

            let sameActionCount = 0;
            let lastActionId = null;
            let lastStepDescription = 'Start of mission';
            let lastActionTaken = 'Navigated to URL';
            let lastActionResult = 'Success';
            let lastExpectedEffect = 'Page should load';
            const steps = [];
            let completed = false;
            let stepCount = 0;
            const MAX_STEPS = 30;
            const trajectory = [];
            const noSignalCountsByTarget = {};
            const uniqueSuffix = Math.floor(Math.random() * 9000) + 1000;
            const dynamicGoal = `${goal} (IMPORTANT: Use the name 'Shopper Bot' and the unique email 'shopper_${Date.now()}_${uniqueSuffix}@example.com')`;

            while (!completed && stepCount < MAX_STEPS) {
                stepCount++;
                console.log(`\n--- Step ${stepCount} ---`);

                try { await page.waitForLoadState('networkidle', { timeout: 3000 }); } catch (e) {}
                await page.waitForTimeout(1000);

                const { count, elementMap } = await domUtils.markElements(page);
                console.log(`   Vision: Marked ${count} universal elements.`);

                if (stepCount > 1) {
                    const isAdVisible = await page.evaluate(() => document.body.classList.contains('google-anno-full-screen'));
                    if (isAdVisible) {
                        console.log('Ad detected. Attempting to clear...');
                        await page.keyboard.press('Escape');
                        await page.waitForTimeout(1000);
                    }
                }

                const screenshotBuffer = await page.screenshot({ type: 'jpeg', quality: 60 });
                const base64Image = screenshotBuffer.toString('base64');
                fs.writeFileSync(path.join(sessionPath, `step-${stepCount}.jpg`), screenshotBuffer);

                const contextData = {
                    currentUrl: page.url(),
                    lastStepDescription,
                    lastActionTaken,
                    lastActionResult,
                    lastExpectedEffect,
                    trajectory: trajectory.slice(-3),
                    technicalLogs: {
                        networkErrors: sessionLogs.errors.slice(-5),
                        consoleErrors: sessionLogs.console.slice(-5)
                    }
                };

                const prompt = systemPrompt(
                    dynamicGoal,
                    milestones,
                    elementMap,
                    config.persona,
                    deviceConfig.label,
                    currentPageClass,
                    contextData
                );

                const aiDecision = await this.analyzePage(base64Image, prompt);
                if (!aiDecision) {
                    console.log('AI glitch. Retrying step...');
                    continue;
                }

                const sanitizeResult = await sanitizeDecision(page, aiDecision);
                let finalDecision = aiDecision;
                if (sanitizeResult.ok && sanitizeResult.repaired) {
                    finalDecision = sanitizeResult.decision;
                    this.frictionEngine.logEvent('decision_repaired', {
                        thought: sanitizeResult.reason,
                        action: aiDecision.action,
                        repairedAction: finalDecision.action,
                        originalElementId: aiDecision.elementId,
                        repairedElementId: finalDecision.elementId,
                        url: page.url(),
                        severity: 'Low',
                        diagnosis: 'Healthy'
                    });
                } else if (!sanitizeResult.ok) {
                    finalDecision = sanitizeResult.fallbackDecision;
                    this.frictionEngine.logEvent('decision_rejected', {
                        thought: sanitizeResult.reason,
                        action: aiDecision.action,
                        fallbackAction: finalDecision.action,
                        originalElementId: aiDecision.elementId,
                        url: page.url(),
                        severity: 'Medium',
                        diagnosis: 'Stuck'
                    });
                }

                if (finalDecision.elementId === lastActionId && finalDecision.action === lastActionTaken) {
                    sameActionCount++;
                } else {
                    sameActionCount = 0;
                }
                lastActionId = finalDecision.elementId;

                if (sameActionCount >= 3) {
                    console.log('AI is stuck in a loop. Terminating mission.');
                    this.frictionEngine.logEvent('ai_stuck', {
                        diagnosis: 'Logic Loop Detected',
                        severity: 'Critical',
                        thought: "I've tried the same thing 3 times with no result. The page is likely broken."
                    });
                    break;
                }

                if (finalDecision.verification_verdict === 'VERIFIED_SUCCESS') {
                    console.log('VERIFIED: Previous action worked.');
                } else {
                    console.log(`VERIFICATION FAILED: ${finalDecision.verification_reasoning}`);
                }
                console.log(`Situation: ${finalDecision.current_page_description}`);
                console.log(`Milestone: ${finalDecision.current_milestone}`);
                console.log(`Action: ${finalDecision.action} ${finalDecision.elementId ? `(ID ${finalDecision.elementId})` : ''}`);

                lastStepDescription = finalDecision.current_page_description;
                lastActionTaken = `${finalDecision.action} on ${finalDecision.reasoning}`;
                lastExpectedEffect = finalDecision.expected_effect;
                steps.push({ step: stepCount, ...finalDecision });

                if (finalDecision.action === 'finish') {
                    this.frictionEngine.logEvent('ai_thought', {
                        thought: finalDecision.reasoning,
                        aiFrustrationLevel: finalDecision.frustration_level,
                        diagnosis: finalDecision.diagnosis,
                        severity: finalDecision.severity,
                        action: finalDecision.action,
                        url: page.url(),
                        currentMilestone: finalDecision.current_milestone,
                        expectedEffect: finalDecision.expected_effect,
                        observedEffect: 'finish action - no execution step',
                        verificationOutcome: finalDecision.verification_verdict === 'VERIFIED_SUCCESS' ? 'matched' : 'failed'
                    });
                    trajectory.push({
                        step: stepCount,
                        action: finalDecision.action,
                        reasoning: finalDecision.reasoning || 'Mission ended by AI decision.',
                        result: 'Mission terminated by agent.'
                    });
                    completed = true;
                    this.frictionEngine.logEvent('action_finish', { action: 'finish' });
                    break;
                }
                if (finalDecision.diagnosis === 'CRITICAL_FAILURE') break;

                let preState = null;
                let postState = null;
                let observedEffect = null;
                let verificationOutcome = 'unknown';
                let correctedDiagnosis = finalDecision.diagnosis;
                let correctedSeverity = finalDecision.severity;
                let toggleChanged = false;
                let wasToggleTarget = false;
                let preElementState = null;
                let postElementState = null;
                let submitTransitioned = null;
                let stepEvidence = null;
                let preLocalFingerprint = null;
                let postLocalFingerprint = null;

                try {
                    preState = await this.capturePageState(page);
                    const preToggle = await this.captureToggleState(page, finalDecision);
                    wasToggleTarget = preToggle.isToggle;
                    preElementState = await this.captureElementState(page, finalDecision);
                    preLocalFingerprint = await this.captureLocalFingerprint(page, finalDecision);
                    await domUtils.cleanupMarkers(page);
                    const preActionUrl = page.url();
                    await this.executeAction(page, finalDecision);
                    lastActionResult = 'Success';
                    postState = await this.capturePageState(page);
                    const postToggle = await this.captureToggleState(page, finalDecision);
                    postElementState = await this.captureElementState(page, finalDecision);
                    postLocalFingerprint = await this.captureLocalFingerprint(page, finalDecision);
                    toggleChanged = preToggle.isToggle && preToggle.exists && postToggle.exists && preToggle.signature !== postToggle.signature;
                    observedEffect = this.buildObservedEffect(preState, postState, { toggleChanged });
                    const evidence = this.computeInteractionEvidence(finalDecision, preElementState, postElementState, preLocalFingerprint, postLocalFingerprint, observedEffect, sessionLogs, wasToggleTarget, submitTransitioned);
                    stepEvidence = evidence;
                    verificationOutcome = this.classifyOutcomeFromEvidence(evidence);
                    correctedDiagnosis = this.correctDiagnosis(finalDecision, evidence, noSignalCountsByTarget);

                    if (finalDecision.action === 'submit') {
                        submitTransitioned = await Promise.race([
                            page.waitForURL((u) => u.toString() !== preActionUrl, { timeout: 8000 }).then(() => true).catch(() => false),
                            page.locator('text=/account|welcome|logged in|signup|error|invalid/i').first().isVisible({ timeout: 8000 }).then(() => true).catch(() => false)
                        ]);
                        const submitEvidence = this.computeInteractionEvidence(finalDecision, preElementState, postElementState, preLocalFingerprint, postLocalFingerprint, observedEffect, sessionLogs, wasToggleTarget, submitTransitioned);
                        stepEvidence = submitEvidence;
                        verificationOutcome = this.classifyOutcomeFromEvidence(submitEvidence);
                        if (!submitTransitioned) {
                            lastActionResult = 'FAILED: Submit click did not cause redirect or visible state change';
                            this.frictionEngine.logEvent('ui_error', {
                                thought: 'Submit action produced no transition',
                                aiFrustrationLevel: 7,
                                diagnosis: 'Submission did not complete',
                                severity: 'High',
                                action: 'submit',
                                url: page.url()
                            });
                            verificationOutcome = 'failed';
                        }
                    }

                    trajectory.push({
                        step: stepCount,
                        action: finalDecision.action,
                        reasoning: finalDecision.reasoning || 'No reasoning provided.',
                        result: lastActionResult
                    });
                } catch (err) {
                    console.log(`   Action Failed: ${err.message}`);
                    lastActionResult = `FAILED: ${err.message}`;
                    postState = await this.capturePageState(page).catch(() => null);
                    observedEffect = this.buildObservedEffect(preState, postState, { toggleChanged: false });
                    postElementState = await this.captureElementState(page, finalDecision).catch(() => null);
                    postLocalFingerprint = await this.captureLocalFingerprint(page, finalDecision).catch(() => null);
                    verificationOutcome = 'failed';
                    const errorEvidence = this.computeInteractionEvidence(finalDecision, preElementState, postElementState, preLocalFingerprint, postLocalFingerprint, observedEffect, sessionLogs, wasToggleTarget, submitTransitioned);
                    stepEvidence = errorEvidence;
                    correctedDiagnosis = this.correctDiagnosis(finalDecision, errorEvidence, noSignalCountsByTarget);
                    this.frictionEngine.logEvent('ui_error', {
                        thought: `Interaction failed: ${err.message}`,
                        aiFrustrationLevel: 8,
                        diagnosis: 'UI Interaction Failed',
                        severity: 'Medium',
                        action: finalDecision.action,
                        url: page.url()
                    });

                    if (err.message.includes('intercepts pointer events') || err.message.includes('Timeout') || err.message.includes('closed')) {
                        if (!page.isClosed()) await page.keyboard.press('Escape');
                    }
                    if (err.message.includes('Target page, context or browser has been closed')) break;

                    trajectory.push({
                        step: stepCount,
                        action: finalDecision.action,
                        reasoning: finalDecision.reasoning || 'No reasoning provided.',
                        result: lastActionResult
                    });
                }

                if (correctedDiagnosis === 'Backend Failure' || correctedDiagnosis === 'Frontend Failure' || correctedDiagnosis === 'Missing Route') {
                    correctedSeverity = 'High';
                } else if (correctedDiagnosis === 'Broken Navigation' || correctedDiagnosis === 'Dead Link') {
                    correctedSeverity = correctedSeverity === 'None' ? 'Medium' : correctedSeverity;
                }

                this.frictionEngine.logEvent('ai_thought', {
                    thought: finalDecision.reasoning,
                    aiFrustrationLevel: finalDecision.frustration_level,
                    diagnosis: correctedDiagnosis,
                    severity: correctedSeverity,
                    action: finalDecision.action,
                    url: page.url(),
                    currentMilestone: finalDecision.current_milestone,
                    expectedEffect: finalDecision.expected_effect,
                    observedEffect: observedEffect ? observedEffect.summary : 'unknown',
                    verificationOutcome,
                    evidence: stepEvidence || {}
                });
            }
            }
        } catch (error) {
            console.error('[Shopper] System Error:', error.message);
            this.frictionEngine.logEvent('ui_error', {
                diagnosis: 'SYSTEM_CRASH',
                severity: 'Critical',
                thought: error.message,
                url
            });
        } finally {
            if (context) {
                try { await context.close(); } catch (e) {}
            }
            await new Promise((resolve) => setTimeout(resolve, 1000));

            const videoFiles = fs.existsSync(sessionPath)
                ? fs.readdirSync(sessionPath).filter((f) => f.endsWith('.webm'))
                : [];
            if (videoFiles.length > 0) {
                try {
                    fs.renameSync(path.join(sessionPath, videoFiles[0]), path.join(sessionPath, 'recording.webm'));
                    console.log('Video recording saved.');
                } catch (e) {
                    console.error('Failed to rename video:', e.message);
                }
            }
        }

        const report = this.frictionEngine.getReport();
        const recordingPath = path.join(sessionPath, 'recording.webm');
        report.videoUrl = fs.existsSync(recordingPath) ? `/sessions/${sessionDirName}/recording.webm` : null;
        report.goal = goal || 'Goal Discovery Failed';
        report.rationale = this.missionRationale || (infraFailure ? 'Mission aborted during preflight.' : 'No rationale captured.');
        report.milestones = milestones.length ? milestones : ['N/A'];
        report.persona = config.persona;
        report.device = deviceConfig.label;

        if (infraFailure) {
            report.rca = {
                summary: 'Mission aborted before AI execution because target site was unreachable.',
                rootCause: infraFailure,
                suggestedFix: 'Fix SSL/DNS/connectivity or server availability, then rerun.',
                owner: 'Infrastructure',
                confidence: 1.0
            };
        } else {
            console.log('Generating Root Cause Analysis...');
            report.rca = await this.generateRCA(report);
        }

        try {
            await this.notifier.sendAlert(report, report.goal, url);
        } catch (e) {
            console.error('[Notifier] Alert send failed:', e.message);
        }
        return report;
    }

    async capturePageState(page) {
        const url = page.url();
        const data = await page.evaluate(() => {
            const visibleInputs = Array.from(document.querySelectorAll('input, textarea, select')).filter((el) => {
                const style = window.getComputedStyle(el);
                const rect = el.getBoundingClientRect();
                return style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 0 && rect.height > 0;
            }).length;

            const modalAppeared = !!document.querySelector('[role="dialog"], .modal, [aria-modal="true"]');
            const textSample = (document.body?.innerText || '').replace(/\s+/g, ' ').trim().slice(0, 1200);
            return { visibleInputs, modalAppeared, textSample };
        });

        const contentHash = this.simpleHash(data.textSample);
        return {
            url,
            visibleInputs: data.visibleInputs,
            modalAppeared: data.modalAppeared,
            contentHash
        };
    }

    simpleHash(str) {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            hash = ((hash << 5) - hash) + str.charCodeAt(i);
            hash |= 0;
        }
        return hash;
    }

    buildObservedEffect(preState, postState, extra = {}) {
        if (!preState || !postState) {
            return {
                urlChanged: false,
                modalChanged: false,
                inputCountChanged: false,
                contentHashChanged: false,
                toggleChanged: !!extra.toggleChanged,
                anyChange: false,
                summary: 'state capture unavailable'
            };
        }

        const urlChanged = preState.url !== postState.url;
        const modalChanged = preState.modalAppeared !== postState.modalAppeared;
        const inputCountChanged = preState.visibleInputs !== postState.visibleInputs;
        const contentHashChanged = preState.contentHash !== postState.contentHash;
        const toggleChanged = !!extra.toggleChanged;
        const anyChange = urlChanged || modalChanged || inputCountChanged || contentHashChanged || toggleChanged;

        return {
            urlChanged,
            modalChanged,
            inputCountChanged,
            contentHashChanged,
            toggleChanged,
            anyChange,
            summary: `urlChanged=${urlChanged}, modalChanged=${modalChanged}, inputCountChanged=${inputCountChanged}, contentChanged=${contentHashChanged}, toggleChanged=${toggleChanged}`
        };
    }

    async captureElementState(page, decision) {
        if (!decision || decision.elementId === undefined || decision.elementId === null) return null;
        const locator = page.locator(`[data-ai-id="${decision.elementId}"]`).first();
        const exists = (await locator.count()) > 0;
        if (!exists) return null;
        return await locator.evaluate((el) => {
            const tag = el.tagName.toLowerCase();
            const type = (el.getAttribute('type') || '').toLowerCase();
            const role = (el.getAttribute('role') || '').toLowerCase();
            const isToggle = (tag === 'input' && (type === 'checkbox' || type === 'radio')) || role === 'switch' || role === 'checkbox';
            return {
                tag,
                type,
                role,
                value: typeof el.value === 'string' ? el.value : '',
                checked: !!el.checked,
                ariaChecked: el.getAttribute('aria-checked') || '',
                isToggle
            };
        }).catch(() => null);
    }

    async captureLocalFingerprint(page, decision) {
        if (!decision || decision.elementId === undefined || decision.elementId === null) return null;
        const locator = page.locator(`[data-ai-id="${decision.elementId}"]`).first();
        const exists = (await locator.count()) > 0;
        if (!exists) return null;

        return await locator.evaluate((el) => {
            const attrMap = {};
            const attrKeys = ['id', 'class', 'role', 'type', 'name', 'value', 'disabled', 'checked', 'aria-checked', 'aria-expanded', 'aria-disabled', 'href'];
            attrKeys.forEach((k) => {
                const v = el.getAttribute(k);
                if (v !== null) attrMap[k] = v;
            });
            Array.from(el.attributes).forEach((a) => {
                if (a.name.startsWith('data-') || a.name.startsWith('aria-')) {
                    attrMap[a.name] = a.value;
                }
            });

            const targetSubtreeSig = `${el.tagName}|${el.childElementCount}|${(el.textContent || '').trim().slice(0, 200)}|${JSON.stringify(attrMap)}`;
            const container = el.closest('form, table, tr, td, section, article, main, div') || el.parentElement;
            const containerSig = container
                ? `${container.tagName}|${container.childElementCount}|${(container.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 600)}`
                : '';
            return {
                targetSubtreeSig,
                containerSig,
                attrs: attrMap
            };
        }).catch(() => null);
    }

    async captureToggleState(page, decision) {
        if (!decision || decision.elementId === undefined || decision.elementId === null) {
            return { isToggle: false, exists: false, signature: null };
        }

        const locator = page.locator(`[data-ai-id="${decision.elementId}"]`).first();
        const exists = (await locator.count()) > 0;
        if (!exists) return { isToggle: false, exists: false, signature: null };

        const state = await locator.evaluate((el) => {
            const tag = el.tagName.toLowerCase();
            const type = (el.getAttribute('type') || '').toLowerCase();
            const role = (el.getAttribute('role') || '').toLowerCase();
            const isToggle = (tag === 'input' && (type === 'checkbox' || type === 'radio')) || role === 'switch' || role === 'checkbox';
            const checked = !!el.checked;
            const ariaChecked = el.getAttribute('aria-checked') || '';
            const className = el.className || '';
            return {
                isToggle,
                signature: `${checked}|${ariaChecked}|${className}`
            };
        }).catch(() => ({ isToggle: false, signature: null }));

        return { isToggle: state.isToggle, exists: true, signature: state.signature };
    }

    computeInteractionEvidence(decision, preElementState, postElementState, preLocalFingerprint, postLocalFingerprint, observedEffect, sessionLogs, wasToggleTarget, submitTransitioned) {
        const latestNetworkErrors = sessionLogs.errors.slice(-5);
        const latestConsoleErrors = sessionLogs.console.slice(-5);
        const has404 = latestNetworkErrors.some((e) => e.includes('[404]'));
        const has5xx = latestNetworkErrors.some((e) => /\[(5\d\d)\]/.test(e));
        const hasSevereConsoleError = latestConsoleErrors.some((e) =>
            /(typeerror|referenceerror|syntaxerror|unhandled|cannot read|is not a function|failed to fetch)/i.test(e)
        );
        const elementValueChanged = !!(preElementState && postElementState && preElementState.value !== postElementState.value);
        const toggleStateChanged = !!(preElementState?.isToggle && postElementState?.isToggle &&
            (preElementState.checked !== postElementState.checked || preElementState.ariaChecked !== postElementState.ariaChecked));
        const structuralMutation = !!(observedEffect && (observedEffect.inputCountChanged || observedEffect.contentHashChanged || observedEffect.modalChanged));
        const visualMutation = !!(observedEffect && (observedEffect.urlChanged || observedEffect.modalChanged));
        const anyMutation = !!(observedEffect && observedEffect.anyChange);
        const localTargetMutation = !!(preLocalFingerprint && postLocalFingerprint && preLocalFingerprint.targetSubtreeSig !== postLocalFingerprint.targetSubtreeSig);
        const localContainerMutation = !!(preLocalFingerprint && postLocalFingerprint && preLocalFingerprint.containerSig !== postLocalFingerprint.containerSig);
        const localAttrMutation = !!(preLocalFingerprint && postLocalFingerprint &&
            JSON.stringify(preLocalFingerprint.attrs || {}) !== JSON.stringify(postLocalFingerprint.attrs || {}));
        const localMutationEvidence = localTargetMutation || localContainerMutation || localAttrMutation;

        return {
            action: decision.action,
            has404,
            has5xx,
            hasSevereConsoleError,
            submitTransitioned: submitTransitioned === true,
            wasToggleTarget: !!wasToggleTarget,
            elementValueChanged,
            toggleStateChanged,
            structuralMutation,
            visualMutation,
            anyMutation,
            localTargetMutation,
            localContainerMutation,
            localAttrMutation,
            localMutationEvidence
        };
    }

    classifyOutcomeFromEvidence(evidence) {
        if (evidence.hasSevereConsoleError || evidence.has5xx) return 'failed';
        if (evidence.action === 'submit') return evidence.submitTransitioned ? 'matched' : 'failed';
        if (evidence.toggleStateChanged || evidence.elementValueChanged || evidence.localMutationEvidence) return 'matched';
        if (evidence.anyMutation || evidence.structuralMutation || evidence.visualMutation) return 'weak_match';
        return 'inconclusive';
    }

    correctDiagnosis(decision, evidence, noSignalCountsByTarget) {
        const targetKey = `${decision.action}:${decision.elementId ?? 'none'}`;
        const noSignalInteraction = ['click', 'submit'].includes(decision.action) &&
            !evidence.anyMutation &&
            !evidence.structuralMutation &&
            !evidence.visualMutation &&
            !evidence.toggleStateChanged &&
            !evidence.elementValueChanged &&
            !evidence.submitTransitioned &&
            !evidence.localMutationEvidence;

        if (noSignalInteraction && !evidence.wasToggleTarget) {
            noSignalCountsByTarget[targetKey] = (noSignalCountsByTarget[targetKey] || 0) + 1;
        } else {
            noSignalCountsByTarget[targetKey] = 0;
        }

        if (evidence.hasSevereConsoleError) return 'Frontend Failure';
        if (evidence.has5xx) return 'Backend Failure';
        if (evidence.has404) return evidence.anyMutation ? 'Missing Route' : 'Dead Link';

        if (!evidence.wasToggleTarget && noSignalCountsByTarget[targetKey] >= 3 && ['click', 'submit'].includes(decision.action)) {
            return 'Dead Link';
        }

        return decision.diagnosis;
    }

    async classifyPage(page) {
        try {
            const signals = await page.evaluate(() => {
                const forms = document.querySelectorAll('form').length;
                const inputs = document.querySelectorAll('input, textarea, select').length;
                const passwordInputs = document.querySelectorAll('input[type="password"]').length;
                const tables = document.querySelectorAll('table').length;
                const tableRows = document.querySelectorAll('table tr').length;
                const editDeleteLinks = document.querySelectorAll('a, button');
                let hasCrudActions = false;
                editDeleteLinks.forEach((el) => {
                    const text = (el.textContent || '').toLowerCase();
                    if (text.includes('edit') || text.includes('delete') || text.includes('remove') || text.includes('add')) {
                        hasCrudActions = true;
                    }
                });
                const headingText = (document.querySelector('h1, h2, h3')?.textContent || '').toLowerCase();
                const bodyText = (document.body?.innerText || '').toLowerCase();
                const navLinks = document.querySelectorAll('a').length;
                const widgets = document.querySelectorAll('[role="tabpanel"], [role="tab"], .card, .widget, .dashboard').length;
                const hasErrorIndicators =
                    bodyText.includes('error') ||
                    bodyText.includes('not found') ||
                    bodyText.includes('forbidden') ||
                    bodyText.includes('unauthorized') ||
                    bodyText.includes('access denied');

                return {
                    forms,
                    inputs,
                    passwordInputs,
                    tables,
                    tableRows,
                    hasCrudActions,
                    headingText,
                    bodyText,
                    navLinks,
                    widgets,
                    hasErrorIndicators
                };
            });

            if (signals.hasErrorIndicators || signals.passwordInputs > 0 && signals.forms > 0 && signals.inputs <= 5) {
                if (signals.hasErrorIndicators) return 'auth_gate_or_error';
                return 'transactional_form';
            }

            if (signals.tables > 0 && signals.tableRows >= 3 && signals.hasCrudActions) {
                if (signals.headingText.includes('challenging') || signals.bodyText.includes('challenging dom')) {
                    return 'demo_challenge';
                }
                return 'crud_table';
            }

            if (signals.forms > 0 && signals.inputs >= 3) {
                return 'transactional_form';
            }

            if (signals.widgets >= 2) {
                return 'dashboard_app';
            }

            if (signals.headingText.includes('challenging') || signals.bodyText.includes('challenging dom') || signals.bodyText.includes('the internet')) {
                return 'demo_challenge';
            }

            if (signals.navLinks >= 8) {
                return 'content_nav';
            }

            return 'content_nav';
        } catch (e) {
            return 'content_nav';
        }
    }

    async analyzePage(base64Image, prompt) {
        const maxAttempts = 3;

        for (let attempt = 1; attempt <= maxAttempts; attempt++) {
            try {
                const textResponse = await aiClient.analyze(prompt, base64Image);
                const cleanedText = textResponse.replace(/```json|```/g, '').trim();
                const firstBracket = cleanedText.indexOf('{');
                const lastBracket = cleanedText.lastIndexOf('}');
                if (firstBracket === -1 || lastBracket === -1) {
                    throw new Error('No JSON object found in model response');
                }

                const raw = JSON.parse(cleanedText.substring(firstBracket, lastBracket + 1));
                const normalized = normalizeDecisionShape(raw);
                const parsed = AIDecisionSchema.safeParse(normalized);

                if (parsed.success) {
                    return parsed.data;
                }

                const issues = parsed.error.issues.map(i => `${i.path.join('.')}: ${i.message}`).join('; ');
                throw new Error(`Schema validation failed: ${issues}`);
            } catch (e) {
                console.error(`[Shopper] AI Analysis attempt ${attempt}/${maxAttempts} failed:`, e.message);
                if (attempt === maxAttempts) {
                    return {
                        verification_verdict: 'VERIFICATION_FAILED',
                        verification_reasoning: 'Model response was invalid after retries.',
                        current_page_description: 'Agent could not parse a valid model decision.',
                        current_milestone: 'Recovery',
                        action: 'scroll',
                        reasoning: 'Applying deterministic fallback to recover from invalid AI output.',
                        expected_effect: 'Reveal more context and retry on next step.',
                        frustration_level: 6,
                        diagnosis: 'Stuck',
                        severity: 'Medium',
                        text: ''
                    };
                }
            }
        }
    }

    async executeAction(page, decision) {
        if (decision.action === 'scroll') {
            console.log("   [Action] Scrolling page...");
            await page.keyboard.press('PageDown');
            await page.waitForTimeout(1000);
            return;
        }

        if (decision.action === 'finish') return;

        if (decision.action === 'submit') {
            const selector = decision.elementId ? `[data-ai-id="${decision.elementId}"]` : 'button[type="submit"]';
            const submitLocator = page.locator(
                'button[type="submit"], input[type="submit"], button:has-text("Sign up"), button:has-text("Signup"), button:has-text("Register"), button:has-text("Create Account"), button:has-text("Login"), a:has-text("Sign up"), a:has-text("Signup")'
            ).first();
            await submitLocator.scrollIntoViewIfNeeded();
            await submitLocator.click({ timeout: 7000 });
            console.log('   [Action] Explicit submit clicked.');
            return;
        }

        if (decision.action === 'select') {
            const selector = `[data-ai-id="${decision.elementId}"]`;
            const locator = page.locator(selector);
            
            // Use selectOption to programmatically set the value
            // This bypasses the need to "click" the dropdown and "click" the option
            await locator.selectOption({ label: decision.option || decision.text });
            
            console.log(`   [Action] Selected option "${decision.option || decision.text}" for ID: ${decision.elementId}`);
            await page.waitForTimeout(1000);
            return;
        }

        if (decision.action === 'click' || decision.action === 'type') {
            const selector = `[data-ai-id="${decision.elementId}"]`;
            const locator = page.locator(selector);

            if (await locator.count() === 0) throw new Error(`Element #${decision.elementId} not found`);
            await locator.first().scrollIntoViewIfNeeded();

            // Visual feedback: Green outline
            await page.evaluate((sel) => {
                const el = document.querySelector(sel);
                if (el) el.style.outline = '4px solid #00ff00';
            }, selector);

            if (decision.action === 'click') {
                await locator.click({ timeout: 7000 });
                console.log(`   [Action] Clicked element ID: ${decision.elementId}`);
            } else if (decision.action === 'type') {
                // Mobile-safe input: fill directly, do not auto-submit with Enter.
                await locator.fill(decision.text || '');
                console.log(`   [Action] Filled text into element ID: ${decision.elementId}`);
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
