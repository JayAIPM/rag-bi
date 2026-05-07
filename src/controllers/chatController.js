const chatService = require('../services/chatService');

const chatController = {
  async ask(req, res) {
    const { query, knowledgeBaseId } = req.body;

    const result = await chatService.ask(query, { knowledgeBaseId });

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

  async askStream(req, res) {
    const { query, knowledgeBaseId } = req.body;

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');

    res.flushHeaders();

    const sendChunk = (data) => {
      res.write(data);
      res.flush();
    };

    const sendEnd = () => {
      res.end();
    };

    try {
      await chatService.askStream(query, { knowledgeBaseId, onChunk: sendChunk, onEnd: sendEnd });
    } catch (error) {
      res.write(`data: ${JSON.stringify({ type: 'error', message: error.message })}\n\n`);
      res.end();
    }
  },
};

module.exports = chatController;
