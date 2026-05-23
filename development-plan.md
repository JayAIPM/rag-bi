# RAG-Backend 开发计划

## 项目概述

本项目为企业内部知识 RAG 系统的后端服务部分，基于 Node.js 生态开发，支持本地私有化部署，开箱即用，兼顾 POC 演示与生产级落地需求。

## 技术栈

### 核心框架
- **Node.js**：运行时环境
- **Express.js**：Web 服务框架
- **mongoose**：MongoDB ODM

### 数据存储
- **LanceDB**：本地向量数据库
- **MongoDB**：本地结构化数据存储

### RAG 核心
- **LlamaIndex.TS**：文档分块处理（SentenceSplitter）
- **Ollama**：本地 LLM 服务（嵌入模型 + 对话模型）

### 中间件与工具
- **multer**：文件上传处理
- **cors**：跨域请求处理
- **joi**：参数验证
- **winston**：日志管理
- **fs-extra**：增强的文件操作
- **jsonwebtoken**：JWT 认证
- **bcryptjs**：密码加密
- **dotenv**：环境变量管理
- **express-async-errors**：异步错误处理

### 搜索与检索
- **minisearch**：BM25 全文搜索
- **nodejieba**：中文分词器

### 文档解析
- **pdf-parse**：PDF 解析 ✅ 已使用
- **mammoth**：Word 文档解析 ✅ 已使用
- **xlsx**：Excel 解析 ⏸️ 未使用
- **pptx-parser**：PPT 解析 ⏸️ 未使用
- **tesseract.js**：OCR 识别 ⏸️ 未使用

### 关键配置

1. **嵌入模型**：Ollama 本地部署的 `nomic-embed-text` 模型
2. **Ollama 服务地址**：默认 `http://localhost:11434`
3. **分块策略**：块大小 800 ± 200 token，重叠率 100-150 token
4. **支持文档格式**：PDF ✅、Word ✅、Excel ⏸️、PPT ⏸️、TXT ✅、MD ✅、CSV ✅
5. **LLM 模型**：Ollama 本地部署的 `qwen3.5:4b` 模型

## 模块划分与任务分解

### 1. 项目初始化与环境搭建 ✅

- [x] 创建项目目录、初始化 Node.js 项目、安装核心依赖
- [x] 创建 .env 配置、搭建 src 目录结构（controllers、services、models、routes、config、utils）
- [x] 配置 MongoDB 数据库连接，初始化数据模型（用户、角色、知识库、文档、对话、日志）
- [x] 编写 Express 应用入口，注册中间件，定义路由结构，实现错误处理
- [x] 实现自定义错误类和统一错误处理机制
- [x] 配置 winston 日志，记录 HTTP 请求和关键业务日志
- [x] 验证环境：启动服务、测试基础接口、验证数据库连接

### 2. 认证授权模块 ✅

- [x] 实现用户登录接口（用户名密码验证、生成 JWT 令牌）
- [x] 实现 JWT 认证中间件（验证请求头、解析用户信息）
- [x] 实现 Token 管理机制（同一用户仅一个有效 Token，存储于用户模型，24h 有效期）
- [x] 实现权限验证中间件（角色权限校验，403 拒绝无权限请求）
- [x] 实现用户登出接口（使 Token 失效）

### 3. 知识库管理模块

1. **实现知识库创建接口** ✅
   - [x] 接收知识库名称、描述等参数
   - [x] 使用 Joi 进行参数验证
   - [x] 创建知识库记录到 MongoDB
   - [x] 设置创建者为当前用户
   - [x] 返回创建的知识库信息

2. **实现知识库列表接口** ✅
   - [x] 支持分页查询（page、pageSize 参数）
   - [x] 根据用户权限过滤知识库
   - [x] 返回知识库列表及相关统计信息
   - [x] 支持按创建时间排序

3. **实现知识库更新接口** ✅
   - [x] 根据 ID 查询知识库
   - [x] 更新知识库名称、描述等信息
   - [x] 验证权限（仅所有者或管理员可更新）
   - [x] 返回更新后的知识库信息

4. **实现知识库删除接口** ✅
   - [x] 根据 ID 查询知识库
   - [x] 删除知识库记录及关联数据
   - [x] 验证权限（仅管理员可删除）
   - [x] 返回删除成功响应

5. **实现知识库权限管理** 🔜 后续迭代
   - [ ] 配置知识库访问控制列表
   - [ ] 支持角色级权限设置（read、write、admin）
   - [ ] 验证用户对知识库的访问权限
   - [ ] 更新知识库权限配置
   
   > **说明**：当前 owner 字段已实现基本权限隔离（用户只能看到自己的知识库，管理员可以看到所有），满足 MVP 演示需求。accessControl 细粒度权限控制为增强功能，待核心 RAG 流程验证后再根据业务需求实现。

### 4. 文档处理模块

**技术方案**：使用 multer 处理文件上传，LlamaIndex.TS 进行文档解析和向量化，LanceDB 存储向量数据，MongoDB 存储文档元数据。

