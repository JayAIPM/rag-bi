require('dotenv').config();
const mongoose = require('mongoose');
const retrievalService = require('./src/services/retrievalService');
const bm25Service = require('./src/services/bm25Service');
const vectorStoreService = require('./src/services/vectorStoreService');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/rag-bi';

async function connectDB() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('MongoDB 连接成功');
  } catch (error) {
    console.error('MongoDB 连接失败:', error.message);
    process.exit(1);
  }
}

async function testHybridSearch() {
  console.log('\n========================================');
  console.log('【5.3 批次3：混合检索】A批次任务测试');
  console.log('========================================\n');

  const testQuery = 'What did Paul Graham do?';
  const knowledgeBaseId = null;
  const limit = 10;
  const k = 60;

  console.log(`测试参数:`);
  console.log(`  - 查询文本: "${testQuery}"`);
  console.log(`  - 知识库ID: ${knowledgeBaseId || '全部'}`);
  console.log(`  - 返回数量: ${limit}`);
  console.log(`  - RRF k值: ${k}`);
  console.log('\n----------------------------------------\n');

  try {
    console.log('Step 0: 初始化BM25索引...');
    await bm25Service.rebuildFromVectorStore(vectorStoreService);
    console.log('BM25索引初始化完成\n');

    console.log('Step 1: 执行混合检索...');
    const startTime = Date.now();
    const results = await retrievalService.hybridSearch(testQuery, {
      knowledgeBaseId,
      limit,
      k
    });
    const endTime = Date.now();
    console.log(`混合检索完成，耗时: ${endTime - startTime}ms\n`);

    console.log('Step 2: 分析检索结果...\n');
    console.log(`总结果数: ${results.length}`);
    console.log('\n----------------------------------------');
    console.log('详细结果:');
    console.log('----------------------------------------\n');

    let vectorOnlyCount = 0;
    let bm25OnlyCount = 0;
    let bothCount = 0;

    results.forEach((result, index) => {
      const sources = result.sources || [];
      const hasVector = sources.includes('vector');
      const hasBM25 = sources.includes('bm25');
      
      if (hasVector && hasBM25) bothCount++;
      else if (hasVector) vectorOnlyCount++;
      else if (hasBM25) bm25OnlyCount++;

      console.log(`[${index + 1}] chunkId: ${result.chunkId || result.id || 'N/A'}`);
      console.log(`    rrfScore: ${result.rrfScore ? result.rrfScore.toFixed(6) : 'N/A'}`);
      console.log(`    sources: ${sources.join(', ')}`);
      console.log(`    content: ${(result.content || result.text || '').substring(0, 100)}...`);
      console.log('');
    });

    console.log('----------------------------------------');
    console.log('统计信息:');
    console.log('----------------------------------------');
    console.log(`  - 仅向量检索命中: ${vectorOnlyCount}`);
    console.log(`  - 仅BM25检索命中: ${bm25OnlyCount}`);
    console.log(`  - 两者同时命中: ${bothCount}`);
    console.log('');

    console.log('----------------------------------------');
    console.log('验证结果:');
    console.log('----------------------------------------');

    let allPassed = true;

    // 验证1: 结果按rrfScore降序排序
    let isSorted = true;
    for (let i = 1; i < results.length; i++) {
      if (results[i].rrfScore > results[i - 1].rrfScore) {
        isSorted = false;
        break;
      }
    }
    console.log(`  [${isSorted ? '✓' : '✗'}] 结果按rrfScore降序排序: ${isSorted ? '通过' : '失败'}`);
    if (!isSorted) allPassed = false;

    // 验证2: 每个结果都有rrfScore
    const allHaveScore = results.every(r => r.rrfScore !== undefined && r.rrfScore > 0);
    console.log(`  [${allHaveScore ? '✓' : '✗'}] 每个结果都有有效的rrfScore: ${allHaveScore ? '通过' : '失败'}`);
    if (!allHaveScore) allPassed = false;

    // 验证3: 每个结果都有sources标记
    const allHaveSources = results.every(r => r.sources && r.sources.length > 0);
    console.log(`  [${allHaveSources ? '✓' : '✗'}] 每个结果都有sources标记: ${allHaveSources ? '通过' : '失败'}`);
    if (!allHaveSources) allPassed = false;

    // 验证4: 存在两种检索同时命中的结果（说明合并逻辑生效）
    console.log(`  [${bothCount > 0 ? '✓' : '✗'}] 存在两种检索同时命中的结果: ${bothCount > 0 ? '通过' : '失败'}`);
    
    // 验证5: RRF分数计算正确性（抽查第一个结果）
    if (results.length > 0) {
      const firstResult = results[0];
      const sources = firstResult.sources || [];
      console.log(`  [i] 第一个结果来源: ${sources.join(', ')}`);
      console.log(`  [i] 第一个结果rrfScore: ${firstResult.rrfScore ? firstResult.rrfScore.toFixed(6) : 'N/A'}`);
    }

    console.log('\n========================================');
    if (allPassed) {
      console.log('测试结果: 全部通过 ✓');
    } else {
      console.log('测试结果: 存在失败项 ✗');
    }
    console.log('========================================\n');

    return allPassed;
  } catch (error) {
    console.error('测试执行失败:', error.message);
    console.error(error.stack);
    return false;
  }
}

async function main() {
  await connectDB();
  await testHybridSearch();
  await mongoose.disconnect();
  console.log('MongoDB 连接已关闭');
  process.exit(0);
}

main();
