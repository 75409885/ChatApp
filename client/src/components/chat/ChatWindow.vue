<script setup>
/**
 * @file components/chat/ChatWindow.vue
 * @description 聊天室核心窗口组件，负责消息流展示、自动滚动管理、分页加载及打字状态监测。
 */

import { computed, ref, onMounted, watch, nextTick } from 'vue'
import { useChatStore } from '@/stores/chat'
import { useAuthStore } from '@/stores/auth'
import MessageBubble from '@/components/chat/MessageBubble.vue'
import MessageInput from '@/components/chat/MessageInput.vue'
import UserAvatar from '@/components/common/UserAvatar.vue'
import { getSocket } from '@/socket'

const chatStore = useChatStore()
const authStore = useAuthStore()

// 消息容器 DOM 引用，用于操控滚动行为
const messageContainer = ref(null)

const activeConversation = computed(() => chatStore.activeConversation)
const messages = computed(() => chatStore.activeMessages)
const hasMore = computed(() => chatStore.hasMoreMessages)
const isLoading = computed(() => chatStore.loadingMessages)

/**
 * 过滤并获取当前会话中正在输入的其他用户列表
 */
const typingUsers = computed(() => {
  if (!activeConversation.value) return []
  const conversationTyping = chatStore.typingUsers[activeConversation.value._id] || {}
  
  return Object.entries(conversationTyping)
    .filter(([userId]) => userId != authStore.currentUserId) 
    .map(([_, username]) => username)
})

/**
 * 获取会话中的对方用户信息（私聊模式下）
 */
const otherUser = computed(() => {
  if (!activeConversation.value) return null
  const participants = activeConversation.value.participantDetails || []
  return participants.find(p => p.id != authStore.currentUserId) || participants[0]
})

/**
 * 根据发送者 ID 获取详细资料，用于头像及名称渲染
 * @param {string} senderId - 发送者 ID
 */
const getSenderDetails = (senderId) => {
  if (senderId == authStore.currentUserId) return authStore.user
  if (!activeConversation.value?.participantDetails) return null
  return activeConversation.value.participantDetails.find(p => p.id == senderId)
}

/**
 * 滚动消息容器至底部
 */
const scrollToBottom = () => {
  if (messageContainer.value) {
    messageContainer.value.scrollTop = messageContainer.value.scrollHeight
  }
}

/**
 * 监听活跃会话变更
 * 执行滚动复位、加入 Socket 频道并触发消息已读上报
 */
watch(() => activeConversation.value?._id, (newId) => {
  if (newId) {
    const socket = getSocket()
    if (socket) {
      // 核心修复：加入特定会话的实时通信房间
      socket.emit('join_conversation', newId)
      
      nextTick(() => {
        scrollToBottom() 
        if (activeConversation.value?.myUnreadCount > 0) {
          socket.emit('mark_read', { conversationId: newId })
        }
      })
    }
  }
}, { immediate: true }) // immediate: true 确保组件挂载时若已有活跃会话也能立即加入房间

/**
 * 监听消息增量
 * 实现新消息送达时的自动触底滚动
 */
watch(() => messages.value.length, (newLength, oldLength) => {
  if (newLength > oldLength) {
    nextTick(() => {
      scrollToBottom() 
    })
  }
})

/**
 * 异步加载历史消息记录
 * 处理分页逻辑并修正因内容载入导致的滚动位置跳变
 */
const loadMoreMessages = async () => {
  if (isLoading.value || !hasMore.value || !activeConversation.value) return
  
  const oldHeight = messageContainer.value.scrollHeight
  
  const currentStoreData = chatStore.messages[activeConversation.value._id]
  const nextPage = currentStoreData ? currentStoreData.page + 1 : 2
  
  await chatStore.loadMessages(activeConversation.value._id, nextPage)
  
  nextTick(() => {
    // 维持视觉连续性：计算高度增量并补偿 scrollTop
    const newHeight = messageContainer.value.scrollHeight
    messageContainer.value.scrollTop = newHeight - oldHeight
  })
}

/**
 * 处理滚动事件通知，支持触顶加载逻辑
 * @param {Event} e - 滚动事件对象
 */
const handleScroll = (e) => {
  if (e.target.scrollTop === 0) {
    loadMoreMessages()
  }
}
</script>

