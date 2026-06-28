const {
  Document,
  TextNode,
  SimpleNodeParser,
  SentenceSplitter,
  SummaryIndex,
  KeywordTableIndex,
  SummaryIndexRetriever,
  storageContextFromDefaults,
  NodeRelationship,
  ObjectType,
  Settings,
} = require('llamaindex');
const nodejieba = require('nodejieba');

const logger = require('../utils/logger');
const QDRANT_CONFIG = require('../config/qdrant');

class MockEmbedding {
  async getTextEmbedding(text) {
    return new Array(QDRANT_CONFIG.vectorSize).fill(0);
  }
  async getTextEmbeddings(texts) {
    return texts.map(() => new Array(QDRANT_CONFIG.vectorSize).fill(0));
  }
}

Settings.embedModel = new MockEmbedding();

const extractKeywords = (text, topN = 20) => {
  if (!text || text.trim().length === 0) return [];
  try {
    const words = nodejieba.extract(text, topN);
    return words.map(w => w.word);
  } catch (e) {
    const tokens = nodejieba.cut(text);
    const filtered = tokens.filter(t => t.length >= 2 && !/^\d+$/.test(t));
    const freq = {};
    filtered.forEach(w => { freq[w] = (freq[w] || 0) + 1; });
    return Object.entries(freq)
      .sort((a, b) => b[1] - a[1])
      .slice(0, topN)
      .map(([w]) => w);
  }
};

const computeTextOverlapScore = (queryText, targetText) => {
  if (!queryText || !targetText) return 0;
  const queryKeywords = extractKeywords(queryText, 30);
  if (queryKeywords.length === 0) return 0;
  
  const targetLower = targetText.toLowerCase();
  let matchCount = 0;
  queryKeywords.forEach(kw => {
    if (targetLower.includes(kw.toLowerCase())) {
      matchCount++;
    }
  });
  
  return matchCount / queryKeywords.length;
};

