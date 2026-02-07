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

            // 1. AI Subjective Frustration (0-10)
            if (details.aiFrustrationLevel > 5) {
                score += (details.aiFrustrationLevel * 2); 
            }

            // 2. DIAGNOSIS Penalties
            if (details.diagnosis === 'Backend Error') score += 20; 
            if (details.severity === 'Critical') {
                score += 80; 
                criticalFailure = true;
            }
            if (details.severity === 'High') score += 25;

            // 3. Technical Errors
            if (event.type === 'ui_error') score += 15;

            // 4. Count scrolling actions
            if (details.action === 'scroll') {
                scrollCount++;
            }

            // 5. Track URL progress (Circular Navigation detector)
            if (details.url) {
                if (index > 0) {
                    const prevUrl = this.events[index - 1].details?.url;
                    if (prevUrl && details.url !== prevUrl) {
                        urlChanged = true;
                    }
                }

                // Penalty for hitting the same page over and over (Loops)
                if (recentUrls.includes(details.url)) {
                    score += 15; 
                }
                recentUrls.push(details.url);
                if (recentUrls.length > 5) recentUrls.shift();
            }
        });

        // 6. UX Penalty: Excessive scrolling without page progress
        // If they scrolled 3+ times but the URL never changed, it's a "Hunt-and-Peck" UX issue.
        if (scrollCount >= 3 && !urlChanged) {
            score += 25; 
        }

        if (criticalFailure) return 100;
        return Math.min(Math.max(score, 0), 100);
    }

    getReport() {
        const rawScore = this.calculateScore();

        // Check if the agent successfully finished the mission
        const goalCompleted = this.events.some(
            e => e.details?.action === 'finish'
        );

        let finalScore = rawScore;

        if (goalCompleted && rawScore<100) {
            /** 
             * DYNAMIC SUCCESS CAP
             * If the journey took more than 7 steps, it wasn't "smooth" even if it finished.
             * We add 5 points for every extra step taken.
             */
            const efficiencyPenalty = this.events.length > 7 
                ? (this.events.length - 7) * 5 
                : 0;
            
            // A long success should be roughly 35-45/100, a short success 0-20/100.
            finalScore = Math.min(rawScore, 20 + efficiencyPenalty);
        }

        // Identify the most severe issue found
        const criticalIssues = this.events
            .filter(e => e.details?.severity === 'Critical' || e.details?.severity === 'High')
            .map(e => e.details.diagnosis);

        return {
            totalEvents: this.events.length,
            confusionScore: Math.round(finalScore),
            topDiagnosis: criticalIssues.length > 0 ? criticalIssues[0] : "None",
            log: this.events
        };
    }
}

module.exports = FrictionEngine;