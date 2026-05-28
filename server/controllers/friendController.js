/**
 * @file controllers/friendController.js
 * @description 好友关系业务控制器，处理好友申请、同步及管理。
 */

const { Op } = require('sequelize');
const Friendship = require('../models/mysql/Friendship');
const User = require('../models/mysql/User');

const USER_PUBLIC_FIELDS = ['id', 'username', 'avatar', 'signature', 'status'];

const getPublicUser = async (userId) => {
  return User.findByPk(userId, {
    attributes: USER_PUBLIC_FIELDS,
  });
};

const emitFriendRequest = async (req, friendship) => {
  const io = req.app.get('io');
  const requester = await getPublicUser(friendship.user_id);

  if (io && requester) {
    io.to(`user_${friendship.friend_id}`).emit('friend_request', {
      ...friendship.get({ plain: true }),
      requester: requester.get({ plain: true }),
    });
  }
};

const emitFriendAccepted = async (req, friendship) => {
  const io = req.app.get('io');
  const receiver = await getPublicUser(req.userId);

  if (io && receiver) {
    io.to(`user_${friendship.user_id}`).emit('friend_accepted', {
      friendship: friendship.get({ plain: true }),
      from: receiver.get({ plain: true }),
    });
  }
};

/**
 * 发送好友申请
 * @param {Object} req - Express 请求对象
 * @param {Object} res - Express 响应对象
 * @param {Function} next - 下一个中间件
 */
const sendRequest = async (req, res, next) => {
  try {
    const friendId = Number(req.body.friendId);
    const userId = req.userId;

    if (!Number.isInteger(friendId)) {
      return res.status(400).json({ code: 400, message: '好友 ID 不合法' });
    }
    if (userId === friendId) return res.status(400).json({ code: 400, message: '不能添加自己为好友' });

    const targetUser = await User.findByPk(friendId);
    if (!targetUser) return res.status(404).json({ code: 404, message: '目标用户不存在' });

    // 检查是否存在双向的关系记录
    const existing = await Friendship.findOne({
      where: {
        [Op.or]: [
          { user_id: userId, friend_id: friendId },
          { user_id: friendId, friend_id: userId },
        ],
      },
    });

    if (existing) {
      if (existing.status === 'accepted') return res.status(409).json({ code: 409, message: '已经是好友了' });
      if (existing.status === 'pending') return res.status(409).json({ code: 409, message: '已有待处理的好友请求' });
      
      // 如果之前的申请被拒绝，则重置为待处理状态并更新发起人
      if (existing.status === 'rejected') {
        existing.user_id = userId;
        existing.friend_id = friendId;
        existing.status = 'pending';
        await existing.save();
        await emitFriendRequest(req, existing);
        return res.json({ code: 200, message: '好友请求已重新发送', data: existing });
      }
    }

    // 创建新的申请记录
    const friendship = await Friendship.create({
      user_id: userId,
      friend_id: friendId,
      status: 'pending',
    });

    await emitFriendRequest(req, friendship);

    res.status(201).json({ code: 201, message: '好友请求已发送', data: friendship });
  } catch (error) {
    next(error);
  }
};

/**
 * 接受好友请求
 * @param {Object} req - Express 请求对象
 * @param {Object} res - Express 响应对象
 * @param {Function} next - 下一个中间件
 */
const acceptRequest = async (req, res, next) => {
  try {
    const friendship = await Friendship.findOne({
      where: {
        id: req.params.id,
        friend_id: req.userId, // 仅允许响应者接受
        status: 'pending',
      },
    });

    if (!friendship) return res.status(404).json({ code: 404, message: '未找到该好友请求' });

    friendship.status = 'accepted';
    await friendship.save();

    await emitFriendAccepted(req, friendship);

    res.json({ code: 200, message: '已接受好友请求', data: friendship });
  } catch (error) {
    next(error);
  }
};

/**
 * 拒绝好友请求
 * @param {Object} req - Express 请求对象
 * @param {Object} res - Express 响应对象
 * @param {Function} next - 下一个中间件
 */
const rejectRequest = async (req, res, next) => {
  try {
    const friendship = await Friendship.findOne({
      where: { id: req.params.id, friend_id: req.userId, status: 'pending' },
    });
    if (!friendship) return res.status(404).json({ code: 404, message: '未找到该好友请求' });

    friendship.status = 'rejected';
    await friendship.save();
    res.json({ code: 200, message: '已拒绝好友请求' });
  } catch (error) {
    next(error);
  }
};

/**
 * 删除好友关系
 * @param {Object} req - Express 请求对象
 * @param {Object} res - Express 响应对象
 * @param {Function} next - 下一个中间件
 */
const removeFriend = async (req, res, next) => {
  try {
    const friendship = await Friendship.findOne({
      where: {
        id: req.params.id,
        [Op.or]: [{ user_id: req.userId }, { friend_id: req.userId }],
      },
    });

    if (!friendship) return res.status(404).json({ code: 404, message: '未找到该好友关系' });

    await friendship.destroy();
    res.json({ code: 200, message: '好友已删除' });
  } catch (error) {
    next(error);
  }
};

/**
 * 获取通讯录
 * @param {Object} req - Express 请求对象
 * @param {Object} res - Express 响应对象
 * @param {Function} next - 下一个中间件
 */
const getFriends = async (req, res, next) => {
  try {
    const userId = req.userId;

    const friendships = await Friendship.findAll({
      where: {
        status: 'accepted',
        [Op.or]: [{ user_id: userId }, { friend_id: userId }],
      },
      // 包含关联用户信息
      include: [
        { model: User, as: 'requester', attributes: ['id', 'username', 'avatar', 'signature', 'status'] },
        { model: User, as: 'receiver', attributes: ['id', 'username', 'avatar', 'signature', 'status'] },
      ],
    });

    // 格式化输出，提取对方的个人信息
    const friendsMap = new Map();
    friendships.forEach((f) => {
      const friendData = f.user_id === userId ? f.receiver : f.requester;
      if (friendData && !friendsMap.has(friendData.id)) {
        friendsMap.set(friendData.id, {
          friendshipId: f.id,
          remark: f.remark,
          ...friendData.get(),
        });
      }
    });

    res.json({ code: 200, data: Array.from(friendsMap.values()) });
  } catch (error) {
    next(error);
  }
};

/**
 * 获取所有待处理的好友申请
 * @param {Object} req - Express 请求对象
 * @param {Object} res - Express 响应对象
 * @param {Function} next - 下一个中间件
 */
const getPendingRequests = async (req, res, next) => {
  try {
    const requests = await Friendship.findAll({
      where: { friend_id: req.userId, status: 'pending' },
      include: [{ model: User, as: 'requester', attributes: ['id', 'username', 'avatar', 'signature'] }],
      order: [['created_at', 'DESC']],
    });
    res.json({ code: 200, data: requests });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  sendRequest, acceptRequest, rejectRequest, removeFriend, getFriends, getPendingRequests,
};
