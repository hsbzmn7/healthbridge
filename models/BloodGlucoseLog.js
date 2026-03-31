const mongoose = require('mongoose');

const BloodGlucoseLogSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  value: { type: Number, required: true }, // mg/dL or mmol/L - document says optional input
  unit: { type: String, default: 'mg/dL' },
  timestamp: { type: Date, default: Date.now },
  notes: { type: String, default: '' },
});

BloodGlucoseLogSchema.index({ userId: 1, timestamp: -1 });

module.exports = mongoose.model('BloodGlucoseLog', BloodGlucoseLogSchema);
