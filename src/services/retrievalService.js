const logger = require('../utils/logger');
const embeddingService = require('./embeddingService');
const vectorStoreService = require('./vectorStoreService');
const bm25Service = require('./bm25Service');
const queryRewriteService = require('./queryRewriteService');
const rerankService = require('./rerankService');

const rrfFusion = (vectorResults, bm25Results, options = {}) => {
  const { k = 60 } = options;
  logger.info(`Performing RRF fusion with k=${k}, vectorResults=${vectorResults.length}, bm25Results=${bm25Results.length}`);

  const scoreMap = new Map();

  // 处理向量检索结果
  vectorResults.forEach((result, index) => {
    const chunkId = result.chunkId || result.id;
    if (!chunkId) return;
    
    const rank = index + 1;
    const score = 1 / (k + rank);
    const existing = scoreMap.get(chunkId) || { score: 0, result: null };
    existing.score += score;
    existing.result = result;
    existing.sources = existing.sources || [];
    existing.sources.push('vector');
    scoreMap.set(chunkId, existing);
  });

  // 处理BM25检索结果
  bm25Results.forEach((result, index) => {
    const chunkId = result.chunkId || result.id;
    if (!chunkId) return;
    
    const rank = index + 1;
    const score = 1 / (k + rank);
    const existing = scoreMap.get(chunkId) || { score: 0, result: null };
    existing.score += score;
    if (!existing.result) {
      existing.result = result;
    }
    existing.sources = existing.sources || [];
    existing.sources.push('bm25');
    scoreMap.set(chunkId, existing);
  });

  // 转换为数组并排序
  const fusedResults = Array.from(scoreMap.values())
    .map(item => ({
      ...item.result,
      rrfScore: item.score,
      sources: item.sources
    }))
    .sort((a, b) => b.rrfScore - a.rrfScore);

  logger.info(`RRF fusion completed, ${fusedResults.length} unique results`);
  return fusedResults;
};

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

  async hybridSearch(query, options = {}) {
    const { knowledgeBaseId, limit = 3, k = 60 } = options;
    logger.info(`Hybrid searching for query: "${query}", knowledgeBaseId: ${knowledgeBaseId || 'all'}, limit: ${limit}, k: ${k}`);

    // Step 0: 智能查询重写（使用 deepseek-r1:8b）
    const rewrittenQuery = await queryRewriteService.rewriteQuery(query);
    if (rewrittenQuery !== query) {
      logger.info(`Query rewritten: "${query}" -> "${rewrittenQuery}"`);
    }

    logger.info('Step 1: Executing parallel searches');
    const [vectorResults, bm25Results] = await Promise.all([
      this.search(rewrittenQuery, { knowledgeBaseId, limit: 10 }),
      this.bm25Search(rewrittenQuery, { knowledgeBaseId, limit: 10 })
    ]);

    // RRF融合
    logger.info('Step 2: Performing RRF fusion');
    const fusedResults = rrfFusion(vectorResults, bm25Results, { k });

    // Step 3: 重排序（使用 BGE-Reranker-v2-m3）
    const rerankedResults = await rerankService.rerank(rewrittenQuery, fusedResults);

    // 取top-k结果
    const finalResults = rerankedResults.slice(0, limit);
    logger.info(`Hybrid search completed, ${finalResults.length} final results`);

    return finalResults;
  },

  getConfig() {
    return {
      embeddingService: embeddingService.getConfig(),
      vectorStoreService: vectorStoreService.getConfig(),
      bm25Service: bm25Service.getStats(),
      queryRewriteService: queryRewriteService.getConfig(),
      rerankService: rerankService.getConfig(),
    };
  }
};

module.exports = retrievalService;
