/**
 * @file stores/ui.js
 * @description UI 状态管理 Store，包含主题配置、侧边栏状态及全局视图控制。
 */

import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useUiStore = defineStore('ui', () => {
  /**
   * 状态定义
   */
  // 侧边栏折叠状态
  const isSidebarCollapsed = ref(false)
  // 当前激活的功能页签 ('chat'|'contacts')
  const activeTab = ref('chat')

  // 用户主题偏好，优先从本地持久化存储加载
  const theme = ref(localStorage.getItem('vueuse-color-scheme') || 'dark')

  /**
   * 业务动作
   */

  /**
   * 切换侧边栏展开/收起
   */
  function toggleSidebar() {
    isSidebarCollapsed.value = !isSidebarCollapsed.value
  }

  /**
   * 设置当前活跃页签
   * @param {string} tab - 页签名称
   */
  function setActiveTab(tab) {
    activeTab.value = tab
  }

  /**
   * 切换系统主题并持久化配置
   * @param {string} themeName - 主题名称 (light/dark)
   */
  function setTheme(themeName) {
    theme.value = themeName
    localStorage.setItem('vueuse-color-scheme', themeName)

    // 直接操作宿主元素样式类以匹配 ElementPlus 暗色方案
    if (themeName === 'dark') {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }

  return {
    isSidebarCollapsed,
    activeTab,
    theme,

    setTheme,
    setActiveTab,
    toggleSidebar
  }
})
