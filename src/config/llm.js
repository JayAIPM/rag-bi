const path = require("path");

const LLM_CONFIG = {
  ollamaUrl: process.env.OLLAMA_URL || "http://localhost:11434",
  chatModel: process.env.LLM_MODEL || "qwen3.5:4b",
  llmTimeout: parseInt(process.env.LLM_TIMEOUT) || 120000,
  chunkTimeout: parseInt(process.env.CHUNK_TIMEOUT) || 30000,
  maxAnswerLength: parseInt(process.env.MAX_ANSWER_LENGTH) || 800,
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

module.exports = {
  LLM_CONFIG,
  RETRIEVAL_CONFIG,
  SYSTEM_PROMPT,
};