**关键参数配置**：
- **文件大小限制**：50MB（MVP 演示足够，语料库文件通常不超过 10MB）
- **语义分块参数**：800 ± 200 token，重叠率 100-150 token（适配 qwen3.5:9b 上下文窗口）
- **处理方式**：异步处理，避免前端请求超时，为生产级铺路
- **失败重试策略**：
  - **可重试错误**（自动重试 2-3 次，间隔 2s/5s 递增）：
    - AI 服务端（Ollama）连接超时、响应超时
    - 向量数据库写入超时
    - 网络波动导致的临时错误
  - **不可重试错误**（直接失败，记录原因）：
    - 文件格式不支持、文件损坏
    - 文档内容为空、OCR 识别失败（扫描件）
    - 参数错误、权限不足

**补充建议**：
- 使用 `bullmq`（基于 Redis）或 `bee-queue` 实现异步队列
- 在 Document 模型中增加 `status` 字段（pending/processing/completed/failed）和 `errorMessage` 字段
- 文档上传接口先返回 `documentId`，前端通过轮询获取处理状态
- 使用 LlamaIndex.TS 的 `SentenceSplitter` + 章节边界检测进行分块

---

#### 4.1 文档上传接口 ✅

**前置准备**：
- [x] 检查并安装必要依赖（multer）
- [x] 更新 .env 文件，添加文件存储路径配置（UPLOAD_PATH）
- [x] 更新 Document 模型，增加 status 字段和 errorMessage 字段

**实现内容**：
- [x] 创建文档上传路由（POST /api/v1/documents/upload）
  - 集成认证中间件
  - 集成权限验证中间件（需要 document:upload 权限）
  - 使用 multer 中间件处理文件上传
  - 集成参数验证中间件
- [x] 创建文档上传 Controller
  - 接收文件和知识库 ID 参数
  - 验证知识库存在且用户有权限访问
  - 调用 Service 层创建文档记录
  - 立即返回 documentId 和状态（pending）
  - 触发异步文档处理流程（不阻塞响应）
- [x] 创建文档基础 Service
  - 创建文档记录：生成独特文件名，保存到 uploads 目录，创建 Document 记录到 MongoDB，状态设为 pending
  - 错误处理：捕获异常，更新状态为 failed，记录错误信息

**关键技术点**：
- multer 配置：文件大小限制 50MB，限制文件格式（PDF/Word/Excel/PPT/TXT/MD）
- 文件命名：使用时间戳+随机数避免文件名冲突
- 异步处理：使用 setTimeout 实现简单异步（MVP 简化，暂不引入 Redis）
- 知识库关联：验证知识库存在，更新知识库 documentCount

---

#### 4.2 文档处理核心流程 ⏳

**4.2.1 文档格式解析** ✅
- [x] 支持 PDF 文档解析（使用 pdf-parse）
- [x] 支持 Word 文档解析（使用 mammoth）
- [x] 支持纯文本和 Markdown 解析
- [x] 支持 CSV 格式文档解析

**4.2.2 OCR 扫描件识别** ⏳
> 备注：此功能为可选功能，可后续实现，不影响核心 RAG 流程
- [ ] 集成 tesseract.js 进行图像文字识别
- [ ] 支持扫描件 PDF 的文字提取
- [ ] 支持图片格式（JPG/PNG）的文字识别

**4.2.3 语义分块** ✅
> 备注：父子分层分块结构可后续实现
- [x] 实现基于章节边界的分块策略
- [x] 避免固定大小分块导致的语义断裂
- [ ] 支持父子分层分块结构
- [x] 设置合理的块大小和重叠率（800 ± 200 token，重叠率 100-150）

**4.2.4 向量化处理** ⏳
> 备注：由于 LlamaIndex 0.12.1 版本未提供 OllamaEmbedding，实际实现为直接调用 Ollama API
- [x] 直接调用 Ollama API 进行文本向量化
- [x] 配置本地 nomic-embed-text 模型（默认模型）
- [x] 支持 Ollama 服务地址配置（默认 http://localhost:11434）
- [ ] 处理大文档的分批向量化（可在 4.2.5 完成后回头实现）
- [x] 每个分块生成对应的向量，保留 documentId、chunkIndex、start/end 等元数据

**4.2.5 向量存储到 LanceDB** ⏳
- [x] 初始化 LanceDB 连接
- [x] 创建向量表结构
- [x] 存储向量数据和关联的文本块
- [ ] 建立索引优化检索性能
- [x] 修复数据类型推断问题：确保所有字段有正确类型，避免 null 值导致类型推断失败

**4.2.6 重试机制** ⏳
- [ ] 对可重试错误实现 2-3 次重试
- [ ] 设置重试间隔（2s/5s 递增）
- [ ] 更新处理状态和错误信息

---

#### 4.3 文档管理接口 ✅

**4.3.1 文档查询接口** ✅
- [x] GET /api/v1/documents/:id 查询单个文档状态
- [x] GET /api/v1/documents?knowledgeBaseId=xxx 查询知识库下的文档列表（支持分页）

**4.3.2 文档删除接口** ✅
- [x] DELETE /api/v1/documents/:id 删除文档
  - 删除 MongoDB 中的文档记录
  - 删除本地存储的文件
  - 更新知识库的文档数量
  - 删除 LanceDB 中的关联向量数据

---

#### 4.4 日志集成 ⏳
- [ ] 记录文件上传、解析、分块、向量化各阶段的耗时和状态
- [ ] 记录错误信息和重试情况

### 5. 检索引擎模块

