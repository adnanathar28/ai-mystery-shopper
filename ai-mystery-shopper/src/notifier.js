// src/notifier.js
const axios = require('axios');

class Notifier {
    constructor(webhookUrl) {
        this.webhookUrl = webhookUrl;
    }

    async sendAlert(report, goal, targetUrl) {
        if (!this.webhookUrl) return console.log("Slack Webhook not configured.");

        const isCritical = report.confusionScore > 50;
        const color = isCritical ? "#ff4444" : "#36a64f"; //red bad, green good
        const statusEmoji = isCritical ? "🚨 CRITICAL FRICTION" : "✅ SMOOTH RUN"; //emojis matter in slack

        const message = { //main message
            attachments: [ //attachment metadata
                {
                    color: color,
                    title: `${statusEmoji}: ${targetUrl}`, //color reflects severity and title tells us more details
                    fields: [ //most imp
                        { title: "Goal", value: goal, short: false }, //what goal was user trying
                        { title: "Confusion Score", value: `${report.confusionScore}/100`, short: true }, //how bad was it
                        { title: "Top Diagnosis", value: report.topDiagnosis, short: true }, //ai value:why did it fail
                        { title: "Steps Taken", value: report.totalEvents.toString(), short: true }, //did the user struggle or fail immidieatly
                        { title: "Evidence", value: `[Watch Recording](http://localhost:3001${report.videoUrl})`, short: true } //link to video
                    ],
                    footer: "Autonomous Mystery Shopper AI",
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