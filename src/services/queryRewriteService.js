const http = require('http');
const logger = require('../utils/logger');
const { QUERY_REWRITE_CONFIG, QUERY_REWRITE_SYSTEM_PROMPT } = require('../config/llm');

const { ollamaUrl, model, timeout, maxTokens, enabled } = QUERY_REWRITE_CONFIG;

/**
 * 创建 Ollama 请求配置
 * @returns {Object} http.request 配置对象
 */
function createOllamaRequestOptions() {
  const url = new URL(ollamaUrl);
  return {
    hostname: url.hostname,
    port: url.port || 80,
    path: "/api/generate",
    method: "POST",
    headers: { "Content-Type": "application/json" },
  };
}

/**
 * 调用 Ollama API 进行查询重写
 * @param {string} originalQuery - 原始查询
 * @returns {Promise<string>} 重写后的查询
 */
function rewriteQueryWithOllama(originalQuery) {
  return new Promise((resolve, reject) => {
    const requestOptions = createOllamaRequestOptions();
    
    const req = http.request(requestOptions, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          
          if (parsed.error) {
            reject(new Error(parsed.error));
            return;
          }
          
          // 提取重写后的查询
          const rewrittenQuery = parsed.response?.trim() || originalQuery;
          resolve(rewrittenQuery);
        } catch (error) {
          logger.error('Failed to parse Ollama response:', error);
          reject(error);
        }
      });
    });
    
    req.on('error', (error) => {
      logger.error('Ollama request error:', error);
      reject(error);
    });
    
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Query rewrite timeout'));
    });
    
    req.setTimeout(timeout);
    
    req.write(
      JSON.stringify({
        model: model,
        prompt: `${QUERY_REWRITE_SYSTEM_PROMPT}\n\n【用户查询】\n${originalQuery}`,
        stream: false,
        options: {
          temperature: 0.3, // 低温度以获得更稳定的输出
          num_predict: maxTokens,
        },
      })
    );
    
    req.end();
  });
}

/**
 * 查询重写服务
 */
const queryRewriteService = {
  /**
   * 对用户查询进行智能重写
   * @param {string} originalQuery - 原始查询
   * @returns {Promise<string>} 重写后的查询（如果启用）或原始查询
   */
  async rewriteQuery(originalQuery) {
    // 如果未启用查询重写，直接返回原始查询
    if (!enabled) {
      logger.info('Query rewrite is disabled, using original query');
      return originalQuery;
    }
    
    logger.info(`Rewriting query: "${originalQuery}"`);
    
    try {
      // 调用 Ollama API 进行查询重写
      const rewrittenQuery = await rewriteQueryWithOllama(originalQuery);
      
      logger.info(`Query rewritten: "${originalQuery}" -> "${rewrittenQuery}"`);
      return rewrittenQuery;
    } catch (error) {
      // 重写失败时降级为原始查询
      logger.error(`Query rewrite failed, falling back to original query:`, error);
      return originalQuery;
    }
  },
  
  /**
   * 获取配置信息
   * @returns {Object} 配置对象
   */
  getConfig() {
    return {
      model,
      timeout,
      maxTokens,
      enabled,
    };
  },
};

module.exports = queryRewriteService;
