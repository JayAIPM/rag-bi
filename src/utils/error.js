// 自定义错误类
class AppError extends Error {
  constructor(message, statusCode, errorCode = null) {
    super(message);
    
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.errorCode = errorCode;
    this.isOperational = true;
    
    Error.captureStackTrace(this, this.constructor);
  }
}

// 常见错误类型
class BadRequestError extends AppError {
  constructor(message, errorCode = 'BAD_REQUEST') {
    super(message, 400, errorCode);
  }
}

class UnauthorizedError extends AppError {
  constructor(message, errorCode = 'UNAUTHORIZED') {
    super(message, 401, errorCode);
  }
}

class ForbiddenError extends AppError {
  constructor(message, errorCode = 'FORBIDDEN') {
    super(message, 403, errorCode);
  }
}

class NotFoundError extends AppError {
  constructor(message, errorCode = 'NOT_FOUND') {
    super(message, 404, errorCode);
  }
}

class InternalServerError extends AppError {
  constructor(message, errorCode = 'INTERNAL_SERVER_ERROR') {
    super(message, 500, errorCode);
  }
}

// LLM 相关错误类
class LLMTimeoutError extends AppError {
  constructor(message = 'LLM 请求超时', errorCode = 'LLM_TIMEOUT') {
    super(message, 504, errorCode);
  }
}

class LLMConnectionError extends AppError {
  constructor(message = 'LLM 服务连接失败', errorCode = 'LLM_CONNECTION_ERROR') {
    super(message, 503, errorCode);
  }
}

class StreamInterruptedError extends AppError {
  constructor(message = '流式响应中断', errorCode = 'STREAM_INTERRUPTED') {
    super(message, 499, errorCode);
  }
}

class NoRelevantContentError extends AppError {
  constructor(message = '暂无相关信息', errorCode = 'NO_RELEVANT_CONTENT') {
    super(message, 200, errorCode);
  }
}

module.exports = {
  AppError,
  BadRequestError,
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
  InternalServerError,
  LLMTimeoutError,
  LLMConnectionError,
  StreamInterruptedError,
  NoRelevantContentError,
};
