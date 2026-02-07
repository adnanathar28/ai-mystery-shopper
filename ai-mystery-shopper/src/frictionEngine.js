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
        scrollCount++;
      }

      /* 5. Navigation & loop detection */
      if (details.url) {
        if (index > 0) {
          const prevUrl = this.events[index - 1].details?.url;
          if (prevUrl && prevUrl !== details.url) {
            urlChanged = true;
          }
        }

        if (recentUrls.includes(details.url)) {
          score += 15; // looping penalty
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
    if (scrollCount >= 3 && !urlChanged) {
      score += 25;
    }

    /* 8. Hard stop on critical failure */
    if (criticalFailure) return 100;

    return Math.min(Math.max(score, 0), 100);
  }

  getReport() {
    const rawScore = this.calculateScore();

    const goalCompleted = this.events.some(
      e => e.details?.action === 'finish'
    );

    let finalScore = rawScore;

    if (goalCompleted && rawScore < 100) {
      /**
       * Efficiency friction:
       * Long successful journeys still hurt UX.
       */
      const efficiencyPenalty =
        this.events.length > 7
          ? (this.events.length - 7) * 5
          : 0;

      finalScore = Math.min(rawScore, 20 + efficiencyPenalty);
    }

    const criticalIssues = this.events
      .filter(
        e =>
          e.details?.severity === 'Critical' ||
          e.details?.severity === 'High'
      )
      .map(e => e.details.diagnosis);

    return {
      totalEvents: this.events.length,
      confusionScore: Math.round(finalScore),
      topDiagnosis: criticalIssues.length > 0 ? criticalIssues[0] : 'None',
      log: this.events
    };
  }
}

module.exports = FrictionEngine;
