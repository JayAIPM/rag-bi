// 主应用文件
const express = require('express');
const cors = require('cors');
const config = require('./config/config');
const { connectMongoDB, connectLanceDB } = require('./src/utils/database');
const routes = require('./src/routes');

const app = express();

// 配置中间件
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 健康检查
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// 注册路由
app.use(config.api.prefix, routes);

// 初始化数据库连接
async function initDatabase() {
  try {
    await connectLanceDB();
    console.log('LanceDB 连接成功');
  } catch (error) {
    console.warn('LanceDB 连接失败:', error);
  }
  
  try {
    await connectMongoDB();
    console.log('MongoDB 连接成功');
  } catch (error) {
    console.warn('MongoDB 连接失败:', error);
    console.warn('系统将在没有 MongoDB 的情况下运行，部分功能可能不可用');
  }
  
  console.log('数据库连接初始化完成');
}

// 启动服务器
async function startServer() {
  try {
    await initDatabase();
    app.listen(config.server.port, config.server.host, () => {
      console.log(`服务器运行在 http://${config.server.host}:${config.server.port}`);
    });
  } catch (error) {
    console.error('服务器启动失败:', error);
    process.exit(1);
  }
}

// 启动服务器
startServer();
