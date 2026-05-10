# 知识库模块接口文档

## 概述

本文档提供知识库模块的接口说明，涵盖创建、查询、更新、删除等基础功能。当前阶段可测试的接口包括：

1. **POST /api/v1/knowledge** - 创建知识库
2. **GET /api/v1/knowledge** - 获取知识库列表
3. **GET /api/v1/knowledge/:id** - 获取知识库详情
4. **PUT /api/v1/knowledge/:id** - 更新知识库
5. **DELETE /api/v1/knowledge/:id** - 删除知识库

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

---

## 接口测试详情

### 1. 创建知识库

**接口地址**: `POST /api/v1/knowledge`

**功能描述**: 创建新的知识库，知识库名称全局唯一

**请求头**:
| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| Authorization | String | 是 | Bearer <token> |
| Content-Type | String | 是 | application/json |

**请求参数** (Body):
| 字段 | 类型 | 必填 | 默认值 | 说明 |
| --- | --- | --- | --- | --- |
| name | String | 是 | - | 知识库名称，不能为空，全局唯一 |
| description | String | 否 | "" | 知识库描述 |

**测试命令**:

```bash
curl -X POST http://localhost:3000/api/v1/knowledge \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{"name": "测试知识库", "description": "用于测试的知识库"}'
```

**成功响应** (200):
```json
{
  "code": 0,
  "msg": "success",
  "data": {
    "_id": "60d21b4667d0d8992e610c85",
    "name": "测试知识库",
    "description": "用于测试的知识库",
    "owner": "60d21b4667d0d8992e610c01",
    "documentCount": 0,
    "createdAt": "2024-01-01T12:00:00.000Z",
    "updatedAt": "2024-01-01T12:00:00.000Z"
  }
}
```

**失败响应** - 名称为空 (400):
```json
{
  "code": 400,
  "msg": "知识库名称不能为空",
  "data": null
}
```

**失败响应** - 名称已存在 (400):
```json
{
  "code": 400,
  "msg": "知识库名称已存在",
  "data": null
}
```

**失败响应** - 无权限 (403):
```json
{
  "code": 403,
  "msg": "无权限创建知识库",
  "data": null
}
```

---

### 2. 获取知识库列表

**接口地址**: `GET /api/v1/knowledge`

**功能描述**: 获取当前用户有权限访问的知识库列表，支持分页

**请求头**:
| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| Authorization | String | 是 | Bearer <token> |

**请求参数** (Query):
| 字段 | 类型 | 必填 | 默认值 | 说明 |
| --- | --- | --- | --- | --- |
| page | Number | 否 | 1 | 页码 |
| pageSize | Number | 否 | 10 | 每页数量 |

**权限说明**:
- 普通用户：只能看到自己创建的知识库
- 管理员：可以看到所有知识库

**测试命令**:

```bash
# 获取所有知识库（分页）
curl -X GET "http://localhost:3000/api/v1/knowledge?page=1&pageSize=10" \
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
        "name": "测试知识库",
        "description": "用于测试的知识库",
        "owner": {
          "_id": "60d21b4667d0d8992e610c01",
          "username": "admin"
        },
        "documentCount": 0,
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

### 3. 获取知识库详情

**接口地址**: `GET /api/v1/knowledge/:id`

**功能描述**: 根据知识库 ID 获取详细信息

**请求头**:
| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| Authorization | String | 是 | Bearer <token> |

**路径参数**:
| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| id | String | 是 | 知识库 ID |

**测试命令**:

```bash
curl -X GET http://localhost:3000/api/v1/knowledge/<knowledgeId> \
  -H "Authorization: Bearer <token>"
