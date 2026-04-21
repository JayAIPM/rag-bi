// 路由配置
const express = require('express');
const authController = require('../controllers/authController');
const knowledgeBaseController = require('../controllers/knowledgeBaseController');
const documentController = require('../controllers/documentController');
const chatController = require('../controllers/chatController');
const statsController = require('../controllers/statsController');
const { authenticateToken, authorizeAdmin, authorizeKnowledgeBaseAdmin } = require('../middleware/auth');
const config = require('../../config/config');

const router = express.Router();

/**
 * @swagger
 * /api/v1/auth/login:
 *   post:
 *     summary: 用户登录获取 Token
 *     tags: [认证]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               username:
 *                 type: string
 *                 description: 用户名
 *               password:
 *                 type: string
 *                 description: 密码
 *     responses:
 *       200:
 *         description: 登录成功
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 token:
 *                   type: string
 *                 user:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                     username:
 *                       type: string
 *                     role:
 *                       type: string
 *       401:
 *         description: 用户名或密码错误
 */
router.post('/auth/login', authController.login);

/**
 * @swagger
 * /api/v1/auth/user-info:
 *   get:
 *     summary: 获取当前用户信息与权限
 *     tags: [认证]
 *     responses:
 *       200:
 *         description: 获取成功
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 user:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                     username:
 *                       type: string
 *                     role:
 *                       type: string
 *                     permissions:
 *                       type: array
 *                       items:
 *                         type: string
 *       401:
 *         description: 未授权
 */
router.get('/auth/user-info', authenticateToken, authController.getUserInfo);

// 知识库路由
/**
 * @swagger
 * /knowledge:
 *   get:
 *     summary: 获取有权限的知识库列表
 *     tags: [知识库]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 获取成功
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 knowledgeBases:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                         description: 知识库 ID
 *                       name:
 *                         type: string
 *                         description: 知识库名称
 *                       description:
 *                         type: string
 *                         description: 知识库描述
 *                       owner:
 *                         type: string
 *                         description: 知识库所有者
 *                       permissions:
 *                         type: array
 *                         items:
 *                           type: string
 *                         description: 知识库权限
 *       401:
 *         description: 未授权
 */
router.get('/knowledge', authenticateToken, knowledgeBaseController.getKnowledgeBases);

/**
 * @swagger
 * /knowledge:
 *   post:
 *     summary: 创建知识库
 *     tags: [知识库]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 description: 知识库名称
 *               description:
 *                 type: string
 *                 description: 知识库描述
 *     responses:
 *       201:
 *         description: 创建成功
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: string
 *                   description: 知识库 ID
 *                 name:
 *                   type: string
 *                   description: 知识库名称
 *                 description:
 *                   type: string
 *                   description: 知识库描述
 *                 owner:
 *                   type: string
 *                   description: 知识库所有者
 *                 permissions:
 *                   type: array
 *                   items:
 *                     type: string
 *                   description: 知识库权限
 *       401:
 *         description: 未授权
 *       403:
 *         description: 权限不足
 */
router.post('/knowledge', authenticateToken, authorizeAdmin, knowledgeBaseController.createKnowledgeBase);

/**
 * @swagger
 * /knowledge/{id}:
 *   get:
 *     summary: 获取知识库详情
 *     tags: [知识库]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: 知识库 ID
 *     responses:
 *       200:
 *         description: 获取成功
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 knowledgeBase:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                       description: 知识库 ID
 *                     name:
 *                       type: string
 *                       description: 知识库名称
 *                     description:
 *                       type: string
 *                       description: 知识库描述
 *                     owner:
 *                       type: string
 *                       description: 知识库所有者
 *                     permissions:
 *                       type: array
 *                       items:
 *                         type: string
 *                       description: 知识库权限
 *       401:
 *         description: 未授权
 *       404:
 *         description: 知识库不存在
 */
router.get('/knowledge/:id', authenticateToken, knowledgeBaseController.getKnowledgeBase);

