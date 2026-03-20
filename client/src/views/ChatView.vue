<script setup>
/**
 * @file views/ChatView.vue
 * @description 聊天主界面视图，协调会话列表、联系人列表及聊天窗口的动态调度与布局。
 */

import { computed } from 'vue'
import MainLayout from '@/components/layout/MainLayout.vue'
import { useUiStore } from '@/stores/ui'
import { useChatStore } from '@/stores/chat'
import ContactList from '@/components/contacts/ContactList.vue'
import ConversationList from '@/components/chat/ConversationList.vue'
import ChatWindow from '@/components/chat/ChatWindow.vue'
import EmptyState from '@/components/common/EmptyState.vue'

// 状态 Store 实例化
const uiStore = useUiStore()
const chatStore = useChatStore()

// 响应式状态映射
const activeTab = computed(() => uiStore.activeTab)
const activeConversationId = computed(() => chatStore.activeConversationId)

/**
 * 切换至聊天会话
 * @param {string} convId - 目标会话 ID
 */
const handleSelectChat = (convId) => {
  uiStore.setActiveTab('chat')
  chatStore.setActiveConversation(convId)
}
</script>

<template>
  <MainLayout>
    <div class="chat-view-container">
      
      <!-- 左侧面板：列表调度区域 -->
      <div class="left-panel">
        <!-- 根据 activeTab 动态切换业务列表组件 -->
        <ConversationList 
          v-if="activeTab === 'chat'" 
        />
        <ContactList 
          v-else-if="activeTab === 'contacts'" 
          @select-chat="handleSelectChat"
        />
      </div>
      
      <!-- 右侧面板：主内容展示区域 -->
      <div class="right-panel">
        <!-- 活跃会话窗口 -->
        <ChatWindow 
          v-if="activeTab === 'chat' && activeConversationId" 
        />
        
        <!-- 消息页未选中会话时的占位状态 -->
        <EmptyState 
          v-else-if="activeTab === 'chat' && !activeConversationId" 
          icon="ChatDotSquare"
          title="暂未选择会话"
          description="请从左侧列表选择一个会话开始聊天，或到联系人页面发起新聊天"
        />
        
        <!-- 联系人页默认占位状态 -->
        <EmptyState 
          v-else-if="activeTab === 'contacts'" 
          icon="User"
          title="联系人管理"
          description="您可以在左侧管理好友和处理好友请求"
        />
      </div>
      
    </div>
  </MainLayout>
</template>

<style scoped>
/**
 * 样式定义
 * 采用 Flexbox 布局实现响应式左右侧栏排版
 */
.chat-view-container {
  display: flex;
  width: 100%;
  height: 100%;
  background-color: var(--bg-dark);
}

.left-panel {
  width: 340px;
  min-width: 340px;
  height: 100%;
  border-right: 1px solid var(--border-color);
  background-color: var(--bg-panel);
  display: flex;
  flex-direction: column;
}

.right-panel {
  flex: 1;
  height: 100%;
  display: flex;
  flex-direction: column;
  position: relative;
}
</style>
