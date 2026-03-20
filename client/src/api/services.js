/**
 * @file api/services.js
 * @description API 服务集合，按功能模块封装具体的后端接口调用。
 */

import api from './index'

// --- 身份认证与账号管理 ---

/** 登录接口 */
export const login = (data) => api.post('/auth/login', data)
/** 注册接口 */
export const register = (data) => api.post('/auth/register', data)
/** 获取当前登录用户资料 */
export const getMe = () => api.get('/auth/me')

// --- 用户资料与搜索 ---

/** 更新用户资料（头像、签名等） */
export const updateProfile = (formData) => {
  return api.put('/users/profile', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  })
}
/** 按关键词搜索用户 */
export const searchUsers = (q) => api.get(`/users/search?q=${encodeURIComponent(q)}`)
/** 获取指定用户信息 */
export const getUserById = (id) => api.get(`/users/${id}`)

// --- 社交与好友关系 ---

/** 获取好友列表 */
export const getFriends = () => api.get('/friends')
/** 获取待处理的好友申请 */
export const getFriendRequests = () => api.get('/friends/requests')
/** 发送好友申请 */
export const sendFriendRequest = (friendId) => api.post('/friends/request', { friendId })
/** 接受好友申请 */
export const acceptFriendRequest = (id) => api.put(`/friends/accept/${id}`)
/** 拒绝好友申请 */
export const rejectFriendRequest = (id) => api.put(`/friends/reject/${id}`)
/** 删除好友 */
export const removeFriend = (id) => api.delete(`/friends/${id}`)

// --- 消息与即时通讯 ---

/** 获取当前用户的会话摘要列表 */
export const getConversations = () => api.get('/chat/conversations')
/** 创建或获取与目标用户的会话 */
export const createConversation = (targetUserId) => api.post('/chat/conversations', { targetUserId })
/** 分页获取历史消息 */
export const getMessages = (conversationId, page = 1, limit = 30) => {
  return api.get(`/chat/messages/${conversationId}?page=${page}&limit=${limit}`)
}
