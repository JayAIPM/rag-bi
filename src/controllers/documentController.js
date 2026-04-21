// 文档控制器
const multer = require('multer');
const path = require('path');
const Document = require('../models/document');
const KnowledgeBase = require('../models/knowledgeBase');
const config = require('../../config/config');

// 配置文件上传
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, config.upload.path);
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + '-' + file.originalname);
  }
});

const upload = multer({ storage: storage, limits: { fileSize: config.upload.maxSize } });

// 上传文档
async function uploadDocument(req, res) {
  try {
    const { knowledgeBaseId } = req.body;

    // 验证知识库是否存在
    const knowledgeBase = await KnowledgeBase.findById(knowledgeBaseId);
    if (!knowledgeBase) {
      return res.status(404).json({ message: 'Knowledge base not found' });
    }

    // 检查权限
    if (knowledgeBase.owner !== req.user.id && req.user.role !== 'admin' && req.user.role !== 'knowledgeBaseAdmin') {
      return res.status(403).json({ message: 'Permission denied' });
    }

    // 处理文件上传
    upload.single('document')(req, res, async function (err) {
      if (err) {
        return res.status(400).json({ message: 'File upload failed', error: err.message });
      }

      if (!req.file) {
        return res.status(400).json({ message: 'No file uploaded' });
      }

      // 创建文档记录
      const docData = {
        name: req.file.originalname,
        type: req.file.mimetype,
        size: req.file.size,
        path: req.file.path,
        knowledgeBaseId,
        version: 1,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const id = await Document.create(docData);

      // TODO: 触发文档向量化入库
      // 这里需要集成 LlamaIndex.TS 来处理文档解析、分块和向量化

      res.status(201).json({ id, ...docData });
    });
  } catch (error) {
    res.status(500).json({ message: 'Internal server error' });
  }
}

// 删除文档
async function deleteDocument(req, res) {
  try {
    const { id } = req.params;

    // 查找文档
    const document = await Document.findById(id);
    if (!document) {
      return res.status(404).json({ message: 'Document not found' });
    }

    // 验证知识库是否存在
    const knowledgeBase = await KnowledgeBase.findById(document.knowledgeBaseId);
    if (!knowledgeBase) {
      return res.status(404).json({ message: 'Knowledge base not found' });
    }

    // 检查权限
    if (knowledgeBase.owner !== req.user.id && req.user.role !== 'admin' && req.user.role !== 'knowledgeBaseAdmin') {
      return res.status(403).json({ message: 'Permission denied' });
    }

    // 删除文档
    await Document.delete(id);

    // TODO: 删除对应的向量数据
    // 这里需要从 LanceDB 中删除对应的向量数据

    res.json({ message: 'Document deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Internal server error' });
  }
}

// 获取知识库的文档列表
async function getDocuments(req, res) {
  try {
    const { knowledgeBaseId } = req.params;

    // 验证知识库是否存在
    const knowledgeBase = await KnowledgeBase.findById(knowledgeBaseId);
    if (!knowledgeBase) {
      return res.status(404).json({ message: 'Knowledge base not found' });
    }

    // 检查权限
    if (knowledgeBase.owner !== req.user.id && req.user.role !== 'admin' && req.user.role !== 'knowledgeBaseAdmin') {
      return res.status(403).json({ message: 'Permission denied' });
    }

    const documents = await Document.findByKnowledgeBase(knowledgeBaseId);
    res.json({ documents });
  } catch (error) {
    res.status(500).json({ message: 'Internal server error' });
  }
}

module.exports = {
  uploadDocument,
  deleteDocument,
  getDocuments
};
