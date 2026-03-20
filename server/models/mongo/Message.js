/**
 * @file models/mongo/Message.js
 * @description 聊天消息模型，用于存储海量非结构化聊天记录。
 */

const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  // 关联的会话 ID
  conversationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Conversation',
    required: true,
    index: true,
  },
  
  // 发送者 ID (关联 MySQL 用户 ID)
  senderId: {
    type: Number,
    required: true,
  },
  
  // 消息内容
  content: {
    type: String,
    required: true,
    maxlength: 5000,
  },
  
  // 消息类型
  type: {
    type: String,
    enum: ['text', 'image', 'file'],
    default: 'text',
  },
  
  // 媒体文件详细信息
  fileInfo: {
    fileName: { type: String, default: '' },
    fileSize: { type: Number, default: 0 },
    fileUrl: { type: String, default: '' },
  },
  
  // 已读用户 ID 列表
  readBy: [{
    type: Number,
  }],
}, {
  // 自动管理字段：createdAt
  timestamps: true, 
});

// ======================= 索引配置 =======================
// 用于优化特定会话内的消息按时间轴查询性能
messageSchema.index({ conversationId: 1, createdAt: -1 });

module.exports = mongoose.model('Message', messageSchema);
