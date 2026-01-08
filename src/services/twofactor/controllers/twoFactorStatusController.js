/**
 * 2Factor Service Status Controller
 * Provides endpoints to check 2Factor API status and configuration
 */

const { twofactorService } = require('../index');
const ApiResponse = require('../../../utils/apiResponse');

/**
 * Check 2Factor service status
 * GET /admin/auth/2factor-status
 */
async function check2FactorStatus(req, res) {
	try {
		console.log('[2FACTOR_STATUS] Checking service status...');
		
		const statusResult = await twofactorService.checkServiceStatus();
		
		if (statusResult.success) {
			console.log('[2FACTOR_STATUS] ✅ Service operational:', statusResult.data);
			return ApiResponse.success(res, {
				status: 'operational',
				balance: statusResult.data.balance,
				apiKeyConfigured: !!process.env.TWOFACTOR_API_KEY,
				baseUrl: process.env.TWOFACTOR_BASE_URL || 'https://2factor.in/API/V1',
				templateName: process.env.TWOFACTOR_OTP_TEMPLATE_NAME || 'Not configured'
			}, '2Factor service is operational');
		} else {
			console.error('[2FACTOR_STATUS] ❌ Service not operational:', statusResult.data);
			return ApiResponse.serverError(res, {
				status: 'not_operational',
				message: statusResult.data.message,
				apiKeyConfigured: !!process.env.TWOFACTOR_API_KEY
			}, '2Factor service is not operational');
		}
	} catch (error) {
		console.error('[2FACTOR_STATUS] Error checking status:', error);
		return ApiResponse.serverError(res, {
			status: 'error',
			message: error.message,
			apiKeyConfigured: !!process.env.TWOFACTOR_API_KEY
		}, 'Failed to check service status');
	}
}

module.exports = {
	check2FactorStatus
};

