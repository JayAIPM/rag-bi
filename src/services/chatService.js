const http = require("http");
const retrievalService = require("./retrievalService");
const Chat = require("../models/Chat");
const logger = require("../utils/logger");

const SYSTEM_PROMPT = `【系统提示词】
你是一个专业的知识库问答助手。请根据提供的参考信息回答用户的问题。

【约束规则】
1. 只根据提供的参考信息回答，不要编造答案
2. 如果参考信息中没有相关信息，请如实告知"暂无相关信息"
3. 回答要简洁、准确，在句中标注引用序号[1][2]等
4. 回答末尾附上对应的原文片段作为引用来源
5. 字数控制在250字以内（复杂总结类问题不超过450字）
6. 如果多个来源有冲突，必须明确标注冲突内容并说明采信依据`;

const DEFAULT_TOP_K = 5;
const DEFAULT_MAX_TOKEN = 800;
const DEFAULT_LLM_TIMEOUT = 60000;
const DEFAULT_CHUNK_TIMEOUT = 5000;

const config = {
  ollamaUrl: process.env.OLLAMA_URL || "http://localhost:11434",
  chatModel: process.env.LLM_MODEL || "qwen3.5:4b",
  llmTimeout: parseInt(process.env.LLM_TIMEOUT) || DEFAULT_LLM_TIMEOUT,
  chunkTimeout: parseInt(process.env.CHUNK_TIMEOUT) || DEFAULT_CHUNK_TIMEOUT,
};

function truncateText(text, maxToken = DEFAULT_MAX_TOKEN) {
  const avgCharsPerToken = 2;
  const maxChars = maxToken * avgCharsPerToken;
  if (text.length <= maxChars) {
    return text;
  }
  return text.substring(0, maxChars) + "...";
}

function buildContext(chunks) {
  if (!chunks || chunks.length === 0) {
    return "无相关参考信息";
  }
  return chunks
    .map((chunk, index) => {
      const truncatedContent = truncateText(chunk.content || "");
      const docName = chunk.documentName || "未知文档";
      return `[${index + 1}] ${docName}\n${truncatedContent}`;
    })
    .join("\n\n");
}

function buildPrompt(query, chunks) {
  const context = buildContext(chunks);
  return `${SYSTEM_PROMPT}

【参考信息】
${context}

【用户问题】
${query}

【回答】`;
}

function extractReferences(answer, chunks) {
  const references = [];
  const referencePattern = /\[(\d+)\]/g;
  const usedIndices = new Set();
  let match;
  while ((match = referencePattern.exec(answer)) !== null) {
    const index = parseInt(match[1], 10) - 1;
    if (index >= 0 && index < chunks.length && !usedIndices.has(index)) {
      usedIndices.add(index);
      references.push({
        documentId: chunks[index].documentId || null,
        documentName: chunks[index].documentName || "未知文档",
        content: chunks[index].content || "",
      });
    }
  }
  return references;
}

function generateTitle(query) {
  if (!query) return "新对话";
  return query.length > 20 ? query.substring(0, 20) + "..." : query;
}

