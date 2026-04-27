const mongoose = require('mongoose');

// 角色模型 Schema
const roleSchema = new mongoose.Schema({
  // 角色名称，唯一标识
  name: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  // 权限列表
  permissions: {
    type: [String],
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
roleSchema.pre('save', function() {
  this.updatedAt = new Date();
});

// 创建角色模型
const Role = mongoose.model('Role', roleSchema);

module.exports = Role;
