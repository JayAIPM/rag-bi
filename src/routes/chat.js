const express = require('express');
const router = express.Router();
const authenticate = require('../middleware/auth');
const { requirePermission } = require('../middleware/permission');
const { validate, askSchema } = require('../middleware/validator');
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
    const { query, knowledgeBaseId } = req.body;
    const userId = req.user._id;

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');

    res.flushHeaders();

    try {
      await chatService.askStream(query, {
        userId,
        knowledgeBaseId,
        onChunk: (data) => res.write(data),
        onEnd: () => res.end(),
      });
    } catch (error) {
      logger.error('Stream error:', error);
      res.end();
    }
  }
);

module.exports = router;
