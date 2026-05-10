# 对话管理模块接口文档

## 概述

本文档提供对话管理模块的接口说明，涵盖问答对话、获取对话历史查询、删除对话等功能。当前阶段可测试的接口包括：

1. **POST /api/v1/chat/ask** - 发送问题（非流式）
2. **POST /api/v1/chat/ask/stream** - 发送问题（流式响应）
3. **GET /api/v1/chat/history** - 获取对话历史列表
4. **GET /api/v1/chat/:id** - 获取单条对话详情
5. **DELETE /api/v1/chat/:id** - 删除对话记录

---

## 测试前置条件

### 1. 启动服务

```bash
cd /Users/xiaer/workspace/rag-bi
npm install
npm start
```

服务启动后监听 `http://localhost:3000`

### 2. 获取访问令牌

所有接口均需要认证，需先通过登录接口获取 JWT 令牌：

```bash
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username": "admin", "password": "admin123"}'
```

响应示例：
```json
{
  "code": 0,
  "msg": "success",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "_id": "60d...",
      "username": "admin",
      "role": {...}
    }
  }
}
```

### 3. 可选：获取知识库 ID（用于限定问答范围

如果需要限定问答指定知识库，可先创建或获取知识库 ID：

```bash
curl -X POST http://localhost:3000/api/v1/knowledge \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{"name": "测试知识库", "description": "用于测试的知识库"}'
```

---

## 接口测试详情

### 1. 发送问题（非流式）

**接口地址**: `POST /api/v1/chat/ask`

**功能描述**: 发送问题到 LLM，基于知识库内容进行问答（非流式响应）

**请求头**:
| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| Authorization | String | 是 | Bearer <token> |
| Content-Type | String | 是 | application/json |

**请求参数** (Body):
| 字段 | 类型 | 必填 | 默认值 | 说明 |
| --- | --- | --- | --- |
| query | String | 是 | - | 用户问题 |
| knowledgeBaseId | String | 否 | null | 知识库 ID，用于限定问答范围，不传则查询所有知识库 |

**测试命令**:

```bash
# 不指定知识库
curl -X POST http://localhost:3000/api/v1/chat/ask \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{"query": "请介绍一下本项目"}'

# 指定知识库
curl -X POST http://localhost:3000/api/v1/chat/ask \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{"query": "请介绍一下本项目", "knowledgeBaseId": "<knowledgeBaseId>"}'
```

**成功响应** (200):
```json
{
  "code": 0,
  "msg": "success",
  "data": {
    "query": "请介绍一下本项目",
    "answer": "本项目是一个基于 RAG 的问答系统...",
    "references": [
      {
        "documentId": "60d21b4667d0d8992e610c85",
        "content": "相关文档片段内容"
      }
    ],
    "chunks": [
      {
        "id": "60d21b4667d0d8992e610c85_0",
        "content": "相关文档片段内容"
      }
    ]
  }
}
```

**无相关信息响应** (200):
```json
{
  "code": 0,
  "msg": "success",
  "data": {
    "query": "请介绍一下本项目",
    "answer": null,
    "references": [],
    "message": "暂无相关信息"
  }
}
```

**失败响应** - 参数错误 (400):
```json
{
  "code": 400,
  "msg": "参数验证失败",
  "data": null
}
```

---

### 2. 发送问题（流式响应）

**接口地址**: `POST /api/v1/chat/ask/stream`

**功能描述**: 发送问题到 LLM，基于知识库内容进行问答（Server-Sent Events 流式响应）

**请求头**:
| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| Authorization | String | 是 | Bearer <token> |
| Content-Type | String | 是 | application/json |

**请求参数** (Body):
| 字段 | 类型 | 必填 | 默认值 | 说明 |
| --- | --- | --- | --- |
| query | String | 是 | - | 用户问题 |
| knowledgeBaseId | String | 否 | null | 知识库 ID，用于限定问答范围，不传则查询所有知识库 |

**测试命令**:

```bash
# 使用 curl 测试（注意：curl 默认不直接显示 SSE 流，建议使用浏览器或专门的 SSE 客户端）
curl -X POST http://localhost:3000/api/v1/chat/ask/stream \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{"query": "请介绍一下本项目"}'
```

**流式响应格式** (Server-Sent Events):
```
data: "第1段内容

data: "第2段内容

data: "完整回答

...

data: "[DONE]
```

---

### 3. 获取对话历史列表

**接口地址**: `GET /api/v1/chat/history`

**功能描述**: 获取当前用户的对话历史列表，支持分页

**请求头**:
| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| Authorization | String | 是 | Bearer <token> |

**请求参数** (Query):
| 字段 | 类型 | 必填 | 默认值 | 说明 |
| --- | --- | --- | --- |
| page | Number | 否 | 1 | 页码 |
| pageSize | Number | 否 | 10 | 每页数量 |

**测试命令**:

