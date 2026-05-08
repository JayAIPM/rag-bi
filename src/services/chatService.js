const http = require("http");
const retrievalService = require("./retrievalService");
const Chat = require("../models/Chat");
const logger = require("../utils/logger");
const { LLM_CONFIG, RETRIEVAL_CONFIG, SYSTEM_PROMPT } = require("../config/llm");
const { LLMTimeoutError, LLMConnectionError, StreamInterruptedError } = require("../utils/error");

const { ollamaUrl, chatModel, llmTimeout, chunkTimeout, maxAnswerLength } = LLM_CONFIG;
const { defaultTopK, defaultMaxToken } = RETRIEVAL_CONFIG;

/**
 * 截断文本
 * @param {string} text - 待截断的文本
 * @param {number} maxToken - 最大 token 数
 * @returns {string} 截断后的文本
 */
function truncateText(text, maxToken = defaultMaxToken) {
  const avgCharsPerToken = 2;
  const maxChars = maxToken * avgCharsPerToken;
  if (text.length <= maxChars) {
    return text;
  }
  return text.substring(0, maxChars) + "...";
}

/**
 * 构建上下文字符串
 * @param {Array} chunks - 检索到的文档块
 * @returns {string} 格式化的上下文字符串
 */
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

/**
 * 构建 Prompt
 * @param {string} query - 用户问题
 * @param {Array} chunks - 检索到的文档块
 * @returns {string} 完整的 Prompt
 */
function buildPrompt(query, chunks) {
  const context = buildContext(chunks);
  return `${SYSTEM_PROMPT}

【参考信息】
${context}

【用户问题】
${query}

【回答】`;
}

/**
 * 从回答中提取引用
 * @param {string} answer - LLM 回答
 * @param {Array} chunks - 检索到的文档块
 * @returns {Array} 引用列表
 */
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

/**
 * 生成对话标题
 * @param {string} query - 用户问题
 * @returns {string} 截断后的标题
 */
function generateTitle(query) {
  if (!query) return "新对话";
  return query.length > 20 ? query.substring(0, 20) + "..." : query;
}

/**
 * 创建 Ollama 请求配置
 * @returns {Object} http.request 配置对象
 */
function createOllamaRequestOptions() {
  const url = new URL(ollamaUrl);
  return {
    hostname: url.hostname,
    port: url.port || 80,
    path: "/api/chat",
    method: "POST",
    headers: { "Content-Type": "application/json" },
  };
}

/**
 * 创建流状态对象
 * @param {string} chatId - 对话 ID
 * @param {Array} chunks - 检索到的文档块
 * @returns {Object} 流状态对象
 */
function createStreamState(chatId, chunks) {
  return {
    fullAnswer: "",
    saved: false,
    idleTimeoutId: null,
    ollamaReq: null,
    chatId,
    chunks,
  };
}

/**
 * 清除空闲超时计时器
 * @param {Object} state - 流状态对象
 */
function clearIdleTimeout(state) {
  if (state.idleTimeoutId) {
    clearTimeout(state.idleTimeoutId);
    state.idleTimeoutId = null;
  }
}

/**
 * 重置空闲超时计时器
 * @param {Object} state - 流状态对象
 * @param {Function} onChunk - 数据块回调
 * @param {Function} onEnd - 结束回调
 * @param {Function} reject - Promise reject 函数
 */
function resetIdleTimeout(state, onChunk, onEnd, reject) {
  clearIdleTimeout(state);
  state.idleTimeoutId = setTimeout(() => {
    logger.error("Stream idle timeout: no data received for", chunkTimeout, "ms");
    state.ollamaReq.destroy();
    if (state.chatId && state.fullAnswer) {
      chatService.updateChatAnswer(state.chatId, state.fullAnswer, state.chunks).catch(e => logger.error('Update partial answer (idle timeout) failed:', e));
    }
    if (onChunk) onChunk(JSON.stringify({ code: 500, msg: "响应超时，无数据等待过久", data: null }));
    if (onEnd) onEnd();
    reject(new Error("响应超时"));
  }, chunkTimeout);
}

/**
 * 解析 Ollama 流式响应
 * @param {string} rawData - 原始数据
 * @returns {Object|null} 解析后的数据，失败返回 null
 */
function parseOllamaStreamData(rawData) {
  try {
    const data = JSON.parse(rawData);
    if (data.error) {
      return { error: data.error };
    }
    return {
      content: data.message?.content || '',
      done: data.done || false,
    };
  } catch (e) {
    return null;
  }
}

/**
 * 处理流数据
 * @param {Object} state - 流状态对象
 * @param {Buffer} chunk - 数据块
 * @param {Function} onChunk - 数据块回调
 * @param {Function} onEnd - 结束回调
 * @param {Function} resolve - Promise resolve 函数
 * @param {Function} reject - Promise reject 函数
 */
