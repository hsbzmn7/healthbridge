/**
 * Condition mapping: curated medical explanation text + source links.
 * Append to AI output before sending to frontend.
 * Sources: Canadian health authorities (to be filled by supervisors).
 */

const CONDITION_MAPPING = {
  high_heart_rate: {
    explanation: 'Elevated heart rate can result from various factors including stress, physical activity, caffeine, or dehydration. Consult healthcare resources for personalized guidance.',
    source: 'https://www.heartandstroke.ca/',
    sourceLabel: 'Heart & Stroke Foundation',
  },
  low_heart_rate: {
    explanation: 'A lower-than-normal heart rate may be normal for athletes. If accompanied by dizziness or fatigue, seek medical advice.',
    source: 'https://www.heartandstroke.ca/',
    sourceLabel: 'Heart & Stroke Foundation',
  },
  low_spo2: {
    explanation: 'Low oxygen saturation may indicate respiratory issues. Ensure adequate rest and consider consulting a healthcare provider.',
    source: 'https://www.lung.ca/',
    sourceLabel: 'Canadian Lung Association',
  },
  high_temperature: {
    explanation: 'Elevated body temperature may indicate fever. Rest, stay hydrated, and monitor for other symptoms.',
    source: 'https://www.canada.ca/en/health-canada.html',
    sourceLabel: 'Health Canada',
  },
  elevated_blood_pressure: {
    explanation: 'Blood pressure management involves lifestyle factors and regular monitoring. Consult your healthcare provider for guidance.',
    source: 'https://www.heartandstroke.ca/',
    sourceLabel: 'Heart & Stroke Foundation',
  },
  low_blood_glucose: {
    explanation: 'Low blood sugar can cause dizziness or weakness. Consider consuming a small snack if safe to do so.',
    source: 'https://www.diabetes.ca/',
    sourceLabel: 'Diabetes Canada',
  },
  high_blood_glucose: {
    explanation: 'Elevated blood glucose may require dietary adjustments or medication review. Consult your healthcare team.',
    source: 'https://www.diabetes.ca/',
    sourceLabel: 'Diabetes Canada',
  },
  default: {
    explanation: 'Monitor your symptoms and consult a healthcare professional for personalized advice.',
    source: 'https://www.canada.ca/en/health-canada.html',
    sourceLabel: 'Health Canada',
  },
};

const DISCLAIMER = 'This app does not replace professional medical advice.';

function getRecommendationForCondition(condition) {
  const mapping = CONDITION_MAPPING[condition] || CONDITION_MAPPING.default;
  return {
    ...mapping,
    disclaimer: DISCLAIMER,
  };
}

function appendToAIOutput(aiResult, condition) {
  const mapping = getRecommendationForCondition(condition);
  return {
    ...aiResult,
    curatedExplanation: mapping.explanation,
    sourceLink: mapping.source,
    sourceLabel: mapping.sourceLabel,
    disclaimer: mapping.disclaimer,
  };
}

module.exports = {
  CONDITION_MAPPING,
  getRecommendationForCondition,
  appendToAIOutput,
  DISCLAIMER,
};
