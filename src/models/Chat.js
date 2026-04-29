const mongoose = require('mongoose');

// 对话模型 Schema
const chatSchema = new mongoose.Schema({
  // 发起对话的用户 ID
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  // 对话关联的知识库 ID
  knowledgeBaseId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'KnowledgeBase',
    required: true
  },
  // 对话消息列表
  messages: {
    type: [{
      // 消息角色，用户或助手
      role: {
        type: String,
        required: true,
        enum: ['user', 'assistant']
      },
      // 消息内容
      content: {
        type: String,
        required: true
      },
      // 消息时间戳
      timestamp: {
        type: Date,
        default: Date.now
      },
      // 助手回答时引用的文档片段
      references: {
        type: [{
          // 引用的文档 ID
          documentId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Document'
          },
          // 引用的文档内容片段
          content: {
            type: String
          }
        }],
        default: []
      }
    }],
    default: []
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
chatSchema.pre('save', function() {
  this.updatedAt = new Date();
});

// 创建对话模型
const Chat = mongoose.model('Chat', chatSchema);

module.exports = Chat;
