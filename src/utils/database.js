// 数据库连接管理
const mongoose = require('mongoose');
const { connect } = require('@lancedb/lancedb');
const config = require('../../config/config');

// MongoDB 连接
async function connectMongoDB() {
  try {
    await mongoose.connect(config.mongodb.uri, config.mongodb.options);
    console.log('MongoDB 连接成功');
  } catch (error) {
    console.error('MongoDB 连接失败:', error);
    throw error;
  }
}

function getMongoDB() {
  return mongoose.connection;
}

async function disconnectMongoDB() {
  await mongoose.disconnect();
  console.log('MongoDB 连接已关闭');
}

// LanceDB 连接
let lancedb;

async function connectLanceDB() {
  try {
    lancedb = await connect(config.lancedb.path);
    console.log('LanceDB 连接成功');
  } catch (error) {
    console.error('LanceDB 连接失败:', error);
    throw error;
  }
}

function getLanceDB() {
  return lancedb;
}

module.exports = {
  connectMongoDB,
  getMongoDB,
  disconnectMongoDB,
  connectLanceDB,
  getLanceDB,
  mongoose
};
