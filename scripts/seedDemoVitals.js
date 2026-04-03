/**
 * Seeds MongoDB for local testing (dev user + 6 elevated HR readings).
 * Requires MONGO_URI in .env (same as npm start).
 *
 * Usage:
 *   node scripts/seedDemoVitals.js
 *   node scripts/seedDemoVitals.js my-custom-user-id
 *
 * Then:
 *   POST /api/health/sync with same userId → sustained HR alert possible
 *   GET /api/alerts/wellbeing → positive message if no AlertLog rows in last 7 days
 */
require('dotenv').config();
const mongoose = require('mongoose');
const HeartRate = require('../models/HeartRate');
const UserProfile = require('../models/UserProfile');

const userId = process.argv[2] || 'dev-user-123';

async function main() {
  if (!process.env.MONGO_URI) {
    console.error('Missing MONGO_URI in .env');
    process.exit(1);
  }
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected to MongoDB');

  await UserProfile.findOneAndUpdate(
    { userId },
    {
      $set: {
        userId,
        email: `${userId}@seed.local`,
        displayName: 'Seed Demo',
        baseline_heart_rate: 70,
      },
    },
    { upsert: true },
  );
  console.log('Upserted UserProfile with baseline_heart_rate=70');

  await HeartRate.deleteMany({ userId });
  const now = Date.now();
  for (let i = 0; i < 6; i++) {
    await HeartRate.create({
      userId,
      value: 120,
      timestamp: new Date(now - (5 - i) * 5 * 60 * 1000),
    });
  }
  console.log('Inserted 6 HeartRate readings at 120 BPM (sustained deviation vs baseline 70)');

  await mongoose.disconnect();
  console.log('Done. Use X-Dev-User-Id:', userId, '(with SKIP_FIREBASE=true)');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
