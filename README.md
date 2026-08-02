# 🏓 PingPong SaaS — 乒乓球培训管理系统（前端）

> 面向乒乓球培训连锁机构的多门店 SaaS 管理系统前端，支持老板/店长/教练/销售四种角色登录，涵盖数据看板、学员管理、课包订单、消课退款、排课日程、客户池、业绩目标等核心功能。

<p align="center">
  <img src="https://img.shields.io/badge/Vue-3.5-brightgreen" alt="Vue">
  <img src="https://img.shields.io/badge/Vite-8.x-purple" alt="Vite">
  <img src="https://img.shields.io/badge/Element%20Plus-2.14-blue" alt="Element Plus">
  <img src="https://img.shields.io/badge/ECharts-6.x-orange" alt="ECharts">
  <img src="https://img.shields.io/badge/License-MIT-yellow" alt="License">
</p>

---

## ✨ 功能特性

- **多角色登录**：boss / shop_owner / coach / sales 四种角色，菜单和页面权限自动适配
- **数据看板**：7 大核心指标卡片、业绩/课消目标环形进度图、每日业绩走势折线图、门店业绩/课消明细表格、教练排名
- **学员管理**：列表展开行显示课包详情、停课/复课开关、续费入口、多维排序
- **订单管理**：新报/续费标签、实付金额显隐切换、手机号必填校验
- **消课记录**：消课流水查询、日期范围筛选
- **退款管理**：学员搜索联动课包、退款金额自动计算不可改、全退校验
- **教练排课**：月视图排课，7 天窗口翻阅，8 工作时段 + 2 休息时段，每格最多 6 学员，莫兰迪配色
- **客户池**：学员缴费/消课排名、建议约课（超 2 周未上课）、建议续费（剩余 ≤ 5 课时）
- **目标看板**：业绩目标 + 课消目标双维度，环形图/折线图/柱状图
- **排名系统**：教练课消排名、教练业绩排名、销售业绩排名、门店排名，支持关键词搜索
- **404 页面**：catch-all 路由兜底

## 🛠 技术栈

| 技术 | 版本 | 说明 |
|------|------|------|
| Vue | 3.5 | 前端框架（Composition API + `<script setup>`） |
| Vite | 8.x | 构建工具（Rolldown 引擎） |
| Element Plus | 2.14 | UI 组件库 |
| Vue Router | 4.6 | 路由管理（懒加载 + 权限守卫） |
| Axios | 1.18 | HTTP 请求（JWT 拦截器） |
| ECharts | 6.1 | 图表库（环形图/折线图/柱状图） |
| @element-plus/icons-vue | 2.3 | 图标库 |

## 📦 环境要求

- **Node.js 18+**
- **npm** 或 **pnpm**

## 🚀 快速开始

### 1. 克隆仓库

```bash
git clone https://github.com/xiaoshun12138/pingpong-saas-vue.git
cd pingpong-saas-vue
```

### 2. 安装依赖

```bash
npm install
```

### 3. 开发模式

```bash
npm run dev
```

前端启动在 `http://localhost:5173`，需配合后端 `http://localhost:8080` 使用。

### 4. 构建生产包

```bash
npm run build
```

构建产物在 `dist/` 目录。

### 5. 部署到后端

```bash
# 方式一：直接复制到后端静态资源目录
cp -r dist/* ../pingpong-saas/src/main/resources/static/

# 方式二：rsync 同步（推荐，自动清理旧文件）
rsync -a --delete dist/ ../pingpong-saas/src/main/resources/static/
```

> 后端 Spring Boot 会自动托管 `static/` 目录下的前端产物，无需 Nginx。

## 📄 页面一览

