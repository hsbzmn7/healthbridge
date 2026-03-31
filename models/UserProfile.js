const mongoose = require('mongoose');

const UserProfileSchema = new mongoose.Schema({
  userId: { type: String, required: true, unique: true },
  email: String,
  displayName: String,
  // Onboarding fields (all optional)
  age: { type: Number, default: null },
  gender: { type: String, default: null }, // male, female, other, prefer_not_to_say
  height: { type: Number, default: null }, // cm
  weight: { type: Number, default: null }, // kg
  bmi: { type: Number, default: null },
  baseline_heart_rate: { type: Number, default: null },
  baseline_bp_systolic: { type: Number, default: null },
  baseline_bp_diastolic: { type: Number, default: null },
  baseline_spo2: { type: Number, default: null },
  baseline_temperature: { type: Number, default: null }, // Celsius
  medical_history: { type: String, default: null },
  medications: { type: String, default: null },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

UserProfileSchema.index({ userId: 1 });

module.exports = mongoose.model('UserProfile', UserProfileSchema);
