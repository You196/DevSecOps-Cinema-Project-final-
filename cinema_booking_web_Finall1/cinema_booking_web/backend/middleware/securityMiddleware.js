const rateLimit = require('express-rate-limit');
const logger = require('../utils/logger');

// Global rate limiter
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per `window` (here, per 15 minutes)
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  handler: (req, res, next, options) => {
    logger.warn(`Global rate limit exceeded for IP: ${req.ip}`);
    res.status(options.statusCode).json({ error: options.message });
  }
});

// Specific rate limiter for login to prevent brute force
const loginRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 login requests per `window`
  message: 'Too many login attempts from this IP, please try again after 15 minutes',
  handler: (req, res, next, options) => {
    logger.warn(`Login rate limit exceeded for IP: ${req.ip}`);
    res.status(options.statusCode).json({ error: options.message });
  }
});

module.exports = {
  globalLimiter,
  loginRateLimiter
};
