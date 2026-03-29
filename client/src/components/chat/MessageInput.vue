<script setup>
/**
 * @file components/chat/MessageInput.vue
 * @description 消息输入控制组件，支持文本、打字状态侦听、一键清空及多媒体文件二进制流传输。
 */

import { ref } from 'vue'
import { getSocket } from '@/socket'
import { useAuthStore } from '@/stores/auth'
import axios from 'axios'
import { ElMessage } from 'element-plus'

/**
 * 组件属性定义
 */
const props = defineProps({
  conversationId: {
    type: String,
    required: true
  }
})

const authStore = useAuthStore()

// 响应式消息内容模型
const inputMsg = ref('')

// 文件上传相关引用
const fileInput = ref(null) 
const uploading = ref(false)

/**
 * 处理输入框打字状态
 * 实现客户端侧打字频率控制（Debounce 逻辑）
 */
let typingTimeout = null
const handleInput = () => {
  const socket = getSocket()
  if (!socket) return

  // 触发“正在输入”实时信令
  socket.emit('typing', { conversationId: props.conversationId })
  
  if (typingTimeout) clearTimeout(typingTimeout)
  typingTimeout = setTimeout(() => {
    // 自动终止打字状态上报
    socket.emit('stop_typing', { conversationId: props.conversationId })
  }, 2000)
}

/**
 * 发送纯文本消息
 * 执行内容清理、信令提交及状态重置
 */
const sendTextMessage = () => {
  const msg = inputMsg.value.trim() 
  if (!msg) return 

  const socket = getSocket()
  if (socket) {
    socket.emit('send_message', {
      conversationId: props.conversationId,
      content: msg,
      type: 'text'
    })
    
    clearTimeout(typingTimeout)
    socket.emit('stop_typing', { conversationId: props.conversationId })
    
    inputMsg.value = ''
  } else {
    ElMessage.error('WebSocket 连接已断开，发送失败')
  }
}

/**
 * 触发隐藏的文件选择器 DOM
 */
const triggerFileInput = () => {
  fileInput.value.click()
}

/**
 * 处理多媒体文件上传
 * 结合服务端能力限制文件载核大小，并利用 Base64 编码实现跨协议传输
 * @param {Event} event - 文件变更事件
 */
const handleFileUpload = async (event) => {
  const file = event.target.files[0]
  if (!file) return

  // 严格限制载荷尺寸 (10MB)
  if (file.size > 10 * 1024 * 1024) {
    ElMessage.warning('文件大小超出限制 (10MB)')
    event.target.value = ''
    return
  }

  const isImage = file.type.startsWith('image/')
  uploading.value = true

  try {
    const reader = new FileReader()
    reader.onload = () => {
      const base64Data = reader.result
      
      const socket = getSocket()
      if (socket) {
        socket.emit('send_message', {
          conversationId: props.conversationId,
          content: isImage ? '图片' : '文件: ' + file.name,
          type: isImage ? 'image' : 'file',
          fileInfo: {
            fileName: file.name,
            fileSize: file.size,
            fileUrl: base64Data 
          }
        })
      }
      uploading.value = false
      event.target.value = '' 
    }
    reader.onerror = () => {
      ElMessage.error('文件读取失败')
      uploading.value = false
    }
    reader.readAsDataURL(file) 

  } catch (error) {
    ElMessage.error('上传处理异常')
    uploading.value = false
    event.target.value = ''
  }
}
</script>

<template>
  <div class="message-input-container">
    <!-- 功能工具栏 -->
    <div class="toolbar">
      <el-tooltip content="发送图片/文件" placement="top">
        <el-button text circle :icon="'FolderOpened'" @click="triggerFileInput" />
      </el-tooltip>
      <!-- 隐藏的文件选择原生组件 -->
      <input 
        type="file" 
        ref="fileInput" 
        style="display: none" 
        @change="handleFileUpload" 
        accept="image/*,.pdf,.doc,.docx,.zip,.txt"
      />
    </div>
    
    <!-- 内容输入交互区 -->
    <div class="input-wrapper">
      <el-input
        v-model="inputMsg"
        type="textarea"
        :autosize="{ minRows: 1, maxRows: 4 }" 
        placeholder="输入消息，按 Enter 发送..."
        resize="none"
        class="chat-input"
        @input="handleInput"
        @keydown.enter.prevent="sendTextMessage" 
        :disabled="uploading"
      />
      <el-button 
        type="primary" 
        circle 
        class="send-btn" 
        :icon="'Position'" 
        @click="sendTextMessage"
        :disabled="!inputMsg.trim() || uploading"
        :loading="uploading"
      />
    </div>
  </div>
</template>

<style scoped>
/**
 * 输入容器布局体系
 */
.message-input-container {
  padding: 12px 20px;
  background-color: var(--bg-panel);
  border-top: 1px solid var(--border-color);
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.toolbar {
  display: flex;
  gap: 4px;
}

.toolbar .el-button {
  color: var(--text-secondary);
}

.toolbar .el-button:hover {
  color: var(--primary-color);
  background-color: var(--primary-light);
}

.input-wrapper {
  display: flex;
  align-items: flex-end;
  gap: 12px;
  position: relative;
}

/**
 * 输入框深度样式覆写
 */
.chat-input :deep(.el-textarea__inner) {
  background-color: var(--bg-dark);
  border: 1px solid var(--border-color);
  border-radius: 12px;
  padding: 12px 16px;
  padding-right: 50px;
  color: var(--text-primary);
  font-family: inherit;
  transition: border-color 0.2s;
  box-shadow: none;
}

.chat-input :deep(.el-textarea__inner:focus) {
  border-color: var(--primary-color);
}

.chat-input :deep(.el-textarea__inner::-webkit-scrollbar) {
  width: 4px;
}
.chat-input :deep(.el-textarea__inner::-webkit-scrollbar-thumb) {
  background: var(--bg-hover);
  border-radius: 2px;
}

.send-btn {
  position: absolute; 
  right: 8px;
  bottom: 8px;
  transition: transform 0.2s;
}

.send-btn:not(:disabled):hover {
  transform: scale(1.1);
}
</style>
