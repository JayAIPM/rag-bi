const mongoose = require('mongoose');
const dotenv = require('dotenv');

// 加载环境变量
dotenv.config();

// 获取数据库连接字符串
const MONGODB_URI = process.env.MONGODB_URI;

// 连接数据库
const connectDB = async () => {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('MongoDB 连接成功');
  } catch (error) {
    console.error('MongoDB 连接失败:', error.message);
    process.exit(1);
  }
};

// 断开数据库连接
const disconnectDB = async () => {
  try {
    await mongoose.disconnect();
    console.log('MongoDB 断开连接');
  } catch (error) {
    console.error('MongoDB 断开连接失败:', error.message);
  }
};

module.exports = {
  connectDB,
  disconnectDB,
};
