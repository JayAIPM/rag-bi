const mongoose = require('mongoose');
const Role = require('../models/Role');
const User = require('../models/User');
const KnowledgeBase = require('../models/KnowledgeBase');
const bcrypt = require('bcryptjs');
const { connectDB, disconnectDB } = require('../config/database');

// 初始化角色数据
async function initRoles() {
  try {
    // 连接数据库
    await connectDB();
    
    // 定义默认角色
    const roles = [
      {
        name: 'admin',
        permissions: [
          'user:create',
          'user:read',
          'user:update',
          'user:delete',
          'role:create',
          'role:read',
          'role:update',
          'role:delete',
          'knowledge:create',
          'knowledge:read',
          'knowledge:update',
          'knowledge:delete',
          'document:upload',
          'document:read',
          'document:delete',
          'chat:ask',
          'chat:history',
          'chat:delete',
          'stats:read'
        ],
        description: '管理员角色，拥有所有权限'
      },
      {
        name: 'user',
        permissions: [
          'user:read',
          'knowledge:read',
          'document:upload',
          'document:read',
          'document:delete',
          'chat:ask',
          'chat:history',
          'chat:delete'
        ],
        description: '普通用户角色，拥有基本权限'
      }
    ];
    
    // 检查并创建角色
    for (const roleData of roles) {
      const existingRole = await Role.findOne({ name: roleData.name });
      if (!existingRole) {
        const role = new Role(roleData);
        await role.save();
        console.log(`Created role: ${roleData.name}`);
      } else {
        console.log(`Role ${roleData.name} already exists`);
      }
    }
    
    console.log('Role initialization completed');
    
  } catch (error) {
    console.error('Error initializing roles:', error);
  } finally {
    // 断开数据库连接
    await disconnectDB();
  }
}

// 初始化默认管理员用户
async function initAdminUser() {
  try {
    // 连接数据库
    await connectDB();
    
    // 查找admin角色
    const adminRole = await Role.findOne({ name: 'admin' });
    if (!adminRole) {
      console.error('Admin role not found, please initialize roles first');
      return;
    }
    
    // 检查是否已存在管理员用户
    const existingAdmin = await User.findOne({ username: 'admin' });
    if (!existingAdmin) {
      // 加密密码
      const hashedPassword = await bcrypt.hash('admin123', 10);
      
      // 创建默认管理员用户
      const adminUser = new User({
        username: 'admin',
        password: hashedPassword,
        email: 'admin@example.com',
        role: adminRole._id,
        organization: 'Default Organization'
      });
      
      await adminUser.save();
      console.log('Created default admin user');
    } else {
      console.log('Admin user already exists');
    }
    
    console.log('Admin user initialization completed');
    
  } catch (error) {
    console.error('Error initializing admin user:', error);
  } finally {
    // 断开数据库连接
    await disconnectDB();
  }
}

// 初始化默认示例知识库
async function initKnowledgeBase() {
  try {
    // 连接数据库
    await connectDB();
    
    // 查找admin用户
    const adminUser = await User.findOne({ username: 'admin' });
    if (!adminUser) {
      console.error('Admin user not found, please initialize admin user first');
      return;
    }
    
    // 查找admin和user角色
    const adminRole = await Role.findOne({ name: 'admin' });
    const userRole = await Role.findOne({ name: 'user' });
    
    if (!adminRole || !userRole) {
      console.error('Roles not found, please initialize roles first');
      return;
    }
    
    // 检查是否已存在默认知识库
    const existingKB = await KnowledgeBase.findOne({ name: 'Default Knowledge Base' });
    if (!existingKB) {
      // 创建默认示例知识库
      const knowledgeBase = new KnowledgeBase({
        name: 'Default Knowledge Base',
        description: '默认示例知识库，包含系统使用说明和常见问题',
        owner: adminUser._id,
        accessControl: [
          {
            role: adminRole._id,
            permissions: ['read', 'write', 'delete']
          },
          {
            role: userRole._id,
            permissions: ['read']
          }
        ],
        documentCount: 0
      });
      
      await knowledgeBase.save();
      console.log('Created default knowledge base');
    } else {
      console.log('Default knowledge base already exists');
    }
    
    console.log('Knowledge base initialization completed');
    
  } catch (error) {
    console.error('Error initializing knowledge base:', error);
  } finally {
    // 断开数据库连接
    await disconnectDB();
  }
}

// 导出初始化函数
module.exports = {
  initRoles,
  initAdminUser,
  initKnowledgeBase
};

// 如果直接运行此文件，则执行初始化
if (require.main === module) {
  initKnowledgeBase();
}