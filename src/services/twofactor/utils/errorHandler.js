/**
 * Error Handler for 2Factor Authentication
 * Standardizes error responses across all roles
 */

const ApiResponse = require('../../../utils/apiResponse');

/**
 * Map 2Factor API errors to standardized error codes
 */
const ERROR_CODES = {
	INVALID_OTP: 'INVALID_OTP',
	OTP_EXPIRED: 'OTP_EXPIRED',
	SESSION_EXPIRED: 'SESSION_EXPIRED',
	VERIFICATION_FAILED: 'VERIFICATION_FAILED',
	CONFIGURATION_ERROR: 'CONFIGURATION_ERROR',
	SERVICE_ERROR: 'SERVICE_ERROR',
	RATE_LIMIT: 'RATE_LIMIT',
	PHONE_REQUIRED: 'PHONE_REQUIRED',
	OTP_REQUIRED: 'OTP_REQUIRED',
	SESSION_ID_MISSING: 'SESSION_ID_MISSING'
};

/**
 * Handle 2Factor service errors and return standardized response
 * @param {Object} errorResult - Error result from 2Factor service
 * @param {Object} res - Express response object
 * @returns {Object} Standardized error response
 */
function handle2FactorError(errorResult, res) {
	if (!errorResult || !errorResult.data) {
		return ApiResponse.serverError(res, 'Unknown error occurred', 'SERVICE_ERROR');
	}

	const errorType = errorResult.data.error || 'VERIFICATION_FAILED';
	const errorMessage = errorResult.data.message || 'An error occurred';
	const errorDetails = errorResult.data.details || '';

	switch (errorType) {
		case ERROR_CODES.INVALID_OTP:
			return ApiResponse.unauthorized(res, errorMessage, ERROR_CODES.INVALID_OTP);

		case ERROR_CODES.OTP_EXPIRED:
			return ApiResponse.unauthorized(res, errorMessage, ERROR_CODES.OTP_EXPIRED);

		case ERROR_CODES.SESSION_EXPIRED:
			return ApiResponse.unauthorized(res, errorMessage, ERROR_CODES.SESSION_EXPIRED);

		case ERROR_CODES.CONFIGURATION_ERROR:
			return ApiResponse.serverError(res, errorMessage, ERROR_CODES.CONFIGURATION_ERROR);

		case ERROR_CODES.SERVICE_ERROR:
			return ApiResponse.serverError(res, errorMessage, ERROR_CODES.SERVICE_ERROR);

		default:
			return ApiResponse.serverError(res, errorMessage, ERROR_CODES.VERIFICATION_FAILED);
	}
}

/**
 * Log 2Factor operation with structured logging
 * @param {string} operation - Operation name (sendOTP, verifyOTP, etc.)
 * @param {string} role - User role
 * @param {string} phoneNumber - Phone number (masked)
 * @param {string} status - Status (success, error, bypass)
 * @param {Object} metadata - Additional metadata
 */
function log2FactorOperation(operation, role, phoneNumber, status, metadata = {}) {
	const timestamp = new Date().toISOString();
	const maskedPhone = phoneNumber ? `******${phoneNumber.slice(-4)}` : 'N/A';
	
	const logData = {
		timestamp,
		operation,
		role,
		phoneNumber: maskedPhone,
		status,
		...metadata
	};

	if (status === 'error') {
		console.error(`[2FACTOR][${operation.toUpperCase()}]`, logData);
	} else if (status === 'bypass') {
		console.log(`[2FACTOR][${operation.toUpperCase()}][BYPASS]`, logData);
	} else {
		console.log(`[2FACTOR][${operation.toUpperCase()}]`, logData);
	}
}

/**
 * Create standardized success response
 * @param {Object} res - Express response object
 * @param {Object} data - Response data
 * @param {string} message - Success message
 * @returns {Object} Success response
 */
function createSuccessResponse(res, data, message = 'Operation successful') {
	return ApiResponse.success(res, data, message);
}

/**
 * Validate and normalize error details
 * @param {Object} error - Error object
 * @returns {Object} Normalized error details
 */
function normalizeError(error) {
	if (!error) {
		return {
			message: 'Unknown error',
			code: 'UNKNOWN_ERROR',
			details: ''
		};
	}

	// Handle axios errors
	if (error.response) {
		return {
			message: error.response.data?.Details || error.response.data?.Message || error.message,
			code: error.response.data?.Status || 'API_ERROR',
			details: error.response.data || {},
			statusCode: error.response.status
		};
	}

	// Handle standard errors
	return {
		message: error.message || 'An error occurred',
		code: error.code || 'ERROR',
		details: error.stack || ''
	};
}

module.exports = {
	ERROR_CODES,
	handle2FactorError,
	log2FactorOperation,
	createSuccessResponse,
	normalizeError
};

