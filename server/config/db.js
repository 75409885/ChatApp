/**
 * @file config/db.js
 * @description 数据库配置文件，实现 MySQL (Sequelize) 与 MongoDB (Mongoose) 的双引擎连接管理。
 */

const { Sequelize } = require('sequelize');
const mongoose = require('mongoose');
require('dotenv').config();

// ========================================
// 1. MySQL 配置 (Sequelize)
// ========================================
const sequelize = new Sequelize(
  process.env.MYSQL_DATABASE || 'chatapp',
  process.env.MYSQL_USER || 'root',
  process.env.MYSQL_PASSWORD || '',
  {
    host: process.env.MYSQL_HOST || 'localhost',
    port: process.env.MYSQL_PORT || 3306,
    dialect: 'mysql',
    logging: false, // 生产环境下建议禁用日志输出
    pool: {
      max: 10,
      min: 0,
      acquire: 30000,
      idle: 10000,
    },
    define: {
      timestamps: true,      // 自动维护 createdAt 和 updatedAt 字段
      underscored: true,     // 将驼峰命名的模型属性映射为下划线格式的数据库列名
      freezeTableName: true, // 强制表名与指定的模型名称一致
    },
  }
);

// ========================================
// 2. MongoDB 连接逻辑 (Mongoose)
// ========================================
const connectMongoDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/chatapp');
    console.log('[Database] MongoDB connected successfully.');
  } catch (error) {
    console.error('[Database] MongoDB connection failed:', error.message);
    // 失败重连机制
    setTimeout(connectMongoDB, 5000);
  }
};

// 监听连接断开事件并重连
mongoose.connection.on('disconnected', () => {
  console.warn('[Database] MongoDB disconnected. Attempting to reconnect...');
});

// ========================================
// 3. MySQL 状态校验与结构同步
// ========================================
const connectMySQL = async () => {
  try {
    await sequelize.authenticate();
    console.log('[Database] MySQL connected successfully.');
    
    // 同步模型到数据库结构（alter: true 会尝试调整表结构以匹配模型）
    await sequelize.sync({ alter: true });
    console.log('[Database] MySQL schemas synchronized.');
  } catch (error) {
    console.error('[Database] MySQL connection failed:', error.message);
    setTimeout(connectMySQL, 5000);
  }
};

module.exports = {
  sequelize,
  mongoose,
  connectMongoDB,
  connectMySQL,
};
