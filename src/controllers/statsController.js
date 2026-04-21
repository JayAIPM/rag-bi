// 统计控制器
const Conversation = require('../models/conversation');
const Document = require('../models/document');
const KnowledgeBase = require('../models/knowledgeBase');
const User = require('../models/user');

// 获取运营仪表盘核心指标
async function getDashboardStats(req, res) {
  try {
    // 获取用户数量
    const userCount = await User.findAll();
    const totalUsers = userCount.length;

    // 获取知识库数量
    const knowledgeBaseCount = await KnowledgeBase.findAll();
    const totalKnowledgeBases = knowledgeBaseCount.length;

    // 获取文档数量
    const documentCount = await Document.findAll();
    const totalDocuments = documentCount.length;

    // 获取对话数量
    const conversationCount = await Conversation.findAll();
    const totalConversations = conversationCount.length;

    // 计算最近7天的对话数量
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const recentConversations = conversationCount.filter(convo => {
      return new Date(convo.createdAt) >= sevenDaysAgo;
    });
    const recentConversationCount = recentConversations.length;

    res.json({
      stats: {
        totalUsers,
        totalKnowledgeBases,
        totalDocuments,
        totalConversations,
        recentConversationCount
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Internal server error' });
  }
}

module.exports = {
  getDashboardStats
};
