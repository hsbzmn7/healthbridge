const mongoose = require('mongoose');
const OxygenSaturationSchema = new mongoose.Schema({
  userId: String,
  value: Number,
  timestamp: Date,
});
module.exports = mongoose.model('OxygenSaturation', OxygenSaturationSchema);
