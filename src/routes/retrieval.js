const express = require('express');
const router = express.Router();
const authenticate = require('../middleware/auth');
const { requirePermission } = require('../middleware/permission');
const { validate, searchSchema, hybridSearchSchema } = require('../middleware/validator');
const retrievalController = require('../controllers/retrievalController');

router.get(
  '/search',
  authenticate,
  requirePermission('document:read'),
  validate(searchSchema),
  retrievalController.search
);

router.get(
  '/bm25',
  authenticate,
  requirePermission('document:read'),
  validate(searchSchema),
  retrievalController.bm25Search
);

router.get(
  '/hybrid',
  authenticate,
  requirePermission('document:read'),
  validate(hybridSearchSchema),
  retrievalController.hybridSearch
);

module.exports = router;
