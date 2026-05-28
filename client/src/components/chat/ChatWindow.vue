<script setup>
/**
 * @file components/chat/ChatWindow.vue
 * @description 聊天室核心窗口组件，负责消息流展示、自动滚动管理、分页加载及打字状态监测。
 */

import { computed, ref, onMounted, onBeforeUnmount, watch, nextTick } from 'vue'
import { useChatStore } from '@/stores/chat'
import { useAuthStore } from '@/stores/auth'
import MessageBubble from '@/components/chat/MessageBubble.vue'
import MessageInput from '@/components/chat/MessageInput.vue'
import UserAvatar from '@/components/common/UserAvatar.vue'
import { getSocket } from '@/socket'
import { ElMessage } from 'element-plus'

const chatStore = useChatStore()
const authStore = useAuthStore()

// 消息容器 DOM 引用，用于操控滚动行为
const messageContainer = ref(null)
const localVideoRef = ref(null)
const remoteVideoRef = ref(null)

const activeConversation = computed(() => chatStore.activeConversation)
const messages = computed(() => chatStore.activeMessages)
const hasMore = computed(() => chatStore.hasMoreMessages)
const isLoading = computed(() => chatStore.loadingMessages)

const callVisible = ref(false)
const callDirection = ref('outgoing')
const callType = ref('audio')
const callStatus = ref('')
const callPeer = ref(null)
const remoteStream = ref(null)
const isMuted = ref(false)
const isCameraOff = ref(false)

let localStream = null
let peerConnection = null

/**
 * 过滤并获取当前会话中正在输入的其他用户列表
 */
const typingUsers = computed(() => {
  if (!activeConversation.value) return []
  const conversationTyping = chatStore.typingUsers[activeConversation.value._id] || {}
  
  return Object.entries(conversationTyping)
    .filter(([userId]) => userId != authStore.currentUserId) 
    .map(([_, username]) => username)
})

/**
 * 获取会话中的对方用户信息（私聊模式下）
 */
const otherUser = computed(() => {
  if (!activeConversation.value) return null
  const participants = activeConversation.value.participantDetails || []
  return participants.find(p => p.id != authStore.currentUserId) || participants[0]
})

/**
 * 根据发送者 ID 获取详细资料，用于头像及名称渲染
 * @param {string} senderId - 发送者 ID
 */
const getSenderDetails = (senderId) => {
  if (senderId == authStore.currentUserId) return authStore.user
  if (!activeConversation.value?.participantDetails) return null
  return activeConversation.value.participantDetails.find(p => p.id == senderId)
}

/**
 * 滚动消息容器至底部
 */
const scrollToBottom = () => {
  if (messageContainer.value) {
    messageContainer.value.scrollTop = messageContainer.value.scrollHeight
  }
}

const markActiveConversationRead = () => {
  const conversationId = activeConversation.value?._id
  const socket = getSocket()
  if (socket && conversationId) {
    socket.emit('mark_read', { conversationId })
  }
}

const syncMediaElements = async () => {
  await nextTick()
  if (localVideoRef.value && localStream) {
    localVideoRef.value.srcObject = localStream
  }
  if (remoteVideoRef.value && remoteStream.value) {
    remoteVideoRef.value.srcObject = remoteStream.value
  }
}

const getMediaStream = async (type) => {
  if (!navigator.mediaDevices?.getUserMedia) {
    throw new Error('当前浏览器不支持音视频采集')
  }

  return navigator.mediaDevices.getUserMedia({
    audio: true,
    video: type === 'video'
  })
}

const cleanupCall = () => {
  if (peerConnection) {
    peerConnection.close()
    peerConnection = null
  }

  if (localStream) {
    localStream.getTracks().forEach((track) => track.stop())
    localStream = null
  }

  remoteStream.value = null
  callVisible.value = false
  callStatus.value = ''
  callPeer.value = null
  isMuted.value = false
  isCameraOff.value = false
}

const createPeerConnection = (targetUserId) => {
  const socket = getSocket()
  const conversationId = activeConversation.value?._id
  const pc = new RTCPeerConnection({
    iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
  })

  pc.onicecandidate = (event) => {
    if (event.candidate && socket && conversationId) {
      socket.emit('call_signal', {
        conversationId,
        targetUserId,
        signal: { candidate: event.candidate }
      })
    }
  }

  pc.ontrack = (event) => {
    remoteStream.value = event.streams[0]
    syncMediaElements()
    callStatus.value = '通话中'
  }

  localStream?.getTracks().forEach((track) => {
    pc.addTrack(track, localStream)
  })

  peerConnection = pc
  return pc
}

