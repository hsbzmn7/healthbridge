/**
 * ML model analysis endpoint - used by frontend AI Insights.
 * Fetches user vitals, calls ML service for prediction, returns recommendation.
 */
const express = require('express');
const router = express.Router();
const { getRecommendationForCondition } = require('../utils/recommendationMapping');
const { getLatestScreeningVitals } = require('../utils/latestScreeningVitals');

const ML_SERVICE_URL = process.env.ML_SERVICE_URL || 'http://localhost:5000';

async function callMLService(hr, resp, spo2, height, weight) {
  const url = `${ML_SERVICE_URL}/predict`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ hr, resp, spo2, height, weight }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`ML service error: ${err}`);
  }
  return res.json();
}

// GET /model/analyze - frontend AI Insights calls this
router.get('/analyze', async (req, res) => {
  const { user } = req;
  // Auth middleware always sets req.user (Firebase or devAuth). Do not trust X-Dev-User-Id when Firebase is enabled.
  const userId = user?.uid;
  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const vitals = await getLatestScreeningVitals(userId);

    if (!vitals.sufficientData) {
      console.info(
        '[model/analyze] InsufficientData',
        JSON.stringify({ userId, missingFields: vitals.missingFields })
      );
      const recommendation = getRecommendationForCondition('insufficient_data');
      return res.json({
        status: 'InsufficientData',
        confidence: null,
        sufficientData: false,
        missingFields: vitals.missingFields,
        vitals: {
          heartRate: vitals.hr,
          respiratoryRate: vitals.resp,
          spo2: vitals.spo2,
          height: vitals.height,
          weight: vitals.weight,
        },
        curatedExplanation: recommendation.explanation,
        sourceLink: recommendation.source,
        sourceLabel: recommendation.sourceLabel,
        disclaimer: recommendation.disclaimer,
        mlServiceAvailable: false,
      });
    }

    let prediction = null;
    let mlError = null;

    try {
      prediction = await callMLService(
        vitals.hr,
        vitals.resp,
        vitals.spo2,
        vitals.height,
        vitals.weight
      );
    } catch (err) {
      console.warn('ML service unavailable:', err.message);
      mlError = err.message;
    }

    // Map prediction to condition for recommendation
    let condition = 'default';
    if (prediction?.prediction === 'Abnormal') {
      if (vitals.spo2 < 95) condition = 'low_spo2';
      else if (vitals.hr > 100) condition = 'high_heart_rate';
      else if (vitals.hr < 60) condition = 'low_heart_rate';
      else condition = 'default';
    }

    const recommendation = getRecommendationForCondition(condition);
    const result = {
      status: prediction?.prediction || 'Unknown',
      confidence: prediction?.confidence ?? null,
      sufficientData: true,
      vitals: {
        heartRate: vitals.hr,
        respiratoryRate: vitals.resp,
        spo2: vitals.spo2,
        height: vitals.height,
        weight: vitals.weight,
      },
      curatedExplanation: recommendation.explanation,
      sourceLink: recommendation.source,
      sourceLabel: recommendation.sourceLabel,
      disclaimer: recommendation.disclaimer,
      mlServiceAvailable: !mlError,
      ...(mlError && { mlError }),
      ...(prediction?.rawModelPrediction != null && {
        rawModelPrediction: prediction.rawModelPrediction,
      }),
      ...(prediction?.calibrationNote && { calibrationNote: prediction.calibrationNote }),
      ...(typeof prediction?.vitalsInTypicalRanges === 'boolean' && {
        vitalsInTypicalRanges: prediction.vitalsInTypicalRanges,
      }),
    };

    res.json(result);
  } catch (err) {
    console.error('Model analyze error:', err);
    res.status(500).json({ error: 'Failed to analyze health data' });
  }
});

module.exports = router;
