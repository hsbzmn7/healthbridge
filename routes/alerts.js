const express = require('express');
const router = express.Router();
const AlertLog = require('../models/AlertLog');
const { evaluateSustainedDeviation } = require('../utils/baselineLogic');

// Get alert history for user
router.get('/', async (req, res) => {
  const { user } = req;
  if (!user?.uid) return res.status(401).json({ error: 'Unauthorized' });

  const { days = 30, limit = 50 } = req.query;
  const since = new Date();
  since.setDate(since.getDate() - Number(days));

  try {
    const alerts = await AlertLog.find({ userId: user.uid, timestamp: { $gte: since } })
      .sort({ timestamp: -1 })
      .limit(Number(limit))
      .lean();
    res.json(alerts);
  } catch (err) {
    console.error('Alerts fetch error:', err);
    res.status(500).json({ error: 'Failed to fetch alerts' });
  }
});

// Evaluate current vitals for sustained deviation (called by sync or periodic job)
router.post('/evaluate', async (req, res) => {
  const { user } = req;
  if (!user?.uid) return res.status(401).json({ error: 'Unauthorized' });

  const { heart_rate, spo2, temperature } = req.body;

  try {
    const results = [];
    if (heart_rate != null) {
      const hr = await evaluateSustainedDeviation(user.uid, 'heart_rate', heart_rate);
      if (hr.shouldAlert) {
        const alert = await AlertLog.create({
          userId: user.uid,
          metric: 'heart_rate',
          message: hr.message,
          duration_minutes: hr.durationMinutes,
          severity: 'medium',
        });
        results.push(alert);
      }
    }
    if (spo2 != null) {
      const sp = await evaluateSustainedDeviation(user.uid, 'spo2', spo2);
      if (sp.shouldAlert) {
        const alert = await AlertLog.create({
          userId: user.uid,
          metric: 'spo2',
          message: sp.message,
          duration_minutes: sp.durationMinutes,
          severity: 'high',
        });
        results.push(alert);
      }
    }
    if (temperature != null) {
      const temp = await evaluateSustainedDeviation(user.uid, 'temperature', temperature);
      if (temp.shouldAlert) {
        const alert = await AlertLog.create({
          userId: user.uid,
          metric: 'temperature',
          message: temp.message,
          duration_minutes: temp.durationMinutes,
          severity: 'medium',
        });
        results.push(alert);
      }
    }
    res.json({ evaluated: true, newAlerts: results.length, alerts: results });
  } catch (err) {
    console.error('Alert evaluate error:', err);
    res.status(500).json({ error: 'Failed to evaluate' });
  }
});

module.exports = router;
