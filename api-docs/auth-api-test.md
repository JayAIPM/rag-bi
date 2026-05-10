# 认证授权模块接口文档

## 概述

本文档提供认证授权模块的接口说明，涵盖用户登录、获取用户信息、登出等功能。当前阶段可测试的接口包括：

1. **POST /api/v1/auth/login** - 用户登录
2. **GET /api/v1/auth/user-info** - 获取用户信息
3. **POST /api/v1/auth/logout** - 用户登出

---

## 测试前置条件

### 1. 启动服务

```bash
cd /Users/xiaer/workspace/rag-bi
npm install
npm start
```

服务启动后监听 `http://localhost:3000`

### 2. 默认测试账号

系统初始化时自动创建以下测试账号：

| 用户名 | 密码 | 角色 |
|--------|------|------|
| admin | admin123 | 管理员 |
| user1 | user123 | 普通用户 |

---

## 接口测试详情

### 1. 用户登录

**接口地址**: `POST /api/v1/auth/login`

**功能描述**: 用户登录系统，返回 JWT 令牌和用户信息

**请求头**:
| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| Content-Type | String | 是 | application/json |

**请求参数** (Body):
| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| username | String | 是 | 用户名 |
| password | String | 是 | 密码 |

**测试命令**:

```bash
# 管理员登录
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username": "admin", "password": "admin123"}'

# 普通用户登录
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username": "user1", "password": "user123"}'
```

**成功响应** (200):
```json
{
  "code": 0,
  "msg": "success",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "_id": "60d21b4667d0d8992e610c01",
      "username": "admin",
      "email": "admin@example.com",
      "role": {
        "_id": "60d21b4667d0d8992e610c00",
        "name": "admin",
        "permissions": ["knowledge:*", "document:*", "chat:*", "user:*"]
      },
      "organization": "默认组织",
      "lastLogin": "2024-01-01T12:00:00.000Z"
    }
  }
}
```

**失败响应** - 用户不存在 (401):
```json
{
  "code": 401,
  "msg": "用户不存在",
  "data": null
}
```

**失败响应** - 密码错误 (401):
```json
{
  "code": 401,
  "msg": "密码错误",
  "data": null
}
```

---

### 2. 获取用户信息

**接口地址**: `GET /api/v1/auth/user-info`

**功能描述**: 获取当前登录用户的详细信息

**请求头**:
| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| Authorization | String | 是 | Bearer <token> |

**测试命令**:

```bash
curl -X GET http://localhost:3000/api/v1/auth/user-info \
  -H "Authorization: Bearer <token>"
```

**成功响应** (200):
```json
{
  "code": 0,
  "msg": "success",
  "data": {
    "_id": "60d21b4667d0d8992e610c01",
    "username": "admin",
    "email": "admin@example.com",
    "role": {
      "_id": "60d21b4667d0d8992e610c00",
      "name": "admin",
      "permissions": ["knowledge:*", "document:*", "chat:*", "user:*"]
    },
    "organization": "默认组织",
    "lastLogin": "2024-01-01T12:00:00.000Z",
    "createdAt": "2024-01-01T08:00:00.000Z",
    "updatedAt": "2024-01-01T12:00:00.000Z"
  }
}
```

**失败响应** - 未登录 (401):
```json
{
  "code": 401,
  "msg": "未提供认证令牌",
  "data": null
}
```

**失败响应** - 令牌无效 (401):
```json
{
  "code": 401,
  "msg": "无效的认证令牌",
  "data": null
}
```

---

### 3. 用户登出

**接口地址**: `POST /api/v1/auth/logout`

**功能描述**: 当前用户登出，使令牌失效

**请求头**:
| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| Authorization | String | 是 | Bearer <token> |

**测试命令**:

```bash
curl -X POST http://localhost:3000/api/v1/auth/logout \
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

**失败响应** - 未登录 (401):
```json
{
  "code": 401,
  "msg": "未提供认证令牌",
  "data": null
}
```

---

## 测试用例汇总

| 测试场景 | 预期结果 |
| --- | --- |
| 使用正确凭据登录 | 返回 token 和用户信息 |
| 使用错误用户名登录 | 返回 401，用户不存在 |
| 使用错误密码登录 | 返回 401，密码错误 |
| 使用空用户名登录 | 返回 400，参数验证失败 |
| 使用空密码登录 | 返回 400，参数验证失败 |
| 使用有效 token 获取用户信息 | 返回当前用户详细信息 |
| 使用无效 token 获取用户信息 | 返回 401，无效的认证令牌 |
| 使用过期 token 获取用户信息 | 返回 401，无效的认证令牌 |
| 登录后登出 | 返回 success |
| 登出后使用原 token | 返回 401，令牌已失效 |

---

## 数据模型

### User

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| _id | ObjectId | 用户唯一标识 |
| username | String | 用户名，全局唯一 |
| password | String | 密码（加密存储） |
| email | String | 邮箱地址，全局唯一 |
| role | ObjectId | 关联的角色 ID（引用 Role） |
| organization | String | 所属组织 |
| lastLogin | Date | 最后登录时间 |
| token | String | 当前有效的 JWT 令牌 |
| createdAt | Date | 创建时间 |
| updatedAt | Date | 更新时间 |

### Role

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| _id | ObjectId | 角色唯一标识 |
| name | String | 角色名称（如：admin、user） |
| permissions | Array | 权限列表（如：knowledge:*、document:*） |

---

## JWT 令牌说明

### 令牌格式

```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### 令牌包含信息

| 字段 | 说明 |
| --- | --- |
| userId | 用户 ID |
| username | 用户名 |
| role | 角色 ID |
| iat | 签发时间 |
| exp | 过期时间 |

### 令牌有效期

- 默认有效期：**24 小时**
- 过期后需要重新登录

---

## 注意事项

1. **令牌安全**: 令牌存储在客户端 localStorage 或 sessionStorage 中，退出登录时应清除
2. **令牌刷新**: 当前版本不支持令牌刷新，过期后需重新登录
3. **密码安全**: 密码使用 bcrypt 加密存储，不可逆
4. **权限控制**: 不同角色拥有不同的操作权限，具体参见角色配置
