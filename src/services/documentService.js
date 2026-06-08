const Document = require('../models/Document');
const KnowledgeBase = require('../models/KnowledgeBase');
const { AppError } = require('../utils/error');
const logger = require('../utils/logger');
const path = require('path');
const mongoose = require('mongoose');
const documentParserService = require('./documentParserService');
const documentSplitterService = require('./documentSplitterService');
const embeddingService = require('./embeddingService');
const vectorStoreService = require('./vectorStoreService');
const bm25Service = require('./bm25Service');

// 文档服务：处理文档的上传、解析、分块等核心业务逻辑
const documentService = {
  // 上传文档到指定知识库
  async uploadDocument(file, knowledgeBaseId, userId) {
    logger.info(`Uploading document: ${file.originalname}, knowledgeBaseId: ${knowledgeBaseId}, userId: ${userId}`);

    const knowledgeBase = await KnowledgeBase.findById(knowledgeBaseId);
    if (!knowledgeBase) {
      logger.warn(`Knowledge base not found: ${knowledgeBaseId}`);
      throw new AppError('知识库不存在', 404, 'NOT_FOUND');
    }

    if (knowledgeBase.owner.toString() !== userId.toString()) {
      logger.warn(`User ${userId} has no permission to upload to knowledge base ${knowledgeBaseId}`);
      throw new AppError('无权限上传到此知识库', 403, 'FORBIDDEN');
    }

    const ext = path.extname(file.originalname).toLowerCase().replace('.', '');
    
    const document = new Document({
      knowledgeBaseId: knowledgeBaseId,
      name: file.originalname,
      type: ext,
      size: file.size,
      path: file.path,
      status: 'pending',
      metadata: {
        originalName: file.originalname,
        mimeType: file.mimetype
      }
    });

    const savedDocument = await document.save();
    
    await KnowledgeBase.findByIdAndUpdate(knowledgeBaseId, {
      $inc: { documentCount: 1 }
    });

    logger.info(`Document uploaded successfully: id=${savedDocument._id}, name=${savedDocument.name}`);

    // 启动异步文档处理流程，不阻塞上传响应
    this.processDocumentAsync(savedDocument._id);

    return savedDocument;
  },

  // 异步文档处理流程：解析、分块、向量化、存储
  async processDocumentAsync(documentId) {
    logger.info(`Starting async document processing: ${documentId}`);
    
    try {
      const document = await Document.findById(documentId);
      
      if (!document) {
        logger.error(`Document not found: ${documentId}`);
        return;
      }
      
      await Document.findByIdAndUpdate(documentId, { status: 'processing' });
      
      // 1. 文档解析：提取文件内容为纯文本
      logger.info(`Step 1: Parsing document ${documentId}`);
      const content = await documentParserService.parseDocument(document.path, document.type);
      
      // 2. 语义分块：使用章节边界检测，保持语义完整性
      logger.info(`Step 2: Splitting document ${documentId}`);
      const chunks = await documentSplitterService.splitWithSectionDetection(content, {
        chunkSize: 800,
        chunkOverlap: 150
      });
      logger.info(`Generated ${chunks.length} chunks for document ${documentId}`);
      
      // 3. 向量化处理：将文本块转换为向量表示
      logger.info(`Step 3: Embedding document ${documentId}`);
      const texts = chunks.map(chunk => chunk.content);
      const embeddings = await embeddingService.embedTexts(texts);
      logger.info(`Generated ${embeddings.length} embeddings for document ${documentId}`);
      
      // 为每个分块添加向量
      const chunksWithEmbeddings = chunks.map((chunk, index) => ({
        ...chunk,
        embedding: embeddings[index],
        documentId: documentId.toString()
      }));
      
      // 4. 向量存储到 LanceDB：将向量存储到向量数据库
      logger.info(`Step 4: Storing vectors to LanceDB for document ${documentId}`);
      await vectorStoreService.storeChunks(chunksWithEmbeddings);
      logger.info(`Successfully stored vectors for document ${documentId}`);
      
      // 5. BM25 索引构建：将文档块添加到 BM25 索引
      logger.info(`Step 5: Building BM25 index for document ${documentId}`);
      const bm25Chunks = chunks.map((chunk, index) => ({
        id: `${documentId}_${index}`,
        documentId: documentId.toString(),
        chunkIndex: index,
        content: chunk.content,
        title: chunk.title || '',
        start: chunk.start || 0,
        end: chunk.end || 0,
        hierarchyPath: chunk.hierarchyPath || '',  // 层级路径
        parentContext: chunk.parentContext || ''    // 父级上下文
      }));
      bm25Service.addChunks(bm25Chunks);
      logger.info(`Successfully built BM25 index for document ${documentId}`);
      
      await Document.findByIdAndUpdate(documentId, { 
        status: 'completed',
        updatedAt: new Date()
      });
      
      logger.info(`Document processing completed: ${documentId}`);
    } catch (error) {
      logger.error(`Document processing failed: ${documentId}`, error);
      await Document.findByIdAndUpdate(documentId, {
        status: 'failed',
        errorMessage: error.message,
        updatedAt: new Date()
      });
    }
  },

  async getDocumentById(id) {
    logger.info(`Getting document by id: ${id}`);
    
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new AppError('无效的文档ID格式', 400, 'BAD_REQUEST');
    }
    
    const document = await Document.findById(id).populate('knowledgeBaseId');
    
    if (!document) {
      logger.warn(`Document not found: ${id}`);
      throw new AppError('文档不存在', 404, 'NOT_FOUND');
    }
    
    logger.debug(`Found document: id=${id}, name=${document.name}`);
    return document;
  },

  async getDocumentList(knowledgeBaseId, userId, roleName, page = 1, pageSize = 10) {
    logger.info(`Getting document list: knowledgeBaseId=${knowledgeBaseId}, userId=${userId}, role=${roleName}`);
    
    const skip = (page - 1) * pageSize;
    
    let query = {};
    
    if (knowledgeBaseId) {
      query.knowledgeBaseId = knowledgeBaseId;
    }
    
    if (roleName !== 'admin') {
      const knowledgeBases = await KnowledgeBase.find({ owner: userId }).select('_id');
      const knowledgeBaseIds = knowledgeBases.map(kb => kb._id);
      query.knowledgeBaseId = { $in: knowledgeBaseIds };
    }

    const [documents, total] = await Promise.all([
      Document.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(pageSize)
        .populate('knowledgeBaseId', 'name'),
      Document.countDocuments(query)
    ]);

    logger.debug(`Found ${documents.length} documents, total=${total}`);
    
    return {
      list: documents,
      total,
      page,
      pageSize
    };
  },

  async deleteDocument(id, roleName) {
    logger.info(`Deleting document: id=${id}, role=${roleName}`);
    
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new AppError('无效的文档ID格式', 400, 'BAD_REQUEST');
    }
    
    if (roleName !== 'admin') {
      logger.warn(`Role ${roleName} has no permission to delete document ${id}`);
      throw new AppError('无权限删除文档', 403, 'FORBIDDEN');
    }

    const document = await Document.findById(id);
    
    if (!document) {
      logger.warn(`Document not found for delete: ${id}`);
      throw new AppError('文档不存在', 404, 'NOT_FOUND');
    }

    const fs = require('fs');
    if (document.path && fs.existsSync(document.path)) {
      fs.unlinkSync(document.path);
      logger.info(`File deleted: ${document.path}`);
    }

    await vectorStoreService.deleteByDocumentId(id.toString());
    logger.info(`Deleted vectors from LanceDB for document: ${id}`);
    
    await bm25Service.deleteByDocumentId(id.toString());
    logger.info(`Deleted chunks from BM25 index for document: ${id}`);

    await Document.findByIdAndDelete(id);

    await KnowledgeBase.findByIdAndUpdate(document.knowledgeBaseId, {
      $inc: { documentCount: -1 }
    });

    logger.info(`Document deleted successfully: id=${id}, name=${document.name}`);
    
    return document;
  }
};

module.exports = documentService;
