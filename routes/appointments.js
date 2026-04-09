const express = require('express');
const router = express.Router();
const DoctorAppointment = require('../models/DoctorAppointment');

const ALLOWED_REMINDERS = new Set([15, 30, 60, 120, 1440]);

function parseBody(body) {
  const {
    doctorName,
    location = '',
    phoneNumber = '',
    notes = '',
    appointmentDateTime,
    reminderOffsetMinutes = 60,
  } = body;

  if (!doctorName || typeof doctorName !== 'string' || !doctorName.trim()) {
    return { error: 'doctorName is required' };
  }
  if (!appointmentDateTime) {
    return { error: 'appointmentDateTime is required (ISO 8601)' };
  }
  const dt = new Date(appointmentDateTime);
  if (Number.isNaN(dt.getTime())) {
    return { error: 'Invalid appointmentDateTime' };
  }
  const rem = Number(reminderOffsetMinutes);
  if (!ALLOWED_REMINDERS.has(rem)) {
    return { error: `reminderOffsetMinutes must be one of: ${[...ALLOWED_REMINDERS].join(', ')}` };
  }

  return {
    data: {
      doctorName: doctorName.trim(),
      location: String(location || '').trim(),
      phoneNumber: String(phoneNumber || '').trim(),
      notes: String(notes || '').trim(),
      appointmentDateTime: dt,
      reminderOffsetMinutes: rem,
    },
  };
}

// GET /api/appointments
router.get('/', async (req, res) => {
  const { user } = req;
  if (!user?.uid) return res.status(401).json({ error: 'Unauthorized' });

  try {
    const list = await DoctorAppointment.find({ userId: user.uid })
      .sort({ appointmentDateTime: -1 })
      .limit(200)
      .lean();
    res.json(list);
  } catch (err) {
    console.error('Appointments list error:', err);
    res.status(500).json({ error: 'Failed to list appointments' });
  }
});

// POST /api/appointments
router.post('/', async (req, res) => {
  const { user } = req;
  if (!user?.uid) return res.status(401).json({ error: 'Unauthorized' });

  const parsed = parseBody(req.body);
  if (parsed.error) return res.status(400).json({ error: parsed.error });

  try {
    const doc = await DoctorAppointment.create({
      userId: user.uid,
      ...parsed.data,
    });
    res.status(201).json(doc);
  } catch (err) {
    console.error('Appointment create error:', err);
    res.status(500).json({ error: 'Failed to create appointment' });
  }
});

// PUT /api/appointments/:id
router.put('/:id', async (req, res) => {
  const { user } = req;
  if (!user?.uid) return res.status(401).json({ error: 'Unauthorized' });

  const parsed = parseBody(req.body);
  if (parsed.error) return res.status(400).json({ error: parsed.error });

  try {
    const updated = await DoctorAppointment.findOneAndUpdate(
      { _id: req.params.id, userId: user.uid },
      { $set: parsed.data },
      { new: true },
    ).lean();
    if (!updated) return res.status(404).json({ error: 'Not found' });
    res.json(updated);
  } catch (err) {
    console.error('Appointment update error:', err);
    res.status(500).json({ error: 'Failed to update appointment' });
  }
});

// DELETE /api/appointments/:id
router.delete('/:id', async (req, res) => {
  const { user } = req;
  if (!user?.uid) return res.status(401).json({ error: 'Unauthorized' });

  try {
    const deleted = await DoctorAppointment.findOneAndDelete({
      _id: req.params.id,
      userId: user.uid,
    });
    if (!deleted) return res.status(404).json({ error: 'Not found' });
    res.json({ ok: true });
  } catch (err) {
    console.error('Appointment delete error:', err);
    res.status(500).json({ error: 'Failed to delete appointment' });
  }
});

module.exports = router;
