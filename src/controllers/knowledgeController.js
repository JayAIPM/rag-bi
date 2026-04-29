const knowledgeService = require('../services/knowledgeService');

/**
 * 知识库控制器
 * 处理知识库相关的 HTTP 请求和响应
 */
const knowledgeController = {
  /**
   * 创建知识库
   * @param {Object} req - 请求对象
   * @param {Object} res - 响应对象
   */
  async createKnowledgeBase(req, res) {
    const { name, description } = req.body;
    const { userId } = req.user;

    const knowledgeBase = await knowledgeService.createKnowledgeBase(name, description, userId);

    res.json({
      code: 0,
      msg: 'success',
      data: knowledgeBase
    });
  },

  /**
   * 获取知识库列表
   * @param {Object} req - 请求对象
   * @param {Object} res - 响应对象
   */
  async getKnowledgeBaseList(req, res) {
    const { page = 1, pageSize = 10 } = req.query;
    const { userId, role } = req.user;

    const result = await knowledgeService.getKnowledgeBaseList(
      userId,
      role?.name || 'user',
      parseInt(page),
      parseInt(pageSize)
    );

    res.json({
      code: 0,
      msg: 'success',
      data: result
    });
  },

  /**
   * 根据 ID 获取知识库详情
   * @param {Object} req - 请求对象
   * @param {Object} res - 响应对象
   */
  async getKnowledgeBaseById(req, res) {
    const { id } = req.params;

    const knowledgeBase = await knowledgeService.getKnowledgeBaseById(id);

    res.json({
      code: 0,
      msg: 'success',
      data: knowledgeBase
    });
  },

  /**
   * 更新知识库信息
   * @param {Object} req - 请求对象
   * @param {Object} res - 响应对象
   */
  async updateKnowledgeBase(req, res) {
    const { id } = req.params;
    const { name, description } = req.body;
    const { userId, role } = req.user;

    const updatedKB = await knowledgeService.updateKnowledgeBase(
      id,
      name,
      description,
      userId,
      role?.name || 'user'
    );

    res.json({
      code: 0,
      msg: 'success',
      data: updatedKB
    });
  },

  /**
   * 删除知识库
   * @param {Object} req - 请求对象
   * @param {Object} res - 响应对象
   */
  async deleteKnowledgeBase(req, res) {
    const { id } = req.params;
    const { role } = req.user;

    await knowledgeService.deleteKnowledgeBase(id, role?.name || 'user');

    res.json({
      code: 0,
      msg: 'success',
      data: null
    });
  }
};

module.exports = knowledgeController;