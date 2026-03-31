const mongoose = require('mongoose');

const BloodPressureLogSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  systolic: { type: Number, required: true },
  diastolic: { type: Number, required: true },
  timestamp: { type: Date, default: Date.now },
  notes: { type: String, default: '' },
});

BloodPressureLogSchema.index({ userId: 1, timestamp: -1 });

module.exports = mongoose.model('BloodPressureLog', BloodPressureLogSchema);
