/**
 * Baseline-driven alert logic (replaces static thresholds).
 * Triggers only when deviation from baseline is sustained.
 */

const HeartRate = require('../models/HeartRate');
const BodyTemperature = require('../models/BodyTemperature');
const OxygenSaturation = require('../models/OxygenSaturation');
const UserProfile = require('../models/UserProfile');

// Config: readings every ~3 min, need 6 consecutive for sustained alert
const CONSECUTIVE_READINGS_REQUIRED = 6;
const DEVIATION_FACTOR_HR = 1.15; // 15% above baseline
const DEVIATION_FACTOR_HR_LOW = 0.85; // 15% below baseline
const MIN_BASELINE_READINGS = 5;

/**
 * Get user baseline from profile or compute from recent data
 */
async function getBaseline(userId) {
  const profile = await UserProfile.findOne({ userId });
  const baseline = {
    heart_rate: profile?.baseline_heart_rate,
    spo2: profile?.baseline_spo2,
    temperature: profile?.baseline_temperature ?? 37, // default 37°C if not set
  };

  // If no profile baseline, compute from last 7 days
  if (!baseline.heart_rate) {
    const recent = await HeartRate.find({ userId })
      .sort({ timestamp: -1 })
      .limit(100)
      .lean();
    if (recent.length >= MIN_BASELINE_READINGS) {
      const avg = recent.reduce((s, r) => s + r.value, 0) / recent.length;
      baseline.heart_rate = Math.round(avg);
    }
  }

  if (!baseline.spo2) {
    const recent = await OxygenSaturation.find({ userId })
      .sort({ timestamp: -1 })
      .limit(100)
      .lean();
    if (recent.length >= MIN_BASELINE_READINGS) {
      const avg = recent.reduce((s, r) => s + r.value, 0) / recent.length;
      baseline.spo2 = Math.round(avg);
    }
  }

  return baseline;
}

/**
 * Check if value deviates significantly from baseline
 */
function isDeviating(metric, value, baseline) {
  if (!baseline || value == null) return false;
  switch (metric) {
    case 'heart_rate':
      if (!baseline.heart_rate) return false;
      return value > baseline.heart_rate * DEVIATION_FACTOR_HR || value < baseline.heart_rate * DEVIATION_FACTOR_HR_LOW;
    case 'spo2':
      if (!baseline.spo2) return false;
      return value < baseline.spo2 - 3; // SpO2 drop of 3%+
    case 'temperature':
      return value > baseline.temperature + 1 || value < baseline.temperature - 1;
    default:
      return false;
  }
}

/**
 * Evaluate sustained deviation (simplified - for full impl would need rolling window)
 * Returns { shouldAlert, durationMinutes, message }
 */
async function evaluateSustainedDeviation(userId, metric, currentValue) {
  const baseline = await getBaseline(userId);
  const deviating = isDeviating(metric, currentValue, baseline);

  if (!deviating) {
    return { shouldAlert: false, message: null };
  }

  // In production: query last N readings, check if all show deviation
  // For now: return alert with context
  const metricLabels = {
    heart_rate: 'heart rate',
    spo2: 'oxygen saturation',
    temperature: 'temperature',
  };
  const baselineVal = baseline[metric] ?? baseline.heart_rate ?? baseline.spo2 ?? baseline.temperature;

  return {
    shouldAlert: true,
    durationMinutes: 12, // placeholder - would compute from actual readings
    message: `Your ${metricLabels[metric] || metric} has remained ${currentValue > baselineVal ? 'above' : 'below'} your normal range for 12 minutes.`,
    baseline: baselineVal,
    recommendation: 'Consider resting or contacting your healthcare provider if this persists.',
  };
}

module.exports = {
  getBaseline,
  isDeviating,
  evaluateSustainedDeviation,
  CONSECUTIVE_READINGS_REQUIRED,
};
