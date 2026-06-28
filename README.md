# RAG-Backend

企业级 RAG 知识库系统的后端服务，基于 Node.js 生态开发，支持本地私有化部署。

## 核心功能

| 功能模块 | 核心能力 |
|---------|---------|
| 数据接入与治理 | 多格式文档（PDF/Word/Excel/TXT/MD）解析、语义分块、层级索引 |
| 混合检索引擎 | Qdrant 原生向量 + 稀疏向量（BM25）混合检索、RRF 融合、重排序 |
| 可控生成 | 幻觉抑制、引用溯源、置信度评估、拒答逻辑 |
| 企业级权限 | RBAC 角色管理、文档级权限、数据隔离 |
| 问答交互 | 多轮对话、流式响应、对话历史管理 |

---

## 技术栈

### 服务端

| 技术组件 | 用途 |
|---------|------|
| Node.js + Express.js | 服务端框架 |
| MongoDB + Mongoose | 结构化数据存储 |
| Qdrant | 向量数据库（原生混合检索 + onDisk 模式） |
| nodejieba | 中文分词（BM25 稀疏向量生成） |
| Ollama | 本地 LLM + 嵌入模型 |

### 部署前置条件

- MongoDB（默认端口 27017）
- Qdrant（默认端口 6333）
- Ollama（默认端口 11434）

---

## 架构设计

```
文档处理流程：
  文档上传 → 格式解析 → 语义分块 → 向量化（dense + sparse） → Qdrant 存储

检索流程：
  用户查询 → 查询重写 → Qdrant Query API（dense + sparse + RRF） → 层级增强 → 重排序 → LLM 生成
```

### 核心模块

| 模块 | 职责 |
|------|------|
| 认证授权 | JWT 登录、Token 管理、RBAC 权限 |
| 知识库管理 | 知识库 CRUD、权限分配 |
| 文档处理 | 多格式解析、智能分块、向量化 |
| 检索引擎 | Qdrant 原生混合检索、层级增强、置信度评估 |
| 对话管理 | 多轮对话、流式响应、引用溯源 |

---

## API 接口

基础路径：`/api/v1`

| 接口 | 方法 | 描述 |
|------|------|------|
| `/auth/login` | POST | 用户登录 |
| `/auth/user-info` | GET | 获取用户信息 |
| `/auth/logout` | POST | 用户登出 |
| `/knowledge` | GET/POST | 知识库列表/创建 |
| `/knowledge/{id}` | PUT/DELETE | 更新/删除知识库 |
| `/document` | POST | 上传文档并向量化 |
| `/document` | GET | 文档列表 |
| `/document/{id}` | DELETE | 删除文档 |
| `/chat/ask` | POST | 问答（同步） |
| `/chat/ask/stream` | POST | 问答（流式） |
| `/chat/history` | GET | 对话历史 |
| `/retrieval/search` | GET | 向量检索 |
| `/retrieval/bm25` | GET | BM25 检索 |
| `/retrieval/hybrid` | GET | 混合检索 |
| `/users` | GET/POST | 用户管理 |
| `/roles` | GET/POST | 角色管理 |
| `/stats/dashboard` | GET | 运营仪表盘 |

---

## 配置说明

环境变量配置（`.env`）：

```bash
# MongoDB
MONGODB_URI=mongodb://localhost:27017/rag-bi

# Qdrant
QDRANT_URL=http://localhost:6333
QDRANT_ON_DISK=true

# Ollama
OLLAMA_BASE_URL=http://localhost:11434
EMBEDDING_MODEL=nomic-embed-text
LLM_MODEL=deepseek-r1:8b
```

---

## 快速启动

```bash
# 安装依赖
npm install

# 启动服务
npm start

# 开发模式（热重载）
npm run dev
```

---

## 项目结构

```
src/
├── config/          # 配置文件
├── constants/       # 常量定义
├── controllers/     # 控制器（请求处理）
├── middleware/      # 中间件（认证、权限、日志）
├── models/         # 数据模型
├── routes/         # 路由定义
├── services/      # 业务逻辑
└── utils/         # 工具函数
```

---

## License

ISC
