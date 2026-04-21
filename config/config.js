// 配置文件

module.exports = {
  // 服务器配置
  server: {
    port: 3000,
    host: "localhost",
  },

  // MongoDB 配置
  mongodb: {
    uri: "mongodb://admin:pzj2026@localhost:27017/rag-services?authSource=admin&authMechanism=DEFAULT",
    options: {},
  },

  // JWT 配置
  jwt: {
    secret: "your-secret-key",
    expiresIn: "24h",
  },

  // LanceDB 配置
  lancedb: {
    path: "./lancedb",
  },

  // 文件上传配置
  upload: {
    path: "./uploads",
    maxSize: 104857600, // 100MB
  },

  // API 配置
  api: {
    prefix: "/api/v1",
  },
};
