<script setup>
/**
 * @file components/chat/MessageBubble.vue
 * @description 消息气泡组件，根据发送者身份动态调整布局（左/右），并支持多种内容类型（文本、图片、文件）的渲染。
 */

import { computed } from 'vue'
import { useAuthStore } from '@/stores/auth'
import UserAvatar from '@/components/common/UserAvatar.vue'

/**
 * 组件属性定义
 */
const props = defineProps({
  message: {
    type: Object,
    required: true
  },
  senderUser: {
    type: Object,
    default: null
  }
})

const authStore = useAuthStore()

/**
 * 判定当前消息是否由本端用户发送
 */
const isMine = computed(() => {
  return props.message.senderId === authStore.currentUserId
})

/**
 * 格式化 ISO 8601 时间戳为本地时间字符串
 * @param {string} isoString - 时间戳字符串
 */
const formatTime = (isoString) => {
  if (!isoString) return ''
  const date = new Date(isoString)
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

/**
 * 获取正确的文件访问 URL (区分 base64 或 相对路径)
 * @param {string} url - 文件 url 或 base64 data URI
 */
const getFileUrl = (url) => {
  if (!url) return ''
  // 如果是 Base64 数据或完整的 HTTP(S) 地址，则直接返回
  if (url.startsWith('data:') || url.startsWith('http://') || url.startsWith('https://')) {
    return url
  }
  return `http://localhost:3000${url.startsWith('/') ? '' : '/'}${url}`
}
</script>

<template>
  <div class="message-wrapper" :class="{ 'is-mine': isMine }">
    
    <!-- 头像渲染区域 -->
    <div class="avatar-container">
      <UserAvatar 
        v-if="senderUser" 
        :user="senderUser" 
        :size="36" 
        :showStatus="false" 
      />
    </div>
    
    <!-- 内容展示区域 -->
    <div class="message-content">
      <!-- 消息元信息头部 -->
      <div class="message-header" v-if="!isMine && senderUser">
        <span class="sender-name">{{ senderUser.username }}</span>
        <span class="time">{{ formatTime(message.createdAt) }}</span>
      </div>
      <div class="message-header mine" v-else-if="isMine">
        <span class="time">{{ formatTime(message.createdAt) }}</span>
      </div>
      
      <!-- 气泡主体：基于内容类型动态分发渲染逻辑 -->
      <div class="bubble glass-panel">
        
        <!-- 文本类型渲染 -->
        <template v-if="message.type === 'text'">
          <span class="text-content">{{ message.content }}</span>
        </template>
        
        <!-- 图片类型渲染（集成预览功能） -->
        <template v-else-if="message.type === 'image'">
          <el-image 
            :src="getFileUrl(message.fileInfo.fileUrl)" 
            :preview-src-list="[getFileUrl(message.fileInfo.fileUrl)]"
            fit="cover"
            class="image-content"
          />
        </template>
        
        <!-- 文件类型渲染 -->
        <template v-else-if="message.type === 'file'">
          <a :href="getFileUrl(message.fileInfo.fileUrl)" :download="message.fileInfo.fileName" target="_blank" class="file-content">
            <el-icon :size="24"><Document /></el-icon>
            <div class="file-details">
              <span class="file-name">{{ message.fileInfo.fileName }}</span>
              <span class="file-size">{{ (message.fileInfo.fileSize / 1024).toFixed(1) }} KB</span>
            </div>
          </a>
        </template>

      </div>
    </div>
  </div>
</template>

<style scoped>
/**
 * 气泡布局样式
 * 利用 flex-direction 反转实现“左收右发”布局切换
 */
.message-wrapper {
  display: flex;
  gap: 12px;
  margin-bottom: 20px;
  max-width: 80%;
  align-self: flex-start;
}

.message-wrapper.is-mine {
  align-self: flex-end;
  flex-direction: row-reverse;
}

.avatar-container {
  flex-shrink: 0;
}

.message-content {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.message-wrapper.is-mine .message-content {
  align-items: flex-end;
}

.message-header {
  display: flex;
  align-items: baseline;
  gap: 8px;
  margin-bottom: 2px;
}

.sender-name {
  font-size: 13px;
  color: var(--text-secondary);
}

.time {
  font-size: 11px;
  color: var(--text-secondary);
  opacity: 0.7;
}

.bubble {
  padding: 10px 14px;
  border-radius: 16px 16px 16px 4px;
  background-color: var(--message-received);
  color: var(--text-primary);
  font-size: 14px;
  line-height: 1.5;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
  word-break: break-word;
}

.message-wrapper.is-mine .bubble {
  border-radius: 16px 16px 4px 16px;
  background: linear-gradient(135deg, var(--primary-color), var(--primary-hover));
}

.text-content {
  white-space: pre-wrap;
}

.image-content {
  max-width: 250px;
  max-height: 300px;
  border-radius: 8px;
  cursor: pointer;
  display: block;
}

.file-content {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px;
  background: rgba(0, 0, 0, 0.2);
  border-radius: 8px;
  color: inherit;
  text-decoration: none;
}

.file-details {
  display: flex;
  flex-direction: column;
}

.file-name {
  font-weight: 500;
  font-size: 13px;
}

.file-size {
  font-size: 11px;
  opacity: 0.8;
}
</style>
