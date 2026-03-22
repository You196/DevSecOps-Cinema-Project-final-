const logger = require('../utils/logger');

const validateReq = (schema, property = 'body') => {
  return (req, res, next) => {
    const { error } = schema.validate(req[property], { abortEarly: false });
    
    if (error) {
      const errorMessages = error.details.map((detail) => detail.message);
      logger.warn(`Validation Error on ${req.originalUrl}: ${errorMessages.join(', ')}`);
      return res.status(400).json({
        success: false,
        error: 'Validation Error',
        details: errorMessages
      });
    }
    next();
  };
};

module.exports = { validateReq };
