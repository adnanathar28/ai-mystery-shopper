// src/frictionEngine.js

/**
 * Calculates a dynamic "Confusion Score" based on session telemetry.
 * Score range: 0 (Smooth) to 100 (Rage Quit).
 */
class FrictionEngine {
    constructor() {
        this.events = [];
        this.baselineTimePerStep = 5000; // ms
    }

    logEvent(type, details) {
        this.events.push({
            type, // 'action', 'error', 'hesitation', 'backtrack'
            timestamp: Date.now(),
            details
        });
    }

    calculateScore() {
        let score = 0;
        let recentUrls = [];

        this.events.forEach((event, index) => {
            // 1. AI-Reported Frustration (Subjective)
            if (event.details.aiFrustrationLevel) {
                score += event.details.aiFrustrationLevel * 5; 
            }

            // 2. Backtracking Detection (Objective)
            if (event.type === 'navigation') {
                if (recentUrls.includes(event.details.url)) {
                    score += 15; // High penalty for circular navigation
                }
                recentUrls.push(event.details.url);
                if (recentUrls.length > 3) recentUrls.shift();
            }

            // 3. Error Modals/Toasts Detected
            if (event.type === 'ui_error') {
                score += 20;
            }

            // 4. Hesitation (Time between actions)
            if (index > 0) {
                const timeDiff = event.timestamp - this.events[index - 1].timestamp;
                if (timeDiff > 10000) { // If thinking > 10s
                    score += 5; 
                }
            }
        });

        // Cap score at 100
        return Math.min(Math.max(score, 0), 100);
    }

    getReport() {
        return {
            totalEvents: this.events.length,
            confusionScore: this.calculateScore(),
            log: this.events
        };
    }
}

module.exports = FrictionEngine;