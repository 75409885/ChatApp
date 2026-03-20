/**
 * @file router/index.js
 * @description Vue Router (路由配置和前置守卫)。
 * 
 * 把这个文件想象成是一栋大楼的“电梯电梯导航中心”加上“大门保安”。
 * 1. 路由配置 (routes): 告诉系统，按下什么楼层（访问哪个网址URL），就显示哪个房间（对应的 Vue 页面组件）。
 * 2. 路由守卫 (router.beforeEach): 那个保安老大爷。你上楼前，他要检查你的工作牌（Token）有没有权限。
 */

import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const router = createRouter({
  // 使用 HTML5 模式，URL 看起来也就是最正常的 http://localhost:5173/login 而不是带小尾巴 /#/login
  history: createWebHistory(import.meta.env.BASE_URL),
  
  // 这就是我们的“楼层分布图”
  routes: [
    {
      path: '/login', // 如果你在浏览器输入了 .../login
      name: 'login',  // 给这个路由取个名字，以后跳转方便
      // 就把你往 LoginView.vue 这个页面送
      component: () => import('../views/LoginView.vue'),
      
      // meta 可以随便加一些自定义的便签，这里的意思是：这层楼只有“游客”(没登录的人)能进。
      meta: { requiresGuest: true }
    },
    {
      path: '/register',
      name: 'register',
      component: () => import('../views/RegisterView.vue'),
      meta: { requiresGuest: true }
    },
    {
      path: '/',      // 聊天大厅，也是最核心的页面，路径最短
      name: 'home',
      component: () => import('../views/ChatView.vue'),
      // 这张便签的意思是：这层楼是机密，必须登录(Auth)才能进！
      meta: { requiresAuth: true }
    },
    {
      path: '/settings',
      name: 'settings',
      component: () => import('../views/SettingsView.vue'),
      meta: { requiresAuth: true }
    }
  ]
})

// ================== 保安老大爷开始工作查岗 ==================
// router.beforeEach 这句话的意思是：“每次用户想切换页面之前，拦住他，进这个函数判断一下”
router.beforeEach(async (to, from, next) => {
  // to: 你想去哪一层楼？
  // from: 你是从哪一层楼来的？
  // next: 大爷的放行按钮。你必须调用 next() 才能让路由真正跳转下去。

  // 我们去 Pinia "仓库" 问一下：这个人有没有登录？
  const authStore = useAuthStore()
  // !! 两个感叹号的作用：把一个未知的数据强行变成 true 或者 false 的布尔值。
  // 如果大仓库里存了 token 这个凭证，说明登录了 (true)，否则没登录 (false)。
  const isAuthenticated = !!authStore.token

  // 第一关检查：目标页面是“必须登录才能看的机密页面”，但你其实“没登录”
  if (to.meta.requiresAuth && !isAuthenticated) {
    // 保安大爷：去去去，没登录凑什么热闹，给我回 /login 去登录！
    next({ name: 'login' })
  } 
  // 第二关检查：目标页面是“只有死游客才能看的注册/登录页”，但你明明“已经登录”了
  else if (to.meta.requiresGuest && isAuthenticated) {
    // 保安大爷：你都登录成功了，还在登录页磨蹭啥？直接回去聊天主页 / ！
    next({ name: 'home' })
  } 
  // 第三关：啥事没有，正常人正常走正常路
  else {
    // 保安大爷：没毛病，放行！按你原计划去你要去的那个页面吧。
    next()
  }
})

// 把保安大爷和电梯系统暴露出去了，让 main.js 可以接手使用它
export default router
