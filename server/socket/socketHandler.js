/**
 * @file socketHandler.js
 * @description WebSocket 事件处理器，管理实时双向通信、状态同步及消息即时推送。
 */

const { verifyToken } = require('../utils/jwt');
const User = require('../models/mysql/User');
const Message = require('../models/mongo/Message');
const Conversation = require('../models/mongo/Conversation');

/**
 * 在线用户映射表 (Key: 用户ID, Value: 对应的 Socket ID)
 */
const onlineUsers = new Map();

/**
 * 初始化 Socket.IO 服务
 * @param {Object} io - Socket.IO 实例
 */
const initSocket = (io) => {
  
  // 建立连接前的中间件：身份认证与权限校验
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token;
      if (!token) return next(new Error('未提供认证令牌，连接拒绝'));

      const decoded = verifyToken(token);
      if (!decoded) return next(new Error('令牌无效或已过期'));

      const user = await User.findByPk(decoded.id);
      if (!user) return next(new Error('用户不存在'));

      // 将用户信息挂载到 socket 实例上，供后续事件处理器使用
      socket.userId = decoded.id;
      socket.username = decoded.username;
      
      next();
    } catch (error) {
      next(new Error('认证失败'));
    }
  });

  // 处理客户端连接
  io.on('connection', async (socket) => {
    const userId = socket.userId;
    console.log(`[Socket] Connected: ${socket.username}(${userId}), ID: ${socket.id}`);

    // 登记在线状态并更新数据库
    onlineUsers.set(userId, socket.id);
    await User.update({ status: 'online' }, { where: { id: userId } });

    // 广播上线事件
    socket.broadcast.emit('user_online', { userId, username: socket.username });

    // 推送当前所有在线用户的 ID 列表给新连接的客户端
    socket.emit('online_users', Array.from(onlineUsers.keys()));

    // ================== 事件处理逻辑 ==================

    // 1. 加入会话房间
    socket.on('join_conversation', (conversationId) => {
      socket.join(`conv_${conversationId}`);
    });

    // 2. 发送实时消息
    socket.on('send_message', async (data) => {
      try {
        const { conversationId, content, type = 'text', fileInfo } = data;

        // 持久化消息到 MongoDB
        const message = await Message.create({
          conversationId,
          senderId: userId,
          content,
          type,
          fileInfo: fileInfo || {},
          readBy: [userId],
        });

        // 更新会话摘要与未读计数（反范式设计优化性能）
        const conversation = await Conversation.findById(conversationId);
        if (conversation) {
          conversation.lastMessage = {
            content: type === 'text' ? content : `[${type === 'image' ? '图片' : '文件'}]`,
            senderId: userId,
            timestamp: new Date(),
            type,
          };

          // 对其他参与者增加未读计数
          conversation.participants.forEach((pid) => {
            if (pid !== userId) {
              const current = conversation.unreadCount.get(String(pid)) || 0;
              conversation.unreadCount.set(String(pid), current + 1);
            }
          });
          await conversation.save();
        }

        // 推送新消息到当前房间内的所有活跃客户端
        io.to(`conv_${conversationId}`).emit('new_message', {
          message: message.toObject(),
          conversationId,
        });

        // 针对不处于会话房间但在其他页面活跃的用户，通过私有推送发送系统通知
        if (conversation) {
          conversation.participants.forEach((pid) => {
            if (pid !== userId && onlineUsers.has(pid)) {
              const targetSocketId = onlineUsers.get(pid);
              io.to(targetSocketId).emit('message_notification', {
                conversationId,
                message: message.toObject(),
              });
            }
          });
        }
      } catch (error) {
        console.error('[Socket] Failed to send message:', error.message);
        socket.emit('error', { message: '消息发送失败' });
      }
    });

    // 3. 正在输入状态同步
    socket.on('typing', (data) => {
      const { conversationId } = data;
      socket.to(`conv_${conversationId}`).emit('typing', {
        userId,
        username: socket.username,
        conversationId,
      });
    });

    socket.on('stop_typing', (data) => {
      const { conversationId } = data;
      socket.to(`conv_${conversationId}`).emit('stop_typing', {
        userId,
        conversationId,
      });
    });

    // 4. 标记消息已读
    socket.on('mark_read', async (data) => {
      try {
        const { conversationId } = data;
        // 批量更新数据库中的消息已读状态
        await Message.updateMany(
          {
            conversationId,
            senderId: { $ne: userId },
            readBy: { $nin: [userId] },
          },
          { $push: { readBy: userId } }
        );

        // 重置会话中的当前用户未读计数
        const conversation = await Conversation.findById(conversationId);
        if (conversation) {
          conversation.unreadCount.set(String(userId), 0);
          await conversation.save();
        }
      } catch (error) {
        console.error('[Socket] Failed to mark read:', error.message);
      }
    });

    // 5. 修改在线状态
    socket.on('change_status', async (newStatus) => {
      try {
        const validStatuses = ['online', 'offline', 'busy', 'away'];
        if (validStatuses.includes(newStatus)) {
          await User.update({ status: newStatus }, { where: { id: userId } });
          console.log(`[Socket] Status changed: ${socket.username}(${userId}) -> ${newStatus}`);
          socket.broadcast.emit('user_status_change', { userId, status: newStatus });
        }
      } catch (error) {
        console.error('[Socket] Failed to change status:', error.message);
      }
    });

    // 处理断开连接
    socket.on('disconnect', async () => {
      console.log(`[Socket] Disconnected: ${socket.username}(${userId})`);
      
      // 更新在线状态账本及数据库
      onlineUsers.delete(userId);
      await User.update({ status: 'offline' }, { where: { id: userId } });
      
      // 广播离线事件
      socket.broadcast.emit('user_offline', { userId });
    });
  });
};

module.exports = { initSocket };
