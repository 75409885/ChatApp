/**
 * @file stores/chat.js
 * @description 即时通讯核心 Store，管理会话列表、历史消息缓存、实时消息分发及用户输入状态。
 */

import { defineStore } from 'pinia'
import { getConversations, getMessages, createConversation } from '@/api/services'

export const useChatStore = defineStore('chat', {
  /**
   * 状态定义
   */
  state: () => ({
    // 会话摘要列表（左侧导航栏数据）
    conversations: [], 
    
    // 当前活跃的会话 ID
    activeConversationId: null,
    
    // 消息缓存池
    // 结构：{ [conversationId]: { list: Array, total: Number, page: Number, hasMore: Boolean } }
    messages: {}, 
    
    // 列表加载状态
    loadingConversations: false,
    // 消息加载状态
    loadingMessages: false,
    
    // 正在输入的参与者映射表
    typingUsers: {} 
  }),
  
  /**
   * 计算属性
   */
  getters: {
    // 获取当前活跃会话的详细信息
    activeConversation: (state) => {
      return state.conversations.find((c) => c._id === state.activeConversationId) || null
    },

    // 获取当前会话展示的消息列表
    activeMessages: (state) => {
      if (!state.activeConversationId) return []
      return state.messages[state.activeConversationId]?.list || []
    },

    // 是否还存在可加载的历史记录
    hasMoreMessages: (state) => {
      if (!state.activeConversationId) return false
      return state.messages[state.activeConversationId]?.hasMore || false
    },

    // 全站未读消息总数
    unreadTotalCount: (state) => {
      return state.conversations.reduce((sum, conv) => sum + (conv.myUnreadCount || 0), 0)
    }
  },
  
  /**
   * 业务逻辑动作
   */
  actions: {
    /**
     * 从后端同步会话摘要列表
     */
    async fetchConversations() {
      this.loadingConversations = true
      try {
        const { data } = await getConversations()
        this.conversations = data
      } finally {
        this.loadingConversations = false
      }
    },
    
    /**
     * 切换当前活跃会话，并处理未读数重置逻辑
     * @param {string} id - 目标会话 ID
     */
    async setActiveConversation(id) {
      if (this.activeConversationId === id) return
      
      this.activeConversationId = id
      
      // 本地清零该会话的未读计数器
      const conv = this.conversations.find((c) => c._id === id)
      if (conv) {
        conv.myUnreadCount = 0
      }
      
      // 检查缓存，若无数据则触发首次加载
      if (!this.messages[id] || this.messages[id].list.length === 0) {
        await this.loadMessages(id, 1)
      }
    },
    
    /**
     * 发起或跳转至私聊会话
     * @param {number} targetUserId - 目标用户 ID
     * @returns {Promise<string>} 会话 ID
     */
    async startPrivateChat(targetUserId) {
      const { data } = await createConversation(targetUserId)
      
      const exists = this.conversations.find((c) => c._id === data._id)
      if (!exists) {
        // 若为新会话，则拉取最新列表
        await this.fetchConversations()
      }
      
      await this.setActiveConversation(data._id)
      return data._id
    },
    
    /**
     * 分页加载历史消息
     * @param {string} conversationId - 会话 ID
     * @param {number} page - 页码
     */
    async loadMessages(conversationId, page) {
      this.loadingMessages = true
      try {
        const { data } = await getMessages(conversationId, page, 30)
        
        // 如果是首页则直接重置，否则采用前插法合并旧数据实现 Infinite Scroll 效果
        if (!this.messages[conversationId] || page === 1) {
          this.messages[conversationId] = {
            list: data.messages,
            total: data.total,
            page: data.page,
            hasMore: data.hasMore
          }
        } else {
          this.messages[conversationId].list = [...data.messages, ...this.messages[conversationId].list]
          this.messages[conversationId].page = data.page
          this.messages[conversationId].hasMore = data.hasMore
        }
      } finally {
        this.loadingMessages = false
      }
    },

    /**
     * 接收并处理实时推送的新消息
     * @param {Object} message - 消息实体
     * @param {string} conversationId - 所属会话 ID
     */
    receiveMessage(message, conversationId) {
      const cachedList = this.messages[conversationId]?.list
      const isDuplicate = cachedList?.some((item) => item._id === message._id)
      if (isDuplicate) return

      // 1. 若当前已打开该会话缓存，推入新消息
      if (cachedList) {
        cachedList.push(message)
      }
      
      // 2. 更新摘要列表中的最后一条消息显示
      const convIndex = this.conversations.findIndex((c) => c._id === conversationId)
      if (convIndex > -1) {
        const conv = this.conversations[convIndex]
        conv.lastMessage = {
          content: message.type === 'text' ? message.content : `[${message.type === 'image' ? '图片' : '文件'}]`,
          senderId: message.senderId,
          timestamp: message.createdAt,
          type: message.type
        }
        conv.updatedAt = message.createdAt
        
        // 3. 若当前未处于该会话，则累计未读计数
        if (this.activeConversationId !== conversationId) {
          conv.myUnreadCount = (conv.myUnreadCount || 0) + 1
        }
        
        // 4. 置顶逻辑：将会话移动到列表最前端
        this.conversations.splice(convIndex, 1)
        this.conversations.unshift(conv)
      } else {
        // 5. 若会话不在列表中，则重新拉取整表
        this.fetchConversations()
      }
    },
    
    /**
     * 同步参与者的正在输入状态
     * @param {string} conversationId - 会话 ID
     * @param {number} userId - 用户 ID
     * @param {string} username - 用户名
     * @param {boolean} isTyping - 是否正在输入
     */
    setTypingStatus(conversationId, userId, username, isTyping) {
      if (!this.typingUsers[conversationId]) {
        this.typingUsers[conversationId] = {}
      }
      
      if (isTyping) {
        this.typingUsers[conversationId][userId] = username
      } else {
        delete this.typingUsers[conversationId][userId]
      }
    }
  }
})
