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
          // ONLY penalize scrolling if the AI is actually frustrated
        if (details.aiFrustrationLevel && details.aiFrustrationLevel > 3) {
          scrollCount++;
          score += 5; 
        }
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
    if (scrollCount >= 6 && !urlChanged) {
      score += 15;
    }

    /* 8. Hard stop on critical failure */
    if (criticalFailure) return 100;

    return Math.min(Math.max(score, 0), 100);
  }

    getReport() {
    const rawScore = this.calculateScore();
    const goalCompleted = this.events.some(e => e.details?.action === 'finish');

    let finalScore = rawScore;

    if (goalCompleted) {
      const totalFrustration = this.events.reduce((acc, e) => acc + (e.details?.aiFrustrationLevel || 0), 0);
      const avgFrustration = totalFrustration / this.events.length;
      const efficiencyPenalty = this.events.length > 7 ? (this.events.length - 7) * 5 : 0;

      if (avgFrustration < 2 && this.events.length <= 7) {
        // CASE 1: Truly Smooth (Low frustration, low steps)
        finalScore = Math.min(rawScore, 10);
      } else if (avgFrustration < 2) {
        // CASE 2: Clean but Long (Low frustration, but many steps)
        finalScore = Math.min(rawScore, 20 + efficiencyPenalty);
      } else {
        // CASE 3: Struggling Success (Higher frustration)
        finalScore = Math.max(rawScore * 0.5, 25 + efficiencyPenalty);
      }
    }

    // --- TOP DIAGNOSIS LOGIC ---
    const criticalIssues = this.events
      .filter(e => e.details?.severity === 'Critical' || e.details?.severity === 'High')
      .map(e => e.details.diagnosis);

    let topDiagnosis = 'None';
    if (criticalIssues.length > 0) {
      topDiagnosis = criticalIssues[0];
    } else {
      const allDiagnoses = this.events
        .filter(e => e.details?.diagnosis && e.details.diagnosis !== 'Healthy')
        .map(e => e.details.diagnosis);
      if (allDiagnoses.length > 0) {
        topDiagnosis = allDiagnoses[0];
      }
    }

    return {
      totalEvents: this.events.length,
      confusionScore: Math.round(Math.min(finalScore, 100)), // Ensure max is 100
      topDiagnosis: topDiagnosis, // Use the variable we just calculated!
      log: this.events
    };
  }
}

module.exports = FrictionEngine;
