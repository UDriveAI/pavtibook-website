/**
 * rateLimiter.js
 * Express rate-limiting middleware instances.
 *
 * Protects:
 *  - OTP send endpoint (SMS cost + brute-force abuse)
 *  - Public receipt verify endpoint (DDoS / scraping)
 *  - All other API routes (general abuse protection)
 */

const rateLimit = require('express-rate-limit');

/**
 * OTP Limiter — strict limit for OTP send endpoint.
 * Max 5 OTP requests per IP per 15 minutes.
 * Prevents SMS budget drainage and OTP brute-force attacks.
 */
const otpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5,
  standardHeaders: true, // Return RateLimit-* headers
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many OTP requests from this IP. Please wait 15 minutes before trying again.',
    retryAfterSeconds: 900,
  },
  handler: (req, res, next, options) => {
    console.warn(`[RateLimit] OTP limit exceeded for IP: ${req.ip}`);
    res.status(options.statusCode).json(options.message);
  },
});

/**
 * Verify Limiter — for public receipt verification endpoint.
 * Max 10 verification requests per IP per 15 minutes.
 * Prevents automated QR code scanning / enumeration attacks.
 */
const verifyLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many verification requests. Please try again after 15 minutes.',
    retryAfterSeconds: 900,
  },
  handler: (req, res, next, options) => {
    console.warn(`[RateLimit] Verify limit exceeded for IP: ${req.ip}`);
    res.status(options.statusCode).json(options.message);
  },
});

/**
 * General API Limiter — applied globally to all /api/* routes.
 * Max 200 requests per IP per minute.
 * Provides a safety net against general flooding.
 */
const generalLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many requests from this IP. Please slow down.',
    retryAfterSeconds: 60,
  },
  handler: (req, res, next, options) => {
    console.warn(`[RateLimit] General limit exceeded for IP: ${req.ip}`);
    res.status(options.statusCode).json(options.message);
  },
  skip: (req) => {
    // Skip rate limiting for health check endpoint
    return req.path === '/health';
  },
});

/**
 * Login Limiter — strict limit for login and OTP verification endpoints.
 * Max 5 login/verify attempts per IP per 15 minutes.
 * Prevents credential stuffing and OTP brute-force guessing.
 */
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many login or verification attempts from this IP. Please wait 15 minutes.',
    retryAfterSeconds: 900,
  },
  handler: (req, res, next, options) => {
    console.warn(`[RateLimit] Login/Verify limit exceeded for IP: ${req.ip}`);
    res.status(options.statusCode).json(options.message);
  },
});

module.exports = { otpLimiter, verifyLimiter, generalLimiter, loginLimiter };
