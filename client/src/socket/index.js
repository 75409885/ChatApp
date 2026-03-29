/**
 * @file socket/index.js
 * @description WebSocket 客户端管理器，负责双向通信连接、事件订阅及状态同步。
 */

import { io } from 'socket.io-client'
import { useChatStore } from '@/stores/chat'
import { useFriendStore } from '@/stores/friends'
import { ElMessage } from 'element-plus'

// 服务器连接地址映射
const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:3000'

// 维持全局唯一的单例 Socket 实例
let socket = null

/**
 * 建立 WebSocket 连接并初始化事件监听
 * @param {string} token - 身份认证令牌
 * @returns {Object} Socket 实例
 */
export const connectSocket = (token) => {
  // 避免过度创建连接
  if (socket?.connected) return socket

  // 建立与后端的 Socket.IO 双向长连接
  socket = io(SOCKET_URL, {
    auth: { token },
    transports: ['websocket', 'polling']
  })

  // --- 系统生命周期事件 ---

  socket.on('connect', () => {
    console.log('[Socket] Connection established.');
  })

  socket.on('connect_error', (error) => {
    console.error('[Socket] Connection error:', error.message);
  })

  socket.on('disconnect', (reason) => {
    console.warn('[Socket] Connection disconnected:', reason);
  })

  socket.on('error', (err) => {
    ElMessage.error(err.message || '网络连接异常')
  })

  // --- 实时消息与输入状态监听 ---
  
  /** 接收新消息 */
  socket.on('new_message', ({ message, conversationId }) => {
    const chatStore = useChatStore()
    chatStore.receiveMessage(message, conversationId)
  })
  
  /** 接收离线期间及边缘场景的消息通知 */
  socket.on('message_notification', ({ message, conversationId }) => {
    const chatStore = useChatStore()
    chatStore.receiveMessage(message, conversationId)
  })

  /** 监听用户打字状态 */
  socket.on('typing', ({ userId, username, conversationId }) => {
    const chatStore = useChatStore()
    chatStore.setTypingStatus(conversationId, userId, username, true)
  })

  /** 监听打字停止状态 */
  socket.on('stop_typing', ({ userId, conversationId }) => {
    const chatStore = useChatStore()
    chatStore.setTypingStatus(conversationId, userId, null, false)
  })

  // --- 社交关系与在线状态监听 ---
  
  /** 同步好友上线 */
  socket.on('user_online', ({ userId }) => {
    const friendStore = useFriendStore()
    friendStore.updateUserStatus(userId, 'online')
  })

  /** 同步好友下线 */
  socket.on('user_offline', ({ userId }) => {
    const friendStore = useFriendStore()
    friendStore.updateUserStatus(userId, 'offline')
  })

  /** 同步好友状态修改 */
  socket.on('user_status_change', ({ userId, status }) => {
    const friendStore = useFriendStore()
    friendStore.updateUserStatus(userId, status)
  })

  /** 实时好友申请接收 */
  socket.on('friend_request', (request) => {
    const friendStore = useFriendStore()
    friendStore.receiveFriendRequest(request)
    ElMessage.info(`收到来自 ${request.from.username} 的好友请求`)
  })

  /** 好友申请被接受提醒 */
  socket.on('friend_accepted', (data) => {
    const friendStore = useFriendStore()
    friendStore.fetchFriends() 
    ElMessage.success(`${data.from.username} 接受了你的好友请求，立刻找他聊天吧！`)
  })

  return socket
}

/**
 * 手动断开 WebSocket 连接
 */
export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect()
    socket = null
  }
}

/**
 * 获取当前的全局 Socket 实例
 */
export const getSocket = () => socket
