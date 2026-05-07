const express = require('express');
const router = express.Router();
const http = require('http');
const { PassThrough } = require('stream');
const authenticate = require('../middleware/auth');
const { requirePermission } = require('../middleware/permission');
const { validate, askSchema } = require('../middleware/validator');
const chatController = require('../controllers/chatController');
const logger = require('../utils/logger');

const OLLAMA_HOST = process.env.OLLAMA_URL || 'http://localhost:11434';
const LLM_MODEL = process.env.LLM_MODEL || 'qwen3.5:4b';

const SYSTEM_PROMPT = `【系统提示词】
你是一个专业的知识库问答助手。请根据提供的参考信息回答用户的问题。

【约束规则】
1. 只根据提供的参考信息回答，不要编造答案
2. 如果参考信息中没有相关信息，请如实告知"暂无相关信息"
3. 回答要简洁、准确，在句中标注引用序号[1][2]等
4. 回答末尾附上对应的原文片段作为引用来源
5. 字数控制在250字以内（复杂总结类问题不超过450字）
6. 如果多个来源有冲突，必须明确标注冲突内容并说明采信依据`;

router.post(
  '/ask',
  authenticate,
  requirePermission('document:read'),
  validate(askSchema),
  chatController.ask
);

router.post(
  '/ask/stream',
  authenticate,
  requirePermission('document:read'),
  validate(askSchema),
  async (req, res) => {
    const { query, knowledgeBaseId } = req.body;

    try {
      const chatService = require('../services/chatService');
      const chunks = await chatService.buildContext(query, { knowledgeBaseId });

      let context = '';
      if (chunks && chunks.length > 0) {
        context = chunks.map((chunk, index) => {
          const content = chunk.content || '';
          const docName = chunk.documentName || '未知文档';
          return `[${index + 1}] ${docName}\n${content}`;
        }).join('\n\n');
      } else {
        context = '无相关参考信息';
      }

      const prompt = `${SYSTEM_PROMPT}

【参考信息】
${context}

【用户问题】
${query}

【回答】`;

      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      res.setHeader('X-Accel-Buffering', 'no');

      res.flushHeaders();

      const url = new URL(OLLAMA_HOST);
      const options = {
        hostname: url.hostname,
        port: url.port || 80,
        path: '/api/chat',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        }
      };

      const ollamaReq = http.request(options, (ollamaRes) => {
        ollamaRes.pipe(res);
      });

      ollamaReq.on('error', (err) => {
        logger.error('Ollama request error:', err);
        res.end();
      });

      ollamaReq.write(JSON.stringify({
        model: LLM_MODEL,
        messages: [{ role: 'user', content: prompt }],
        stream: true,
      }));

      ollamaReq.end();

    } catch (error) {
      logger.error('Stream error:', error);
      res.end();
    }
  }
);

module.exports = router;
