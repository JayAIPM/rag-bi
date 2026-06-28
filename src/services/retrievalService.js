const logger = require('../utils/logger');
const embeddingService = require('./embeddingService');
const qdrantService = require('./qdrantService');
const queryRewriteService = require('./queryRewriteService');
const rerankService = require('./rerankService');
const llamaindexService = require('./llamaindexService');

const REJECT_ANSWER_CONFIG = {
  minChunks: 2,
  minTopScore: 0.015,
  minAvgScore: 0.008,
  minKeywordMatchRatio: 0.3,
};

const CONFIDENCE_CONFIG = {
  weights: {
    topRrfScore: 0.35,
    avgRrfScore: 0.20,
    keywordMatch: 0.15,
    chunkRatio: 0.15,
    consensusRatio: 0.15,
  },
  rrfScoreRange: { min: 0.010, max: 0.055 },
  thresholds: {
    high: 0.65,
    medium: 0.35,
    low: 0.20,
  },
};

const enhanceByHierarchy = (results, options = {}) => {
  const { levelBoost = 0.1 } = options;

  if (!results || results.length === 0) {
    return results;
  }

  logger.info(`[层级增强] 输入 ${results.length} 条结果`);

  const leveledResults = results.map(result => {
    const level = result.level || 0;
    const levelMultiplier = 1 + (level * levelBoost);
    return {
      ...result,
      originalRrfScore: result.rrfScore,
      rrfScore: result.rrfScore * levelMultiplier
    };
  });

  const pathGroups = new Map();
  leveledResults.forEach(result => {
    const path = result.hierarchyPath || result.parentId || result.id;
    if (!pathGroups.has(path)) {
      pathGroups.set(path, []);
    }
    pathGroups.get(path).push(result);
  });

  const deduplicatedResults = [];
  pathGroups.forEach((group) => {
    group.sort((a, b) => b.rrfScore - a.rrfScore);
    deduplicatedResults.push(group[0]);
  });

  deduplicatedResults.sort((a, b) => b.rrfScore - a.rrfScore);

  logger.info(`[层级增强] 去重后 ${deduplicatedResults.length} 条结果`);
  return deduplicatedResults;
};

