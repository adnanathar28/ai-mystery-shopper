// src/notifier.js
const axios = require('axios');

class Notifier {
    constructor(webhookUrl) {
        this.webhookUrl = webhookUrl;
    }

        async sendAlert(report, goal, targetUrl) {
        if (!this.webhookUrl) return;

        const rca = report.rca; // The JSON from generateRCA
        const isCritical = report.confusionScore >= 50;
        const color = isCritical ? "#FF0000" : "#2EB67D";
        const videoLink = report.videoUrl 
            ? `<http://localhost:3001${report.videoUrl}|Watch Recording>` 
            : "No recording captured";

        const message = {
            attachments: [
                {
                    color: color,
                    title: `🚨 Friction Alert: ${report.priority}`,
                    title_link: targetUrl,
                    fields: [
                        { title: "Goal", value: goal || report.goal, short: false },
                        { title: "Assigned Team", value: `*${rca.owner || 'Unknown'}*`, short: true },
                        { title: "Confusion Score", value: `${report.confusionScore}/100`, short: true },
                        { title: "Executive Summary", value: rca.summary || "Mission completed or aborted.", short: false },
                        { title: "Root Cause", value: `\`${rca.rootCause || 'N/A'}\``, short: false },
                        { title: "Suggested Fix", value: rca.suggestedFix || "No fix required.", short: false },
                        { title: "Steps Taken", value: report.totalEvents.toString(), short: true },
                        { title: "Evidence", value: videoLink, short: true }
                    ],
                    footer: `Persona: ${report.persona} | Device: ${report.device}`,
                    ts: Math.floor(Date.now() / 1000)
                }
            ]
        };

        try {
            await axios.post(this.webhookUrl, message);
            console.log("[Notifier] Slack alert sent.");
        } catch (err) {
            console.error("[Notifier] Failed to send Slack alert:", err.message);
        }
    }
}

module.exports = Notifier;