/**
 * @file routes/auth.js
 * @description 身份认证路由，处理用户注册、登录及获取个人信息。
 */

const express = require('express');
const router = express.Router();
const { register, login, getMe } = require('../controllers/authController');
const auth = require('../middleware/auth'); // 身份认证中间件

// 用户注册
// POST /api/auth/register
router.post('/register', register);

// 用户登录
// POST /api/auth/login
router.post('/login', login);

// 获取当前登录用户信息
// GET /api/auth/me
router.get('/me', auth, getMe);

module.exports = router;
