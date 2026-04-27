const mongoose = require('mongoose');

// 文档模型 Schema
const documentSchema = new mongoose.Schema({
  // 所属知识库 ID
  knowledgeBaseId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'KnowledgeBase',
    required: true
  },
  // 文档名称
  name: {
    type: String,
    required: true,
    trim: true
  },
  // 文档类型，如 pdf、word、excel 等
  type: {
    type: String,
    required: true,
    trim: true
  },
  // 文档大小（字节）
  size: {
    type: Number,
    default: 0
  },
  // 文档存储路径
  path: {
    type: String,
    trim: true
  },
  // 文档元数据
  metadata: {
    type: Object,
    default: {}
  },
  // 文档生成的向量数量
  vectorCount: {
    type: Number,
    default: 0
  },
  // 创建时间
  createdAt: {
    type: Date,
    default: Date.now
  },
  // 更新时间
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// 自动更新 updatedAt 字段
documentSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

// 创建文档模型
const Document = mongoose.model('Document', documentSchema);

module.exports = Document;
