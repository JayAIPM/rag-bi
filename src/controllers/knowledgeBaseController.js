// 知识库控制器
const KnowledgeBase = require('../models/knowledgeBase');

// 获取知识库列表
async function getKnowledgeBases(req, res) {
  try {
    const knowledgeBases = await KnowledgeBase.findAll();
    res.json({ knowledgeBases });
  } catch (error) {
    res.status(500).json({ message: 'Internal server error' });
  }
}

// 创建知识库
async function createKnowledgeBase(req, res) {
  try {
    const { name, description } = req.body;
    const owner = req.user.id;

    const kbData = {
      name,
      description,
      owner,
      permissions: []
    };

    const id = await KnowledgeBase.create(kbData);
    res.status(201).json({ id, ...kbData });
  } catch (error) {
    res.status(500).json({ message: 'Internal server error' });
  }
}

// 获取知识库详情
async function getKnowledgeBase(req, res) {
  try {
    const { id } = req.params;
    const knowledgeBase = await KnowledgeBase.findById(id);
    if (!knowledgeBase) {
      return res.status(404).json({ message: 'Knowledge base not found' });
    }
    res.json({ knowledgeBase });
  } catch (error) {
    res.status(500).json({ message: 'Internal server error' });
  }
}

// 更新知识库
async function updateKnowledgeBase(req, res) {
  try {
    const { id } = req.params;
    const { name, description } = req.body;

    const knowledgeBase = await KnowledgeBase.findById(id);
    if (!knowledgeBase) {
      return res.status(404).json({ message: 'Knowledge base not found' });
    }

    // 检查权限
    if (knowledgeBase.owner !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Permission denied' });
    }

    await KnowledgeBase.update(id, { name, description });
    res.json({ message: 'Knowledge base updated successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Internal server error' });
  }
}

// 删除知识库
async function deleteKnowledgeBase(req, res) {
  try {
    const { id } = req.params;

    const knowledgeBase = await KnowledgeBase.findById(id);
    if (!knowledgeBase) {
      return res.status(404).json({ message: 'Knowledge base not found' });
    }

    // 检查权限
    if (knowledgeBase.owner !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Permission denied' });
    }

    await KnowledgeBase.delete(id);
    res.json({ message: 'Knowledge base deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Internal server error' });
  }
}

module.exports = {
  getKnowledgeBases,
  createKnowledgeBase,
  getKnowledgeBase,
  updateKnowledgeBase,
  deleteKnowledgeBase
};
