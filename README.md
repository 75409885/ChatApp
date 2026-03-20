# ChatApp (实时聊天系统)

ChatApp 是一个基于现代 Web 技术栈开发的实时通讯系统全栈参考项目。本项目旨在演示如何集成即时通讯功能、双数据库架构以及复杂的前端状态管理。

---

## 🛠 技术架构

### 前端 (Client)
- **Vue 3 (Composition API)**: 核心渲染引擎，利用 `script setup` 语法实现高效的组件开发。
- **Pinia**: 全局状态管理方案，负责用户鉴权状态、实时通讯负载及未读计数等跨组件共享数据。
- **Vue Router 4**: 实现单页应用路由管理及鉴权路由守卫。
- **Socket.io-client**: 基于 WebSocket 协议实现低延迟、双向实时通讯。
- **Element Plus**: 采用 UI 组件库加速界面构建。

### 后端 (Server)
- **Node.js + Express**: 构建高性能 RESTful API 服务。
- **双数据库混合架构**:
    1. **MySQL + Sequelize**: 存储具备强关系特征的结构化数据，如用户账户体系及好友社交网络。
    2. **MongoDB + Mongoose**: 存储高频读写、非结构化的聊天记录及会话流水。
- **Socket.io (Server)**: 管理 WebSocket 连接，实现消息的精准推送与在线状态同步。
- **JWT (JSON Web Token)**: 实现跨域身份验证与有状态令牌管理。

---

## 📂 核心模块说明

本项目代码库包含详尽的专业级注释，各模块核心逻辑如下：

### 前端部分
- `client/src/socket/index.js`: 封装连接建立、全局事件监听及断线重连机制。
- `client/src/stores/chat.js`: 处理实时消息流与响应式视图的解耦与同步。
- `client/src/api/index.js`: Axios 拦截器封装，实现全局异常采集与处理。

### 后端部分
- `server/socket/socketHandler.js`: 处理连接认证、房间管理及多端推送算法。
- `server/middleware/auth.js`: 基于 JWT 的请求权限验证中间件。
- `server/models/mongo/Conversation.js`: 采用缓存摘要设计（反范式）优化列表拉取性能。

---

## 🚀 部署与运行

### 1. 环境准备
- Node.js (v18.0.0+)
- MySQL (需手动创建 `chatapp` 数据库)
- MongoDB

### 2. 后端配置与启动
```bash
cd server
cp .env.example .env # 根据实际情况配置数据库连接
npm install
npm run dev
```

### 3. 前端启动
```bash
cd client
npm install
npm run dev
```

访问 `http://localhost:5173` 进入系统环境。

---

## 📌 注意事项
- 初始运行建议执行 `npm run seed` 同步基础测试数据。
- 生产环境部署需调整 CORS 策略及数据库连接池配置。
