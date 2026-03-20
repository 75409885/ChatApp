/**
 * @file controllers/chatController.js
 * @description 聊天业务控制器，处理会话管理和消息提取逻辑。
 */

const Conversation = require('../models/mongo/Conversation');
const Message = require('../models/mongo/Message');
const User = require('../models/mysql/User');

/**
 * 获取当前用户的会话列表
 * @param {Object} req - Express 请求对象
 * @param {Object} res - Express 响应对象
 * @param {Function} next - 下一个中间件
 */
const getConversations = async (req, res, next) => {
  try {
    const userId = req.userId;

    // 1. 查询用户参与的所有会话，按最后更新时间倒序排列
    const conversations = await Conversation.find({
      participants: userId,
    }).sort({ updatedAt: -1 });

    // 2. 补全会话参与者的详细信息（头像、用户名等）
    const enriched = await Promise.all(
      conversations.map(async (conv) => {
        const convObj = conv.toObject();

        const participantDetails = await User.findAll({
          where: { id: conv.participants },
          attributes: ['id', 'username', 'avatar', 'status'],
        });

        convObj.participantDetails = participantDetails;
        convObj.myUnreadCount = conv.unreadCount.get(String(userId)) || 0;

        return convObj;
      })
    );

    res.json({ code: 200, data: enriched });
  } catch (error) {
    next(error);
  }
};

/**
 * 获取指定会话的消息记录（带分页）
 * @param {Object} req - Express 请求对象
 * @param {Object} res - Express 响应对象
 * @param {Function} next - 下一个中间件
 */
const getMessages = async (req, res, next) => {
  try {
    const { conversationId } = req.params;
    
    // 分页参数解析
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 30;
    const skip = (page - 1) * limit;

    const conversation = await Conversation.findById(conversationId);
    if (!conversation || !conversation.participants.includes(req.userId)) {
      return res.status(403).json({ code: 403, message: '无权查看该会话' });
    }

    // 查询消息记录
    const messages = await Message.find({ conversationId })
      .sort({ createdAt: -1 }) // 先按时间倒序获取最新的记录
      .skip(skip)
      .limit(limit);

    const total = await Message.countDocuments({ conversationId });

    // 用户查看消息后，清空其在该会话中的未读计数
    conversation.unreadCount.set(String(req.userId), 0);
    await conversation.save();

    res.json({
      code: 200,
      data: {
        // 返回结果需反转为正序（旧消息在前，新消息在后）
        messages: messages.reverse(), 
        total,
        page,
        limit,
        hasMore: skip + limit < total,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 创建或获取私聊会话
 * @param {Object} req - Express 请求对象
 * @param {Object} res - Express 响应对象
 * @param {Function} next - 下一个中间件
 */
const createConversation = async (req, res, next) => {
  try {
    const { targetUserId } = req.body;
    const userId = req.userId;

    if (!targetUserId) return res.status(400).json({ code: 400, message: '请指定目标用户' });
    if (userId === targetUserId) return res.status(400).json({ code: 400, message: '不能与自己创建会话' });

    const targetUser = await User.findByPk(targetUserId);
    if (!targetUser) return res.status(404).json({ code: 404, message: '目标用户不存在' });

    // 查找是否已存在这两个用户的私聊会话
    const existing = await Conversation.findOne({
      type: 'private',
      participants: { $all: [userId, targetUserId], $size: 2 },
    });

    if (existing) {
      return res.json({ code: 200, data: existing });
    }

    // 创建新会话
    const conversation = await Conversation.create({
      type: 'private',
      participants: [userId, targetUserId],
    });

    res.status(201).json({ code: 201, message: '会话创建成功', data: conversation });
  } catch (error) {
    next(error);
  }
};

module.exports = { getConversations, getMessages, createConversation };
