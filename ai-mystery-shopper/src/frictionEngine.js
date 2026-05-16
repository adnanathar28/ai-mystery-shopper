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
    let criticalFailure = false;

    this.events.forEach((event) => {
      const { details } = event;
      if (!details) return;

      // 🚨 CRITICAL FIX 1: Weight site-wide errors much higher
      // If the AI identifies a Backend Error or Frontend Crash, it's a P0.
      if (details.diagnosis === 'Backend Failure') score += 90; 
      if (details.diagnosis === 'Frontend Failure') score += 80;
      if (details.diagnosis === 'Missing Route') score += 55;
      if (details.diagnosis === 'Broken Navigation') score += 45;
      if (details.diagnosis === 'Dead Link') score += 35;
      if (details.diagnosis === 'Stuck') score += 50;

      if (details.severity === 'Critical' || details.diagnosis === 'CRITICAL_FAILURE') {
        criticalFailure = true;
      }

      // Emotional Friction
      if (details.aiFrustrationLevel > 5) {
        score += details.aiFrustrationLevel * 3;
      }

      // UI failures
      if (event.type === 'ui_error') score += 20;
    });

    if (criticalFailure) return 100;
    return Math.min(Math.max(score, 0), 100);
  }

  calculateSeverity(score) {
    if (score >= 80) return "P0 - Critical Blocker";
    if (score >= 50) return "P1 - High Friction";
    if (score >= 30) return "P2 - Moderate Issue";
    return "P3 - Minor/Healthy";
  }

  getReport() {
    const rawScore = this.calculateScore();
    
    // 🚨 CRITICAL FIX 2: Define what "Terminal Failure" actually means
    // We must include "Backend Error" as a failure, even if the AI clicks 'finish'.
    const failureDiagnoses = ['Stuck', 'CRITICAL_FAILURE', 'Backend Failure', 'Frontend Failure', 'Missing Route'];
    
    const hasTerminalFailure = this.events.some(e => 
      failureDiagnoses.includes(e.details?.diagnosis) || 
      e.details?.severity === 'Critical'
    );

    const hasFinishAction = this.events.some(e => e.details?.action === 'finish');
    
    // A run is ONLY successful if it finished AND had no terminal diagnoses.
    const trulySucceeded = hasFinishAction && !hasTerminalFailure;

    let finalScore = rawScore;

    if (trulySucceeded) {
      // Logic for actual smooth runs...
      const totalFrustration = this.events.reduce((acc, e) => acc + (e.details?.aiFrustrationLevel || 0), 0);
      finalScore = Math.min(rawScore, (totalFrustration > 2 ? 30 : 10));
    } else {
      // If it failed or was blocked, ensure the score reflects the gravity
      // A backend error should never result in a score below 80.
      if (hasTerminalFailure) {
        finalScore = Math.max(rawScore, 80);
      }
    }

    // 🚨 CRITICAL FIX 3: Better Diagnosis Picking
    const issues = this.events.filter(e => e.details?.diagnosis && e.details.diagnosis !== 'Healthy');
    let topDiagnosis = 'Healthy';
    
    if (issues.length > 0) {
      // Pick the most severe diagnosis found in the logs
      const priorityOrder = ['Backend Failure', 'Frontend Failure', 'Missing Route', 'Broken Navigation', 'Dead Link', 'Stuck', 'UI Glitch'];
      topDiagnosis = issues.sort((a, b) => {
        return priorityOrder.indexOf(a.details.diagnosis) - priorityOrder.indexOf(b.details.diagnosis);
      })[0].details.diagnosis;
    }

    const roundedScore = Math.round(Math.min(finalScore, 100));

    return {
      totalEvents: this.events.length,
      confusionScore: roundedScore,
      priority: this.calculateSeverity(roundedScore),
      topDiagnosis: topDiagnosis,
      statusLabel: roundedScore >= 50 ? "🚨 CRITICAL FRICTION" : "✅ SMOOTH RUN",
      log: this.events
    };
  }
}

module.exports = FrictionEngine;
