# 冒烟测试文档

## 测试目标

对 RAG-Backend 后端服务进行系统性冒烟测试，确保核心功能链路稳定运行。

## 测试环境准备

### 前置条件

- [x] MongoDB 服务运行中（默认端口 27017）
- [x] Ollama 服务运行中（默认端口 11434）
- [x] Ollama 已加载 `nomic-embed-text` 嵌入模型
- [x] Ollama 已加载 `qwen3.5:4b` 对话模型
- [x] 后端服务已启动（默认端口 3000）
- [x] 已上传测试文档到知识库

### 环境检查命令

```bash
# 检查 MongoDB
mongosh --eval "db.adminCommand('ping')"

# 检查 Ollama
curl http://localhost:11434/api/tags

# 检查后端
curl http://localhost:3000/api/v1/auth/login -X POST -H "Content-Type: application/json" -d '{"username":"admin","password":"admin123"}'
```

---

## 测试清单

### 1. 认证授权模块

| 序号 | 测试项 | 方法 | 预期结果 | 状态 |
|------|--------|------|----------|------|
| 1.1 | 正确账号登录 | POST /auth/login | 返回 token | ☐ |
| 1.2 | 错误密码登录 | POST /auth/login | 返回 401 | ☐ |
| 1.3 | 不存在账号登录 | POST /auth/login | 返回 401 | ☐ |
| 1.4 | 无 Token 访问受保护接口 | GET /knowledge | 返回 401 | ☐ |
| 1.5 | 登出接口 | POST /auth/logout | Token 失效 | ☐ |

### 2. 知识库管理模块

| 序号 | 测试项 | 方法 | 预期结果 | 状态 |
|------|--------|------|----------|------|
| 2.1 | 创建知识库 | POST /knowledge | 返回知识库信息 | ☐ |
| 2.2 | 获取知识库列表 | GET /knowledge | 返回列表和分页 | ☐ |
| 2.3 | 获取单个知识库 | GET /knowledge/:id | 返回知识库详情 | ☐ |
| 2.4 | 更新知识库 | PUT /knowledge/:id | 返回更新后信息 | ☐ |
| 2.5 | 删除知识库 | DELETE /knowledge/:id | 返回成功 | ☐ |

### 3. 文档处理模块

| 序号 | 测试项 | 方法 | 预期结果 | 状态 |
|------|--------|------|----------|------|
| 3.1 | 上传 PDF 文档 | POST /documents/upload | 返回 documentId | ☐ |
| 3.2 | 上传 Word 文档 | POST /documents/upload | 返回 documentId | ☐ |
| 3.3 | 上传 TXT 文档 | POST /documents/upload | 返回 documentId | ☐ |
| 3.4 | 查看文档列表 | GET /documents | 返回列表 | ☐ |
| 3.5 | 查看文档处理状态 | GET /documents/:id | 返回状态 | ☐ |
| 3.6 | 删除文档 | DELETE /documents/:id | 返回成功 | ☐ |

### 4. 检索功能模块

| 序号 | 测试项 | 方法 | 预期结果 | 状态 |
|------|--------|------|----------|------|
| 4.1 | 向量检索 | GET /retrieval/search | 返回检索结果 | ☐ |
| 4.2 | BM25 检索 | GET /retrieval/bm25 | 返回检索结果 | ☐ |
| 4.3 | 混合检索 | GET /retrieval/hybrid | 返回融合结果 | ☐ |
| 4.4 | 空知识库检索 | GET /retrieval/hybrid | 返回空数组 | ☐ |

### 5. 对话功能模块（核心）

| 序号 | 测试项 | 方法 | 预期结果 | 状态 |
|------|--------|------|----------|------|
| 5.1 | 非流式提问 | POST /chat/ask | 返回完整回答 | ☐ |
| 5.2 | 流式提问 | POST /chat/ask/stream | SSE 流式返回 | ☐ |
| 5.3 | 空知识库提问 | POST /chat/ask | 返回"暂无相关信息" | ☐ |
| 5.4 | 超长问题提问 | POST /chat/ask | 返回错误或截断 | ☐ |
| 5.5 | 流式中断（取消请求） | POST /chat/ask/stream | 部分答案保存 | ☐ |
| 5.6 | 无效 knowledgeBaseId | POST /chat/ask | 正常处理 | ☐ |

### 6. 历史管理模块

| 序号 | 测试项 | 方法 | 预期结果 | 状态 |
|------|--------|------|----------|------|
| 6.1 | 获取历史列表 | GET /chat/history | 返回分页列表 | ☐ |
| 6.2 | 历史列表分页 | GET /chat/history?page=1&pageSize=5 | 返回指定页 | ☐ |
| 6.3 | 获取单条详情 | GET /chat/:id | 返回对话详情 | ☐ |
| 6.4 | 删除对话 | DELETE /chat/:id | 返回成功 | ☐ |
| 6.5 | 删除后查看历史 | GET /chat/history | 对话已移除 | ☐ |
| 6.6 | 访问他人对话 | GET /chat/:id | 返回 404 | ☐ |

---

## 边界情况测试

| 序号 | 测试项 | 方法 | 预期结果 | 状态 |
|------|--------|------|----------|------|
| B.1 | Ollama 不可用时提问 | 停止 Ollama 后提问 | 返回服务不可用提示 | ☐ |
| B.2 | 空查询参数 | GET /retrieval/search?query= | 返回验证错误 | ☐ |
| B.3 | SQL 注入尝试 | query=SELECT * FROM | 安全处理 | ☐ |
| B.4 | 超大 pageSize | GET /chat/history?pageSize=1000 | 受限或正常 | ☐ |

---

## 问题记录

| 序号 | 发现时间 | 问题描述 | 严重程度 | 修复状态 |
|------|----------|----------|----------|----------|
| - | - | - | - | - |

---

## 测试报告

### 测试摘要

- **测试时间**：
- **测试人员**：
- **环境版本**：
- **通过率**：
- **阻塞问题数**：

### 测试结论

□ 通过 - 可进入下一阶段
□ 未通过 - 需要修复后重新测试

---

## 测试脚本

### 基础测试脚本（curl）

```bash
# 1. 登录获取 Token
TOKEN=$(curl -s -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}' | jq -r '.data.token')

# 2. 获取知识库列表
curl -X GET http://localhost:3000/api/v1/knowledge \
  -H "Authorization: Bearer $TOKEN"

# 3. 获取对话历史
curl -X GET http://localhost:3000/api/v1/chat/history \
  -H "Authorization: Bearer $TOKEN"
```

---

## 附录

### 相关文档

- [开发计划](development-plan.md)
- [接口设计](development-plan.md#api-接口设计)

### 版本记录

| 日期 | 版本 | 修改内容 | 修改人 |
|------|------|----------|--------|
| - | - | - | - |
