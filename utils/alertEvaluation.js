const AlertLog = require('../models/AlertLog');
const { evaluateSustainedDeviation, evaluateSustainedFromStored } = require('./baselineLogic');

const SEVERITY = {
  heart_rate: 'medium',
  spo2: 'high',
  temperature: 'medium',
};

const DEDUPE_MS = 2 * 60 * 60 * 1000;

async function hasRecentAlertForMetric(userId, metric) {
  const since = new Date(Date.now() - DEDUPE_MS);
  const existing = await AlertLog.findOne({
    userId,
    metric,
    timestamp: { $gte: since },
  })
    .select('_id')
    .lean();
  return !!existing;
}

/**
 * Run sustained-deviation checks from request body values (e.g. before/without a full sync).
 * Used by POST /api/alerts/evaluate.
 */
async function evaluateAndPersistAlerts(userId, { heart_rate, spo2, temperature }) {
  const results = [];
  const configs = [
    { metric: 'heart_rate', value: heart_rate, severity: SEVERITY.heart_rate },
    { metric: 'spo2', value: spo2, severity: SEVERITY.spo2 },
    { metric: 'temperature', value: temperature, severity: SEVERITY.temperature },
  ];

  for (const { metric, value, severity } of configs) {
    if (value == null || Number.isNaN(Number(value))) continue;
    const ev = await evaluateSustainedDeviation(userId, metric, Number(value));
    if (ev.shouldAlert) {
      if (await hasRecentAlertForMetric(userId, metric)) continue;
      const alert = await AlertLog.create({
        userId,
        metric,
        message: ev.message,
        duration_minutes: ev.durationMinutes,
        severity,
      });
      results.push(alert);
    }
  }

  return results;
}

/**
 * After health metrics are persisted, evaluate using the last N DB readings only.
 * Used by POST /api/health/sync.
 */
async function evaluateAndPersistAlertsFromStored(
  userId,
  metrics = ['heart_rate', 'spo2', 'temperature'],
) {
  const results = [];
  for (const metric of metrics) {
    const ev = await evaluateSustainedFromStored(userId, metric);
    if (ev.shouldAlert) {
      if (await hasRecentAlertForMetric(userId, metric)) continue;
      const alert = await AlertLog.create({
        userId,
        metric,
        message: ev.message,
        duration_minutes: ev.durationMinutes,
        severity: SEVERITY[metric] || 'medium',
      });
      results.push(alert);
    }
  }
  return results;
}

module.exports = { evaluateAndPersistAlerts, evaluateAndPersistAlertsFromStored };