**技术方案说明**：
- **向量检索**：基于 LanceDB 实现向量相似度检索
- **BM25 检索**：使用 minisearch 库实现（LlamaIndex.TS 暂无 BM25Retriever）
  - 集成 nodejieba 中文分词器，支持中文关键词检索
  - 内存索引，服务启动时从 LanceDB 重建
  - 支持模糊搜索和知识库过滤
- **混合检索**：采用 Reciprocal Rank Fusion（RRF，倒数秩融合）策略，无需手动调权重
- **重排序**：使用本地部署的 BGE-Reranker-v2-m3 模型（通过 Ollama 部署）
- **智能查询重写**：复用已有的 Qwen-3.5 9B 模型
- **权限过滤**：检索前验证用户对知识库的访问权限

**实现内容**：

#### 5.1 批次1：基础向量检索 ✅
- [x] 实现向量检索功能（基于 LanceDB）
- [x] 支持指定特定知识库检索
- [x] 支持配置检索返回数量（top-k），默认值：10
- [x] 测试点：验证向量检索接口能正确返回相似文档块

#### 5.2 批次2：BM25检索 ✅
- [x] 实现 BM25 检索功能（使用 minisearch 库）
  - 发现：minisearch 默认不支持中文分词
  - 解决方案：集成 nodejieba 中文分词器
  - 实现内容：创建 bm25Service.js，支持内存索引构建和关键词检索
  - **优化：服务启动时自动从 LanceDB 重建 BM25 索引**
    - 添加 `getAllChunks()` 方法从 LanceDB 读取所有分块
    - 添加 `rebuildFromVectorStore()` 方法重建索引
    - 添加 `deleteByDocumentId()` 方法同步删除索引
    - 修改 index.js 启动时自动重建索引
- [x] 测试点：验证关键词检索接口能正确返回匹配文档块

#### 5.3 批次3：混合检索 ✅
**技术方案说明**：
- **RRF（Reciprocal Rank Fusion）算法**：通过倒数秩融合向量检索和BM25检索结果
- **参数配置**：
  - k值：可配置，默认60
  - 检索策略：向量检索和BM25检索都使用同一个topK值，融合后再取top-10
- **接口路径**：`GET /api/v1/retrieval/hybrid`

**批次A：核心RRF融合算法** ✅
- [x] 在retrievalService.js中实现RRF融合函数
- [x] 在retrievalService.js中新增hybridSearch方法（基础版本）
- [x] 测试点：验证RRF算法能正确计算分数、合并相同chunkId、按融合分数降序排序

**批次B：完整接口集成** ✅
- [x] 在retrievalController.js中新增hybridSearch接口方法
- [x] 在retrieval.js路由中新增混合检索接口（`GET /api/v1/retrieval/hybrid`）
- [x] 在validator.js中更新参数验证（如需要）
- [x] 测试点：验证混合检索接口能正常调用，结果包含向量和BM25的匹配内容，效果优于单一检索

#### 5.4 批次4：权限过滤 ⏳
> 备注：此功能为后续迭代优化功能，当前MVP版本暂不实现
- [ ] 实现权限前置过滤（验证用户知识库访问权限）
- [ ] 测试点：验证无权限用户无法检索到未授权知识库内容

#### 5.5 批次5：智能查询重写 ⏳
> 备注：此功能为后续迭代优化功能，当前MVP版本暂不实现
- [ ] 实现智能查询重写（复用 Qwen-3.5 9B）
- [ ] 测试点：验证查询重写能优化检索效果

#### 5.6 批次6：重排序 ⏳
> 备注：此功能为后续迭代优化功能，当前MVP版本暂不实现
- [ ] 实现重排序功能（BGE-Reranker-v2-m3 通过 Ollama 本地部署）
- [ ] 测试点：验证重排序后结果相关性提升

### 6. 对话管理模块

**技术方案说明**：

#### 基础配置
- **LLM 模型**：Ollama 本地部署的 `qwen3.5:4b` 模型
- **Ollama 服务地址**：`http://localhost:11434`
- **接口路径**：`POST /api/v1/chat/ask`
- **流式响应接口**：`POST /api/v1/chat/ask/stream`
- **请求参数**：
  - `query`：用户提问文本（必填）
  - `knowledgeBaseId`：知识库ID（可选，不传则检索所有知识库）

#### 检索配置
- **检索方式**：调用混合检索（hybridSearch）
- **返回数量**：默认返回 5 条结果给 LLM
- **文档块长度限制**：800 token

#### Prompt 模板设计
- **角色定位**：知识库助手（简单角色，不复杂化）
- **约束规则**：
  1. 只根据提供的参考信息回答，不要编造答案
  2. 如果参考信息中没有相关信息，请如实告知"暂无相关信息"
  3. 回答要简洁、准确，引用相关片段

- **引用格式**：两段式结构
  - 句中标注引用序号（如 [1]、[2]）
  - 回答末尾附上对应原文片段

- **来源标注**：必须标注，且来源信息要精准可追溯

- **字数限制**：
  - 默认控制在 250 字以内
  - 复杂总结类问题不超过 450 字

- **语言要求**：默认以中文回答为主，同时支持根据用户提问的语言自动适配

#### 边界情况处理

**检索结果为空时**：
- 返回固定话术："暂无相关信息"
- 严格执行拒答，绝对禁止兜底、禁止使用预训练知识编造内容

