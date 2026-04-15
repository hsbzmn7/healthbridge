/**
 * Short persuasive note (OpenAI) from latest screening vitals + profile age/gender.
 * GET: cached note + stale flag + compliance copy/links from env.
 * POST: regenerate if force or stale or missing (6h window).
 */
const express = require('express');
const router = express.Router();
const UserProfile = require('../models/UserProfile');
const GentleAiNote = require('../models/GentleAiNote');
const { getLatestScreeningVitals } = require('../utils/latestScreeningVitals');
const { enrichProfileResponse } = require('../utils/ageFromDob');

const STALE_MS = 6 * 60 * 60 * 1000;
const MAX_NOTE_CHARS = 400;
const OPENAI_MODEL = process.env.OPENAI_GENTLE_MODEL || 'gpt-4o-mini';

function truncateNote(s) {
  if (!s || typeof s !== 'string') return '';
  const t = s.trim();
  if (t.length <= MAX_NOTE_CHARS) return t;
  return `${t.slice(0, MAX_NOTE_CHARS - 1)}…`;
}

function getCompliance() {
  let links = [];
  try {
    const raw = process.env.COMPLIANCE_LINKS_JSON;
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) links = parsed;
    }
  } catch (_) {
    links = [];
  }
  links = links
    .filter((l) => l && typeof l.url === 'string' && /^https?:\/\//i.test(l.url.trim()))
    .map((l) => ({
      label: typeof l.label === 'string' && l.label.trim() ? l.label.trim() : l.url.trim(),
      url: l.url.trim(),
    }));

  const phrasesRaw =
    process.env.COMPLIANCE_VERBATIM_PHRASES ||
    'This app does not replace professional medical advice.';
  const phrases = phrasesRaw
    .split('|||')
    .map((s) => s.trim())
    .filter(Boolean);
  if (phrases.length === 0) {
    phrases.push('This app does not replace professional medical advice.');
  }

  return { phrases, links };
}

function isStale(doc) {
  if (!doc || !doc.generatedAt) return true;
  return Date.now() - new Date(doc.generatedAt).getTime() > STALE_MS;
}

function buildUserPayload(userId, vitals, profileDoc) {
  const enriched = profileDoc
    ? enrichProfileResponse(profileDoc)
    : { age: null, gender: null };
  const age =
    enriched.age != null && Number.isFinite(Number(enriched.age))
      ? Number(enriched.age)
      : profileDoc?.age != null && Number.isFinite(Number(profileDoc.age))
        ? Number(profileDoc.age)
        : null;
  return {
    language: 'en',
    latestVitals: {
      heartRateBpm: vitals.hr,
      respiratoryRatePerMin: vitals.resp,
      oxygenSaturationPercent: vitals.spo2,
      heightCm: vitals.height,
      weightKg: vitals.weight,
    },
    demographics: {
      ageYears: age,
      gender: profileDoc?.gender || null,
    },
    dataQuality: {
      sufficientForScreening: vitals.sufficientData,
      missingFields: vitals.missingFields || [],
    },
  };
}

const SYSTEM_PROMPT = `You are a warm, autonomy-supporting health communication assistant. Reply in English only.

Rules:
- Maximum ${MAX_NOTE_CHARS} characters total (including spaces and punctuation). Count carefully.
- Be gentle and persuasive (support self-efficacy; never alarmist).
- Do not diagnose diseases, name conditions, or prescribe treatments or medications.
- Do not invent or repeat URLs (the app shows official links separately).
- Briefly acknowledge the screening-style vitals provided (or encourage completing missing data if incomplete).
- Close with a very short reminder that this message is not a substitute for care from a qualified clinician—work that into the same ${MAX_NOTE_CHARS} character limit.
- No bullet lists; one or two short paragraphs at most within the limit.`;

async function callOpenAI(userPayload) {
  const key = process.env.OPENAI_API_KEY;
  if (!key || !key.trim()) {
    const err = new Error('OPENAI_API_KEY is not configured');
    err.code = 'NO_OPENAI_KEY';
    throw err;
  }

  const body = {
    model: OPENAI_MODEL,
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      {
        role: 'user',
        content: `Generate the brief note. Input (JSON):\n${JSON.stringify(userPayload)}`,
      },
    ],
    max_tokens: 220,
    temperature: 0.7,
  };

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${key.trim()}`,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const t = await res.text();
    const err = new Error(`OpenAI error: ${t.slice(0, 500)}`);
    err.code = 'OPENAI_HTTP';
    throw err;
  }

  const data = await res.json();
  const text = data?.choices?.[0]?.message?.content;
  if (!text || typeof text !== 'string') {
    const err = new Error('OpenAI returned empty content');
    err.code = 'OPENAI_EMPTY';
    throw err;
  }
  return truncateNote(text);
}

async function generateAndPersist(userId) {
  const [vitals, profile] = await Promise.all([
    getLatestScreeningVitals(userId),
    UserProfile.findOne({ userId }).lean(),
  ]);
  const payload = buildUserPayload(userId, vitals, profile);
  const note = await callOpenAI(payload);
  const generatedAt = new Date();
  await GentleAiNote.findOneAndUpdate(
    { userId },
    { note, generatedAt },
    { upsert: true, new: true },
  );
  return { note, generatedAt: generatedAt.toISOString() };
}

router.get('/', async (req, res) => {
  const userId = req.user?.uid;
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });

  try {
    const compliance = getCompliance();
    const doc = await GentleAiNote.findOne({ userId }).lean();
    const stale = !doc || isStale(doc);
    res.json({
      note: doc?.note || null,
      generatedAt: doc?.generatedAt ? new Date(doc.generatedAt).toISOString() : null,
      stale,
      compliance,
      promptSummary:
        'System: gentle screening note, English, ≤400 chars, no diagnosis/URLs. User message: JSON of latest vitals (HR, RR, SpO₂, height, weight), age, gender, sufficientData/missingFields.',
    });
  } catch (err) {
    console.error('gentle-note GET error:', err);
    res.status(500).json({ error: 'Failed to fetch gentle note' });
  }
});

router.post('/', async (req, res) => {
  const userId = req.user?.uid;
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });

  const force = Boolean(req.body?.force);
  const compliance = getCompliance();

  try {
    const doc = await GentleAiNote.findOne({ userId }).lean();
    const stale = !doc || isStale(doc);

    if (!force && doc && !stale) {
      return res.json({
        note: doc.note,
        generatedAt: new Date(doc.generatedAt).toISOString(),
        stale: false,
        cached: true,
        compliance,
        promptSummary:
          'System: gentle screening note, English, ≤400 chars, no diagnosis/URLs. User message: JSON of latest vitals (HR, RR, SpO₂, height, weight), age, gender, sufficientData/missingFields.',
      });
    }

    const { note, generatedAt } = await generateAndPersist(userId);
    res.json({
      note,
      generatedAt,
      stale: false,
      cached: false,
      compliance,
      promptSummary:
        'System: gentle screening note, English, ≤400 chars, no diagnosis/URLs. User message: JSON of latest vitals (HR, RR, SpO₂, height, weight), age, gender, sufficientData/missingFields.',
    });
  } catch (err) {
    if (err.code === 'NO_OPENAI_KEY') {
      return res.status(503).json({ error: 'AI note service is not configured (missing OPENAI_API_KEY).' });
    }
    console.error('gentle-note POST error:', err);
    res.status(500).json({ error: err.message || 'Failed to generate gentle note' });
  }
});

module.exports = router;
