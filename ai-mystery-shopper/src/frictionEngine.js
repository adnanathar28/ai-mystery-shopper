// src/frictionEngine.js

class FrictionEngine { //whole point of this is to turn frustration into a single number and clear diagnosis that a human can act on
    constructor() {
        this.events = []; // a notebook
    }

    logEvent(type, details) { //imp, shopper.js calls this whenever something useful has to be logged
        this.events.push({
            type, // 'ai_thought', 'ui_error', 'navigation'
            timestamp: Date.now(),
            details // Now includes { diagnosis, severity }
        });
    }

    calculateScore() { //quantifies the pain
        let score = 0;
        let recentUrls = [];
        let criticalFailure = false;

        this.events.forEach((event, index) => {
            const { details } = event;

            // 1. AI Subjective Frustration (0-10)
            if (details.aiFrustrationLevel>5) {
                score += details.aiFrustrationLevel * 2; // Reduced weight slightly
            }

            // 2. DIAGNOSIS Penalties (New!)
            if (details.diagnosis === 'Backend Error' ) score += 20; // reduced penalty because of ai hallucinations
            if (details.severity === 'Critical') {
                score += 80; // Max score immediately
                criticalFailure = true;
            }
            if (details.severity === 'High') score += 25;

            // 3. Technical Errors
            if (event.type === 'ui_error') score += 15;

            // 4. Backtracking (Circular Navigation)
            if (event.type === 'navigation') { //if user keeps ending up on same page
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
        const rawScore = this.calculateScore();

        // ✅ Detect if goal was completed
        const goalCompleted = this.events.some(
            e => e.details?.action === 'finish'
        );

        // ✅ Cap score if journey succeeded
        const finalScore = goalCompleted
            ? Math.min(rawScore, 30)
            : rawScore;

        // Filter for the most severe diagnosis found
        const criticalIssues = this.events
            .filter(e => e.details?.severity === 'Critical' || e.details?.severity === 'High')
            .map(e => e.details.diagnosis);

        return {
            totalEvents: this.events.length,
            confusionScore: finalScore,
            topDiagnosis: criticalIssues.length > 0 ? criticalIssues[0] : "None",
            log: this.events
        };
    }

}

module.exports = FrictionEngine;