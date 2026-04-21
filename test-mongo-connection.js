// 测试 MongoDB 连接
const mongoose = require('mongoose');
const config = require('./config/config');

async function testMongoConnection() {
  try {
    console.log('正在连接 MongoDB...');
    await mongoose.connect(config.mongodb.uri, config.mongodb.options);
    console.log('MongoDB 连接成功！');
    await mongoose.disconnect();
    console.log('MongoDB 连接已关闭');
  } catch (error) {
    console.error('MongoDB 连接失败:', error.message);
  }
}

testMongoConnection();
