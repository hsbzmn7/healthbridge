const mongoose = require('mongoose');
const BloodPressureSchema = new mongoose.Schema({
  userId: String,
  systolic: Number,
  diastolic: Number,
  timestamp: Date,
});
module.exports = mongoose.model('BloodPressure', BloodPressureSchema);
