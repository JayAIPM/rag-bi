const Joi = require('joi');

const validate = (schema) => {
  return (req, res, next) => {
    try {
      const data = {
        ...req.body,
        ...req.params,
        ...req.query
      };

      const { error, value } = schema.validate(data, {
        abortEarly: false,
        allowUnknown: true
      });

      if (error) {
        const errorMessage = error.details.map(detail => detail.message).join(', ');
        const validationError = new Error(errorMessage);
        validationError.statusCode = 400;
        return next(validationError);
      }

      req.validatedData = value;
      next();

    } catch (error) {
      console.error('Validation middleware error:', error);
      next(error);
    }
  };
};

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

const userInfoSchema = Joi.object({});

const logoutSchema = Joi.object({});

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

const updateKnowledgeBaseSchema = Joi.object({
  name: Joi.string().trim().min(1).max(100).messages({
    'string.min': '知识库名称至少需要1个字符',
    'string.max': '知识库名称不能超过100个字符'
  }),
  description: Joi.string().trim().max(500).messages({
    'string.max': '知识库描述不能超过500个字符'
  })
});

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
  }),
  k: Joi.number().integer().min(1).max(200).default(60).messages({
    'number.base': 'RRF k值必须是数字',
    'number.integer': 'RRF k值必须是整数',
    'number.min': 'RRF k值最小为1',
    'number.max': 'RRF k值最大为200'
  })
});

const hybridSearchSchema = Joi.object({
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
  }),
  k: Joi.number().integer().min(1).max(200).default(60).messages({
    'number.base': 'RRF k值必须是数字',
    'number.integer': 'RRF k值必须是整数',
    'number.min': 'RRF k值最小为1',
    'number.max': 'RRF k值最大为200'
  })
});

const askSchema = Joi.object({
  query: Joi.string().required().min(1).max(1000).messages({
    'string.empty': '问题不能为空',
    'string.min': '问题至少需要1个字符',
    'string.max': '问题不能超过1000个字符',
    'any.required': '问题是必填项'
  }),
  knowledgeBaseId: Joi.string().trim().messages({
    'string.base': '知识库ID必须是字符串'
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
  searchSchema,
  hybridSearchSchema,
  askSchema
};
