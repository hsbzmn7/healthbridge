const mongoose = require('mongoose');

const breathingRateSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  value: { type: Number, required: true }, // breaths per minute
  timestamp: { type: Date, required: true },
});

breathingRateSchema.index({ userId: 1, timestamp: 1 }, { unique: true });

module.exports = mongoose.model('BreathingRate', breathingRateSchema);
