/**
 * @file stores/ui.js
 * @description UI 状态管理 Store，包含主题配置、侧边栏状态及全局视图控制。
 */

import { defineStore } from 'pinia'

export const useUiStore = defineStore('ui', {
  /**
   * 状态定义
   */
  state: () => ({
    // 侧边栏折叠状态
    isSidebarCollapsed: false,
    
    // 当前激活的功能页签 ('chat'|'contacts')
    activeTab: 'chat', 
    
    // 用户主题偏好，优先从本地持久化存储加载
    theme: localStorage.getItem('vueuse-color-scheme') || 'dark', 
  }),
  
  /**
   * 业务动作
   */
  actions: {
    /**
     * 切换侧边栏展开/收起
     */
    toggleSidebar() {
      this.isSidebarCollapsed = !this.isSidebarCollapsed
    },
    
    /**
     * 设置当前活跃页签
     * @param {string} tab - 页签名称
     */
    setActiveTab(tab) {
      this.activeTab = tab
    },
    
    /**
     * 切换系统主题并持久化配置
     * @param {string} themeName - 主题名称 (light/dark)
     */
    setTheme(themeName) {
      this.theme = themeName
      localStorage.setItem('vueuse-color-scheme', themeName)
      
      // 直接操作宿主元素样式类以匹配 ElementPlus 暗色方案
      if (themeName === 'dark') {
        document.documentElement.classList.add('dark')
      } else {
        document.documentElement.classList.remove('dark')
      }
    }
  }
})
