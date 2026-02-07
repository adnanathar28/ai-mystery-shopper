// src/shopper.js
const { chromium, devices } = require('playwright');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const FrictionEngine = require('./frictionEngine');
const fs = require('fs');
const path = require('path');
const Notifier = require('./notifier');
const aiClient = require('./aiClient'); // Import our new wrapper


const USER_DATA_DIR = path.join(__dirname, '../public/user_data'); //keeps cookies, avoids fresh browser every run, makes bot more human

class MysteryShopper {
    constructor(apiKey) {
    this.gemini = new GoogleGenerativeAI(apiKey);
    this.model = this.gemini.getGenerativeModel({
        model: 'gemini-2.5-flash',
    });
    this.frictionEngine = new FrictionEngine();
    this.notifier = new Notifier(process.env.SLACK_WEBHOOK_URL); // Add this

    }

    async enableThrottling(page) {
        const client = await page.context().newCDPSession(page);
        await client.send('Network.emulateNetworkConditions', {
            offline: false,
            downloadThroughput: 750 * 1024 / 8, // ~750 Kbps (Slow 3G)
            uploadThroughput: 250 * 1024 / 8,   // ~250 Kbps
            latency: 100                        // 100ms RTT
        });
        console.log("📡 Network throttled to Slow 3G");
    }


  async runMission(url, goal) {
    const mobileDevice = devices['iPhone 13'];
    const timestamp = Date.now();
    const sessionDirName = `session-${timestamp}`;
    const sessionPath = path.join(
      __dirname,
      '../public/sessions',
      sessionDirName
    );

    fs.mkdirSync(sessionPath, { recursive: true }); //creates folder

    console.log(
      `[Shopper] Launching Universal Mobile Agent (${mobileDevice.userAgent})`
    );

    const context = await chromium.launchPersistentContext(USER_DATA_DIR, {
      headless: false, //so we can see
      channel: 'chrome',
      args: [
        '--disable-blink-features=AutomationControlled',
        '--no-sandbox',
        '--disable-infobars', //makes but look more human
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
        size: { width: 390, height: 844 }, //every run gets video evidence
      },
    });

    const page =
      context.pages().length > 0
        ? context.pages()[0]
        : await context.newPage(); //gets the pages

    const sessionLogs = { errors: [], console: [] }; //tracks network failures etc

    page.on('response', (response) => { //network error listener
      const resUrl = response.url();
      if (
        resUrl.match(
          /backtrace|google-analytics|segment|doubleclick|facebook|newrelic/
        )
      )
        return;

      if (response.status() >= 400) { //if backend breaks it is now logged, this feeds diagnostic intelligence
        sessionLogs.errors.push({
          status: response.status(),
          url: resUrl,
        });
      }
    });

    page.on('console', (msg) => { //console error listener, if frontend crashes we catch it
      if (msg.type() === 'error') {
        sessionLogs.console.push(msg.text());
      }
    });

    const steps = [];
    let completed = false;
    let stepCount = 0;
    const MAX_STEPS = 15;
    let lastScreenshot = '';

    try {
      console.log(`[Shopper] Navigating to target: ${url}`);
      await page.goto(url, { waitUntil: 'domcontentloaded' });
      await this.enableThrottling(page);


      while (!completed && stepCount < MAX_STEPS) { //the brain AI loop
        stepCount++;
        console.log(`\n--- Step ${stepCount} ---`);
        await page.waitForTimeout(2000);
        const stepStart = Date.now();


        const screenshotBuffer = await page.screenshot({ // the eyes of the agent
          type: 'jpeg',
          quality: 60,
        });
        const base64Image = screenshotBuffer.toString('base64');

        fs.writeFileSync(
          path.join(sessionPath, `step-${stepCount}.jpg`),
          screenshotBuffer
        );

        if (base64Image === lastScreenshot) { //detects stuck state
          console.log('⚠️ Visual Warning: Viewport static since last step.');
        }
        lastScreenshot = base64Image;

        const recentLogs = {
          networkErrors: sessionLogs.errors.slice(-3),
          consoleErrors: sessionLogs.console.slice(-3),
        };

        const aiDecision = await this.analyzePage( //the ai analysis, most important. Sends screenshot, goal, history, errors to gemini vision.
          base64Image,
          goal,
          steps,
          recentLogs
        );

        if (!aiDecision) {
          console.log('⚠️ AI glitch. Retrying step...');
          stepCount--;
          continue;
        }

        console.log(`🧠 Thought: "${aiDecision.reasoning}"`);
        console.log(
          `👉 Action: ${aiDecision.action} on "${aiDecision.selector}"`
        );

        if (aiDecision.diagnosis !== 'Healthy') {
          console.log(
            `🩺 Diagnosis: ${aiDecision.diagnosis} [${aiDecision.severity}]`
          );
        }
        
        const duration = Date.now() - stepStart;


        this.frictionEngine.logEvent('ai_thought', {
          thought: aiDecision.reasoning,
          aiFrustrationLevel: aiDecision.frustration_level,
          diagnosis: aiDecision.diagnosis,
          severity: aiDecision.severity,
          action:aiDecision.action,
          url:page.url(),
          duration
        });

        steps.push({ step: stepCount, ...aiDecision });

        if (aiDecision.action === 'finish') {
          console.log('[Shopper] Goal Achieved.');
          completed = true;
          break;
        }

        if (
          aiDecision.diagnosis === 'CRITICAL_FAILURE' ||
          aiDecision.severity === 'Critical'
        ) {
          console.log('🚨 ABORT: Critical Failure Detected');
          break;
        }

        await this.executeAction(page, aiDecision); //playwright clicks types scrolls, using fuzzy visual selectors not IDs
      }
    } catch (error) {
      console.error('[Shopper] System Error:', error);
      this.frictionEngine.logEvent('error', { message: error.message });
    } finally {
      await context.close();

      const videoFiles = fs
        .readdirSync(sessionPath)
        .filter((f) => f.endsWith('.webm'));

      if (videoFiles.length > 0) {
        fs.renameSync(
          path.join(sessionPath, videoFiles[0]),
          path.join(sessionPath, 'recording.webm')
        );
        console.log('[Evidence] Video saved.');
      }
    }

    const report = this.frictionEngine.getReport();
    report.videoUrl = `/sessions/${sessionDirName}/recording.webm`;
    await this.notifier.sendAlert(report, goal, url); //shopper finishes its mission and everything is scored

    return report;
  }