**Ollama 服务不可用时**：
- 返回错误码 500
- 错误信息："大模型服务暂不可用"

**检索结果冲突时**：
- 明确优先级规则，透明化披露冲突，禁止模型自行黑箱决断
- **优先级规则**（按顺序执行）：
  1. **时间优先**：优先采信发布/更新时间最新的文档内容
  2. **层级优先**：若发布时间一致，优先采信来源层级更高的文档（如官方正式制度 > 解读材料 > 培训课件）
  3. **透明披露**：必须在回答中明确标注不同来源的冲突内容，同时说明采信的依据，绝对禁止隐瞒冲突、自行决断

#### Prompt 模板示例
```
【系统提示词】
你是一个专业的知识库问答助手。请根据提供的参考信息回答用户的问题。

【约束规则】
1. 只根据提供的参考信息回答，不要编造答案
2. 如果参考信息中没有相关信息，请如实告知"暂无相关信息"
3. 回答要简洁、准确，在句中标注引用序号[1][2]等
4. 回答末尾附上对应的原文片段作为引用来源
5. 字数控制在250字以内（复杂总结类问题不超过450字）
6. 如果多个来源有冲突，必须明确标注冲突内容并说明采信依据

【参考信息】
{context}

【用户问题】
{query}

【回答】
```

#### 流式响应实现说明

**问题背景**：
Express 作为代理同时处理请求和响应时，默认会缓冲响应数据，导致流式响应无法实时推送。

**解决方案**：
使用 Node.js 原生 `http.request` 发起 Ollama 请求，通过 `pipe` 直接将流式响应透传回客户端，绕过 Express 的响应缓冲机制。

**实现要点**：
- 使用 `http.request` 发起 Ollama API 请求
- 使用 `ollamaRes.pipe(res)` 直接管道传输流式响应
- 设置 SSE 相关响应头（Content-Type、Cache-Control、X-Accel-Buffering等）

**实现内容**：

#### 6.1 批次1：基础对话提问接口 ✅

**批次A：核心对话逻辑（不含LLM调用）** ✅
- [x] 创建 chatService.js 基本结构
- [x] 实现调用混合检索获取文档的逻辑
- [x] 实现上下文构建（将文档拼接为prompt context）
- [x] 用测试脚本验证上下文构建的正确性
- [x] 测试点：验证检索结果能正确获取，上下文能正确构建，Prompt模板格式符合预期

**批次B：完整LLM集成** ✅
- [x] 实现 Ollama API 调用（chat/completions）
- [x] 实现引用信息提取
- [x] 创建 chatController.js 和路由文件
- [x] **流式响应优化**：使用 http.request + pipe 实现流式响应
- [x] 测试点：验证 LLM 能正确生成回答，回答格式符合要求（引用、字数限制），边界情况处理正确，curl 测试流式响应正常

#### 6.2 批次2：对话历史管理 ✅

**批次A：保存对话记录** ✅
- [x] 修改 Chat 模型，添加 `title`、`messageCount` 字段
- [x] 修改 chatService.js，添加 `saveChat()`、`updateChatAnswer()` 方法
- [x] 修改对话接口（ask/askStream），集成保存逻辑
- [x] 测试点：验证提问后能正确保存对话记录

**批次B：历史管理接口** ✅
- [x] 新增获取对话历史列表接口（`GET /api/v1/chat/history`）
- [x] 新增获取单条对话详情接口（`GET /api/v1/chat/:id`）
- [x] 新增删除对话接口（`DELETE /api/v1/chat/:id`）
- [x] 测试点：验证对话历史能正确查询和删除

#### 6.3 批次3：引用溯源与幻觉抑制 ⏳

> **现状分析**（2026-05-23）：
> - Chat 模型引用字段已实现：`messages[].references` 包含 documentId、content、documentName、startIndex、endIndex
> - 引用提取函数已实现：`extractReferences()` 通过正则匹配 [1][2] 等序号
> - System Prompt 已要求标注引用，但约束不够强
> - **已修复**：documentName 字段缺失问题
> - **待完善**：引用质量无法验证

**阶段一：完善引用数据结构**

- [x] 修复 `extractReferences` 函数，确保返回完整引用信息（documentId、documentName、content）
- [x] 补充引用来源元数据（文档类型、截取内容、在回答中的出现位置）

**阶段二：Prompt 优化与幻觉抑制**

> 备注：阶段二「引用溯源接口」已删除，该功能可由现有 `GET /api/v1/chat/:id` 接口覆盖。

- [x] 优化 System Prompt，强化引用约束：
  - 必须在回答末尾列出所有引用来源的详细信息
  - 引用格式：[1] 文档名 - 截取的原文片段
  - 绝对禁止在引用不明确的情况下给出确定性回答
- [x] 修复 documentName 字段缺失问题：
  - 通过 chatService.buildContext 从 MongoDB 查询获取文档名称
  - 避免修改 LanceDB 现有 schema
- [ ] 检索结果冲突处理规则：（暂不具备条件）
  - 需要 chunks 数据包含 timestamp、hierarchyLevel 等元数据字段
  - 时间优先：采信发布/更新时间最新的文档
  - 层级优先：官方正式制度 > 解读材料 > 培训课件
  - 透明披露：明确标注冲突内容，说明采信依据

