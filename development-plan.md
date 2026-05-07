# RAG-Backend 开发计划

## 项目概述

本项目为企业内部知识 RAG 系统的后端服务部分，基于 Node.js 生态开发，支持本地私有化部署，开箱即用，兼顾 POC 演示与生产级落地需求。

## 技术栈

- **Node.js**：最新稳定版
- **Express.js**：Web 服务框架
- **LlamaIndex.TS**：核心 RAG 引擎
- **LanceDB**：本地向量数据库
- **MongoDB**：本地结构化数据存储
- **mongoose**：MongoDB ODM
- **multer**：文件上传处理
- **cors**：跨域请求处理
- **JWT**：用户认证

### 关键配置说明

1. **嵌入模型**：使用 Ollama 本地部署的 `nomic-embed-text` 模型
2. **Ollama 服务地址**：默认 `http://localhost:11434`
3. **分块策略**：块大小 800 ± 200 token，重叠率 100-150 token
4. **支持文档格式**：PDF、Word、Excel、PPT、TXT、MD、CSV

### 额外依赖

1. **文档解析库**：
   - `pdf-parse` 或 `pdf-lib`：处理 PDF 文档解析
   - `mammoth`：处理 Word 文档解析
   - `xlsx`：处理 Excel 文档解析
   - `pptx-parser`：处理 PPT 文档解析

2. **OCR 库**：
   - `tesseract.js`：纯 JS 实现的 OCR 功能，零 Python 依赖

3. **认证与安全**：
   - `jsonwebtoken`：JWT 令牌生成与验证
   - `bcryptjs`：密码加密存储

4. **环境配置**：
   - `dotenv`：管理环境变量

5. **日志管理**：
   - `winston` 或 `pino`：结构化日志记录

6. **错误处理**：
   - `express-async-errors`：处理异步错误

7. **文件操作**：
   - `fs-extra`：增强的文件系统操作

8. **工具库**：
   - `lodash`：实用工具函数
   - `validator`：输入验证

## 开发时间线

### 总目标
3 天之内实现后端服务的 MVP 版本

## 模块划分与任务分解

### 1. 项目初始化与环境搭建

#### 1.1 创建项目目录
- [x] 确认项目根目录存在（已存在）

#### 1.2 初始化 Node.js 项目
- [x] 运行 `npm init -y` 初始化 package.json
- [x] 配置 package.json 基本信息

#### 1.3 安装核心依赖
- [x] 安装 Express.js 及相关中间件
- [x] 安装 MongoDB 相关依赖
- [x] 安装 LlamaIndex.TS 及相关依赖
- [x] 安装其他必要工具库

#### 1.4 创建环境配置
- [x] 创建 .env 文件模板
- [x] 配置数据库连接信息（基础配置已完成，连接字符串待提供）
- [x] 配置服务器及安全相关参数

#### 1.5 搭建核心目录结构
- [x] 创建 src 目录
- [x] 创建 controllers、services、models、routes 等核心目录
- [x] 创建 config、utils 等辅助目录

#### 1.6 配置数据库连接

1. **编写数据库连接模块** ✅

2. **测试数据库连接** ✅

3. **初始化基础数据模型** ✅
   - [x] 定义用户和角色模型
   - [x] 定义知识库和文档模型
   - [x] 定义对话和日志模型
   - [x] 建立模型间关联
   - [x] 初始化默认数据
     - [x] 初始化角色数据（管理员角色和普通用户角色）
     - [x] 初始化默认管理员用户
     - [x] 初始化默认权限列表
     - [x] 初始化默认示例知识库
   - [x] 同步模型到数据库

#### 1.7 创建基础服务

1. **编写 Express 应用初始化代码** ✅
   - [x] 创建主应用入口文件（如 index.js）
   - [x] 加载环境变量
   - [x] 初始化 Express 应用实例
   - [x] 配置数据库连接
   - [x] 注册中间件
   - [x] 定义基础路由结构
   - [x] 实现错误处理
   - [x] 启动服务器
   - [x] 配置应用监听端口

2. **配置中间件** ✅

3. **创建基础路由结构** ✅

4. **实现自定义错误类** ✅
   - [x] 创建继承自 Error 的自定义错误类
   - [x] 包含错误码、状态码等信息
   - [x] 提供统一的错误处理机制

