/**
 * validation.js
 * Zero-dependency input validation middleware.
 */

const validate = (rules) => {
  return (req, res, next) => {
    const errors = {};
    for (const [field, validators] of Object.entries(rules)) {
      const value = req.body[field];
      for (const validator of validators) {
        const error = validator(value, field);
        if (error) {
          errors[field] = error;
          break; // Stop checking this field on first violation
        }
      }
    }
    if (Object.keys(errors).length > 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'Input validation failed.',
        errors 
      });
    }
    next();
  };
};

const required = () => (val, field) => {
  if (val === undefined || val === null || (typeof val === 'string' && val.trim() === '')) {
    return `${field} is required.`;
  }
};

const email = () => (val, field) => {
  if (val !== undefined && val !== null && val !== '') {
    const regex = /^[A-Za-z0-9._%-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,4}$/;
    if (!regex.test(val)) {
      return `${field} must be a valid email address.`;
    }
  }
};

const mobile = () => (val, field) => {
  if (val !== undefined && val !== null && val !== '') {
    const regex = /^[0-9]{10}$/;
    if (!regex.test(val)) {
      return `${field} must be a valid 10-digit mobile number.`;
    }
  }
};

const pincode = () => (val, field) => {
  if (val !== undefined && val !== null && val !== '') {
    const regex = /^[0-9]{6}$/;
    if (!regex.test(val)) {
      return `${field} must be a valid 6-digit pincode.`;
    }
  }
};

const numeric = (min = 0) => (val, field) => {
  if (val !== undefined && val !== null && val !== '') {
    const num = parseFloat(val);
    if (isNaN(num)) {
      return `${field} must be a valid number.`;
    }
    if (num <= min) {
      return `${field} must be greater than ${min}.`;
    }
  }
};

const minLength = (len) => (val, field) => {
  if (val !== undefined && val !== null && val !== '') {
    if (typeof val === 'string' && val.length < len) {
      return `${field} must be at least ${len} characters long.`;
    }
  }
};

const inEnum = (list) => (val, field) => {
  if (val !== undefined && val !== null && val !== '') {
    if (!list.includes(val)) {
      return `${field} must be one of: ${list.join(', ')}.`;
    }
  }
};

module.exports = {
  validate,
  required,
  email,
  mobile,
  pincode,
  numeric,
  minLength,
  inEnum
};