const chatService = {
  async buildContext(query, options = {}) {
    const { knowledgeBaseId, topK = DEFAULT_TOP_K } = options;
    logger.info(`Building context for query: ${query}`);
    const chunks = await retrievalService.hybridSearch(query, { knowledgeBaseId, topK });
    logger.info(`Retrieved ${chunks.length} chunks for context`);
    return chunks;
  },

  async saveChat(userId, knowledgeBaseId, query, answer, chunks) {
    const title = generateTitle(query);
    const references = answer ? extractReferences(answer, chunks) : [];
    const chat = new Chat({
      userId,
      knowledgeBaseId: knowledgeBaseId || null,
      title,
      messageCount: answer ? 2 : 1,
      messages: [{ role: "user", content: query }, ...(answer ? [{ role: "assistant", content: answer, references }] : [])],
    });
    await chat.save();
    logger.info(`Chat saved: ${chat._id}`);
    return chat;
  },

  async updateChatAnswer(chatId, answer, chunks) {
    const references = extractReferences(answer, chunks);
    await Chat.findByIdAndUpdate(chatId, {
      $push: { messages: { role: "assistant", content: answer, references } },
      $inc: { messageCount: 1 },
      updatedAt: new Date(),
    });
    logger.info(`Chat answer updated: ${chatId}`);
  },

  async ask(query, options = {}) {
    const { userId, knowledgeBaseId, topK = DEFAULT_TOP_K } = options;
    const chunks = await this.buildContext(query, { knowledgeBaseId, topK });

    if (chunks.length === 0) {
      if (userId) {
        const chat = await this.saveChat(userId, knowledgeBaseId, query, null, []);
        return { query, chunks: [], answer: null, references: [], message: "暂无相关信息", chatId: chat._id };
      }
      return { query, chunks: [], answer: null, references: [], message: "暂无相关信息" };
    }

    const prompt = buildPrompt(query, chunks);
    logger.info("Sending prompt to LLM...");

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), config.llmTimeout);

    try {
      const response = await fetch(`${config.ollamaUrl}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: config.chatModel,
          messages: [{ role: "user", content: prompt }],
          stream: false,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`Ollama API returned ${response.status}`);
      }

      const data = await response.json();
      const answer = data.message?.content || "";
      logger.info("Received answer from LLM");

      const references = extractReferences(answer, chunks);
      let chatId = null;
      if (userId) {
        const chat = await this.saveChat(userId, knowledgeBaseId, query, answer, chunks);
        chatId = chat._id;
      }

      return { query, chunks, answer, references, message: null, chatId };
    } catch (error) {
      clearTimeout(timeoutId);
      if (error.name === "AbortError") {
        throw new Error("LLM 请求超时");
      }
      throw error;
    }
  },

  async createStreamRequest(query, options = {}) {
    const { userId, knowledgeBaseId, topK = DEFAULT_TOP_K } = options;

    const chunks = await this.buildContext(query, { knowledgeBaseId, topK });

    let chatId = null;
    if (userId && chunks.length > 0) {
      const chat = await this.saveChat(userId, knowledgeBaseId, query, null, chunks);
      chatId = chat._id;
    }

    const result = {
      chatId,
      chunks,
      hasChunks: chunks.length > 0,
      prompt: null,
      ollamaReq: null,
      cleanup: null,
    };

    if (chunks.length === 0) {
      return result;
    }

    const prompt = buildPrompt(query, chunks);
    result.prompt = prompt;

    const url = new URL(config.ollamaUrl);
    const requestOptions = {
      hostname: url.hostname,
      port: url.port || 80,
      path: "/api/chat",
      method: "POST",
      headers: { "Content-Type": "application/json" },
    };

    result.ollamaReq = http.request(requestOptions);

    result.cleanup = () => {};

    return result;
  },

  async finalizeStream(chatId, fullAnswer, chunks) {
    if (chatId && fullAnswer) {
      await this.updateChatAnswer(chatId, fullAnswer, chunks);
    }
  },

  async askStream(query, options = {}) {
    const { userId, knowledgeBaseId, topK = DEFAULT_TOP_K, onChunk, onEnd } = options;

    const chunks = await this.buildContext(query, { knowledgeBaseId, topK });

    if (chunks.length === 0) {
      if (onChunk) onChunk('data: {"type":"end","content":"暂无相关信息"}\n\n');
      if (onEnd) onEnd();
      if (userId) await this.saveChat(userId, knowledgeBaseId, query, null, []);
      return { chatId: null };
    }

    let chatId = null;
    if (userId) {
      const chat = await this.saveChat(userId, knowledgeBaseId, query, null, chunks);
      chatId = chat._id;
    }

    const prompt = buildPrompt(query, chunks);
    logger.info("Sending prompt to LLM (streaming)...");

    const url = new URL(config.ollamaUrl);
    const options_ = {
      hostname: url.hostname,
      port: url.port || 80,
      path: "/api/chat",
      method: "POST",
      headers: { "Content-Type": "application/json" },
    };

    return new Promise((resolve, reject) => {
      let fullAnswer = "";
      let saved = false;
      let lastDataTime = Date.now();
      let idleTimeoutId = null;

      const clearIdleTimeout = () => {
        if (idleTimeoutId) {
          clearTimeout(idleTimeoutId);
          idleTimeoutId = null;
        }
      };

      const resetIdleTimeout = () => {
        clearIdleTimeout();
        idleTimeoutId = setTimeout(() => {
          logger.error("Stream idle timeout: no data received for", config.chunkTimeout, "ms");
          ollamaReq.destroy();
          if (onChunk) onChunk(`data: ${JSON.stringify({ type: "error", message: "响应超时，无数据等待过久" })}\n\n`);
          if (onEnd) onEnd();
          reject(new Error("响应超时"));
        }, config.chunkTimeout);
      };

      const ollamaReq = http.request(options_, async (ollamaRes) => {
        resetIdleTimeout();

        ollamaRes.on("data", (chunk) => {
          lastDataTime = Date.now();
          resetIdleTimeout();
          const text = chunk.toString();
          fullAnswer += text;
          if (onChunk) onChunk(text);
        });

        ollamaRes.on("end", async () => {
          clearIdleTimeout();
          if (chatId && fullAnswer && !saved) {
            try {
              await this.updateChatAnswer(chatId, fullAnswer, chunks);
            } catch (e) {
              logger.error("Update chat answer failed:", e);
            }
          }
          if (onEnd) onEnd();
          resolve({ chatId });
        });
      });

      ollamaReq.on("error", (err) => {
        clearIdleTimeout();
        logger.error("Ollama request error:", err);
        if (onChunk) onChunk(`data: ${JSON.stringify({ type: "error", message: err.message })}\n\n`);
        if (onEnd) onEnd();
        reject(err);
      });

      ollamaReq.on("timeout", () => {
        clearIdleTimeout();
        logger.error("Ollama request timeout");
        ollamaReq.destroy();
        if (onChunk) onChunk(`data: ${JSON.stringify({ type: "error", message: "LLM 请求超时" })}\n\n`);
        if (onEnd) onEnd();
        reject(new Error("LLM 请求超时"));
      });

      ollamaReq.setTimeout(config.llmTimeout);

      ollamaReq.write(
        JSON.stringify({
          model: config.chatModel,
          messages: [{ role: "user", content: prompt }],
          stream: true,
        })
      );

      ollamaReq.end();
    });
  },
};

module.exports = chatService;
