# RAG 系统 LlamaIndex 迁移方案

**文档版本**: v1.0
**创建日期**: 2026-06-28
**状态**: 待评审

---

## 一、现状分析

### 1.1 当前架构

```
文档处理流程：
  文档上传 → 解析 → 分块(SentenceSplitter) → 向量化 → Qdrant

检索流程：
  查询 → 查询重写 → Qdrant混合检索 → 父章节检索 → 层级增强 → 重排序 → LLM
```

### 1.2 当前分块/层级实现

| 组件 | 实现方式 | 评价 |
|------|---------|------|
| 分块 | SentenceSplitter | 基础，句子级别 |
| 层级关系 | 手动构建 parentContext, hierarchyPath | 繁琐，扩展性差 |
| 检索模式 | Qdrant 混合检索 | 单一检索模式 |
| 上下文管理 | 手动拼接 context | 不可组合 |

### 1.3 当前 LlamaIndex 使用情况

```javascript
// 只用了 SentenceSplitter
const { SentenceSplitter } = require('llamaindex');
const splitter = new SentenceSplitter({ chunkSize: 800, chunkOverlap: 150 });
const chunks = await splitter.splitText(content);
```

**LlamaIndex 0.12.1 实际具备的能力**（已验证）：
- Document / Node 抽象 ✅
- Node relationships（父子节点）✅
- VectorStoreIndex / SummaryIndex / KeywordTableIndex ✅
- Chat Engine（ContextChatEngine）✅
- SimpleNodeParser / SentenceWindowNodeParser ✅

---

## 二、LlamaIndex 核心能力解析

### 2.1 Document + Node 模型

| 特性 | 说明 |
|------|------|
| Document | 顶级文档对象，包含 metadata、relationships |
| Node | 文档块，可带父子关系 |
| relationships | 原生支持父子、兄弟、引用等关系 |

```javascript
// LlamaIndex Document 模型
const doc = new Document({
  text: '文档内容',
  metadata: { source: 'file.pdf', author: 'xxx' },
  relationships: {
    [DocumentRelationship.SOURCE]: parentDocId,
    [DocumentRelationship.PARENT]: parentNodeId,
  }
});
```

### 2.2 多种索引类型

| 索引类型 | 适用场景 | 当前是否有替代 |
|---------|---------|---------------|
| VectorStoreIndex | 语义检索 | Qdrant 可替代 |
| SummaryIndex | 文档摘要、总结类查询 | ❌ 无 |
| KeywordTableIndex | 关键词精确匹配 | ❌ 无 |
| KGIndex | 知识图谱 | ❌ 无 |

### 2.3 Chat Engine

| 引擎 | 适用场景 | 当前是否有替代 |
|------|---------|--------------|
| SimpleChatEngine | 简单单轮问答 | ❌ 无（当前靠 prompt 工程） |
| ContextChatEngine | 多轮对话，自动维护上下文 | ❌ 无 |
| CondensePlusContextChatEngine | Query condensation + 上下文 | ❌ 无 |

### 2.4 Node Parser

| Parser | 能力 | 当前是否有替代 |
|--------|------|--------------|
| SimpleNodeParser | 基础分块 | SentenceSplitter 可替代 |
| SentenceWindowNodeParser | 滑动窗口，捕获窗口上下文 | ❌ 无 |
| SemanticSplitterNodeParser | 语义分块 | ❌ 无 |

---

## 三、迁移方案

### 3.1 方案 A：渐进式增强（推荐）

**思路**：保留 Qdrant 核心检索能力，引入 LlamaIndex 的 Document/Node 抽象和高级检索模式。

```
文档处理流程（方案A）：
  文档上传 → LlamaIndex Document → SimpleNodeParser/SentenceWindowNodeParser
           → Node relationships → Qdrant 存储（保留当前能力）

检索流程（方案A）：
  LlamaIndex StorageContext → VectorIndex + SummaryIndex（组合检索）
                           → Qdrant 混合检索（主检索）
                           → LlamaIndex Chat Engine（多轮对话）
```

**改动范围**：

| 文件 | 改动内容 | 风险 |
|------|---------|------|
| documentService.js | 引入 LlamaIndex Document 封装 | 低 |
| documentSplitterService.js | 改为 LlamaIndex Node Parser | 中 |
| retrievalService.js | 引入 SummaryIndex/KeywordTableIndex | 中 |
| chatService.js（新增） | LlamaIndex Chat Engine | 中 |
| qdrantService.js | 保持不变或简化 | 低 |

