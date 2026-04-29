// 全局错误处理中间件
const errorHandler = (err, req, res, next) => {
  const statusCode = err.statusCode || 500;
  
  let message = err.message || 'Internal Server Error';
  
  if (err instanceof SyntaxError && err.statusCode === 400) {
    message = '请求体不是有效的 JSON 格式';
  } else {
    message = message.replace(/\\["']/g, "'").replace(/["']/g, '');
  }
  
  const errorResponse = {
    code: statusCode,
    msg: message,
    data: null
  };
  
  res.status(statusCode).json(errorResponse);
};

// 404 错误处理中间件
const notFoundHandler = (req, res, next) => {
  const error = new Error(`Route not found: ${req.originalUrl}`);
  error.statusCode = 404;
  next(error);
};

module.exports = {
  errorHandler,
  notFoundHandler
};