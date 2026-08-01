# 乒乓球培训管理系统（前端）

> Vue 3 + Vite + Element Plus + Vue Router + Pinia

## 项目简介

面向乒乓球培训机构的 SaaS 管理系统前端，支持多角色登录、数据看板、学员/订单/消课/退款管理、排课日程、客户池等功能。

## 技术栈

| 技术 | 版本 | 说明 |
|------|------|------|
| Vue | 3.x | 前端框架 |
| Vite | 8.x | 构建工具 |
| Element Plus | 最新 | UI 组件库 |
| Vue Router | 4.x | 路由管理 |
| Axios | - | HTTP 请求 |

## 环境要求

- Node.js 18+
- npm 或 pnpm

## 快速开始

### 1. 克隆仓库

```bash
git clone git@github.com:xiaoshun12138/pingpong-saas-vue.git
cd pingpong-saas-vue
```

### 2. 安装依赖

```bash
npm install
```

### 3. 开发模式运行

```bash
npm run dev
```

前端启动在 `http://localhost:5173`，需配合后端 `http://localhost:8080` 使用。

### 4. 构建生产包

```bash
npm run build
```

构建产物在 `dist/` 目录，可直接部署到后端的 `static/` 目录。

## 页面列表

| 页面 | 路由 | 说明 |
|------|------|------|
| 登录 | `/login` | 手机号 + 密码登录 |
| 数据看板 | `/dashboard` | 7 大核心指标、业绩/课消目标环形图、每日走势、门店业绩/课消明细、教练排名 |
| 学员管理 | `/students` | 学员列表（展开行显示课包详情）、停课/复课、续费、排序 |
| 订单管理 | `/course-orders` | 课包订单列表、新报/续费标签、实付金额显隐切换 |
| 消课记录 | `/course-consumptions` | 消课流水、学员/教练/订单关联 |
| 退款记录 | `/refund-logs` | 退款流水、学员搜索联动课包 |
| 教练排课 | `/schedule` | 周视图排课，8 工作时段 + 2 休息时段，每格最多 6 学员 |
| 客户池 | `/customer-pool` | 学员缴费排名、消课排名、需约课提醒 |
| 课包管理 | `/course-types` | 课包类型 CRUD |
| 门店管理 | `/stores` | 门店 CRUD（仅 boss） |
| 员工管理 | `/staff` | 员工 CRUD、角色筛选、统计卡片 |
| 业绩目标 | `/target-dashboard/sales` | 业绩目标环形图、趋势折线图、门店对比柱状图 |
| 课消目标 | `/target-dashboard/consumption` | 课消目标环形图、趋势折线图、门店对比柱状图 |
| 目标设定 | `/target-setting` | 月度/周度目标 CRUD（仅 boss） |

## 菜单结构

```
├── 数据看板
├── 业务管理
│   ├── 学员管理
│   ├── 订单管理
│   ├── 消课记录
│   ├── 退款记录
│   ├── 教练排课
│   └── 客户池
├── 数据中心
│   ├── 业绩目标
│   ├── 课消目标
│   ├── 课消排名
│   ├── 业绩排名
│   └── 目标设定（boss）
├── 团队管理
│   └── 员工管理
└── 基础配置（boss）
    ├── 课包管理
    └── 门店管理
```

## 角色权限

- **boss（老板）**：全量菜单、全部门店筛选
- **shop_owner（店长）**：本门店数据、无目标设定/门店管理
- **coach（教练）**：仅看自己相关数据
- **sales（销售）**：仅看自己相关数据

前端通过 `localStorage.userInfo.role` 控制菜单显隐和页面权限。

## 项目结构

```
src/
├── App.vue                  # 根组件（菜单、布局）
├── main.js                  # 入口（Element Plus 注册、路由挂载）
├── router/index.js          # 路由配置（懒加载、权限守卫）
├── api.js                   # Axios 封装（JWT 拦截器）
├── views/
│   ├── Login.vue            # 登录页
│   ├── Dashboard.vue        # 数据看板
│   ├── Students.vue         # 学员管理
│   ├── CourseOrders.vue     # 订单管理
│   ├── CourseConsumptions.vue # 消课记录
│   ├── RefundLogs.vue       # 退款记录
│   ├── Schedule.vue         # 教练排课
│   ├── CustomerPool.vue     # 客户池
│   ├── Staff.vue            # 员工管理
│   ├── Stores.vue           # 门店管理
│   ├── CourseTypes.vue      # 课包管理
│   ├── SalesTarget.vue      # 业绩目标
│   ├── ConsumptionTarget.vue # 课消目标
│   ├── PerformanceRanking.vue # 课消排名
│   ├── SalesRanking.vue     # 业绩排名
│   └── TargetSetting.vue    # 目标设定
└── assets/
```

## 后端配合

后端仓库：https://github.com/xiaoshun12138/pingpong-saas-springboot

前端构建后执行以下命令部署到后端：

```bash
npm run build
cp -r dist/* ../pingpong-saas/src/main/resources/static/
```

## GitHub

- 前端仓库：https://github.com/xiaoshun12138/pingpong-saas-vue
- 后端仓库：https://github.com/xiaoshun12138/pingpong-saas-springboot
