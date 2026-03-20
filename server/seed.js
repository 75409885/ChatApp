/**
 * @file server/seed.js
 * @description 数据库初始数据填充脚本，用于开发环境快速构建演示数据。
 * 支持 MySQL (Sequelize) 与 MongoDB (Mongoose) 的同步初始化。
 */

const { connectMongoDB, connectMySQL, sequelize, mongoose } = require('./config/db');
const User = require('./models/mysql/User');
const Friendship = require('./models/mysql/Friendship');
const Conversation = require('./models/mongo/Conversation');
const Message = require('./models/mongo/Message');

/**
 * 执行数据填充主逻辑
 */
async function seed() {
  console.log('[Seed] 正在连接数据库...');
  await connectMySQL();
  await connectMongoDB();

  console.log('[Seed] 正在同步用户数据...');
  const users = [
    { username: 'Alice', email: 'alice@example.com', password: 'password123', signature: 'Hello I am Alice', status: 'online' },
    { username: 'Bob', email: 'bob@example.com', password: 'password123', signature: 'Hello I am Bob', status: 'offline' },
    { username: 'Charlie', email: 'charlie@example.com', password: 'password123', signature: 'Hello I am Charlie', status: 'online' }
  ];

  const createdUsers = [];
  for (const u of users) {
    let user = await User.findOne({ where: { email: u.email } });
    if (!user) {
      user = await User.create(u);
    } else {
      console.log(`[Seed] 用户 ${u.username} 已存在，跳过创建`);
    }
    createdUsers.push(user);
  }

  const [alice, bob, charlie] = createdUsers;

  console.log('[Seed] 正在建立好友关系...');
  // 建立 Alice 与 Bob 的双向好友关系
  let f1 = await Friendship.findOne({ where: { user_id: alice.id, friend_id: bob.id } });
  if (!f1) {
    await Friendship.create({ user_id: alice.id, friend_id: bob.id, status: 'accepted' });
    await Friendship.create({ user_id: bob.id, friend_id: alice.id, status: 'accepted' });
  }

  // 建立 Alice 与 Charlie 的双向好友关系
  let f2 = await Friendship.findOne({ where: { user_id: alice.id, friend_id: charlie.id } });
  if (!f2) {
    await Friendship.create({ user_id: alice.id, friend_id: charlie.id, status: 'accepted' });
    await Friendship.create({ user_id: charlie.id, friend_id: alice.id, status: 'accepted' });
  }

  console.log('[Seed] 正在初始化会话与消息流...');
  
  // 初始化 Alice-Bob 私聊会话
  let conv1 = await Conversation.findOne({ participants: { $all: [alice.id, bob.id] }, type: 'private' });
  if (!conv1) {
    conv1 = new Conversation({
      type: 'private',
      participants: [alice.id, bob.id]
    });
    await conv1.save();

    // 预置往返消息
    const msg1 = new Message({
      conversationId: conv1._id,
      senderId: alice.id,
      content: 'Hello Bob! How are you?',
      type: 'text',
      readBy: [alice.id, bob.id]
    });
    await msg1.save();
    
    const msg2 = new Message({
      conversationId: conv1._id,
      senderId: bob.id,
      content: 'Hi Alice! I am doing great, what about you?',
      type: 'text',
      readBy: [alice.id, bob.id]
    });
    await msg2.save();

    // 更新最后消息摘要以同步列表展示
    conv1.lastMessage = {
      content: msg2.content,
      senderId: msg2.senderId,
      timestamp: msg2.createdAt
    };
    await conv1.save();
  }

  // 初始化 Alice-Charlie 私聊会话及未读提醒
  let conv2 = await Conversation.findOne({ participants: { $all: [alice.id, charlie.id] }, type: 'private' });
  if (!conv2) {
    conv2 = new Conversation({
      type: 'private',
      participants: [alice.id, charlie.id]
    });
    await conv2.save();

    const msg3 = new Message({
      conversationId: conv2._id,
      senderId: charlie.id,
      content: 'Hey Alice, are we still meeting tomorrow?',
      type: 'text',
      readBy: [alice.id, charlie.id]
    });
    await msg3.save();

    conv2.lastMessage = {
      content: msg3.content,
      senderId: msg3.senderId,
      timestamp: msg3.createdAt
    };
    // 设置未读计数模拟
    conv2.unreadCount.set(alice.id.toString(), 1); 
    await conv2.save();
  }

  console.log('✅ [Seed] 数据填充脚本执行完毕！');
  process.exit(0);
}

seed().catch(err => {
  console.error('❌ [Seed] 脚本执行失败:', err);
  process.exit(1);
});
