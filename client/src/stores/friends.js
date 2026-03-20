/**
 * @file stores/friends.js
 * @description 好友关系管理 Store，负责维护好友列表、处理好友申请及同步用户在线状态。
 */

import { defineStore } from 'pinia'
import { getFriends, getFriendRequests, acceptFriendRequest as acceptApi, rejectFriendRequest as rejectApi, removeFriend as removeApi } from '@/api/services'

export const useFriendStore = defineStore('friends', {
  /**
   * 状态定义
   */
  state: () => ({
    // 已确认的好友列表
    friendsList: [],  
    // 待处理的好友申请列表
    requestsList: [], 
    // 加载状态标识
    loading: false
  }),
  
  /**
   * 计算属性
   */
  getters: {
    // 过滤出在线好友
    onlineFriends: (state) => state.friendsList.filter((f) => f.status === 'online'),
    // 过滤出离线好友
    offlineFriends: (state) => state.friendsList.filter((f) => f.status !== 'online'),
    // 当前未处理申请计数
    requestsCount: (state) => state.requestsList.length
  },
  
  /**
   * 业务动作
   */
  actions: {
    /**
     * 从服务器同步好友列表
     */
    async fetchFriends() {
      this.loading = true
      try {
        const { data } = await getFriends()
        this.friendsList = data
      } finally {
        this.loading = false
      }
    },
    
    /**
     * 从服务器同步待处理申请列表
     */
    async fetchRequests() {
      try {
        const { data } = await getFriendRequests()
        this.requestsList = data
      } catch (e) {
        console.error('[FriendStore] Failed to fetch requests:', e)
      }
    },
    
    /**
     * 接受好友申请
     * @param {number} id - 申请记录 ID
     */
    async acceptRequest(id) {
      await acceptApi(id)
      // 成功后重新拉取申请列表与好友列表以同步状态
      await this.fetchRequests()
      await this.fetchFriends() 
    },
    
    /**
     * 拒绝好友申请
     * @param {number} id - 申请记录 ID
     */
    async rejectRequest(id) {
      await rejectApi(id)
      await this.fetchRequests()
    },
    
    /**
     * 移除已有好友
     * @param {number} id - 目标用户 ID
     */
    async removeFriend(id) {
      await removeApi(id)
      await this.fetchFriends()
    },

    /**
     * 更新指定用户的在线状态（响应 Socket 事件）
     * @param {number} userId - 用户 ID
     * @param {string} status - 在线状态 (online/offline)
     */
    updateUserStatus(userId, status) {
      const friend = this.friendsList.find((f) => f.id === userId)
      if (friend) {
        friend.status = status
      }
    },
    
    /**
     * 实时接收新好友申请
     * @param {Object} request - 申请实体对象
     */
    receiveFriendRequest(request) {
      // 采用乐观更新策略，立即推入列表前部
      this.requestsList.unshift(request)
    }
  }
})
