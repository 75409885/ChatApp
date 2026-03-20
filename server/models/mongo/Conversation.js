/**
 * @file models/mongo/Conversation.js
 * @description 聊天会话模型，存储会话参与者、类型及最新消息摘要。
 */

const mongoose = require('mongoose');

const conversationSchema = new mongoose.Schema({
  // 会话类型：private (私聊), group (群聊)
  type: {
    type: String,
    enum: ['private', 'group'],
    default: 'private',
  },
  
  // 参与者 ID 列表 (关联 MySQL 中的用户 ID)
  participants: [{
    type: Number,
    required: true,
  }],
  
  // 群聊特定配置
  groupName: { type: String, default: '' },
  groupAvatar: { type: String, default: '' },
  
  // 最新消息缓存 (反范式设计，用于优化列表拉取性能)
  lastMessage: {
    content: { type: String, default: '' },
    senderId: { type: Number, default: null },
    timestamp: { type: Date, default: null },
    type: { type: String, default: 'text' },
  },
  
  // 用户未读消息计数映射 (Key: 用户ID, Value: 计数)
  unreadCount: {
    type: Map,
    of: Number,
    default: {},
  },
}, {
  // 自动管理字段：createdAt, updatedAt
  timestamps: true,
});

// ======================= 索引配置 =======================
// 优化参与者查询性能
conversationSchema.index({ participants: 1 });
// 优化按更新时间排序的会话列表拉取性能
conversationSchema.index({ updatedAt: -1 });

module.exports = mongoose.model('Conversation', conversationSchema);
