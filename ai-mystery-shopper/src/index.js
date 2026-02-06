require('dotenv').config();
const express = require('express');
const cors = require('cors');
const MysteryShopper = require('./shopper');

const app = express();
app.use(express.json());
app.use(cors());
app.use(express.static('public')); 

app.post('/api/shop', async (req, res) => {
    const { url, goal } = req.body;
    try {
        const shopper = new MysteryShopper(process.env.OPENAI_API_KEY);
        const report = await shopper.runMission(url, goal);
        res.json({ status: 'success', report });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.listen(3001, () => console.log(`Backend running on port 3001`));