/**
 * @swagger
 * /knowledge/{id}:
 *   put:
 *     summary: 更新知识库
 *     tags: [知识库]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: 知识库 ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 description: 知识库名称
 *               description:
 *                 type: string
 *                 description: 知识库描述
 *     responses:
 *       200:
 *         description: 更新成功
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   description: 操作消息
 *       401:
 *         description: 未授权
 *       403:
 *         description: 权限不足
 *       404:
 *         description: 知识库不存在
 */
router.put('/knowledge/:id', authenticateToken, knowledgeBaseController.updateKnowledgeBase);

/**
 * @swagger
 * /knowledge/{id}:
 *   delete:
 *     summary: 删除知识库
 *     tags: [知识库]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: 知识库 ID
 *     responses:
 *       200:
 *         description: 删除成功
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   description: 操作消息
 *       401:
 *         description: 未授权
 *       403:
 *         description: 权限不足
 *       404:
 *         description: 知识库不存在
 */
router.delete('/knowledge/:id', authenticateToken, knowledgeBaseController.deleteKnowledgeBase);

// 文档路由
/**
 * @swagger
 * /document:
 *   post:
 *     summary: 上传文档并触发向量化入库
 *     tags: [文档]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               knowledgeBaseId:
 *                 type: string
 *                 description: 知识库 ID
 *               document:
 *                 type: string
 *                 format: binary
 *                 description: 文档文件
 *     responses:
 *       201:
 *         description: 上传成功
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: string
 *                   description: 文档 ID
 *                 name:
 *                   type: string
 *                   description: 文档名称
 *                 type:
 *                   type: string
 *                   description: 文档类型
 *                 size:
 *                   type: number
 *                   description: 文档大小
 *                 path:
 *                   type: string
 *                   description: 文档路径
 *                 knowledgeBaseId:
 *                   type: string
 *                   description: 知识库 ID
 *                 version:
 *                   type: number
 *                   description: 文档版本
 *                 createdAt:
 *                   type: string
 *                   format: date-time
 *                   description: 创建时间
 *                 updatedAt:
 *                   type: string
 *                   format: date-time
 *                   description: 更新时间
 *       401:
 *         description: 未授权
 *       403:
 *         description: 权限不足
 */
router.post('/document', authenticateToken, authorizeKnowledgeBaseAdmin, documentController.uploadDocument);

/**
 * @swagger
 * /document/{id}:
 *   delete:
 *     summary: 删除文档与对应向量数据
 *     tags: [文档]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: 文档 ID
 *     responses:
 *       200:
 *         description: 删除成功
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   description: 操作消息
 *       401:
 *         description: 未授权
 *       403:
 *         description: 权限不足
 *       404:
 *         description: 文档不存在
 */
router.delete('/document/:id', authenticateToken, authorizeKnowledgeBaseAdmin, documentController.deleteDocument);

/**
 * @swagger
 * /document/knowledge-base/{knowledgeBaseId}:
 *   get:
 *     summary: 获取知识库的文档列表
 *     tags: [文档]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: knowledgeBaseId
 *         required: true
 *         schema:
 *           type: string
 *         description: 知识库 ID
 *     responses:
 *       200:
 *         description: 获取成功
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 documents:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                         description: 文档 ID
 *                       name:
 *                         type: string
 *                         description: 文档名称
 *                       type:
 *                         type: string
 *                         description: 文档类型
 *                       size:
 *                         type: number
 *                         description: 文档大小
 *                       path:
 *                         type: string
 *                         description: 文档路径
 *                       knowledgeBaseId:
 *                         type: string
 *                         description: 知识库 ID
 *                       version:
 *                         type: number
 *                         description: 文档版本
 *                       createdAt:
 *                         type: string
 *                         format: date-time
 *                         description: 创建时间
 *                       updatedAt:
 *                         type: string
 *                         format: date-time
 *                         description: 更新时间
 *       401:
 *         description: 未授权
 *       404:
 *         description: 知识库不存在
 */
router.get('/document/knowledge-base/:knowledgeBaseId', authenticateToken, documentController.getDocuments);

