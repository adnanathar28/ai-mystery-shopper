// src/index.js
const express = require('express');
const cors = require('cors');
const path = require('path');
const MysteryShopper = require('./shopper');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

// IMPORTANT: Serve the sessions folder publicly so Frontend can play videos
// This maps http://localhost:3001/sessions/ -> public/sessions/
app.use('/sessions', express.static(path.join(__dirname, '../public/sessions')));

const shopper = new MysteryShopper(process.env.OPENAI_API_KEY);

app.post('/api/shop', async (req, res) => {
  const { url, goal } = req.body;
  try {
    const report = await shopper.runMission(url, goal);
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