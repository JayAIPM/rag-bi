const path = require("path");

const LLM_CONFIG = {
  ollamaUrl: process.env.OLLAMA_URL || "http://localhost:11434",
  chatModel: process.env.LLM_MODEL || "qwen3.5:4b",
  llmTimeout: parseInt(process.env.LLM_TIMEOUT) || 120000,
  chunkTimeout: parseInt(process.env.CHUNK_TIMEOUT) || 30000,
  maxAnswerLength: parseInt(process.env.MAX_ANSWER_LENGTH) || 800,
};

// 查询重写配置
const QUERY_REWRITE_CONFIG = {
  model: process.env.QUERY_REWRITE_MODEL || "deepseek-r1:8b",
  timeout: parseInt(process.env.QUERY_REWRITE_TIMEOUT) || 30000,
  maxTokens: 200,
  enabled: process.env.QUERY_REWRITE_ENABLED === 'true' || false,
};

// 重排序配置
const RERANK_CONFIG = {
  model: process.env.RERANK_MODEL || "bge-reranker-v2-m3",
  timeout: parseInt(process.env.RERANK_TIMEOUT) || 30000,
  topK: parseInt(process.env.RERANK_TOP_K) || 10,
  candidateCount: parseInt(process.env.RERANK_CANDIDATE_COUNT) || 20,
  enabled: process.env.RERANK_ENABLED === 'true' || false,
};

const RETRIEVAL_CONFIG = {
  defaultTopK: 3,
  defaultMaxToken: 200,
};

const SYSTEM_PROMPT = `【系统提示词】
你是一个专业的知识库问答助手。请根据提供的参考信息回答用户的问题。

【约束规则】
1. 只根据提供的参考信息回答，不要编造答案
2. 如果参考信息中没有相关信息，请如实告知"暂无相关信息"
3. 回答简洁准确，在句中标注引用序号[1][2]等
4. 必须在回答末尾另起一行，列出所有引用来源，格式如下：
   [1] 文档名 - 截取的原文片段
   [2] 文档名 - 截取的原文片段
5. 绝对禁止在引用不明确的情况下给出确定性回答`;

// 查询重写的 System Prompt
const QUERY_REWRITE_SYSTEM_PROMPT = `【查询重写任务】
你是一个专业的查询优化助手。请将用户输入的自然语言问题改写为更适合检索的查询语句。

【重写规则】
1. 保持原问题的主旨和核心意图不变
2. 使用更精确、规范的语言表达
3. 提取3-5个关键检索词
4. 删除口语化表达和无意义词汇
5. 如果问题不明确，保留核心意图即可

【输出格式】
请直接输出改写后的查询语句，不要添加解释说明。`;

module.exports = {
  LLM_CONFIG,
  QUERY_REWRITE_CONFIG,
  QUERY_REWRITE_SYSTEM_PROMPT,
  RETRIEVAL_CONFIG,
  RERANK_CONFIG,
  SYSTEM_PROMPT,
};