  async analyzePage(base64Image, goal, history, logs) { //Sends ss to gemini and asks, if you were a confused human, what wd you do next and why?
    const prompt = `
You are an AI Mystery Shopper on a mobile device. Look at the screen.

GOAL:
"${goal}"

IMPORTANT RULES:
1. If you see the page clearly and there are no error messages, your diagnosis MUST be "Healthy".
2. Do not report a "Backend Error" unless you see a 500 error or the page is totally blank.
3. If you see a button that matches the goal, click it.

NETWORK CONTEXT:
You are operating on a slow mobile network (3G).
Long loading times, spinners, and delayed UI responses are expected.
Do NOT classify slowness alone as a backend or frontend error.
Only report errors if the UI is broken, unresponsive, or blocks progress.

Identify the element you want to interact with and provide its center coordinates as percentages (0-100) of the width and height.

RECENT HISTORY:
${JSON.stringify(history.slice(-2))}

TECHNICAL CONTEXT:
Network Errors: ${JSON.stringify(logs.networkErrors)} 
Console Errors: ${JSON.stringify(logs.consoleErrors)}

Return ONLY valid JSON in this exact format:
{
  "action": "click" | "type" | "scroll" | "finish",
  "location":{"x":number,"y":number},
  "selector": "what you see on screen",
  "text": "string (only if action is type)",
  "reasoning": "short explanation",
  "frustration_level": 0-10,
  "diagnosis": "Healthy" | "Backend Error" | "Frontend Crash" | "UX Confusion" | "CRITICAL_FAILURE",
  "severity": "None" | "Low" | "Medium" | "High" | "Critical"
}
`;

    try {
      const textResponse = await aiClient.analyze(prompt, base64Image);
      const cleaned = textResponse.replace(/```json|```/g, '').trim();
      return JSON.parse(cleaned);
    } catch (e) {
      console.error('AI analysis failed:', e.message);
      return null;
    }
  }

    async executeAction(page, decision) {
      try {
        if (decision.action === 'scroll') {
          await page.mouse.wheel(0, 600);
          return;
        }

        if (decision.action === 'finish') return;

        // --- VISUAL COORDINATE LOGIC ---
        if (!decision.location) throw new Error("No coordinates provided");

        const viewport = page.viewportSize();
        const x = Math.round((decision.location.x / 100) * viewport.width);
        const y = Math.round((decision.location.y / 100) * viewport.height);

        console.log(`   👉 Visual Action: ${decision.action} at (${x}, ${y})`);

        if (decision.action === 'click') {
          await page.mouse.click(x, y);
        }

        if (decision.action === 'type') {
          await page.mouse.click(x, y); // Focus the field first
          await page.keyboard.type(decision.text || '', { delay: 60 });
          await page.keyboard.press('Enter');
        }

        await page.waitForTimeout(1500);
      } catch (e) {
        console.log(`   -> [Action Failed] ${e.message}`);
        this.frictionEngine.logEvent('ui_error', { target: decision.selector });
      }
    }
}


module.exports = MysteryShopper;
