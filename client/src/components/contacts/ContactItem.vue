<script setup>
/**
 * @file components/contacts/ContactItem.vue
 * @description 通用联系人/会话列表项组件，支持聊天模式与好友模式下的多种展示逻辑（包含时间格式化、打字状态及未读计数）。
 */

import { computed } from 'vue'
import UserAvatar from '@/components/common/UserAvatar.vue'

/**
 * 组件属性定义
 */
const props = defineProps({
  contact: {
    type: Object,
    required: true
  },
  // 活跃状态标识，用于控制高亮样式
  isActive: {
    type: Boolean,
    default: false
  },
  /**
   * 运行模式选择
   * 'chat': 侧重展示最后消息预览及时间
   * 'friend': 侧重展示个人签名
   */
  mode: {
    type: String,
    default: 'chat'
  }
})

const emit = defineEmits(['click'])

/**
 * 相对时间格式化器
 * 根据时间跨度返回不同的字符串表示（今天以内、今年以内或更早）
 * @param {string} isoString - ISO 格式时间戳
 */
const formatTime = (isoString) => {
  if (!isoString) return ''
  const date = new Date(isoString)
  const today = new Date()
  
  if (date.toDateString() === today.toDateString()) {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }
  if (date.getFullYear() === today.getFullYear()) {
    return `${date.getMonth() + 1}-${date.getDate()}`
  }
  return `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`
}

/**
 * 计算当前项应展示的用户信息实体
 * 处理私聊会话与好友列表的对象结构差异
 */
const displayUser = computed(() => {
  if (props.mode === 'friend') return props.contact 
  
  if (props.contact.type === 'private' && props.contact.participantDetails) {
    return props.contact.otherUser || props.contact.participantDetails[0]
  }
  return { username: '群聊', avatar: '' } 
})
</script>

<template>
  <div 
    class="contact-item" 
    :class="{ active: isActive }"
    @click="emit('click', contact)"
  >
    <!-- 左侧：用户/群组头像 -->
    <UserAvatar :user="displayUser" :size="48" />
    
    <!-- 右侧：核心文本负载区 -->
    <div class="content">
      <div class="header">
        <span class="name">{{ displayUser.username }}</span>
        <!-- 聊天模式下的最后消息时间点 -->
        <span v-if="mode === 'chat' && contact.lastMessage?.timestamp" class="time">
          {{ formatTime(contact.lastMessage.timestamp) }}
        </span>
      </div>
      
      <div class="footer">
        <!-- 聊天预览：集成 Socket 实时打字状态及最后消息 -->
        <span v-if="mode === 'chat'" class="preview">
          <span v-if="contact.typing" class="typing-text">正在输入...</span>
          <span v-else>{{ contact.lastMessage?.content || '暂无消息' }}</span>
        </span>
        <!-- 好友模式：展示个性签名 -->
        <span v-else class="preview">{{ contact.signature || '这个人很懒，什么都没写' }}</span>
        
        <!-- 未读消息计数器 -->
        <el-badge 
          v-if="mode === 'chat' && contact.myUnreadCount > 0" 
          :value="contact.myUnreadCount" 
          :max="99" 
        />
      </div>
    </div>
  </div>
</template>

<style scoped>
/**
 * 列表项布局及溢出控制
 */
.contact-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  cursor: pointer;
  transition: background-color 0.2s;
  border-bottom: 1px solid rgba(255, 255, 255, 0.02);
}
.contact-item:hover { background-color: var(--bg-hover); }
.contact-item.active { background-color: rgba(99, 102, 241, 0.1); }
.content { flex: 1; min-width: 0; display: flex; flex-direction: column; justify-content: center; gap: 4px; }
.header { display: flex; justify-content: space-between; align-items: center; }

/**
 * 文字溢出策略：单行截断并展示省略号
 */
.name {
  font-weight: 600;
  font-size: 15px;
  color: var(--text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.time { font-size: 12px; color: var(--text-secondary); flex-shrink: 0; }
.footer { display: flex; justify-content: space-between; align-items: center; height: 20px; }
.preview { font-size: 13px; color: var(--text-secondary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; flex: 1; padding-right: 8px; }
.typing-text { color: var(--primary-color); font-weight: 500; font-style: italic; }
:deep(.el-badge__content) { border: none; }
</style>
