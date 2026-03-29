<script setup>
/**
 * @file views/LoginView.vue
 * @description 登录页面组件，集成表单校验体系与身份认证流。
 */

import { reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { ElMessage } from 'element-plus'

const router = useRouter()
const authStore = useAuthStore()

// 获取 Form 实例引用用于集体校验
const formRef = ref(null)

// 登录表单原始数据
const form = reactive({
  email: '',
  password: ''
})

/**
 * 表单校验规则配置
 * 针对邮箱格式与密码长度进行实时校验
 */
const rules = {
  email: [
    { required: true, message: '请输入邮箱', trigger: 'blur' },
    { type: 'email', message: '请输入有效的邮箱地址', trigger: ['blur', 'change'] }
  ],
  password: [
    { required: true, message: '请输入密码', trigger: 'blur' },
    { min: 6, message: '密码长度至少 6 个字符', trigger: 'blur' }
  ]
}

// 异步提交状态控制
const loading = ref(false)

/**
 * 提交登录表单
 * 执行表单合法性检查后调用 AuthStore 执行登录逻辑
 */
const handleLogin = async () => {
  if (!formRef.value) return
  
  await formRef.value.validate(async (valid) => {
    if (valid) {
      loading.value = true
      try {
        await authStore.performLogin(form)
        ElMessage.success('登录成功') 
        router.push('/')
      } catch (error) {
        // 错误处理由 Axios 响应拦截器统一分发
      } finally {
        loading.value = false
      }
    }
  })
}
</script>

<template>
  <div class="auth-container">
    <div class="auth-box glass-panel">
      <!-- 品牌标识与标题 -->
      <div class="auth-header">
        <div class="logo">
          <el-icon :size="32" color="var(--primary-color)"><ChatDotRound /></el-icon>
        </div>
        <h2>欢迎回来</h2>
        <p>登录您的 ChatApp 账号</p>
      </div>

      <!-- 登录表单区域 -->
      <el-form 
        ref="formRef" 
        :model="form" 
        :rules="rules" 
        label-position="top" 
        size="large"
        @keyup.enter="handleLogin"
      >
        <el-form-item label="邮箱" prop="email">
          <el-input 
            v-model="form.email" 
            placeholder="请输入您的邮箱" 
            :prefix-icon="'Message'"
          />
        </el-form-item>
        
        <el-form-item label="密码" prop="password">
          <el-input 
            v-model="form.password" 
            type="password" 
            placeholder="请输入您的密码" 
            show-password
            :prefix-icon="'Lock'"
          />
        </el-form-item>

        <el-form-item>
          <el-button 
            type="primary" 
            class="submit-btn" 
            @click="handleLogin" 
            :loading="loading"
          >
            登 录
          </el-button>
        </el-form-item>
      </el-form>

      <div class="auth-footer">
        还没有账号？ <router-link to="/register">立即注册</router-link>
      </div>
    </div>
  </div>
</template>

<style scoped>
/**
 * 认证页面样式实现
 * 包含动态多级渐变背景与玻璃拟态效果
 */
.auth-container {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, var(--bg-dark), var(--primary-light));
  position: relative;
  overflow: hidden;
}

.auth-container::before {
  content: '';
  position: absolute;
  width: 400px;
  height: 400px;
  background: var(--primary-color);
  border-radius: 50%;
  filter: blur(100px);
  opacity: 0.2;
  top: -100px;
  right: -100px;
  animation: float 10s infinite;
}

.auth-container::after {
  content: '';
  position: absolute;
  width: 300px;
  height: 300px;
  background: var(--danger-color);
  border-radius: 50%;
  filter: blur(100px);
  opacity: 0.15;
  bottom: -50px;
  left: -50px;
  animation: float 8s infinite reverse;
}

.auth-box {
  width: 100%;
  max-width: 420px;
  padding: 40px;
  border-radius: 16px;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.15);
  position: relative;
  z-index: 10;
  animation: slideUp 0.6s cubic-bezier(0.16, 1, 0.3, 1);
}

.auth-header {
  text-align: center;
  margin-bottom: 32px;
}

.logo {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 64px;
  height: 64px;
  border-radius: 16px;
  background: var(--primary-light);
  margin-bottom: 16px;
}

.auth-header h2 {
  margin: 0 0 8px;
  font-size: 24px;
  font-weight: 700;
  color: var(--text-primary);
}

.auth-header p {
  margin: 0;
  color: var(--text-secondary);
  font-size: 14px;
}

.submit-btn {
  width: 100%;
  margin-top: 10px;
  height: 48px;
  font-size: 16px;
  border-radius: 8px;
  background: linear-gradient(135deg, var(--primary-color), var(--primary-hover));
  border: none;
  transition: transform 0.2s, box-shadow 0.2s;
}

.submit-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 10px 20px -10px var(--primary-color);
}

.auth-footer {
  text-align: center;
  margin-top: 24px;
  font-size: 14px;
  color: var(--text-secondary);
}

.auth-footer a {
  color: var(--primary-color);
  text-decoration: none;
  font-weight: 500;
  transition: color 0.2s;
}

.auth-footer a:hover {
  color: var(--primary-hover);
}

@keyframes slideUp {
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
}

@keyframes float {
  0% { transform: translate(0, 0); }
  50% { transform: translate(20px, 20px); }
  100% { transform: translate(0, 0); }
}
</style>
