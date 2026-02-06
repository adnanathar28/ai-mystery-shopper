// src/frictionEngine.js

class FrictionEngine {
    constructor() {
        this.events = [];
    }

    logEvent(type, details) {
        this.events.push({
            type, // 'ai_thought', 'ui_error', 'navigation'
            timestamp: Date.now(),
            details // Now includes { diagnosis, severity }
        });
    }

    calculateScore() {
        let score = 0;
        let recentUrls = [];
        let criticalFailure = false;

        this.events.forEach((event, index) => {
            const { details } = event;

            // 1. AI Subjective Frustration (0-10)
            if (details.aiFrustrationLevel) {
                score += details.aiFrustrationLevel * 4; // Reduced weight slightly
            }

            // 2. DIAGNOSIS Penalties (New!)
            if (details.diagnosis === 'Backend Error') score += 50; // Instant fail
            if (details.severity === 'Critical') {
                score = 100; // Max score immediately
                criticalFailure = true;
            }
            if (details.severity === 'High') score += 25;

            // 3. Technical Errors
            if (event.type === 'ui_error') score += 15;

            // 4. Backtracking (Circular Navigation)
            if (event.type === 'navigation') {
                if (recentUrls.includes(details.url)) {
                    score += 15; 
                }
                recentUrls.push(details.url);
                if (recentUrls.length > 3) recentUrls.shift();
            }
        });

        if (criticalFailure) return 100;
        return Math.min(Math.max(score, 0), 100);
    }

    getReport() {
        // Filter for the most severe diagnosis found
        const criticalIssues = this.events
            .filter(e => e.details?.severity === 'Critical' || e.details?.severity === 'High')
            .map(e => e.details.diagnosis);

        return {
            totalEvents: this.events.length,
            confusionScore: this.calculateScore(),
            topDiagnosis: criticalIssues.length > 0 ? criticalIssues[0] : "None",
            log: this.events
        };
    }
}

module.exports = FrictionEngine;