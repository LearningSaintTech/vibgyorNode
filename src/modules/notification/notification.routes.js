/**
 * Notification module route exports (Khush-style aggregator).
 * Mount paths unchanged — wired in src/routes.js.
 */
const notificationRoutes = require('./routes/notificationRoutes');
const notificationPreferencesRoutes = require('./routes/notificationPreferencesRoutes');

module.exports = {
	notificationRoutes,
	notificationPreferencesRoutes,
};
