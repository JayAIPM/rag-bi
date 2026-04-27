const Joi = require('joi');

// 验证中间件工厂函数
const validate = (schema) => {
  return (req, res, next) => {
    try {
      // 合并所有参数源
      const data = {
        ...req.body,
        ...req.params,
        ...req.query
      };
      
      // 验证数据
      const { error, value } = schema.validate(data, {
        abortEarly: false, // 收集所有错误
        allowUnknown: true // 允许未知字段
      });
      
      if (error) {
        // 格式化错误信息
        const errorMessage = error.details.map(detail => detail.message).join(', ');
        const validationError = new Error(errorMessage);
        validationError.statusCode = 400;
        return next(validationError);
      }
      
      // 将验证后的数据放回请求对象
      req.validatedData = value;
      next();
      
    } catch (error) {
      console.error('Validation middleware error:', error);
      next(error);
    }
  };
};

// 登录验证规则
const loginSchema = Joi.object({
  username: Joi.string().required().trim().min(3).max(50).messages({
    'string.empty': 'Username is required',
    'string.min': 'Username must be at least 3 characters long',
    'string.max': 'Username must not exceed 50 characters'
  }),
  password: Joi.string().required().min(6).messages({
    'string.empty': 'Password is required',
    'string.min': 'Password must be at least 6 characters long'
  })
});

// 获取用户信息验证规则（通过认证中间件验证）
const userInfoSchema = Joi.object({});

// 登出验证规则（通过认证中间件验证）
const logoutSchema = Joi.object({});

module.exports = {
  validate,
  loginSchema,
  userInfoSchema,
  logoutSchema
};