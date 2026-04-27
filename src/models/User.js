const mongoose = require('mongoose');

// 用户模型 Schema
const userSchema = new mongoose.Schema({
  // 用户名，登录时使用
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  // 密码，加密存储
  password: {
    type: String,
    required: true
  },
  // 邮箱地址
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true
  },
  // 关联的角色 ID
  role: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Role',
    required: true
  },
  // 所属组织
  organization: {
    type: String,
    trim: true
  },
  // 最后登录时间
  lastLogin: {
    type: Date
  },
  // 当前有效的 JWT 令牌
  token: {
    type: String
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
userSchema.pre('save', function() {
  this.updatedAt = new Date();
});

// 创建用户模型
const User = mongoose.model('User', userSchema);

module.exports = User;
