const mongoose = require('mongoose');

const DoctorAppointmentSchema = new mongoose.Schema(
  {
    userId: { type: String, required: true, index: true },
    doctorName: { type: String, required: true, trim: true },
    location: { type: String, default: '' },
    phoneNumber: { type: String, default: '' },
    notes: { type: String, default: '' },
    /** Stored in UTC */
    appointmentDateTime: { type: Date, required: true, index: true },
    /** Minutes before appointment to fire local reminder (client schedules) */
    reminderOffsetMinutes: { type: Number, default: 60 },
  },
  { timestamps: true },
);

DoctorAppointmentSchema.index({ userId: 1, appointmentDateTime: -1 });

module.exports = mongoose.model('DoctorAppointment', DoctorAppointmentSchema);
