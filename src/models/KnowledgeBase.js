const mongoose = require('mongoose');

// 知识库模型 Schema
const knowledgeBaseSchema = new mongoose.Schema({
  // 知识库名称，唯一标识
  name: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  // 知识库描述
  description: {
    type: String,
    trim: true
  },
  // 知识库所有者 ID
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  // 访问控制列表，定义不同角色对该知识库的权限
  accessControl: {
    type: [{
      role: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Role'
      },
      permissions: {
        type: [String],
        default: []
      }
    }],
    default: []
  },
  // 知识库中的文档数量
  documentCount: {
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
knowledgeBaseSchema.pre('save', function() {
  this.updatedAt = new Date();
});

// 创建知识库模型
const KnowledgeBase = mongoose.model('KnowledgeBase', knowledgeBaseSchema);

module.exports = KnowledgeBase;
