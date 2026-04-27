const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// 登录服务
exports.login = async (username, password) => {
  // 查找用户
  const user = await User.findOne({ username });
  if (!user) {
    const error = new Error('Invalid username or password');
    error.statusCode = 401;
    throw error;
  }
  
  // 验证密码
  const isPasswordValid = await bcrypt.compare(password, user.password);
  if (!isPasswordValid) {
    const error = new Error('Invalid username or password');
    error.statusCode = 401;
    throw error;
  }
  
  // 生成 JWT 令牌
  const token = jwt.sign(
    { userId: user._id, username: user.username, role: user.role },
    process.env.JWT_SECRET || 'your-secret-key',
    { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
  );
  
  // 更新用户的令牌和最后登录时间
  user.token = token;
  user.lastLogin = new Date();
  await user.save();
  
  // 返回令牌和用户信息
  return {
    token,
    user: {
      id: user._id,
      username: user.username,
      email: user.email,
      role: user.role,
      organization: user.organization,
      lastLogin: user.lastLogin
    }
  };
};

// 获取用户信息服务
exports.getUserInfo = async (userId) => {
  // 查找用户
  const user = await User.findById(userId).populate('role');
  if (!user) {
    const error = new Error('User not found');
    error.statusCode = 404;
    throw error;
  }
  
  // 返回用户信息
  return {
    user: {
      id: user._id,
      username: user.username,
      email: user.email,
      role: user.role,
      organization: user.organization,
      lastLogin: user.lastLogin,
      createdAt: user.createdAt
    }
  };
};

// 登出服务
exports.logout = async (userId) => {
  // 查找用户
  const user = await User.findById(userId);
  if (!user) {
    const error = new Error('User not found');
    error.statusCode = 404;
    throw error;
  }
  
  // 使当前令牌失效
  user.token = null;
  await user.save();
  
  // 返回成功消息
  return { message: 'Logout successful' };
};