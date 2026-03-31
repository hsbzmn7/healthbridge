const mongoose = require('mongoose');
const HeightSchema = new mongoose.Schema({
  userId: String,
  value: Number,
  timestamp: Date,
});
module.exports = mongoose.model('Height', HeightSchema);
