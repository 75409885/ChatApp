/**
 * @file socketHandler.js
 * @description WebSocket 事件处理器，管理实时双向通信、状态同步及消息即时推送。
 */

const { verifyToken } = require('../utils/jwt');
const User = require('../models/mysql/User');
const Message = require('../models/mongo/Message');
const Conversation = require('../models/mongo/Conversation');

/**
 * 在线用户映射表 (Key: 用户ID, Value: 当前用户打开的 Socket ID 集合)
 */
const onlineUsers = new Map();

const addUserSocket = (userId, socketId) => {
  const sockets = onlineUsers.get(userId) || new Set();
  sockets.add(socketId);
  onlineUsers.set(userId, sockets);
  return sockets.size;
};

const removeUserSocket = (userId, socketId) => {
  const sockets = onlineUsers.get(userId);
  if (!sockets) return 0;

  sockets.delete(socketId);
  if (sockets.size === 0) {
    onlineUsers.delete(userId);
    return 0;
  }

  return sockets.size;
};

const getUserSocketIds = (userId) => {
  return Array.from(onlineUsers.get(userId) || []);
};

const getOnlineUserIds = () => Array.from(onlineUsers.keys());

const getConversationForUser = async (conversationId, userId) => {
  const conversation = await Conversation.findById(conversationId);
  if (!conversation) return null;

  const isParticipant = conversation.participants.some((pid) => Number(pid) === Number(userId));
  return isParticipant ? conversation : null;
};

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
    const socketCount = addUserSocket(userId, socket.id);
    socket.join(`user_${userId}`);

    if (socketCount === 1) {
      await User.update({ status: 'online' }, { where: { id: userId } });
      // 广播上线事件
      socket.broadcast.emit('user_online', { userId, username: socket.username });
    }

    // 推送当前所有在线用户的 ID 列表给新连接的客户端
    socket.emit('online_users', getOnlineUserIds());

    // ================== 事件处理逻辑 ==================

    // 1. 加入会话房间
    socket.on('join_conversation', async (conversationId) => {
      try {
        const conversation = await getConversationForUser(conversationId, userId);
        if (!conversation) {
          return socket.emit('error', { message: '无权加入该会话' });
        }
        socket.join(`conv_${conversationId}`);
      } catch (error) {
        socket.emit('error', { message: '加入会话失败' });
      }
    });

    // 2. 发送实时消息
    socket.on('send_message', async (data) => {
      try {
        const { conversationId, content, type = 'text', fileInfo } = data;
        const validTypes = ['text', 'image', 'file'];
        const safeContent = String(content || '').trim();

        if (!conversationId || !validTypes.includes(type) || !safeContent) {
          return socket.emit('error', { message: '消息内容不合法' });
        }

        const conversation = await getConversationForUser(conversationId, userId);
        if (!conversation) {
          return socket.emit('error', { message: '无权向该会话发送消息' });
        }

        // 持久化消息到 MongoDB
        const message = await Message.create({
          conversationId,
          senderId: userId,
          content: safeContent,
          type,
          fileInfo: fileInfo || {},
          readBy: [userId],
        });

        // 更新会话摘要与未读计数（反范式设计优化性能）
        conversation.lastMessage = {
          content: type === 'text' ? safeContent : `[${type === 'image' ? '图片' : '文件'}]`,
          senderId: userId,
          timestamp: new Date(),
          type,
        };

        // 对其他参与者增加未读计数
        conversation.participants.forEach((pid) => {
          if (Number(pid) !== Number(userId)) {
            const current = conversation.unreadCount.get(String(pid)) || 0;
            conversation.unreadCount.set(String(pid), current + 1);
          }
        });
        await conversation.save();

        // 推送新消息到当前房间内的所有活跃客户端
        io.to(`conv_${conversationId}`).emit('new_message', {
          message: message.toObject(),
          conversationId,
        });

        // 针对不处于会话房间但在其他页面活跃的用户，通过私有推送发送系统通知
        const roomName = `conv_${conversationId}`;
        const roomSockets = io.sockets.adapter.rooms.get(roomName) || new Set();
        conversation.participants.forEach((pid) => {
          if (Number(pid) === Number(userId)) return;

          getUserSocketIds(Number(pid)).forEach((targetSocketId) => {
            if (!roomSockets.has(targetSocketId)) {
              io.to(targetSocketId).emit('message_notification', {
                conversationId,
                message: message.toObject(),
              });
            }
          });
        });
      } catch (error) {
        console.error('[Socket] Failed to send message:', error.message);
        socket.emit('error', { message: '消息发送失败' });
      }
    });

    // 3. 正在输入状态同步
    socket.on('typing', (data) => {
      const { conversationId } = data;
      if (!socket.rooms.has(`conv_${conversationId}`)) return;
      socket.to(`conv_${conversationId}`).emit('typing', {
        userId,
        username: socket.username,
        conversationId,
      });
    });

    socket.on('stop_typing', (data) => {
      const { conversationId } = data;
      if (!socket.rooms.has(`conv_${conversationId}`)) return;
      socket.to(`conv_${conversationId}`).emit('stop_typing', {
        userId,
        conversationId,
      });
    });

    // 4. 标记消息已读
    socket.on('mark_read', async (data) => {
      try {
        const { conversationId } = data;
        const conversation = await getConversationForUser(conversationId, userId);
        if (!conversation) return;

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
        conversation.unreadCount.set(String(userId), 0);
        await conversation.save();
      } catch (error) {
        console.error('[Socket] Failed to mark read:', error.message);
      }
    });

    // 5. 语音/视频通话信令转发
    socket.on('call_invite', async (data) => {
      try {
        const { conversationId, callType = 'audio' } = data;
        const conversation = await getConversationForUser(conversationId, userId);
        if (!conversation) return;

        const targets = conversation.participants.filter((pid) => Number(pid) !== Number(userId));
        targets.forEach((pid) => {
          io.to(`user_${pid}`).emit('call_invite', {
            conversationId,
            callType,
            from: { id: userId, username: socket.username },
          });
        });
      } catch (error) {
        console.error('[Socket] Failed to invite call:', error.message);
      }
    });

    socket.on('call_answer', async (data) => {
      try {
        const { conversationId, targetUserId, accepted, callType = 'audio' } = data;
        const conversation = await getConversationForUser(conversationId, userId);
        const targetId = Number(targetUserId);
        if (!conversation || !conversation.participants.some((pid) => Number(pid) === targetId)) return;

        io.to(`user_${targetId}`).emit('call_answer', {
          conversationId,
          accepted: Boolean(accepted),
          callType,
          from: { id: userId, username: socket.username },
        });
      } catch (error) {
        console.error('[Socket] Failed to answer call:', error.message);
      }
    });

    socket.on('call_signal', async (data) => {
      try {
        const { conversationId, targetUserId, signal } = data;
        const conversation = await getConversationForUser(conversationId, userId);
        const targetId = Number(targetUserId);
        if (!conversation || !signal || !conversation.participants.some((pid) => Number(pid) === targetId)) return;

        io.to(`user_${targetId}`).emit('call_signal', {
          conversationId,
          signal,
          fromUserId: userId,
        });
      } catch (error) {
        console.error('[Socket] Failed to relay call signal:', error.message);
      }
    });

    socket.on('call_end', async (data) => {
      try {
        const { conversationId, targetUserId } = data;
        const conversation = await getConversationForUser(conversationId, userId);
        const targetId = Number(targetUserId);
        if (!conversation || !conversation.participants.some((pid) => Number(pid) === targetId)) return;

        io.to(`user_${targetId}`).emit('call_end', {
          conversationId,
          fromUserId: userId,
        });
      } catch (error) {
        console.error('[Socket] Failed to end call:', error.message);
      }
    });

    // 6. 修改在线状态
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
      const remainingSockets = removeUserSocket(userId, socket.id);
      if (remainingSockets === 0) {
        await User.update({ status: 'offline' }, { where: { id: userId } });
        // 广播离线事件
        socket.broadcast.emit('user_offline', { userId });
      }
    });
  });
};

module.exports = { initSocket };
