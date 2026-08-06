# pingpong-saas-vue

乒乓球培训连锁机构多门店 SaaS 系统前端。

## 技术栈

Vue 3.5 / Element Plus 2.14 / ECharts 6.1 / Vue Router 4.6 / Axios / Vite 8

## 快速开始

```bash
git clone https://github.com/xiaoshun12138/pingpong-saas-vue.git
cd pingpong-saas-vue
npm install
npm run dev          # 开发模式，跑在 localhost:5173
npm run build        # 构建生产包，产物在 dist/
```

构建后把 dist 目录内容复制到后端 springboot 项目的 `src/main/resources/static/` 即可。

## 页面

| 页面 | 路由 | 权限 |
|------|------|------|
| 首页概览 | /dashboard | 老板、店长 |
| 学员管理 | /students | 老板、店长 |
| 订单管理 | /course-orders | 老板、店长 |
| 消课记录 | /course-consumptions | 老板、店长 |
| 退款记录 | /refund-logs | 老板、店长 |
| 教练消课 | /schedule | 老板、店长 |
| 客户池 | /customer-pool | 老板、店长 |
| 业绩目标 | /sales-target | 老板、店长 |
| 课消目标 | /consumption-target | 老板、店长 |
| 课消排名 | /lesson-ranking | 老板、店长 |
| 业绩排名 | /performance-ranking | 老板、店长 |
| 目标设定 | /target-setting | 仅老板 |
| 门店管理 | /stores | 仅老板 |
| 课包管理 | /course-types | 老板、店长 |
| 员工管理 | /staff | 老板、店长 |

另有 404 页面兜底未匹配路由。

## 菜单

侧边栏按业务模块分组：

- 首页概览
- 数据中心：目标设定(老板)、业绩目标、课消目标、课消排名、业绩排名
- 业务管理：学员管理、订单管理、消课记录、退款记录、教练消课、客户池
- 团队管理：员工管理
- 基础配置：课包管理、门店管理(老板)

菜单显隐由 `userInfo.role` 控制，路由守卫 `beforeEach` 做权限拦截。

## 项目结构

```
src/
├── main.js            # 入口
├── App.vue            # 根组件（登录页 / 侧边栏布局）
├── api/index.js       # Axios 封装（JWT 拦截、异常处理）
├── router/index.js    # 路由配置（懒加载、权限守卫、404）
├── utils/format.js    # 统一金额格式化
└── views/             # 16个页面组件
```

## 关联项目

后端：https://github.com/xiaoshun12138/pingpong-saas-springboot
