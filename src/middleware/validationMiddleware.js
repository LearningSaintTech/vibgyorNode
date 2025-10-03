/**
 * Enhanced Validation Middleware with comprehensive input validation
 */

/**
 * Validate request parameters, query, and body against schema
 * @param {Object} schema - Validation schema
 * @returns {Function} Express middleware function
 */
const validateRequest = (schema) => {
  return (req, res, next) => {
    try {
      const errors = {};
      
      // Validate params
      if (schema.params) {
        const paramErrors = validateObject(req.params, schema.params);
        if (Object.keys(paramErrors).length > 0) {
          errors.params = paramErrors;
        }
      }
      
      // Validate query
      if (schema.query) {
        const queryErrors = validateObject(req.query, schema.query);
        if (Object.keys(queryErrors).length > 0) {
          errors.query = queryErrors;
        }
      }
      
      // Validate body
      if (schema.body) {
        const bodyErrors = validateObject(req.body, schema.body);
        if (Object.keys(bodyErrors).length > 0) {
          errors.body = bodyErrors;
        }
      }
      
      // Check if there are any validation errors
      if (Object.keys(errors).length > 0) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors
        });
      }
      
      next();
    } catch (error) {
      console.error('[ValidationMiddleware] Error:', error);
      return res.status(500).json({
        success: false,
        message: 'Validation error occurred'
      });
    }
  };
};

/**
 * Validate an object against a schema
 * @param {Object} obj - Object to validate
 * @param {Object} schema - Validation schema
 * @returns {Object} Validation errors
 */
const validateObject = (obj, schema) => {
  const errors = {};
  
  for (const [field, rules] of Object.entries(schema)) {
    const value = obj[field];
    const fieldErrors = validateField(field, value, rules);
    
    if (fieldErrors.length > 0) {
      errors[field] = fieldErrors;
    }
  }
  
  return errors;
};

/**
 * Validate a single field against its rules
 * @param {string} field - Field name
 * @param {any} value - Field value
 * @param {Object} rules - Validation rules
 * @returns {Array} Array of error messages
 */
const validateField = (field, value, rules) => {
  const errors = [];
  
  // Check required
  if (rules.required && (value === undefined || value === null || value === '')) {
    errors.push(`${field} is required`);
    return errors; // Don't check other rules if required field is missing
  }
  
  // Skip validation if field is not provided and not required
  if (value === undefined || value === null) {
    return errors;
  }
  
  // Type validation
  if (rules.type) {
    const typeError = validateType(field, value, rules.type);
    if (typeError) {
      errors.push(typeError);
      return errors; // Don't check other rules if type is wrong
    }
  }
  
  // String validations
  if (rules.type === 'string' && typeof value === 'string') {
    if (rules.minLength && value.length < rules.minLength) {
      errors.push(`${field} must be at least ${rules.minLength} characters long`);
    }
    
    if (rules.maxLength && value.length > rules.maxLength) {
      errors.push(`${field} must be no more than ${rules.maxLength} characters long`);
    }
    
    if (rules.enum && !rules.enum.includes(value)) {
      errors.push(`${field} must be one of: ${rules.enum.join(', ')}`);
    }
    
    if (rules.format === 'date' && !isValidDate(value)) {
      errors.push(`${field} must be a valid date`);
    }
    
    if (rules.format === 'email' && !isValidEmail(value)) {
      errors.push(`${field} must be a valid email address`);
    }
    
    if (rules.format === 'url' && !isValidUrl(value)) {
      errors.push(`${field} must be a valid URL`);
    }
  }
  
  // Number validations
  if (rules.type === 'number') {
    let numValue = value;
    
    // Convert string to number if needed
    if (typeof value === 'string') {
      numValue = Number(value);
      if (isNaN(numValue)) {
        errors.push(`${field} must be a valid number`);
        return errors;
      }
    }
    
    if (typeof numValue === 'number') {
      if (rules.min !== undefined && numValue < rules.min) {
        errors.push(`${field} must be at least ${rules.min}`);
      }
      
      if (rules.max !== undefined && numValue > rules.max) {
        errors.push(`${field} must be no more than ${rules.max}`);
      }
    }
  }
  
  // Boolean validations
  if (rules.type === 'boolean' && typeof value !== 'boolean') {
    errors.push(`${field} must be a boolean value`);
  }
  
  // Array validations
  if (rules.type === 'array' && Array.isArray(value)) {
    if (rules.minItems && value.length < rules.minItems) {
      errors.push(`${field} must have at least ${rules.minItems} items`);
    }
    
    if (rules.maxItems && value.length > rules.maxItems) {
      errors.push(`${field} must have no more than ${rules.maxItems} items`);
    }
  }
  
  // Object validations
  if (rules.type === 'object' && typeof value === 'object' && !Array.isArray(value)) {
    if (rules.requiredFields) {
      for (const requiredField of rules.requiredFields) {
        if (!(requiredField in value)) {
          errors.push(`${field} must contain required field: ${requiredField}`);
        }
      }
    }
  }
  
  return errors;
};

