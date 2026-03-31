const mongoose = require('mongoose');

const DoctorVisitSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  visit_date: { type: Date, required: true },
  notes: { type: String, default: '' },
  createdAt: { type: Date, default: Date.now },
});

DoctorVisitSchema.index({ userId: 1, visit_date: -1 });

module.exports = mongoose.model('DoctorVisit', DoctorVisitSchema);
