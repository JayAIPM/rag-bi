const { QdrantClient } = require('@qdrant/js-client-rest');
const { randomUUID } = require('crypto');
const nodejieba = require('nodejieba');
const logger = require('../utils/logger');
const QDRANT_CONFIG = require('../config/qdrant');

const qdrantService = {
  client: null,
  collectionName: QDRANT_CONFIG.collectionName,
  initialized: false,

  async initialize() {
    logger.info(`Initializing Qdrant client at: ${QDRANT_CONFIG.url}`);

    try {
      this.client = new QdrantClient({
        url: QDRANT_CONFIG.url,
        apiKey: QDRANT_CONFIG.apiKey || undefined
      });

      await this.ensureCollection();
      this.initialized = true;
      logger.info('Qdrant client initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize Qdrant client', error);
      throw new Error(`Qdrant 初始化失败: ${error.message}`);
    }
  },

  async ensureCollection() {
    const { collectionName } = this;
    logger.info(`Ensuring collection exists: ${collectionName}`);

    try {
      const collections = await this.client.getCollections();
      const exists = collections.collections.some(c => c.name === collectionName);

      if (exists) {
        const info = await this.client.getCollection(collectionName);
        const hasSparse = info.config?.params?.sparse_vectors?.bm25;
        if (!hasSparse) {
          logger.warn(`Collection ${collectionName} exists but missing sparse_vectors, recreation needed`);
          await this.client.deleteCollection(collectionName);
        } else {
          logger.info(`Collection ${collectionName} already exists with sparse_vectors`);
          return;
        }
      }

      await this.client.createCollection(collectionName, {
        vectors: {
          size: QDRANT_CONFIG.vectorSize,
          distance: QDRANT_CONFIG.distanceMetric,
          on_disk: QDRANT_CONFIG.onDisk ?? false
        },
        sparse_vectors: {
          [QDRANT_CONFIG.sparseVectorName]: {
            index: {
              type: 'Junk',
              on_disk: QDRANT_CONFIG.onDisk ?? false
            }
          }
        },
        on_disk_payload: QDRANT_CONFIG.onDisk ?? false
      });

      logger.info(`Collection ${collectionName} created with dense + sparse vectors, onDisk: ${QDRANT_CONFIG.onDisk ?? false}`);
    } catch (error) {
      logger.error('Failed to ensure collection', error);
      throw error;
    }
  },

  async httpRequest(method, path, body = null) {
    const url = `${QDRANT_CONFIG.url}${path}`;
    const options = {
      method,
      headers: {
        'Content-Type': 'application/json'
      }
    };

    if (QDRANT_CONFIG.apiKey) {
      options.headers['api-key'] = QDRANT_CONFIG.apiKey;
    }

    if (body) {
      options.body = JSON.stringify(body);
    }

    const response = await fetch(url, options);
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.status?.error || `HTTP ${response.status}: ${JSON.stringify(data)}`);
    }

    return data;
  },

  tokenize(text) {
    if (!text || typeof text !== 'string') return [];
    return nodejieba.cut(text, true);
  },

  buildSparseVector(text) {
    if (!text || typeof text !== 'string') {
      return { indices: [], values: [] };
    }

    const tokens = this.tokenize(text).filter(t => t.length >= 1);
    const freqMap = new Map();

    tokens.forEach(token => {
      freqMap.set(token, (freqMap.get(token) || 0) + 1);
    });

    const indices = [];
    const values = [];

    freqMap.forEach((freq, token) => {
      let hash = 0;
      for (let i = 0; i < token.length; i++) {
        hash = ((hash << 5) - hash) + token.charCodeAt(i);
        hash |= 0;
      }
      const idx = Math.abs(hash) % 1000000;
      const val = freq * (1 + Math.log(token.length));
      indices.push(idx);
      values.push(val);
    });

    if (indices.length === 0) {
      return { indices: [], values: [] };
    }

    const maxVal = Math.max(...values);
    const normalizedValues = values.map(v => v / maxVal);

    return { indices, values: normalizedValues };
  },

  async storeChunks(chunksWithEmbeddings) {
    if (!this.initialized) {
      await this.initialize();
    }

    const { collectionName } = this;
    logger.info(`Storing ${chunksWithEmbeddings.length} chunks to Qdrant (dense + sparse vectors)`);

    try {
      const points = chunksWithEmbeddings.map((chunk, index) => {
        const chunkId = `${chunk.documentId}_${index}`;
        const pointId = randomUUID();

        const contentText = `${chunk.title || ''} ${chunk.content || ''} ${chunk.hierarchyPath || ''}`;
        const sparseVector = this.buildSparseVector(contentText);

        return {
          id: pointId,
          vector: chunk.embedding,
          sparse_vectors: {
            [QDRANT_CONFIG.sparseVectorName]: sparseVector
          },
          payload: {
            id: chunkId,
            documentId: String(chunk.documentId),
            knowledgeBaseId: String(chunk.knowledgeBaseId || ''),
            chunkIndex: Number(chunk.index ?? index),
            content: String(chunk.content || ''),
            title: String(chunk.title || ''),
            start: Number(chunk.start || 0),
            end: Number(chunk.end || 0),
            level: Number(chunk.level || 0),
            chunkType: String(chunk.chunkType || 'child'),
            parentId: String(chunk.parentId || ''),
            parentContent: String(chunk.parentContent || ''),
            hierarchyPath: String(chunk.hierarchyPath || ''),
            nodeType: String(chunk.nodeType || 'text'),
            documentName: String(chunk.documentName || '')
          }
        };
      });

      const batchSize = QDRANT_CONFIG.batchSize;
      for (let i = 0; i < points.length; i += batchSize) {
        const batch = points.slice(i, i + batchSize);
        await this.client.upsert(collectionName, {
          wait: true,
          points: batch
        });
        logger.info(`Upserted batch ${Math.floor(i / batchSize) + 1}, ${batch.length} points`);
      }

      logger.info(`Successfully stored ${points.length} chunks to Qdrant`);
      return { success: true, count: points.length };
    } catch (error) {
      logger.error('Failed to store chunks to Qdrant', error);
      throw new Error(`Qdrant 存储失败: ${error.message}`);
    }
  },

  async deleteByDocumentId(documentId) {
    if (!this.initialized) {
      await this.initialize();
    }

    const { collectionName } = this;
    logger.info(`Deleting chunks for document: ${documentId} from Qdrant`);

    try {
      const result = await this.client.delete(collectionName, {
        filter: {
          must: [
            { key: 'documentId', match: { value: documentId } }
          ]
        }
      });

      logger.info(`Deleted chunks for document: ${documentId} from Qdrant`);
      return { success: true, operationId: result.operation_id };
    } catch (error) {
      logger.error('Failed to delete chunks from Qdrant', error);
      throw new Error(`Qdrant 删除失败: ${error.message}`);
    }
  },

  async search(queryEmbedding, options = {}) {
    if (!this.initialized) {
      await this.initialize();
    }

    const { collectionName } = this;
    const { knowledgeBaseId, limit = 10, offset = 0 } = options;
    logger.info(`Qdrant vector search: top ${limit}, knowledgeBaseId: ${knowledgeBaseId || 'all'}`);

    try {
      const searchOptions = {
        vector: queryEmbedding,
        limit,
        offset,
        with_payload: true,
        params: QDRANT_CONFIG.searchParams
      };

      if (knowledgeBaseId) {
        searchOptions.filter = {
          must: [
            { key: 'knowledgeBaseId', match: { value: knowledgeBaseId } }
          ]
        };
      }

      const results = await this.client.search(collectionName, searchOptions);

      return results.map(item => ({
        ...item.payload,
        score: item.score,
        id: item.payload.id || item.id,
        chunkId: item.payload.id || item.id
      }));
    } catch (error) {
      logger.error('Qdrant vector search failed', error);
      throw new Error(`Qdrant 向量检索失败: ${error.message}`);
    }
  },

  async hybridSearch(queryEmbedding, queryText, options = {}) {
    const { knowledgeBaseId, limit = 10 } = options;
    logger.info(`Qdrant native hybrid search via Query API: top ${limit}, knowledgeBaseId: ${knowledgeBaseId || 'all'}`);

    try {
      const sparseQuery = this.buildSparseVector(queryText);

      const queryBody = {
        prefetch: [
          {
            vector: queryEmbedding,
            using: 'cosine',
            limit: limit * 2,
            filter: knowledgeBaseId ? {
              must: [{ key: 'knowledgeBaseId', match: { value: knowledgeBaseId } }]
            } : undefined
          },
          {
            vector: {
              name: QDRANT_CONFIG.sparseVectorName,
              indices: sparseQuery.indices,
              values: sparseQuery.values
            },
            using: QDRANT_CONFIG.sparseVectorName,
            limit: limit * 2,
            filter: knowledgeBaseId ? {
              must: [{ key: 'knowledgeBaseId', match: { value: knowledgeBaseId } }]
            } : undefined
          }
        ].filter(p => p.vector),
        query: { fusion: 'rrf' },
        limit,
        with_payload: true
      };

      const response = await this.httpRequest(
        'POST',
        `/collections/${this.collectionName}/points/query`,
        queryBody
      );

      const results = (response.result?.points || []).map(item => ({
        ...item.payload,
        score: item.score,
        id: item.payload?.id || item.id,
        chunkId: item.payload?.id || item.id
      }));

      logger.info(`Hybrid search via Query API returned ${results.length} results`);
      return results;
    } catch (error) {
      logger.error('Qdrant Query API hybrid search failed, falling back to dense search', error);
      return this.search(queryEmbedding, options);
    }
  },

  async searchByParentContent(parentContent, excludeIds = [], options = {}) {
    if (!parentContent || parentContent.trim().length === 0) {
      return [];
    }

    const { knowledgeBaseId, limit = 5 } = options;
    logger.info(`Qdrant parent content search: parentContent length: ${parentContent.length}`);

    try {
      const embeddingService = require('./embeddingService');
      const parentEmbedding = await embeddingService.embedText(parentContent);

      const results = await this.search(parentEmbedding, {
        knowledgeBaseId,
        limit: limit + excludeIds.length
      });

      const filtered = results.filter(
        chunk => !excludeIds.includes(chunk.id) && !excludeIds.includes(chunk.chunkId)
      );

      logger.info(`Qdrant parent content search found ${filtered.length} related chunks`);
      return filtered.slice(0, limit);
    } catch (error) {
      logger.error('Qdrant parent content search failed', error.message);
      return [];
    }
  },

  async getAllChunks(options = {}) {
    if (!this.initialized) {
      await this.initialize();
    }

    const { collectionName } = this;
    const { knowledgeBaseId, documentId, limit = 10000 } = options;
    logger.info('Getting all chunks from Qdrant');

    try {
      const scrollOptions = {
        limit,
        with_payload: true,
        with_vector: false
      };

      if (knowledgeBaseId || documentId) {
        const must = [];
        if (knowledgeBaseId) {
          must.push({ key: 'knowledgeBaseId', match: { value: knowledgeBaseId } });
        }
        if (documentId) {
          must.push({ key: 'documentId', match: { value: documentId } });
        }
        scrollOptions.filter = { must };
      }

      const { points } = await this.client.scroll(collectionName, scrollOptions);

      const chunks = points.map(point => ({
        ...point.payload,
        id: point.payload.id || point.id,
        chunkId: point.payload.id || point.id
      }));

      logger.info(`Retrieved ${chunks.length} chunks from Qdrant`);
      return chunks;
    } catch (error) {
      logger.error('Failed to get all chunks from Qdrant', error);
      throw new Error(`Qdrant 获取分块失败: ${error.message}`);
    }
  },

  async healthCheck() {
    try {
      const collections = await this.client.getCollections();
      return {
        status: 'healthy',
        collectionCount: collections.collections.length,
        collections: collections.collections.map(c => c.name)
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        error: error.message
      };
    }
  },

  async getAllCollections() {
    if (!this.initialized) {
      await this.initialize();
    }

    try {
      const result = await this.client.getCollections();
      const collections = result.collections || [];

      const detailedCollections = await Promise.all(
        collections.map(async (col) => {
          try {
            const info = await this.client.getCollection(col.name);
            return {
              name: col.name,
              status: info.status,
              pointsCount: info.points_count || 0,
              vectorsCount: info.vectors_count || 0,
              segmentsCount: info.segments_count || 0,
              config: info.config || {}
            };
          } catch (e) {
            return { name: col.name, status: 'unknown', error: e.message };
          }
        })
      );

      return {
        total: detailedCollections.length,
        collections: detailedCollections
      };
    } catch (error) {
      logger.error('Failed to get all collections', error);
      throw new Error(`获取集合列表失败: ${error.message}`);
    }
  },

  async getCollectionInfo(name) {
    if (!this.initialized) {
      await this.initialize();
    }

    try {
      const info = await this.client.getCollection(name);
      return {
        name,
        status: info.status,
        optimizerStatus: info.optimizer_status,
        pointsCount: info.points_count || 0,
        vectorsCount: info.vectors_count || 0,
        indexedVectorsCount: info.indexed_vectors_count || 0,
        segmentsCount: info.segments_count || 0,
        payloadSchema: info.payload_schema || {},
        config: info.config || {}
      };
    } catch (error) {
      logger.error(`Failed to get collection info: ${name}`, error);
      throw new Error(`获取集合详情失败: ${error.message}`);
    }
  },

  async getCollectionPoints(name, options = {}) {
    if (!this.initialized) {
      await this.initialize();
    }

    const { limit = 20, offset, withVector = false, knowledgeBaseId, documentId } = options;

    try {
      const scrollOptions = {
        limit,
        with_payload: true,
        with_vector: withVector
      };

      if (offset) {
        scrollOptions.offset = offset;
      }

      if (knowledgeBaseId || documentId) {
        const must = [];
        if (knowledgeBaseId) {
          must.push({ key: 'knowledgeBaseId', match: { value: knowledgeBaseId } });
        }
        if (documentId) {
          must.push({ key: 'documentId', match: { value: documentId } });
        }
        scrollOptions.filter = { must };
      }

      const { points, next_page_offset } = await this.client.scroll(name, scrollOptions);

      return {
        total: points.length,
        hasMore: !!next_page_offset,
        nextOffset: next_page_offset || null,
        points: points.map(point => ({
          id: point.id,
          payload: point.payload,
          vector: point.vectors || null,
          score: point.score
        }))
      };
    } catch (error) {
      logger.error(`Failed to get collection points: ${name}`, error);
      throw new Error(`获取集合数据失败: ${error.message}`);
    }
  },

  async getCollectionStats(name) {
    if (!this.initialized) {
      await this.initialize();
    }

    try {
      const info = await this.client.getCollection(name);
      const clusterInfo = await this.client.clusterInfo().catch(() => null);

      return {
        name,
        status: info.status,
        pointsCount: info.points_count || 0,
        vectorsCount: info.vectors_count || 0,
        indexedVectorsCount: info.indexed_vectors_count || 0,
        segmentsCount: info.segments_count || 0,
        diskDataSize: info.disk_data_size || 0,
        ramDataSize: info.ram_data_size || 0,
        cluster: clusterInfo || null
      };
    } catch (error) {
      logger.error(`Failed to get collection stats: ${name}`, error);
      throw new Error(`获取集合统计失败: ${error.message}`);
    }
  },

  async deleteCollection(name) {
    if (!this.initialized) {
      await this.initialize();
    }

    logger.warn(`Deleting collection: ${name}`);

    try {
      const result = await this.client.deleteCollection(name);
      return { success: true, result };
    } catch (error) {
      logger.error(`Failed to delete collection: ${name}`, error);
      throw new Error(`删除集合失败: ${error.message}`);
    }
  },

  getConfig() {
    return {
      url: QDRANT_CONFIG.url,
      collectionName: QDRANT_CONFIG.collectionName,
      vectorSize: QDRANT_CONFIG.vectorSize,
      distanceMetric: QDRANT_CONFIG.distanceMetric,
      sparseVectorName: QDRANT_CONFIG.sparseVectorName,
      onDisk: QDRANT_CONFIG.onDisk ?? false
    };
  }
};

module.exports = qdrantService;
