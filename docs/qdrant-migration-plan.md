# RAG 系统向量数据库优化方案

**文档版本**: v1.0
**创建日期**: 2026-06-28
**状态**: 待评审

---

## 一、背景与目标

### 1.1 现状分析

当前项目采用 **LanceDB + MiniSearch** 的双组件架构：

| 组件 | 技术选型 | 职责 | 存在问题 |
|------|---------|------|---------|
| 向量存储 | LanceDB (本地文件) | 存储文档向量，支持 ANN 检索 | 分布式能力弱，无内置混合检索 |
| 关键词检索 | MiniSearch (内存索引) | BM25 关键词检索 | 数据量大时内存压力大，无持久化 |
| 结果融合 | 手动实现 RRF | 向量+BM25 结果融合 | 代码复杂，多模块依赖 |

**检索流程**（当前）：
```
用户查询
    ↓
[1] embeddingService.embedText() → 生成向量
    ↓
[2] vectorStoreService.search() → LanceDB 向量检索 (~50ms)
    ↓
[3] bm25Service.search() → MiniSearch BM25 (~20ms)
    ↓
[4] rrfFusion() → 手动结果融合 (应用层)
    ↓
[5] parentVectorSearch() → 第三路父章节检索 (~30ms)
    ↓
[6] enhanceByHierarchy() → 层级增强 (应用层)
    ↓
[7] rerankService.rerank() → 重排序
    ↓
最终结果
```

**总延迟预估**: 100-150ms（3次独立IO + 应用层处理）

### 1.2 优化目标

| 目标 | 指标 | 当前 | 目标 |
|------|------|------|------|
| 降低检索延迟 | 单次混合检索 P99 | ~150ms | ~50ms |
| 简化代码复杂度 | 检索相关 Service 文件数 | 3个 | 1个 |
| 减少内存压力 | MiniSearch 内存占用 | 随数据线性增长 | 0（移除） |
| 提升检索质量 | 混合检索内置优化 | 无 | Qdrant 原生支持 |

---

## 二、Qdrant 方案详解

### 2.1 为什么选择 Qdrant

| 评估维度 | LanceDB | Qdrant | 结论 |
|---------|---------|--------|------|
| **混合检索** | ❌ 不支持 | ✅ 原生支持 sparse+dense | Qdrant 胜 |
| **稀疏向量** | ❌ 需外部实现 | ✅ 内置 sparse vector | Qdrant 胜 |
| **分布式** | ❌ 社区版单节点 | ✅ 原生集群支持 | Qdrant 胜 |
| **预过滤** | ⚠️ 需应用层处理 | ✅ 内置 filter 语法 | Qdrant 胜 |
| **延迟** | ~50ms | ~30ms | Qdrant 胜 |
| **运维复杂度** | 低（本地文件） | 中（需启动服务） | LanceDB 胜 |
| **数据迁移** | - | 支持导入 | - |

### 2.2 Qdrant 核心能力

#### 2.2.1 混合检索（Hybrid Search）

Qdrant 的 `search` API 原生支持：

```json
{
  "vector": [0.1, 0.2, ...],      // 稠密向量（语义）
  "sparse_vector": {              // 稀疏向量（关键词/B25）
    "indices": [10, 25, 30],
    "values": [0.5, 0.8, 0.3]
  },
  "filter": {
    "must": [
      { "key": "documentId", "match": { "value": "kb_001" } }
    ]
  },
  "limit": 10,
  "with_payload": true
}
```

**融合策略**: Qdrant 内置 `rrf`（Reciprocal Rank Fusion），可指定 `score_threshold` 和 `fusion` 模式。

#### 2.2.2 稀疏向量（Sparse Vector）

Qdrant 支持在同一条记录中存储：

- `vector`: 稠密向量（float32）
- `sparse_vector`: 稀疏向量（用于 BM25/SPLADE 等）

这意味着 **BM25 可完全内置到 Qdrant**，无需 MiniSearch 独立索引。

#### 2.2.3 预过滤（Pre-filtering）

```javascript
// 在向量搜索时直接过滤
client.search(collectionName, {
  vector: queryEmbedding,
  filter: {
    must: [
      { key: "documentId", match: { value: knowledgeBaseId } },
      { key: "level", range: { gte: 0, lte: 3 } }
    ]
  },
  limit: 10
});
```

### 2.3 与现有架构对比

| 能力 | 当前架构 | Qdrant 架构 |
|------|---------|-------------|
| 向量检索 | LanceDB ANN | Qdrant ANN ✅ |
| 关键词检索 | MiniSearch (内存) | Qdrant sparse vector ✅ |
| 结果融合 | 应用层 RRF 手动实现 | Qdrant 内置 fusion ✅ |
| 预过滤 | LanceDB where 限制 | Qdrant 内置 filter ✅ |
| 父章节检索 | 应用层多路查询 | 可合并到单次查询 ✅ |
| 重排序 | Ollama rerank（不可用） | 保持现状或接入 Jina ✅ |

