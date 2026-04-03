const express = require('express');
const router = express.Router();
const AlertLog = require('../models/AlertLog');
const HeartRate = require('../models/HeartRate');
const { evaluateAndPersistAlerts } = require('../utils/alertEvaluation');
const { getBaseline } = require('../utils/baselineLogic');

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

// Positive reinforcement when recent vitals look stable (no alerts in window, enough HR data)
router.get('/wellbeing', async (req, res) => {
  const { user } = req;
  if (!user?.uid) return res.status(401).json({ error: 'Unauthorized' });

  const windowDays = Number(req.query.days) || 7;
  const since = new Date();
  since.setDate(since.getDate() - windowDays);

  try {
    const recentAlertCount = await AlertLog.countDocuments({
      userId: user.uid,
      timestamp: { $gte: since },
    });
    if (recentAlertCount > 0) {
      return res.json({ message: null });
    }

    const hrCount = await HeartRate.countDocuments({ userId: user.uid });
    if (hrCount < 5) {
      return res.json({ message: null });
    }

    const baseline = await getBaseline(user.uid);
    if (!baseline.heart_rate) {
      return res.json({ message: null });
    }

    return res.json({
      message:
        'Your recent vitals look stable compared to your baseline. Keep up your healthy routines.',
    });
  } catch (err) {
    console.error('Wellbeing summary error:', err);
    res.status(500).json({ error: 'Failed to load wellbeing summary' });
  }
});

// Evaluate current vitals for sustained deviation (manual / cron / client)
router.post('/evaluate', async (req, res) => {
  const { user } = req;
  if (!user?.uid) return res.status(401).json({ error: 'Unauthorized' });

  const { heart_rate, spo2, temperature } = req.body;

  try {
    const results = await evaluateAndPersistAlerts(user.uid, { heart_rate, spo2, temperature });
    res.json({ evaluated: true, newAlerts: results.length, alerts: results });
  } catch (err) {
    console.error('Alert evaluate error:', err);
    res.status(500).json({ error: 'Failed to evaluate' });
  }
});

module.exports = router;
