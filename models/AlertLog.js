const mongoose = require('mongoose');

const AlertLogSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  metric: { type: String, required: true }, // heart_rate, temperature, spo2, etc.
  message: { type: String, required: true },
  duration_minutes: { type: Number, default: null },
  severity: { type: String, default: 'low' }, // low, medium, high
  timestamp: { type: Date, default: Date.now },
  resolved: { type: Boolean, default: false },
});

AlertLogSchema.index({ userId: 1, timestamp: -1 });

module.exports = mongoose.model('AlertLog', AlertLogSchema);
