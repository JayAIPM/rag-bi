const { AppError } = require('../utils/error');

/**
 * 权限验证中间件
 * 基于 RBAC (Role-Based Access Control) 实现
 */

/**
 * 检查用户是否拥有指定权限
 * @param {string} permission - 权限名称
 * @returns {Function} Express 中间件函数
 */
const requirePermission = (permission) => {
  return async (req, res, next) => {
    // 确保用户已通过认证
    if (!req.user) {
      throw new AppError('用户未认证', 401, 'UNAUTHORIZED');
    }

    // 检查用户角色
    const user = req.user;
    
    // 管理员拥有所有权限
    if (user.role && user.role.name === 'admin') {
      return next();
    }

    // 检查用户是否拥有指定权限
    if (!user.role || !user.role.permissions || !user.role.permissions.includes(permission)) {
      throw new AppError('权限不足', 403, 'FORBIDDEN');
    }

    next();
  };
};

/**
 * 检查用户是否拥有指定角色
 * @param {string|Array<string>} roles - 角色名称或角色名称数组
 * @returns {Function} Express 中间件函数
 */
const requireRole = (roles) => {
  return async (req, res, next) => {
    // 确保用户已通过认证
    if (!req.user) {
      throw new AppError('用户未认证', 401, 'UNAUTHORIZED');
    }

    const user = req.user;
    const rolesArray = Array.isArray(roles) ? roles : [roles];

    // 检查用户角色是否在允许的角色列表中
    if (!user.role || !rolesArray.includes(user.role.name)) {
      throw new AppError('角色权限不足', 403, 'FORBIDDEN');
    }

    next();
  };
};

/**
 * 检查用户是否为管理员
 * @returns {Function} Express 中间件函数
 */
const requireAdmin = () => {
  return requireRole('admin');
};

module.exports = {
  requirePermission,
  requireRole,
  requireAdmin
};