/**
 * 2Factor Authentication Service
 * Main entry point for 2Factor API integration
 */

const twofactorService = require('./services/twofactorService');
const unifiedTwoFactorService = require('./services/unifiedTwoFactorService');
const { twofactorConfig, twofactorClient } = require('./config/twofactorConfig');
const { validateMobile, validateOTP, validateSessionId, validateRequestBody } = require('./utils/validation');
const { 
  normalizePhoneForAPI, 
  isBypassPhone, 
  getBypassSessionId, 
  isBypassOTP,
  BYPASS_PHONES,
  BYPASS_OTP 
} = require('./utils/phoneUtils');
const {
  ERROR_CODES,
  handle2FactorError,
  log2FactorOperation,
  createSuccessResponse,
  normalizeError
} = require('./utils/errorHandler');

module.exports = {
  // Services
  twofactorService,
  unifiedTwoFactorService,
  
  // Config
  twofactorConfig,
  twofactorClient,
  
  // Validation utilities
  validateMobile,
  validateOTP,
  validateSessionId,
  validateRequestBody,
  
  // Phone utilities
  normalizePhoneForAPI,
  isBypassPhone,
  getBypassSessionId,
  isBypassOTP,
  BYPASS_PHONES,
  BYPASS_OTP,
  
  // Error handling
  ERROR_CODES,
  handle2FactorError,
  log2FactorOperation,
  createSuccessResponse,
  normalizeError
};

