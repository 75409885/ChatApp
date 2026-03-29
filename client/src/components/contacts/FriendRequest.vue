<script setup>
/**
 * @file components/contacts/FriendRequest.vue
 * @description 好友申请项组件，展示申请人信息并提供接受/拒绝操作接口。
 */

import { computed } from 'vue'
import UserAvatar from '@/components/common/UserAvatar.vue'
import { Check, Close } from '@element-plus/icons-vue'

/**
 * 组件属性定义
 */
const props = defineProps({
  request: {
    type: Object,
    required: true
  }
})

const emit = defineEmits(['accept', 'reject'])

// 提取申请人详细资料
const requester = computed(() => props.request.requester)
</script>

<template>
  <div class="request-item">
    <!-- 申请人头像展示 -->
    <UserAvatar :user="requester" :size="40" :showStatus="false" />
    
    <!-- 申请详情负载区 -->
    <div class="content">
      <div class="name">{{ requester.username }}</div>
      <div class="info">请求添加您为好友</div>
    </div>
    
    <!-- 操作按钮区 -->
    <div class="actions">
      <el-button 
        type="primary" 
        circle 
        :icon="Check" 
        size="small" 
        @click="emit('accept', request.id)"
        title="接受"
      />
      <el-button 
        type="info" 
        circle 
        :icon="Close" 
        size="small" 
        plain
        @click="emit('reject', request.id)"
        title="拒绝"
      />
    </div>
  </div>
</template>

<style scoped>
/**
 * 申请项样式布局
 */
.request-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  background-color: var(--bg-hover);
  border-radius: 12px;
  margin-bottom: 8px;
  border: 1px solid var(--glass-border);
}

.content {
  flex: 1;
  min-width: 0;
}

.name {
  font-weight: 600;
  font-size: 14px;
  color: var(--text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.info {
  font-size: 12px;
  color: var(--text-secondary);
  margin-top: 4px;
}

.actions {
  display: flex;
  gap: 8px;
}
</style>
