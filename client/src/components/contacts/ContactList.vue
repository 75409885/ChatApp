<script setup>
/**
 * @file components/contacts/ContactList.vue
 * @description 联系人列表主控组件，集成好友检索、全局用户查询及好友申请管理。
 */

import { ref, computed } from 'vue'
import { useFriendStore } from '@/stores/friends'
import { useChatStore } from '@/stores/chat'
import SearchBar from '@/components/common/SearchBar.vue'
import ContactItem from '@/components/contacts/ContactItem.vue'
import FriendRequest from '@/components/contacts/FriendRequest.vue'
import EmptyState from '@/components/common/EmptyState.vue'
import { searchUsers as searchUsersApi, sendFriendRequest } from '@/api/services'
import { useAuthStore } from '@/stores/auth'
import { ElMessage } from 'element-plus'

const friendStore = useFriendStore()
const chatStore = useChatStore()
const authStore = useAuthStore()

const emit = defineEmits(['select-chat'])

// 当前活跃视图状态 ('friends' | 'requests' | 'search')
const activeTab = ref('friends') 
const searchQuery = ref('')
const searchResults = ref([])
const searching = ref(false)

/**
 * 本地好友过滤逻辑
 * 根据用户名或签名进行模糊匹配
 */
const filteredFriends = computed(() => {
  const query = searchQuery.value.toLowerCase()
  if (!query) return friendStore.friendsList 
  
  return friendStore.friendsList.filter(f => 
    f.username.toLowerCase().includes(query) || 
    (f.signature && f.signature.toLowerCase().includes(query))
  )
})

/**
 * 执行全局用户搜索
 * 获取非好友且非本人的用户列表
 */
const handleGlobalSearch = async () => {
  if (!searchQuery.value.trim()) {
    searchResults.value = []
    return
  }
  
  activeTab.value = 'search'
  searching.value = true
  try {
    const { data } = await searchUsersApi(searchQuery.value)
    
    // 排除现有的好友以及当前登录用户
    searchResults.value = data.filter(u => 
      !friendStore.friendsList.some(f => f.id === u.id) && 
      u.id !== authStore.currentUserId 
    )
  } catch (error) {
    ElMessage.error('搜索用户失败')
  } finally {
    searching.value = false
  }
}

/**
 * 同意好友请求
 * @param {string} id - 请求 ID
 */
const acceptRequest = async (id) => {
  try {
    await friendStore.acceptRequest(id)
    ElMessage.success('已添加好友')
  } catch (e) {}
}

/**
 * 拒绝好友请求
 * @param {string} id - 请求 ID
 */
const rejectRequest = async (id) => {
  try {
    await friendStore.rejectRequest(id)
    ElMessage.success('已拒绝请求')
  } catch (e) {}
}

/**
 * 发送好友申请
 * @param {string} userId - 目标用户 ID
 */
const sendRequestToUser = async (userId) => {
  try {
    await sendFriendRequest(userId)
    ElMessage.success('好友请求已发送')
  } catch (e) {}
}

/**
 * 发起私聊会话
 * @param {Object} friend - 好友实体
 */
const startChat = async (friend) => {
  try {
    const convId = await chatStore.startPrivateChat(friend.id)
    // 通知父级组件完成路由切换
    emit('select-chat', convId)
  } catch (e) {
    ElMessage.error('发起会话失败')
  }
}
</script>