**阶段三：引用校验机制（可选）**

- [ ] 在保存回答前验证引用序号与参考信息的对应关系
- [ ] 验证引用内容与原始文档的一致性

**测试点**：
- [ ] 验证回答中的引用能正确关联到原始文档
- [ ] 验证引用溯源接口能返回完整的来源信息（已删除此功能，由 `GET /api/v1/chat/:id` 覆盖）
- [ ] 验证冲突场景下的透明披露

#### 6.4 实现多轮对话支持 ✅

**技术方案说明**：在每次对话时，将历史对话记录作为上下文传递给 LLM，使其能够理解上下文关系，实现连贯的多轮对话能力。

**批次1：接口参数调整（仅修改输入，不影响现有逻辑）**
- [x] 修改 `chatController` 的 ask/askStream 接口，增加可选参数 `chatId`
- [x] 修改请求验证 Schema
- [x] 验证点：不影响现有功能，不带 chatId 参数时完全正常

**批次2：历史对话加载逻辑**
- [x] 在 `chatService` 中增加从数据库获取历史对话的方法（复用 getChatById）
- [x] 调整 `buildPrompt` 函数，支持接收历史对话并构建上下文
  - 新增 `buildHistoryContext` 函数：格式化历史对话
  - 新增 `buildPromptWithHistory` 函数：构建带历史的 Prompt
- [x] 在 ask/askStream 方法中调用新函数生成带历史的 Prompt（但暂不传给 LLM）
- [x] 验证点：历史对话能被正确加载，控制台日志中可见完整的带历史 Prompt（暂不传给 LLM） ✅

**批次3：历史对话作为 LLM 上下文**
- [x] 修改 LLM 请求，将 `promptWithHistory` 替换 `prompt` 传给 LLM
- [x] 移除调试日志输出
- [x] 验证点：LLM 能理解上下文，回答符合历史对话逻辑 ✅

**批次4：对话记录更新而非新建**
- [x] 修改 `saveChat` 方法，接收 chatId 参数
- [x] 当 chatId 存在且有效时，追加消息到已有对话
- [x] 更新 messageCount 和 updatedAt 字段
- [x] 更新 ask/askStream 方法中的 saveChat 调用
- [x] 验证点：原对话记录能被正确追加更新，多轮对话历史完整保存 ✅

#### 6.5 实现 Query 预处理和拒答逻辑（后续迭代） ⏳

- [ ] 实现 Query 预处理：拼写纠错、意图识别等
- [ ] 实现拒答逻辑：识别无关问题直接返回 "暂无相关信息"

#### 6.x 健壮性增强（进行中） ⏳

> **说明**：在完成基础对话功能开发后，经分析发现以下健壮性问题需要修复，以确保系统在生产环境中的稳定性和可靠性。

**问题列表及修复思路**：

**问题1：LLM 请求无超时保护** ✅
- 问题描述：Ollama API 调用可能无限等待，无超时限制
- 修复思路：使用 `AbortController` + `AbortSignal.timeout()` 包装 fetch 请求，设置合理超时时间（如 60 秒），超时后主动中断请求
- 状态：已完成，通过 `http.request.setTimeout()` 实现

**问题2：流式读取无最大时长限制** ✅
- 问题描述：`reader.read()` 可能永远阻塞，导致连接挂起
- 修复思路：在读取循环中记录最后接收数据的时间戳，设定最大无数据等待时长（如 30 秒），超时后主动调用 `reader.cancel()` 中断流
- 状态：已完成，通过 `CHUNK_TIMEOUT` 配置和 `resetIdleTimeout()` 函数实现空闲超时检测

**问题3：响应内容无最大长度限制** ✅
- 问题描述：LLM 可能无限输出，导致内存耗尽
- 修复思路：设置最大答案长度阈值（如 5000 字），收集答案时实时判断，超过后截断并发送结束信号
- 状态：已完成，通过 `MAX_ANSWER_LENGTH` 配置实现

**问题4：异常时部分答案未保存** ✅
- 问题描述：流式中途异常退出，`updateChatAnswer()` 未调用，对话记录不完整
- 修复思路：使用 `try-finally` 确保无论如何都执行保存，即使未收集完整答案也保存已接收的部分
- 状态：已完成，在所有异常处理路径（空闲超时、请求错误、请求超时）中添加了部分答案保存逻辑

**问题5：流式结束后无确定性通知** ✅
- 问题描述：客户端难以判断流式是否真正结束
- 修复思路：流结束时发送统一结束信号 `data: {"type":"end","chatId":"xxx"}`，客户端收到后执行最终确认逻辑
- 状态：已完成，发送格式为 `{ code: 0, msg: 'success', data: { type: 'end', chatId: 'xxx' } }`

**问题6：连接断开未感知** ✅
- 问题描述：客户端断开后服务端继续处理，浪费资源
- 修复思路：监听 `req.abort` 或 `res.socket.destroy` 事件，检测到断开后立即取消 `reader`，停止处理
- 状态：已完成，通过监听 `res.socket.on('close')` 和 `req.on('close')` 等事件实现，客户端断开后自动调用 `cancel()` 停止 Ollama 请求并保存部分答案

#### 6.y 代码优化（进行中） ⏳

> **说明**：在完成对话模块核心功能后，对代码质量进行优化，提升可维护性和可测试性。

