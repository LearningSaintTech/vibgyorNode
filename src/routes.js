/**
 * Central route registry (Khush-style).
 * All HTTP mounts live here; mount paths are unchanged from legacy app.js.
 */
const {
	adminAuthRoutes,
	userManagementRoutes: adminUserManagementRoutes,
	subAdminManagementRoutes: adminSubAdminManagementRoutes,
	contentModerationRoutes: adminContentModerationRoutes,
	userSearchRoutes: adminUserRoutes,
	adminAssociateRoutes,
	analyticsRoutes: adminAnalyticsRoutes,
	userCountRoutes: adminUserCountRoutes,
	userStatisticsRoutes: adminUserStatisticsRoutes,
} = require('./modules/admin/admin.routes');

const {
	authRoutes: subAdminRoutes,
	userManagementRoutes: subAdminUserManagementRoutes,
	verifiedUserRoutes: subdminVerifiedUserRoutes,
	statisticsRoutes: subAdminUserStatisticsRoutes,
} = require('./modules/subAdmin/subAdmin.routes');

const {
	authRoutes: userAuthRoutes,
	usernameRoutes: userUsernameRoutes,
	deleteAccountRoutes,
	catalogRoutes: userCatalogRoutes,
	uploadRoutes: userFileUploadRoutes,
} = require('./modules/user/user.routes');

const {
	statusRoutes: userStatusRoutes,
	messageRequestRoutes: userMessageRequestRoutes,
	graphRoutes: userSocialRoutes,
	storyRoutes,
	postRoutes,
} = require('./modules/social/social.routes');

const { apiV1Routes: enhancedUserRoutes } = require('./modules/social/apiV1');

const {
	mediaRoutes: datingMediaRoutes,
	profileRoutes: datingProfileRoutes,
	interactionRoutes: datingInteractionRoutes,
	messageRoutes: datingMessageRoutes,
	chatRoutes: datingChatRoutes,
	callRoutes: datingCallRoutes,
} = require('./modules/dating/dating.routes');

const {
	notificationRoutes,
	notificationPreferencesRoutes,
} = require('./modules/notification/notification.routes');

const geoRoutes = require('./modules/geo/geo.routes');

function registerRoutes(app) {
	// Admin phone OTP auth (same pattern as /user/auth)
	app.use('/admin/auth', adminAuthRoutes);
	app.use('/admin-auth', adminAuthRoutes); // legacy alias
	app.use('/admin', adminAuthRoutes); // legacy: /admin/send-otp, /admin/get-profile

	app.use('/admin', adminUserManagementRoutes);
	app.use('/admin', adminSubAdminManagementRoutes);
	app.use('/admin/content-moderation', adminContentModerationRoutes);
	app.use('/admin/analytics', adminAnalyticsRoutes);
	app.use('/admin', adminUserCountRoutes);
	app.use('/api/admin', adminUserRoutes);
	app.use('/admin', adminUserStatisticsRoutes);
	app.use('/admin', adminAssociateRoutes);

	app.use('/subadmin', subAdminRoutes);
	app.use('/subadmin', subAdminUserManagementRoutes);
	app.use('/subadmin', subdminVerifiedUserRoutes);
	app.use('/subadmin', subAdminUserStatisticsRoutes);

	app.use('/user/auth', userAuthRoutes);
	app.use('/user/catalog', userCatalogRoutes);
	app.use('/user/username', userUsernameRoutes);
	app.use('/user/social', userSocialRoutes);
	app.use('/user/message-requests', userMessageRequestRoutes);
	app.use('/user/status', userStatusRoutes);
	app.use('/user/upload', userFileUploadRoutes);
	app.use('/user', deleteAccountRoutes);
	app.use('/user/posts', postRoutes);
	app.use('/user/stories', storyRoutes);
	app.use('/user/dating', datingMediaRoutes);
	app.use('/user/dating', datingProfileRoutes);
	app.use('/user/dating', datingInteractionRoutes);
	app.use('/user/dating/chats', datingChatRoutes);
	app.use('/user/dating/messages', datingMessageRoutes);
	app.use('/user/dating/calls', datingCallRoutes);

	app.use('/api/notification', (req, res, next) => {
		console.log('[APP] Request to /api/notification:', {
			method: req.method,
			path: req.path,
			url: req.url,
			originalUrl: req.originalUrl,
		});
		next();
	});

	app.use('/api/v1/notifications', notificationRoutes);
	app.use('/api/v1/notification-preferences', notificationPreferencesRoutes);
	app.use('/api/notification', notificationRoutes);

	app.use('/api/v1/user', enhancedUserRoutes);
	app.use('/api/v1/geo', geoRoutes);
}

module.exports = { registerRoutes };
