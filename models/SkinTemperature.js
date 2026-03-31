const mongoose = require('mongoose');

const skinTemperatureSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  value: { type: Number, required: true }, // in Celsius
  timestamp: { type: Date, required: true },
});

skinTemperatureSchema.index({ userId: 1, timestamp: 1 }, { unique: true });

module.exports = mongoose.model('SkinTemperature', skinTemperatureSchema);
