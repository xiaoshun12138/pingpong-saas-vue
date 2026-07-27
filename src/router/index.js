import { createRouter, createWebHistory } from 'vue-router'
import { ElMessage } from 'element-plus'

// 路由懒加载（按需加载，减小首屏 bundle）
const routes = [
  { path: '/', redirect: '/dashboard' },
  {
    path: '/dashboard',
    name: 'dashboard',
    component: () => import('../views/Dashboard.vue'),
    meta: { title: '首页概览' }
  },
  {
    path: '/target-setting',
    name: 'target-setting',
    component: () => import('../views/TargetSetting.vue'),
    meta: { title: '目标设定', roles: ['boss'] }
  },
  {
    path: '/sales-target',
    name: 'sales-target',
    component: () => import('../views/SalesTarget.vue'),
    meta: { title: '业绩目标' }
  },
  {
    path: '/consumption-target',
    name: 'consumption-target',
    component: () => import('../views/ConsumptionTarget.vue'),
    meta: { title: '课消目标' }
  },
  {
    path: '/lesson-ranking',
    name: 'lesson-ranking',
    component: () => import('../views/LessonRanking.vue'),
    meta: { title: '课消排名' }
  },
  {
    path: '/performance-ranking',
    name: 'performance-ranking',
    component: () => import('../views/PerformanceRanking.vue'),
    meta: { title: '业绩排名' }
  },
  {
    path: '/store-ranking',
    name: 'store-ranking',
    component: () => import('../views/StoreRanking.vue'),
    meta: { title: '门店排名' }
  },
  {
    path: '/students',
    name: 'students',
    component: () => import('../views/Students.vue'),
    meta: { title: '学员管理' }
  },
  {
    path: '/course-orders',
    name: 'course-orders',
    component: () => import('../views/CourseOrders.vue'),
    meta: { title: '订单管理' }
  },
  {
    path: '/course-consumptions',
    name: 'course-consumptions',
    component: () => import('../views/CourseConsumptions.vue'),
    meta: { title: '消课记录' }
  },
  {
    path: '/refund-logs',
    name: 'refund-logs',
    component: () => import('../views/RefundLogs.vue'),
    meta: { title: '退款记录' }
  },
  {
    path: '/schedule',
    name: 'schedule',
    component: () => import('../views/Schedule.vue'),
    meta: { title: '教练排课' }
  },
  {
    path: '/course-types',
    name: 'course-types',
    component: () => import('../views/CourseTypes.vue'),
    meta: { title: '课包管理' }
  },
  {
    path: '/stores',
    name: 'stores',
    component: () => import('../views/Stores.vue'),
    meta: { title: '门店管理', roles: ['boss'] }
  },
  {
    path: '/staff',
    name: 'staff',
    component: () => import('../views/Staff.vue'),
    meta: { title: '员工管理', roles: ['boss'] }
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

// 全局前置守卫：登录检查 + 权限检查
router.beforeEach((to, from, next) => {
  const token = localStorage.getItem('token')
  if (!token) {
    // 未登录，不跳路由（让 App.vue 的登录页显示）
    next(false)
    return
  }
  // 权限检查
  const userInfo = JSON.parse(localStorage.getItem('userInfo') || '{}')
  const requiredRoles = to.meta.roles
  if (requiredRoles && !requiredRoles.includes(userInfo.role)) {
    ElMessage.warning('无权访问该页面')
    next('/dashboard')
    return
  }
  next()
})

export default router