const llamaindexService = {
  buildDocument(rawText, metadata = {}) {
    logger.debug(`Building LlamaIndex Document, text length: ${rawText?.length || 0}`);

    const doc = new Document({
      text: rawText || '',
      metadata,
    });

    return doc;
  },

  parseNodesFromDocuments(documents, options = {}) {
    const { chunkSize = 800, chunkOverlap = 150, parserType = 'simple' } = options;

    logger.info(`Parsing nodes: ${documents.length} documents, chunkSize=${chunkSize}, chunkOverlap=${chunkOverlap}, parserType=${parserType}`);

    let parser;
    if (parserType === 'sentence_window') {
      parser = new SimpleNodeParser({
        chunkSize,
        chunkOverlap,
        textSplitter: new SentenceSplitter({
          chunkSize,
          chunkOverlap,
        }),
      });
    } else {
      parser = new SimpleNodeParser({
        chunkSize,
        chunkOverlap,
      });
    }

    const nodes = parser.getNodesFromDocuments(documents);
    logger.info(`Parsed ${nodes.length} nodes from ${documents.length} documents`);

    return nodes;
  },

  buildNodesFromChunks(chunks, defaultDocumentId = '') {
    logger.info(`Building ${chunks.length} TextNode objects from chunks`);

    const nodes = chunks.map((chunk, index) => {
      const node = new TextNode({
        text: chunk.content || '',
        metadata: {
          documentId: String(chunk.documentId || defaultDocumentId),
          chunkIndex: Number(chunk.index ?? index),
          title: String(chunk.title || ''),
          level: Number(chunk.level || 0),
          chunkType: String(chunk.chunkType || 'child'),
          parentId: String(chunk.parentId || ''),
          hierarchyPath: String(chunk.hierarchyPath || ''),
          start: Number(chunk.start || 0),
          end: Number(chunk.end || 0),
        },
      });
      return node;
    });

    return nodes;
  },

  buildSummaryIndex(nodes) {
    logger.info(`Building SummaryIndex with ${nodes.length} nodes`);

    try {
      const index = new SummaryIndex({ nodes });
      logger.info('SummaryIndex built successfully');
      return index;
    } catch (error) {
      logger.error('Failed to build SummaryIndex', error);
      throw new Error(`SummaryIndex 构建失败: ${error.message}`);
    }
  },

  buildKeywordIndex(nodes) {
    logger.info(`Building KeywordTableIndex with ${nodes.length} nodes`);

    try {
      const index = new KeywordTableIndex({ nodes });
      logger.info('KeywordTableIndex built successfully');
      return index;
    } catch (error) {
      logger.error('Failed to build KeywordTableIndex', error);
      throw new Error(`KeywordTableIndex 构建失败: ${error.message}`);
    }
  },

  summarySearch(index, query, options = {}) {
    const { limit = 5 } = options;
    logger.info(`SummaryIndex search: query="${query}", limit=${limit}`);

    try {
      const retriever = new SummaryIndexRetriever(index, {
        numWorkers: 4,
      });

      const results = retriever.retrieve({ query });
      const nodes = results.slice(0, limit).map(item => ({
        id: item.node.id_,
        text: item.node.text,
        metadata: item.node.metadata,
        score: item.score,
      }));

      logger.info(`SummaryIndex search returned ${nodes.length} results`);
      return nodes;
    } catch (error) {
      logger.error('SummaryIndex search failed', error);
      return [];
    }
  },

  keywordSearch(index, query, options = {}) {
    const { limit = 5 } = options;
    logger.info(`KeywordTableIndex search: query="${query}", limit=${limit}`);

    try {
      const retriever = index.asRetriever({ similarityTopK: limit });
      const results = retriever.retrieve({ query });

      const nodes = results.slice(0, limit).map(item => ({
        id: item.node.id_,
        text: item.node.text,
        metadata: item.node.metadata,
        score: item.score,
      }));

      logger.info(`KeywordTableIndex search returned ${nodes.length} results`);
      return nodes;
    } catch (error) {
      logger.error('KeywordTableIndex search failed', error);
      return [];
    }
  },

  buildSummaryReRanker(nodes) {
    logger.debug(`Building summary-based re-ranker from ${nodes.length} nodes`);
    
    const enrichedNodes = nodes.map(node => {
      const metadata = node.metadata || {};
      const title = metadata.title || '';
      const hierarchyPath = metadata.hierarchyPath || '';
      const text = node.text || '';
      const firstParagraph = text.split('\n').find(p => p.trim().length > 0) || text.substring(0, 100);
      const summaryText = `${title} ${hierarchyPath} ${firstParagraph}`;
      const keywords = extractKeywords(text, 15);
      
      return {
        id: node.id_,
        node,
        summaryText,
        keywords,
        metadata,
      };
    });

    logger.debug('Summary-based re-ranker built');
    return enrichedNodes;
  },

  summaryReRank(enrichedNodes, query, options = {}) {
    const { limit = 10 } = options;
    logger.debug(`Summary-based re-ranking: query="${query}", ${enrichedNodes.length} candidates`);

    const queryKeywords = extractKeywords(query, 20);
    logger.debug(`Query keywords: ${queryKeywords.join(', ')}`);

    const scored = enrichedNodes.map(item => {
      const title = item.metadata.title || '';
      const hierarchyPath = item.metadata.hierarchyPath || '';
      const text = item.node.text || '';
      
      const titleScore = computeTextOverlapScore(query, title) * 1.5;
      const hierarchyScore = computeTextOverlapScore(query, hierarchyPath) * 1.3;
      const contentScore = computeTextOverlapScore(query, text) * 1.0;
      
      let exactMatchBoost = 0;
      queryKeywords.forEach(kw => {
        if (title.includes(kw)) exactMatchBoost += 0.1;
        if (hierarchyPath.includes(kw)) exactMatchBoost += 0.05;
      });
      
      const totalScore = titleScore + hierarchyScore + contentScore + exactMatchBoost;
      
      return {
        id: item.id,
        text: item.node.text,
        metadata: item.metadata,
        score: totalScore,
      };
    });

    scored.sort((a, b) => b.score - a.score);
    const results = scored.slice(0, limit);
    
    logger.debug(`Summary re-ranking completed: top ${results.length} results, best score=${results[0]?.score?.toFixed?.(3) || 0}`);
    return results;
  },

  buildKeywordInvertedIndex(nodes) {
    logger.debug(`Building keyword inverted index from ${nodes.length} nodes`);
    
    const invertedIndex = new Map();
    const nodeMap = new Map();

    nodes.forEach(node => {
      const nodeId = node.id_;
      const text = node.text || '';
      const metadata = node.metadata || {};
      const title = metadata.title || '';
      const hierarchyPath = metadata.hierarchyPath || '';
      
      const fullText = `${title} ${hierarchyPath} ${text}`;
      const keywords = extractKeywords(fullText, 30);
      
      nodeMap.set(nodeId, {
        id: nodeId,
        text,
        metadata,
        keywordSet: new Set(keywords),
      });
      
      keywords.forEach((kw, idx) => {
        const weight = 1.0 - (idx / keywords.length) * 0.5;
        if (!invertedIndex.has(kw)) {
          invertedIndex.set(kw, []);
        }
        invertedIndex.get(kw).push({ nodeId, weight });
      });
    });

    logger.debug(`Keyword inverted index built: ${invertedIndex.size} keywords, ${nodeMap.size} nodes`);
    return { invertedIndex, nodeMap };
  },

  keywordRetrieve(indexData, query, options = {}) {
    const { limit = 10 } = options;
    logger.debug(`Keyword retrieval: query="${query}", limit=${limit}`);

    const { invertedIndex, nodeMap } = indexData;
    const queryKeywords = extractKeywords(query, 20);
    
    logger.debug(`Query keywords: ${queryKeywords.join(', ')}`);

    const nodeScores = new Map();
    
    queryKeywords.forEach(kw => {
      const postings = invertedIndex.get(kw);
      if (postings) {
        postings.forEach(({ nodeId, weight }) => {
          const current = nodeScores.get(nodeId) || 0;
          nodeScores.set(nodeId, current + weight);
        });
      }
    });

    const results = [];
    nodeScores.forEach((score, nodeId) => {
      const nodeInfo = nodeMap.get(nodeId);
      if (nodeInfo) {
        results.push({
          id: nodeId,
          text: nodeInfo.text,
          metadata: nodeInfo.metadata,
          score,
        });
      }
    });

    results.sort((a, b) => b.score - a.score);
    const topResults = results.slice(0, limit);
    
    logger.debug(`Keyword retrieval completed: ${topResults.length} results, best score=${topResults[0]?.score?.toFixed?.(3) || 0}`);
    return topResults;
  },

  createStorageContext() {
    logger.info('Creating LlamaIndex StorageContext');

    try {
      const context = storageContextFromDefaults();
      logger.info('StorageContext created');
      return context;
    } catch (error) {
      logger.error('Failed to create StorageContext', error);
      return null;
    }
  },

  extractMetadata(node) {
    return {
      id: node.id_,
      text: node.text,
      metadata: node.metadata,
      type: node.type,
    };
  },

  getNodeRelationship(node) {
    return node.relationships || {};
  },

  getAvailableComponents() {
    return {
      Document: typeof Document === 'function',
      TextNode: typeof TextNode === 'function',
      SimpleNodeParser: typeof SimpleNodeParser === 'function',
      SentenceSplitter: typeof SentenceSplitter === 'function',
      SummaryIndex: typeof SummaryIndex === 'function',
      KeywordTableIndex: typeof KeywordTableIndex === 'function',
      SummaryIndexRetriever: typeof SummaryIndexRetriever === 'function',
      ContextChatEngine: typeof require('llamaindex').ContextChatEngine === 'function',
    };
  },
};

module.exports = llamaindexService;
