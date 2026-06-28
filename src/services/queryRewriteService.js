const http = require('http');
const logger = require('../utils/logger');
const { QUERY_REWRITE_CONFIG, QUERY_REWRITE_SYSTEM_PROMPT } = require('../config/llm');

const { ollamaUrl, model, timeout, maxTokens, enabled } = QUERY_REWRITE_CONFIG;

// 启动时打印配置信息
logger.info('========================================');
logger.info('   查询重写配置');
logger.info('========================================');
logger.info(`✅ 启用状态: ${enabled ? '已启用' : '已禁用'}`);
logger.info(`📡 Ollama URL: ${ollamaUrl}`);
logger.info(`🧠 模型: ${model}`);
logger.info(`⏱️  超时: ${timeout}ms`);
logger.info(`📝 最大 Token: ${maxTokens}`);
logger.info('========================================\n');

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
 * 从 Ollama 响应中提取干净的文本内容
 * 处理推理模型（如 deepseek-r1）的思考过程
 * @param {string} response - 原始响应文本
 * @returns {string} 干净的文本内容
 */
function extractCleanContent(response) {
  if (!response) return '';
  
  let cleanText = response;
  
  // 去除思考过程标签（deepseek-r1 等推理模型）
  // 匹配 <think>...</think> 格式（可能有换行）
  cleanText = cleanText.replace(/<think>[\s\S]*?<\/think>/gi, '');
  
  // 去除常见的思考前缀
  const thinkPrefixes = [
    /^(思考中|让我想想|先分析一下|我来分析)：?\s*/i,
    /^(分析|思考| reasoning)：\s*/i,
    /^think\s*/i,
  ];
  
  thinkPrefixes.forEach(prefix => {
    cleanText = cleanText.replace(prefix, '');
  });
  
  // 去除多余空白字符
  cleanText = cleanText
    .replace(/\n{3,}/g, '\n\n')  // 超过2个连续换行改为2个
    .replace(/^\s+|\s+$/g, '')    // 去除首尾空白
    .trim();
  
  return cleanText;
}

/**
 * 调用 Ollama API 进行查询重写
 * @param {string} originalQuery - 原始查询
 * @returns {Promise<string>} 重写后的查询
 */
