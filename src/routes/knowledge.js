const express = require('express');
const router = express.Router();
const authenticate = require('../middleware/auth');
const { requirePermission } = require('../middleware/permission');
const { validate, createKnowledgeBaseSchema, updateKnowledgeBaseSchema, queryKnowledgeBaseSchema } = require('../middleware/validator');
const knowledgeController = require('../controllers/knowledgeController');

router.post('/', authenticate, requirePermission('knowledge:create'), validate(createKnowledgeBaseSchema), knowledgeController.createKnowledgeBase);
router.get('/', authenticate, requirePermission('knowledge:read'), validate(queryKnowledgeBaseSchema), knowledgeController.getKnowledgeBaseList);
router.get('/:id', authenticate, requirePermission('knowledge:read'), knowledgeController.getKnowledgeBaseById);
router.put('/:id', authenticate, requirePermission('knowledge:update'), validate(updateKnowledgeBaseSchema), knowledgeController.updateKnowledgeBase);
router.delete('/:id', authenticate, requirePermission('knowledge:delete'), knowledgeController.deleteKnowledgeBase);

module.exports = router;