// 认证中间件
const jwt = require('jsonwebtoken');
const config = require('../../config/config');

// 验证 JWT token
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'Access token required' });
  }

  jwt.verify(token, config.jwt.secret, (err, user) => {
    if (err) {
      return res.status(403).json({ message: 'Invalid or expired token' });
    }

    req.user = user;
    next();
  });
}

// 验证管理员权限
function authorizeAdmin(req, res, next) {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Admin permission required' });
  }
  next();
}

// 验证知识库管理员权限
function authorizeKnowledgeBaseAdmin(req, res, next) {
  if (req.user.role !== 'admin' && req.user.role !== 'knowledgeBaseAdmin') {
    return res.status(403).json({ message: 'Knowledge base admin permission required' });
  }
  next();
}

module.exports = {
  authenticateToken,
  authorizeAdmin,
  authorizeKnowledgeBaseAdmin
};
