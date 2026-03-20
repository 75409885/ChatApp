<script setup>
/**
 * @file components/layout/MainLayout.vue
 * @description 应用主容器布局组件，采用 Flexbox 实现侧边栏与内容区的整体排版，并在挂载时执行数据同步。
 */

import { onMounted } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useChatStore } from '@/stores/chat'
import { useFriendStore } from '@/stores/friends'
import AppSidebar from './AppSidebar.vue'

const authStore = useAuthStore()
const chatStore = useChatStore()
const friendStore = useFriendStore()

onMounted(async () => {
  if (authStore.isAuthenticated) {
    /**
     * 身份验证成功后并发预加载核心业务数据
     * 利用 Promise.all 优化首屏加载性能
     */
    await Promise.all([
      chatStore.fetchConversations(),
      friendStore.fetchFriends(),
      friendStore.fetchRequests()
    ])
  }
})
</script>

<template>
  <div class="main-layout">
    <!-- 侧边全局导航组件 -->
    <AppSidebar />
    
    <!-- 右侧动态内容槽位区域 -->
    <div class="page-content">
      <slot></slot>
    </div>
  </div>
</template>

<style scoped>
/**
 * 布局样式定义
 * 采用 viewport 单位实现全屏伸缩
 */
.main-layout {
  display: flex;
  width: 100vw;
  height: 100vh;
  background-color: var(--bg-dark);
  overflow: hidden;
}

.page-content {
  flex: 1;
  min-width: 0;
  position: relative;
  display: flex;
  flex-direction: column;
}
</style>