### 3.2 方案 B：全面迁移

**思路**：完全采用 LlamaIndex 的存储和检索体系，Qdrant 仅作为 VectorStore 使用。

```
文档处理流程（方案B）：
  文档上传 → LlamaIndex Document → Node Parser
           → VectorStoreIndex(Qdrant) + SummaryIndex + KeywordTableIndex

检索流程（方案B）：
  LlamaIndex QueryEngine → Retriever 组合 → LLM
                        → Chat Engine（多轮对话）
```

**改动范围**：

| 文件 | 改动内容 | 风险 |
|------|---------|------|
| documentService.js | 重写，接入 LlamaIndex StorageContext | 高 |
| documentSplitterService.js | 删除，LlamaIndex 替代 | 高 |
| retrievalService.js | 重写，使用 LlamaIndex QueryEngine | 高 |
| qdrantService.js | 简化为 VectorStore | 中 |
| chatService.js（新增） | LlamaIndex Chat Engine | 高 |

### 3.3 方案对比

| 维度 | 方案A（渐进增强） | 方案B（全面迁移） |
|------|-----------------|-----------------|
| 迁移成本 | 中 | 高 |
| 风险 | 低 | 高 |
| 收益 | 中（逐步获得能力） | 高（完整 LlamaIndex 能力） |
| 复杂度 | 中 | 高 |
| Qdrant 投资保护 | ✅ 完全保留 | ⚠️ 仅作为 VectorStore |
| 检索能力 | Qdrant 混合 + LlamaIndex 摘要/关键词 | LlamaIndex 全家桶 |
| 多轮对话 | 部分支持 | 原生支持 |
| 推荐场景 | 逐步演进、风险可控 | 复杂 RAG、重构无压力 |

---

## 四、推荐方案：方案 A 详细设计

### 4.1 迁移目标

| 目标 | 说明 |
|------|------|
| Document 抽象化 | 引入 LlamaIndex Document/Node，统一文档模型 |
| 保留 Qdrant | 继续使用 Qdrant 混合检索，不做重复投入 |
| 增强检索模式 | 引入 SummaryIndex + KeywordTableIndex |
| 多轮对话 | 引入 ContextChatEngine |

### 4.2 架构设计

```
                    ┌─────────────────┐
                    │  LlamaIndex     │
                    │  Document       │
                    └────────┬────────┘
                             │
              ┌──────────────┼──────────────┐
              ▼              ▼              ▼
    ┌─────────────┐  ┌─────────────┐  ┌─────────────┐
    │ SimpleNode  │  │ Sentence    │  │ Semantic    │
    │ Parser      │  │ Window      │  │ Splitter    │
    └──────┬──────┘  └──────┬──────┘  └──────┬──────┘
           │                │                │
           └────────────────┼────────────────┘
                            ▼
                    ┌─────────────────┐
                    │  Node           │
                    │  relationships   │
                    │  (父子层级)      │
                    └────────┬────────┘
                             │
              ┌──────────────┼──────────────┐
              ▼              ▼              ▼
    ┌─────────────┐  ┌─────────────┐  ┌─────────────┐
    │  Qdrant     │  │ Summary     │  │ Keyword     │
    │  Hybrid     │  │ Index       │  │ Table       │
    │  (主检索)    │  │ (摘要)      │  │ (精确匹配)   │
    └──────┬──────┘  └──────┬──────┘  └──────┬──────┘
           │                │                │
           └────────────────┼────────────────┘
                            ▼
                    ┌─────────────────┐
                    │  QueryEngine    │
                    │  (检索组合)      │
                    └────────┬────────┘
                             │
              ┌──────────────┼──────────────┐
              ▼              ▼              ▼
    ┌─────────────┐  ┌─────────────┐  ┌─────────────┐
    │ Retrieval   │  │ Chat        │  │ Synthesis   │
    │ (检索链)     │  │ Engine      │  │ (生成)       │
    └─────────────┘  └─────────────┘  └─────────────┘
```

### 4.3 核心模块改造

#### 4.3.1 新增 /src/services/llamaindexService.js