<template>
  <div class="chat-window" v-if="activeConversation">
    
    <!-- 会话头部：展示用户信息及功能入口 -->
    <div class="chat-header">
      <div class="chat-title">
        <UserAvatar v-if="otherUser" :user="otherUser" :size="40" :showStatus="true" />
        <div class="title-info">
          <h3 class="username-display">
            {{ activeConversation.type === 'private' ? otherUser?.username : activeConversation.groupName }}
          </h3>
          <p class="status-display">
            <template v-if="typingUsers.length > 0">
              <span class="typing-indicator">{{ typingUsers.join(', ') }} 正在输入...</span>
            </template>
            <template v-else-if="activeConversation.type === 'private'">
              <span v-if="otherUser?.status === 'online'" class="online-status">在线</span>
              <span v-else>离线</span>
            </template>
          </p>
        </div>
      </div>
      
      <div class="header-actions">
        <el-tooltip content="拨打电话(未实现)" placement="bottom">
          <el-button text circle :icon="'Phone'" />
        </el-tooltip>
        <el-tooltip content="视频通话(未实现)" placement="bottom">
          <el-button text circle :icon="'VideoCamera'" />
        </el-tooltip>
        <el-dropdown trigger="click" placement="bottom-end">
          <el-button text circle :icon="'More'" />
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item :icon="'User'">查看资料</el-dropdown-item>
              <el-dropdown-item :icon="'Delete'" divided style="color: #ef4444;">清空聊天记录</el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>
      </div>
    </div>

    <!-- 消息展示区：处理平滑滚动与内容渲染 -->
    <div 
      class="messages-container custom-scrollbar" 
      ref="messageContainer" 
      @scroll="handleScroll"
    >
      <div v-if="isLoading && hasMore" class="loading-more">
        <el-icon class="is-loading"><Loading /></el-icon> 加载中...
      </div>
      
      <div v-if="!hasMore && messages.length > 0" class="no-more">
        已经到底了
      </div>

      <template v-if="messages.length > 0">
        <MessageBubble 
          v-for="msg in messages" 
          :key="msg._id" 
          :message="msg"
          :senderUser="getSenderDetails(msg.senderId)"
        />
      </template>
      <div v-else class="empty-messages">
        没有聊天记录，发个消息打个招呼吧~
      </div>
    </div>

    <!-- 底部输入交互组件 -->
    <MessageInput :conversationId="activeConversation._id" />
  </div>
</template>

<style scoped>
/**
 * 界面布局实现
 * 采用垂直 Flexbox 架构确保输入区与头部固定
 */
.chat-window {
  display: flex;
  flex-direction: column;
  height: 100%;
  width: 100%;
}

.chat-header {
  height: 70px;
  min-height: 70px;
  flex-shrink: 0;
  padding: 0 20px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid var(--border-color);
  background-color: var(--bg-panel);
  z-index: 10;
  box-sizing: border-box;
}

.chat-title {
  display: flex;
  align-items: center;
  gap: 12px;
  height: 100%;
}

.title-info {
  display: flex;
  flex-direction: column;
  justify-content: center;
}

.username-display {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary);
  line-height: 1.2;
}

.status-display {
  margin: 0;
  font-size: 12px;
  color: var(--text-secondary);
  margin-top: 2px;
}

.typing-indicator {
  color: #818cf8;
  font-style: italic;
}

.online-status {
  color: #10b981;
}

.header-actions .el-button {
  color: var(--text-secondary);
}

.header-actions .el-button:hover {
  color: var(--primary-color);
  background-color: rgba(99, 102, 241, 0.1);
}

.messages-container {
  flex: 1;
  padding: 20px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  position: relative;
  scroll-behavior: smooth;
  /* 基础背景渲染：径向渐变提升视觉层次 */
  background-image: radial-gradient(circle at center, rgba(30, 41, 59, 0.3) 0%, transparent 100%);
}

.loading-more, .no-more {
  text-align: center;
  font-size: 12px;
  color: var(--text-secondary);
  padding: 10px 0;
  margin-bottom: 16px;
}

.empty-messages {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-secondary);
  font-size: 14px;
}

.custom-scrollbar::-webkit-scrollbar {
  width: 6px;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background: var(--bg-hover);
  border-radius: 3px;
}
</style>
