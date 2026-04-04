/**
 * DEV-ONLY: Bypass Firebase Admin verify. Use when SKIP_FIREBASE=true (no service account).
 *
 * If the client sends Authorization: Bearer <Firebase ID token>, we decode the JWT payload
 * (no signature verify) and use `sub` as uid so routes like /api/health/sync match body.userId.
 * For local demos with the real app + demo Firebase user, this fixes 403 vs dev-user-123.
 *
 * Otherwise: header X-Dev-User-Id, or default dev-user-123.
 *
 * Production: set SKIP_FIREBASE=false and use firebaseAuth.js (verified tokens).
 */

function decodeFirebaseIdTokenPayload(token) {
  try {
    const parts = String(token).split('.');
    if (parts.length !== 3) return null;
    const b64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const padded = b64 + '==='.slice((b64.length + 3) % 4);
    const json = Buffer.from(padded, 'base64').toString('utf8');
    return JSON.parse(json);
  } catch {
    return null;
  }
}

const devAuth = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(/\s+/)[1];
    const payload = decodeFirebaseIdTokenPayload(token);
    if (payload && payload.sub) {
      req.user = {
        uid: payload.sub,
        email: payload.email || '',
        name: payload.name,
      };
      console.log('[DEV] Using uid from Bearer JWT payload (unverified):', payload.sub);
      return next();
    }
  }

  const devUserId = req.headers['x-dev-user-id'] || 'dev-user-123';
  req.user = {
    uid: devUserId,
    email: `${devUserId}@dev.local`,
    name: 'Dev User',
  };
  console.log('[DEV] Bypassing Firebase auth, using userId:', devUserId);
  next();
};

module.exports = devAuth;
