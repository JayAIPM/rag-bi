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
- [x] 编写数据库连接模块
- [x] 测试数据库连接
- [x] 初始化基础数据模型
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
   - 编写 Express 应用初始化代码
     - 创建主应用入口文件（如 index.js） ✅
     - 加载环境变量 ✅
     - 初始化 Express 应用实例 ✅
     - 配置数据库连接 ✅
     - 注册中间件 ✅
     - 定义基础路由结构 ✅
     - 实现错误处理 ✅
     - 启动服务器 ✅
     - 配置应用监听端口 ✅
   - 配置中间件 ✅
   - 创建基础路由结构 ✅

#### 1.8 验证环境
- [x] 启动服务
- [x] 测试基础接口
- [x] 验证数据库连接状态

### 2. 认证授权模块

- [ ] 实现用户登录接口
  - 接收用户提交的用户名和密码
  - 验证用户凭据
  - 生成 JWT 令牌
  - 返回令牌和用户信息
- [ ] 实现 JWT 认证机制
  - 创建认证中间件
  - 验证请求头中的 JWT 令牌
  - 解析令牌获取用户信息
  - 将用户信息添加到请求对象中
- [ ] 实现 Token 管理（同一用户仅能存在一个有效 Token）
  - 在用户登录时生成新令牌
  - 存储令牌到用户模型中
  - 确保同一用户仅能存在一个有效令牌
  - 在令牌过期或用户登出时更新令牌状态
- [ ] 实现权限验证中间件
  - 检查用户是否有权限访问特定资源
  - 根据用户角色和权限列表进行权限判断
  - 对无权限的请求返回 403 错误
- [ ] 实现用户登出接口
  - 接收用户登出请求
  - 使当前令牌失效
  - 更新用户模型中的令牌状态
  - 返回登出成功响应

### 3. 知识库管理模块

- [ ] 实现知识库创建接口
- [ ] 实现知识库列表接口
- [ ] 实现知识库更新接口
- [ ] 实现知识库删除接口
- [ ] 实现知识库权限管理

### 4. 文档处理模块

- [ ] 实现文档上传接口
- [ ] 实现文档格式解析（PDF/Word/Excel/PPT/TXT/MD）
- [ ] 实现 OCR 扫描件识别
- [ ] 实现语义分块（避免固定大小一刀切）
- [ ] 实现向量化处理
- [ ] 实现向量存储到 LanceDB
- [ ] 实现文档元数据存储到 MongoDB
- [ ] 实现文档列表接口
- [ ] 实现文档删除接口

### 5. 检索引擎模块

- [ ] 实现向量检索功能
- [ ] 实现 BM25 检索功能
- [ ] 实现混合检索策略
- [ ] 实现重排序功能（使用 BGE-Reranker）
- [ ] 实现智能查询重写
- [ ] 实现权限前置过滤

### 6. 对话管理模块

- [ ] 实现对话提问接口
- [ ] 实现多轮对话支持
- [ ] 实现流式响应
- [ ] 实现引用溯源
- [ ] 实现对话历史管理
- [ ] 实现 Query 预处理和拒答逻辑
- [ ] 实现幻觉抑制（Prompt 约束 + 引用标注）

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

### 对话流程
1. 用户提问
2. 权限验证
3. Query 预处理
4. 智能查询重写
5. 混合检索
6. 重排序
7. 上下文构建
8. LLM 生成回答
9. 引用溯源
10. 流式返回结果
11. 对话历史存储

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

## 注意事项

1. **分层解耦**：确保数据处理、检索召回、LLM 推理三层拆开，避免强耦合
2. **故障容错**：实现 LLM 调用、文档解析失败的基础报错和重试机制
3. **分块策略**：实现语义分块 + 章节边界拆分，避免固定大小一刀切
4. **脏数据过滤**：过滤重复文档、空白内容、乱码文本，避免检索噪声
5. **向量召回 + 重排**：实现 top-k 向量召回 + 轻量交叉编码器重排
6. **Query 预处理**：实现无关问题识别 + 无召回内容直接拒答
7. **幻觉抑制**：Prompt 约束 + 引用溯源
8. **会话支持**：保证单次提问的上下文一致性
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