| 页面 | 路由 | 说明 | 角色权限 |
|------|------|------|----------|
| 登录 | `/login` | 手机号 + 密码登录 | 公开 |
| 数据看板 | `/dashboard` | 7 大指标 + 目标环形图 + 走势 + 门店明细 + 排名 | boss 全量 / shop_owner 本店 |
| 学员管理 | `/students` | 列表展开行、停课/复课、续费、排序、状态/教练筛选 | boss + shop_owner |
| 订单管理 | `/course-orders` | 新报/续费、金额显隐、日期筛选 | boss + shop_owner |
| 消课记录 | `/course-consumptions` | 消课流水、日期筛选 | boss + shop_owner |
| 退款记录 | `/refund-logs` | 退款流水、学员搜索联动课包、全退不可改 | boss + shop_owner |
| 教练排课 | `/schedule` | 月视图、7 天窗口、8+2 时段、莫兰迪配色 | boss + shop_owner |
| 客户池 | `/customer-pool` | 缴费/消课排名、建议约课、建议续费 | boss + shop_owner |
| 课消排名 | `/ranking/lessons` | 教练课消排名，支持搜索 | boss + shop_owner |
| 业绩排名 | `/ranking/performance` | 教练/销售业绩排名，支持搜索 | boss + shop_owner |
| 门店排名 | `/ranking/stores` | 门店课消/业绩排名 | boss |
| 业绩目标 | `/target-dashboard/sales` | 环形图 + 折线图 + 柱状图 | boss + shop_owner |
| 课消目标 | `/target-dashboard/consumption` | 环形图 + 折线图 + 柱状图 | boss + shop_owner |
| 目标设定 | `/target-setting` | 月度/周度目标 CRUD | boss |
| 课包管理 | `/course-types` | 课包类型 CRUD | boss + shop_owner |
| 门店管理 | `/stores` | 门店 CRUD | boss |
| 员工管理 | `/staff` | 员工 CRUD、角色筛选、统计卡片 | boss + shop_owner |
| 404 | `/:pathMatch(.*)*` | 页面不存在 | 已登录 |

## 🗂 菜单结构

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
│   ├── 门店排名（boss）
│   └── 目标设定（boss）
├── 团队管理
│   └── 员工管理
└── 基础配置（boss）
    ├── 课包管理
    └── 门店管理
```

## 🔐 角色权限

| 角色 | 菜单范围 | 数据范围 |
|------|----------|----------|
| boss | 全部菜单 | 全部门店，可按门店筛选 |
| shop_owner | 除门店排名/目标设定/门店管理外 | 仅本门店 |
| coach | 仅看自己相关数据 | 仅自己 |
| sales | 仅看自己相关数据 | 仅自己 |

前端通过 `localStorage.userInfo.role` 控制菜单显隐和页面权限。路由守卫拦截未授权访问。

## 📁 项目结构

```
src/
├── App.vue                  # 根组件（侧边栏菜单 + 主内容区）
├── main.js                  # 入口（Element Plus 注册、中文化、路由挂载）
├── router/
│   └── index.js             # 路由配置（懒加载 + 权限守卫 + 404 兜底）
├── api.js                   # Axios 封装（JWT 拦截器 + 401 跳转登录）
├── utils/
│   └── format.js            # 统一金额格式化 formatMoney()
├── views/
│   ├── Login.vue            # 登录页
│   ├── Dashboard.vue        # 数据看板
│   ├── Students.vue         # 学员管理
│   ├── CourseOrders.vue     # 订单管理
│   ├── CourseConsumptions.vue # 消课记录
│   ├── RefundLogs.vue       # 退款记录
│   ├── Schedule.vue         # 教练排课（月视图）
│   ├── CustomerPool.vue     # 客户池
│   ├── Staff.vue            # 员工管理
│   ├── Stores.vue           # 门店管理
│   ├── CourseTypes.vue      # 课包管理
│   ├── SalesTarget.vue      # 业绩目标
│   ├── ConsumptionTarget.vue # 课消目标
│   ├── LessonRanking.vue    # 课消排名
│   ├── PerformanceRanking.vue # 业绩排名
│   ├── StoreRanking.vue     # 门店排名
│   ├── TargetSetting.vue    # 目标设定
│   └── NotFound.vue         # 404 页面
└── assets/
    └── styles/              # 全局样式
```

## 🎨 设计亮点

- **统一卡片布局**：所有列表页统一 `page-card` + `page-toolbar` 结构
- **深色侧边栏**：`#1e1e2d` 主色，菜单按业务模块分组
- **响应式表格**：`min-width` 自适应列宽，操作列 `fixed="right"` 固定
- **莫兰迪配色**：排课页面学员课程块使用柔和色系
- **数字过渡动画**：排课统计使用 easeOutCubic 缓动
- **统一金额格式化**：`formatMoney()` — `¥0` / `¥X.X万` / `¥X,XXX`

## 🔗 关联项目

| 仓库 | 说明 |
|------|------|
| [pingpong-saas-vue](https://github.com/xiaoshun12138/pingpong-saas-vue) | 前端（本仓库） |
| [pingpong-saas-springboot](https://github.com/xiaoshun12138/pingpong-saas-springboot) | 后端（Spring Boot + MyBatis-Plus） |

## 📄 License

MIT License — 仅供学习交流使用，商业使用请联系作者。

## 🤝 贡献

欢迎提 Issue 和 PR。

- 作者：xiaoshun12138
- GitHub：https://github.com/xiaoshun12138