/**
 * Validate data type
 * @param {string} field - Field name
 * @param {any} value - Field value
 * @param {string} expectedType - Expected type
 * @returns {string|null} Error message or null
 */
const validateType = (field, value, expectedType) => {
  let actualType = typeof value;
  
  // Handle special cases
  if (Array.isArray(value)) {
    actualType = 'array';
  } else if (value === null) {
    actualType = 'null';
  } else if (value instanceof Date) {
    actualType = 'date';
  }
  
  // Handle type conversion for query parameters
  if (expectedType === 'number' && typeof value === 'string') {
    const numValue = Number(value);
    if (!isNaN(numValue)) {
      // Convert string to number for validation
      return null; // Valid number string
    }
  }
  
  if (actualType !== expectedType) {
    return `${field} must be of type ${expectedType}, got ${actualType}`;
  }
  
  return null;
};

/**
 * Validate date string
 * @param {string} dateString - Date string to validate
 * @returns {boolean} True if valid date
 */
const isValidDate = (dateString) => {
  const date = new Date(dateString);
  return date instanceof Date && !isNaN(date);
};

/**
 * Validate email string
 * @param {string} email - Email string to validate
 * @returns {boolean} True if valid email
 */
const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Validate URL string
 * @param {string} url - URL string to validate
 * @returns {boolean} True if valid URL
 */
const isValidUrl = (url) => {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
};

/**
 * Sanitize input data
 * @param {Object} data - Data to sanitize
 * @returns {Object} Sanitized data
 */
const sanitizeInput = (data) => {
  if (typeof data !== 'object' || data === null) {
    return data;
  }
  
  const sanitized = {};
  
  for (const [key, value] of Object.entries(data)) {
    if (typeof value === 'string') {
      // Trim whitespace and remove null bytes
      sanitized[key] = value.trim().replace(/\0/g, '');
    } else if (typeof value === 'object' && value !== null) {
      // Recursively sanitize nested objects
      sanitized[key] = sanitizeInput(value);
    } else {
      sanitized[key] = value;
    }
  }
  
  return sanitized;
};

/**
 * Rate limiting validation
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Next middleware function
 */
const validateRateLimit = (req, res, next) => {
  // This would integrate with your rate limiting mechanism
  // For now, just pass through
  next();
};

/**
 * File upload validation
 * @param {Object} file - Uploaded file object
 * @param {Array} allowedTypes - Allowed MIME types
 * @param {number} maxSize - Maximum file size in bytes
 * @returns {Object} Validation result
 */
const validateFile = (file, allowedTypes = [], maxSize = 50 * 1024 * 1024) => {
  const errors = [];
  
  if (!file) {
    return { isValid: true };
  }
  
  // Check file size
  if (file.size > maxSize) {
    errors.push(`File size must be less than ${Math.round(maxSize / 1024 / 1024)}MB`);
  }
  
  // Check file type
  if (allowedTypes.length > 0 && !allowedTypes.includes(file.mimetype)) {
    errors.push(`File type must be one of: ${allowedTypes.join(', ')}`);
  }
  
  // Check file name
  if (file.originalname && file.originalname.length > 255) {
    errors.push('File name must be less than 255 characters');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

module.exports = {
  validateRequest,
  validateObject,
  validateField,
  validateType,
  isValidDate,
  isValidEmail,
  isValidUrl,
  sanitizeInput,
  validateRateLimit,
  validateFile
};
