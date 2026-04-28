const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Role = require('../models/Role');
const { UnauthorizedError } = require('../utils/error');

// JWT 认证中间件
const authenticate = async (req, res, next) => {
  // 从请求头中获取令牌
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new UnauthorizedError('Access token required');
  }
  
  // 提取令牌
  const token = authHeader.split(' ')[1];
  
  try {
    // 验证令牌
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    
    // 查找用户并关联查询角色信息
    const user = await User.findById(decoded.userId).populate('role');
    if (!user) {
      throw new UnauthorizedError('User not found');
    }
    
    // 检查令牌是否与用户存储的令牌匹配（确保同一用户仅能存在一个有效令牌）
    if (user.token !== token) {
      throw new UnauthorizedError('Invalid or expired token');
    }
    
    // 将用户信息添加到请求对象中
    req.user = {
      userId: user._id,
      username: user.username,
      role: user.role
    };
    
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      throw new UnauthorizedError('Token expired');
    }
    if (error.name === 'JsonWebTokenError') {
      throw new UnauthorizedError('Invalid token');
    }
    throw error;
  }
};

module.exports = authenticate;