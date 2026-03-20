/**
 * @file controllers/authController.js
 * @description 身份认证控制器，处理注册、登录和会话验证逻辑。
 */

const User = require('../models/mysql/User');
const { generateToken } = require('../utils/jwt');

/**
 * 用户注册
 * @param {Object} req - Express 请求对象
 * @param {Object} res - Express 响应对象
 * @param {Function} next - 下一个中间件
 */
const register = async (req, res, next) => {
  try {
    // 1. 解析请求体
    const { username, email, password } = req.body;

    // 2. 基础校验
    if (!username || !email || !password) {
      return res.status(400).json({ code: 400, message: '用户名、邮箱和密码均为必填项' });
    }
    if (password.length < 6) {
      return res.status(400).json({ code: 400, message: '密码长度不能少于6位' });
    }

    // 3. 检查用户名和邮箱是否已存在
    const existingUser = await User.findOne({ where: { username } });
    if (existingUser) {
      return res.status(409).json({ code: 409, message: '用户名已被占用' });
    }

    const existingEmail = await User.findOne({ where: { email } });
    if (existingEmail) {
      return res.status(409).json({ code: 409, message: '邮箱已被注册' });
    }

    // 4. 创建用户。密码哈希逻辑已在模型 Hook 中实现
    const user = await User.create({ username, email, password });

    // 5. 生成认证 Token
    const token = generateToken({ id: user.id, username: user.username });

    // 6. 返回成功响应
    res.status(201).json({
      code: 201,
      message: '注册成功',
      data: {
        token,
        user: user.toSafeJSON(),
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 用户登录
 * @param {Object} req - Express 请求对象
 * @param {Object} res - Express 响应对象
 * @param {Function} next - 下一个中间件
 */
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ code: 400, message: '邮箱和密码均为必填项' });
    }

    // 根据邮箱查询用户
    const user = await User.findOne({ where: { email } });
    if (!user) {
      // 统一错误提示，防止邮箱枚举攻击
      return res.status(401).json({ code: 401, message: '邮箱或密码错误' });
    }

    // 验证密码
    const isMatch = await user.validatePassword(password);
    if (!isMatch) {
      return res.status(401).json({ code: 401, message: '邮箱或密码错误' });
    }

    // 更新登录状态和时间
    await user.update({
      last_login: new Date(),
      status: 'online',
    });

    // 生成认证 Token
    const token = generateToken({ id: user.id, username: user.username });

    res.json({
      code: 200,
      message: '登录成功',
      data: {
        token,
        user: user.toSafeJSON(),
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 获取当前登录用户信息
 * @param {Object} req - Express 请求对象
 * @param {Object} res - Express 响应对象
 * @param {Function} next - 下一个中间件
 */
const getMe = async (req, res, next) => {
  try {
    // 根据中间件注入的 userId 查询用户
    const user = await User.findByPk(req.userId);
    if (!user) {
      return res.status(404).json({ code: 404, message: '用户不存在' });
    }

    res.json({
      code: 200,
      data: user.toSafeJSON(),
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { register, login, getMe };
