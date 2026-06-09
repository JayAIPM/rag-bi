const lancedb = require('@lancedb/lancedb');
const path = require('path');

const config = {
  dbPath: path.join(__dirname, '../lancedb'),
  tableName: 'document_chunks'
};

async function main() {
  const db = await lancedb.connect(config.dbPath);
  const tables = await db.tableNames();
  
  if (!tables.includes(config.tableName)) {
    console.log('Table does not exist');
    return;
  }

  const table = await db.openTable(config.tableName);
  const allChunks = await table.query().toArray();
  
  console.log('Total chunks in LanceDB:', allChunks.length);
  
  // Get unique document IDs
  const docIds = [...new Set(allChunks.map(c => c.documentId))];
  console.log('Unique documents:', docIds.length);
  docIds.forEach((id, i) => {
    const count = allChunks.filter(c => c.documentId === id).length;
    console.log(`  ${i + 1}. ${id} (${count} chunks)`);
  });
  
  if (allChunks.length > 0) {
    const first = allChunks[0];
    console.log('\nFields:', Object.keys(first));
    console.log('First chunk content (100 chars:', (first.content || '').substring(0, 100));
  }
}

main().catch(console.error);
