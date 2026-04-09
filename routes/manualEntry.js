const express = require('express');
const router = express.Router();
const BloodGlucoseLog = require('../models/BloodGlucoseLog');
const BloodPressureLog = require('../models/BloodPressureLog');
const DoctorVisit = require('../models/DoctorVisit');

// Blood Glucose - manual entry
router.post('/blood-glucose', async (req, res) => {
  const { user } = req;
  if (!user?.uid) return res.status(401).json({ error: 'Unauthorized' });

  const { value, unit = 'mg/dL', notes } = req.body;
  if (value == null || value === '') {
    return res.status(400).json({ error: 'Blood glucose value is required' });
  }

  try {
    const log = await BloodGlucoseLog.create({
      userId: user.uid,
      value: Number(value),
      unit,
      notes: notes || '',
    });
    res.status(201).json(log);
  } catch (err) {
    console.error('Blood glucose save error:', err);
    res.status(500).json({ error: 'Failed to save blood glucose' });
  }
});

router.get('/blood-glucose', async (req, res) => {
  const { user } = req;
  if (!user?.uid) return res.status(401).json({ error: 'Unauthorized' });

  const { days = 30 } = req.query;
  const since = new Date();
  since.setDate(since.getDate() - Number(days));

  try {
    const logs = await BloodGlucoseLog.find({ userId: user.uid, timestamp: { $gte: since } })
      .sort({ timestamp: -1 })
      .limit(100)
      .lean();
    res.json(logs);
  } catch (err) {
    console.error('Blood glucose fetch error:', err);
    res.status(500).json({ error: 'Failed to fetch blood glucose' });
  }
});

// Blood Pressure - manual entry
router.post('/blood-pressure', async (req, res) => {
  const { user } = req;
  if (!user?.uid) return res.status(401).json({ error: 'Unauthorized' });

  const { systolic, diastolic, notes } = req.body;
  if (systolic == null || diastolic == null) {
    return res.status(400).json({ error: 'Systolic and diastolic values are required' });
  }

  try {
    const log = await BloodPressureLog.create({
      userId: user.uid,
      systolic: Number(systolic),
      diastolic: Number(diastolic),
      notes: notes || '',
    });
    res.status(201).json(log);
  } catch (err) {
    console.error('Blood pressure save error:', err);
    res.status(500).json({ error: 'Failed to save blood pressure' });
  }
});

router.get('/blood-pressure', async (req, res) => {
  const { user } = req;
  if (!user?.uid) return res.status(401).json({ error: 'Unauthorized' });

  const { days = 30 } = req.query;
  const since = new Date();
  since.setDate(since.getDate() - Number(days));

  try {
    const logs = await BloodPressureLog.find({ userId: user.uid, timestamp: { $gte: since } })
      .sort({ timestamp: -1 })
      .limit(100)
      .lean();
    res.json(logs);
  } catch (err) {
    console.error('Blood pressure fetch error:', err);
    res.status(500).json({ error: 'Failed to fetch blood pressure' });
  }
});

// Doctor Visit - calendar + notes
router.post('/doctor-visit', async (req, res) => {
  const { user } = req;
  if (!user?.uid) return res.status(401).json({ error: 'Unauthorized' });

  const { visit_date, notes } = req.body;
  if (!visit_date) {
    return res.status(400).json({ error: 'Visit date is required' });
  }

  try {
    const visit = await DoctorVisit.create({
      userId: user.uid,
      visit_date: new Date(visit_date),
      notes: notes || '',
    });
    res.status(201).json(visit);
  } catch (err) {
    console.error('Doctor visit save error:', err);
    res.status(500).json({ error: 'Failed to save doctor visit' });
  }
});

router.get('/doctor-visit', async (req, res) => {
  const { user } = req;
  if (!user?.uid) return res.status(401).json({ error: 'Unauthorized' });

  const { days = 365, limit = 100 } = req.query;
  const dayNum = Math.min(Math.max(Number(days) || 365, 1), 36500);
  const lim = Math.min(Math.max(Number(limit) || 100, 1), 500);
  const since = new Date();
  since.setDate(since.getDate() - dayNum);

  try {
    const visits = await DoctorVisit.find({ userId: user.uid, visit_date: { $gte: since } })
      .sort({ visit_date: -1 })
      .limit(lim)
      .lean();
    res.json(visits);
  } catch (err) {
    console.error('Doctor visit fetch error:', err);
    res.status(500).json({ error: 'Failed to fetch doctor visits' });
  }
});

module.exports = router;
