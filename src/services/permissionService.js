const KnowledgeBase = require('../models/KnowledgeBase');
const User = require('../models/User');
const logger = require('../utils/logger');
const { AppError } = require('../utils/error');

/**
 * 权限验证服务
 * 封装知识库访问权限的核心业务逻辑
 */
const permissionService = {
  /**
   * 检查用户是否有权访问指定知识库
   * @param {string} userId - 用户ID
   * @param {string} knowledgeBaseId - 知识库ID
   * @param {Object} options - 配置选项
   * @param {Object} options.userRole - 用户角色信息（包含name和permissions）
   * @returns {Promise<boolean>} 是否有权限
   * @throws {AppError} 无权访问时抛出权限不足错误
   */
  async checkKnowledgeBaseAccess(userId, knowledgeBaseId, options = {}) {
    const { userRole } = options;
    logger.info(`Checking knowledge base access: userId=${userId}, knowledgeBaseId=${knowledgeBaseId}`);

    // 查询知识库
    const knowledgeBase = await KnowledgeBase.findById(knowledgeBaseId);
    if (!knowledgeBase) {
      logger.warn(`Knowledge base not found: ${knowledgeBaseId}`);
      throw new AppError('知识库不存在', 404, 'NOT_FOUND');
    }

    // 管理员拥有所有知识库的访问权限
    if (userRole && userRole.name === 'admin') {
      logger.info(`Admin user ${userId} has access to knowledge base ${knowledgeBaseId}`);
      return true;
    }

    // 检查是否为知识库所有者
    if (knowledgeBase.owner && knowledgeBase.owner.toString() === userId.toString()) {
      logger.info(`User ${userId} is the owner of knowledge base ${knowledgeBaseId}`);
      return true;
    }

    // TODO: 检查 accessControl 列表（未来可扩展）
    // 当前阶段仅支持：管理员可访问所有知识库、所有者可访问自己的知识库
    // accessControl 的细粒度权限控制可作为后续迭代功能

    logger.warn(`User ${userId} has no permission to access knowledge base ${knowledgeBaseId}`);
    throw new AppError('无权限访问此知识库', 403, 'FORBIDDEN');
  },

  /**
   * 检查用户是否有权访问知识库（静默模式）
   * 不抛出错误，返回布尔值
   * @param {string} userId - 用户ID
   * @param {string} knowledgeBaseId - 知识库ID
   * @param {Object} options - 配置选项
   * @param {Object} options.userRole - 用户角色信息
   * @returns {Promise<boolean>} 是否有权限
   */
  async hasAccess(userId, knowledgeBaseId, options = {}) {
    try {
      await this.checkKnowledgeBaseAccess(userId, knowledgeBaseId, options);
      return true;
    } catch (error) {
      if (error.code === 'FORBIDDEN' || error.code === 'NOT_FOUND') {
        return false;
      }
      throw error;
    }
  }
};

module.exports = permissionService;