```javascript
// LlamaIndex 核心服务
const llamaindexService = {
  // 1. Document 构建
  buildDocument(rawText, metadata) { },

  // 2. Node Parser（支持多种策略）
  parseNodes(document, parserType = 'simple') { },

  // 3. StorageContext（对接 Qdrant）
  createStorageContext() { },

  // 4. SummaryIndex（文档摘要）
  buildSummaryIndex(nodes) { },

  // 5. KeywordTableIndex（关键词索引）
  buildKeywordIndex(nodes) { },

  // 6. Chat Engine
  createChatEngine(retrievers) { },

  // 7. QueryEngine（组合检索）
  createQueryEngine(retrievers) { }
};
```

#### 4.3.2 documentSplitterService.js 改造

| 方法 | 当前实现 | 改造后 |
|------|---------|--------|
| splitFromStructuredNodes | 手动构建层级 | LlamaIndex SentenceWindowNodeParser |
| splitWithSectionDetection | regex 分块 | LlamaIndex SemanticSplitterNodeParser |

#### 4.3.3 retrievalService.js 增强

| 新增功能 | 说明 |
|---------|------|
| summarySearch(query) | 使用 SummaryIndex 检索 |
| keywordSearch(query) | 使用 KeywordTableIndex 检索 |
| combinedSearch(query) | 三种检索结果 RRF 融合 |

#### 4.3.4 新增 /src/services/chatService.js

```javascript
// 多轮对话服务
const chatService = {
  // 创建对话引擎
  createChatEngine(knowledgeBaseId) { },

  // 聊天
  chat(chatId, query, history) { },

  // _condenseQuestion（可选）
  condenseQuestion(history, query) { }
};
```

### 4.4 预估改动

| 文件 | 改动类型 | 预估行数 |
|------|---------|---------|
| 新增 llamaindexService.js | 新增 | ~200行 |
| documentSplitterService.js | 修改 | ~150行 |
| retrievalService.js | 修改 | ~100行 |
| 新增 chatService.js | 新增 | ~150行 |
| documentService.js | 修改 | ~50行 |
| **总计** | - | **~650行** |

---

## 五、实施计划

### 5.1 迭代划分

| 迭代 | 内容 | 预估工时 | 产出 |
|------|------|---------|------|
| **迭代 0** | LlamaIndex 环境验证 | 2h | 确认 Document/Node/Index 可用 |
| **迭代 1** | llamaindexService 基础封装 | 4h | Document + Node Parser |
| **迭代 2** | StorageContext + Qdrant 对接 | 4h | 存储流程验证 |
| **迭代 3** | SummaryIndex + KeywordTableIndex | 4h | 多种检索模式 |
| **迭代 4** | retrievalService 增强 | 4h | combinedSearch |
| **迭代 5** | chatService 实现 | 4h | 多轮对话 |
| **迭代 6** | 集成测试 + 回归测试 | 4h | 完整验证 |

**总预估工时**: ~26 小时

### 5.2 里程碑

| 里程碑 | 验收标准 |
|--------|---------|
| M1: Document 抽象 | LlamaIndex Document 对象可正常创建和解析 |
| M2: Node 层级关系 | 父子节点关系正确建立 |
| M3: Qdrant 存储 | 存储流程不劣化，检索效果持平 |
| M4: 多种检索 | SummaryIndex + KeywordTableIndex 可用 |
| M5: 多轮对话 | ContextChatEngine 正常运作 |

---

## 六、风险评估

| 风险 | 概率 | 影响 | 缓解措施 |
|------|------|------|---------|
| LlamaIndex 0.12.x API 不稳定 | 中 | 中 | 锁定版本，做好回归测试 |
| Qdrant + LlamaIndex 冲突 | 低 | 高 | 方案A保持 Qdrant 独立使用 |
| 检索效果下降 | 中 | 高 | 灰度切流，A/B 对比 |
| 性能下降 | 低 | 中 | 性能监控，逐步压测 |

---

## 七、待评审项

- [ ] 选择方案 A（渐进增强）还是方案 B（全面迁移）
- [ ] 是否需要多轮对话能力（影响 chatService 是否必要）
- [ ] 是否需要 SummaryIndex/KeywordTableIndex（影响迭代 3 是否必要）
- [ ] 当前架构的哪些能力希望在迁移后保留
