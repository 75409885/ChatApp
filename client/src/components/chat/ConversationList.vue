<script setup>
/**
 * @file components/chat/ConversationList.vue
 * @description 会话列表组件，展示最近联系人列表，支持实时列表更新与响应式交互。
 */

import { computed } from 'vue'
import { useChatStore } from '@/stores/chat'
import { useAuthStore } from '@/stores/auth'
import ContactItem from '@/components/contacts/ContactItem.vue'
import EmptyState from '@/components/common/EmptyState.vue'

const chatStore = useChatStore()
const authStore = useAuthStore()

// 状态订阅：计算最新的会话列表及活跃状态
const conversations = computed(() => chatStore.conversations)
const activeConversationId = computed(() => chatStore.activeConversationId)

/**
 * 切换活跃会话
 * @param {Object} conv - 目标会话实体对象
 */
const handleConversationClick = (conv) => {
  chatStore.setActiveConversation(conv._id)
}
</script>

<template>
  <div class="conversation-list-container">
    <!-- 列表头部面板 -->
    <div class="header-section">
      <h2>聊天记录</h2>
    </div>
    
    <!-- 滚动列表容器 -->
    <div class="list-content custom-scrollbar">
      <!-- 列表渲染：数据驱动生成会话项 -->
      <template v-if="conversations.length > 0">
        <ContactItem 
          v-for="conv in conversations" 
          :key="conv._id" 
          :contact="conv" 
          :isActive="activeConversationId === conv._id"
          mode="chat"
          @click="handleConversationClick"
        />
      </template>
      
      <!-- 空状态引导 -->
      <EmptyState 
        v-else 
        icon="ChatLineRound" 
        title="暂无会话" 
        description="您的聊天列表为空，快去联系人列表中开启聊天吧" 
      />
    </div>
  </div>
</template>

<style scoped>
/**
 * 列表布局样式
 */
.conversation-list-container {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.header-section {
  padding: 20px 16px 12px;
  border-bottom: 1px solid var(--border-color);
  text-align: center;
}

.header-section h2 {
  margin: 0;
  font-size: 20px;
  font-weight: 700;
  color: var(--text-primary);
}

.list-content {
  flex: 1;
  overflow-y: auto;
}

.custom-scrollbar::-webkit-scrollbar {
  width: 6px;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background: var(--bg-hover);
  border-radius: 3px;
}
</style>
