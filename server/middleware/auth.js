/**
 * @file middleware/auth.js
 * @description 身份认证中间件，用于验证请求中的 JWT 令牌。
 */

const { verifyToken } = require('../utils/jwt');
const User = require('../models/mysql/User');

/**
 * 身份认证中间件函数
 * @param {Object} req - Express 请求对象
 * @param {Object} res - Express 响应对象
 * @param {Function} next - 下一个中间件
 */
const auth = async (req, res, next) => {
  try {
    // 1. 获取认证令牌
    const authHeader = req.headers.authorization;
    let token = null;

    // 优先从 Authorization Header 获取，其次从 Cookie 获取
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
    } else if (req.cookies && req.cookies.token) {
      token = req.cookies.token;
    }

    if (!token) {
      return res.status(401).json({ code: 401, message: '未提供认证令牌，请先登录' });
    }

    // 2. 验证令牌有效性
    const decoded = verifyToken(token);
    if (!decoded) {
      return res.status(401).json({ code: 401, message: '认证令牌无效或已过期，请重新登录' });
    }

    // 3. 校验用户是否存在（防止封禁或注销用户继续使用令牌）
    const user = await User.findByPk(decoded.id);
    if (!user) {
      return res.status(401).json({ code: 401, message: '用户不存在或已被禁用' });
    }

    // 4. 将用户信息注入请求对象，便于后续路由逻辑使用
    req.user = user.toSafeJSON();
    req.userId = decoded.id;
    
    next();
  } catch (error) {
    console.error('认证中间件错误:', error.message);
    res.status(500).json({ code: 500, message: '服务器内部错误' });
  }
};

module.exports = auth;
