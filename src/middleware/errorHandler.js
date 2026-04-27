// 全局错误处理中间件
const errorHandler = (err, req, res, next) => {
  console.error('Error:', err);
  
  // 定义默认错误响应
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal Server Error';
  
  // 构建错误响应
  const errorResponse = {
    code: statusCode,
    msg: message,
    data: null
  };
  
  // 发送错误响应
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