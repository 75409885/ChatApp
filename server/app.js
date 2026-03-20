/**
 * @file app.js
 * @description Express 应用核心配置，包括中间件设置和路由挂载。
 */

const express = require('express');
const cors = require('cors');               // 跨域资源共享中间件
const cookieParser = require('cookie-parser'); // Cookie 解析中间件
const path = require('path');
require('dotenv').config();

// 引入路由模块
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const friendRoutes = require('./routes/friends');
const chatRoutes = require('./routes/chat');
const errorHandler = require('./middleware/errorHandler');

const User = require('./models/mysql/User');
const Friendship = require('./models/mysql/Friendship');

const app = express();

// ============================
// 全局中间件
// ============================

// 配置 CORS，允许指定源的跨域请求
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true, // 允许携带凭证（如 Cookie）
}));

// 解析 JSON 格式的请求体，设置大小限制以支持图片传输
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

app.use(cookieParser());

// 静态文件服务：暴露 uploads 目录以供前端访问上传的媒体文件
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ============================
// API 路由挂载
// ============================
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/friends', friendRoutes);
app.use('/api/chat', chatRoutes);

// 健康检查接口，用于验证服务器运行状态
app.get('/api/health', (req, res) => {
  res.json({ code: 200, message: 'Server is healthy', timestamp: new Date() });
});

// ============================
// 模型关联配置 (Sequelize)
// ============================
Friendship.associate({ User });

// ============================
// 全局错误处理中间件
// ============================
app.use(errorHandler);

module.exports = app;
