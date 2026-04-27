const express = require('express');
const router = express.Router();

// 获取知识库列表接口
router.get('/', (req, res) => {
  res.json({ message: 'Get knowledge base list endpoint' });
});

// 创建知识库接口
router.post('/', (req, res) => {
  res.json({ message: 'Create knowledge base endpoint' });
});

// 更新知识库接口
router.put('/:id', (req, res) => {
  res.json({ message: 'Update knowledge base endpoint' });
});

// 删除知识库接口
router.delete('/:id', (req, res) => {
  res.json({ message: 'Delete knowledge base endpoint' });
});

module.exports = router;