const computeConfidence = (chunks, query, options = {}) => {
  const { limit = 6 } = options;
  const cfg = CONFIDENCE_CONFIG;

  const details = {
    chunkCount: 0,
    topScore: 0,
    avgScore: 0,
    normTopScore: 0,
    normAvgScore: 0,
    keywordMatchRatio: 0,
    chunkRatio: 0,
    consensusRatio: 0,
  };

  if (!chunks || chunks.length === 0) {
    return {
      score: 0,
      level: 'insufficient',
      reason: '未检索到任何相关文档片段',
      details,
      shouldReject: true,
    };
  }

  details.chunkCount = chunks.length;
  details.chunkRatio = Math.min(chunks.length / limit, 1.0);

  const scores = chunks.map((c) => c.rrfScore || 0);
  details.topScore = scores[0];
  details.avgScore = scores.reduce((s, v) => s + v, 0) / scores.length;

  const { min, max } = cfg.rrfScoreRange;
  details.normTopScore = Math.max(0, Math.min(1, (details.topScore - min) / (max - min)));
  details.normAvgScore = Math.max(0, Math.min(1, (details.avgScore - min) / (max - min)));

  const queryKeywords = query
    .toLowerCase()
    .replace(/[，。！？、：；""''（）【】\[\],.!?:;"'()]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length >= 2);

  if (queryKeywords.length > 0 && chunks.length > 0) {
    let totalMatches = 0;
    chunks.forEach((chunk) => {
      const content = (chunk.content || '').toLowerCase();
      totalMatches += queryKeywords.filter((kw) => content.includes(kw)).length;
    });
    details.keywordMatchRatio = totalMatches / (queryKeywords.length * chunks.length);
  }

  const consensusCount = chunks.filter(
    (c) => c.sources && c.sources.includes('vector') && c.sources.includes('bm25')
  ).length;
  details.consensusRatio = chunks.length > 0 ? consensusCount / chunks.length : 0;

  const { weights } = cfg;
  const score =
    weights.topRrfScore * details.normTopScore +
    weights.avgRrfScore * details.normAvgScore +
    weights.keywordMatch * details.keywordMatchRatio +
    weights.chunkRatio * details.chunkRatio +
    weights.consensusRatio * details.consensusRatio;

  let level;
  if (score >= cfg.thresholds.high) {
    level = 'high';
  } else if (score >= cfg.thresholds.medium) {
    level = 'medium';
  } else if (score >= cfg.thresholds.low) {
    level = 'low';
  } else {
    level = 'insufficient';
  }

  const shouldReject = level === 'insufficient';

  const reasonMap = {
    high: '置信度良好',
    medium: '置信度一般，仅供参考',
    low: '置信度较低，回答仅供参考',
    insufficient: '检索结果不足以支持可靠回答',
  };

  logger.info(
    `[置信度] score=${score.toFixed(3)} level=${level} ` +
    `normTop=${details.normTopScore.toFixed(2)} normAvg=${details.normAvgScore.toFixed(2)} ` +
    `keyword=${details.keywordMatchRatio.toFixed(2)} consensus=${details.consensusRatio.toFixed(2)} ` +
    `chunkRatio=${details.chunkRatio.toFixed(2)}`
  );

  return {
    score: Math.round(score * 1000) / 1000,
    level,
    reason: reasonMap[level],
    details,
    shouldReject,
  };
};

const evaluateRelevance = (chunks, query) => {
  const result = computeConfidence(chunks, query);
  return {
    shouldReject: result.shouldReject,
    reason: result.reason,
    details: result.details,
  };
};

const rrfFusionThree = (list1, list2, list3 = [], options = {}) => {
  const { k = 60 } = options;
  const scoreMap = new Map();

  const addScores = (results, source) => {
    results.forEach((result, index) => {
      const id = result.chunkId || result.id;
      if (!id) return;
      const rank = index + 1;
      const score = 1 / (k + rank);
      const existing = scoreMap.get(id) || { score: 0, result: null, sources: [] };
      existing.score += score;
      if (!existing.result) {
        existing.result = result;
      }
      existing.sources.push(source);
      scoreMap.set(id, existing);
    });
  };

  addScores(list1, 'qdrant');
  addScores(list2, 'summary');
  if (list3 && list3.length > 0) {
    addScores(list3, 'keyword');
  }

  return Array.from(scoreMap.values())
    .map(item => ({
      ...item.result,
      rrfScore: item.score,
      sources: item.sources
    }))
    .sort((a, b) => b.rrfScore - a.rrfScore);
};

const retrievalService = {
  async search(query, options = {}) {
    const { knowledgeBaseId, limit = 10 } = options;
    logger.info(`Searching for query: "${query}", knowledgeBaseId: ${knowledgeBaseId || 'all'}, limit: ${limit}`);

    logger.info('Step 1: Embedding query text');
    const queryEmbedding = await embeddingService.embedText(query);
    logger.info('Query embedded successfully');

    logger.info('Step 2: Searching Qdrant vector store');
    const results = await qdrantService.search(queryEmbedding, {
      knowledgeBaseId,
      limit
    });

    logger.info(`Found ${results.length} results`);
    return results;
  },

  async bm25Search(query, options = {}) {
    logger.info(`BM25 search is now handled by Qdrant sparse vector, using hybridSearch instead`);
    return this.hybridSearch(query, options);
  },

  async hybridSearch(query, options = {}) {
    const { knowledgeBaseId, limit = 6, k = 60 } = options;
    logger.info(`Hybrid searching for query: "${query}", knowledgeBaseId: ${knowledgeBaseId || 'all'}, limit: ${limit}`);

    const rewrittenQuery = await queryRewriteService.rewriteQuery(query);
    if (rewrittenQuery !== query) {
      logger.info(`Query rewritten: "${query}" -> "${rewrittenQuery}"`);
    }

    logger.debug('Step 1: Embedding query text');
    const queryEmbedding = await embeddingService.embedText(rewrittenQuery);

    logger.debug('Step 2: Qdrant hybrid search (dense + sparse + RRF fusion)');
    const qdrantResults = await qdrantService.hybridSearch(queryEmbedding, rewrittenQuery, {
      knowledgeBaseId,
      limit: 30,
      fusion: 'rrf'
    });
    logger.debug(`Qdrant returned ${qdrantResults.length} results`);

    let summaryResults = [];
    let keywordResults = [];

    if (qdrantResults.length > 0) {
      logger.debug('Step 3: Building LlamaIndex Nodes for multi-strategy retrieval');
      const llamaNodes = llamaindexService.buildNodesFromChunks(
        qdrantResults.map(r => ({ ...r, documentId: r.documentId || knowledgeBaseId })),
        knowledgeBaseId || 'general'
      );

      try {
        logger.debug('Step 3a: Summary-based semantic re-ranking');
        const summaryReRanker = llamaindexService.buildSummaryReRanker(llamaNodes);
        const summaryRaw = llamaindexService.summaryReRank(summaryReRanker, rewrittenQuery, { limit: 30 });
        summaryResults = summaryRaw.map(r => {
          const original = qdrantResults.find(q => (q.chunkId || q.id) === r.id);
          return {
            id: r.id,
            chunkId: r.id,
            content: r.text,
            ...(r.metadata || {}),
            ...(original || {}),
            summaryScore: r.score,
          };
        }).filter(r => r.content);
        logger.debug(`Summary re-ranking returned ${summaryResults.length} results`);
      } catch (e) {
        logger.warn('Summary re-ranking failed, skipping:', e.message);
        summaryResults = qdrantResults.map(r => ({ ...r }));
      }

      try {
        logger.debug('Step 3b: Keyword inverted index retrieval');
        const keywordIndexData = llamaindexService.buildKeywordInvertedIndex(llamaNodes);
        const keywordRaw = llamaindexService.keywordRetrieve(keywordIndexData, rewrittenQuery, { limit: 30 });
        keywordResults = keywordRaw.map(r => {
          const original = qdrantResults.find(q => (q.chunkId || q.id) === r.id);
          return {
            id: r.id,
            chunkId: r.id,
            content: r.text,
            ...(r.metadata || {}),
            ...(original || {}),
            keywordScore: r.score,
          };
        }).filter(r => r.content);
        logger.debug(`Keyword retrieval returned ${keywordResults.length} results`);
      } catch (e) {
        logger.warn('Keyword retrieval failed, skipping:', e.message);
        keywordResults = qdrantResults.map(r => ({ ...r }));
      }
    }

    logger.debug('Step 4: Three-way RRF fusion (Qdrant vector + Summary semantic + Keyword match)');
    const allResults = rrfFusionThree(
      qdrantResults,
      summaryResults,
      keywordResults,
      { k: 60 }
    );
    logger.debug(`Three-way RRF fusion completed, ${allResults.length} unique results`);

    logger.debug('Step 5: Parent content vector search (hierarchy enhancement)');
    const parentSearchResults = await this.parentVectorSearch(allResults, { knowledgeBaseId, limit: 5 });

    if (parentSearchResults.length > 0) {
      logger.debug(`[阶段五] 添加 ${parentSearchResults.length} 条父章节搜索结果`);
      const existingIds = new Set(allResults.map(r => r.chunkId || r.id));
      const newParentResults = parentSearchResults.filter(r => !existingIds.has(r.chunkId || r.id));
      allResults.push(...newParentResults.map(r => ({ ...r, sources: [...(r.sources || []), 'parent'] })));
      logger.debug(`[阶段五] 合并后总共 ${allResults.length} 条结果`);
    }

    logger.debug('Step 6: Hierarchy level boost');
    const enhancedResults = enhanceByHierarchy(allResults, { levelBoost: 0.1 });

    const rerankedResults = await rerankService.rerank(rewrittenQuery, enhancedResults);

    const finalResults = rerankedResults.slice(0, limit);
    logger.info(`Hybrid search completed: qdrant=${qdrantResults.length} candidates, ${finalResults.length} final results`);

    return finalResults;
  },

  async parentVectorSearch(fusedResults, options = {}) {
    const { knowledgeBaseId, limit = 5 } = options;

    if (!fusedResults || fusedResults.length === 0) {
      return [];
    }

    const existingIds = new Set(fusedResults.map(r => r.chunkId || r.id));

    const chunksWithParent = fusedResults.filter(
      r => r.level > 0 && r.parentContent && r.parentContent.trim().length > 0
    );

    if (chunksWithParent.length === 0) {
      logger.info('[阶段三] 没有带父章节内容的子章节，跳过父章节向量搜索');
      return [];
    }

    logger.info(`[阶段三] 发现 ${chunksWithParent.length} 个子章节有父章节内容`);

    const allParentResults = [];
    for (const chunk of chunksWithParent) {
      try {
        const parentResults = await qdrantService.searchByParentContent(
          chunk.parentContent,
          Array.from(existingIds),
          { knowledgeBaseId, limit }
        );

        if (parentResults.length > 0) {
          logger.info(`[阶段三] 子章节 "${chunk.title}" 的父章节搜索返回 ${parentResults.length} 条结果`);
          allParentResults.push(...parentResults);
          parentResults.forEach(r => existingIds.add(r.chunkId || r.id));
        }
      } catch (error) {
        logger.error(`[阶段三] 父章节搜索失败 for "${chunk.title}":`, error.message);
      }
    }

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

  computeConfidence(chunks, query, options) {
    return computeConfidence(chunks, query, options);
  },

  evaluateRelevance(chunks, query) {
    return evaluateRelevance(chunks, query);
  },

  getConfig() {
    return {
      embeddingService: embeddingService.getConfig(),
      qdrantService: qdrantService.getConfig(),
      queryRewriteService: queryRewriteService.getConfig(),
      rerankService: rerankService.getConfig(),
    };
  }
};

module.exports = retrievalService;
