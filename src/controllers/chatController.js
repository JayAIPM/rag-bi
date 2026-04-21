// 对话控制器
const Conversation = require('../models/conversation');
const KnowledgeBase = require('../models/knowledgeBase');

// 发送问题，触发 RAG 全流程返回回答
async function askQuestion(req, res) {
  try {
    const { knowledgeBaseId, question, conversationId } = req.body;
    const userId = req.user.id;

    // 验证知识库是否存在
    const knowledgeBase = await KnowledgeBase.findById(knowledgeBaseId);
    if (!knowledgeBase) {
      return res.status(404).json({ message: 'Knowledge base not found' });
    }

    // 检查权限
    if (knowledgeBase.owner !== userId && req.user.role !== 'admin' && req.user.role !== 'knowledgeBaseAdmin') {
      return res.status(403).json({ message: 'Permission denied' });
    }

    // 查找或创建对话
    let conversation;
    if (conversationId) {
      conversation = await Conversation.findById(conversationId);
      if (!conversation) {
        return res.status(404).json({ message: 'Conversation not found' });
      }
    } else {
      // 创建新对话
      const convoData = {
        userId,
        knowledgeBaseId,
        messages: [],
        createdAt: new Date(),
        updatedAt: new Date()
      };
      const id = await Conversation.create(convoData);
      conversation = await Conversation.findById(id);
    }

    // 添加用户问题到对话
    const userMessage = {
      role: 'user',
      content: question,
      createdAt: new Date()
    };
    conversation.messages.push(userMessage);

    // TODO: 触发 RAG 全流程
    // 这里需要集成 LlamaIndex.TS 来处理检索和生成
    // 模拟回答
    const assistantMessage = {
      role: 'assistant',
      content: `This is a mock answer for your question: ${question}`,
      references: [],
      createdAt: new Date()
    };
    conversation.messages.push(assistantMessage);

    // 更新对话
    conversation.updatedAt = new Date();
    await Conversation.update(conversation._id, conversation);

    res.json({ 
      conversationId: conversation._id, 
      answer: assistantMessage.content, 
      references: assistantMessage.references 
    });
  } catch (error) {
    res.status(500).json({ message: 'Internal server error' });
  }
}

// 获取用户对话历史
async function getChatHistory(req, res) {
  try {
    const userId = req.user.id;
    const conversations = await Conversation.findByUserId(userId);
    res.json({ conversations });
  } catch (error) {
    res.status(500).json({ message: 'Internal server error' });
  }
}

// 获取对话详情
async function getConversation(req, res) {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const conversation = await Conversation.findById(id);
    if (!conversation) {
      return res.status(404).json({ message: 'Conversation not found' });
    }

    // 检查权限
    if (conversation.userId !== userId && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Permission denied' });
    }

    res.json({ conversation });
  } catch (error) {
    res.status(500).json({ message: 'Internal server error' });
  }
}

// 删除对话
async function deleteConversation(req, res) {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const conversation = await Conversation.findById(id);
    if (!conversation) {
      return res.status(404).json({ message: 'Conversation not found' });
    }

    // 检查权限
    if (conversation.userId !== userId && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Permission denied' });
    }

    await Conversation.delete(id);
    res.json({ message: 'Conversation deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Internal server error' });
  }
}

module.exports = {
  askQuestion,
  getChatHistory,
  getConversation,
  deleteConversation
};
