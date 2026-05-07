const retrievalService = require('../services/retrievalService');

const retrievalController = {
  async search(req, res) {
    const { query, knowledgeBaseId, limit } = req.query;

    const results = await retrievalService.search(query, {
      knowledgeBaseId,
      limit: limit ? parseInt(limit) : 10
    });

    res.json({
      code: 0,
      msg: 'success',
      data: {
        query,
        total: results.length,
        results
      }
    });
  },

  async bm25Search(req, res) {
    const { query, knowledgeBaseId, limit } = req.query;

    const results = await retrievalService.bm25Search(query, {
      knowledgeBaseId,
      limit: limit ? parseInt(limit) : 10
    });

    res.json({
      code: 0,
      msg: 'success',
      data: {
        query,
        total: results.length,
        results
      }
    });
  },

  async hybridSearch(req, res) {
    const { query, knowledgeBaseId, limit, k } = req.query;

    const results = await retrievalService.hybridSearch(query, {
      knowledgeBaseId,
      limit: limit ? parseInt(limit) : 10,
      k: k ? parseInt(k) : 60
    });

    res.json({
      code: 0,
      msg: 'success',
      data: {
        query,
        total: results.length,
        results
      }
    });
  }
};

module.exports = retrievalController;