---

## 三、迁移方案

### 3.1 数据模型设计

#### 3.1.1 Collection Schema

```javascript
const collectionConfig = {
  name: "document_chunks",
  vectors: {
    size: 1536,  // embedding 维度
    distance: "Cosine"
  },
  sparse_vectors: "bm25",  // 启用稀疏向量
  payload_schema: {
    id: { type: "keyword" },
    documentId: { type: "keyword" },
    documentName: { type: "text" },
    chunkIndex: { type: "integer" },
    content: { type: "text" },
    title: { type: "text" },
    start: { type: "integer" },
    end: { type: "integer" },
    level: { type: "integer" },
    chunkType: { type: "keyword" },
    parentId: { type: "keyword" },
    parentContent: { type: "text" },
    hierarchyPath: { type: "text" },
    // 额外字段
    keywords: { type: "text" },      // 用于稀疏向量提取
    entityTags: { type: "keyword" }  // 实体标签
  }
};
```

#### 3.1.2 数据迁移映射

| LanceDB 字段 | Qdrant payload | 说明 |
|-------------|----------------|------|
| id | id (string) | 唯一标识 |
| documentId | documentId | 文档ID |
| content | content | 文本内容 |
| embedding | vector | 稠密向量 |
| - | sparse_vector | 从 content 提取的 BM25 向量 |
| level, title, parentId... | 同名 | 直接映射 |

### 3.2 代码改动范围

#### 3.2.1 新增文件

| 文件路径 | 职责 | 行数预估 |
|---------|------|---------|
| `src/services/qdrantService.js` | Qdrant 客户端封装 | ~150行 |
| `src/config/qdrant.js` | Qdrant 配置 | ~30行 |

#### 3.2.2 修改文件

| 文件 | 改动内容 | 风险 |
|------|---------|------|
| `src/services/vectorStoreService.js` | 重写为 qdrantService | 中 |
| `src/services/retrievalService.js` | 简化混合检索逻辑 | 低 |
| `src/services/bm25Service.js` | **可删除**，逻辑迁移到 Qdrant | 低 |
| `src/services/documentService.js` | 向量化存储调用变更 | 低 |
| `src/config/index.js` 或新建 | Qdrant 连接配置 | 低 |

#### 3.2.3 预估代码变化

| 文件 | 当前行数 | 改动后行数 | 变化 |
|------|---------|----------|------|
| vectorStoreService.js | 240 | ~150 | -90行 |
| retrievalService.js | 460 | ~200 | -260行 |
| bm25Service.js | 187 | **删除** | -187行 |
| **总计** | **887行** | **~350行** | **-537行 (60%)** |

### 3.3 Service 层改造详解

#### 3.3.1 qdrantService.js（新）

```javascript
// 核心能力封装
const qdrantService = {
  // 1. 存储 chunks（含稠密+稀疏向量）
  async storeChunks(chunksWithEmbeddings) { },

  // 2. 混合检索（单次 API 调用完成 vector + sparse + fusion）
  async hybridSearch(queryEmbedding, sparseVector, options) { },

  // 3. 父章节向量检索
  async searchByParentContent(parentEmbedding, excludeIds, options) { },

  // 4. 分页与过滤
  async scrollFilter(filter, offset, limit) { },

  // 5. 删除（按 documentId）
  async deleteByDocumentId(documentId) { },

  // 6. 全量导出（用于重建索引）
  async getAllChunks() { }
};
```

#### 3.3.2 retrievalService.js（简化后）

```javascript
// 简化后的混合检索流程
async hybridSearch(query, options) {
  // Step 1: 查询重写
  const rewrittenQuery = await queryRewriteService.rewriteQuery(query);

  // Step 2: 单次 Qdrant 混合检索（向量+稀疏+融合一次完成）
  const results = await qdrantService.hybridSearch(
    queryEmbedding,
    sparseVector,
    { knowledgeBaseId, limit }
  );

  // Step 3: 层级增强（保留）
  const enhanced = enhanceByHierarchy(results);

  // Step 4: 重排序（保留）
  const reranked = await rerankService.rerank(rewrittenQuery, enhanced);

  return reranked.slice(0, limit);
}
```

### 3.4 数据迁移方案

#### 3.4.1 迁移步骤

```
[阶段1] 准备阶段
├── 导出 LanceDB 数据为 JSON
├── 创建 Qdrant Collection
└── 验证 Schema 兼容性

[阶段2] 增量迁移
├── 暂停文档写入
├── 导出全量数据
├── 转换格式并导入 Qdrant
├── 验证数据一致性
└── 切换读流量到 Qdrant

[阶段3] 稳定运行
├── 监控检索质量
├── 观察延迟指标
└── 确认无问题后删除 LanceDB 依赖
```

