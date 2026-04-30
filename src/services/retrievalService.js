const logger = require('../utils/logger');
const embeddingService = require('./embeddingService');
const vectorStoreService = require('./vectorStoreService');
const bm25Service = require('./bm25Service');

const retrievalService = {
  async search(query, options = {}) {
    const { knowledgeBaseId, limit = 10 } = options;
    logger.info(`Searching for query: "${query}", knowledgeBaseId: ${knowledgeBaseId || 'all'}, limit: ${limit}`);
    
    logger.info('Step 1: Embedding query text');
    const queryEmbedding = await embeddingService.embedText(query);
    logger.info('Query embedded successfully');
    
    logger.info('Step 2: Searching vector store');
    const results = await vectorStoreService.search(queryEmbedding, {
      knowledgeBaseId,
      limit
    });
    
    logger.info(`Found ${results.length} results`);
    return results;
  },

  async bm25Search(query, options = {}) {
    const { knowledgeBaseId, limit = 10 } = options;
    logger.info(`BM25 searching for query: "${query}", knowledgeBaseId: ${knowledgeBaseId || 'all'}, limit: ${limit}`);
    
    const results = bm25Service.search(query, {
      knowledgeBaseId,
      limit
    });
    
    logger.info(`BM25 search found ${results.length} results`);
    return results;
  },

  getConfig() {
    return {
      embeddingService: embeddingService.getConfig(),
      vectorStoreService: vectorStoreService.getConfig(),
      bm25Service: bm25Service.getStats()
    };
  }
};

module.exports = retrievalService;
