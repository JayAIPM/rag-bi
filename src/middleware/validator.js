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

// 知识库创建验证规则
const createKnowledgeBaseSchema = Joi.object({
  name: Joi.string().required().trim().min(1).max(100).messages({
    'string.empty': '知识库名称不能为空',
    'string.min': '知识库名称至少需要1个字符',
    'string.max': '知识库名称不能超过100个字符'
  }),
  description: Joi.string().trim().max(500).messages({
    'string.max': '知识库描述不能超过500个字符'
  })
});

// 知识库更新验证规则
const updateKnowledgeBaseSchema = Joi.object({
  name: Joi.string().trim().min(1).max(100).messages({
    'string.min': '知识库名称至少需要1个字符',
    'string.max': '知识库名称不能超过100个字符'
  }),
  description: Joi.string().trim().max(500).messages({
    'string.max': '知识库描述不能超过500个字符'
  })
});

// 知识库查询验证规则
const queryKnowledgeBaseSchema = Joi.object({
  page: Joi.number().integer().min(1).default(1).messages({
    'number.base': '页码必须是数字',
    'number.integer': '页码必须是整数',
    'number.min': '页码最小为1'
  }),
  pageSize: Joi.number().integer().min(1).max(100).default(10).messages({
    'number.base': '每页数量必须是数字',
    'number.integer': '每页数量必须是整数',
    'number.min': '每页数量最小为1',
    'number.max': '每页数量最大为100'
  })
});

const uploadDocumentSchema = Joi.object({
  knowledgeBaseId: Joi.string().required().messages({
    'string.empty': '知识库ID不能为空',
    'any.required': '知识库ID是必填项'
  })
});

const queryDocumentSchema = Joi.object({
  page: Joi.number().integer().min(1).default(1).messages({
    'number.base': '页码必须是数字',
    'number.integer': '页码必须是整数',
    'number.min': '页码最小为1'
  }),
  pageSize: Joi.number().integer().min(1).max(100).default(10).messages({
    'number.base': '每页数量必须是数字',
    'number.integer': '每页数量必须是整数',
    'number.min': '每页数量最小为1',
    'number.max': '每页数量最大为100'
  })
});

const searchSchema = Joi.object({
  query: Joi.string().required().min(1).max(1000).messages({
    'string.empty': '检索查询不能为空',
    'string.min': '检索查询至少需要1个字符',
    'string.max': '检索查询不能超过1000个字符',
    'any.required': '检索查询是必填项'
  }),
  knowledgeBaseId: Joi.string().trim().messages({
    'string.base': '知识库ID必须是字符串'
  }),
  limit: Joi.number().integer().min(1).max(100).default(10).messages({
    'number.base': '返回数量必须是数字',
    'number.integer': '返回数量必须是整数',
    'number.min': '返回数量最小为1',
    'number.max': '返回数量最大为100'
  })
});

module.exports = {
  validate,
  loginSchema,
  userInfoSchema,
  logoutSchema,
  createKnowledgeBaseSchema,
  updateKnowledgeBaseSchema,
  queryKnowledgeBaseSchema,
  uploadDocumentSchema,
  queryDocumentSchema,
  searchSchema
};