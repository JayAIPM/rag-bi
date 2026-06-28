const express = require('express');
const router = express.Router();

// 导入各个模块的路由
const authRoutes = require('./auth');
const knowledgeRoutes = require('./knowledge');
const documentRoutes = require('./document');
const retrievalRoutes = require('./retrieval');
const chatRoutes = require('./chat');
const userRoutes = require('./users');
const roleRoutes = require('./roles');
const statsRoutes = require('./stats');
const qdrantAdminRoutes = require('./qdrantAdmin');

// 注册路由
router.use('/auth', authRoutes);
router.use('/knowledge', knowledgeRoutes);
router.use('/document', documentRoutes);
router.use('/retrieval', retrievalRoutes);
router.use('/chat', chatRoutes);
router.use('/users', userRoutes);
router.use('/roles', roleRoutes);
router.use('/stats', statsRoutes);
router.use('/admin/qdrant', qdrantAdminRoutes);

module.exports = router;
