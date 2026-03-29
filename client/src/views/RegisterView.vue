<script setup>
/**
 * @file views/RegisterView.vue
 * @description 注册页面组件，包含用户资料录入及双重密码一致性校验逻辑。
 */

import { reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { ElMessage } from 'element-plus'

const router = useRouter()
const authStore = useAuthStore()
const formRef = ref(null)

// 注册表单数据模型
const form = reactive({
  username: '',
  email: '',
  password: '',
  confirmPassword: ''
})

/**
 * 自定义校验器：验证确认密码与原密码是否一致
 * @param {Object} rule - 校验规则对象
 * @param {string} value - 待校验值
 * @param {Function} callback - 校验结果回调
 */
const validatePass2 = (rule, value, callback) => {
  if (value === '') {
    callback(new Error('请再次输入密码'))
  } else if (value !== form.password) {
    callback(new Error('两次输入密码不一致!'))
  } else {
    callback()
  }
}

/**
 * 表单校验规则定义
 */
const rules = {
  username: [
    { required: true, message: '请输入用户名', trigger: 'blur' },
    { min: 2, max: 20, message: '长度在 2 到 20 个字符', trigger: 'blur' }
  ],
  email: [
    { required: true, message: '请输入邮箱', trigger: 'blur' },
    { type: 'email', message: '请输入有效的邮箱地址', trigger: ['blur', 'change'] }
  ],
  password: [
    { required: true, message: '请输入密码', trigger: 'blur' },
    { min: 6, message: '密码长度至少 6 个字符', trigger: 'blur' }
  ],
  confirmPassword: [
    { required: true, validator: validatePass2, trigger: 'blur' }
  ]
}

const loading = ref(false)

/**
 * 执行注册流程
 * 数据校验通过后，剔除 redundancy 字段并提交至后端
 */
const handleRegister = async () => {
  if (!formRef.value) return
  await formRef.value.validate(async (valid) => {
    if (valid) {
      loading.value = true
      try {
        // 解构剔除非协议字段 confirmPassword
        const { confirmPassword, ...registerData } = form
        
        await authStore.performRegister(registerData)
        ElMessage.success('注册成功，已自动为您登录！')
        router.push('/')
      } catch (error) {
        // 异常处理由全局拦截器接管
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
      <!-- 注册引导头部 -->
      <div class="auth-header">
        <div class="logo">
          <el-icon :size="32" color="var(--primary-color)"><UserFilled /></el-icon>
        </div>
        <h2>创建账号</h2>
        <p>加入 ChatApp，开启实时沟通</p>
      </div>

      <!-- 注册表单区域 -->
      <el-form 
        ref="formRef" 
        :model="form" 
        :rules="rules" 
        label-position="top" 
        size="large"
        @keyup.enter="handleRegister"
      >
        <el-form-item label="用户名" prop="username">
          <el-input v-model="form.username" placeholder="请输入用户名" :prefix-icon="'User'"/>
        </el-form-item>

        <el-form-item label="邮箱" prop="email">
          <el-input v-model="form.email" placeholder="请输入您的邮箱" :prefix-icon="'Message'"/>
        </el-form-item>
        
        <el-form-item label="密码" prop="password">
          <el-input v-model="form.password" type="password" placeholder="请输入密码（至少6位）" show-password :prefix-icon="'Lock'"/>
        </el-form-item>

        <el-form-item label="确认密码" prop="confirmPassword">
          <el-input v-model="form.confirmPassword" type="password" placeholder="请再次输入密码" show-password :prefix-icon="'Lock'"/>
        </el-form-item>

        <el-form-item>
          <el-button type="primary" class="submit-btn" @click="handleRegister" :loading="loading">
            注 册
          </el-button>
        </el-form-item>
      </el-form>

      <div class="auth-footer">
        已有账号？ <router-link to="/login">返回登录</router-link>
      </div>
    </div>
  </div>
</template>

<style scoped>
/**
 * 样式实现，复用登录页动态背景体系
 */
.auth-container {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, var(--primary-light), var(--bg-dark));
  position: relative;
  overflow: hidden;
}

.auth-container::before {
  content: '';
  position: absolute;
  width: 400px;
  height: 400px;
  background: var(--danger-color);
  border-radius: 50%;
  filter: blur(100px);
  opacity: 0.15;
  top: -100px;
  left: -100px;
  animation: float 12s infinite;
}

.auth-container::after {
  content: '';
  position: absolute;
  width: 300px;
  height: 300px;
  background: var(--primary-color);
  border-radius: 50%;
  filter: blur(100px);
  opacity: 0.2;
  bottom: -50px;
  right: -50px;
  animation: float 10s infinite reverse;
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
  margin-bottom: 24px;
}

.logo {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 64px;
  height: 64px;
  border-radius: 16px;
  background: var(--danger-light);
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

.el-form-item {
  margin-bottom: 18px;
}

.submit-btn {
  width: 100%;
  margin-top: 6px;
  height: 48px;
  font-size: 16px;
  border-radius: 8px;
  background: linear-gradient(135deg, var(--danger-color), var(--primary-color));
  border: none;
  transition: transform 0.2s, box-shadow 0.2s;
}

.submit-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 10px 20px -10px var(--danger-color);
}

.auth-footer {
  text-align: center;
  margin-top: 20px;
  font-size: 14px;
  color: var(--text-secondary);
}

.auth-footer a {
  color: var(--danger-color);
  text-decoration: none;
  font-weight: 500;
  transition: color 0.2s;
}

.auth-footer a:hover {
  opacity: 0.8;
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

