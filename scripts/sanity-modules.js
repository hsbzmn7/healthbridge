/**
 * Loads all alert/health route modules without starting the server.
 * Run: npm run sanity
 */
require('dotenv').config();
require('../utils/alertEvaluation');
require('../utils/baselineLogic');
require('../routes/alerts');
require('../routes/gentleAiNote');
require('../routes/health');
console.log('Sanity OK: modules load without syntax/runtime require errors.');