```

**成功响应** (200):
```json
{
  "code": 0,
  "msg": "success",
  "data": {
    "_id": "60d21b4667d0d8992e610c85",
    "name": "测试知识库",
    "description": "用于测试的知识库",
    "owner": {
      "_id": "60d21b4667d0d8992e610c01",
      "username": "admin"
    },
    "accessControl": [],
    "documentCount": 0,
    "createdAt": "2024-01-01T12:00:00.000Z",
    "updatedAt": "2024-01-01T12:00:00.000Z"
  }
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

---

### 4. 更新知识库

**接口地址**: `PUT /api/v1/knowledge/:id`

**功能描述**: 更新指定知识库的名称和描述

**请求头**:
| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| Authorization | String | 是 | Bearer <token> |
| Content-Type | String | 是 | application/json |

**路径参数**:
| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| id | String | 是 | 知识库 ID |

**请求参数** (Body):
| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| name | String | 否 | 新的知识库名称，全局唯一 |
| description | String | 否 | 新的知识库描述 |

**权限说明**:
- 普通用户：只能更新自己创建的知识库
- 管理员：可以更新所有知识库

**测试命令**:

```bash
# 更新名称和描述
curl -X PUT http://localhost:3000/api/v1/knowledge/<knowledgeId> \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{"name": "新知识库名称", "description": "更新后的描述"}'

# 仅更新描述
curl -X PUT http://localhost:3000/api/v1/knowledge/<knowledgeId> \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{"description": "仅更新描述"}'
```

**成功响应** (200):
```json
{
  "code": 0,
  "msg": "success",
  "data": {
    "_id": "60d21b4667d0d8992e610c85",
    "name": "新知识库名称",
    "description": "更新后的描述",
    "owner": {
      "_id": "60d21b4667d0d8992e610c01",
      "username": "admin"
    },
    "documentCount": 0,
    "createdAt": "2024-01-01T12:00:00.000Z",
    "updatedAt": "2024-01-01T12:30:00.000Z"
  }
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
  "msg": "无权限更新此知识库",
  "data": null
}
```

**失败响应** - 名称已存在 (400):
```json
{
  "code": 400,
  "msg": "知识库名称已存在",
  "data": null
}
```

---

### 5. 删除知识库

**接口地址**: `DELETE /api/v1/knowledge/:id`

**功能描述**: 删除指定知识库（仅管理员权限）

**请求头**:
| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| Authorization | String | 是 | Bearer <token> |

**路径参数**:
| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| id | String | 是 | 知识库 ID |

**权限说明**:
- **仅管理员可删除**，普通用户无权限

**测试命令**:

```bash
curl -X DELETE http://localhost:3000/api/v1/knowledge/<knowledgeId> \
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
  "msg": "无权限删除知识库",
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

---

## 测试用例汇总

| 测试场景 | 预期结果 |
| --- | --- |
| 使用有效参数创建知识库 | 返回新创建的知识库信息 |
| 创建空名称的知识库 | 返回 400 错误 |
| 创建重复名称的知识库 | 返回 400 错误 |
| 普通用户创建知识库 | 返回 403 错误 |
| 获取知识库列表 | 返回当前用户有权限的知识库 |
| 分页获取知识库列表 | 返回指定页的数据 |
| 获取指定知识库详情 | 返回完整信息 |
| 获取不存在的知识库 | 返回 404 错误 |
| 知识库所有者更新知识库 | 更新成功 |
| 非所有者更新知识库 | 返回 403 错误 |
| 管理员更新任意知识库 | 更新成功 |
| 更新为已存在的名称 | 返回 400 错误 |
| 管理员删除知识库 | 删除成功 |
| 普通用户删除知识库 | 返回 403 错误 |
| 删除不存在的知识库 | 返回 404 错误 |

---

## 数据模型

### KnowledgeBase

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| _id | ObjectId | 知识库唯一标识 |
| name | String | 知识库名称，全局唯一 |
| description | String | 知识库描述 |
| owner | ObjectId | 创建者用户 ID（关联 User） |
| accessControl | Array | 访问控制列表（预留） |
| documentCount | Number | 关联的文档数量 |
| createdAt | Date | 创建时间 |
| updatedAt | Date | 最后更新时间 |

---

## 注意事项

1. **名称唯一性**: 知识库名称在系统中必须唯一，创建和更新时需注意
2. **权限说明**:
   - 创建知识库：需要 `knowledge:create` 权限
   - 读取知识库：需要 `knowledge:read` 权限，普通用户只能看自己的
   - 更新知识库：需要 `knowledge:update` 权限，普通用户只能更新自己的
   - 删除知识库：**仅管理员可删除**，需要 `knowledge:delete` 权限
3. **删除风险**: 删除知识库操作不可逆，请谨慎操作
4. **关联数据**: 当前版本删除知识库不会自动清理关联的文档和向量数据