<template>
  <div class="contact-list-container">
    <div class="header-section">
      <h2>联系人</h2>
    </div>
    
    <SearchBar 
      v-model="searchQuery" 
      placeholder="搜索好友或添加新用户..." 
      @search="handleGlobalSearch" 
    />
    
    <!-- 导航切换区 -->
    <div class="tabs-wrapper">
      <el-radio-group v-model="activeTab" size="small" class="w-full tabs-group">
        <el-radio-button label="friends" class="flex-1">
          我的好友 ({{ friendStore.friendsList.length }})
        </el-radio-button>
        <el-radio-button label="requests" class="flex-1 nav-requests">
          新朋友
          <span v-if="friendStore.requestsCount > 0" class="badge-dot"></span>
        </el-radio-button>
      </el-radio-group>
    </div>
    
    <!-- 动态展示列表容器 -->
    <div class="list-content custom-scrollbar">
      
      <!-- 好友列表模式 -->
      <template v-if="activeTab === 'friends'">
        <template v-if="filteredFriends.length > 0">
          <ContactItem 
            v-for="friend in filteredFriends" 
            :key="friend.id" 
            :contact="friend" 
            mode="friend"
            @click="startChat"
          />
        </template>
        <EmptyState v-else-if="!searchQuery" icon="User" title="暂无好友" description="使用上方搜索框查找并添加新朋友" />
        <EmptyState v-else icon="Search" title="无搜索结果" description="未找到匹配的好友" >
          <template #action>
            <el-button type="primary" size="small" @click="handleGlobalSearch">全局搜索用户</el-button>
          </template>
        </EmptyState>
      </template>
      
      <!-- 好友申请模式 -->
      <template v-else-if="activeTab === 'requests'">
        <div v-if="friendStore.requestsList.length > 0" class="p-3">
          <FriendRequest 
            v-for="req in friendStore.requestsList" 
            :key="req.id" 
            :request="req" 
            @accept="acceptRequest"
            @reject="rejectRequest"
          />
        </div>
        <EmptyState v-else icon="Bell" title="暂无新请求" description="暂时没有收到新的好友申请" />
      </template>
      
      <!-- 全局检索结果预览 -->
      <template v-else-if="activeTab === 'search'">
        <div v-if="searching" class="search-loading">
          <el-icon class="is-loading" :size="24"><Loading /></el-icon>
          <p>正在查询...</p>
        </div>
        <div v-else-if="searchResults.length > 0" class="search-results-wrapper">
          <h4 class="search-title">全网搜索结果：</h4>
          <div v-for="user in searchResults" :key="user.id" class="search-result-item">
            <ContactItem :contact="user" mode="friend" :isActive="false" />
            <el-button type="primary" size="small" plain @click="sendRequestToUser(user.id)" class="add-btn">
              加好友
            </el-button>
          </div>
        </div>
        <EmptyState v-else icon="Search" title="未找到用户" description="请缩短关键词再试一次" >
          <template #action>
            <el-button @click="activeTab = 'friends'" size="small">返回好友列表</el-button>
          </template>
        </EmptyState>
      </template>

    </div>
  </div>
</template>

<style scoped>
/**
 * 列表布局及选项卡样式
 */
.contact-list-container {
  display: flex;
  flex-direction: column;
  height: 100%;
  background-color: var(--bg-panel);
  border-right: 1px solid var(--border-color);
}
.header-section { padding: 20px 16px 12px; text-align: center; }
.header-section h2 { margin: 0; font-size: 20px; font-weight: 700; color: var(--text-primary); }
.tabs-wrapper { padding: 12px 16px; border-bottom: 1px solid var(--border-color); }
.tabs-group { display: flex; width: 100%; }
.nav-requests { position: relative; }
:deep(.el-radio-button__inner) { width: 100%; background-color: var(--bg-dark); border-color: var(--border-color); color: var(--text-secondary); }
:deep(.el-radio-button__original-radio:checked + .el-radio-button__inner) { background-color: var(--primary-color); border-color: var(--primary-color); box-shadow: -1px 0 0 0 var(--primary-color); }
.badge-dot { position: absolute; top: 8px; right: 12px; width: 8px; height: 8px; border-radius: 50%; background-color: var(--danger-color); }
.list-content { flex: 1; overflow-y: auto; }
.custom-scrollbar::-webkit-scrollbar { width: 6px; }
.custom-scrollbar::-webkit-scrollbar-thumb { background: var(--bg-hover); border-radius: 3px; }
.search-loading { padding: 24px; text-align: center; color: var(--text-secondary); }
.search-loading p { margin-top: 8px; font-size: 14px; }
.search-results-wrapper { padding: 12px; }
.search-title { font-size: 14px; font-weight: 600; color: var(--text-secondary); margin-bottom: 12px; margin-left: 4px; }
.search-result-item { position: relative; background-color: var(--bg-hover); border-radius: 12px; margin-bottom: 8px; overflow: hidden; }
.add-btn { position: absolute; right: 16px; top: 50%; transform: translateY(-50%); }
</style>
