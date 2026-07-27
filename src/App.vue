<template>
  <div v-if="!loggedIn" class="login-wrapper">
    <div class="login-card">
      <div class="login-logo">🏓</div>
      <h1>乒乓球 SaaS 管理系统</h1>
      <p class="login-sub">多门店 · 消课 · 排课 · 数据看板</p>
      <el-form :model="loginForm" @submit.prevent="handleLogin" style="margin-top:28px">
        <el-form-item>
          <el-input v-model="loginForm.phone" placeholder="手机号" size="large" prefix-icon="Phone" />
        </el-form-item>
        <el-form-item>
          <el-input v-model="loginForm.password" type="password" placeholder="密码" size="large" prefix-icon="Lock" show-password />
        </el-form-item>
        <el-button type="primary" size="large" style="width:100%" :loading="loginLoading" @click="handleLogin">登 录</el-button>
      </el-form>
      <p class="login-hint">提示：boss / shop_owner 可登录后台</p>
    </div>
  </div>

  <el-container v-else class="layout">
    <!-- 侧边栏 -->
    <el-aside :width="collapsed ? '64px' : '230px'" class="sidebar">
      <div class="sidebar-header">
        <span class="sidebar-logo">🏓</span>
        <span v-if="!collapsed" class="sidebar-title">乒乓 SaaS</span>
      </div>
      <el-scrollbar class="sidebar-scroll">
        <el-menu
          :default-active="activeMenu"
          :collapse="collapsed"
          :collapse-transition="false"
          @select="handleMenuSelect"
          class="sidebar-menu"
        >
          <el-menu-item index="dashboard">
            <el-icon><DataLine /></el-icon><span>首页概览</span>
          </el-menu-item>

          <el-sub-menu index="data-center">
            <template #title>
              <el-icon><DataAnalysis /></el-icon><span>数据中心</span>
            </template>
            <el-menu-item v-if="userInfo.role === 'boss'" index="target-setting"><el-icon><Aim /></el-icon><span>目标设定</span></el-menu-item>
            <el-menu-item index="sales-target"><el-icon><Calendar /></el-icon><span>业绩目标</span></el-menu-item>
            <el-menu-item index="consumption-target"><el-icon><Timer /></el-icon><span>课消目标</span></el-menu-item>
            <el-menu-item index="lesson-ranking"><el-icon><TrendCharts /></el-icon><span>课消排名</span></el-menu-item>
            <el-menu-item index="performance-ranking"><el-icon><Trophy /></el-icon><span>业绩排名</span></el-menu-item>
            <el-menu-item index="store-ranking"><el-icon><Shop /></el-icon><span>门店排名</span></el-menu-item>
          </el-sub-menu>

          <el-sub-menu index="business">
            <template #title>
              <el-icon><Briefcase /></el-icon><span>业务管理</span>
            </template>
            <el-menu-item index="students"><el-icon><Reading /></el-icon><span>学员管理</span></el-menu-item>
            <el-menu-item index="course-orders"><el-icon><Tickets /></el-icon><span>订单管理</span></el-menu-item>
            <el-menu-item index="course-consumptions"><el-icon><TrendCharts /></el-icon><span>消课记录</span></el-menu-item>
            <el-menu-item index="refund-logs"><el-icon><RefreshLeft /></el-icon><span>退款记录</span></el-menu-item>
            <el-menu-item index="schedule"><el-icon><Calendar /></el-icon><span>教练排课</span></el-menu-item>
          </el-sub-menu>

          <el-sub-menu index="config">
            <template #title>
              <el-icon><Setting /></el-icon><span>基础配置</span>
            </template>
            <el-menu-item index="course-types"><el-icon><Box /></el-icon><span>课包管理</span></el-menu-item>
            <el-menu-item v-if="userInfo.role === 'boss'" index="stores"><el-icon><Shop /></el-icon><span>门店管理</span></el-menu-item>
            <el-menu-item v-if="userInfo.role === 'boss'" index="staff"><el-icon><User /></el-icon><span>员工管理</span></el-menu-item>
          </el-sub-menu>
        </el-menu>
      </el-scrollbar>
    </el-aside>

    <!-- 右侧主区域 -->
    <el-container class="main-container">
      <el-header class="topbar">
        <div class="topbar-left">
          <el-button text @click="collapsed = !collapsed" class="collapse-btn">
            <el-icon size="20"><Fold v-if="!collapsed" /><Expand v-else /></el-icon>
          </el-button>
          <el-breadcrumb separator="/">
            <el-breadcrumb-item>{{ currentTitle }}</el-breadcrumb-item>
          </el-breadcrumb>
        </div>
        <el-dropdown>
          <span class="user-info">
            <el-avatar :size="34" class="user-avatar">{{ userInfo.name?.charAt(0) || 'U' }}</el-avatar>
            <span class="user-name">{{ userInfo.name }}</span>
            <el-tag :type="userInfo.role === 'boss' ? 'danger' : 'warning'" size="small" effect="dark">
              {{ userInfo.role === 'boss' ? '老板' : '店长' }}
            </el-tag>
          </span>
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item @click="handleLogout"><el-icon><SwitchButton /></el-icon>退出登录</el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>
      </el-header>

      <el-main class="content-area">
        <router-view />
      </el-main>
    </el-container>
  </el-container>
