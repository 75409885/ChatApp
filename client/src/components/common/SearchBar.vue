<script setup>
/**
 * @file components/common/SearchBar.vue
 * @description 通用搜索栏组件，支持双向绑定及回车触发搜索动作。
 */

import { ref } from 'vue'

/**
 * 组件属性定义
 */
const props = defineProps({
  placeholder: {
    type: String,
    default: '搜索...'
  },
  // v-model 绑定的数据源
  modelValue: {
    type: String,
    default: ''
  }
})

const emit = defineEmits(['update:modelValue', 'search'])

/**
 * 输入内容同步处理
 * @param {string} val - 当前输入值
 */
const onInput = (val) => {
  emit('update:modelValue', val)
}

/**
 * 触发搜索动作
 */
const onSearch = () => {
  emit('search', props.modelValue)
}
</script>

<template>
  <div class="search-container">
    <el-input
      :model-value="modelValue"
      @update:model-value="onInput"
      :placeholder="placeholder"
      clearable
      :prefix-icon="'Search'"
      @keyup.enter="onSearch"
      class="custom-search"
    >
    </el-input>
  </div>
</template>

<style scoped>
/**
 * 搜索框容器展示
 */
.search-container {
  padding: 16px;
  background-color: var(--bg-panel);
  border-bottom: 1px solid var(--border-color);
}

/**
 * Element Plus 组件样式深度覆写
 * 实现符合 UI 规范的圆角效果及深色背景
 */
.custom-search :deep(.el-input__wrapper) {
  background-color: var(--bg-dark);
  border-radius: 20px;
  box-shadow: 0 0 0 1px var(--border-color) inset;
  padding: 0 16px;
}

.custom-search :deep(.el-input__wrapper.is-focus) {
  box-shadow: 0 0 0 1px var(--primary-color) inset;
}

.custom-search :deep(.el-input__inner) {
  color: var(--text-primary);
  height: 36px;
}
</style>
