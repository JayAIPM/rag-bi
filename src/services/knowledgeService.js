const KnowledgeBase = require('../models/KnowledgeBase');
const { AppError } = require('../utils/error');
const logger = require('../utils/logger');

/**
 * 知识库服务层
 * 封装知识库的核心业务逻辑，包括创建、查询、更新、删除操作
 */
const knowledgeService = {
  /**
   * 创建知识库
   * 验证名称唯一性，创建新的知识库记录
   * @param {string} name - 知识库名称
   * @param {string} description - 知识库描述
   * @param {ObjectId} ownerId - 创建者用户ID
   * @returns {Object} 创建的知识库对象
   */
  async createKnowledgeBase(name, description, ownerId) {
    logger.info(`Creating knowledge base: name=${name}, owner=${ownerId}`);
    
    if (!name || !name.trim()) {
      logger.warn(`Knowledge base creation failed: name is empty`);
      throw new AppError('知识库名称不能为空', 400, 'VALIDATION_ERROR');
    }

    const existingKB = await KnowledgeBase.findOne({ name: name.trim() });
    if (existingKB) {
      logger.warn(`Knowledge base creation failed: name already exists - ${name}`);
      throw new AppError('知识库名称已存在', 400, 'DUPLICATE_NAME');
    }

    const knowledgeBase = new KnowledgeBase({
      name: name.trim(),
      description: description?.trim() || '',
      owner: ownerId
    });

    const savedKB = await knowledgeBase.save();
    logger.info(`Knowledge base created successfully: id=${savedKB._id}, name=${savedKB.name}`);
    return savedKB;
  },

  /**
   * 根据ID查询知识库
   * 验证知识库是否存在
   * @param {ObjectId} id - 知识库ID
   * @returns {Object} 知识库对象
   */
  async getKnowledgeBaseById(id) {
    logger.info(`Getting knowledge base by id: ${id}`);
    const knowledgeBase = await KnowledgeBase.findById(id);
    if (!knowledgeBase) {
      logger.warn(`Knowledge base not found: ${id}`);
      throw new AppError('知识库不存在', 404, 'NOT_FOUND');
    }
    logger.debug(`Found knowledge base: id=${id}, name=${knowledgeBase.name}`);
    return knowledgeBase;
  },

  /**
   * 获取知识库列表
   * 支持分页，根据用户权限过滤可见的知识库
   * @param {ObjectId} userId - 用户ID
   * @param {string} roleName - 用户角色名称
   * @param {number} page - 页码
   * @param {number} pageSize - 每页数量
   * @returns {Object} 包含列表和分页信息的对象
   */
  async getKnowledgeBaseList(userId, roleName, page = 1, pageSize = 10) {
    logger.info(`Getting knowledge base list: userId=${userId}, role=${roleName}, page=${page}, pageSize=${pageSize}`);
    const skip = (page - 1) * pageSize;
    
    let query = {};
    
    if (roleName !== 'admin') {
      query = {
        owner: userId
      };
    }

    const [knowledgeBases, total] = await Promise.all([
      KnowledgeBase.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(pageSize),
      KnowledgeBase.countDocuments(query)
    ]);

    logger.debug(`Found ${knowledgeBases.length} knowledge bases, total=${total}`);
    return {
      list: knowledgeBases,
      total,
      page,
      pageSize
    };
  },

  /**
   * 更新知识库
   * 验证权限后更新知识库信息
   * @param {ObjectId} id - 知识库ID
   * @param {string} name - 新名称
   * @param {string} description - 新描述
   * @param {ObjectId} userId - 当前用户ID
   * @param {string} roleName - 当前用户角色
   * @returns {Object} 更新后的知识库对象
   */
  async updateKnowledgeBase(id, name, description, userId, roleName) {
    logger.info(`Updating knowledge base: id=${id}, userId=${userId}, role=${roleName}`);
    const knowledgeBase = await KnowledgeBase.findById(id);
    if (!knowledgeBase) {
      logger.warn(`Knowledge base not found for update: ${id}`);
      throw new AppError('知识库不存在', 404, 'NOT_FOUND');
    }

    if (roleName !== 'admin' && knowledgeBase.owner.toString() !== userId.toString()) {
      logger.warn(`User ${userId} has no permission to update knowledge base ${id}`);
      throw new AppError('无权限更新此知识库', 403, 'FORBIDDEN');
    }

    if (name && name.trim()) {
      const existingKB = await KnowledgeBase.findOne({
        name: name.trim(),
        _id: { $ne: id }
      });
      if (existingKB) {
        logger.warn(`Knowledge base name already exists: ${name}`);
        throw new AppError('知识库名称已存在', 400, 'DUPLICATE_NAME');
      }
      knowledgeBase.name = name.trim();
    }

    if (description !== undefined) {
      knowledgeBase.description = description?.trim() || '';
    }

    const updatedKB = await knowledgeBase.save();
    logger.info(`Knowledge base updated successfully: id=${id}, name=${updatedKB.name}`);
    return updatedKB;
  },

  /**
   * 删除知识库
   * 仅管理员有权限删除
   * @param {ObjectId} id - 知识库ID
   * @param {string} roleName - 当前用户角色
   * @returns {Object} 删除的知识库对象
   */
  async deleteKnowledgeBase(id, roleName) {
    logger.info(`Deleting knowledge base: id=${id}, role=${roleName}`);
    if (roleName !== 'admin') {
      logger.warn(`Role ${roleName} has no permission to delete knowledge base ${id}`);
      throw new AppError('无权限删除知识库', 403, 'FORBIDDEN');
    }

    const deletedKB = await KnowledgeBase.findByIdAndDelete(id);
    if (!deletedKB) {
      logger.warn(`Knowledge base not found for delete: ${id}`);
      throw new AppError('知识库不存在', 404, 'NOT_FOUND');
    }

    logger.info(`Knowledge base deleted successfully: id=${id}, name=${deletedKB.name}`);
    return deletedKB;
  }
};

module.exports = knowledgeService;