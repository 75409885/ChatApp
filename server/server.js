/**
 * @file server.js
 * @description 后端顶级入口文件，负责启动 HTTP 服务器并初始化 Socket.io。
 */

const http = require('http');           // Node.js 原生 HTTP 模块
const { Server } = require('socket.io');// Socket.io 服务端
const app = require('./app');           // Express 应用实例
const { connectMySQL, connectMongoDB } = require('./config/db'); // 数据库连接方法
const { initSocket } = require('./socket/socketHandler'); // Socket 逻辑初始化
require('dotenv').config();             // 加载环境变量

const PORT = process.env.PORT || 3000;

// ============================
// 1. 创建 HTTP 服务器
// ============================
const server = http.createServer(app);

// ============================
// 2. 初始化 Socket.io (WebSocket)
// ============================
// 配置 Socket.io 实例，支持跨域和凭证
const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    methods: ['GET', 'POST'],
    credentials: true,
  },
  maxHttpBufferSize: 15 * 1024 * 1024,
  // 传输协议：优先使用 WebSocket，兼容 HTTP 轮询
  transports: ['websocket', 'polling'], 
});

// 初始化 Socket 事件处理
initSocket(io);

// 将 io 实例挂载到 app，以便在路由中使用
app.set('io', io);

// ============================
// 3. 启动服务器
// ============================
const startServer = async () => {
  try {
    // 建立数据库连接
    await connectMySQL();
    await connectMongoDB();

    // 监听指定端口
    server.listen(PORT, () => {
      console.log('==========================================');
      console.log(`🚀 ChatApp Server is running!`);
      console.log(`📡 HTTP API: http://localhost:${PORT}`);
      console.log(`🔌 WebSocket: ws://localhost:${PORT}`);
      console.log('==========================================');
    });
  } catch (error) {
    console.error('❌ Server start failed:', error.message);
    process.exit(1);
  }
};

startServer();

// ============================
// 4. 优雅停机 (Graceful Shutdown)
// ============================
const shutdown = () => {
  console.log('\n😴 Shutting down server gracefully...');
  server.close(() => {
    console.log('✅ Server closed successfully.');
    process.exit(0);
  });
};

process.on('SIGTERM', shutdown); // 处理系统终止信号
process.on('SIGINT', shutdown);  // 处理用户中断信号 (Ctrl+C)
