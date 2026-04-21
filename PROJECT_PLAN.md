# 项目计划文档

## 1. 项目概述

### 1.1 项目信息
- **项目名称**：rag-bi-backend
- **项目类型**：本地部署的企业级 RAG 知识库系统的后端服务
- **项目目标**：前后端分离架构，基于 Node.js 生态开发，零 Python 依赖，支持本地私有化部署，开箱即用，兼顾 POC 演示与生产级落地需求
- **使用场景**：客服支持系统
- **交付时间**：3天内完成 MVP 验证和轻度演示

### 1.2 核心功能
- **数据接入与治理**：支持 PDF/Word/Excel/PPT/TXT/MD 等基础文档格式，基础 OCR 功能，自动文档处理，增量同步，版本管理，批量处理
- **多策略检索引擎**：向量+BM25 混合检索，重排序，引用溯源，幻觉抑制
- **企业级权限管控**：基础 RBAC 角色，无 SSO 需求
- **问答交互**：基础客服功能，多轮对话，实时响应
- **运营与可观测**：核心指标监控

### 1.3 技术栈
- **后端**：Node.js, Express.js, LlamaIndex.TS, LanceDB, MongoDB
- **AI 模型**：基于 Ollama 运行 Qwen-3.5 9B 生成模型，nomic-embed-text 嵌入模型，BGE-Reranker-v2-m3 重排序模型

## 2. 项目计划

### 2.1 阶段一：项目初始化和环境搭建（Day 1）

#### 2.1.1 任务
- [x] 初始化 Node.js 项目
- [x] 安装核心依赖：Express.js, LlamaIndex.TS, LanceDB, MongoDB, multer, cors
- [x] 配置项目结构和基础文件
- [x] 搭建基础 Express 服务器

#### 2.1.2 技术实现
- 使用 `npm init` 初始化项目
- 安装依赖：`npm install express llamaindex lancedb mongodb multer cors`
- 配置项目结构：
  - `src/`：源代码目录
  - `src/routes/`：API 路由
  - `src/controllers/`：控制器
  - `src/services/`：业务逻辑服务
  - `src/models/`：数据模型
  - `src/middleware/`：中间件
  - `src/utils/`：工具函数
  - `config/`：配置文件

### 2.2 阶段二：核心功能实现（Day 1-2）

#### 2.2.1 任务
- [x] 实现用户认证和权限管理
- [x] 实现知识库管理功能
- [x] 实现文档上传和处理功能
- [x] 实现 RAG 核心功能：检索和生成
- [x] 实现对话历史管理

#### 2.2.2 技术实现
- **用户认证**：使用 JWT 实现用户登录和权限验证
- **知识库管理**：实现知识库的创建、查询、更新和删除
- **文档处理**：使用 LlamaIndex.TS 实现文档解析、分块、向量化和存储
- **RAG 核心**：实现向量+BM25 混合检索，重排序，引用溯源和幻觉抑制
- **对话管理**：实现多轮对话和对话历史存储

### 2.3 阶段三：API 接口开发（Day 2）

#### 2.3.1 任务
- [x] 实现核心 API 接口
- [x] 实现扩展 API 接口
- [x] 配置 Swagger 文档
- [x] 接口测试和调试

#### 2.3.2 技术实现
- **核心接口**：
  - `/auth/login`：用户登录获取 Token
  - `/auth/user-info`：获取当前用户信息与权限
  - `/knowledge`：获取和创建知识库
  - `/document`：上传文档并触发向量化入库
  - `/document/{id}`：删除文档与对应向量数据
  - `/chat/ask`：发送问题，触发 RAG 全流程返回回答
  - `/chat/history`：获取用户对话历史
  - `/stats/dashboard`：获取运营仪表盘核心指标
- **扩展接口**：用户管理、权限管理、系统配置等
- **Swagger 文档**：使用 swagger-jsdoc 和 swagger-ui-express 配置 API 文档

### 2.4 阶段四：数据库设计和实现（Day 2-3）

#### 2.4.1 任务
- [x] 设计 MongoDB 数据模型
- [x] 实现数据模型和数据库连接
- [x] 实现 LanceDB 向量数据库集成
- [x] 数据迁移和初始化

#### 2.4.2 技术实现
- **MongoDB 数据模型**：
  - 用户（User）：id, username, password, role, permissions
  - 知识库（KnowledgeBase）：id, name, description, owner, permissions
  - 文档（Document）：id, name, type, size, path, knowledgeBaseId, version, createdAt, updatedAt
  - 对话（Conversation）：id, userId, knowledgeBaseId, messages, createdAt, updatedAt
  - 消息（Message）：id, conversationId, role, content, references, createdAt
- **LanceDB 集成**：使用 LlamaIndex.TS 内置的 LanceDB 集成，存储文档向量

### 2.5 阶段五：测试和验证（Day 3）

#### 2.5.1 任务
- [x] 功能测试：验证系统的各项功能是否正常工作
- [x] 性能测试：测试系统的响应速度、并发处理能力等性能指标
- [x] 准确性测试：验证 RAG 系统的回答准确性和相关性
- [x] 修复测试中发现的问题

#### 2.5.2 技术实现
- **功能测试**：使用 Postman 或 curl 测试 API 接口
- **性能测试**：使用 ab 或 wrk 测试接口响应时间和并发处理能力
- **准确性测试**：准备测试问题和预期答案，验证系统回答的准确性

### 2.6 阶段六：部署和文档（Day 3）

#### 2.6.1 任务
- [x] 配置本地部署环境
- [x] 准备 Docker 容器化部署方案
- [x] 编写项目文档和使用说明
- [x] 进行 MVP 演示和验证

#### 2.6.2 技术实现
- **本地部署**：提供启动脚本和环境配置说明
- **Docker 部署**：编写 Dockerfile 和 docker-compose.yml
- **文档**：更新 README.md，编写 API 文档和使用说明
- **演示**：准备演示数据和场景，进行 MVP 验证

## 3. 风险评估和应对策略

### 3.1 风险
- **技术风险**：LlamaIndex.TS 和 LanceDB 的稳定性和性能
- **时间风险**：3天内完成 MVP 验证的时间压力
- **质量风险**：快速开发可能导致代码质量和测试覆盖不足

### 3.2 应对策略
- **技术风险**：提前测试 LlamaIndex.TS 和 LanceDB 的核心功能，确保其满足项目需求
- **时间风险**：优先实现核心功能，简化非核心功能，确保 MVP 验证的关键功能完整
- **质量风险**：制定明确的测试计划，确保核心功能的测试覆盖，使用代码规范工具保证代码质量

## 4. 项目交付物

- **源代码**：完整的后端服务代码
- **API 文档**：Swagger 文档和接口说明
- **部署方案**：本地部署和 Docker 容器化部署方案
- **测试报告**：功能测试、性能测试和准确性测试报告
- **使用说明**：项目文档和使用指南
- **MVP 演示**：可进行轻度演示的系统版本

## 5. 后续规划

- **功能扩展**：增加更多高级功能，如高级 OCR、SSO 集成、与工单系统集成等
- **性能优化**：优化系统性能，提高并发处理能力
- **模型优化**：选择和优化 AI 模型，提高回答准确性
- **安全增强**：加强系统安全性，防止数据泄露和攻击
- **用户体验**：优化 API 设计，提高前端集成的便利性
