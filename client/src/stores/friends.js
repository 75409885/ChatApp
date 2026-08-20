/**
 * @file stores/friends.js
 * @description 好友关系管理 Store，负责维护好友列表、处理好友申请及同步用户在线状态。
 */

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import {
  getFriends,
  getFriendRequests,
  acceptFriendRequest as acceptApi,
  rejectFriendRequest as rejectApi,
  removeFriend as removeApi
} from '@/api/services'

export const useFriendStore = defineStore('friends', () => {
  /**
   * 状态定义
   */
  // 已确认的好友列表
  const friendsList = ref([])
  // 待处理的好友申请列表
  const requestsList = ref([])
  // 加载状态标识
  const loading = ref(false)

  /**
   * 计算属性
   */
  // 过滤出在线好友
  const onlineFriends = computed(() => friendsList.value.filter((f) => f.status === 'online'))
  // 过滤出离线好友
  const offlineFriends = computed(() => friendsList.value.filter((f) => f.status !== 'online'))
  // 当前未处理申请计数
  const requestsCount = computed(() => requestsList.value.length)

  /**
   * 业务动作
   */

  /**
   * 从服务器同步好友列表
   */
  async function fetchFriends() {
    loading.value = true
    try {
      const { data } = await getFriends()
      // 客户端二次去重，确保 UI 呈现唯一性
      const uniqueFriends = []
      const seenIds = new Set()
      data.forEach((f) => {
        if (!seenIds.has(f.id)) {
          seenIds.add(f.id)
          uniqueFriends.push(f)
        }
      })
      friendsList.value = uniqueFriends
    } finally {
      loading.value = false
    }
  }

  /**
   * 从服务器同步待处理申请列表
   */
  async function fetchRequests() {
    try {
      const { data } = await getFriendRequests()
      requestsList.value = data
    } catch (e) {
      console.error('[FriendStore] Failed to fetch requests:', e)
    }
  }

  /**
   * 接受好友申请
   * @param {number} id - 申请记录 ID
   */
  async function acceptRequest(id) {
    await acceptApi(id)
    // 成功后重新拉取申请列表与好友列表以同步状态
    await fetchRequests()
    await fetchFriends()
  }

  /**
   * 拒绝好友申请
   * @param {number} id - 申请记录 ID
   */
  async function rejectRequest(id) {
    await rejectApi(id)
    await fetchRequests()
  }

  /**
   * 移除已有好友
   * @param {number} id - 目标用户 ID
   */
  async function removeFriend(id) {
    await removeApi(id)
    await fetchFriends()
  }

  /**
   * 更新指定用户的在线状态（响应 Socket 事件）
   * @param {number} userId - 用户 ID
   * @param {string} status - 在线状态 (online/offline)
   */
  function updateUserStatus(userId, status) {
    const friend = friendsList.value.find((f) => f.id === userId)
    if (friend) {
      friend.status = status
    }
  }

  /**
   * 实时接收新好友申请
   * @param {Object} request - 申请实体对象
   */
  function receiveFriendRequest(request) {
    const exists = requestsList.value.some((item) => item.id === request.id)
    if (!exists) {
      // 采用乐观更新策略，立即推入列表前部
      requestsList.value.unshift(request)
    }
  }

  return {
    friendsList,
    requestsList,
    loading,

    onlineFriends,
    offlineFriends,
    requestsCount,

    fetchFriends,
    fetchRequests,
    acceptRequest,
    rejectRequest,
    removeFriend,
    updateUserStatus,
    receiveFriendRequest
  }
})
