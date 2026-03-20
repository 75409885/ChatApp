/**
 * @file main.js
 * @description 前端应用入口文件，负责初始化 Vue 实例、注册全局组件及集成插件。
 */

import { createApp } from 'vue'
import { createPinia } from 'pinia'
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
import 'element-plus/theme-chalk/dark/css-vars.css'
import * as ElementPlusIconsVue from '@element-plus/icons-vue'
import App from './App.vue'
import router from './router'
import './assets/main.css'

// 创建 Vue 应用实例
const app = createApp(App)

// 注册全局 Element Plus 图标组件
for (const [key, component] of Object.entries(ElementPlusIconsVue)) {
  app.component(key, component)
}

// 集成插件与挂载应用
app.use(createPinia())
app.use(router)
app.use(ElementPlus)

app.mount('#app')
