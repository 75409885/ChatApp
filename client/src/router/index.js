/**
 * @file router/index.js
 * @description Vue Router 配置文件，包含路由表定义和全局前置守卫。
 */

import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const router = createRouter({
  // 使用 HTML5 模式 (History API)
  history: createWebHistory(import.meta.env.BASE_URL),
  
  // 路由映射表配置
  routes: [
    {
      path: '/login',
      name: 'login',
      component: () => import('../views/LoginView.vue'),
      // 仅允许未登录的访客访问
      meta: { requiresGuest: true }
    },
    {
      path: '/register',
      name: 'register',
      component: () => import('../views/RegisterView.vue'),
      meta: { requiresGuest: true }
    },
    {
      path: '/',
      name: 'home',
      component: () => import('../views/ChatView.vue'),
      // 需要登录认证才可访问
      meta: { requiresAuth: true }
    },
    {
      path: '/settings',
      name: 'settings',
      component: () => import('../views/SettingsView.vue'),
      meta: { requiresAuth: true }
    }
  ]
})

// ============================
// 全局前置路由守卫
// ============================
router.beforeEach(async (to, from, next) => {
  const authStore = useAuthStore()
  // 判断当前用户是否已登录 (是否存在 Token)
  const isAuthenticated = !!authStore.token

  // 拦截未登录用户访问受保护路由
  if (to.meta.requiresAuth && !isAuthenticated) {
    next({ name: 'login' })
  } 
  // 拦截已登录用户访问访客路由（如登录/注册页）
  else if (to.meta.requiresGuest && isAuthenticated) {
    next({ name: 'home' })
  } 
  // 正常放行
  else {
    next()
  }
})

export default router
