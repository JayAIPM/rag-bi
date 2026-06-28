const QDRANT_CONFIG = {
  url: process.env.QDRANT_URL || 'http://localhost:6333',
  apiKey: process.env.QDRANT_API_KEY || null,
  collectionName: 'document_chunks',
  vectorSize: parseInt(process.env.EMBEDDING_DIMENSION) || 1536,
  distanceMetric: 'Cosine',
  sparseVectorName: 'bm25',
  batchSize: parseInt(process.env.QDRANT_BATCH_SIZE) || 100,
  onDisk: process.env.QDRANT_ON_DISK === 'true' || true,
  searchParams: {
    hnsw_ef: 128,
    exact: false
  },
  hybridFusion: 'rrf'
};

module.exports = QDRANT_CONFIG;
