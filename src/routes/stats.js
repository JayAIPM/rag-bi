const express = require('express');
const router = express.Router();

// 获取运营仪表盘接口
router.get('/dashboard', (req, res) => {
  res.json({ message: 'Get dashboard stats endpoint' });
});

// 获取文档统计接口
router.get('/documents', (req, res) => {
  res.json({ message: 'Get document stats endpoint' });
});

// 获取对话统计接口
router.get('/chat', (req, res) => {
  res.json({ message: 'Get chat stats endpoint' });
});

module.exports = router;