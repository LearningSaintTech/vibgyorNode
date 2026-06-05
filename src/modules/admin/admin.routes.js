/**
 * Admin module route exports (Khush-style aggregator).
 * Mount paths unchanged — wired in src/routes.js.
 */
const { adminAuthRoutes } = require('./auth');
const { userManagementRoutes } = require('./userManagement');
const { subAdminManagementRoutes } = require('./subAdminManagement');
const { contentModerationRoutes } = require('./contentModeration');
const { userSearchRoutes } = require('./userSearch');
const { adminAssociateRoutes } = require('./adminAssociate');
const { analyticsRoutes } = require('./analytics');
const { userCountRoutes } = require('./userCount');
const { userStatisticsRoutes } = require('./userStatistics');

module.exports = {
	adminAuthRoutes,
	userManagementRoutes,
	subAdminManagementRoutes,
	contentModerationRoutes,
	userSearchRoutes,
	adminAssociateRoutes,
	analyticsRoutes,
	userCountRoutes,
	userStatisticsRoutes,
};
