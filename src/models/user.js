// 用户模型
const mongoose = require('../utils/database').mongoose;

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true
  },
  password: {
    type: String,
    required: true
  },
  role: {
    type: String,
    required: true,
    enum: ['admin', 'knowledgeBaseAdmin', 'user'],
    default: 'user'
  },
  permissions: {
    type: Array,
    default: []
  }
}, {
  timestamps: true
});

const User = mongoose.model('User', userSchema);

module.exports = User;