const startCall = async (type) => {
  const socket = getSocket()
  if (!socket || !activeConversation.value || !otherUser.value) {
    ElMessage.error('当前无法发起通话')
    return
  }

  try {
    callType.value = type
    callDirection.value = 'outgoing'
    callPeer.value = otherUser.value
    callStatus.value = '等待对方接听...'
    callVisible.value = true
    localStream = await getMediaStream(type)
    await syncMediaElements()

    createPeerConnection(otherUser.value.id)
    socket.emit('call_invite', {
      conversationId: activeConversation.value._id,
      callType: type
    })
  } catch (error) {
    cleanupCall()
    ElMessage.error(error.message || '无法获取麦克风或摄像头权限')
  }
}

const acceptCall = async () => {
  const socket = getSocket()
  if (!socket || !activeConversation.value || !callPeer.value) return

  try {
    localStream = await getMediaStream(callType.value)
    callDirection.value = 'active'
    await syncMediaElements()
    createPeerConnection(callPeer.value.id)
    callStatus.value = '正在连接...'
    socket.emit('call_answer', {
      conversationId: activeConversation.value._id,
      targetUserId: callPeer.value.id,
      accepted: true,
      callType: callType.value
    })
  } catch (error) {
    ElMessage.error(error.message || '无法接听通话')
    socket.emit('call_answer', {
      conversationId: activeConversation.value._id,
      targetUserId: callPeer.value.id,
      accepted: false,
      callType: callType.value
    })
    cleanupCall()
  }
}

const rejectCall = () => {
  const socket = getSocket()
  if (socket && activeConversation.value && callPeer.value) {
    socket.emit('call_answer', {
      conversationId: activeConversation.value._id,
      targetUserId: callPeer.value.id,
      accepted: false,
      callType: callType.value
    })
  }
  cleanupCall()
}

const endCall = (notifyPeer = true) => {
  const socket = getSocket()
  if (notifyPeer && socket && activeConversation.value && callPeer.value) {
    socket.emit('call_end', {
      conversationId: activeConversation.value._id,
      targetUserId: callPeer.value.id
    })
  }
  cleanupCall()
}

const toggleMute = () => {
  isMuted.value = !isMuted.value
  localStream?.getAudioTracks().forEach((track) => {
    track.enabled = !isMuted.value
  })
}

const toggleCamera = () => {
  isCameraOff.value = !isCameraOff.value
  localStream?.getVideoTracks().forEach((track) => {
    track.enabled = !isCameraOff.value
  })
}

const handleCallInvite = async ({ conversationId, callType: incomingType, from }) => {
  if (callVisible.value) {
    const socket = getSocket()
    socket?.emit('call_answer', {
      conversationId,
      targetUserId: from.id,
      accepted: false,
      callType: incomingType
    })
    return
  }

  if (activeConversation.value?._id !== conversationId) {
    await chatStore.setActiveConversation(conversationId)
  }

  callType.value = incomingType
  callDirection.value = 'incoming'
  callPeer.value = from
  callStatus.value = `${from.username} 邀请你进行${incomingType === 'video' ? '视频' : '语音'}通话`
  callVisible.value = true
}

const handleCallAnswer = async ({ conversationId, accepted, from }) => {
  if (!callVisible.value || activeConversation.value?._id !== conversationId || !peerConnection) return

  if (!accepted) {
    ElMessage.warning(`${from.username} 暂时无法接听`)
    cleanupCall()
    return
  }

  callPeer.value = from
  callDirection.value = 'active'
  callStatus.value = '正在连接...'
  const offer = await peerConnection.createOffer()
  await peerConnection.setLocalDescription(offer)
  getSocket()?.emit('call_signal', {
    conversationId,
    targetUserId: from.id,
    signal: { description: peerConnection.localDescription }
  })
}

const handleCallSignal = async ({ conversationId, fromUserId, signal }) => {
  if (!peerConnection || activeConversation.value?._id !== conversationId) return

  try {
    if (signal.description) {
      await peerConnection.setRemoteDescription(signal.description)
      if (signal.description.type === 'offer') {
        const answer = await peerConnection.createAnswer()
        await peerConnection.setLocalDescription(answer)
        getSocket()?.emit('call_signal', {
          conversationId,
          targetUserId: fromUserId,
          signal: { description: peerConnection.localDescription }
        })
      }
    }

    if (signal.candidate) {
      await peerConnection.addIceCandidate(signal.candidate)
    }
  } catch (error) {
    console.error('[Call] Failed to handle WebRTC signal:', error)
  }
}

const handleCallEnd = ({ conversationId }) => {
  if (activeConversation.value?._id !== conversationId) return
  ElMessage.info('通话已结束')
  endCall(false)
}

/**
 * 监听活跃会话变更
 * 执行滚动复位、加入 Socket 频道并触发消息已读上报
 */
