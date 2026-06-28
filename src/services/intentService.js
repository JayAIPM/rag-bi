const logger = require('../utils/logger');
const embeddingService = require('./embeddingService');

const INTENT_TYPES = {
  KNOWLEDGE_QA: 'knowledge_qa',
  SMALL_TALK: 'small_talk',
  GENERAL_KNOWLEDGE: 'general_knowledge',
  OUT_OF_SCOPE: 'out_of_scope',
};

const SMALL_TALK_PATTERNS = [
  { regex: /^(你好|您好|hi|hello|hey|嗨|哈喽|嘿)/i, reply: '你好！我是知识库助手，有什么可以帮你的吗？' },
  { regex: /^(谢谢|感谢|多谢|thx|thanks|thank you)/i, reply: '不客气，很高兴能帮到你！' },
  { regex: /^(再见|拜拜|bye|goodbye|晚安)/i, reply: '再见！有问题随时来找我~' },
  { regex: /你(是|叫)(谁|什么|哪位|叫什么)/i, reply: '我是知识库问答助手，可以帮你查询知识库中的内容。' },
  { regex: /你(有什么|会|能)做(什么|啥)/i, reply: '我可以帮你查询知识库中的内容，包括产品文档、政策规则、操作指南等。请问有什么可以帮你的？' },
  { regex: /(今天|明天|后天|最近).*(天气|温度|下雨|下雪|晴天|阴天)/i, reply: '抱歉，我无法查询天气信息，建议你使用天气应用查看。' },
  { regex: /(几点|时间|几点钟|现在几点)/i, reply: `现在是 ${new Date().toLocaleString('zh-CN')}。` },
  { regex: /(今天|今天是|几号|日期|星期几|周几)/i, reply: `今天是 ${new Date().toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' })}。` },
  { regex: /^(好的|好|嗯|嗯嗯|哦|噢|知道了|明白|了解)/i, reply: '好的，有其他问题随时问我~' },
  { regex: /^(在吗|在不在|有人吗|在么)/i, reply: '我在！请问有什么可以帮你的？' },
];

const OUT_OF_SCOPE_PATTERNS = [
  /(傻逼|操你妈|草泥马|去死|滚蛋|废物|垃圾)/i,
  /(写|生成|编写|制造).*(病毒|木马|后门|钓鱼|黑客|攻击)/i,
  /(如何|怎么|怎样).*(破解|入侵|翻墙|越狱|root|刷机)/i,
  /(毒品|枪支|弹药|假币|证件|发票).*(购买|购买|怎么买|哪里买)/i,
];

const KNOWLEDGE_QA_EXAMPLES = [
  '这个产品的退货政策是什么？',
  '如何申请退款？',
  'API 的调用频率限制是多少？',
  '这个功能怎么使用？',
  '文档在哪里可以下载？',
  '支持哪些支付方式？',
  '会员有什么权益？',
  '怎么修改密码？',
  '联系客服的方式是什么？',
  '产品规格参数是多少？',
  '保修期限是多久？',
  '发货时间是什么时候？',
  '安装步骤是什么？',
  '常见问题有哪些？',
  '使用教程在哪里？',
  'What is the return policy?',
  'How do I reset my password?',
  'Where can I find the documentation?',
  'What are the API rate limits?',
  'How to contact customer support?',
];

const GENERAL_KNOWLEDGE_EXAMPLES = [
  '地球有多大？',
  '李白是谁？',
  '水的沸点是多少？',
  '太阳系有几大行星？',
  '珠穆朗玛峰有多高？',
  '中国的首都是哪里？',
  '一年有多少天？',
  '光速是多少？',
  '熊猫吃什么？',
  'DNA 是什么？',
];

const INTENT_SERVICE_CONFIG = {
  knowledgeQaThreshold: 0.6,
  generalKnowledgeThreshold: 0.5,
  smallTalkThreshold: 0.4,
  topK: 3,
};

let knowledgeQaEmbeddings = null;
let generalKnowledgeEmbeddings = null;

async function initializeEmbeddings() {
  if (knowledgeQaEmbeddings && generalKnowledgeEmbeddings) {
    return;
  }

  logger.info('Initializing intent recognition embeddings...');

  try {
    const [qaEmbeddings, gkEmbeddings] = await Promise.all([
      embeddingService.embedTexts(KNOWLEDGE_QA_EXAMPLES),
      embeddingService.embedTexts(GENERAL_KNOWLEDGE_EXAMPLES),
    ]);

    knowledgeQaEmbeddings = qaEmbeddings;
    generalKnowledgeEmbeddings = gkEmbeddings;

    logger.info(`Intent recognition embeddings initialized: ${qaEmbeddings.length} QA + ${gkEmbeddings.length} general knowledge`);
  } catch (error) {
    logger.error('Failed to initialize intent recognition embeddings', error);
    throw error;
  }
}

