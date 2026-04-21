// 认证控制器
const jwt = require('jsonwebtoken');
const User = require('../models/user');
const config = require('../../config/config');

// 用户登录
async function login(req, res) {
  try {
    const { username, password } = req.body;

    // 查找用户
    const user = await User.findOne({ username });
    if (!user) {
      return res.status(401).json({ message: 'Invalid username or password' });
    }

    // 简单的密码验证（实际项目中应该使用加密密码）
    if (user.password !== password) {
      return res.status(401).json({ message: 'Invalid username or password' });
    }

    // 生成 JWT token
    const token = jwt.sign(
      { id: user._id, username: user.username, role: user.role },
      config.jwt.secret,
      { expiresIn: config.jwt.expiresIn }
    );

    res.json({ token, user: { id: user._id, username: user.username, role: user.role } });
  } catch (error) {
    res.status(500).json({ message: 'Internal server error' });
  }
}

// 获取当前用户信息
async function getUserInfo(req, res) {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({ user: { id: user._id, username: user.username, role: user.role, permissions: user.permissions } });
  } catch (error) {
    res.status(500).json({ message: 'Internal server error' });
  }
}

module.exports = {
  login,
  getUserInfo
};
