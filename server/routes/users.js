/**
 * @file routes/users.js
 * @description 用户路由，处理用户资料查询与更新，包含文件上传配置。
 */

const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { searchUsers, updateProfile, getUserById } = require('../controllers/userController');
const auth = require('../middleware/auth');

// ============================
// 文件上传配置 (Multer)
// ============================

const uploadDir = path.join(__dirname, '../uploads');
fs.mkdirSync(uploadDir, { recursive: true });

// 配置磁盘存储策略
const storage = multer.diskStorage({
  // 设置上传文件的保存路径
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  // 设置文件名，采用 用户ID + 时间戳 的组合以防止冲突
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `avatar_${req.userId}_${Date.now()}${ext}`);
  },
});

// 初始化 Multer 实例，并设置校验规则
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 限制单个文件最大为 5MB
  fileFilter: (req, file, cb) => {
    // 允许上传的图片类型
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    if (extname && mimetype) {
      cb(null, true);
    } else {
      cb(new Error('不支持的文件类型，仅允许上传图片文件'));
    }
  },
});

// 搜索用户
// GET /api/users/search?q=keyword
router.get('/search', auth, searchUsers);

// 更新用户个人资料，支持头像上传
// PUT /api/users/profile
router.put('/profile', auth, upload.single('avatar'), updateProfile);

// 获取指定用户的详细资料
// GET /api/users/:id
router.get('/:id', auth, getUserById);

module.exports = router;
