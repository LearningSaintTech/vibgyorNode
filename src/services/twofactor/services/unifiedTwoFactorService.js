/**
 * Unified 2Factor Service Layer
 * Provides role-agnostic methods for OTP operations across User, Admin, and SubAdmin
 */

const twofactorService = require('./twofactorService');
const { normalizePhoneForAPI, isBypassPhone, getBypassSessionId, isBypassOTP, BYPASS_PHONES, BYPASS_OTP } = require('../utils/phoneUtils');

class UnifiedTwoFactorService {
	/**
	 * Send OTP for any role
	 * @param {string} phoneNumber - Phone number (with or without country code)
	 * @param {string} countryCode - Country code (default: '+91')
	 * @param {string} role - Role type: 'user', 'admin', 'subadmin'
	 * @returns {Promise<Object>} Result object with success status and data
	 */
	async sendOTP(phoneNumber, countryCode = '+91', role = 'user') {
		try {
			// Normalize phone number
			const normalizedMobile = normalizePhoneForAPI(phoneNumber, countryCode);
			
			// Check for development bypass
			if (isBypassPhone(normalizedMobile) || 
			    (role === 'admin' && phoneNumber === '9999999999') ||
			    (role === 'subadmin' && phoneNumber === '8888888888')) {
				console.log(`[UNIFIED_2FACTOR] 🔓 Development bypass for ${role}:`, phoneNumber);
				return {
					success: true,
					data: {
						sessionId: getBypassSessionId(phoneNumber),
						phoneNumber: normalizedMobile,
						bypass: true,
						message: 'OTP sent (bypass mode)'
					}
				};
			}

			// Call 2Factor API
			const result = await twofactorService.sendOTP(normalizedMobile);
			return result;
		} catch (error) {
			console.error(`[UNIFIED_2FACTOR] Error sending OTP for ${role}:`, error);
			return {
				success: false,
				data: {
					message: 'Failed to send OTP: ' + error.message,
					error: 'SEND_OTP_ERROR',
					phoneNumber: phoneNumber
				}
			};
		}
	}

	/**
	 * Verify OTP for any role
	 * @param {string} phoneNumber - Phone number
	 * @param {string} otp - OTP code
	 * @param {string} sessionId - Session ID from sendOTP
	 * @param {string} countryCode - Country code (default: '+91')
	 * @param {string} role - Role type: 'user', 'admin', 'subadmin'
	 * @returns {Promise<Object>} Result object with success status and data
	 */
	async verifyOTP(phoneNumber, otp, sessionId, countryCode = '+91', role = 'user') {
		try {
			// Normalize phone number
			const normalizedMobile = normalizePhoneForAPI(phoneNumber, countryCode);
			
			// Check for development bypass
			if ((isBypassPhone(normalizedMobile) || 
			     (role === 'admin' && phoneNumber === '9999999999') ||
			     (role === 'subadmin' && phoneNumber === '8888888888')) && 
			    isBypassOTP(otp)) {
				console.log(`[UNIFIED_2FACTOR] 🔓 Development bypass verification for ${role}:`, phoneNumber);
				return {
					success: true,
					data: {
						message: 'OTP verified (bypass mode)',
						phoneNumber: normalizedMobile,
						bypass: true
					}
				};
			}

			// Validate session ID
			if (!sessionId) {
				return {
					success: false,
					data: {
						message: 'Session ID is required',
						error: 'SESSION_ID_MISSING',
						phoneNumber: normalizedMobile
					}
				};
			}

			// Call 2Factor API
			const result = await twofactorService.verifyOTP(normalizedMobile, otp, sessionId);
			return result;
		} catch (error) {
			console.error(`[UNIFIED_2FACTOR] Error verifying OTP for ${role}:`, error);
			return {
				success: false,
				data: {
					message: 'Failed to verify OTP: ' + error.message,
					error: 'VERIFY_OTP_ERROR',
					phoneNumber: phoneNumber
				}
			};
		}
	}

	/**
	 * Resend OTP for any role
	 * @param {string} phoneNumber - Phone number
	 * @param {string} countryCode - Country code (default: '+91')
	 * @param {string} role - Role type: 'user', 'admin', 'subadmin'
	 * @returns {Promise<Object>} Result object with success status and data
	 */
	async resendOTP(phoneNumber, countryCode = '+91', role = 'user') {
		try {
			// Resend is same as send
			return await this.sendOTP(phoneNumber, countryCode, role);
		} catch (error) {
			console.error(`[UNIFIED_2FACTOR] Error resending OTP for ${role}:`, error);
			return {
				success: false,
				data: {
					message: 'Failed to resend OTP: ' + error.message,
					error: 'RESEND_OTP_ERROR',
					phoneNumber: phoneNumber
				}
			};
		}
	}

	/**
	 * Check if phone number is a bypass number
	 * @param {string} phoneNumber - Phone number to check
	 * @param {string} role - Role type
	 * @returns {boolean} True if bypass number
	 */
	isBypassNumber(phoneNumber, role = 'user') {
		const normalized = normalizePhoneForAPI(phoneNumber);
		return isBypassPhone(normalized) || 
		       (role === 'admin' && phoneNumber === '9999999999') ||
		       (role === 'subadmin' && phoneNumber === '8888888888');
	}

	/**
	 * Get normalized phone number for API calls
	 * @param {string} phoneNumber - Phone number
	 * @param {string} countryCode - Country code
	 * @returns {string} Normalized phone number
	 */
	getNormalizedPhone(phoneNumber, countryCode = '+91') {
		return normalizePhoneForAPI(phoneNumber, countryCode);
	}
}

module.exports = new UnifiedTwoFactorService();

