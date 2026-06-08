const http = require('http');
const https = require('https');
const logger = require('../utils/logger');
const { RERANK_CONFIG, LLM_CONFIG } = require('../config/llm');

// 注意：Ollama 目前不支持 /api/rerank 端点，所以此功能目前默认禁用
const { model, timeout, topK, candidateCount, enabled } = RERANK_CONFIG;
const ollamaUrl = LLM_CONFIG.ollamaUrl;

// 内部标记：标记此功能不可用
const RERANK_FEATURE_AVAILABLE = false;

/**
 * 调用 Ollama API 进行文档重排序
 * @param {string} query - 查询文本
 * @param {Array} documents - 候选文档列表
 * @returns {Promise<Array>} 排序后的文档列表
 */
function rerankWithOllama(query, documents) {
  return new Promise((resolve, reject) => {
    // 正确构建 URL，参考 embeddingService.js 的实现方式
    const url = new URL('/api/rerank', ollamaUrl);
    const requestBody = JSON.stringify({
      model: model,
      query: query,
      documents: documents.map(doc => doc.content || ''),
      top_k: topK,
    });

    // 根据协议选择 http 或 https 模块
    const client = url.protocol === 'https:' ? https : http;
    
    // 构建请求选项
    const requestOptions = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(requestBody)
      }
    };

    logger.info('========== 重排序请求 ==========');
    logger.info(`Ollama URL: ${ollamaUrl}`);
    logger.info(`完整 API URL: ${url}`);
    logger.info(`协议: ${url.protocol}`);
    logger.info(`模型: ${model}`);
    logger.info(`查询: ${query}`);
    logger.info(`候选文档数: ${documents.length}`);
    logger.info(`Top-K: ${topK}`);
    logger.info('请求参数:', requestBody);
    
    const req = client.request(requestOptions, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          logger.info('========== 重排序响应 ==========');
          logger.info(`响应状态码: ${res.statusCode}`);
          logger.info('原始响应:', data);
          
          const parsed = JSON.parse(data);
          
          if (parsed.error) {
            logger.error('重排序响应错误:', parsed.error);
            reject(new Error(parsed.error));
            return;
          }
          
          // 解析重排序响应
          // 响应格式: { results: [{ index: 0, relevance_score: 0.95 }, ...] }
          const rerankedIndices = parsed.results
            .sort((a, b) => b.relevance_score - a.relevance_score)
            .map(r => r.index);
          
          logger.info('========== 排序前后对比 ==========');
          logger.info('原始分数:');
          parsed.results.forEach((result, idx) => {
            const doc = documents[result.index];
            const docName = doc.documentName || '未知文档';
            const docTitle = doc.title || '无标题';
            logger.info(`  [${idx}] 文档 ${result.index + 1} - ${docName} | ${docTitle.substring(0, 30)}... | 分数: ${result.relevance_score.toFixed(4)}`);
          });
          
          logger.info('重排序后的顺序:');
          rerankedIndices.forEach((originalIndex, newIndex) => {
            const doc = documents[originalIndex];
            const docName = doc.documentName || '未知文档';
            const docTitle = doc.title || '无标题';
            const result = parsed.results.find(r => r.index === originalIndex);
            const score = result ? result.relevance_score.toFixed(4) : 'N/A';
            logger.info(`  [${newIndex + 1}] 原位置 ${originalIndex + 1} - ${docName} | ${docTitle.substring(0, 30)}... | 分数: ${score}`);
          });
          
          // 根据新的排序重新排列文档
          const rerankedDocuments = rerankedIndices.map(index => ({
            ...documents[index],
            rerankScore: parsed.results[index].relevance_score
          }));
          
          logger.info(`========== 重排序完成 ==========`);
          logger.info(`使用模型: ${model}`);
          logger.info(`排序文档数: ${rerankedDocuments.length}`);
          
          resolve(rerankedDocuments);
        } catch (error) {
          logger.error('Failed to parse rerank response:', error);
          reject(error);
        }
      });
    });
    
    req.on('error', (error) => {
      logger.error('Ollama rerank request error:', error);
      reject(error);
    });
    
    req.on('timeout', () => {
      logger.error('========== 重排序超时 ==========');
      logger.error(`超时时间: ${timeout}ms`);
      req.destroy();
      reject(new Error('Rerank timeout'));
    });
    
    req.setTimeout(timeout);
    req.write(requestBody);
    req.end();
  });
}

/**
 * 重排序服务
 */
const rerankService = {
  /**
   * 对候选文档进行重排序
   * @param {string} query - 查询文本
   * @param {Array} candidates - 候选文档列表
   * @param {Object} options - 配置选项
   * @returns {Promise<Array>} 排序后的文档列表
   */
  async rerank(query, candidates, options = {}) {
    logger.info('========================================');
    logger.info('           重排序服务启动');
    logger.info('========================================');
    
    // 如果功能不可用或未启用，直接返回原始结果
    if (!RERANK_FEATURE_AVAILABLE) {
      logger.warn('⚠️  重排序功能暂不可用');
      logger.warn('   原因: Ollama 不支持 /api/rerank 端点');
      logger.warn('   继续使用原始搜索结果');
      logger.info('========================================\n');
      return candidates;
    }
    
    // 如果未启用重排序，直接返回原始结果
    if (!enabled) {
      logger.warn('⚠️  重排序功能已禁用，返回原始结果');
      logger.warn('   如需启用，请设置环境变量: RERANK_ENABLED=true');
      logger.info('========================================\n');
      return candidates;
    }
    
    logger.info(`✅ 重排序功能已启用`);
    logger.info(`📋 配置信息:`);
    logger.info(`   - 模型: ${model}`);
    logger.info(`   - 候选限制: ${candidateCount}`);
    logger.info(`   - Top-K: ${topK}`);
    logger.info(`   - 超时: ${timeout}ms`);
    
    // 如果候选文档为空或数量不足，跳过重排序
    if (!candidates || candidates.length === 0) {
      logger.warn('⚠️  没有候选文档，跳过重排序');
      logger.info('========================================\n');
      return candidates;
    }
    
    logger.info(`📚 原始候选文档: ${candidates.length} 个`);
    candidates.forEach((candidate, index) => {
      const docName = candidate.documentName || '未知文档';
      const docTitle = candidate.title || '无标题';
      logger.info(`   [${index + 1}] ${docName} - ${docTitle.substring(0, 40)}...`);
    });
    
    // 限制候选文档数量
    const limitedCandidates = candidates.slice(0, candidateCount);
    logger.info(`🔍 开始重排序: ${limitedCandidates.length} 个候选文档`);
    
    try {
      // 记录开始时间
      const startTime = Date.now();
      
      // 调用 Ollama API 进行重排序
      const rerankedResults = await rerankWithOllama(query, limitedCandidates);
      
      // 计算耗时
      const duration = Date.now() - startTime;
      
      logger.info(`⏱️  重排序耗时: ${duration}ms`);
      logger.info(`✅ 重排序完成，返回 ${rerankedResults.length} 个文档`);
      logger.info('========================================\n');
      
      return rerankedResults;
    } catch (error) {
      // 重排序失败时降级为原始结果
      logger.error('========================================');
      logger.error('❌ 重排序失败');
      logger.error('========================================');
      logger.error(`错误信息: ${error.message}`);
      logger.error('⚠️  降级为使用原始结果');
      logger.info('========================================\n');
      return candidates;
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
      topK,
      candidateCount,
      enabled,
    };
  },
};

module.exports = rerankService;
