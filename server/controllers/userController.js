/**
 * @file controllers/userController.js
 * @description 用户资料业务控制器，处理用户搜索、个人资料更新等逻辑。
 */

const User = require('../models/mysql/User');
const { Op } = require('sequelize');
const path = require('path');

/**
 * 搜索用户（模糊查询）
 * @param {Object} req - Express 请求对象
 * @param {Object} res - Express 响应对象
 * @param {Function} next - 下一个中间件
 */
const searchUsers = async (req, res, next) => {
  try {
    const { q } = req.query;
    if (!q || q.trim().length === 0) {
      return res.json({ code: 200, data: [] });
    }

    const users = await User.findAll({
      where: {
        // 使用模糊匹配查询用户名
        username: { [Op.like]: `%${q}%` },
        // 排除当前登录用户自身
        id: { [Op.ne]: req.userId },
      },
      attributes: ['id', 'username', 'email', 'avatar', 'signature', 'status'],
      limit: 20,
    });

    res.json({ code: 200, data: users });
  } catch (error) {
    next(error);
  }
};

/**
 * 更新用户个人资料（头像/昵称等）
 * @param {Object} req - Express 请求对象
 * @param {Object} res - Express 响应对象
 * @param {Function} next - 下一个中间件
 */
const updateProfile = async (req, res, next) => {
  try {
    const { username, signature } = req.body;
    const user = await User.findByPk(req.userId);

    if (!user) return res.status(404).json({ code: 404, message: '用户不存在' });

    // 处理头像上传逻辑。若存在 req.file，则表示 Multer 已处理二进制数据并生成了文件。
    if (req.file) {
      user.avatar = `/uploads/${req.file.filename}`;
    }

    // 更新非空字段
    if (username) user.username = username;
    if (signature !== undefined) user.signature = signature;

    await user.save();

    res.json({
      code: 200,
      message: '资料更新成功',
      data: user.toSafeJSON(),
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 获取指定用户的详细资料
 * @param {Object} req - Express 请求对象
 * @param {Object} res - Express 响应对象
 * @param {Function} next - 下一个中间件
 */
const getUserById = async (req, res, next) => {
  try {
    const user = await User.findByPk(req.params.id, {
      attributes: ['id', 'username', 'email', 'avatar', 'signature', 'status', 'created_at'],
    });

    if (!user) return res.status(404).json({ code: 404, message: '查无此人' });

    res.json({ code: 200, data: user });
  } catch (error) {
    next(error);
  }
};

module.exports = { searchUsers, updateProfile, getUserById };
