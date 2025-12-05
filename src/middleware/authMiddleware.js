const { verifyAccessToken } = require('../utils/Jwt');
const ApiResponse = require('../utils/apiResponse');
const { Roles, AllRoles } = require('../utils/constData');
const SubAdmin = require('../subAdmin/subAdminModel/subAdminAuthModel');

/**
 * Authorization middleware factory.
 * Usage: app.get('/route', authorize([Roles.ADMIN, Roles.USER]), handler)
 * - Verifies Bearer token
 * - Attaches req.user with JWT payload
 * - Checks role inclusion if roles array provided
 */
function authorize(allowedRoles = AllRoles) {
	return async (req, res, next) => {
		try {
			const authHeader = req.headers['authorization'] || req.headers['Authorization'];
			// eslint-disable-next-line no-console
			console.log('[AUTH] Incoming auth header', { hasAuth: !!authHeader });
			if (!authHeader || !authHeader.startsWith('Bearer ')) {
				return ApiResponse.unauthorized(res, 'Missing or invalid Authorization header');
			}

			const token = authHeader.split(' ')[1];
			// eslint-disable-next-line no-console
			console.log('[AUTH] Verifying token');
			const payload = verifyAccessToken(token);
			req.user = payload;

			// role check (optional)
			if (Array.isArray(allowedRoles) && allowedRoles.length > 0) {
				const userRole = payload?.role;
				// eslint-disable-next-line no-console
				console.log('[AUTH] Role check', { userRole, allowedRoles });
				if (!userRole || !allowedRoles.includes(String(userRole).toLowerCase())) {
					return ApiResponse.forbidden(res, 'Forbidden: insufficient role', 'ROLE_FORBIDDEN');
				}

				// Additional check for SubAdmin approval status
				if (userRole === 'subadmin') {
					try {
						const subAdmin = await SubAdmin.findById(payload.userId);
						if (!subAdmin) {
							return ApiResponse.notFound(res, 'SubAdmin not found');
						}
						
						// Allow profile updates even for pending SubAdmins
						const isProfileUpdate = req.method === 'PUT' && req.path.includes('/profile');
						const isAuthEndpoint = req.path.includes('/auth/');
						
						// Allow auth endpoints and profile updates for pending SubAdmins
						if (!isProfileUpdate && !isAuthEndpoint && subAdmin.approvalStatus !== 'approved') {
							// eslint-disable-next-line no-console
							console.log('[AUTH] SubAdmin not approved', { 
								approvalStatus: subAdmin.approvalStatus,
								subAdminId: subAdmin._id,
								path: req.path,
								method: req.method
							});
							return ApiResponse.forbidden(res, 'SubAdmin account is pending approval or has been rejected', 'SUBADMIN_NOT_APPROVED');
						}
						
						// Only check isActive for approved SubAdmins (except profile updates)
						if (!isProfileUpdate && subAdmin.approvalStatus === 'approved' && !subAdmin.isActive) {
							// eslint-disable-next-line no-console
							console.log('[AUTH] SubAdmin account inactive', { subAdminId: subAdmin._id });
							return ApiResponse.forbidden(res, 'SubAdmin account is inactive', 'SUBADMIN_INACTIVE');
						}
					} catch (dbErr) {
						// eslint-disable-next-line no-console
						console.error('[AUTH] SubAdmin approval check error:', dbErr?.message || dbErr);
						return ApiResponse.serverError(res, 'Failed to verify SubAdmin status');
					}
				}
			}

			console.log('[AUTH] ✅ Auth successful, calling next()');
			return next();
		} catch (err) {
			// Token errors: TokenExpiredError, JsonWebTokenError, NotBeforeError
			const message = err?.name === 'TokenExpiredError' ? 'Access token expired' : 'Invalid token';
			// eslint-disable-next-line no-console
			console.error('[AUTH] Auth error', err?.name || err);
			return ApiResponse.unauthorized(res, message, err?.name || 'UNAUTHORIZED');
		}
	};
}

module.exports = {
	authorize,
	Roles,
};


