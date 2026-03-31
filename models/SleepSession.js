const mongoose = require('mongoose');

const sleepSessionSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  startTime: { type: Date, required: true },
  endTime: { type: Date, required: true },
  durationInHours: { type: Number, required: true },
}, { timestamps: true });

module.exports = mongoose.model('SleepSession', sleepSessionSchema);