function rewriteQueryWithOllama(originalQuery) {
  return new Promise((resolve, reject) => {
    logger.info('🔄 [Query Rewrite] 开始调用 Ollama API...');
    logger.info(`   API: ${ollamaUrl}/api/generate`);
    logger.info(`   模型: ${model}`);
    logger.info(`   超时: ${timeout}ms`);
    
    const requestOptions = createOllamaRequestOptions();
    const requestBody = {
      model: model,
      prompt: `${QUERY_REWRITE_SYSTEM_PROMPT}\n\n【用户查询】\n${originalQuery}`,
      stream: false,
      think: false,  // ✅ 显式禁用思考（对于 deepseek-r1 这类推理模型，默认是开启的）
      options: {
        temperature: 0.3,
        num_predict: maxTokens,
      },
    };

    logger.info(`   Prompt 长度: ${requestBody.prompt.length} 字符`);
    logger.info(`   think 模式: ${requestBody.think ? '开启' : '关闭'}（已显式禁用）`);
    logger.info(`   System Prompt:\n${QUERY_REWRITE_SYSTEM_PROMPT.split('\n').map(l => '     ' + l).join('\n')}`);
    logger.info(`   用户查询: "${originalQuery}"`);
    
    const req = http.request(requestOptions, (res) => {
      logger.info(`   响应状态: ${res.statusCode} ${res.statusMessage}`);
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          logger.info(`   原始响应长度: ${data.length} 字符`);
          
          if (parsed.error) {
            logger.error('   ❌ API 返回错误:', parsed.error);
            reject(new Error(parsed.error));
            return;
          }
          
          // 提取重写后的查询
          let rewrittenQuery = parsed.response?.trim() || originalQuery;
          
          // ✅ 新增：从响应中提取干净的内容（去除思考过程）
          const cleanQuery = extractCleanContent(rewrittenQuery);
          if (cleanQuery && cleanQuery !== rewrittenQuery) {
            logger.info('   🔧 已去除推理模型的思考过程');
            rewrittenQuery = cleanQuery;
          }
          
          // 如果清理后为空，使用原始查询
          if (!rewrittenQuery || !rewrittenQuery.trim()) {
            logger.warn('   ⚠️  重写结果为空，使用原始查询');
            rewrittenQuery = originalQuery;
          }
          
          logger.info('   ✅ 成功获取重写结果');
          logger.info(`   原始查询: "${originalQuery}"`);
          logger.info(`   重写查询: "${rewrittenQuery}"`);
          
          if (originalQuery === rewrittenQuery) {
            logger.info('   ℹ️  提示: 重写后查询未变化');
          } else {
            logger.info('   ✨ 查询已优化');
          }
          
          resolve(rewrittenQuery);
        } catch (error) {
          logger.error('   ❌ 解析 Ollama 响应失败:', error.message);
          logger.error('   原始响应:', data.substring(0, 200) + (data.length > 200 ? '...' : ''));
          reject(error);
        }
      });
    });
    
    req.on('error', (error) => {
      logger.error('   ❌ Ollama 请求错误:', error.message);
      reject(error);
    });
    
    req.on('timeout', () => {
      logger.error(`   ❌ 请求超时 (${timeout}ms)`);
      req.destroy();
      reject(new Error('Query rewrite timeout'));
    });
    
    req.setTimeout(timeout);
    
    req.write(JSON.stringify(requestBody));
    req.end();
    
    logger.info('   📤 请求已发送，等待响应...');
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
    logger.info('\n========================================');
    logger.info('   🔄 查询重写服务');
    logger.info('========================================');
    
    // 如果未启用查询重写，直接返回原始查询
    if (!enabled) {
      logger.info('   ⚠️  查询重写功能已禁用');
      logger.info('   ℹ️  如需启用，请设置环境变量 QUERY_REWRITE_ENABLED=true');
      logger.info('   📋 返回原始查询: "' + originalQuery + '"');
      logger.info('========================================\n');
      return originalQuery;
    }
    
    logger.info(`   ✅ 查询重写功能已启用`);
    logger.info(`   📥 输入查询: "${originalQuery}"`);
    
    if (!originalQuery || !originalQuery.trim()) {
      logger.info('   ⚠️  查询为空，跳过重写');
      logger.info('========================================\n');
      return originalQuery;
    }
    
    // ✅ 优化：对于纯英文查询跳过重写（英文查询通常语义已经清晰）
    const hasChinese = /[\u4e00-\u9fa5]/.test(originalQuery);
    if (!hasChinese) {
      logger.info('   ℹ️  检测为纯英文查询，跳过重写（英文语义通常已足够清晰）');
      logger.info('========================================\n');
      return originalQuery;
    }
    
    const startTime = Date.now();
    
    try {
      // 调用 Ollama API 进行查询重写
      const rewrittenQuery = await rewriteQueryWithOllama(originalQuery);
      
      const duration = Date.now() - startTime;
      logger.info(`\n   ⏱️  总耗时: ${duration}ms`);
      logger.info(`   📤 最终查询: "${rewrittenQuery}"`);
      logger.info('========================================\n');
      
      return rewrittenQuery;
    } catch (error) {
      const duration = Date.now() - startTime;
      // 重写失败时降级为原始查询
      logger.error(`   ❌ 查询重写失败 (${duration}ms):`, error.message);
      logger.info('   ⬇️  降级为使用原始查询');
      logger.info(`   📤 最终查询: "${originalQuery}"`);
      logger.info('========================================\n');
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
      ollamaUrl,
    };
  },
};

module.exports = queryRewriteService;
