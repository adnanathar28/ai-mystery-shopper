// src/aiClient.js
const { GoogleGenerativeAI } = require('@google/generative-ai');
const OpenAI = require('openai');

class AIClient {
    constructor() {
        this.provider = process.env.AI_PROVIDER || 'gemini'; // 'gemini' or 'openai'
        
        if (this.provider === 'gemini') {
            const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
            this.model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
        } else {
            this.openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
        }
    }

    async analyze(prompt, base64Image) {
        if (this.provider === 'gemini') {
            const result = await this.model.generateContent([
                { text: prompt },
                { inlineData: { mimeType: "image/jpeg", data: base64Image } }
            ]);
            return result.response.text();
        } else {
            const response = await this.openai.chat.completions.create({
                model: "gpt-4o-mini", // Use 4o-mini for speed/cost (it has vision)
                messages: [
                    {
                        role: "user",
                        content: [
                            { type: "text", text: prompt },
                            { type: "image_url", image_url: { url: `data:image/jpeg;base64,${base64Image}` } }
                        ],
                    },
                ],
            });
            return response.choices[0].message.content;
        }
    }
}

module.exports = new AIClient();