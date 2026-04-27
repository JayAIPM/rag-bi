const express = require('express');
const router = express.Router();

// 获取用户列表接口
router.get('/', (req, res) => {
  res.json({ message: 'Get user list endpoint' });
});

// 创建用户接口
router.post('/', (req, res) => {
  res.json({ message: 'Create user endpoint' });
});

// 更新用户接口
router.put('/:id', (req, res) => {
  res.json({ message: 'Update user endpoint' });
});

// 删除用户接口
router.delete('/:id', (req, res) => {
  res.json({ message: 'Delete user endpoint' });
});

module.exports = router;