</template>

<script setup>
import { ref, reactive, computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { ElMessage } from 'element-plus'
import api from './api'

const router = useRouter()
const route = useRoute()

const loggedIn = ref(!!localStorage.getItem('token'))
const loginForm = reactive({ phone: '', password: '' })
const loginLoading = ref(false)
const collapsed = ref(false)
const userInfo = ref(JSON.parse(localStorage.getItem('userInfo') || '{}'))

// 当前激活的菜单项（从路由推断）
const activeMenu = computed(() => route.name || 'dashboard')
// 当前页面标题
const currentTitle = computed(() => route.meta?.title || '首页概览')

// 菜单点击 → 路由跳转
const handleMenuSelect = (index) => {
  router.push({ name: index })
}

const handleLogin = async () => {
  if (!loginForm.phone || !loginForm.password) {
    ElMessage.warning('请输入手机号和密码')
    return
  }
  loginLoading.value = true
  try {
    const res = await api.post('/auth/login', loginForm)
    localStorage.setItem('token', res.data.token)
    localStorage.setItem('userInfo', JSON.stringify(res.data))
    userInfo.value = res.data
    loggedIn.value = true
    // 登录成功后跳转首页
    router.push('/dashboard')
  } catch (e) { /* handled by interceptor */ } finally {
    loginLoading.value = false
  }
}

const handleLogout = () => {
  localStorage.removeItem('token')
  localStorage.removeItem('userInfo')
  loggedIn.value = false
  router.push('/')
}

// 监听 Token 过期事件（由 api 拦截器触发）
window.addEventListener('auth-expired', () => {
  loggedIn.value = false
  ElMessage.warning('登录已过期，请重新登录')
})
</script>

<style>
/* ===== 全局重置 ===== */
* { margin: 0; padding: 0; box-sizing: border-box; }
body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', sans-serif; }

/* ===== 登录页 ===== */
.login-wrapper {
  height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%);
  position: relative;
  overflow: hidden;
}
.login-wrapper::before {
  content: '';
  position: absolute;
  top: -50%;
  left: -50%;
  width: 200%;
  height: 200%;
  background: radial-gradient(circle at 30% 70%, rgba(64,158,255,0.15) 0%, transparent 50%),
              radial-gradient(circle at 70% 30%, rgba(103,194,58,0.1) 0%, transparent 50%);
  animation: float 20s ease-in-out infinite;
}
@keyframes float {
  0%, 100% { transform: translate(0, 0); }
  50% { transform: translate(-30px, 20px); }
}
.login-card {
  background: rgba(255,255,255,0.95);
  backdrop-filter: blur(20px);
  padding: 44px 40px 36px;
  border-radius: 16px;
  box-shadow: 0 20px 60px rgba(0,0,0,0.3);
  width: 380px;
  text-align: center;
  position: relative;
  z-index: 1;
}
.login-logo {
  font-size: 48px;
  margin-bottom: 12px;
}
.login-card h1 {
  font-size: 22px;
  color: #1a1a2e;
  font-weight: 700;
}
.login-sub {
  color: #909399;
  font-size: 13px;
  margin-top: 6px;
}
.login-hint {
  color: #c0c4cc;
  font-size: 12px;
  margin-top: 20px;
}

