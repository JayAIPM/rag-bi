const path = require("path");

const LLM_CONFIG = {
  ollamaUrl: process.env.OLLAMA_URL || "http://localhost:11434",
  chatModel: process.env.LLM_MODEL || "qwen3.5:4b",
  llmTimeout: parseInt(process.env.LLM_TIMEOUT) || 60000,
  chunkTimeout: parseInt(process.env.CHUNK_TIMEOUT) || 30000,
  maxAnswerLength: parseInt(process.env.MAX_ANSWER_LENGTH) || 5000,
};

const RETRIEVAL_CONFIG = {
  defaultTopK: 5,
  defaultMaxToken: 800,
};

const SYSTEM_PROMPT = `【系统提示词】
你是一个专业的知识库问答助手。请根据提供的参考信息回答用户的问题。

【约束规则】
1. 只根据提供的参考信息回答，不要编造答案
2. 如果参考信息中没有相关信息，请如实告知"暂无相关信息"
3. 回答要简洁、准确，在句中标注引用序号[1][2]等
4. 回答末尾附上对应的原文片段作为引用来源
5. 字数控制在250字以内（复杂总结类问题不超过450字）
6. 如果多个来源有冲突，必须明确标注冲突内容并说明采信依据`;

module.exports = {
  LLM_CONFIG,
  RETRIEVAL_CONFIG,
  SYSTEM_PROMPT,
};
