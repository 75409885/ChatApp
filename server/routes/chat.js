/**
 * @file routes/chat.js
 * @description 聊天系统路由，处理会话和消息相关的 HTTP 请求。
 */

const express = require('express');
const router = express.Router();
const { getConversations, getMessages, createConversation } = require('../controllers/chatController');
const auth = require('../middleware/auth');

// 所有聊天相关路由均需要身份验证
router.use(auth);

// 获取当前用户的会话列表
// GET /api/conversations
router.get('/conversations', getConversations);

// 创建或获取已存在的私聊会话
// POST /api/conversations
router.post('/conversations', createConversation);

// 获取指定会话的消息列表（支持分页）
// GET /api/messages/:conversationId
router.get('/messages/:conversationId', getMessages);

module.exports = router;
