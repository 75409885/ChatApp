<script setup>
/**
 * @file components/common/EmptyState.vue
 * @description 通用空状态占位组件，用于列表无数据或搜索无结果时的视觉引导。
 */

defineProps({
  // 展示图标名称 (Element Plus 图标库)
  icon: {
    type: String,
    default: 'ChatDotSquare'
  },
  // 主标题文本
  title: {
    type: String,
    default: '暂无数据'
  },
  // 描述性副标题文本
  description: {
    type: String,
    default: ''
  }
})
</script>

<template>
  <div class="empty-state">
    <!-- 图标容器：采用毛玻璃面板质感 -->
    <div class="icon-wrapper glass-panel">
      <el-icon :size="48" color="var(--text-secondary)">
        <component :is="icon" />
      </el-icon>
    </div>
    <h3 class="title">{{ title }}</h3>
    <p v-if="description" class="description">{{ description }}</p>
    <!-- 动作按钮插槽 -->
    <slot name="action"></slot>
  </div>
</template>

<style scoped>
/**
 * 居中布局及元素间距控制
 */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  padding: 40px;
  text-align: center;
}

.icon-wrapper {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100px;
  height: 100px;
  border-radius: 50%;
  margin-bottom: 24px;
}

.title {
  margin: 0 0 8px 0;
  font-size: 20px;
  font-weight: 600;
  color: var(--text-primary);
}

.description {
  margin: 0 0 24px 0;
  color: var(--text-secondary);
  font-size: 14px;
  max-width: 300px;
}
</style>
