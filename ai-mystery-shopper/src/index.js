// src/index.js
require('dotenv').config(); // MUST BE LINE 1

const express = require('express');
const cors = require('cors');
const path = require('path');
const MysteryShopper = require('./shopper');

// console.log("GEMINI_API_KEY value:", process.env.GEMINI_API_KEY);
// console.log("GEMINI_API_KEY exists:", !!process.env.GEMINI_API_KEY);

const app = express();
app.use(cors());
app.use(express.json());

// IMPORTANT: Serve the sessions folder publicly so Frontend can play videos
// This maps http://localhost:3001/sessions/ -> public/sessions/
app.use('/sessions', express.static(path.join(__dirname, '../public/sessions')));

const shopper = new MysteryShopper(process.env.GEMINI_API_KEY);

app.post('/api/shop', async (req, res) => {
  const { url, goal, persona, device } = req.body;
  try {
    const report = await shopper.runMission(url, goal || "", {
        persona: persona || 'first_time_user', 
        device: device || 'mobile' 
    });
    res.json({ report });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

const PORT = 3001;
app.listen(PORT, () => {
  console.log(`AI Shopper Backend running on port ${PORT}`);
});

app.get('/api/human/status', (req, res) => {
  res.json(shopper.getHumanGateStatus());
});

app.post('/api/human/resume', (req, res) => {
  const result = shopper.resumeHumanGate();
  res.json(result);
});
