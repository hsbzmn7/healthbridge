const mongoose = require('mongoose');

const healthSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  type: { type: String, required: true }, // e.g., 'Steps', 'HeartRate'
  timestamp: { type: Date, required: true },
  data: mongoose.Schema.Types.Mixed,
}, { timestamps: true });

healthSchema.index({ userId: 1, type: 1, timestamp: 1 }, { unique: true });

module.exports = mongoose.model('HealthRecord', healthSchema);
