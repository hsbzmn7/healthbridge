require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors'); 
const healthRoutes = require('./routes/health');
const profileRoutes = require('./routes/profile');
const manualEntryRoutes = require('./routes/manualEntry');
const alertsRoutes = require('./routes/alerts');
const modelRoutes = require('./routes/model');
const devAuth = require('./middleware/devAuth');

// Use dev auth when SKIP_FIREBASE=true (no firebase-service-account.json needed)
const authMiddleware = process.env.SKIP_FIREBASE === 'true'
  ? devAuth
  : require('./middleware/firebaseAuth');

const app = express();
 app.use(cors());
app.use(express.json({limit: '50mb'}));

const PORT = process.env.PORT || 7000;

mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('MongoDB connected!'))
  .catch((err) => console.error('Mongo error:', err));

// Protect all health routes
app.use('/api/health', authMiddleware, healthRoutes);
app.use('/api/profile', authMiddleware, profileRoutes);
app.use('/api/manual-entry', authMiddleware, manualEntryRoutes);
app.use('/api/alerts', authMiddleware, alertsRoutes);
app.use('/model', authMiddleware, modelRoutes);

app.get('/api/test', async (req, res)=> {
try {
    const products = {"Response":"This is a temp"};
    res.json(products); // Send the products as JSON response
} catch (error) {
    res.status(500).send('Internal Server Error');
}
})

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
