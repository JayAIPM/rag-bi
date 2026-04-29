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
  
  let stack = err.stack;
  if (stack) {
    stack = stack.split('\n').filter(line => {
      return !line.includes('node_modules') && !line.includes('internal/');
    }).slice(0, 2).join('\n');
  }
  
  logger.error({
    level: 'error',
    message: err.message,
    statusCode: err.statusCode || 500,
    method: method,
    url: originalUrl,
    ip: ip,
    stack: stack
  });
  
  next(err);
};

module.exports = {
  requestLogger,
  errorLogger
};