```bash
# 获取所有对话历史（分页）
curl -X GET "http://localhost:3000/api/v1/chat/history?page=1&pageSize=10" \
  -H "Authorization: Bearer <token>"
```

**成功响应** (200):
```json
{
  "code": 0,
  "msg": "success",
  "data": {
    "list": [
      {
        "_id": "60d21b4667d0d8992e610c85",
        "title": "请介绍一下本项目",
        "userId": "60d21b4667d0d8992e610c01",
        "knowledgeBaseId": "60d21b4667d0d8992e610c86",
        "messageCount": 2,
        "createdAt": "2024-01-01T12:00:00.000Z",
        "updatedAt": "2024-01-01T12:05:00.000Z"
      }
    ],
    "total": 1,
    "page": 1,
    "pageSize": 10
  }
}
```

---

### 4. 获取单条对话详情

**接口地址**: `GET /api/v1/chat/:id`

**功能描述**: 获取单条对话的完整消息记录

**请求头**:
| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| Authorization | String | 是 | Bearer <token> |

**路径参数**:
| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| id | String | 是 | 对话 ID |

**测试命令**:

```bash
curl -X GET http://localhost:3000/api/v1/chat/<chatId> \
  -H "Authorization: Bearer <token>"
```

**成功响应** (200):
```json
{
  "code": 0,
  "msg": "success",
  "data": {
    "_id": "60d21b4667d0d8992e610c85",
    "userId": "60d21b4667d0d8992e610c01",
    "knowledgeBaseId": "60d21b4667d0d8992e610c86",
    "title": "请介绍一下本项目",
    "messageCount": 2,
    "messages": [
      {
        "role": "user",
        "content": "请介绍一下本项目",
        "timestamp": "2024-01-01T12:00:00.000Z",
        "references": []
      },
      {
        "role": "assistant",
        "content": "本项目是一个基于 RAG 的问答系统...",
        "timestamp": "2024-01-01T12:00:05.000Z",
        "references": [
          {
            "documentId": "60d21b4667d0d8992e610c87",
            "content": "相关文档片段内容"
          }
        ]
      }
    ],
    "createdAt": "2024-01-01T12:00:00.000Z",
    "updatedAt": "2024-01-01T12:00:05.000Z"
  }
}
```

**失败响应** - 对话不存在或无权访问 (404):
```json
{
  "code": 404,
  "msg": "对话不存在或无权访问",
  "data": null
}
```

---

### 5. 删除对话记录

**接口地址**: `DELETE /api/v1/chat/:id`

**功能描述**: 删除指定的对话记录（用户只能删除自己的对话）

**请求头**:
| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| Authorization | String | 是 | Bearer <token> |

**路径参数**:
| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| id | String | 是 | 对话 ID |

**测试命令**:

```bash
curl -X DELETE http://localhost:3000/api/v1/chat/<chatId> \
  -H "Authorization: Bearer <token>"
```

**成功响应** (200):
```json
{
  "code": 0,
  "msg": "删除成功",
  "data": null
}
```

**失败响应** - 对话不存在或无权访问 (404):
```json
{
  "code": 404,
  "msg": "对话不存在或无权访问",
  "data": null
}
```

---

## 测试用例汇总

| 测试场景 | 预期结果 |
| --- | --- |
| 发送问题（非流式） | 返回回答和相关引用 |
| 发送问题（流式） | 返回 SSE 流式响应 |
| 发送无相关信息 | 返回 answer: null |
| 获取对话历史列表 | 返回当前用户的对话列表 |
| 获取单条对话详情 | 返回完整的对话消息 |
| 获取不存在的对话 | 返回 404 错误 |
| 删除自己的对话 | 删除成功 |
| 删除他人的对话 | 返回 404 错误 |
| 删除不存在的对话 | 返回 404 错误 |

---

## 数据模型

### Chat

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| _id | ObjectId | 对话唯一标识 |
| userId | ObjectId | 用户 ID（关联 User） |
| knowledgeBaseId | ObjectId | 知识库 ID（关联 KnowledgeBase） |
| title | String | 对话标题（默认使用第一个问题） |
| messageCount | Number | 消息数量 |
| messages | Array | 对话消息数组 |
| messages[].role | String | 角色：user 或 assistant |
| messages[].content | String | 消息内容 |
| messages[].timestamp | Date | 消息时间戳 |
| messages[].references | Array | 引用的文档片段 |
| createdAt | Date | 创建时间 |
| updatedAt | Date | 更新时间 |

---

## 注意事项

1. **流式响应**: 流式接口返回 `text/event-stream` 格式，客户端需要处理 `data: ` 前缀的消息，最后一条消息为 `[DONE]`
2. **知识库限定**: 不传 `knowledgeBaseId` 时会在所有知识库中检索，传值时只在指定知识库范围内检索
3. **对话权限**: 用户只能访问和删除自己的对话记录
4. **对话记录**: 每次问答都会自动保存到对话历史
