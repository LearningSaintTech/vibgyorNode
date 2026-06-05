/**
 * SubAdmin module route exports (Khush-style aggregator).
 * Mount paths unchanged — wired in src/routes.js.
 */
const { authRoutes } = require('./auth');
const { userManagementRoutes } = require('./userManagement');
const { verifiedUserRoutes } = require('./verifiedUser');
const { statisticsRoutes } = require('./statistics');

module.exports = {
	authRoutes,
	userManagementRoutes,
	verifiedUserRoutes,
	statisticsRoutes,
};
