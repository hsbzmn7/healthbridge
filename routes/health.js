const express = require('express');
const router = express.Router();
const saveHealthMetrics = require('../utils/saveHealthMetrics');
const { evaluateAndPersistAlertsFromStored } = require('../utils/alertEvaluation');

// Assumes Firebase authentication middleware is already verifying token and adding req.user
router.post('/sync', async (req, res) => {
  const { user } = req;
  const { userId, data, fitbitMetrics } = req.body;

  if (!user || !user.uid || user.uid !== userId) {
    return res.status(403).json({ error: 'Unauthorized' });
  }

  try {
    console.log('Data Received. Initiating the storage');
    await saveHealthMetrics(userId, data, fitbitMetrics);

    try {
      const newAlerts = await evaluateAndPersistAlertsFromStored(userId);
      if (newAlerts.length > 0) {
        console.log(`Sustained alerts created: ${newAlerts.length}`);
      }
    } catch (evalErr) {
      console.error('Sustained alert evaluation error:', evalErr);
    }

    res.status(200).json({ message: 'Metrics processed successfully' });
  } catch (err) {
    console.error('Save error:', err);
    res.status(500).json({ error: 'Failed to process health data' });
  }
});

module.exports = router;
