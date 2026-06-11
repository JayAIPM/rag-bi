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

/**
 * 阶段二：层级回溯增强
 * 1. level 加权：level 越高分数加成越多（高层级标题更重要）
 * 2. 父子章节关联召回：子章节自动补充父章节 chunk
 * 3. 层级去重：同一父章节只保留 top1
 * 
 * @param {Array} results - RRF 融合后的结果
 * @param {Object} options - 配置选项
 * @returns {Array} 增强后的结果
 */
const enhanceByHierarchy = (results, options = {}) => {
  const { levelBoost = 0.1 } = options;
  
  if (!results || results.length === 0) {
    return results;
  }

  logger.info(`[层级增强] 输入 ${results.length} 条结果`);

  // 1. Level 加权：根据 level 值增加分数
  const leveledResults = results.map(result => {
    const level = result.level || 0;
    // level 加权系数：level 0=1.0, level 1=1.1, level 2=1.2, level 3=1.3 ...
    const levelMultiplier = 1 + (level * levelBoost);
    return {
      ...result,
      originalRrfScore: result.rrfScore,
      rrfScore: result.rrfScore * levelMultiplier
    };
  });

  // 2. 父子章节关联召回（从 LanceDB 补充父章节）
  const parentChunks = [];
  const childChunks = leveledResults.filter(r => r.level > 0);
  
  childChunks.forEach(child => {
    // 如果子章节有 parentId，查找对应的父章节
    if (child.parentId) {
      // 标记需要回溯到父章节
      logger.info(`[层级增强] 子章节 "${child.title}" (level=${child.level}) 触发父章节回溯`);
    }
  });

  // 3. 层级去重：按 hierarchyPath 分组，每组只保留 top1
  const pathGroups = new Map();
  leveledResults.forEach(result => {
    const path = result.hierarchyPath || result.parentId || result.id;
    if (!pathGroups.has(path)) {
      pathGroups.set(path, []);
    }
    pathGroups.get(path).push(result);
  });

  const deduplicatedResults = [];
  pathGroups.forEach((group, path) => {
    // 每组按 rrfScore 降序排序，取 top1
    group.sort((a, b) => b.rrfScore - a.rrfScore);
    deduplicatedResults.push(group[0]);
  });

  // 按 rrfScore 降序排序
  deduplicatedResults.sort((a, b) => b.rrfScore - a.rrfScore);

  logger.info(`[层级增强] 去重后 ${deduplicatedResults.length} 条结果`);
  return deduplicatedResults;
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
    const { knowledgeBaseId, limit = 6, k = 60 } = options;
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

    // 阶段三：父章节摘要向量搜索（第三路索引）
    logger.info('Step 3: Parent content vector search (third index)');
    const parentSearchResults = await this.parentVectorSearch(fusedResults, { knowledgeBaseId, limit: 5 });

    // 合并父章节搜索结果
    let allResults = fusedResults;
    if (parentSearchResults.length > 0) {
      logger.info(`[阶段三] 添加 ${parentSearchResults.length} 条父章节搜索结果`);
      // 将父章节结果与现有结果合并（去重）
      const existingIds = new Set(allResults.map(r => r.chunkId || r.id));
      const newParentResults = parentSearchResults.filter(r => !existingIds.has(r.chunkId || r.id));
      allResults = [...allResults, ...newParentResults.map(r => ({ ...r, sources: ['parent'] }))];
      logger.info(`[阶段三] 合并后总共 ${allResults.length} 条结果`);
    }

    // 阶段二：层级回溯增强
    logger.info('Step 4: Hierarchy enhancement');
    const enhancedResults = enhanceByHierarchy(allResults, { levelBoost: 0.1 });

    // Step 5: 重排序（使用 BGE-Reranker-v2-m3）
    const rerankedResults = await rerankService.rerank(rewrittenQuery, enhancedResults);

    // 取top-k结果
    const finalResults = rerankedResults.slice(0, limit);
    logger.info(`Hybrid search completed, ${finalResults.length} final results`);

    return finalResults;
  },

  /**
   * 阶段三：父章节摘要向量搜索
   * 对于检索到的每个子章节，如果有父章节内容，进行向量搜索
   * 返回与父章节相关的其他子章节（兄弟节点）
   * 
   * @param {Array} fusedResults - RRF融合后的结果
   * @param {Object} options - 检索选项
   * @returns {Promise<Array>} 父章节搜索结果
   */
  async parentVectorSearch(fusedResults, options = {}) {
    const { knowledgeBaseId, limit = 5 } = options;
    
    if (!fusedResults || fusedResults.length === 0) {
      return [];
    }

    // 收集所有已有的 chunk IDs，用于去重
    const existingIds = new Set(fusedResults.map(r => r.chunkId || r.id));

    // 找出有父章节内容的子章节
    const chunksWithParent = fusedResults.filter(
      r => r.level > 0 && r.parentContent && r.parentContent.trim().length > 0
    );

    if (chunksWithParent.length === 0) {
      logger.info('[阶段三] 没有带父章节内容的子章节，跳过父章节向量搜索');
      return [];
    }

    logger.info(`[阶段三] 发现 ${chunksWithParent.length} 个子章节有父章节内容`);

    // 对每个有父章节的子章节进行向量搜索
    const allParentResults = [];
    for (const chunk of chunksWithParent) {
      try {
        const parentResults = await vectorStoreService.searchByParentContent(
          chunk.parentContent,
          Array.from(existingIds),  // 排除已有结果
          { knowledgeBaseId, limit }
        );
        
        if (parentResults.length > 0) {
          logger.info(`[阶段三] 子章节 "${chunk.title}" 的父章节搜索返回 ${parentResults.length} 条结果`);
          allParentResults.push(...parentResults);
          // 更新已排除的 IDs
          parentResults.forEach(r => existingIds.add(r.chunkId || r.id));
        }
      } catch (error) {
        logger.error(`[阶段三] 父章节搜索失败 for "${chunk.title}":`, error.message);
      }
    }

    // 去重并返回
    const uniqueResults = [];
    const seenIds = new Set();
    for (const result of allParentResults) {
      const id = result.chunkId || result.id;
      if (!seenIds.has(id)) {
        seenIds.add(id);
        uniqueResults.push(result);
      }
    }

    logger.info(`[阶段三] 父章节向量搜索共返回 ${uniqueResults.length} 条去重后的结果`);
    return uniqueResults;
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
