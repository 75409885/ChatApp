/**
 * @file routes/friends.js
 * @description 好友关系路由，处理好友申请、同步及管理逻辑。
 */

const express = require('express');
const router = express.Router();
const {
  sendRequest,
  acceptRequest,
  rejectRequest,
  removeFriend,
  getFriends,
  getPendingRequests,
} = require('../controllers/friendController');
const auth = require('../middleware/auth');

// 所有好友操作路由均需要身份验证
router.use(auth);

// 获取好友列表
// GET /api/friends
router.get('/', getFriends);

// 获取待处理的好友申请列表
// GET /api/friends/requests
router.get('/requests', getPendingRequests);

// 发送好友申请
// POST /api/friends/request
router.post('/request', sendRequest);

// 接受好友请求
// PUT /api/friends/accept/:id
router.put('/accept/:id', acceptRequest);

// 拒绝好友请求
// PUT /api/friends/reject/:id
router.put('/reject/:id', rejectRequest);

// 删除好友
// DELETE /api/friends/:id
router.delete('/:id', removeFriend);

module.exports = router;
