// 初始化数据库，创建管理员用户
const { MongoClient } = require('mongodb');
const config = require('./config/config');

async function initDatabase() {
  let client;
  try {
    // 连接数据库
    console.log('正在连接 MongoDB...');
    // 使用 config.js 中的连接字符串
    const uri = config.mongodb.uri;
    client = new MongoClient(uri, config.mongodb.options);
    await client.connect();
    console.log('MongoDB 连接成功！');

    // 选择数据库（从连接字符串中提取）
    const dbName = uri.split('/').pop().split('?')[0];
    const db = client.db(dbName);
    console.log(`已选择 ${dbName} 数据库`);

    // 尝试直接插入用户数据，不检查集合是否存在
    // MongoDB 会自动创建集合

    // 检查是否已存在管理员用户
    console.log('检查管理员用户...');
    const existingAdmin = await db.collection('users').findOne({ username: 'admin' });
    if (existingAdmin) {
      console.log('管理员用户已存在，跳过创建');
    } else {
      // 创建管理员用户
      console.log('创建管理员用户...');
      await db.collection('users').insertOne({
        username: 'admin',
        password: 'admin123', // 实际项目中应该使用加密密码
        role: 'admin',
        permissions: ['all'],
        createdAt: new Date(),
        updatedAt: new Date()
      });
      console.log('管理员用户创建成功！');
    }

    // 检查是否已存在知识库管理员用户
    console.log('检查知识库管理员用户...');
    const existingKnowledgeBaseAdmin = await db.collection('users').findOne({ username: 'kbadmin' });
    if (existingKnowledgeBaseAdmin) {
      console.log('知识库管理员用户已存在，跳过创建');
    } else {
      // 创建知识库管理员用户
      console.log('创建知识库管理员用户...');
      await db.collection('users').insertOne({
        username: 'kbadmin',
        password: 'kbadmin123', // 实际项目中应该使用加密密码
        role: 'knowledgeBaseAdmin',
        permissions: ['knowledgeBase:manage', 'document:upload'],
        createdAt: new Date(),
        updatedAt: new Date()
      });
      console.log('知识库管理员用户创建成功！');
    }

    // 检查是否已存在普通用户
    console.log('检查普通用户...');
    const existingUser = await db.collection('users').findOne({ username: 'user' });
    if (existingUser) {
      console.log('普通用户已存在，跳过创建');
    } else {
      // 创建普通用户
      console.log('创建普通用户...');
      await db.collection('users').insertOne({
        username: 'user',
        password: 'user123', // 实际项目中应该使用加密密码
        role: 'user',
        permissions: [],
        createdAt: new Date(),
        updatedAt: new Date()
      });
      console.log('普通用户创建成功！');
    }

    // 断开连接
    await client.close();
    console.log('数据库初始化完成！');
  } catch (error) {
    console.error('数据库初始化失败:', error.message);
    console.error('错误堆栈:', error.stack);
    if (client) {
      await client.close();
    }
  }
}

initDatabase();
