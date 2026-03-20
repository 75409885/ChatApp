/**
 * @file models/mysql/User.js
 * @description 用户模型，定义用户核心属性、安全校验逻辑及生命周期钩子。
 */

const { DataTypes } = require('sequelize');
const { sequelize } = require('../../config/db');
const bcrypt = require('bcryptjs');

/**
 * Defining the users table
 */
const User = sequelize.define('users', {
  // 用户唯一标识
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
    comment: '用户唯一标识',
  },
  
  // 用户名
  username: {
    type: DataTypes.STRING(50),
    allowNull: false,
    unique: true,
    validate: {
      len: [2, 50],
    },
    comment: '用户名',
  },
  
  // 邮箱地址
  email: {
    type: DataTypes.STRING(100),
    allowNull: false,
    unique: true,
    validate: {
      isEmail: true,
    },
    comment: '邮箱地址',
  },
  
  // 密码哈希值
  password: {
    type: DataTypes.STRING(255),
    allowNull: false,
    comment: '密码哈希值',
  },
  
  // 用户头像 URL
  avatar: { type: DataTypes.STRING(255), defaultValue: '', comment: '头像 URL' },
  // 个性签名
  signature: { type: DataTypes.STRING(200), defaultValue: '', comment: '个性签名' },
  
  // 在线状态：online, offline, busy, away
  status: {
    type: DataTypes.ENUM('online', 'offline', 'busy', 'away'),
    defaultValue: 'offline',
    comment: '在线状态',
  },
  // 最近登录时间
  last_login: { type: DataTypes.DATE, allowNull: true, comment: '最近一次登录时间' },
}, {
  // 生命周期钩子：用于处理敏感数据的自动加密。
  hooks: {
    // 创建前对密码进行哈希处理
    beforeCreate: async (user) => {
      if (user.password) {
        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(user.password, salt);
      }
    },
    // 更新时若密码发生变化，重新进行哈希处理
    beforeUpdate: async (user) => {
      if (user.changed('password')) {
        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(user.password, salt);
      }
    },
  },
});

/**
 * 验证明文密码是否与数据库存储的哈希值匹配
 * @param {string} inputPassword - 待验证的明文密码
 * @returns {Promise<boolean>}
 */
User.prototype.validatePassword = async function (inputPassword) {
  return bcrypt.compare(inputPassword, this.password);
};

/**
 * 转换模型为不含敏感信息的 JSON 对象
 * @returns {Object}
 */
User.prototype.toSafeJSON = function () {
  const values = { ...this.get() };
  delete values.password;
  return values;
};

module.exports = User;