已完成：**优化1** ✅、**优化2** ✅、**优化3** ✅、**优化4** ✅、**优化6** ✅、**优化7** ✅、**优化8** ✅ | **优化5** ⏸️ 延后

**优化1：chatService.js 代码结构优化** ✅
- 问题描述：`askStream` 方法较长（约 150 行），包含多个职责
- 优化思路：拆分为辅助方法（`createOllamaRequest()`、`handleStreamData()`、`handleStreamError()`）
- 状态：已完成，拆分为 8 个辅助函数：`createOllamaRequestOptions()`、`createStreamState()`、`clearIdleTimeout()`、`resetIdleTimeout()`、`handleStreamData()`、`handleStreamEnd()`、`handleStreamError()`、`handleStreamTimeout()`

**优化2：配置常量集中管理** ✅
- 问题描述：配置常量分散在文件顶部
- 优化思路：抽取到独立的 `config/llm.js` 配置文件，便于统一管理
- 状态：已完成，创建 `src/config/llm.js` 配置文件，包含 LLM_CONFIG、RETRIEVAL_CONFIG、SYSTEM_PROMPT 三个导出对象

**优化3：错误类型细化** ✅
- 问题描述：当前错误都是通用的 `Error`
- 优化思路：定义专用错误类（`LLMTimeoutError`、`LLMConnectionError`、`StreamInterruptedError`），便于前端区分处理
- 状态：已完成，在 `src/utils/error.js` 中新增 4 个 LLM 相关错误类：`LLMTimeoutError`（504）、`LLMConnectionError`（503）、`StreamInterruptedError`（499）、`NoRelevantContentError`（200）

**优化4：流式响应数据格式优化** ✅
- 问题描述：当前流式响应直接转发 Ollama 原始数据
- 优化思路：解析 Ollama 的 JSON 响应，只提取 `content` 字段，减少传输数据量
- 状态：已完成，新增 `parseOllamaStreamData()` 函数解析 Ollama 响应，只提取 `content` 字段发送

**优化5：单元测试覆盖** ⏸️
- 问题描述：对话模块缺少单元测试
- 优化思路：为核心方法添加测试（`saveChat()`、`updateChatAnswer()`、`buildContext()`）
- 状态：延后，当前 MVP 阶段重点是功能验证，测试框架引入成本较高，可后续迭代补齐

**优化6：M4 芯片性能调优（平衡策略）** ✅
- 问题描述：Mac Mini M4 (16GB) 环境下，LLM 生成耗时过长（176秒），影响用户体验
- 优化思路：平衡性能与准确性
  1. 限制回答长度：`maxAnswerLength` 5000 → 800
  2. 简化 System Prompt：6条规则 → 3条核心规则
  3. 适度减少 chunk 截断：`defaultMaxToken` 800 → 200
  4. 增加超时时间：`llmTimeout` 60000 → 120000
- 状态：已完成，已更新 `src/config/llm.js` 配置文件

**优化7：流式返回思考内容** ✅
- 问题描述：qwen3.5:4b 模型启用 Think 模式，思考阶段耗时较长，但未返回思考过程给前端
- 优化思路：修改 `parseOllamaStreamData` 和 `handleStreamData`，提取并返回 `thinking` 字段
- 状态：已完成，思考内容通过 `type: 'thinking'` 返回，前端可实时展示思考过程

**优化8：禁用 LLM 思考模式** ✅
- 问题描述：qwen3.5:4b 模型思考阶段存在重复循环，导致响应时间过长
- 优化思路：通过 Ollama API 的 `think: false` 参数禁用思考模式
- 状态：已完成
  1. 使用原模型 `qwen3.5:4b`
  2. 在 `ask` 和 `askStream` 方法的 API 请求中添加 `"think": false` 参数
  3. 修改 `src/config/llm.js` 使用原模型
- 说明：Modelfile 自定义模型方案无效，Ollama API 的 `think` 参数是唯一有效方案

**优化9：修复对话记录重复保存问题** ✅
- 问题描述：对话记录在 MongoDB 中出现重复的 `assistant` 消息
- 问题原因：
  1. `updateChatAnswer` 使用 `$push` 操作符追加消息
  2. 流式结束时，`handleStreamEnd`、`handleStreamError`、`handleStreamTimeout` 都可能调用保存
  3. 某些场景下保存被触发多次，导致重复消息
- 优化思路（D 方案）：添加状态控制
  1. 在 Controller 层添加 `saved` 标志和 `markSaved` 回调
  2. 在 `askStream` 方法中，保存初始对话后调用 `markSaved()`
  3. 在 Service 层各个 handler 中，保存前检查 `state.saved` 标志
  4. 保存成功后设置 `state.saved = true` 并调用 `markSaved()`
- 涉及文件：
  - `src/controllers/chatController.js` - 添加 `saved` 标志和 `markSaved` 回调
  - `src/services/chatService.js` - 修改 `askStream`、`handleStreamData`、`handleStreamEnd`、`handleStreamError`、`handleStreamTimeout` 及 `cancel` 函数
- 状态：已完成，等待人工复核

### 7. 用户管理模块

- [ ] 实现用户列表接口
- [ ] 实现用户创建接口
- [ ] 实现用户更新接口
- [ ] 实现用户删除接口
- [ ] 实现角色管理接口
- [ ] 实现权限分配接口