// 对话路由
/**
 * @swagger
 * /chat/ask:
 *   post:
 *     summary: 发送问题，触发 RAG 全流程返回回答
 *     tags: [对话]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               knowledgeBaseId:
 *                 type: string
 *                 description: 知识库 ID
 *               question:
 *                 type: string
 *                 description: 问题内容
 *               conversationId:
 *                 type: string
 *                 description: 对话 ID（可选）
 *     responses:
 *       200:
 *         description: 回答成功
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 conversationId:
 *                   type: string
 *                   description: 对话 ID
 *                 answer:
 *                   type: string
 *                   description: 回答内容
 *                 references:
 *                   type: array
 *                   items:
 *                     type: object
 *                   description: 引用来源
 *       401:
 *         description: 未授权
 *       404:
 *         description: 知识库不存在
 */
router.post('/chat/ask', authenticateToken, chatController.askQuestion);

/**
 * @swagger
 * /chat/history:
 *   get:
 *     summary: 获取用户对话历史
 *     tags: [对话]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 获取成功
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 conversations:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                         description: 对话 ID
 *                       userId:
 *                         type: string
 *                         description: 用户 ID
 *                       knowledgeBaseId:
 *                         type: string
 *                         description: 知识库 ID
 *                       messages:
 *                         type: array
 *                         items:
 *                           type: object
 *                           properties:
 *                             role:
 *                               type: string
 *                               description: 角色
 *                             content:
 *                               type: string
 *                               description: 内容
 *                             references:
 *                               type: array
 *                               items:
 *                                 type: object
 *                               description: 引用来源
 *                             createdAt:
 *                               type: string
 *                               format: date-time
 *                               description: 创建时间
 *                       createdAt:
 *                         type: string
 *                         format: date-time
 *                         description: 创建时间
 *                       updatedAt:
 *                         type: string
 *                         format: date-time
 *                         description: 更新时间
 *       401:
 *         description: 未授权
 */
router.get('/chat/history', authenticateToken, chatController.getChatHistory);

/**
 * @swagger
 * /chat/{id}:
 *   get:
 *     summary: 获取对话详情
 *     tags: [对话]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: 对话 ID
 *     responses:
 *       200:
 *         description: 获取成功
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 conversation:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                       description: 对话 ID
 *                     userId:
 *                       type: string
 *                       description: 用户 ID
 *                     knowledgeBaseId:
 *                       type: string
 *                       description: 知识库 ID
 *                     messages:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           role:
 *                             type: string
 *                             description: 角色
 *                           content:
 *                             type: string
 *                             description: 内容
 *                           references:
 *                             type: array
 *                             items:
 *                               type: object
 *                             description: 引用来源
 *                           createdAt:
 *                             type: string
 *                             format: date-time
 *                             description: 创建时间
 *                     createdAt:
 *                       type: string
 *                       format: date-time
 *                       description: 创建时间
 *                     updatedAt:
 *                       type: string
 *                       format: date-time
 *                       description: 更新时间
 *       401:
 *         description: 未授权
 *       403:
 *         description: 权限不足
 *       404:
 *         description: 对话不存在
 */
router.get('/chat/:id', authenticateToken, chatController.getConversation);

/**
 * @swagger
 * /chat/{id}:
 *   delete:
 *     summary: 删除对话
 *     tags: [对话]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: 对话 ID
 *     responses:
 *       200:
 *         description: 删除成功
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   description: 操作消息
 *       401:
 *         description: 未授权
 *       403:
 *         description: 权限不足
 *       404:
 *         description: 对话不存在
 */
router.delete('/chat/:id', authenticateToken, chatController.deleteConversation);

// 统计路由
/**
 * @swagger
 * /stats/dashboard:
 *   get:
 *     summary: 获取运营仪表盘核心指标
 *     tags: [统计]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 获取成功
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 stats:
 *                   type: object
 *                   properties:
 *                     totalUsers:
 *                       type: number
 *                       description: 用户总数
 *                     totalKnowledgeBases:
 *                       type: number
 *                       description: 知识库总数
 *                     totalDocuments:
 *                       type: number
 *                       description: 文档总数
 *                     totalConversations:
 *                       type: number
 *                       description: 对话总数
 *                     recentConversationCount:
 *                       type: number
 *                       description: 最近7天对话数
 *       401:
 *         description: 未授权
 *       403:
 *         description: 权限不足
 */
router.get('/stats/dashboard', authenticateToken, authorizeAdmin, statsController.getDashboardStats);

module.exports = router;
