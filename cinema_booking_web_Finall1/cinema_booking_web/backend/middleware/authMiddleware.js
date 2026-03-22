const jwt = require('jsonwebtoken');
const logger = require('../utils/logger');
const User = require('../models/User');

const verifyJWT = async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    logger.warn(`Unauthorized access attempt (No token) on ${req.originalUrl} from IP: ${req.ip}`);
    return res.status(401).json({ error: 'Not authorized to access this route' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    req.user = await User.findById(decoded.id).select('-password');

    if (!req.user) {
      return res.status(401).json({ error: 'The user belonging to this token no longer exists.' });
    }

    next();
  } catch (error) {
    logger.warn(`Invalid token attempt on ${req.originalUrl} from IP: ${req.ip}`);
    return res.status(401).json({ error: 'Not authorized to access this route' });
  }
};

const requireRole = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      logger.warn(`Forbidden access attempt by User ${req.user ? req.user._id : 'Unknown'} on ${req.originalUrl}`);
      return res.status(403).json({ error: 'User role does not have enough privileges to access this route' });
    }
    next();
  };
};

module.exports = { verifyJWT, requireRole };