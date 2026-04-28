const User = require('../models/User');
const Role = require('../models/Role');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { BadRequestError, UnauthorizedError, NotFoundError } = require('../utils/error');

// 登录服务
exports.login = async (username, password) => {
  // 查找用户
  const user = await User.findOne({ username });
  if (!user) {
    throw new UnauthorizedError('Invalid username or password');
  }
  
  // 验证密码
  const isPasswordValid = await bcrypt.compare(password, user.password);
  if (!isPasswordValid) {
    throw new UnauthorizedError('Invalid username or password');
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
    throw new NotFoundError('User not found');
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
    throw new NotFoundError('User not found');
  }
  
  // 使当前令牌失效
  user.token = null;
  await user.save();
  
  // 返回成功消息
  return { message: 'Logout successful' };
};