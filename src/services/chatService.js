const retrievalService = require('./retrievalService');
const logger = require('../utils/logger');

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

const config = {
  ollamaUrl: process.env.OLLAMA_URL || 'http://localhost:11434',
  chatModel: process.env.LLM_MODEL || 'qwen3.5:4b'
};

function truncateText(text, maxToken = DEFAULT_MAX_TOKEN) {
  const avgCharsPerToken = 2;
  const maxChars = maxToken * avgCharsPerToken;
  if (text.length <= maxChars) {
    return text;
  }
  return text.substring(0, maxChars) + '...';
}

function buildContext(chunks) {
  if (!chunks || chunks.length === 0) {
    return '无相关参考信息';
  }

  return chunks.map((chunk, index) => {
    const truncatedContent = truncateText(chunk.content || '');
    const docName = chunk.documentName || '未知文档';
    return `[${index + 1}] ${docName}\n${truncatedContent}`;
  }).join('\n\n');
}

function buildPrompt(query, chunks, options = {}) {
  const { maxContextLength = 3000 } = options;

  const context = buildContext(chunks);
  const contextLength = context.length;

  let finalContext = context;
  if (contextLength > maxContextLength) {
    const truncatedChunks = [];
    let currentLength = 0;
    for (const chunk of chunks) {
      const truncatedContent = truncateText(chunk.content || '');
      if (currentLength + truncatedContent.length > maxContextLength * 0.8) {
        break;
      }
      truncatedChunks.push(truncatedContent);
      currentLength += truncatedContent.length;
    }
    finalContext = buildContext(truncatedChunks.map((content, index) => ({
      ...chunks[index],
      content
    })));
  }

  return `${SYSTEM_PROMPT}

【参考信息】
${finalContext}

【用户问题】
${query}

【回答】`;
}

async function chatWithLLM(prompt, options = {}) {
  const { stream = false } = options;
  const ollamaUrl = config.ollamaUrl;
  const model = config.chatModel;

  logger.info(`Calling Ollama API: ${ollamaUrl}/api/chat with model ${model}, stream=${stream}`);

  try {
    const response = await fetch(`${ollamaUrl}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: model,
        messages: [
          {
            role: 'user',
            content: prompt,
          }
        ],
        stream: stream,
      }),
    });

    if (!response.ok) {
      throw new Error(`Ollama API returned ${response.status}`);
    }

    return { response, chunks: [] };
  } catch (error) {
    logger.error(`Ollama API call failed: ${error.message}`);
    throw error;
  }
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
      const chunk = chunks[index];
      references.push({
        index: index + 1,
        documentId: chunk.documentId || null,
        documentName: chunk.documentName || '未知文档',
        content: chunk.content || '',
      });
    }
  }

  return references;
}

const chatService = {
  async buildContext(query, options = {}) {
    const { knowledgeBaseId, topK = DEFAULT_TOP_K } = options;

    logger.info(`Building context for query: ${query}`);

    const chunks = await retrievalService.hybridSearch(query, {
      knowledgeBaseId,
      topK,
    });

    logger.info(`Retrieved ${chunks.length} chunks for context`);

    return chunks;
  },

  async ask(query, options = {}) {
    const { knowledgeBaseId, topK = DEFAULT_TOP_K } = options;

    const chunks = await this.buildContext(query, { knowledgeBaseId, topK });

    if (chunks.length === 0) {
      return {
        query,
        chunks: [],
        answer: null,
        references: [],
        message: '暂无相关信息',
      };
    }

    const context = buildContext(chunks);
    const prompt = buildPrompt(query, chunks);

    logger.info('Sending prompt to LLM...');

    try {
      const response = await fetch(`${config.ollamaUrl}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: config.chatModel,
          messages: [{ role: 'user', content: prompt }],
          stream: false,
        }),
      });

      if (!response.ok) {
        throw new Error(`Ollama API returned ${response.status}`);
      }

      const data = await response.json();
      const answer = data.message?.content || '';
      logger.info('Received answer from LLM');

      const references = extractReferences(answer, chunks);

      return {
        query,
        chunks,
        prompt,
        context,
        answer,
        references,
        message: null,
      };
    } catch (error) {
      logger.error(`Ollama API call failed: ${error.message}`);
      throw error;
    }
  },

  async askStream(query, options = {}) {
    const { knowledgeBaseId, topK = DEFAULT_TOP_K, onChunk, onEnd } = options;

    const chunks = await this.buildContext(query, { knowledgeBaseId, topK });

    if (chunks.length === 0) {
      if (onChunk) {
        onChunk('data: {"type":"end","content":"暂无相关信息"}\n\n');
      }
      if (onEnd) {
        onEnd();
      }
      return;
    }

    const context = buildContext(chunks);
    const prompt = buildPrompt(query, chunks);

    logger.info('Sending prompt to LLM (streaming)...');

    const { response } = await chatWithLLM(prompt, { stream: true });

    if (!response.body) {
      throw new Error('Response body is null');
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();

      if (done) {
        logger.info('Stream completed');
        if (onEnd) {
          onEnd();
        }
        break;
      }

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          try {
            const jsonStr = line.slice(6);
            if (jsonStr === '[DONE]') {
              logger.info('Stream done signal received');
              if (onEnd) {
                onEnd();
              }
              break;
            }
            const data = JSON.parse(jsonStr);
            const content = data.message?.content || '';
            if (content && onChunk) {
              onChunk(`data: ${JSON.stringify({ type: 'content', content })}\n\n`);
            }
          } catch (e) {
            // ignore parse error
          }
        }
      }
    }
  },
};

module.exports = chatService;
