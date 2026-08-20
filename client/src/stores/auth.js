/**
 * @file stores/auth.js
 * @description 身份认证与权限管理 Store，负责用户信息持久化、登录态维护及 Socket 连接生命周期。
 */

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { login, register, getMe, updateProfile as updateUserProfile } from '@/api/services'
import { connectSocket, disconnectSocket } from '@/socket'

export const useAuthStore = defineStore('auth', () => {
  /**
   * 核心状态定义
   */
  // 当前登录用户信息
  const user = ref(null)
  // 认证令牌，优先从本地存储恢复以实现持久化登录
  const token = ref(localStorage.getItem('token') || '')
  // 异步操作加载状态
  const loading = ref(false)

  /**
   * 辅助计算属性
   */
  // 是否已通过身份认证
  const isAuthenticated = computed(() => !!token.value)
  // 当前用户唯一标识
  const currentUserId = computed(() => user.value?.id || null)

  /**
   * 业务动作
   */

  /**
   * 设置并持久化认证令牌
   * @param {string} newToken - JWT 令牌字符串
   */
  function setToken(newToken) {
    token.value = newToken
    localStorage.setItem('token', newToken)
  }

  /**
   * 执行登录全流程
   * @param {Object} credentials - 登录凭证 (username/email, password)
   * @returns {Promise<boolean>}
   */
  async function performLogin(credentials) {
    loading.value = true
    try {
      const { data } = await login(credentials)

      // 更新令牌与用户信息
      setToken(data.token)
      user.value = data.user

      // 登录成功后建立 WebSocket 实时双向连接
      connectSocket(data.token)

      return true
    } finally {
      loading.value = false
    }
  }

  /**
   * 执行用户注册流程
   * @param {Object} userData - 注册信息
   * @returns {Promise<boolean>}
   */
  async function performRegister(userData) {
    loading.value = true
    try {
      const { data } = await register(userData)
      setToken(data.token)
      user.value = data.user
      // 注册成功后自动建立 Socket 连接
      connectSocket(data.token)
      return true
    } finally {
      loading.value = false
    }
  }

  /**
   * 恢复当前用户资料（用于页面刷新后的静默登录）
   * @returns {Promise<Object|null>}
   */
  async function fetchCurrentUser() {
    if (!token.value) return null
    try {
      const { data } = await getMe()
      user.value = data

      // 重新恢复被中断的 Socket 连接
      connectSocket(token.value)
      return data
    } catch (error) {
      // 令牌无效或过期时，强制执行登出逻辑
      logout()
      throw error
    }
  }

  /**
   * 更新用户个人资料
   * @param {FormData|Object} formData - 待更新的资料数据
   * @returns {Promise<Object>}
   */
  async function updateProfile(formData) {
    const { data } = await updateUserProfile(formData)
    if (data) {
      // 实时同步本地 Store 信息
      user.value = data
    }
    return data
  }

  /**
   * 退出登录，清理本地状态与持久化数据
   */
  function logout() {
    user.value = null
    token.value = ''
    localStorage.removeItem('token')
    // 断开 Socket 连接，清理占用资源
    disconnectSocket()
  }

  return {
    user,
    token,
    loading,

    isAuthenticated,
    currentUserId,

    setToken,
    performLogin,
    performRegister,
    fetchCurrentUser,
    updateProfile,
    logout
  }
})