#### 3.4.2 迁移脚本

```javascript
// scripts/migrate-to-qdrant.js
const lancedb = require('@lancedb/lancedb');
const { QdrantClient } = require('@qdrant/qdrant-js');

async function migrate() {
  // 1. 从 LanceDB 导出
  const lancedb_client = await lancedb.connect('./lancedb');
  const table = await lancedb_client.openTable('document_chunks');
  const allChunks = await table.query().toArray();

  // 2. 转换并导入 Qdrant
  const qdrant = new QdrantClient({ url: 'http://localhost:6333' });

  for (const chunk of allChunks) {
    await qdrant.upsert('document_chunks', {
      points: [{
        id: chunk.id,
        vector: chunk.embedding,
        sparse_vector: extractSparseVector(chunk.content), // BM25 稀疏化
        payload: { /* mapping */ }
      }]
    });
  }
}
```

---

## 四、风险评估

### 4.1 风险矩阵

| 风险 | 概率 | 影响 | 缓解措施 |
|------|------|------|---------|
| Qdrant 服务宕机 | 低 | 高 | 保留 LanceDB 作为降级方案 |
| 数据迁移丢失 | 中 | 高 | 迁移前完整备份，验证后切换 |
| 检索质量下降 | 低 | 高 | 灰度切流，A/B 对比验证 |
| 稀疏向量提取效果差 | 中 | 中 | 复用现有 MiniSearch 的 jieba 分词逻辑 |
| 向量维度不匹配 | 低 | 高 | 迁移前校验 embedding 模型配置 |

### 4.2 降级方案

```
Qdrant 服务异常
    ↓
检测到 Qdrant 不可用
    ↓
降级到 LanceDB（保留当前实现）
    ↓
记录错误日志
    ↓
继续服务（可能降级到单向量检索）
```

---

## 五、实施计划

### 5.1 迭代划分

| 迭代 | 内容 | 预估工时 | 产出 |
|------|------|---------|------|
| **迭代 0** | 环境搭建 + 数据迁移验证 | 4h | 迁移脚本 + 数据验证报告 |
| **迭代 1** | qdrantService 基础封装 | 4h | 可用的向量存储服务 |
| **迭代 2** | retrievalService 接入 + 混合检索 | 4h | 完整混合检索流程 |
| **迭代 3** | BM25 迁移（删除 MiniSearch） | 2h | 移除 bm25Service |
| **迭代 4** | 灰度切流 + 质量验证 | 4h | 生产验证报告 |
| **迭代 5** | 清理旧代码 + 文档更新 | 2h | 代码仓库清理 |

**总预估工时**: ~20 小时

### 5.2 里程碑

| 里程碑 | 验收标准 |
|--------|---------|
| M1: 数据迁移完成 | 全量数据从 LanceDB 迁移到 Qdrant，校验通过 |
| M2: 基础检索可用 | Qdrant 向量检索延迟 < 50ms，召回率持平 |
| M3: 混合检索可用 | 单次 API 完成混合检索，效果验证通过 |
| M4: 生产切换 | 100% 流量切换到 Qdrant，监控指标正常 |

---

## 六、性价比总结

### 6.1 投入产出比

| 投入项 | 成本 |
|--------|------|
| 开发工时 | ~20h |
| 运维成本 | Qdrant 服务（可本地部署） |
| 风险成本 | 降级方案准备 ~2h |

| 产出项 | 收益 |
|--------|------|
| 代码简化 | -537行 (60%) |
| 延迟降低 | ~100ms → ~50ms (50%提升) |
| 内存优化 | MiniSearch 内存占用归零 |
| 架构升级 | 支持分布式、快照备份等 |
| 长期维护 | 减少 2 个外部依赖 |

### 6.2 最终结论

| 维度 | 评估 |
|------|------|
| **技术价值** | ⭐⭐⭐⭐⭐ 混合检索原生支持，架构大幅简化 |
| **商业价值** | ⭐⭐⭐⭐ 检索性能提升，用户体验优化 |
| **迁移风险** | ⭐⭐⭐ 中等，可通过降级方案控制 |
| **推荐优先级** | **P0 - 建议立即启动** |

---

## 七、待评审项

- [ ] Qdrant 部署方式确认（Docker / 本地 / 云服务）
- [ ] 迁移期间服务降级策略确认
- [ ] 检索质量验证标准（A/B 测试方案）
- [ ] 是否需要保留 LanceDB 作为永久降级方案
- [ ] 稀疏向量提取方案（复用 jieba 或使用 Qdrant 内置）