### 8. 统计分析模块

- [ ] 实现运营仪表盘核心指标接口
- [ ] 实现文档统计信息接口
- [ ] 实现对话统计信息接口
- [ ] 实现性能监控

### 9. 安全与稳定性

- [ ] 实现输入输出内容安全过滤
- [ ] 实现错误处理机制
- [ ] 实现故障容错（LLM 调用重试、文档解析容错）
- [ ] 实现服务降级策略
- [ ] 实现健康检查机制
- [ ] 实现日志记录

### 10. 部署与验证

- [ ] 本地部署测试
- [ ] Docker 容器化部署
- [ ] 功能验证
- [ ] 性能测试
- [ ] 安全测试

## 核心流程设计

### 文档处理流程
1. 文档上传
2. 格式解析
3. OCR 处理（如需）
4. 语义分块
5. 向量化处理
6. 存储到 LanceDB
7. 元数据存储到 MongoDB

### 对话流程（MVP版本）
1. 用户提问
2. 权限验证
3. 混合检索（调用已实现的 hybridSearch）
4. 上下文构建
5. LLM 生成回答（流式响应）
6. 引用溯源
7. 返回结果
8. 对话历史存储

## 数据模型设计

### 用户模型（User）
| 字段名 | 类型 | 描述 |
| --- | --- | --- |
| _id | ObjectId | 用户唯一标识 |
| username | String | 用户名，登录时使用 |
| password | String | 密码，加密存储 |
| email | String | 邮箱地址 |
| role | ObjectId | 关联的角色 ID |
| organization | String | 所属组织 |
| lastLogin | Date | 最后登录时间 |
| token | String | 当前有效的 JWT 令牌 |
| createdAt | Date | 创建时间 |
| updatedAt | Date | 更新时间 |

### 角色模型（Role）
| 字段名 | 类型 | 描述 |
| --- | --- | --- |
| _id | ObjectId | 角色唯一标识 |
| name | String | 角色名称，唯一标识 |
| permissions | Array<String> | 权限列表 |
| createdAt | Date | 创建时间 |
| updatedAt | Date | 更新时间 |

### 知识库模型（KnowledgeBase）
| 字段名 | 类型 | 描述 |
| --- | --- | --- |
| _id | ObjectId | 知识库唯一标识 |
| name | String | 知识库名称，唯一标识 |
| description | String | 知识库描述 |
| owner | ObjectId | 知识库所有者 ID |
| accessControl | Array<Object> | 访问控制列表，定义不同角色对该知识库的权限 |
| documentCount | Number | 知识库中的文档数量 |
| createdAt | Date | 创建时间 |
| updatedAt | Date | 更新时间 |

### 文档模型（Document）
| 字段名 | 类型 | 描述 |
| --- | --- | --- |
| _id | ObjectId | 文档唯一标识 |
| knowledgeBaseId | ObjectId | 所属知识库 ID |
| name | String | 文档名称 |
| type | String | 文档类型，如 pdf、word、excel 等 |
| size | Number | 文档大小（字节） |
| path | String | 文档存储路径 |
| metadata | Object | 文档元数据 |
| vectorCount | Number | 文档生成的向量数量 |
| createdAt | Date | 创建时间 |
| updatedAt | Date | 更新时间 |

### 对话模型（Chat）
| 字段名 | 类型 | 描述 |
| --- | --- | --- |
| _id | ObjectId | 对话唯一标识 |
| userId | ObjectId | 发起对话的用户 ID |
| knowledgeBaseId | ObjectId | 对话关联的知识库 ID |
| title | String | 对话标题（自动生成或用户指定） |
| messageCount | Number | 消息数量 |
| messages | Array<Object> | 对话消息列表 |
| createdAt | Date | 创建时间 |
| updatedAt | Date | 更新时间 |

#### 消息对象结构
| 字段名 | 类型 | 描述 |
| --- | --- | --- |
| role | String | 消息角色，用户或助手 |
| content | String | 消息内容 |
| timestamp | Date | 消息时间戳 |
| references | Array<Object> | 助手回答时引用的文档片段 |

#### 引用对象结构
| 字段名 | 类型 | 描述 |
| --- | --- | --- |
| documentId | ObjectId | 引用的文档 ID |
| content | String | 引用的文档内容片段 |

### 日志模型（Log）
| 字段名 | 类型 | 描述 |
| --- | --- | --- |
| _id | ObjectId | 日志唯一标识 |
| userId | ObjectId | 操作用户 ID |
| action | String | 操作类型 |
| resource | String | 操作资源 |
| details | Object | 操作详情 |
| ip | String | 操作 IP 地址 |
| createdAt | Date | 创建时间 |

## API 接口设计

### 认证授权接口
- POST /api/v1/auth/login - 用户登录
- GET /api/v1/auth/user-info - 获取用户信息
- POST /api/v1/auth/logout - 用户登出

### 知识库管理接口
- GET /api/v1/knowledge - 获取知识库列表
- POST /api/v1/knowledge - 创建知识库
- PUT /api/v1/knowledge/{id} - 更新知识库
- DELETE /api/v1/knowledge/{id} - 删除知识库

### 文档管理接口
- POST /api/v1/document - 上传文档
- GET /api/v1/document - 获取文档列表
- DELETE /api/v1/document/{id} - 删除文档

