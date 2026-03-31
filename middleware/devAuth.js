/**
 * DEV-ONLY: Bypass Firebase auth. Use when you don't have firebase-service-account.json.
 * Set SKIP_FIREBASE=true in .env to use this.
 *
 * Send header: X-Dev-User-Id: your-test-user-id
 * Or it defaults to: dev-user-123
 */
const devAuth = (req, res, next) => {
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
