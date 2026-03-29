<script setup>
/**
 * @file views/SettingsView.vue
 * @description 用户设置页面组件，支持个人资料更新、头像上传及外观偏好管理。
 */

import { ref, reactive, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useUiStore } from '@/stores/ui'
import MainLayout from '@/components/layout/MainLayout.vue'
import UserAvatar from '@/components/common/UserAvatar.vue'
import { ElMessage } from 'element-plus'

const router = useRouter()
const authStore = useAuthStore()
const uiStore = useUiStore()

// 用户资料响应式引用
const user = computed(() => authStore.user)

// 视图面板调度变量 ('profile' | 'appearance' | 'security')
const activeTab = ref('profile')
const formRef = ref(null)

// 上传状态标识
const uploading = ref(false)
// 文件输入框 DOM 引用
const fileInput = ref(null)

// 个人资料表单数据
const profileForm = reactive({
  username: user.value?.username || '',
  signature: user.value?.signature || '',
})

// 表单原始快照，用于重置操作
const originalProfileForm = { ...profileForm }

/**
 * 资料表单校验规则
 */
const rules = {
  username: [
    { required: true, message: '请输入用户名', trigger: 'blur' },
    { min: 2, max: 20, message: '长度在 2 到 20 个字符', trigger: 'blur' }
  ],
  signature: [
    { max: 200, message: '签名最多 200 个字符', trigger: 'blur' }
  ]
}

/**
 * 触发隐藏的文件选择器
 */
const triggerAvatarSelect = () => {
  fileInput.value.click()
}

/**
 * 处理头像变更事件
 * 利用 FormData 封装二进制文件流并执行异步上传
 * @param {Event} event - 文件变更事件
 */
const handleAvatarChange = async (event) => {
  const file = event.target.files[0]
  if (!file) return

  // 校验文件大小 (上限 5MB)
  if (file.size > 5 * 1024 * 1024) {
    ElMessage.warning('头像文件大小不能超过 5MB')
    event.target.value = ''
    return
  }

  const formData = new FormData()
  formData.append('avatar', file)

  uploading.value = true
  try {
    await authStore.updateProfile(formData)
    ElMessage.success('头像更新成功')
  } catch (error) {
    ElMessage.error('更新头像失败')
  } finally {
    uploading.value = false
    event.target.value = ''
  }
}

/**
 * 保存用户资料更改
 * 验证通过后利用 FormData 提交多部分数据
 */
const handleSaveProfile = async () => {
  if (!formRef.value) return
  await formRef.value.validate(async (valid) => {
    if (valid) {
      try {
        const formData = new FormData()
        formData.append('username', profileForm.username)
        formData.append('signature', profileForm.signature)

        await authStore.updateProfile(formData)
        ElMessage.success('资料已保存')
      } catch (error) {
        ElMessage.error('资料保存失败')
      }
    }
  })
}

/**
 * 切换界面主题
 * @param {boolean} val - 是否开启深色模式
 */
const toggleTheme = (val) => {
  uiStore.setTheme(val ? 'dark' : 'light')
}
</script>

<template>
  <MainLayout>
    <div class="settings-container">
      <!-- 设置中心头部 -->
      <div class="settings-header glass-panel">
        <h2>用户设置</h2>
        <p>管理您的个人资料、账号安全和应用首选项。</p>
      </div>

      <div class="settings-body">

        <!-- 侧边导航菜单 -->
        <div class="settings-tabs custom-scrollbar">
          <ul class="tab-list">
            <li :class="{ active: activeTab === 'profile' }" @click="activeTab = 'profile'">
              <el-icon>
                <User />
              </el-icon> 个人资料
            </li>
            <li :class="{ active: activeTab === 'appearance' }" @click="activeTab = 'appearance'">
              <el-icon>
                <MagicStick />
              </el-icon> 外观设置
            </li>
            <li :class="{ active: activeTab === 'security' }" @click="activeTab = 'security'">
              <el-icon>
                <Lock />
              </el-icon> 账号安全
            </li>
          </ul>
        </div>

        <!-- 动态内容渲染区域 -->
        <div class="settings-content custom-scrollbar">

          <!-- 个人资料面板 -->
          <div v-if="activeTab === 'profile'" class="fade-in">
            <h3 class="section-title">公共资料</h3>

            <div class="avatar-section glass-panel">
              <UserAvatar :user="user" :size="80" :showStatus="false" />
              <div class="avatar-actions">
                <h4>个人头像</h4>
                <p class="avatar-tip">支持 JPG、PNG 或 GIF 格式。最大尺寸 5MB。</p>
                <div class="avatar-btns">
                  <el-button type="primary" size="small" :loading="uploading"
                    @click="triggerAvatarSelect">更换头像</el-button>
                  <input type="file" ref="fileInput" class="hidden-input" accept="image/jpeg,image/png,image/gif"
                    @change="handleAvatarChange" />
                </div>
              </div>
            </div>

            <div class="form-section">
              <el-form ref="formRef" :model="profileForm" :rules="rules" label-position="top">
                <el-form-item label="用户名" prop="username">
                  <el-input v-model="profileForm.username" placeholder="请输入您的昵称" />
                  <div class="help-text">此名称将显示在您的联系人列表中，方便朋友识别。</div>
                </el-form-item>

                <el-form-item label="个性签名" prop="signature">
                  <el-input v-model="profileForm.signature" type="textarea" :rows="3" placeholder="介绍一下自己吧..."
                    maxlength="200" show-word-limit />
                </el-form-item>

                <el-form-item>
                  <el-button type="primary" @click="handleSaveProfile">保存修改</el-button>
                  <el-button
                    @click="profileForm.signature = originalProfileForm.signature; profileForm.username = originalProfileForm.username">重置</el-button>
                </el-form-item>
              </el-form>
            </div>
          </div>

          <!-- 外观设置面板 -->
          <div v-else-if="activeTab === 'appearance'" class="fade-in">
            <h3 class="section-title">界面外观</h3>
            <div class="setting-item">
              <div class="setting-info">
                <h4>深色模式</h4>
                <p>开启后以深色主题展示界面，保护视力</p>
              </div>
              <el-switch :model-value="uiStore.theme === 'dark'" @change="toggleTheme"
                active-color="var(--primary-color)" />
            </div>
          </div>

          <!-- 安全设置面板 -->
          <div v-else-if="activeTab === 'security'" class="fade-in">
            <h3 class="section-title">账号与安全</h3>
            <div class="danger-zone">
              <h4 class="danger-title">危险区域</h4>
              <el-button type="danger" plain size="small">注销账号</el-button>
            </div>
          </div>

        </div>
      </div>
    </div>
  </MainLayout>
