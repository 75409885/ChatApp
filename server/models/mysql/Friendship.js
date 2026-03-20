/**
 * @file models/mysql/Friendship.js
 * @description 好友关系模型，维护用户间的好友状态及关联。
 */

const { DataTypes } = require('sequelize');
const { sequelize } = require('../../config/db');

/**
 * Defining the friendships table
 */
const Friendship = sequelize.define('friendships', {
  // 主键 ID
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  
  // 发起方用户 ID
  user_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  
  // 接收方用户 ID
  friend_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  
  // 关系状态
  status: {
    type: DataTypes.ENUM('pending', 'accepted', 'rejected', 'blocked'),
    defaultValue: 'pending',
    comment: '状态：pending (申请中), accepted (已同意), rejected (已拒绝), blocked (已拉黑)',
  },
  
  // 好友备注
  remark: {
    type: DataTypes.STRING(50),
    defaultValue: '',
  },
}, {
  // 设置复合唯一索引，防止重复发起申请
  indexes: [
    {
      unique: true,
      fields: ['user_id', 'friend_id'],
      name: 'unique_friendship',
    },
  ],
});

// 设置模型关联
Friendship.associate = (models) => {
  // 关联发起者用户信息
  Friendship.belongsTo(models.User, { foreignKey: 'user_id', as: 'requester' });
  // 关联接收者用户信息
  Friendship.belongsTo(models.User, { foreignKey: 'friend_id', as: 'receiver' });
};

module.exports = Friendship;
