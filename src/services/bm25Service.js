const MiniSearch = require('minisearch');
const nodejieba = require('nodejieba');
const logger = require('../utils/logger');

const tokenize = (text) => {
  if (!text || typeof text !== 'string') return [];
  return nodejieba.cut(text, true);
};

const BM25_FIELDS = [
  { field: 'content', boost: 1.0 },
  { field: 'title', boost: 2.5 },
  { field: 'hierarchyPath', boost: 3.0 },
  { field: 'parentContext', boost: 1.8 }
];

const bm25Service = {
  miniSearch: null,
  documentChunks: [],

  initialize() {
    logger.info('Initializing BM25 search service with minisearch and jieba tokenizer');
    logger.info(`BM25 field boosts: content=1.0, title=2.5, hierarchyPath=3.0, parentContext=1.8`);

    this.miniSearch = new MiniSearch({
      fields: BM25_FIELDS.map(f => f.field),
      storeFields: ['id', 'documentId', 'documentName', 'chunkIndex', 'content', 'title', 'start', 'end', 'chunkType', 'parentId', 'parentContent', 'hierarchyPath', 'parentContext'],
      tokenize: tokenize
    });

    this.documentChunks = [];
    logger.info('BM25 search service initialized successfully');
  },

  addChunks(chunks) {
    logger.info(`Adding ${chunks.length} chunks to BM25 index (with hierarchy field weighting)`);

    if (!this.miniSearch) {
      this.initialize();
    }

    const documents = chunks.map((chunk, index) => ({
      id: chunk.id || `${chunk.documentId}_${index}`,
      documentId: chunk.documentId,
      documentName: chunk.documentName || '',
      chunkIndex: chunk.chunkIndex ?? index,
      content: chunk.content,
      title: chunk.title || '',
      start: chunk.start || 0,
      end: chunk.end || 0,
      chunkType: chunk.chunkType || 'child',
      parentId: chunk.parentId || '',
      parentContent: chunk.parentContent || '',
      hierarchyPath: chunk.hierarchyPath || '',
      parentContext: chunk.parentContext || ''
    }));

    try {
      this.miniSearch.addAll(documents);
      this.documentChunks.push(...documents);
      logger.info(`Successfully added ${documents.length} chunks to BM25 index, total: ${this.documentChunks.length}`);
      return { success: true, count: documents.length };
    } catch (error) {
      logger.error('Failed to add chunks to BM25 index', error);
      throw new Error(`BM25 索引添加失败: ${error.message}`);
    }
  },

  search(query, options = {}) {
    const { limit = 10, knowledgeBaseId } = options;
    logger.info(`BM25 searching for: "${query}", limit: ${limit}, knowledgeBaseId: ${knowledgeBaseId || 'all'}`);

    if (!this.miniSearch) {
      logger.warn('BM25 index not initialized');
      return [];
    }

    try {
      const boostConfig = {};
      BM25_FIELDS.forEach(f => { boostConfig[f.field] = f.boost; });

      let results = this.miniSearch.search(query, {
        fuzzy: 0.2,
        boost: boostConfig
      });

      if (knowledgeBaseId) {
        results = results.filter(result => result.documentId === knowledgeBaseId);
      }

      results = results.slice(0, limit);

      logger.info(`BM25 search found ${results.length} results`);
      return results.map(result => ({
        id: result.id,
        documentId: result.documentId,
        documentName: result.documentName || '',
        chunkIndex: result.chunkIndex,
        content: result.content,
        title: result.title,
        start: result.start,
        end: result.end,
        hierarchyPath: result.hierarchyPath || '',
        parentContext: result.parentContext || '',
        score: result.score
      }));
    } catch (error) {
      logger.error('BM25 search failed', error);
      throw new Error(`BM25 检索失败: ${error.message}`);
    }
  },

  clear() {
    logger.info('Clearing BM25 index');
    this.miniSearch = null;
    this.documentChunks = [];
    logger.info('BM25 index cleared');
  },

  getStats() {
    return {
      totalChunks: this.documentChunks.length,
      isInitialized: this.miniSearch !== null
    };
  },

  async rebuildFromVectorStore(vectorStoreService) {
    logger.info('Rebuilding BM25 index from LanceDB');

    this.initialize();

    try {
      const allChunks = await vectorStoreService.getAllChunks();

      if (allChunks.length === 0) {
        logger.info('No chunks found in LanceDB, BM25 index is empty');
        return { success: true, count: 0 };
      }

      const chunks = allChunks.map(chunk => ({
        id: chunk.id,
        documentId: chunk.documentId,
        documentName: chunk.documentName || '',
        chunkIndex: chunk.chunkIndex,
        content: chunk.content,
        title: chunk.title || '',
        start: chunk.start || 0,
        end: chunk.end || 0,
        hierarchyPath: chunk.hierarchyPath || '',
        parentContext: chunk.parentContext || ''
      }));

      this.addChunks(chunks);

      logger.info(`Successfully rebuilt BM25 index with ${chunks.length} chunks`);
      return { success: true, count: chunks.length };
    } catch (error) {
      logger.error('Failed to rebuild BM25 index from LanceDB', error);
      throw new Error(`BM25 索引重建失败: ${error.message}`);
    }
  },

  deleteByDocumentId(documentId) {
    logger.info(`Deleting chunks from BM25 index for document: ${documentId}`);

    if (!this.miniSearch) {
      logger.warn('BM25 index not initialized');
      return { success: true, count: 0 };
    }

    try {
      const chunksToDelete = this.documentChunks.filter(chunk => chunk.documentId === documentId);

      chunksToDelete.forEach(chunk => {
        this.miniSearch.discard(chunk.id);
      });

      this.documentChunks = this.documentChunks.filter(chunk => chunk.documentId !== documentId);

      logger.info(`Deleted ${chunksToDelete.length} chunks from BM25 index, remaining: ${this.documentChunks.length}`);
      return { success: true, count: chunksToDelete.length };
    } catch (error) {
      logger.error('Failed to delete chunks from BM25 index', error);
      throw new Error(`BM25 索引删除失败: ${error.message}`);
    }
  }
};

module.exports = bm25Service;
