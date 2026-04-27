const mongoose = require('mongoose');

// 日志模型 Schema
const logSchema = new mongoose.Schema({
  // 操作用户 ID
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  // 操作类型
  action: {
    type: String,
    required: true,
    trim: true
  },
  // 操作资源
  resource: {
    type: String,
    trim: true
  },
  // 操作详情
  details: {
    type: Object,
    default: {}
  },
  // 操作 IP 地址
  ip: {
    type: String,
    trim: true
  },
  // 创建时间
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// 创建日志模型
const Log = mongoose.model('Log', logSchema);

module.exports = Log;
