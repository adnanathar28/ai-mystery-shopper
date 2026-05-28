// src/index.js
require('dotenv').config(); // MUST BE LINE 1

const express = require('express');
const cors = require('cors');
const path = require('path');
const MysteryShopper = require('./shopper');
const prisma = require('./db');

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

app.get('/api/missions', async (req, res) => {
  try {
    const page = Math.max(Number(req.query.page || 1), 1);
    const pageSize = Math.min(Math.max(Number(req.query.pageSize || 20), 1), 100);
    const skip = (page - 1) * pageSize;

    const [missions, total] = await Promise.all([
      prisma.mission.findMany({
        orderBy: { createdAt: 'desc' },
        skip,
        take: pageSize,
        select: {
          id: true,
          createdAt: true,
          startedAt: true,
          finishedAt: true,
          targetUrl: true,
          goal: true,
          persona: true,
          device: true,
          status: true,
          confusionScore: true,
          priority: true,
          topDiagnosis: true,
          videoUrl: true
        }
      }),
      prisma.mission.count()
    ]);

    res.json({
      page,
      pageSize,
      total,
      missions
    });
  } catch (error) {
    console.error('[API] /api/missions failed:', error.message);
    res.status(500).json({ error: 'Failed to fetch missions' });
  }
});

app.get('/api/missions/:id', async (req, res) => {
  try {
    const mission = await prisma.mission.findUnique({
      where: { id: req.params.id },
      include: {
        steps: {
          orderBy: { stepIndex: 'asc' }
        },
        screenshots: {
          orderBy: { stepIndex: 'asc' }
        }
      }
    });

    if (!mission) {
      return res.status(404).json({ error: 'Mission not found' });
    }

    res.json({ mission });
  } catch (error) {
    console.error('[API] /api/missions/:id failed:', error.message);
    res.status(500).json({ error: 'Failed to fetch mission details' });
  }
});

app.delete('/api/missions/:id', async (req, res) => {
  try {
    const mission = await prisma.mission.findUnique({
      where: { id: req.params.id },
      select: {
        id: true
      }
    });

    if (!mission) {
      return res.status(404).json({ error: 'Mission not found' });
    }

    await prisma.mission.delete({
      where: { id: req.params.id }
    });

    res.json({ deleted: true, id: mission.id });
  } catch (error) {
    console.error('[API] DELETE /api/missions/:id failed:', error.message);
    res.status(500).json({ error: 'Failed to delete mission' });
  }
});
