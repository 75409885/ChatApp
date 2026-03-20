/**
 * @file middleware/errorHandler.js
 * @description 全局错误处理中间件，集中处理应用中抛出的各类异常并返回统一的错误响应。
 */

/**
 * 全局错误处理函数
 * @param {Object} err - 错误对象
 * @param {Object} req - Express 请求对象
 * @param {Object} res - Express 响应对象
 * @param {Function} next - 下一个中间件
 */
const errorHandler = (err, req, res, next) => {
  // 记录错误日志
  console.error(`[Error Log] ${req.method} ${req.path} failed:`, err.message);

  // 1. 处理 Sequelize 验证错误 (数据模型校验失败)
  if (err.name === 'SequelizeValidationError') {
    const messages = err.errors.map((e) => e.message);
    return res.status(400).json({ code: 400, message: '数据验证失败', errors: messages });
  }

  // 2. 处理 Sequelize 唯一性约束错误 (如用户名或邮箱冲突)
  if (err.name === 'SequelizeUniqueConstraintError') {
    return res.status(409).json({ code: 409, message: '数据已存在（用户名或邮箱重复）' });
  }

  // 3. 处理 Mongoose 验证错误
  if (err.name === 'ValidationError') {
    return res.status(400).json({ code: 400, message: '数据验证失败', errors: Object.values(err.errors).map((e) => e.message) });
  }

  // 4. 处理其他未知错误
  const statusCode = err.statusCode || 500;
  res.status(statusCode).json({
    code: statusCode,
    message: err.message || '服务器内部错误',
  });
};

module.exports = errorHandler;
