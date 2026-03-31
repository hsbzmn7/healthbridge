const admin = require('firebase-admin');

// ========== COMMENT OUT THE BLOCK BELOW (lines 5-9) WHEN YOU DON'T HAVE firebase-service-account.json ==========
// ========== Use devAuth instead - see app.js and BACKEND_RUN_GUIDE.md ==========
const serviceAccount = require('../firebase-service-account.json'); // Download this from Firebase > Project Settings > Service accounts

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}
// ========== END OF BLOCK TO COMMENT OUT ==========

const verifyFirebaseToken = async (req, res, next) => {
  console.log('In the middleWare')
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized: No token provided' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = await admin.auth().verifyIdToken(token);
    req.user = decoded;
    console.log('Token verified');
    next();
  } catch (err) {
    return res.status(403).json({ error: 'Invalid or expired token' });
  }
};

module.exports = verifyFirebaseToken;
