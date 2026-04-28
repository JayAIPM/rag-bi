const logger = require('../utils/logger');

const requestLogger = (req, res, next) => {
  const start = Date.now();
  const { method, originalUrl, ip } = req;
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    const { statusCode } = res;
    
    const logInfo = {
      method,
      url: originalUrl,
      statusCode,
      duration: `${duration}ms`,
      ip,
      userAgent: req.get('User-Agent')
    };
    
    if (statusCode >= 400) {
      logger.warn(`Request ${method} ${originalUrl} ${statusCode} ${duration}ms`, logInfo);
    } else {
      logger.info(`Request ${method} ${originalUrl} ${statusCode} ${duration}ms`, logInfo);
    }
  });
  
  next();
};

const errorLogger = (err, req, res, next) => {
  const { method, originalUrl, ip } = req;
  
  logger.error(`Error ${err.statusCode || 500} on ${method} ${originalUrl}`, {
    error: err.message,
    stack: err.stack,
    ip,
    method,
    url: originalUrl
  });
  
  next(err);
};

module.exports = {
  requestLogger,
  errorLogger
};