const qdrantService = require('../services/qdrantService');
const logger = require('../utils/logger');

const qdrantAdminController = {
  async getCollections(req, res) {
    logger.info('[Qdrant Admin] 获取集合列表');

    try {
      const result = await qdrantService.getAllCollections();
      res.json({
        code: 0,
        msg: 'success',
        data: result
      });
    } catch (error) {
      logger.error('[Qdrant Admin] 获取集合列表失败:', error.message);
      res.json({
        code: 500,
        msg: error.message || '获取集合列表失败',
        data: null
      });
    }
  },

  async getCollectionInfo(req, res) {
    const { name } = req.params;
    logger.info(`[Qdrant Admin] 获取集合详情: ${name}`);

    try {
      const result = await qdrantService.getCollectionInfo(name);
      res.json({
        code: 0,
        msg: 'success',
        data: result
      });
    } catch (error) {
      logger.error(`[Qdrant Admin] 获取集合详情失败 ${name}:`, error.message);
      res.json({
        code: 500,
        msg: error.message || '获取集合详情失败',
        data: null
      });
    }
  },

  async scrollPoints(req, res) {
    const { name } = req.params;
    const { limit = 20, offset, withVector = false, knowledgeBaseId, documentId } = req.query;
    logger.info(`[Qdrant Admin] 浏览集合数据: ${name}, limit=${limit}`);

    try {
      const result = await qdrantService.getCollectionPoints(name, {
      limit: parseInt(limit),
      offset,
      withVector: withVector === 'true',
      knowledgeBaseId,
      documentId
    });
    res.json({
      code: 0,
      msg: 'success',
      data: result
    });
    } catch (error) {
      logger.error(`[Qdrant Admin] 浏览集合数据失败 ${name}:`, error.message);
      res.json({
        code: 500,
        msg: error.message || '浏览集合数据失败',
        data: null
      });
    }
  },

  async getStats(req, res) {
    const { name } = req.params;
    logger.info(`[Qdrant Admin] 获取集合统计: ${name}`);

    try {
      const result = await qdrantService.getCollectionStats(name);
      res.json({
        code: 0,
        msg: 'success',
        data: result
      });
    } catch (error) {
      logger.error(`[Qdrant Admin] 获取集合统计失败 ${name}:`, error.message);
      res.json({
        code: 500,
        msg: error.message || '获取集合统计失败',
        data: null
      });
    }
  },

  async deleteCollection(req, res) {
    const { name } = req.params;
    logger.warn(`[Qdrant Admin] 删除集合: ${name}`);

    try {
      const result = await qdrantService.deleteCollection(name);
      res.json({
        code: 0,
        msg: 'success',
        data: result
      });
    } catch (error) {
      logger.error(`[Qdrant Admin] 删除集合失败 ${name}:`, error.message);
      res.json({
        code: 500,
        msg: error.message || '删除集合失败',
        data: null
      });
    }
  },

  async deletePointsByDocumentId(req, res) {
    const { name, documentId } = req.params;
    logger.warn(`[Qdrant Admin] 删除文档数据: collection=${name}, documentId=${documentId}`);

    try {
      const result = await qdrantService.deleteByDocumentId(documentId, name);
      res.json({
        code: 0,
        msg: 'success',
        data: result
      });
    } catch (error) {
      logger.error(`[Qdrant Admin] 删除文档数据失败 ${name}/${documentId}:`, error.message);
      res.json({
        code: 500,
        msg: error.message || '删除文档数据失败',
        data: null
      });
    }
  },
};

module.exports = qdrantAdminController;
