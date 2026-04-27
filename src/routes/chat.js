const express = require('express');
const router = express.Router();

// 发送问题接口
router.post('/ask', (req, res) => {
  res.json({ message: 'Ask question endpoint' });
});

// 获取对话历史接口
router.get('/history', (req, res) => {
  res.json({ message: 'Get chat history endpoint' });
});

// 删除对话历史接口
router.delete('/history/:id', (req, res) => {
  res.json({ message: 'Delete chat history endpoint' });
});

module.exports = router;