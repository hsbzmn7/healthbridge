const mongoose = require('mongoose');
const WeightSchema = new mongoose.Schema({
  userId: String,
  value: Number,
  timestamp: Date,
});
module.exports = mongoose.model('Weight', WeightSchema);
