// src/frictionEngine.js

class FrictionEngine {
  constructor() {
    this.events = [];
  }

  logEvent(type, details) {
    this.events.push({
      type,
      timestamp: Date.now(),
      details
    });
  }

  calculateScore() {
    let score = 0;
    let recentUrls = [];
    let criticalFailure = false;
    let scrollCount = 0;
    let urlChanged = false;

    this.events.forEach((event, index) => {
      const { details } = event;
      if (!details) return;

      /* 1. Emotional Friction (AI frustration) */
      if (details.aiFrustrationLevel && details.aiFrustrationLevel > 5) {
        score += details.aiFrustrationLevel * 2;
      }

      /* 2. Diagnosis & Severity penalties */
      if (details.diagnosis === 'Backend Error') score += 20;
      if (details.diagnosis === 'Stuck') score += 15;

      if (details.severity === 'High') score += 25;

      if (details.severity === 'Critical') {
        score += 80;
        criticalFailure = true;
      }

      /* 3. UI / Interaction failures */
      if (event.type === 'ui_error') {
        score += 15;
      }

      /* 4. Scroll-based discoverability friction */
      if (details.action === 'scroll') {
          // ONLY penalize scrolling if the AI is actually frustrated
        if (details.aiFrustrationLevel && details.aiFrustrationLevel > 3) {
          scrollCount++;
          score += 5; 
        }
      }

      /* 5. Navigation & loop detection */
      if (details.url) {
        const prevUrl = index > 0 ? this.events[index - 1].details?.url : null;
        if (prevUrl && prevUrl !== details.url) {
          urlChanged = true;
        }

        // Penalize only when we return to a prior URL (loop),
        // not when multiple events occur on the same page.
        if (recentUrls.includes(details.url) && prevUrl && prevUrl !== details.url) {
          score += 15;
        }

        recentUrls.push(details.url);
        if (recentUrls.length > 5) recentUrls.shift();
      }

      /* 6. Performance friction (slow network / 3G) */
      if (details.duration && details.duration > 5000) {
        score += 10; // slow step penalty
      }
    });

    /* 7. Excessive scrolling without progress */
    if (scrollCount >= 6 && !urlChanged) {
      score += 20;
    }

    /* 8. Hard stop on critical failure */
    if (criticalFailure) return 100;

    return Math.min(Math.max(score, 0), 100);
  }

  calculateSeverity(score) {
    if (score >= 80) return "P0 - Critical Blocker";
    if (score >= 50) return "P1 - High Friction";
    if (score >= 30) return "P2 - Moderate Issue";
    return "P3 - Minor/Healthy";
  }

// src/frictionEngine.js (Updated getReport method)

getReport() {
    const rawScore = this.calculateScore();
    
    // 1. Determine Mission State
    const hasFinishAction = this.events.some(e => e.details?.action === 'finish');
    const hasTerminalFailure = this.events.some(
      e =>
        e.details?.diagnosis === 'Stuck' ||
        e.details?.diagnosis === 'CRITICAL_FAILURE' ||
        e.details?.severity === 'Critical'
    );
    const trulySucceeded = hasFinishAction && !hasTerminalFailure;
    const gaveUp = this.events.some(e => e.details?.diagnosis === 'Stuck');

    let finalScore = rawScore;

    // 2. Score Adjustment Logic
    if (trulySucceeded) {
      const totalFrustration = this.events.reduce((acc, e) => acc + (e.details?.aiFrustrationLevel || 0), 0);
      const avgFrustration = totalFrustration / this.events.length;
      const stepAllowance = 15;
      const efficiencyPenalty = this.events.length > stepAllowance ? (this.events.length - stepAllowance) * 5 : 0;

      if (avgFrustration < 2 && this.events.length <= 7) {
        finalScore = Math.min(rawScore, 10);
      } else if (avgFrustration < 2) {
        finalScore = Math.min(rawScore, 20 + efficiencyPenalty);
      } else {
        finalScore = Math.max(rawScore * 0.5, 25 + efficiencyPenalty);
      }
    } else if (gaveUp) {
      // If the AI gave up, it's at least a 70 (P1/P0 territory)
      finalScore = Math.max(rawScore, 70);
    }

    // 3. ROBUST TOP DIAGNOSIS LOGIC
    // We want the MOST SEVERE or the LATEST problem found.
    const issues = this.events
      .filter(e => e.details?.diagnosis && e.details.diagnosis !== 'Healthy');

    let topDiagnosis = 'None';
    
    if (issues.length > 0) {
      // Strategy: Prioritize 'Stuck' as it represents the final blocker.
      const criticalBlocker = issues.find(e => e.details.diagnosis === 'Stuck');
      if (criticalBlocker) {
        topDiagnosis = 'Stuck / Mission Failure';
      } else {
        // Fallback to the very last issue logged before the mission ended
        topDiagnosis = issues[issues.length - 1].details.diagnosis;
      }
    }

    const roundedScore = Math.round(Math.min(finalScore, 100));

    return {
      totalEvents: this.events.length,
      confusionScore: roundedScore,
      priority: this.calculateSeverity(roundedScore), // Adding the P0/P1/P2 label
      topDiagnosis: topDiagnosis,
      log: this.events
    };
  }
}

module.exports = FrictionEngine;
