const lancedb = require('@lancedb/lancedb');
const path = require('path');

const config = {
  dbPath: process.env.LANCEDB_PATH || path.join(__dirname, '../lancedb'),
  tableName: 'document_chunks'
};

async function checkLanceDB() {
  console.log('========================================');
  console.log('  LanceDB 数据检查工具');
  console.log('========================================\n');
  console.log(`数据库路径: ${config.dbPath}\n`);

  try {
    // 1. 连接数据库
    const db = await lancedb.connect(config.dbPath);
    console.log('✅ 数据库连接成功\n');

    // 2. 列出所有表
    const tables = await db.tableNames();
    console.log(`📋 数据库中的表: ${tables.length} 个`);
    tables.forEach((t, i) => {
      console.log(`   ${i + 1}. ${t}`);
    });
    console.log();

    // 3. 检查 document_chunks 表
    if (!tables.includes(config.tableName)) {
      console.log(`⚠️  表 ${config.tableName} 不存在\n`);
      process.exit(0);
    }

    const table = await db.openTable(config.tableName);
    const allChunks = await table.query().toArray();
    
    console.log(`📊 表 ${config.tableName} 的信息:`);
    console.log(`   - 总记录数: ${allChunks.length}`);
    
    // 4. 按 documentId 分组统计
    const docMap = new Map();
    allChunks.forEach((chunk) => {
      const docId = chunk.documentId || 'unknown';
      if (!docMap.has(docId)) {
        docMap.set(docId, { count: 0, chunks: [] });
      }
      const info = docMap.get(docId);
      info.count++;
      info.chunks.push({
        id: chunk.id,
        chunkIndex: chunk.chunkIndex,
        title: chunk.title || '(无标题)',
        contentLength: chunk.content ? chunk.content.length : 0
      });
    });

    console.log(`   - 文档数: ${docMap.size}\n`);
    console.log('📄 各文档的块分布:\n');
    let docIndex = 1;
    for (const [docId, info] of docMap.entries()) {
      console.log(`   [${docIndex}] Document ID: ${docId}`);
      console.log(`       块数量: ${info.count}`);
      console.log(`       第一个块标题: ${info.chunks[0].title}`);
      console.log(`       内容长度范围: ${info.chunks.map(c => c.contentLength).join(', ')}\n`);
      docIndex++;
    }

    // 5. 显示每个文档的前 2 个块的内容预览
    console.log('📝 内容预览 (每个文档前 2 个块, 前 200 字符):\n');
    let previewIndex = 1;
    for (const [docId, info] of docMap.entries()) {
      console.log(`   [${previewIndex}] Document: ${docId}`);
      info.chunks.slice(0, 2).forEach((chunk, i) => {
        const preview = allChunks.find(c => c.id === chunk.id);
        const content = preview ? (preview.content || '(空)') : '(找不到内容)';
        const truncated = content.substring(0, 200);
        console.log(`       块 ${chunk.chunkIndex} (${chunk.contentLength} 字符):`);
        console.log(`       ${truncated.replace(/\n/g, ' ')}...\n`);
      });
      previewIndex++;
    }

    // 6. 检查字段完整性
    if (allChunks.length > 0) {
      const firstChunk = allChunks[0];
      console.log('🔍 字段检查 (第一个块):\n');
      const fields = [
        'id', 'documentId', 'chunkIndex', 'content', 'embedding',
        'start', 'end', 'title', 'level',
        'chunkType', 'parentId', 'nodeType', 'hierarchyPath', 'parentContent'
      ];
      fields.forEach(field => {
        const value = firstChunk[field];
        const status = value !== undefined ? '✅' : '❌';
        const type = typeof value;
        let display = '';
        if (field === 'embedding') {
          display = `向量维度: ${Array.isArray(value) ? value.length : '不是数组'}`;
        } else if (typeof value === 'string' && value.length > 50) {
          display = `字符串 (${value.length} 字符): "${value.substring(0, 30)}..."`;
        } else {
          display = `值: ${JSON.stringify(value)}`;
        }
        console.log(`   ${status} ${field} (${type}) - ${display}`);
      });
    }

    console.log('\n========================================');
    console.log('  检查完成！');
    console.log('========================================');
    console.log(`\n总记录数: ${allChunks.length}`);
    console.log(`总文档数: ${docMap.size}`);

    if (allChunks.length > 0) {
      console.log('\n⚠️  建议：如果这些文档已从 MongoDB 删除，应清理 LanceDB 中的残留数据');
      console.log('要删除所有数据吗？请再次运行此脚本并传入 --delete 参数');
    } else {
      console.log('\n✅ LanceDB 为空，可安全上传新文档');
    }

  } catch (error) {
    console.error('❌ 检查失败:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

async function deleteAllData() {
  console.log('========================================');
  console.log('  LanceDB 数据清理工具');
  console.log('========================================\n');
  console.log(`数据库路径: ${config.dbPath}`);

  try {
    const db = await lancedb.connect(config.dbPath);
    const tables = await db.tableNames();

    if (!tables.includes(config.tableName)) {
      console.log(`\n✅ 表 ${config.tableName} 不存在，无需清理\n`);
      process.exit(0);
    }

    const table = await db.openTable(config.tableName);
    const countBefore = await table.countRows();
    console.log(`\n📊 当前记录数: ${countBefore}\n`);

    // 获取所有 documentId
    const allChunks = await table.query().select(['documentId']).toArray();
    const uniqueDocs = [...new Set(allChunks.map(c => c.documentId))];
    console.log(`要删除的文档数: ${uniqueDocs.length}`);
    uniqueDocs.forEach((docId, i) => {
      console.log(`   ${i + 1}. ${docId}`);
    });

    // 逐个删除
    console.log('\n⏳ 开始删除...');
    let deletedCount = 0;
    for (const docId of uniqueDocs) {
      await table.delete(`documentId = '${docId}'`);
      deletedCount++;
      console.log(`   ✅ 已删除: ${docId}`);
    }

    const countAfter = await table.countRows();
    console.log(`\n📊 删除后记录数: ${countAfter}`);

    if (countAfter === 0) {
      console.log('\n✅ 清理完成！LanceDB 现在是空的');
    } else {
      console.log(`\n⚠️  警告: 还有 ${countAfter} 条记录未删除`);
    }

  } catch (error) {
    console.error('❌ 删除失败:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// 主逻辑
if (process.argv.includes('--delete')) {
  deleteAllData();
} else {
  checkLanceDB();
}
