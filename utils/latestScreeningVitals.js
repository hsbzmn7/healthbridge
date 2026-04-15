/**
 * Latest HR, SpO₂, RR, height, weight from Mongo (same inputs as ML /predict).
 * Shared by GET /model/analyze and gentle AI note generation.
 */
const HeartRate = require('../models/HeartRate');
const OxygenSaturation = require('../models/OxygenSaturation');
const BreathingRate = require('../models/BreathingRate');
const UserProfile = require('../models/UserProfile');
const Height = require('../models/Height');
const Weight = require('../models/Weight');

function isPositiveNumber(v) {
  const n = Number(v);
  return Number.isFinite(n) && n > 0;
}

async function getLatestScreeningVitals(userId) {
  const [hr, spo2, resp, profile, heightDoc, weightDoc] = await Promise.all([
    HeartRate.findOne({ userId }).sort({ timestamp: -1 }).lean(),
    OxygenSaturation.findOne({ userId }).sort({ timestamp: -1 }).lean(),
    BreathingRate.findOne({ userId }).sort({ timestamp: -1 }).lean(),
    UserProfile.findOne({ userId }).lean(),
    Height.findOne({ userId }).sort({ timestamp: -1 }).lean(),
    Weight.findOne({ userId }).sort({ timestamp: -1 }).lean(),
  ]);

  const height = heightDoc?.value ?? profile?.height ?? null;
  const weight = weightDoc?.value ?? profile?.weight ?? null;

  const missingFields = [];
  if (!hr || !isPositiveNumber(hr.value)) missingFields.push('heartRate');
  if (!spo2 || !isPositiveNumber(spo2.value)) missingFields.push('oxygenSaturation');
  if (!resp || !isPositiveNumber(resp.value)) missingFields.push('breathingRate');
  if (!isPositiveNumber(height)) missingFields.push('height');
  if (!isPositiveNumber(weight)) missingFields.push('weight');

  const sufficientData = missingFields.length === 0;

  return {
    hr: hr?.value != null ? Number(hr.value) : null,
    resp: resp?.value != null ? Number(resp.value) : null,
    spo2: spo2?.value != null ? Number(spo2.value) : null,
    height: height != null ? Number(height) : null,
    weight: weight != null ? Number(weight) : null,
    sufficientData,
    missingFields,
  };
}

module.exports = { getLatestScreeningVitals, isPositiveNumber };