function handleStreamData(state, chunk, onChunk, onEnd, resolve, reject) {
  resetIdleTimeout(state, onChunk, onEnd, () => {});
  const rawData = chunk.toString();
  const parsed = parseOllamaStreamData(rawData);

  if (!parsed || parsed.error) {
    if (parsed?.error) {
      if (onChunk) onChunk(JSON.stringify({ code: 500, msg: parsed.error, data: null }));
      if (onEnd) onEnd();
      state.ollamaReq.destroy();
      reject(new Error(parsed.error));
    }
    return;
  }

  state.fullAnswer += parsed.content;

  if (maxAnswerLength && state.fullAnswer.length >= maxAnswerLength) {
    state.fullAnswer = state.fullAnswer.substring(0, maxAnswerLength);
    clearIdleTimeout(state);
    state.ollamaReq.destroy();
    if (onChunk) {
      onChunk(JSON.stringify({ code: 0, msg: 'success', data: { type: 'content', content: '\n\n[内容已截断，超过最大长度限制]\n\n' } }));
    }
    if (state.chatId) {
      chatService.updateChatAnswer(state.chatId, state.fullAnswer, state.chunks).catch(e => logger.error('Update truncated answer failed:', e));
    }
    if (onEnd) onEnd();
    resolve({ chatId: state.chatId, truncated: true });
    return;
  }

  if (parsed.content && onChunk) {
    onChunk(JSON.stringify({ code: 0, msg: 'success', data: { type: 'content', content: parsed.content } }));
  }
}

/**
 * 处理流结束
 * @param {Object} state - 流状态对象
 * @param {Function} onChunk - 数据块回调
 * @param {Function} onEnd - 结束回调
 * @param {Function} resolve - Promise resolve 函数
 */
async function handleStreamEnd(state, onChunk, onEnd, resolve) {
  clearIdleTimeout(state);
  if (state.chatId && state.fullAnswer && !state.saved) {
    try {
      await chatService.updateChatAnswer(state.chatId, state.fullAnswer, state.chunks);
    } catch (e) {
      logger.error("Update chat answer failed:", e);
    }
  }
  if (onChunk) onChunk(JSON.stringify({ code: 0, msg: 'success', data: { type: 'end', chatId: state.chatId } }));
  if (onEnd) onEnd();
  resolve({ chatId: state.chatId });
}

/**
 * 处理流错误
 * @param {Object} state - 流状态对象
 * @param {Error} err - 错误对象
 * @param {Function} onChunk - 数据块回调
 * @param {Function} onEnd - 结束回调
 * @param {Function} reject - Promise reject 函数
 */
function handleStreamError(state, err, onChunk, onEnd, reject) {
  clearIdleTimeout(state);
  logger.error("Ollama request error:", err);
  if (state.chatId && state.fullAnswer) {
    chatService.updateChatAnswer(state.chatId, state.fullAnswer, state.chunks).catch(e => logger.error('Update partial answer (error) failed:', e));
  }
  if (onChunk) onChunk(JSON.stringify({ code: 500, msg: err.message, data: null }));
  if (onEnd) onEnd();
  reject(err);
}

/**
 * 处理流超时
 * @param {Object} state - 流状态对象
 * @param {Function} onChunk - 数据块回调
 * @param {Function} onEnd - 结束回调
 * @param {Function} reject - Promise reject 函数
 */
function handleStreamTimeout(state, onChunk, onEnd, reject) {
  clearIdleTimeout(state);
  logger.error("Ollama request timeout");
  state.ollamaReq.destroy();
  if (state.chatId && state.fullAnswer) {
    chatService.updateChatAnswer(state.chatId, state.fullAnswer, state.chunks).catch(e => logger.error('Update partial answer (timeout) failed:', e));
  }
  if (onChunk) onChunk(JSON.stringify({ code: 500, msg: "LLM 请求超时", data: null }));
  if (onEnd) onEnd();
  reject(new Error("LLM 请求超时"));
}

/**
 * 对话服务
 */
