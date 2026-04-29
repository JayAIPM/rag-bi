const express = require('express');
const router = express.Router();
const authenticate = require('../middleware/auth');
const { requirePermission } = require('../middleware/permission');
const { validate, uploadDocumentSchema, queryDocumentSchema } = require('../middleware/validator');
const upload = require('../config/multer');
const documentController = require('../controllers/documentController');

// 处理 multer 错误的中间件
const handleMulterError = (error, req, res, next) => {
  if (error) {
    const { AppError } = require('../utils/error');
    const statusCode = error.statusCode || 400;
    throw new AppError(error.message, statusCode, error.code);
  }
  next();
};

router.post(
  '/upload',
  authenticate,
  requirePermission('document:upload'),
  // 先处理文件上传
  (req, res, next) => {
    upload.single('file')(req, res, (err) => {
      if (err) {
        return next(err);
      }
      // 确保文件已上传
      if (!req.file) {
        const { AppError } = require('../utils/error');
        return next(new AppError('请上传文件', 400, 'BAD_REQUEST'));
      }
      next();
    });
  },
  validate(uploadDocumentSchema),
  documentController.uploadDocument
);

router.get(
  '/',
  authenticate,
  requirePermission('document:read'),
  validate(queryDocumentSchema),
  documentController.getDocumentList
);

router.get(
  '/:id',
  authenticate,
  requirePermission('document:read'),
  documentController.getDocumentById
);

router.delete(
  '/:id',
  authenticate,
  requirePermission('document:delete'),
  documentController.deleteDocument
);

module.exports = router;
