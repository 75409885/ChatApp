/**
 * @file api/index.js
 * @description Axios 基础配置与拦截器，实现身份令牌注入与全局错误响应处理。
 */

import axios from 'axios'
import { useAuthStore } from '@/stores/auth'
import router from '@/router'
import { ElMessage } from 'element-plus'

// 创建 Axios 实例并配置基础路径
const api = axios.create({
  baseURL: '/api', 
  timeout: 10000,
})

/**
 * 请求拦截器：动态注入 JWT 令牌至请求头
 */
api.interceptors.request.use(
  (config) => {
    const authStore = useAuthStore()
    if (authStore.token) {
      // 携带 Bearer 格式的认证令牌
      config.headers['Authorization'] = `Bearer ${authStore.token}`
    }
    return config
  },
  (error) => Promise.reject(error)
)

/**
 * 响应拦截器：统一数据解包与异常校验（如 401 状态处理）
 */
api.interceptors.response.use(
  (response) => {
    // 简化返回数据结构，直接返回响应体
    return response.data;
  },
  (error) => {
    if (error.response) {
      const { status, data } = error.response
      
      // 针对 401 Unauthorized 状态执行强制登出与重定向
      if (status === 401 && router.currentRoute.value.name !== 'login') {
        const authStore = useAuthStore()
        authStore.logout()
        router.push('/login')
        ElMessage.error('登录已过期，请重新登录')
      } else {
        const msg = data.message || '请求失败'
        // 根据调用方配置决定是否自动弹出错误提示
        if (!error.config.hideErrorToast) {
            ElMessage.error(msg)
        }
      }
    } else {
      ElMessage.error('网络连接失败，请检查网络')
    }
    return Promise.reject(error)
  }
)

export default api
