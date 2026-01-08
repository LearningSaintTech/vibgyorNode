/**
 * Validation utilities for 2Factor authentication
 */

// Validate mobile number format (+91 followed by 10 digits)
const validateMobile = (mobileNumber) => {
  if (!mobileNumber || typeof mobileNumber !== 'string') {
    return { isValid: false, error: 'Mobile number is required and must be a string' };
  }
  
  const trimmed = mobileNumber.trim();
  if (trimmed.length === 0) {
    return { isValid: false, error: 'Mobile number cannot be empty' };
  }
  
  // Accept both formats: +91XXXXXXXXXX or XXXXXXXXXX
  const withCountryCode = /^\+91\d{10}$/.test(trimmed);
  const withoutCountryCode = /^\d{10}$/.test(trimmed);
  
  if (!withCountryCode && !withoutCountryCode) {
    return { isValid: false, error: 'Mobile number must be 10 digits (with or without +91 prefix)' };
  }
  
  return { isValid: true, normalized: trimmed };
};

// Validate OTP format (6 digits)
const validateOTP = (otp) => {
  if (!otp || typeof otp !== 'string') {
    return { isValid: false, error: 'OTP is required and must be a string' };
  }
  
  const trimmed = otp.trim();
  if (trimmed.length === 0) {
    return { isValid: false, error: 'OTP cannot be empty' };
  }
  
  if (!/^\d{6}$/.test(trimmed)) {
    return { isValid: false, error: 'OTP must be exactly 6 digits' };
  }
  
  return { isValid: true, normalized: trimmed };
};

// Validate session ID format
const validateSessionId = (sessionId) => {
  if (!sessionId || typeof sessionId !== 'string') {
    return { isValid: false, error: 'Session ID is required and must be a string' };
  }
  
  const trimmed = sessionId.trim();
  if (trimmed.length === 0) {
    return { isValid: false, error: 'Session ID cannot be empty' };
  }
  
  if (trimmed.length < 10) {
    return { isValid: false, error: 'Session ID must be at least 10 characters long' };
  }
  
  if (trimmed.length > 100) {
    return { isValid: false, error: 'Session ID must not exceed 100 characters' };
  }
  
  if (!/^[a-zA-Z0-9\-_]+$/.test(trimmed)) {
    return { isValid: false, error: 'Session ID contains invalid characters' };
  }
  
  return { isValid: true, normalized: trimmed };
};

// Validate request body structure
const validateRequestBody = (body, requiredFields) => {
  if (!body || typeof body !== 'object') {
    return { isValid: false, error: 'Request body must be a valid JSON object' };
  }
  
  const missingFields = requiredFields.filter(field => !(field in body));
  if (missingFields.length > 0) {
    return { isValid: false, error: `Missing required fields: ${missingFields.join(', ')}` };
  }
  
  return { isValid: true };
};

module.exports = {
  validateMobile,
  validateOTP,
  validateSessionId,
  validateRequestBody
};

