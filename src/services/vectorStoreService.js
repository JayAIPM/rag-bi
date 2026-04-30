const lancedb = require('@lancedb/lancedb');
const path = require('path');
const logger = require('../utils/logger');

const config = {
  dbPath: process.env.LANCEDB_PATH || path.join(__dirname, '../../lancedb'),
  tableName: 'document_chunks'
};

const vectorStoreService = {
  db: null,
  table: null,

  async initialize() {
    logger.info(`Initializing LanceDB at: ${config.dbPath}`);
    
    try {
      this.db = await lancedb.connect(config.dbPath);
      logger.info('LanceDB connected successfully');
    } catch (error) {
      logger.error('Failed to connect to LanceDB', error);
      throw new Error(`向量数据库连接失败: ${error.message}`);
    }
  },

  async getOrCreateTable() {
    if (!this.db) {
      await this.initialize();
    }

    try {
      const tables = await this.db.tableNames();
      
      if (tables.includes(config.tableName)) {
        this.table = await this.db.openTable(config.tableName);
        logger.info(`Opened existing table: ${config.tableName}`);
      } else {
        // LanceDB requires at least one record to create a table
        // We'll create it lazily when first insert happens
        logger.info(`Table ${config.tableName} will be created on first insert`);
        this.table = null;
      }
      
      return this.table;
    } catch (error) {
      logger.error('Failed to get/create table', error);
      throw new Error(`向量表操作失败: ${error.message}`);
    }
  },

  async storeChunks(chunksWithEmbeddings) {
    logger.info(`Storing ${chunksWithEmbeddings.length} chunks to LanceDB`);
    
    if (!this.db) {
      await this.initialize();
    }

    try {
      // 确保所有字段都有正确类型的值，避免类型推断问题
      const records = chunksWithEmbeddings.map((chunk, index) => ({
        id: `${chunk.documentId}_${index}`,
        documentId: String(chunk.documentId),
        chunkIndex: Number(chunk.index),
        content: String(chunk.content),
        embedding: chunk.embedding.map(v => Number(v)),
        start: Number(chunk.start),
        end: Number(chunk.end),
        title: String(chunk.title || ''),
        level: Number(chunk.level || 0)
      }));

      const tables = await this.db.tableNames();
      
      if (!tables.includes(config.tableName)) {
        // 创建表 - 先确保第一条记录没有空字段来帮助类型推断
        this.table = await this.db.createTable(config.tableName, records);
        logger.info(`Created table ${config.tableName} with ${records.length} records`);
      } else {
        // 添加到现有表
        this.table = await this.db.openTable(config.tableName);
        await this.table.add(records);
        logger.info(`Added ${records.length} records to table ${config.tableName}`);
      }

      return {
        success: true,
        count: records.length
      };
    } catch (error) {
      logger.error('Failed to store chunks', error);
      throw new Error(`向量存储失败: ${error.message}`);
    }
  },

  async deleteByDocumentId(documentId) {
    logger.info(`Deleting chunks for document: ${documentId}`);
    
    if (!this.db) {
      await this.initialize();
    }

    try {
      const tables = await this.db.tableNames();
      
      if (!tables.includes(config.tableName)) {
        logger.info(`Table ${config.tableName} does not exist, nothing to delete`);
        return { success: true, count: 0 };
      }

      this.table = await this.db.openTable(config.tableName);
      await this.table.delete(`documentId = '${documentId}'`);
      
      logger.info(`Deleted chunks for document: ${documentId}`);
      return { success: true };
    } catch (error) {
      logger.error('Failed to delete chunks', error);
      throw new Error(`向量删除失败: ${error.message}`);
    }
  },

  async search(queryEmbedding, options = {}) {
    const { knowledgeBaseId, limit = 10 } = options;
    logger.info(`Searching for top ${limit} similar chunks, knowledgeBaseId: ${knowledgeBaseId || 'all'}`);
    
    if (!this.db) {
      await this.initialize();
    }

    try {
      const tables = await this.db.tableNames();
      
      if (!tables.includes(config.tableName)) {
        logger.warn(`Table ${config.tableName} does not exist`);
        return [];
      }

      this.table = await this.db.openTable(config.tableName);
      
      let query = this.table.search(queryEmbedding).limit(limit);
      
      if (knowledgeBaseId) {
        query = query.where(`documentId LIKE '${knowledgeBaseId}%'`);
      }
      
      const results = await query.toArray();
      
      logger.info(`Found ${results.length} similar chunks`);
      return results;
    } catch (error) {
      logger.error('Failed to search chunks', error);
      throw new Error(`向量检索失败: ${error.message}`);
    }
  },

  async getAllChunks(options = {}) {
    const { knowledgeBaseId, documentId } = options;
    logger.info(`Getting all chunks from LanceDB`);
    
    if (!this.db) {
      await this.initialize();
    }

    try {
      const tables = await this.db.tableNames();
      
      if (!tables.includes(config.tableName)) {
        logger.warn(`Table ${config.tableName} does not exist`);
        return [];
      }

      this.table = await this.db.openTable(config.tableName);
      
      let results = await this.table.query().toArray();
      
      // 如果指定了 documentId，过滤结果
      if (documentId) {
        results = results.filter(chunk => chunk.documentId === documentId);
      }
      
      logger.info(`Retrieved ${results.length} chunks from LanceDB`);
      return results;
    } catch (error) {
      logger.error('Failed to get all chunks', error);
      throw new Error(`获取分块失败: ${error.message}`);
    }
  },

  getConfig() {
    return { ...config };
  }
};

module.exports = vectorStoreService;