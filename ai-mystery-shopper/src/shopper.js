// src/shopper.js
const { chromium, devices } = require('playwright');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const FrictionEngine = require('./frictionEngine');
const fs = require('fs');
const path = require('path');

const USER_DATA_DIR = path.join(__dirname, '../public/user_data');

class MysteryShopper {
    constructor(apiKey) {
    this.gemini = new GoogleGenerativeAI(apiKey);
    this.model = this.gemini.getGenerativeModel({
        model: 'gemini-flash-latest',
    });
    this.frictionEngine = new FrictionEngine();
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

    fs.mkdirSync(sessionPath, { recursive: true });

    console.log(
      `[Shopper] Launching Universal Mobile Agent (${mobileDevice.userAgent})`
    );

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
        size: { width: 390, height: 844 },
      },
    });

    const page =
      context.pages().length > 0
        ? context.pages()[0]
        : await context.newPage();

    const sessionLogs = { errors: [], console: [] };

    page.on('response', (response) => {
      const resUrl = response.url();
      if (
        resUrl.match(
          /backtrace|google-analytics|segment|doubleclick|facebook|newrelic/
        )
      )
        return;

      if (response.status() >= 400) {
        sessionLogs.errors.push({
          status: response.status(),
          url: resUrl,
        });
      }
    });

    page.on('console', (msg) => {
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

      while (!completed && stepCount < MAX_STEPS) {
        stepCount++;
        console.log(`\n--- Step ${stepCount} ---`);
        await page.waitForTimeout(2000);

        const screenshotBuffer = await page.screenshot({
          type: 'jpeg',
          quality: 60,
        });
        const base64Image = screenshotBuffer.toString('base64');

        fs.writeFileSync(
          path.join(sessionPath, `step-${stepCount}.jpg`),
          screenshotBuffer
        );

        if (base64Image === lastScreenshot) {
          console.log('⚠️ Visual Warning: Viewport static since last step.');
        }
        lastScreenshot = base64Image;

        const recentLogs = {
          networkErrors: sessionLogs.errors.slice(-3),
          consoleErrors: sessionLogs.console.slice(-3),
        };

        const aiDecision = await this.analyzePage(
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

        this.frictionEngine.logEvent('ai_thought', {
          thought: aiDecision.reasoning,
          aiFrustrationLevel: aiDecision.frustration_level,
          diagnosis: aiDecision.diagnosis,
          severity: aiDecision.severity,
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

        await this.executeAction(page, aiDecision);
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
    return report;
  }

  async analyzePage(base64Image, goal, history, logs) {
    const prompt = `
You are an AI Mystery Shopper on a mobile device.

GOAL:
"${goal}"

RECENT HISTORY:
${JSON.stringify(history.slice(-2))}

TECHNICAL CONTEXT:
Network Errors: ${JSON.stringify(logs.networkErrors)}
Console Errors: ${JSON.stringify(logs.consoleErrors)}

Return ONLY valid JSON in this exact format:
{
  "action": "click" | "type" | "scroll" | "finish",
  "selector": "what you see on screen",
  "text": "string (only if action is type)",
  "reasoning": "short explanation",
  "frustration_level": 0-10,
  "diagnosis": "Healthy" | "Backend Error" | "Frontend Crash" | "UX Confusion" | "CRITICAL_FAILURE",
  "severity": "None" | "Low" | "Medium" | "High" | "Critical"
}
`;

    try {
      const result = await this.model.generateContent([
        { text: prompt },
        {
          inlineData: {
            mimeType: 'image/jpeg',
            data: base64Image,
          },
        },
      ]);

      const cleaned = result.response
        .text()
        .replace(/```json|```/g, '')
        .trim();

      return JSON.parse(cleaned);
    } catch (e) {
      console.error('Gemini analysis failed:', e.message);
      return null;
    }
  }

  async executeAction(page, decision) {
    const cleanSelector = decision.selector
      .replace(/button|input|field|link|bar|icon/gi, '')
      .trim();

    const findInFrames = async (locatorFn) => {
      let loc = locatorFn(page);
      if (await loc.count() > 0 && (await loc.first().isVisible()))
        return loc.first();

      for (const frame of page.frames()) {
        try {
          loc = locatorFn(frame);
          if (await loc.count() > 0 && (await loc.first().isVisible()))
            return loc.first();
        } catch {}
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
          (p) => p.getByText(cleanSelector, { exact: false }),
          (p) => p.locator(`img[alt*="${cleanSelector}" i]`),
        ];

        for (const strat of strategies) {
          const el = await findInFrames(strat);
          if (el) {
            await el.click({ timeout: 1500 });
            return;
          }
        }

        throw new Error(`Element not found: "${decision.selector}"`);
      }

      if (decision.action === 'type') {
        const strategies = [
          (p) => p.getByPlaceholder(cleanSelector, { exact: false }),
          (p) => p.getByLabel(cleanSelector, { exact: false }),
          (p) => p.getByRole('textbox', { name: cleanSelector, exact: false }),
          (p) => p.locator('input[type="search"]'),
          (p) => p.locator('input').first(),
        ];

        for (const strat of strategies) {
          const el = await findInFrames(strat);
          if (el) {
            await el.fill(decision.text);
            await page.keyboard.press('Enter');
            return;
          }
        }

        throw new Error(`Input field not found: "${decision.selector}"`);
      }
    } catch (e) {
      console.log(`   -> [Action Failed] ${e.message}`);
      this.frictionEngine.logEvent('ui_error', {
        target: decision.selector,
      });
    }
  }
}

module.exports = MysteryShopper;
