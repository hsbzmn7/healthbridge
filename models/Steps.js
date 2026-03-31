const mongoose = require('mongoose');

const stepsSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  count: { type: Number, required: true },
  startTime: { type: Date, required: true },
  endTime: { type: Date, required: true }
}, { timestamps: true });

module.exports = mongoose.model('Steps', stepsSchema);
