require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors'); 
const healthRoutes = require('./routes/health');
const profileRoutes = require('./routes/profile');
const manualEntryRoutes = require('./routes/manualEntry');
const alertsRoutes = require('./routes/alerts');
const modelRoutes = require('./routes/model');
const appointmentsRoutes = require('./routes/appointments');
const gentleAiNoteRoutes = require('./routes/gentleAiNote');
const devAuth = require('./middleware/devAuth');

// Use dev auth when SKIP_FIREBASE=true (no firebase-service-account.json needed)
const authMiddleware = process.env.SKIP_FIREBASE === 'true'
  ? devAuth
  : require('./middleware/firebaseAuth');

const app = express();
const corsOrigin = process.env.CORS_ORIGIN;
if (corsOrigin) {
  const origins = corsOrigin.split(',').map((o) => o.trim()).filter(Boolean);
  app.use(cors({ origin: origins.length === 1 ? origins[0] : origins }));
} else {
  app.use(cors());
}
app.use(express.json({limit: '50mb'}));

const PORT = process.env.PORT || 7000;

mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('MongoDB connected!'))
  .catch((err) => console.error('Mongo error:', err));

// Protect all health routes
app.use('/api/health', authMiddleware, healthRoutes);
app.use('/api/profile', authMiddleware, profileRoutes);
app.use('/api/manual-entry', authMiddleware, manualEntryRoutes);
app.use('/api/appointments', authMiddleware, appointmentsRoutes);
app.use('/api/alerts', authMiddleware, alertsRoutes);
app.use('/api/ai/gentle-note', authMiddleware, gentleAiNoteRoutes);
app.use('/model', authMiddleware, modelRoutes);

app.get('/api/test', (req, res) => {
  res.json({ status: 'ok', service: 'healthbridge-api' });
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
