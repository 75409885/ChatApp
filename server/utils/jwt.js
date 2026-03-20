/**
 * @file utils/jwt.js
 * @description JWT (JSON Web Token) 工具类，负责令牌的生成与校验。
 */

const jwt = require('jsonwebtoken');
require('dotenv').config();

// JWT 秘钥，用于签名与校验
const JWT_SECRET = process.env.JWT_SECRET || 'chatapp_jwt_secret_default';

/**
 * 生成 JWT 令牌
 * @param {Object} payload - 需要封装进令牌的数据负载
 * @param {string} expiresIn - 令牌有效期（默认 7 天）
 * @returns {string} 生成的 JWT 令牌
 */
const generateToken = (payload, expiresIn = '7d') => {
  return jwt.sign(payload, JWT_SECRET, { expiresIn });
};

/**
 * 校验并解析 JWT 令牌
 * @param {string} token - 待校验的令牌字符串
 * @returns {Object|null} 校验成功返回解码后的数据负载，失败则返回 null
 */
const verifyToken = (token) => {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    // 捕获签名错误、过期等异常，统一返回 null
    return null;
  }
};

module.exports = { generateToken, verifyToken };
