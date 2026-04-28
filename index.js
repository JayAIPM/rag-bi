const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
require('express-async-errors');
const { connectDB } = require('./src/config/database');
const routes = require('./src/routes');
const { errorHandler, notFoundHandler } = require('./src/middleware/errorHandler');
const { requestLogger, errorLogger } = require('./src/middleware/logger');
const logger = require('./src/utils/logger');

// 加载环境变量
dotenv.config();

// 初始化 Express 应用实例
const app = express();

// 配置应用端口
const PORT = process.env.PORT || 3000;

// 注册中间件
app.use(cors());
app.use(requestLogger);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 根路由
app.get('/', (req, res) => {
  res.json({
    code: 0,
    msg: 'success',
    data: {
      message: 'Welcome to RAG-Backend API',
      status: 'running',
      timestamp: new Date().toISOString()
    }
  });
});

// 注册 API 路由
app.use('/api/v1', routes);

// 注册 404 错误处理中间件
app.use(notFoundHandler);

// 注册错误日志中间件
app.use(errorLogger);

// 注册全局错误处理中间件
app.use(errorHandler);

// 启动服务器
const startServer = async () => {
  try {
    // 连接数据库
    await connectDB();
    logger.info('MongoDB 连接成功');
    
    // 启动服务器
    app.listen(PORT, () => {
      logger.info(`Server is running on port ${PORT}`);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};

// 启动应用
startServer();

module.exports = app;
