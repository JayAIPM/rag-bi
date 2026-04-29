# 文档处理模块接口测试文档

## 概述

本文档提供文档处理模块的接口测试说明，涵盖文件上传、查询、删除等基础功能。当前阶段可测试的接口包括：

1. **POST /api/v1/document/upload** - 文档上传接口
2. **GET /api/v1/document** - 获取文档列表
3. **GET /api/v1/document/:id** - 获取文档详情
4. **DELETE /api/v1/document/:id** - 删除文档

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

### 3. 获取知识库 ID

文档需要关联到知识库，需先创建或获取知识库 ID：

```bash
curl -X POST http://localhost:3000/api/v1/knowledge \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{"name": "测试知识库", "description": "用于测试的知识库"}'
```

---

## 接口测试详情

### 1. 文档上传接口

**接口地址**: `POST /api/v1/document/upload`

**功能描述**: 上传文档到指定知识库，支持 PDF、Word、Excel、PPT、TXT、MD 格式，文件大小限制 50MB

**请求头**:
| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| Authorization | String | 是 | Bearer <token> |
| Content-Type | String | 是 | multipart/form-data |

**请求参数**:
| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| file | File | 是 | 上传的文件 |
| knowledgeBaseId | String | 是 | 目标知识库 ID |

**测试命令**:

```bash
# 上传 PDF 文件
curl -X POST http://localhost:3000/api/v1/document/upload \
  -H "Authorization: Bearer <token>" \
  -F "file=@/path/to/test.pdf" \
  -F "knowledgeBaseId=<knowledgeBaseId>"

# 上传 Word 文件
curl -X POST http://localhost:3000/api/v1/document/upload \
  -H "Authorization: Bearer <token>" \
  -F "file=@/path/to/test.docx" \
  -F "knowledgeBaseId=<knowledgeBaseId>"

# 上传 TXT 文件
curl -X POST http://localhost:3000/api/v1/document/upload \
  -H "Authorization: Bearer <token>" \
  -F "file=@/path/to/test.txt" \
  -F "knowledgeBaseId=<knowledgeBaseId>"
```

**成功响应** (200):
```json
{
  "code": 0,
  "msg": "success",
  "data": {
    "documentId": "60d21b4667d0d8992e610c85",
    "status": "pending"
  }
}
```

**失败响应** - 文件格式不支持 (400):
```json
{
  "code": 400,
  "msg": "不支持的文件格式: .zip。支持的格式: .pdf, .doc, .docx, .xls, .xlsx, .ppt, .pptx, .txt, .md",
  "data": null
}
```

**失败响应** - 知识库不存在 (404):
```json
{
  "code": 404,
  "msg": "知识库不存在",
  "data": null
}
```

**失败响应** - 无权限 (403):
```json
{
  "code": 403,
  "msg": "无权限上传到此知识库",
  "data": null
}
```

---

### 2. 获取文档列表接口

**接口地址**: `GET /api/v1/document`

**功能描述**: 获取当前用户有权限访问的文档列表，支持分页

**请求头**:
| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| Authorization | String | 是 | Bearer <token> |

**请求参数** (Query):
| 字段 | 类型 | 必填 | 默认值 | 说明 |
| --- | --- | --- | --- | --- |
| page | Number | 否 | 1 | 页码 |
| pageSize | Number | 否 | 10 | 每页数量 |
| knowledgeBaseId | String | 否 | - | 按知识库筛选 |

**测试命令**:

```bash
# 获取所有文档（分页）
curl -X GET "http://localhost:3000/api/v1/document?page=1&pageSize=10" \
  -H "Authorization: Bearer <token>"

# 获取指定知识库的文档
curl -X GET "http://localhost:3000/api/v1/document?knowledgeBaseId=<knowledgeBaseId>" \
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
        "name": "test.pdf",
        "type": "pdf",
        "size": 102400,
        "status": "pending",
        "knowledgeBaseId": {
          "_id": "60d...",
          "name": "测试知识库"
        },
        "createdAt": "2024-01-01T12:00:00.000Z",
        "updatedAt": "2024-01-01T12:00:00.000Z"
      }
    ],
    "total": 1,
    "page": 1,
    "pageSize": 10
  }
}
```