5. **实现日志管理功能** ✅
   - [x] 安装 winston 日志库
   - [x] 创建日志配置模块，支持多级别日志（error、warn、info、verbose、debug、silly）
   - [x] 配置日志输出方式：控制台输出（开发环境）和文件输出（生产环境）
   - [x] 设置日志文件按日期分割，自动压缩旧日志
   - [x] 创建 Express 日志中间件，记录 HTTP 请求信息（方法、路径、状态码、响应时间）
   - [ ] 在关键业务流程中添加日志记录

#### 1.8 验证环境
- [x] 启动服务
- [x] 测试基础接口
- [x] 验证数据库连接状态

### 2. 认证授权模块

1. **实现用户登录接口** ✅
   - [x] 接收用户提交的用户名和密码
   - [x] 验证用户凭据
   - [x] 生成 JWT 令牌
   - [x] 返回令牌和用户信息

2. **实现 JWT 认证机制** ✅
   - [x] 创建认证中间件
   - [x] 验证请求头中的 JWT 令牌
   - [x] 解析令牌获取用户信息
   - [x] 将用户信息添加到请求对象中

3. **实现 Token 管理（同一用户仅能存在一个有效 Token）** ✅
   - [x] 在用户登录时生成新令牌
   - [x] 存储令牌到用户模型中
   - [x] 确保同一用户仅能存在一个有效令牌
   - [x] 在令牌过期或用户登出时更新令牌状态

4. **实现权限验证中间件** ✅
   - [x] 检查用户是否有权限访问特定资源
   - [x] 根据用户角色和权限列表进行权限判断
   - [x] 对无权限的请求返回 403 错误

5. **实现用户登出接口** ✅
   - [x] 接收用户登出请求
   - [x] 使当前令牌失效
   - [x] 更新用户模型中的令牌状态
   - [x] 返回登出成功响应

#### JWT 令牌使用方式

1. **获取令牌**：通过登录接口 `POST /api/v1/auth/login` 获取 JWT 令牌
2. **携带令牌**：在请求头中添加 `Authorization` 字段，格式为 `Bearer <token>`
3. **访问受保护资源**：使用携带令牌的请求访问需要认证的接口，如 `GET /api/v1/auth/user-info`
4. **登出**：通过登出接口 `POST /api/v1/auth/logout` 使令牌失效

示例请求：
```bash
# 登录获取令牌
curl -X POST http://localhost:3000/api/v1/auth/login -H "Content-Type: application/json" -d '{"username": "admin", "password": "admin123"}'

# 使用令牌访问受保护资源
curl -X GET http://localhost:3000/api/v1/auth/user-info -H "Authorization: Bearer <token>" 

# 登出
curl -X POST http://localhost:3000/api/v1/auth/logout -H "Authorization: Bearer <token>" 
```

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
  - 创建文档记录：生成唯一文件名，保存到 uploads 目录，创建 Document 记录到 MongoDB，状态设为 pending
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
  - 内存索引，服务启动时从 MongoDB 重建
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
- **LLM 调用**：通过 Ollama 本地部署的 Qwen-3.5 9B 模型
- **上下文构建**：将检索到的文档块拼接为 prompt context
- **引用溯源**：记录回答引用的文档片段，支持溯源展示
- **对话历史**：基于 MongoDB 存储对话记录

**实现内容**：

#### 6.1 批次1：基础对话提问接口 ⏳
- [ ] 创建 chatService.js，实现核心对话逻辑
  - 调用混合检索获取相关文档
  - 构建 LLM 输入 prompt
  - 调用 Ollama API 生成回答
  - 提取引用信息
- [ ] 创建 chatController.js，实现对话接口
- [ ] 创建 chat.js 路由文件
- [ ] 测试点：验证对话接口能正确调用LLM并返回回答

#### 6.2 批次2：对话历史管理 ⏳
- [ ] 实现对话历史存储（基于 Chat 模型）
- [ ] 实现获取对话历史列表接口
- [ ] 实现删除对话历史接口
- [ ] 测试点：验证对话历史能正确保存和查询

#### 6.3 批次3：引用溯源与幻觉抑制 ⏳
- [ ] 在回答中标记引用来源
- [ ] 实现引用溯源接口
- [ ] 测试点：验证回答中的引用能正确关联到原始文档

#### 6.4 批次4：高级功能（后续迭代） ⏳
- [ ] 实现多轮对话支持
- [ ] 实现流式响应
- [ ] 实现 Query 预处理和拒答逻辑

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
5. LLM 生成回答
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
- POST /api/v1/chat/ask - 发送问题
- GET /api/v1/chat/history - 获取对话历史
- DELETE /api/v1/chat/history/{id} - 删除对话历史

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
