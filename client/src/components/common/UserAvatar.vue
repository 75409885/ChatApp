<script setup>
/**
 * @file components/common/UserAvatar.vue
 * @description 通用用户头像组件，支持自定义尺寸、在线状态标识及加载失败后的文本回退功能。
 */

import { computed } from 'vue'

/**
 * 组件属性定义
 */
const props = defineProps({
  // 用户实体对象，需包含 username 及可选的 avatar, status 字段
  user: {
    type: Object,
    required: true
  },
  // 头像尺寸 (px)
  size: {
    type: Number,
    default: 40
  },
  // 是否展示在线状态指示器
  showStatus: {
    type: Boolean,
    default: true
  }
})

/**
 * 当头像加载失败或不存在时，提取用户名的首字母作为占位文本
 */
const fallbackText = computed(() => {
  if (!props.user?.username) return '?'
  return props.user.username.charAt(0).toUpperCase()
})

/**
 * 根据用户在线状态映射对应的颜色标识
 */
const statusColor = computed(() => {
  switch (props.user?.status) {
    case 'online': return '#10b981' // emerald-500: 在线
    case 'busy': return '#ef4444'   // red-500: 忙碌
    case 'away': return '#f59e0b'   // amber-500: 离开
    default: return '#94a3b8'       // slate-400: 离线
  }
})
</script>

<template>
  <div class="avatar-wrapper" :style="{ width: `${size}px`, height: `${size}px` }">
    <!-- 核心头像引擎：集成地址拼接与文本回退 -->
    <el-avatar 
      :size="size" 
      :src="user.avatar ? `http://localhost:3000${user.avatar}` : ''"
      class="avatar-base"
    >
      {{ fallbackText }}
    </el-avatar>
    
    <!-- 状态指示灯 -->
    <div 
      v-if="showStatus" 
      class="status-indicator"
      :style="{ backgroundColor: statusColor }"
      :title="user.status || 'offline'"
    ></div>
  </div>
</template>

<style scoped>
/**
 * 头像容器及指示器定位策略
 */
.avatar-wrapper {
  position: relative;
  display: inline-flex;
  border-radius: 50%;
}

.avatar-base {
  background: linear-gradient(135deg, var(--primary-color), #ec4899);
  color: white;
  font-weight: 600;
  border: 2px solid var(--bg-panel);
}

.status-indicator {
  position: absolute;
  bottom: 0px;
  right: 0px;
  width: 28%;
  height: 28%;
  border-radius: 50%;
  border: 2px solid var(--bg-panel);
  z-index: 2;
  transition: background-color 0.3s ease;
}
</style>
