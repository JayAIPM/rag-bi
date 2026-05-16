const chatService = require('../services/chatService');
const logger = require('../utils/logger');

/**
 * 对话控制器
 * 处理对话相关的 HTTP 请求和响应
 */
const chatController = {
  /**
   * 发送问题（非流式）
   * @param {Object} req - 请求对象
   * @param {Object} res - 响应对象
   */
  async ask(req, res) {
    const { query, knowledgeBaseId } = req.body;
    const { userId } = req.user;

    const result = await chatService.ask(query, { userId, knowledgeBaseId });

    if (result.message === '暂无相关信息') {
      res.json({
        code: 0,
        msg: 'success',
        data: {
          query: result.query,
          answer: null,
          references: [],
          message: result.message,
        },
      });
      return;
    }

    res.json({
      code: 0,
      msg: 'success',
      data: {
        query: result.query,
        answer: result.answer,
        references: result.references,
        chunks: result.chunks,
      },
    });
  },

  /**
   * 发送问题（流式响应）
   * @param {Object} req - 请求对象
   * @param {Object} res - 响应对象
   */
  async askStream(req, res) {
    const { query, knowledgeBaseId } = req.body;
    const { userId } = req.user;

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');

    res.flushHeaders();

    let saved = false;
    const markSaved = () => { saved = true; };

    const sendChunk = (data) => {
      res.write(`data: ${data}\n\n`);
    };

    const sendEnd = () => {
      res.end();
    };

    try {
      const { promise, cancel } = chatService.askStream(query, { userId, knowledgeBaseId, onChunk: sendChunk, onEnd: sendEnd, markSaved });

      res.socket.on('close', (hadError) => {
        logger.info('Socket closed (hadError:', hadError, ')');
        cancel();
      });

      res.socket.on('end', () => {
        logger.info('Socket ended');
        cancel();
      });

      req.on('close', () => {
        logger.info('Request closed');
        cancel();
      });

      req.on('abort', () => {
        logger.info('Request aborted');
        cancel();
      });

      await promise;
    } catch (error) {
      res.write(`data: ${JSON.stringify({ code: 500, msg: error.message, data: null })}\n\n`);
      res.end();
    }
  },

  /**
   * 获取对话历史列表
   * @param {Object} req - 请求对象
   * @param {Object} res - 响应对象
   */
  async getHistory(req, res) {
    const { page, pageSize } = req.query;
    const { userId } = req.user;

    const result = await chatService.getChatHistory(userId, { page, pageSize });

    res.json({
      code: 0,
      msg: 'success',
      data: result,
    });
  },

  /**
   * 获取单条对话详情
   * @param {Object} req - 请求对象
   * @param {Object} res - 响应对象
   */
  async getById(req, res) {
    const { id } = req.params;
    const { userId } = req.user;

    const chat = await chatService.getChatById(id, userId);

    if (!chat) {
      res.status(404).json({
        code: 404,
        msg: '对话不存在或无权访问',
        data: null,
      });
      return;
    }

    res.json({
      code: 0,
      msg: 'success',
      data: chat,
    });
  },

  /**
   * 删除对话记录
   * @param {Object} req - 请求对象
   * @param {Object} res - 响应对象
   */
  async deleteById(req, res) {
    const { id } = req.params;
    const { userId } = req.user;

    const deleted = await chatService.deleteChat(id, userId);

    if (!deleted) {
      res.status(404).json({
        code: 404,
        msg: '对话不存在或无权访问',
        data: null,
      });
      return;
    }

    res.json({
      code: 0,
      msg: '删除成功',
      data: null,
    });
  },
};

module.exports = chatController;
