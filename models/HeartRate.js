const mongoose = require('mongoose');
const HeartRateSchema = new mongoose.Schema({
  userId: String,
  value: Number,
  timestamp: Date,
});
module.exports = mongoose.model('HeartRate', HeartRateSchema);
