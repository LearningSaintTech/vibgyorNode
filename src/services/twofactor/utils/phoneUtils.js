/**
 * Phone number normalization utilities for 2Factor API
 */

// Development bypass phone numbers
const BYPASS_PHONES = {
  USER: '+917042456544',
  ADMIN: '9999999999',
  SUBADMIN: '8888888888'
};

// Development bypass OTP
const BYPASS_OTP = '123456';

/**
 * Normalize phone number for 2Factor API
 * Adds +91 prefix if not present
 * @param {string} phoneNumber - Phone number to normalize
 * @param {string} countryCode - Country code (default: '+91')
 * @returns {string} Normalized phone number with country code
 */
const normalizePhoneForAPI = (phoneNumber, countryCode = '+91') => {
  if (!phoneNumber) {
    return null;
  }
  
  const trimmed = phoneNumber.trim();
  
  // If already has +91 prefix, return as is
  if (trimmed.startsWith('+91')) {
    return trimmed;
  }
  
  // If starts with 91 (without +), add +
  if (trimmed.startsWith('91') && trimmed.length === 12) {
    return '+' + trimmed;
  }
  
  // If 10 digits, add country code
  if (/^\d{10}$/.test(trimmed)) {
    return countryCode + trimmed;
  }
  
  // Return as is if format is unexpected (let API handle validation)
  return trimmed;
};

/**
 * Check if phone number is a development bypass number
 * @param {string} phoneNumber - Phone number to check
 * @returns {boolean} True if bypass number
 */
const isBypassPhone = (phoneNumber) => {
  if (!phoneNumber) return false;
  
  const normalized = normalizePhoneForAPI(phoneNumber);
  return normalized === BYPASS_PHONES.USER || 
         phoneNumber === BYPASS_PHONES.ADMIN || 
         phoneNumber === BYPASS_PHONES.SUBADMIN;
};

/**
 * Get bypass session ID for development
 * @param {string} phoneNumber - Phone number
 * @returns {string} Mock session ID
 */
const getBypassSessionId = (phoneNumber) => {
  return `bypassed-session-${Date.now()}-${phoneNumber}`;
};

/**
 * Check if OTP is bypass OTP
 * @param {string} otp - OTP to check
 * @returns {boolean} True if bypass OTP
 */
const isBypassOTP = (otp) => {
  return otp === BYPASS_OTP;
};

module.exports = {
  normalizePhoneForAPI,
  isBypassPhone,
  getBypassSessionId,
  isBypassOTP,
  BYPASS_PHONES,
  BYPASS_OTP
};

