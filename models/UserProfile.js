const mongoose = require('mongoose');

const UserProfileSchema = new mongoose.Schema({
  userId: { type: String, required: true, unique: true },
  email: String,
  displayName: String,
  /** Preset avatar index as string "0".."7" (emoji set on client); null = default */
  avatarId: { type: String, default: null },
  // Onboarding fields (all optional)
  /** @deprecated use dateOfBirth; still returned as computed `age` when DOB is set */
  age: { type: Number, default: null },
  /** ISO date string YYYY-MM-DD */
  dateOfBirth: { type: String, default: null },
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

module.exports = mongoose.model('UserProfile', UserProfileSchema);
