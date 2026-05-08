const express = require('express');
const router = express.Router();
const authenticate = require('../middleware/auth');
const { requirePermission } = require('../middleware/permission');
const { validate, askSchema, queryChatHistorySchema, chatIdSchema } = require('../middleware/validator');
const chatService = require('../services/chatService');
const logger = require('../utils/logger');

router.post(
  '/ask',
  authenticate,
  requirePermission('document:read'),
  validate(askSchema),
  async (req, res) => {
    const chatController = require('../controllers/chatController');
    await chatController.ask(req, res);
  }
);

router.post(
  '/ask/stream',
  authenticate,
  requirePermission('document:read'),
  validate(askSchema),
  async (req, res) => {
    const chatController = require('../controllers/chatController');
    await chatController.askStream(req, res);
  }
);

router.get(
  '/history',
  authenticate,
  requirePermission('document:read'),
  validate(queryChatHistorySchema),
  async (req, res) => {
    const chatController = require('../controllers/chatController');
    await chatController.getHistory(req, res);
  }
);

router.get(
  '/:id',
  authenticate,
  requirePermission('document:read'),
  validate(chatIdSchema),
  async (req, res) => {
    const chatController = require('../controllers/chatController');
    await chatController.getById(req, res);
  }
);

router.delete(
  '/:id',
  authenticate,
  requirePermission('document:read'),
  validate(chatIdSchema),
  async (req, res) => {
    const chatController = require('../controllers/chatController');
    await chatController.deleteById(req, res);
  }
);

module.exports = router;