---

### 3. 获取文档详情接口

**接口地址**: `GET /api/v1/document/:id`

**功能描述**: 根据文档 ID 获取文档详细信息

**请求头**:
| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| Authorization | String | 是 | Bearer <token> |

**路径参数**:
| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| id | String | 是 | 文档 ID |

**测试命令**:

```bash
curl -X GET http://localhost:3000/api/v1/document/<documentId> \
  -H "Authorization: Bearer <token>"
```

**成功响应** (200):
```json
{
  "code": 0,
  "msg": "success",
  "data": {
    "_id": "60d21b4667d0d8992e610c85",
    "name": "test.pdf",
    "type": "pdf",
    "size": 102400,
    "path": "/uploads/1704067200000-123456789.pdf",
    "status": "pending",
    "errorMessage": null,
    "knowledgeBaseId": {
      "_id": "60d...",
      "name": "测试知识库"
    },
    "metadata": {
      "originalName": "test.pdf",
      "mimeType": "application/pdf"
    },
    "createdAt": "2024-01-01T12:00:00.000Z",
    "updatedAt": "2024-01-01T12:00:00.000Z"
  }
}
```

**失败响应** - 文档不存在 (404):
```json
{
  "code": 404,
  "msg": "文档不存在",
  "data": null
}
```

---

### 4. 删除文档接口

**接口地址**: `DELETE /api/v1/document/:id`

**功能描述**: 删除指定文档（仅管理员权限）

**请求头**:
| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| Authorization | String | 是 | Bearer <token> |

**路径参数**:
| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| id | String | 是 | 文档 ID |

**测试命令**:

```bash
curl -X DELETE http://localhost:3000/api/v1/document/<documentId> \
  -H "Authorization: Bearer <token>"
```

**成功响应** (200):
```json
{
  "code": 0,
  "msg": "success",
  "data": null
}
```

**失败响应** - 无权限 (403):
```json
{
  "code": 403,
  "msg": "无权限删除文档",
  "data": null
}
```

**失败响应** - 文档不存在 (404):
```json
{
  "code": 404,
  "msg": "文档不存在",
  "data": null
}
```

---

## 测试用例汇总

| 测试场景 | 预期结果 |
| --- | --- |
| 上传有效 PDF 文件 | 返回 documentId 和 pending 状态 |
| 上传有效 Word 文件 | 返回 documentId 和 pending 状态 |
| 上传有效 TXT 文件 | 返回 documentId 和 pending 状态 |
| 上传不支持的文件格式 | 返回 400 错误，提示不支持的格式 |
| 上传超过 50MB 的文件 | 返回 400 错误，提示文件过大 |
| 上传到不存在的知识库 | 返回 404 错误 |
| 上传到他人的知识库 | 返回 403 错误 |
| 获取文档列表 | 返回当前用户有权限的文档 |
| 获取指定文档详情 | 返回文档完整信息 |
| 获取不存在的文档 | 返回 404 错误 |
| 管理员删除文档 | 删除成功 |
| 普通用户删除文档 | 返回 403 错误 |

---

## 注意事项

1. **文件大小限制**: 当前配置为 50MB，可通过环境变量 `MAX_FILE_SIZE` 修改
2. **支持格式**: PDF、Word(.doc/.docx)、Excel(.xls/.xlsx)、PPT(.ppt/.pptx)、TXT、MD
3. **权限说明**: 
   - 文档上传：仅知识库所有者可上传
   - 文档查询：用户可查看自己知识库的文档，管理员可查看所有文档
   - 文档删除：仅管理员可删除
4. **异步处理**: 当前上传后文档状态为 pending，解析流程尚未实现，状态不会自动更新为 completed