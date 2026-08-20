/**
 * @file stores/chat.js
 * @description 即时通讯核心 Store，管理会话列表、历史消息缓存、实时消息分发及用户输入状态。
 */

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { getConversations, getMessages, createConversation } from '@/api/services'

export const useChatStore = defineStore('chat', () => {
  /**
   * 核心状态定义
   */
  // 会话摘要列表（左侧导航栏数据）
  const conversations = ref([])

  // 当前活跃的会话 ID
  const activeConversationId = ref(null)

  // 消息缓存池
  // 结构：{ [conversationId]: { list: Array, total: Number, page: Number, hasMore: Boolean } }
  const messages = ref({})

  // 列表加载状态
  const loadingConversations = ref(false)
  // 消息加载状态
  const loadingMessages = ref(false)

  // 正在输入的参与者映射表
  const typingUsers = ref({})

  /**
   * 计算属性
   */
  // 获取当前活跃会话的详细信息
  const activeConversation = computed(() => {
    return conversations.value.find((c) => c._id === activeConversationId.value) || null
  })

  // 获取当前会话展示的消息列表
  const activeMessages = computed(() => {
    if (!activeConversationId.value) return []
    return messages.value[activeConversationId.value]?.list || []
  })

  // 是否还存在可加载的历史记录
  const hasMoreMessages = computed(() => {
    if (!activeConversationId.value) return false
    return messages.value[activeConversationId.value]?.hasMore || false
  })

  // 全站未读消息总数
  const unreadTotalCount = computed(() => {
    return conversations.value.reduce((sum, conv) => sum + (conv.myUnreadCount || 0), 0)
  })

  /**
   * 业务逻辑动作
   */

  /**
   * 从后端同步会话摘要列表
   */
  async function fetchConversations() {
    loadingConversations.value = true
    try {
      const { data } = await getConversations()
      conversations.value = data
    } finally {
      loadingConversations.value = false
    }
  }

  /**
   * 切换当前活跃会话，并处理未读数重置逻辑
   * @param {string} id - 目标会话 ID
   */
  async function setActiveConversation(id) {
    if (activeConversationId.value === id) return

    activeConversationId.value = id

    // 本地清零该会话的未读计数器
    const conv = conversations.value.find((c) => c._id === id)
    if (conv) {
      conv.myUnreadCount = 0
    }

    // 检查缓存，若无数据则触发首次加载
    if (!messages.value[id] || messages.value[id].list.length === 0) {
      await loadMessages(id, 1)
    }
  }

  /**
   * 发起或跳转至私聊会话
   * @param {number} targetUserId - 目标用户 ID
   * @returns {Promise<string>} 会话 ID
   */
  async function startPrivateChat(targetUserId) {
    const { data } = await createConversation(targetUserId)

    const exists = conversations.value.find((c) => c._id === data._id)
    if (!exists) {
      // 若为新会话，则拉取最新列表
      await fetchConversations()
    }

    await setActiveConversation(data._id)
    return data._id
  }

  /**
   * 分页加载历史消息
   * @param {string} conversationId - 会话 ID
   * @param {number} page - 页码
   */
  async function loadMessages(conversationId, page) {
    loadingMessages.value = true
    try {
      const { data } = await getMessages(conversationId, page, 30)

      // 如果是首页则直接重置，否则采用前插法合并旧数据实现 Infinite Scroll 效果
      if (!messages.value[conversationId] || page === 1) {
        messages.value[conversationId] = {
          list: data.messages,
          total: data.total,
          page: data.page,
          hasMore: data.hasMore
        }
      } else {
        messages.value[conversationId].list = [...data.messages, ...messages.value[conversationId].list]
        messages.value[conversationId].page = data.page
        messages.value[conversationId].hasMore = data.hasMore
      }
    } finally {
      loadingMessages.value = false
    }
  }

  /**
   * 接收并处理实时推送的新消息
   * @param {Object} message - 消息实体
   * @param {string} conversationId - 所属会话 ID
   */
  function receiveMessage(message, conversationId) {
    const cachedList = messages.value[conversationId]?.list
    const isDuplicate = cachedList?.some((item) => item._id === message._id)
    if (isDuplicate) return

    // 1. 若当前已打开该会话缓存，推入新消息
    if (cachedList) {
      cachedList.push(message)
    }

    // 2. 更新摘要列表中的最后一条消息显示
    const convIndex = conversations.value.findIndex((c) => c._id === conversationId)
    if (convIndex > -1) {
      const conv = conversations.value[convIndex]
      conv.lastMessage = {
        content: message.type === 'text' ? message.content : `[${message.type === 'image' ? '图片' : '文件'}]`,
        senderId: message.senderId,
        timestamp: message.createdAt,
        type: message.type
      }
      conv.updatedAt = message.createdAt

      // 3. 若当前未处于该会话，则累计未读计数
      if (activeConversationId.value !== conversationId) {
        conv.myUnreadCount = (conv.myUnreadCount || 0) + 1
      }

      // 4. 置顶逻辑：将会话移动到列表最前端
      conversations.value.splice(convIndex, 1)
      conversations.value.unshift(conv)
    } else {
      // 5. 若会话不在列表中，则重新拉取整表
      fetchConversations()
    }
  }

  /**
   * 同步参与者的正在输入状态
   * @param {string} conversationId - 会话 ID
   * @param {number} userId - 用户 ID
   * @param {string} username - 用户名
   * @param {boolean} isTyping - 是否正在输入
   */
  function setTypingStatus(conversationId, userId, username, isTyping) {
    if (!typingUsers.value[conversationId]) {
      typingUsers.value[conversationId] = {}
    }

    if (isTyping) {
      typingUsers.value[conversationId][userId] = username
    } else {
      delete typingUsers.value[conversationId][userId]
    }
  }

  return {
    conversations,
    activeConversationId,
    messages,
    loadingConversations,
    loadingMessages,
    typingUsers,

    activeConversation,
    activeMessages,
    hasMoreMessages,
    unreadTotalCount,

    fetchConversations,
    setActiveConversation,
    startPrivateChat,
    loadMessages,
    receiveMessage,
    setTypingStatus
  }
})
