const authService = require('../services/authService');

// 登录接口
exports.login = async (req, res, next) => {
  // 从验证后的数据中获取用户名和密码
  const { username, password } = req.validatedData;
  
  // 调用服务层方法
  const result = await authService.login(username, password);
  
  // 返回令牌和用户信息
  res.json({
    code: 0,
    msg: 'success',
    data: result
  });
};

// 获取用户信息接口
exports.getUserInfo = async (req, res, next) => {
  // 从请求对象中获取用户信息（由认证中间件添加）
  const userId = req.user.userId;
  
  // 调用服务层方法
  const result = await authService.getUserInfo(userId);
  
  // 返回用户信息
  res.json({
    code: 0,
    msg: 'success',
    data: result
  });
};

// 登出接口
exports.logout = async (req, res, next) => {
  // 从请求对象中获取用户信息（由认证中间件添加）
  const userId = req.user.userId;
  
  // 调用服务层方法
  const result = await authService.logout(userId);
  
  // 返回登出成功响应
  res.json({
    code: 0,
    msg: 'success',
    data: null
  });
};