function cosineSimilarity(a, b) {
  if (!a || !b || a.length !== b.length) return 0;

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

async function classifyByEmbedding(queryEmbedding) {
  if (!knowledgeQaEmbeddings || !generalKnowledgeEmbeddings) {
    await initializeEmbeddings();
  }

  const qaScores = knowledgeQaEmbeddings.map(emb => cosineSimilarity(queryEmbedding, emb));
  const gkScores = generalKnowledgeEmbeddings.map(emb => cosineSimilarity(queryEmbedding, emb));

  const topQaScores = qaScores.sort((a, b) => b - a).slice(0, INTENT_SERVICE_CONFIG.topK);
  const topGkScores = gkScores.sort((a, b) => b - a).slice(0, INTENT_SERVICE_CONFIG.topK);

  const avgQaScore = topQaScores.reduce((a, b) => a + b, 0) / topQaScores.length;
  const avgGkScore = topGkScores.reduce((a, b) => a + b, 0) / topGkScores.length;

  logger.debug(`Intent embedding classification: qaScore=${avgQaScore.toFixed(3)}, gkScore=${avgGkScore.toFixed(3)}`);

  if (avgQaScore >= INTENT_SERVICE_CONFIG.knowledgeQaThreshold && avgQaScore >= avgGkScore) {
    return { intent: INTENT_TYPES.KNOWLEDGE_QA, confidence: avgQaScore, method: 'embedding' };
  }

  if (avgGkScore >= INTENT_SERVICE_CONFIG.generalKnowledgeThreshold && avgGkScore > avgQaScore) {
    return { intent: INTENT_TYPES.GENERAL_KNOWLEDGE, confidence: avgGkScore, method: 'embedding' };
  }

  if (avgQaScore < INTENT_SERVICE_CONFIG.smallTalkThreshold && avgGkScore < INTENT_SERVICE_CONFIG.smallTalkThreshold) {
    return { intent: INTENT_TYPES.SMALL_TALK, confidence: 1 - Math.max(avgQaScore, avgGkScore), method: 'embedding' };
  }

  return { intent: INTENT_TYPES.KNOWLEDGE_QA, confidence: avgQaScore, method: 'embedding', fallback: true };
}

function classifyByRules(query) {
  const text = query.trim();

  for (const pattern of OUT_OF_SCOPE_PATTERNS) {
    if (pattern.test(text)) {
      return {
        intent: INTENT_TYPES.OUT_OF_SCOPE,
        confidence: 0.95,
        method: 'rule',
        reply: '抱歉，这个问题我无法回答，请遵守相关法律法规和公序良俗。',
      };
    }
  }

  for (const pattern of SMALL_TALK_PATTERNS) {
    if (pattern.regex.test(text)) {
      return {
        intent: INTENT_TYPES.SMALL_TALK,
        confidence: 0.9,
        method: 'rule',
        reply: pattern.reply,
      };
    }
  }

  return null;
}

async function classifyIntent(query, queryEmbedding = null) {
  logger.debug(`Classifying intent for query: "${query}"`);

  const ruleResult = classifyByRules(query);
  if (ruleResult) {
    logger.info(`Intent classified (L1 rule): ${ruleResult.intent}, confidence=${ruleResult.confidence}`);
    return ruleResult;
  }

  if (!queryEmbedding) {
    try {
      queryEmbedding = await embeddingService.embedText(query);
    } catch (error) {
      logger.warn('Failed to get embedding for intent classification, defaulting to knowledge_qa', error.message);
      return { intent: INTENT_TYPES.KNOWLEDGE_QA, confidence: 0.5, method: 'fallback' };
    }
  }

  try {
    const embeddingResult = await classifyByEmbedding(queryEmbedding);
    logger.info(`Intent classified (L2 embedding): ${embeddingResult.intent}, confidence=${embeddingResult.confidence.toFixed(3)}`);
    return embeddingResult;
  } catch (error) {
    logger.warn('Embedding classification failed, defaulting to knowledge_qa', error.message);
    return { intent: INTENT_TYPES.KNOWLEDGE_QA, confidence: 0.5, method: 'fallback' };
  }
}

module.exports = {
  INTENT_TYPES,
  classifyIntent,
  classifyByRules,
  classifyByEmbedding,
  initializeEmbeddings,
};