</template>

<style scoped>
.settings-container {
  display: flex;
  flex-direction: column;
  height: 100%;
  width: 100%;
  background-color: var(--bg-dark);
}

.settings-header {
  padding: 30px 40px;
  border-radius: 0 0 24px 24px;
  border-top: none;
  border-left: none;
  border-right: none;
  box-shadow: 0 10px 30px -10px rgba(0, 0, 0, 0.15);
  z-index: 10;
}

.settings-header h2 {
  margin: 0 0 8px;
  font-size: 28px;
  font-weight: 700;
  background: linear-gradient(135deg, var(--text-primary), var(--primary-color));
  background-clip: text;
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

.settings-header p {
  margin: 0;
  color: var(--text-secondary);
  font-size: 15px;
}

.settings-body {
  flex: 1;
  display: flex;
  overflow: hidden;
}

.settings-tabs {
  width: 250px;
  padding: 30px 20px;
  border-right: 1px solid var(--border-color);
  overflow-y: auto;
}

.tab-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.tab-list li {
  padding: 12px 16px;
  border-radius: 12px;
  color: var(--text-secondary);
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 12px;
  font-weight: 500;
  transition: all 0.2s;
}

.tab-list li:hover {
  background-color: var(--bg-hover);
  color: var(--text-primary);
}

.tab-list li.active {
  background-color: var(--primary-light);
  color: var(--primary-color);
}

.settings-content {
  flex: 1;
  padding: 40px;
  overflow-y: auto;
  max-width: 800px;
}

.section-title {
  margin: 0 0 24px;
  font-size: 20px;
  font-weight: 600;
  color: var(--text-primary);
}

.avatar-section {
  display: flex;
  align-items: center;
  gap: 24px;
  padding: 24px;
  border-radius: 16px;
}

.avatar-actions h4 {
  margin: 0 0 4px;
  font-size: 16px;
  color: var(--text-primary);
}

.avatar-tip {
  font-size: 12px;
  color: var(--text-secondary);
  margin-bottom: 12px;
}

.avatar-btns {
  display: flex;
  gap: 8px;
}

.form-section {
  margin-top: 24px;
}

.help-text {
  font-size: 12px;
  color: var(--text-secondary);
  margin-top: 4px;
}

:deep(.el-form-item__label) {
  color: var(--text-primary);
  font-weight: 500;
}

:deep(.el-input__wrapper),
:deep(.el-textarea__inner) {
  background-color: var(--bg-hover);
  box-shadow: none !important;
  border: 1px solid transparent;
  transition: all 0.2s;
}

:deep(.el-input__wrapper.is-focus),
:deep(.el-textarea__inner:focus) {
  background-color: var(--bg-panel);
  border-color: var(--primary-color);
  box-shadow: 0 0 0 1px var(--primary-color) inset !important;
}

.setting-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  background-color: var(--bg-panel);
  border-radius: 12px;
  border: 1px solid var(--glass-border);
}

.setting-info h4 {
  margin: 0 0 4px;
  font-size: 15px;
  font-weight: 600;
  color: var(--text-primary);
}

.setting-info p {
  margin: 0;
  font-size: 13px;
  color: var(--text-secondary);
}

.hidden-input {
  display: none;
}

.fade-in {
  animation: fadeIn 0.4s ease-in-out;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }

  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.custom-scrollbar::-webkit-scrollbar {
  width: 6px;
}

.custom-scrollbar::-webkit-scrollbar-thumb {
  background: var(--bg-hover);
  border-radius: 3px;
}

.danger-zone {
  margin-top: 32px;
  padding-top: 24px;
  border-top: 1px solid var(--border-color);
}

.danger-title {
  color: var(--danger-color);
  margin-bottom: 8px;
  font-weight: 600;
}
</style>
