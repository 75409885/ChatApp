<script setup>
/**
 * @file components/layout/AppSidebar.vue
 * @description 应用全局侧边导航栏，处理导航路由跳转、未读计数展示及会话/联系人 Tab 切换。
 */

import { computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useUiStore } from '@/stores/ui'
import { useChatStore } from '@/stores/chat'
import { useFriendStore } from '@/stores/friends'
import UserAvatar from '@/components/common/UserAvatar.vue'
import { ElMessageBox } from 'element-plus'

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()
const uiStore = useUiStore()
const chatStore = useChatStore()
const friendStore = useFriendStore()

// 状态订阅与计算属性
const currentUser = computed(() => authStore.user)
const unreadTotal = computed(() => chatStore.unreadTotalCount)
const pendingRequests = computed(() => friendStore.requestsCount)

/**
 * 退出登录确认与执行
 */
const handleLogout = () => {
  ElMessageBox.confirm('确定要退出登录吗？', '提示', {
    confirmButtonText: '确定退出',
    cancelButtonText: '取消',
    type: 'warning'
  }).then(() => {
    authStore.logout()
    router.push('/login')
  }).catch(() => {})
}

/**
 * 切换侧边栏收缩状态
 */
const toggleSidebar = () => {
  uiStore.toggleSidebar()
}

/**
 * 视图 Tab 切换逻辑
 * @param {string} tab - 目标 Tab 名称
 */
const switchTab = (tab) => {
  uiStore.setActiveTab(tab)
  if (route.name !== 'home') {
    router.push('/')
  }
}
</script>

<template>
  <div class="sidebar" :class="{ 'collapsed': uiStore.isSidebarCollapsed }">
    <!-- 顶部区域：Logo 与 侧边栏折叠控制 -->
    <div class="sidebar-header">
      <div v-if="!uiStore.isSidebarCollapsed" class="logo-text">
        <el-icon color="var(--primary-color)" :size="20"><ChatDotRound /></el-icon>
        <span>ChatApp</span>
      </div>
      <el-button 
        text 
        class="collapse-btn" 
        @click="toggleSidebar"
      >
        <el-icon><Fold v-if="!uiStore.isSidebarCollapsed" /><Expand v-else /></el-icon>
      </el-button>
    </div>

    <!-- 中部导航：功能模块切换区域 -->
    <div class="sidebar-nav">
      <el-tooltip content="聊天会话" placement="right" :disabled="!uiStore.isSidebarCollapsed">
        <div 
          class="nav-item" 
          :class="{ active: uiStore.activeTab === 'chat' && route.name === 'home' }"
          @click="switchTab('chat')"
        >
          <el-badge :value="unreadTotal" :hidden="unreadTotal === 0" :max="99">
            <el-icon :size="24"><ChatLineRound /></el-icon>
          </el-badge>
          <span v-if="!uiStore.isSidebarCollapsed">聊天记录</span>
        </div>
      </el-tooltip>

      <el-tooltip content="联系人" placement="right" :disabled="!uiStore.isSidebarCollapsed">
        <div 
          class="nav-item" 
          :class="{ active: uiStore.activeTab === 'contacts' && route.name === 'home' }"
          @click="switchTab('contacts')"
        >
          <el-badge :value="pendingRequests" :hidden="pendingRequests === 0" :max="99">
            <el-icon :size="24"><User /></el-icon>
          </el-badge>
          <span v-if="!uiStore.isSidebarCollapsed">联系人</span>
        </div>
      </el-tooltip>

      <el-tooltip content="设置" placement="right" :disabled="!uiStore.isSidebarCollapsed">
        <div 
          class="nav-item" 
          :class="{ active: route.name === 'settings' }"
          @click="router.push('/settings')"
        >
          <el-icon :size="24"><Setting /></el-icon>
          <span v-if="!uiStore.isSidebarCollapsed">设置</span>
        </div>
      </el-tooltip>
    </div>

    <!-- 底部区域：用户信息与 Logout 操纵排版 -->
    <div class="sidebar-footer">
      <div class="user-profile" v-if="currentUser">
        <UserAvatar :user="currentUser" :size="40" :showStatus="true" />
        <div class="user-info" v-if="!uiStore.isSidebarCollapsed">
          <div class="username">{{ currentUser.username }}</div>
          <div class="status-text">在线</div>
        </div>
      </div>
      
      <el-tooltip content="退出登录" placement="right" :disabled="!uiStore.isSidebarCollapsed">
        <el-button 
          text 
          class="logout-btn" 
          @click="handleLogout"
        >
          <el-icon :size="20"><SwitchButton /></el-icon>
          <span v-if="!uiStore.isSidebarCollapsed" class="ml-2">退出</span>
        </el-button>
      </el-tooltip>
    </div>
  </div>
</template>

<style scoped>
.sidebar {
  width: 260px;
  height: 100vh;
  background-color: var(--bg-panel);
  border-right: 1px solid var(--border-color);
  display: flex;
  flex-direction: column;
  transition: width 0.3s cubic-bezier(0.2, 0, 0, 1);
  overflow: hidden;
  z-index: 100;
}

.sidebar.collapsed {
  width: 72px;
}

.sidebar-header {
  height: 70px;
  padding: 0 16px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
}

.logo-text {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 18px;
  font-weight: 700;
  color: var(--text-primary);
  white-space: nowrap;
}

.collapse-btn {
  color: var(--text-secondary);
  font-size: 20px;
}

.collapse-btn:hover {
  color: var(--primary-color);
}

.sidebar.collapsed .sidebar-header {
  justify-content: center;
}

.sidebar-nav {
  flex: 1;
  padding: 24px 12px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.nav-item {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 12px;
  border-radius: 12px;
  cursor: pointer;
  color: var(--text-secondary);
  transition: all 0.2s;
  white-space: nowrap;
}

.nav-item:hover {
  background-color: var(--bg-hover);
  color: var(--text-primary);
}

.nav-item.active {
  background-color: rgba(99, 102, 241, 0.1);
  color: var(--primary-color);
  font-weight: 500;
}

.sidebar.collapsed .nav-item {
  justify-content: center;
  padding: 12px 0;
}

.sidebar-footer {
  padding: 16px;
  border-top: 1px solid rgba(255, 255, 255, 0.05);
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.user-profile {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px;
  border-radius: 12px;
  background-color: rgba(0, 0, 0, 0.2);
  white-space: nowrap;
}

.sidebar.collapsed .user-profile {
  justify-content: center;
  background-color: transparent;
  padding: 4px;
}

.user-info {
  flex: 1;
  overflow: hidden;
}

.username {
  font-weight: 600;
  font-size: 14px;
  color: var(--text-primary);
  text-overflow: ellipsis;
  overflow: hidden;
}

.status-text {
  font-size: 12px;
  color: #10b981;
}

.logout-btn {
  width: 100%;
  color: var(--text-secondary);
  justify-content: flex-start;
  padding: 12px;
  border-radius: 8px;
}

.sidebar.collapsed .logout-btn {
  justify-content: center;
  padding: 12px 0;
}

.logout-btn:hover {
  color: #ef4444;
  background-color: rgba(239, 68, 68, 0.1);
}

.ml-2 {
  margin-left: 8px;
}
</style>