watch(() => activeConversation.value?._id, (newId) => {
  if (newId) {
    const socket = getSocket()
    if (socket) {
      // 核心修复：加入特定会话的实时通信房间
      socket.emit('join_conversation', newId)
      
      nextTick(() => {
        scrollToBottom() 
        markActiveConversationRead()
      })
    }
  }
}, { immediate: true }) // immediate: true 确保组件挂载时若已有活跃会话也能立即加入房间

/**
 * 监听消息增量
 * 实现新消息送达时的自动触底滚动
 */
watch(() => messages.value.length, (newLength, oldLength) => {
  if (newLength > oldLength) {
    nextTick(() => {
      scrollToBottom() 
      markActiveConversationRead()
    })
  }
})

/**
 * 异步加载历史消息记录
 * 处理分页逻辑并修正因内容载入导致的滚动位置跳变
 */
const loadMoreMessages = async () => {
  if (isLoading.value || !hasMore.value || !activeConversation.value) return
  
  const oldHeight = messageContainer.value.scrollHeight
  
  const currentStoreData = chatStore.messages[activeConversation.value._id]
  const nextPage = currentStoreData ? currentStoreData.page + 1 : 2
  
  await chatStore.loadMessages(activeConversation.value._id, nextPage)
  
  nextTick(() => {
    // 维持视觉连续性：计算高度增量并补偿 scrollTop
    const newHeight = messageContainer.value.scrollHeight
    messageContainer.value.scrollTop = newHeight - oldHeight
  })
}

/**
 * 处理滚动事件通知，支持触顶加载逻辑
 * @param {Event} e - 滚动事件对象
 */
const handleScroll = (e) => {
  if (e.target.scrollTop === 0) {
    loadMoreMessages()
  }
}

onMounted(() => {
  const socket = getSocket()
  if (!socket) return

  socket.on('call_invite', handleCallInvite)
  socket.on('call_answer', handleCallAnswer)
  socket.on('call_signal', handleCallSignal)
  socket.on('call_end', handleCallEnd)
})

onBeforeUnmount(() => {
  endCall()
  const socket = getSocket()
  if (socket) {
    socket.off('call_invite', handleCallInvite)
    socket.off('call_answer', handleCallAnswer)
    socket.off('call_signal', handleCallSignal)
    socket.off('call_end', handleCallEnd)
  }
})
</script>

<template>
  <div class="chat-window" v-if="activeConversation">
    
    <!-- 会话头部：展示用户信息及功能入口 -->
    <div class="chat-header">
      <div class="chat-title">
        <UserAvatar v-if="otherUser" :user="otherUser" :size="40" :showStatus="true" />
        <div class="title-info">
          <h3 class="username-display">
            {{ activeConversation.type === 'private' ? otherUser?.username : activeConversation.groupName }}
          </h3>
          <p class="status-display">
            <template v-if="typingUsers.length > 0">
              <span class="typing-indicator">{{ typingUsers.join(', ') }} 正在输入...</span>
            </template>
            <template v-else-if="activeConversation.type === 'private'">
              <span v-if="otherUser?.status === 'online'" class="online-status">在线</span>
              <span v-else>离线</span>
            </template>
          </p>
        </div>
      </div>
      
      <div class="header-actions">
        <el-tooltip content="语音通话" placement="bottom">
          <el-button text circle :icon="'Phone'" @click="startCall('audio')" />
        </el-tooltip>
        <el-tooltip content="视频通话" placement="bottom">
          <el-button text circle :icon="'VideoCamera'" @click="startCall('video')" />
        </el-tooltip>
        <el-dropdown trigger="click" placement="bottom-end">
          <el-button text circle :icon="'More'" />
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item :icon="'User'">查看资料</el-dropdown-item>
              <el-dropdown-item :icon="'Delete'" divided style="color: var(--danger-color);">清空聊天记录</el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>
      </div>
    </div>

    <!-- 消息展示区：处理平滑滚动与内容渲染 -->
    <div 
      class="messages-container custom-scrollbar" 
      ref="messageContainer" 
      @scroll="handleScroll"
    >
      <div v-if="isLoading && hasMore" class="loading-more">
        <el-icon class="is-loading"><Loading /></el-icon> 加载中...
      </div>
      
      <div v-if="!hasMore && messages.length > 0" class="no-more">
        已经到底了
      </div>

      <template v-if="messages.length > 0">
        <MessageBubble 
          v-for="msg in messages" 
          :key="msg._id" 
          :message="msg"
          :senderUser="getSenderDetails(msg.senderId)"
        />
      </template>
      <div v-else class="empty-messages">
        没有聊天记录，发个消息打个招呼吧~
      </div>
    </div>

    <!-- 底部输入交互组件 -->
    <MessageInput :conversationId="activeConversation._id" />

    <el-dialog
      v-model="callVisible"
      width="420px"
      class="call-dialog"
      :show-close="false"
      :close-on-click-modal="false"
      :close-on-press-escape="false"
    >
      <div class="call-panel">
        <div class="call-peer">
          <UserAvatar v-if="callPeer" :user="callPeer" :size="64" :showStatus="false" />
          <h3>{{ callPeer?.username || '通话邀请' }}</h3>
          <p>{{ callStatus }}</p>
        </div>

        <div v-if="callDirection !== 'incoming'" class="media-stage" :class="{ audio: callType === 'audio' }">
          <video
            v-if="callType === 'video'"
            ref="remoteVideoRef"
            class="remote-video"
            autoplay
            playsinline
          ></video>
          <video
            v-if="callType === 'video'"
            ref="localVideoRef"
            class="local-video"
            autoplay
            muted
            playsinline
          ></video>
          <div v-else class="audio-placeholder">
            <el-icon :size="42"><Phone /></el-icon>
          </div>
        </div>

        <div class="call-actions">
          <template v-if="callDirection === 'incoming'">
            <el-button circle type="danger" :icon="'Close'" @click="rejectCall" />
            <el-button circle type="success" :icon="'Check'" @click="acceptCall" />
          </template>
          <template v-else>
            <el-button circle :icon="isMuted ? 'Microphone' : 'Mute'" @click="toggleMute" />
            <el-button
              v-if="callType === 'video'"
              circle
              :icon="isCameraOff ? 'VideoCamera' : 'VideoPause'"
              @click="toggleCamera"
            />
            <el-button circle type="danger" :icon="'PhoneFilled'" @click="endCall" />
          </template>
        </div>
      </div>
    </el-dialog>
  </div>
