<!-- 
  @file App.vue
  @description 根组件，作为整个应用的视图容器。
-->

<script setup>
import { RouterView } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { onMounted } from 'vue'

const authStore = useAuthStore()

// 组件挂载时检查本地存储的令牌，尝试恢复用户登录状态
onMounted(async () => {
  if (authStore.token) {
    await authStore.fetchCurrentUser()
  }
})
</script>

<template>
  <el-config-provider>
    <!-- 路由视图出口 -->
    <RouterView />
  </el-config-provider>
</template>

<style>
/* 全局基础样式配置 */
#app {
  width: 100vw;
  height: 100vh;
  overflow: hidden;
}
</style>
