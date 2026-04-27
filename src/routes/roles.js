const express = require('express');
const router = express.Router();

// 获取角色列表接口
router.get('/', (req, res) => {
  res.json({ message: 'Get role list endpoint' });
});

// 创建角色接口
router.post('/', (req, res) => {
  res.json({ message: 'Create role endpoint' });
});

// 更新角色接口
router.put('/:id', (req, res) => {
  res.json({ message: 'Update role endpoint' });
});

// 删除角色接口
router.delete('/:id', (req, res) => {
  res.json({ message: 'Delete role endpoint' });
});

module.exports = router;