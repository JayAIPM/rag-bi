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
    console.log('Table does not exist, nothing to clean');
    return;
  }

  const table = await db.openTable(config.tableName);
  const beforeCount = await table.countRows();
  console.log(`Records before delete: ${beforeCount}`);

  const allChunks = await table.query().select(['documentId']).toArray();
  const uniqueDocs = [...new Set(allChunks.map(c => c.documentId))];
  console.log(`Documents to delete: ${uniqueDocs.length}`);
  uniqueDocs.forEach(id => console.log(`  - ${id}`));

  for (const docId of uniqueDocs) {
    try {
      await table.delete(`documentId = '${docId}'`);
      console.log(`Deleted: ${docId}`);
    } catch (e) {
      console.log(`Error deleting ${docId}:`, e.message);
    }
  }

  const afterCount = await table.countRows();
  console.log(`\nRecords after delete: ${afterCount}`);
  console.log(`\n✅ Cleanup complete! LanceDB is now clean (${afterCount} records)`);
}

main().catch(console.error);
