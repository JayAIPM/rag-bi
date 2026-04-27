const express = require('express');
const router = express.Router();

// 上传文档接口
router.post('/', (req, res) => {
  res.json({ message: 'Upload document endpoint' });
});

// 获取文档列表接口
router.get('/', (req, res) => {
  res.json({ message: 'Get document list endpoint' });
});

// 删除文档接口
router.delete('/:id', (req, res) => {
  res.json({ message: 'Delete document endpoint' });
});

module.exports = router;