### 检索接口
- GET /api/v1/retrieval/search - 向量检索
- GET /api/v1/retrieval/bm25 - BM25检索
- GET /api/v1/retrieval/hybrid - 混合检索

### 对话接口
- POST /api/v1/chat/ask - 发送问题（非流式）
- POST /api/v1/chat/ask/stream - 发送问题（流式响应）
- GET /api/v1/chat/history - 获取对话历史
- GET /api/v1/chat/:id - 获取单条对话详情
- DELETE /api/v1/chat/:id - 删除对话历史

### 用户管理接口
- GET /api/v1/users - 获取用户列表
- POST /api/v1/users - 创建用户
- PUT /api/v1/users/{id} - 更新用户
- DELETE /api/v1/users/{id} - 删除用户

### 角色管理接口
- GET /api/v1/roles - 获取角色列表
- POST /api/v1/roles - 创建角色
- PUT /api/v1/roles/{id} - 更新角色
- DELETE /api/v1/roles/{id} - 删除角色

### 统计分析接口
- GET /api/v1/stats/dashboard - 获取运营仪表盘
- GET /api/v1/stats/documents - 获取文档统计
- GET /api/v1/stats/chat - 获取对话统计

## 开发规范

1. **代码规范**：遵循 ESLint 规范，使用 Prettier 格式化代码
2. **Git 提交规范**：采用 `feat: 新增功能` / `fix: 修复 bug` / `docs: 文档更新` 等格式
3. **接口规范**：严格遵循 RESTful API 设计规范，统一响应格式
4. **安全规范**：所有接口必须做权限校验，敏感数据脱敏
5. **日志规范**：全操作必须留存日志，错误日志必须包含完整上下文
6. **参数校验规范**：
   - 使用 Joi 进行参数校验，定义清晰的验证规则
   - 创建验证中间件，统一处理参数校验逻辑
   - 验证失败时自动抛出标准化的错误
   - 保持 Controller 层简洁，只负责调用 Service 层方法和处理响应
7. **MVC 架构规范**：
   - Router 层：定义 URL 路径和 HTTP 方法，将请求转发给 Controller
   - Controller 层：处理请求和响应，调用 Service 层方法，通过 next(err) 抛出错误
   - Service 层：收敛业务逻辑，处理数据库操作，抛出带有状态码的错误
   - Model 层：定义数据结构，提供数据访问方法
   - 中间件：处理全局错误和其他横切关注点
8. **错误处理规范**：
   - 使用 express-async-errors 自动捕获 async 函数中的错误，避免在每个 Controller 中手动写 try-catch
   - Service 层抛出的错误应包含 statusCode 属性，以便全局错误处理中间件正确处理
   - 全局错误处理中间件统一处理所有错误，返回标准化的错误响应
   - 验证错误由验证中间件统一处理，返回清晰的错误信息
9. **接口响应格式规范**：
   - 所有接口返回格式统一为：{ code, msg, data }
   - 成功响应：code = 0, msg = 'success', data = 具体返回数据
   - 错误响应：code = 状态码（如 400, 401, 500 等）, msg = 错误描述, data = null
   - 确保所有接口遵循此格式，便于前端统一处理
10. **Service 层业务规则校验规范**：
    - 使用自定义错误类：创建继承自 Error 的自定义错误类，包含错误码、状态码等信息
    - 结合 Joi 进行业务规则验证：在 Service 层定义业务规则验证模式，减少 if 条件判断
    - 错误处理一致性：确保所有业务规则校验错误都通过统一的错误处理机制处理
    - 错误信息清晰：提供明确、具体的错误信息，便于调试和前端处理

## 注意事项

1. **分层解耦**：确保数据处理、检索召回、LLM 推理三层拆开，避免强耦合
2. **故障容错**：实现 LLM 调用、文档解析失败的基础报错和重试机制
3. **分块策略**：实现语义分块 + 章节边界拆分，避免固定大小一刀切
4. **脏数据过滤**：过滤重复文档、空白内容、乱码文本，避免检索噪声
5. **向量召回 + 重排**：实现 top-k 向量召回 + 轻量交叉编码器重排（后续迭代）
6. **Query 预处理**：实现无关问题识别 + 无召回内容直接拒答（后续迭代）
7. **幻觉抑制**：Prompt 约束 + 引用溯源
8. **会话支持**：保证单次提问的上下文一致性（多轮对话后续迭代）
9. **内容安全**：过滤政治敏感、违法违规内容
10. **闭环稳定性**：确保全流程稳定可复现
11. **可量化结果**：提供问答准确率、问题解答比例、幻觉率对比等指标
12. **架构可扩展**：支持后续企业级版本的模块替换和升级

## 验收标准

1. **功能完整性**：实现所有核心功能，包括文档处理、检索、对话等
2. **稳定性**：系统能够稳定运行，不会频繁崩溃或报错
3. **准确性**：生成的答案基于知识库内容，幻觉率低
4. **性能**：响应速度快，能够处理并发请求
5. **安全性**：实现基本的安全措施，避免合规风险
6. **可扩展性**：架构设计合理，支持后续迭代和扩展

---

本计划将作为项目开发的指导文档，确保开发过程有序进行，按时完成 MVP 版本的开发。
