/**
 * Baseline-driven alert logic (replaces static thresholds).
 * Triggers only when deviation from baseline is sustained across consecutive readings.
 */

const HeartRate = require('../models/HeartRate');
const BodyTemperature = require('../models/BodyTemperature');
const OxygenSaturation = require('../models/OxygenSaturation');
const UserProfile = require('../models/UserProfile');

const CONSECUTIVE_READINGS_REQUIRED = 6;
const DEVIATION_FACTOR_HR = 1.15;
const DEVIATION_FACTOR_HR_LOW = 0.85;
const MIN_BASELINE_READINGS = 5;

function modelForMetric(metric) {
  switch (metric) {
    case 'heart_rate':
      return HeartRate;
    case 'spo2':
      return OxygenSaturation;
    case 'temperature':
      return BodyTemperature;
    default:
      return null;
  }
}

/**
 * Get user baseline from profile or compute from recent data
 */
async function getBaseline(userId) {
  const profile = await UserProfile.findOne({ userId });
  const baseline = {
    heart_rate: profile?.baseline_heart_rate,
    spo2: profile?.baseline_spo2,
    temperature: profile?.baseline_temperature ?? 37,
  };

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
      return (
        value > baseline.heart_rate * DEVIATION_FACTOR_HR ||
        value < baseline.heart_rate * DEVIATION_FACTOR_HR_LOW
      );
    case 'spo2':
      if (!baseline.spo2) return false;
      return value < baseline.spo2 - 3;
    case 'temperature':
      return value > baseline.temperature + 1 || value < baseline.temperature - 1;
    default:
      return false;
  }
}

/**
 * Fetch last (count) readings for metric, oldest-first (chronological).
 */
async function getRecentReadingsOldestFirst(userId, metric, count) {
  const Model = modelForMetric(metric);
  if (!Model || count <= 0) return [];
  const rows = await Model.find({ userId })
    .sort({ timestamp: -1 })
    .limit(count)
    .lean();
  return rows
    .map((r) => ({ value: r.value, timestamp: r.timestamp ? new Date(r.timestamp) : null }))
    .reverse();
}

function baselineLabelValue(metric, baseline) {
  if (metric === 'heart_rate') return baseline.heart_rate;
  if (metric === 'spo2') return baseline.spo2;
  if (metric === 'temperature') return baseline.temperature;
  return null;
}

/**
 * Evaluate sustained deviation using last stored readings + current sample.
 * Returns { shouldAlert, durationMinutes, message, baseline, recommendation }
 */
async function evaluateSustainedDeviation(userId, metric, currentValue) {
  const baseline = await getBaseline(userId);
  const baselineVal = baselineLabelValue(metric, baseline);

  if (baselineVal == null && metric !== 'temperature') {
    return { shouldAlert: false, message: null };
  }
  if (metric === 'temperature' && baseline.temperature == null) {
    return { shouldAlert: false, message: null };
  }

  const needPrior = CONSECUTIVE_READINGS_REQUIRED - 1;
  const prior = await getRecentReadingsOldestFirst(userId, metric, needPrior);
  const now = new Date();
  const sequence = [...prior, { value: currentValue, timestamp: now }];

  if (sequence.length < CONSECUTIVE_READINGS_REQUIRED) {
    return { shouldAlert: false, message: null };
  }

  const allDeviating = sequence.every((row) => isDeviating(metric, row.value, baseline));
  if (!allDeviating) {
    return { shouldAlert: false, message: null };
  }

  const times = sequence.map((r) => r.timestamp).filter(Boolean);
  let durationMinutes = 12;
  if (times.length >= 2) {
    const spanMs = Math.max(...times.map((t) => t.getTime())) - Math.min(...times.map((t) => t.getTime()));
    durationMinutes = Math.max(1, Math.round(spanMs / (1000 * 60)));
  }

  const metricLabels = {
    heart_rate: 'heart rate',
    spo2: 'oxygen saturation',
    temperature: 'temperature',
  };

  let directionWord = 'outside';
  if (metric === 'spo2') {
    directionWord = 'below';
  } else if (metric === 'heart_rate' && baseline.heart_rate) {
    directionWord = sequence[sequence.length - 1].value > baseline.heart_rate ? 'above' : 'below';
  } else if (metric === 'temperature') {
    directionWord = sequence[sequence.length - 1].value > baseline.temperature ? 'above' : 'below';
  }

  return {
    shouldAlert: true,
    durationMinutes,
    message: `Your ${metricLabels[metric] || metric} has remained ${directionWord} your normal range for about ${durationMinutes} minutes.`,
    baseline: baselineVal,
    recommendation: 'Consider resting or contacting your healthcare provider if this persists.',
  };
}

/**
 * After new rows are saved, evaluate using only the last N stored readings (no duplicate "current").
 */
async function evaluateSustainedFromStored(userId, metric) {
  const baseline = await getBaseline(userId);
  const baselineVal = baselineLabelValue(metric, baseline);

  if (baselineVal == null && metric !== 'temperature') {
    return { shouldAlert: false, message: null };
  }
  if (metric === 'temperature' && baseline.temperature == null) {
    return { shouldAlert: false, message: null };
  }

  const sequence = await getRecentReadingsOldestFirst(userId, metric, CONSECUTIVE_READINGS_REQUIRED);
  if (sequence.length < CONSECUTIVE_READINGS_REQUIRED) {
    return { shouldAlert: false, message: null };
  }

  const allDeviating = sequence.every((row) => isDeviating(metric, row.value, baseline));
  if (!allDeviating) {
    return { shouldAlert: false, message: null };
  }

  const times = sequence.map((r) => r.timestamp).filter(Boolean);
  let durationMinutes = 12;
  if (times.length >= 2) {
    const spanMs = Math.max(...times.map((t) => t.getTime())) - Math.min(...times.map((t) => t.getTime()));
    durationMinutes = Math.max(1, Math.round(spanMs / (1000 * 60)));
  }

  const metricLabels = {
    heart_rate: 'heart rate',
    spo2: 'oxygen saturation',
    temperature: 'temperature',
  };

  let directionWord = 'outside';
  if (metric === 'spo2') {
    directionWord = 'below';
  } else if (metric === 'heart_rate' && baseline.heart_rate) {
    directionWord = sequence[sequence.length - 1].value > baseline.heart_rate ? 'above' : 'below';
  } else if (metric === 'temperature') {
    directionWord = sequence[sequence.length - 1].value > baseline.temperature ? 'above' : 'below';
  }

  return {
    shouldAlert: true,
    durationMinutes,
    message: `Your ${metricLabels[metric] || metric} has remained ${directionWord} your normal range for about ${durationMinutes} minutes.`,
    baseline: baselineVal,
    recommendation: 'Consider resting or contacting your healthcare provider if this persists.',
  };
}

module.exports = {
  getBaseline,
  isDeviating,
  evaluateSustainedDeviation,
  evaluateSustainedFromStored,
  CONSECUTIVE_READINGS_REQUIRED,
};
