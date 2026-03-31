const mongoose = require('mongoose');
const BodyTemperatureSchema = new mongoose.Schema({
  userId: String,
  value: Number,
  timestamp: Date,
});
module.exports = mongoose.model('BodyTemperature', BodyTemperatureSchema);
