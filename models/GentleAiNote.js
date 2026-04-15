const mongoose = require('mongoose');

const GentleAiNoteSchema = new mongoose.Schema({
  userId: { type: String, required: true, unique: true },
  /** Main persuasive text; server enforces ≤400 chars before save */
  note: { type: String, default: '' },
  generatedAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('GentleAiNote', GentleAiNoteSchema);