</template>

<style scoped>
/**
 * 界面布局实现
 * 采用垂直 Flexbox 架构确保输入区与头部固定
 */
.chat-window {
  display: flex;
  flex-direction: column;
  height: 100%;
  width: 100%;
}

.chat-header {
  height: 70px;
  min-height: 70px;
  flex-shrink: 0;
  padding: 0 20px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid var(--border-color);
  background-color: var(--bg-panel);
  z-index: 10;
  box-sizing: border-box;
}

.chat-title {
  display: flex;
  align-items: center;
  gap: 12px;
  height: 100%;
}

.title-info {
  display: flex;
  flex-direction: column;
  justify-content: center;
}

.username-display {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary);
  line-height: 1.2;
}

.status-display {
  margin: 0;
  font-size: 12px;
  color: var(--text-secondary);
  margin-top: 2px;
}

.typing-indicator {
  color: var(--primary-color);
  font-style: italic;
}

.online-status {
  color: var(--success-color);
}

.header-actions .el-button {
  color: var(--text-secondary);
}

.header-actions .el-button:hover {
  color: var(--primary-color);
  background-color: var(--primary-light);
}

.messages-container {
  flex: 1;
  padding: 20px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  position: relative;
  scroll-behavior: smooth;
  /* 基础背景渲染：径向渐变提升视觉层次 */
  background-image: radial-gradient(circle at center, var(--glass-border) 0%, transparent 100%);
}

.loading-more, .no-more {
  text-align: center;
  font-size: 12px;
  color: var(--text-secondary);
  padding: 10px 0;
  margin-bottom: 16px;
}

.empty-messages {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-secondary);
  font-size: 14px;
}

.custom-scrollbar::-webkit-scrollbar {
  width: 6px;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background: var(--bg-hover);
  border-radius: 3px;
}

:deep(.call-dialog .el-dialog__body) {
  padding: 0;
}

.call-panel {
  padding: 24px;
  background-color: var(--bg-panel);
  color: var(--text-primary);
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.call-peer {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: 8px;
}

.call-peer h3 {
  margin: 4px 0 0;
  font-size: 18px;
}

.call-peer p {
  margin: 0;
  color: var(--text-secondary);
  font-size: 13px;
}

.media-stage {
  position: relative;
  width: 100%;
  aspect-ratio: 16 / 10;
  overflow: hidden;
  border-radius: 8px;
  background-color: var(--bg-dark);
}

.media-stage.audio {
  aspect-ratio: 16 / 6;
}

.remote-video {
  width: 100%;
  height: 100%;
  object-fit: cover;
  background-color: var(--bg-dark);
}

.local-video {
  position: absolute;
  right: 12px;
  bottom: 12px;
  width: 96px;
  height: 72px;
  object-fit: cover;
  border-radius: 8px;
  border: 2px solid var(--bg-panel);
  background-color: var(--bg-dark);
}

.audio-placeholder {
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--primary-color);
}

.call-actions {
  display: flex;
  justify-content: center;
  gap: 16px;
}
</style>
