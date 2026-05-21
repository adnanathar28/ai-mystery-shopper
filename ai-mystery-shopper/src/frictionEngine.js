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

      // CRITICAL FIX 1: Weight site-wide errors much higher
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
    
    const hasFinishAction = this.events.some(e => e.details?.action === 'finish');
    const thoughtEvents = this.events.filter((e) => e.type === 'ai_thought');
    const lastThought = thoughtEvents.length ? thoughtEvents[thoughtEvents.length - 1] : null;

    // Terminal failure is based on unresolved end-state, not transient mid-run spikes.
    const unresolvedTerminalDiagnoses = new Set(['Stuck', 'CRITICAL_FAILURE', 'Backend Failure', 'Frontend Failure', 'Missing Route']);
    const unresolvedTerminal =
      !!lastThought &&
      (unresolvedTerminalDiagnoses.has(lastThought.details?.diagnosis) || lastThought.details?.severity === 'Critical');

    // If mission finished and ended healthy-ish, treat earlier failures as recovered/transient.
    const trulySucceeded = hasFinishAction && !unresolvedTerminal;

    let finalScore = rawScore;

    if (trulySucceeded) {
      // Logic for actual smooth runs...
      const totalFrustration = this.events.reduce((acc, e) => acc + (e.details?.aiFrustrationLevel || 0), 0);
      finalScore = Math.min(rawScore, (totalFrustration > 2 ? 30 : 15));
    } else {
      // If it failed or was blocked, ensure the score reflects the gravity
      if (unresolvedTerminal) {
        finalScore = Math.max(rawScore, 80);
      }
    }

    // CRITICAL FIX 3: Better Diagnosis Picking
    const issues = trulySucceeded
      ? thoughtEvents.filter((e) => {
          const d = e.details?.diagnosis;
          return d && !['Healthy', 'UI Glitch', 'AUTH_REQUIRED'].includes(d);
        })
      : this.events.filter(e => e.details?.diagnosis && e.details.diagnosis !== 'Healthy');
    let topDiagnosis = 'Healthy';
    
    if (unresolvedTerminal && lastThought?.details?.diagnosis) {
      topDiagnosis = lastThought.details.diagnosis;
    } else if (issues.length > 0) {
      // Pick the most severe diagnosis found in the logs
      const priorityOrder = ['Backend Failure', 'Frontend Failure', 'Missing Route', 'Broken Navigation', 'Dead Link', 'Stuck', 'UI Glitch'];
      topDiagnosis = issues.sort((a, b) => {
        return priorityOrder.indexOf(a.details.diagnosis) - priorityOrder.indexOf(b.details.diagnosis);
      })[0].details.diagnosis;
    }

    const roundedScore = Math.round(Math.min(finalScore, 100));
    const contractEvents = this.events.filter((e) => e.type === 'ai_thought' && e.details?.contractVerdict);
    const contractTotal = contractEvents.length;
    const contractMatched = contractEvents.filter((e) => e.details.contractVerdict === 'matched').length;
    const contractFailed = contractEvents.filter((e) => e.details.contractVerdict === 'failed').length;
    const contractInconclusive = contractEvents.filter((e) => e.details.contractVerdict === 'inconclusive').length;
    const pct = (n) => contractTotal > 0 ? Math.round((n / contractTotal) * 100) : 0;

    return {
      totalEvents: this.events.length,
      confusionScore: roundedScore,
      priority: this.calculateSeverity(roundedScore),
      topDiagnosis: topDiagnosis,
      statusLabel: roundedScore >= 50 ? "CRITICAL FRICTION" : "SMOOTH RUN",
      contractPassRate: pct(contractMatched),
      contractFailRate: pct(contractFailed),
      contractInconclusiveRate: pct(contractInconclusive),
      contractSampleCount: contractTotal,
      log: this.events
    };
  }
}

module.exports = FrictionEngine;