/* ===== 布局 ===== */
.layout { height: 100vh; }

/* ===== 侧边栏 ===== */
.sidebar {
  background: #1e1e2d;
  transition: width 0.3s ease;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}
.sidebar-header {
  height: 60px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  border-bottom: 1px solid rgba(255,255,255,0.05);
  flex-shrink: 0;
}
.sidebar-logo { font-size: 24px; }
.sidebar-title {
  color: #fff;
  font-size: 16px;
  font-weight: 700;
  white-space: nowrap;
}
.sidebar-scroll { flex: 1; }

/* ===== 菜单覆盖 Element 样式 ===== */
.sidebar-menu {
  border-right: none !important;
  background: transparent !important;
}
.sidebar-menu .el-menu-item,
.sidebar-menu .el-sub-menu__title {
  color: #a0a0b8 !important;
  height: 46px !important;
  line-height: 46px !important;
}
.sidebar-menu .el-menu-item:hover,
.sidebar-menu .el-sub-menu__title:hover {
  background: rgba(64,158,255,0.08) !important;
  color: #fff !important;
}
.sidebar-menu .el-menu-item.is-active {
  background: linear-gradient(90deg, rgba(64,158,255,0.2), rgba(64,158,255,0.05)) !important;
  color: #409EFF !important;
  border-right: 3px solid #409EFF;
}

/* 子菜单展开区域 — 深色背景 */
.sidebar-menu .el-sub-menu .el-menu {
  background: #181825 !important;
}
.sidebar-menu .el-sub-menu .el-menu-item {
  padding-left: 52px !important;
  height: 42px !important;
  line-height: 42px !important;
  font-size: 13px;
  color: #8a8a9e !important;
  background: transparent !important;
}
.sidebar-menu .el-sub-menu .el-menu-item:hover {
  color: #fff !important;
  background: rgba(64,158,255,0.06) !important;
}
.sidebar-menu .el-sub-menu .el-menu-item.is-active {
  color: #409EFF !important;
  background: linear-gradient(90deg, rgba(64,158,255,0.15), rgba(64,158,255,0.03)) !important;
  border-right: 3px solid #409EFF;
}

/* 子菜单箭头颜色 */
.sidebar-menu .el-sub-menu__title .el-sub-menu__icon-arrow {
  color: #a0a0b8 !important;
}

/* ===== 顶栏 ===== */
.topbar {
  background: #fff;
  border-bottom: 1px solid #ebedf0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 20px;
  height: 56px !important;
  box-shadow: 0 1px 4px rgba(0,0,0,0.04);
  z-index: 10;
}
.topbar-left {
  display: flex;
  align-items: center;
  gap: 12px;
}
.collapse-btn { padding: 6px !important; }
.user-info {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  padding: 4px 12px;
  border-radius: 8px;
  transition: background 0.2s;
}
.user-info:hover { background: #f5f7fa; }
.user-avatar {
  background: linear-gradient(135deg, #409EFF, #36cfc9) !important;
  color: #fff !important;
  font-weight: 600;
}
.user-name {
  font-size: 14px;
  color: #303133;
  font-weight: 500;
}

/* ===== 内容区 ===== */
.content-area {
  background: #f0f2f5;
  padding: 20px;
  overflow-y: auto;
}

/* ===== 通用页面卡片（所有子页面可共用） ===== */
.page-card {
  background: #fff;
  border-radius: 10px;
  padding: 20px 24px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.05);
  margin-bottom: 16px;
}
.page-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
  flex-wrap: wrap;
  gap: 8px;
  min-height: 40px;
}
.toolbar-left {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}
.toolbar-left .el-select,
.toolbar-left .el-input {
  width: 160px;
}
</style>
