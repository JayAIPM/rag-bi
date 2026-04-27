const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { validate, loginSchema, userInfoSchema, logoutSchema } = require('../middleware/validator');

// 登录接口
router.post('/login', validate(loginSchema), authController.login);

// 获取用户信息接口
router.get('/user-info', validate(userInfoSchema), authController.getUserInfo);

// 登出接口
router.post('/logout', validate(logoutSchema), authController.logout);

module.exports = router;