const chatService = {
  /**
   * 构建检索上下文
   * @param {string} query - 用户问题
   * @param {Object} options - 配置选项
   * @returns {Promise<Array>} 检索到的文档块
   */
  async buildContext(query, options = {}) {
    const { knowledgeBaseId, topK = defaultTopK } = options;
    logger.info(`Building context for query: ${query}`);
    const chunks = await retrievalService.hybridSearch(query, { knowledgeBaseId, topK });
    logger.info(`Retrieved ${chunks.length} chunks for context`);
    return chunks;
  },

  /**
   * 保存对话记录
   * @param {string} userId - 用户 ID
   * @param {string} knowledgeBaseId - 知识库 ID
   * @param {string} query - 用户问题
   * @param {string} answer - AI 回答
   * @param {Array} chunks - 检索到的文档块
   * @returns {Promise<Object>} 保存的对话对象
   */
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

  /**
   * 更新对话回答
   * @param {string} chatId - 对话 ID
   * @param {string} answer - AI 回答
   * @param {Array} chunks - 检索到的文档块
   */
  async updateChatAnswer(chatId, answer, chunks) {
    const references = extractReferences(answer, chunks);
    await Chat.findByIdAndUpdate(chatId, {
      $push: { messages: { role: "assistant", content: answer, references } },
      $inc: { messageCount: 1 },
      updatedAt: new Date(),
    });
    logger.info(`Chat answer updated: ${chatId}`);
  },

  /**
   * 获取对话历史列表
   * @param {string} userId - 用户 ID
   * @param {Object} options - 分页选项
   * @returns {Promise<Object>} 分页后的对话列表
   */
  async getChatHistory(userId, options = {}) {
    const { page = 1, pageSize = 10 } = options;
    const skip = (page - 1) * pageSize;

    const [chats, total] = await Promise.all([
      Chat.find({ userId })
        .select('title messageCount knowledgeBaseId createdAt updatedAt')
        .sort({ updatedAt: -1 })
        .skip(skip)
        .limit(pageSize)
        .lean(),
      Chat.countDocuments({ userId }),
    ]);

    return {
      list: chats.map(chat => ({
        id: chat._id,
        title: chat.title,
        messageCount: chat.messageCount,
        knowledgeBaseId: chat.knowledgeBaseId,
        createdAt: chat.createdAt,
        updatedAt: chat.updatedAt,
      })),
      pagination: {
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
      },
    };
  },

  /**
   * 获取单条对话详情
   * @param {string} chatId - 对话 ID
   * @param {string} userId - 用户 ID（用于权限校验）
   * @returns {Promise<Object|null>} 对话详情，未找到返回 null
   */
  async getChatById(chatId, userId) {
    const chat = await Chat.findOne({ _id: chatId, userId }).lean();
    if (!chat) {
      return null;
    }
    return {
      id: chat._id,
      title: chat.title,
      messageCount: chat.messageCount,
      knowledgeBaseId: chat.knowledgeBaseId,
      messages: chat.messages.map(msg => ({
        role: msg.role,
        content: msg.content,
        timestamp: msg.timestamp,
        references: msg.references || [],
      })),
      createdAt: chat.createdAt,
      updatedAt: chat.updatedAt,
    };
  },

  /**
   * 删除对话记录
   * @param {string} chatId - 对话 ID
   * @param {string} userId - 用户 ID（用于权限校验）
   * @returns {Promise<boolean>} 删除是否成功
   */
  async deleteChat(chatId, userId) {
    const result = await Chat.deleteOne({ _id: chatId, userId });
    return result.deletedCount > 0;
  },

  /**
   * 发送问题（非流式）
   * @param {string} query - 用户问题
   * @param {Object} options - 配置选项
   * @returns {Promise<Object>} 回答结果
   */
  async ask(query, options = {}) {
    const { userId, knowledgeBaseId, topK = defaultTopK } = options;
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
    const timeoutId = setTimeout(() => controller.abort(), llmTimeout);

    try {
      const response = await fetch(`${ollamaUrl}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: chatModel,
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

  /**
   * 发送问题（流式响应）
   * @param {string} query - 用户问题
   * @param {Object} options - 配置选项
   * @returns {Object} 包含 promise 和 cancel 的对象
   */
  askStream(query, options = {}) {
    const { userId, knowledgeBaseId, topK = defaultTopK, onChunk, onEnd } = options;

    let cancel;

    const promise = (async () => {
      const chunks = await this.buildContext(query, { knowledgeBaseId, topK });

      if (chunks.length === 0) {
        if (onChunk) onChunk(JSON.stringify({ code: 0, msg: 'success', data: { type: 'end', content: '暂无相关信息' } }));
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

      const requestOptions = createOllamaRequestOptions();

      return new Promise((resolve, reject) => {
        const state = createStreamState(chatId, chunks);

        cancel = () => {
          clearIdleTimeout(state);
          if (state.ollamaReq) {
            state.ollamaReq.destroy();
          }
          if (state.chatId && state.fullAnswer) {
            this.updateChatAnswer(state.chatId, state.fullAnswer, state.chunks).catch(e => logger.error('Update partial answer (client disconnect) failed:', e));
          }
        };

        state.ollamaReq = http.request(requestOptions, async (ollamaRes) => {
          resetIdleTimeout(state, onChunk, onEnd, reject);

          ollamaRes.on("data", (chunk) => {
            handleStreamData(state, chunk, onChunk, onEnd, resolve);
          });

          ollamaRes.on("end", async () => {
            await handleStreamEnd(state, onChunk, onEnd, resolve);
          });
        });

        state.ollamaReq.on("error", (err) => {
          handleStreamError(state, err, onChunk, onEnd, reject);
        });

        state.ollamaReq.on("timeout", () => {
          handleStreamTimeout(state, onChunk, onEnd, reject);
        });

        state.ollamaReq.setTimeout(llmTimeout);

        state.ollamaReq.write(
          JSON.stringify({
            model: chatModel,
            messages: [{ role: "user", content: prompt }],
            stream: true,
          })
        );

        state.ollamaReq.end();
      });
    })();

    return { promise, cancel: () => cancel?.() };
  },
};

module.exports = chatService;
