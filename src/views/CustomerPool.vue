<template>
  <div class="page-card customer-pool-page">
    <!-- 顶部统计卡片 -->
    <div class="pool-stats">
      <div class="pool-stat-card" :class="{ active: activeTab === 'all' }" @click="switchTab('all')">
        <div class="pool-stat-icon" style="background:linear-gradient(135deg,#409EFF,#36cfc9)"><span>👥</span></div>
        <div class="pool-stat-info">
          <span class="pool-stat-num">{{ summary.totalStudents }}</span>
          <span class="pool-stat-label">总学员</span>
        </div>
      </div>
      <div class="pool-stat-card" :class="{ active: activeTab === 'suggest-schedule' }" @click="switchTab('suggest-schedule')">
        <div class="pool-stat-icon" style="background:linear-gradient(135deg,#E6A23C,#F39C12)"><span>⏰</span></div>
        <div class="pool-stat-info">
          <span class="pool-stat-num">{{ summary.needSchedule }}</span>
          <span class="pool-stat-label">需约课</span>
        </div>
      </div>
      <div class="pool-stat-card" :class="{ active: activeTab === 'active' }" @click="switchTab('active')">
        <div class="pool-stat-icon" style="background:linear-gradient(135deg,#67C23A,#27AE60)"><span>✅</span></div>
        <div class="pool-stat-info">
          <span class="pool-stat-num">{{ summary.activeStudents }}</span>
          <span class="pool-stat-label">在读学员</span>
        </div>
      </div>
      <div class="pool-stat-card" :class="{ active: activeTab === 'inactive' }" @click="switchTab('inactive')">
        <div class="pool-stat-icon" style="background:linear-gradient(135deg,#909399,#b0b0b0)"><span>⏸</span></div>
        <div class="pool-stat-info">
          <span class="pool-stat-num">{{ summary.inactiveStudents }}</span>
          <span class="pool-stat-label">停课学员</span>
        </div>
      </div>
    </div>

    <!-- 工具栏 -->
    <div class="page-toolbar">
      <div class="toolbar-left">
        <el-select v-if="isBoss" v-model="filters.storeId" placeholder="全部门店" clearable style="width:140px" @change="onFilterChange">
          <el-option v-for="s in stores" :key="s.id" :label="s.name" :value="s.id" />
        </el-select>
        <el-input v-model="filters.keyword" placeholder="姓名 / 手机号" clearable style="width:180px" @keyup.enter="onFilterChange" @clear="onFilterChange">
          <template #prefix><el-icon><Search /></el-icon></template>
        </el-input>
        <el-button type="primary" @click="onFilterChange"><el-icon><Search /></el-icon>&nbsp;查询</el-button>
        <el-button @click="resetFilters">重置</el-button>
      </div>
      <div class="toolbar-right" v-if="activeTab === 'all'">
        <span class="sort-label">排序</span>
        <el-select v-model="filters.sortBy" style="width:120px" @change="onFilterChange">
          <el-option label="缴费总额" value="totalPaid" />
          <el-option label="已消课时" value="totalConsumedLessons" />
          <el-option label="订单数" value="orderCount" />
          <el-option label="剩余课时" value="remainingLessons" />
          <el-option label="最近上课" value="lastLessonAt" />
        </el-select>
        <el-button-group>
          <el-button :type="filters.sortOrder==='desc'?'primary':''" size="small" @click="setSortOrder('desc')">降序</el-button>
          <el-button :type="filters.sortOrder==='asc'?'primary':''" size="small" @click="setSortOrder('asc')">升序</el-button>
        </el-button-group>
      </div>
    </div>

    <!-- 需约课学员提示条 -->
    <div v-if="activeTab === 'suggest-schedule'" class="alert-bar">
      <el-alert type="warning" :closable="false" show-icon>
        <span>以下学员超过 {{ needDays }} 天未上课且有剩余课时，建议尽快安排约课</span>
      </el-alert>
    </div>

    <!-- 主表格 -->
    <el-table
      v-if="activeTab !== 'suggest-schedule'"
      :data="tableData"
      v-loading="loading"
      stripe
      style="width:100%"
      :header-cell-style="{ background:'#f5f7fa', color:'#606266', fontWeight:600 }"
      @sort-change="onSortChange"
    >
      <el-table-column prop="name" label="姓名" min-width="100">
        <template #default="{row}">
          <div class="cell-person">
            <div class="cell-avatar" :style="{ background: avatarColor(row.id) }">{{ row.name?.charAt(0) || '?' }}</div>
            <span class="cell-name">{{ row.name }}</span>
          </div>
        </template>
      </el-table-column>
      <el-table-column prop="phone" label="手机号" width="130">
        <template #default="{row}"><span class="cell-phone">{{ row.phone || '-' }}</span></template>
      </el-table-column>
      <el-table-column v-if="isBoss" prop="storeName" label="门店" min-width="110">
        <template #default="{row}"><span class="cell-store">{{ row.storeName || '-' }}</span></template>
      </el-table-column>
      <el-table-column prop="coachName" label="教练" min-width="90">
        <template #default="{row}"><span class="cell-coach">{{ row.coachName || '-' }}</span></template>
      </el-table-column>
      <el-table-column prop="totalPaid" label="缴费总额" width="120" align="right" sortable="custom">
        <template #default="{row}"><span class="cell-money">¥{{ Number(row.totalPaid).toLocaleString() }}</span></template>
      </el-table-column>
      <el-table-column prop="orderCount" label="订单数" width="90" align="center" sortable="custom">
        <template #default="{row}"><span class="cell-num">{{ row.orderCount }}</span></template>
      </el-table-column>
      <el-table-column prop="totalConsumedLessons" label="已消课时" width="100" align="center" sortable="custom">
        <template #default="{row}"><span class="cell-num">{{ row.totalConsumedLessons }}</span></template>
      </el-table-column>
      <el-table-column prop="remainingLessons" label="剩余课时" width="100" align="center" sortable="custom">
        <template #default="{row}">
          <el-tag :type="row.remainingLessons > 10 ? 'success' : row.remainingLessons > 0 ? 'warning' : 'danger'" size="small" effect="plain" round>{{ row.remainingLessons }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="lastLessonAt" label="最近上课" width="160" align="center" sortable="custom">
        <template #default="{row}">
          <div class="cell-last-lesson">
            <span class="cell-date">{{ formatDate(row.lastLessonAt) }}</span>
            <span v-if="row.daysSinceLastLesson !== undefined && row.daysSinceLastLesson !== null" class="cell-days" :class="{ 'days-warn': row.daysSinceLastLesson >= 14, 'days-ok': row.daysSinceLastLesson < 7 }">
              {{ row.daysSinceLastLesson }}天前
            </span>
          </div>
        </template>
      </el-table-column>
      <el-table-column prop="status" label="状态" width="70" align="center">
        <template #default="{row}">
          <el-tag :type="row.status===1?'success':'info'" size="small" effect="plain" round>{{ row.status===1?'在读':'停课' }}</el-tag>
        </template>
      </el-table-column>
    </el-table>

    <!-- 需约课学员表格 -->
    <el-table
      v-else
      :data="needScheduleData"
      v-loading="loading"
      stripe
      style="width:100%"
      :header-cell-style="{ background:'#f5f7fa', color:'#606266', fontWeight:600 }"
    >
      <el-table-column prop="name" label="姓名" min-width="100">
        <template #default="{row}">
          <div class="cell-person">
            <div class="cell-avatar" :style="{ background: avatarColor(row.id) }">{{ row.name?.charAt(0) || '?' }}</div>
            <span class="cell-name">{{ row.name }}</span>
          </div>
        </template>
      </el-table-column>
      <el-table-column prop="phone" label="手机号" width="130">
        <template #default="{row}"><span class="cell-phone">{{ row.phone || '-' }}</span></template>
      </el-table-column>
      <el-table-column v-if="isBoss" prop="storeName" label="门店" min-width="110" />
      <el-table-column prop="coachName" label="教练" min-width="90">
        <template #default="{row}">{{ row.coachName || '-' }}</template>
      </el-table-column>
      <el-table-column prop="remainingLessons" label="剩余课时" width="100" align="center">
        <template #default="{row}">
          <el-tag :type="row.remainingLessons > 10 ? 'success' : 'warning'" size="small" effect="plain" round>{{ row.remainingLessons }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="totalPaid" label="缴费总额" width="120" align="right">
        <template #default="{row}"><span class="cell-money">¥{{ Number(row.totalPaid).toLocaleString() }}</span></template>
      </el-table-column>
      <el-table-column prop="totalConsumedLessons" label="已消课时" width="100" align="center">
        <template #default="{row}"><span class="cell-num">{{ row.totalConsumedLessons }}</span></template>
      </el-table-column>
      <el-table-column prop="lastLessonAt" label="最近上课" width="180" align="center">
        <template #default="{row}">
          <div class="cell-last-lesson">
            <span class="cell-date">{{ row.lastLessonAt ? formatDate(row.lastLessonAt) : '从未上课' }}</span>
            <span v-if="row.lastLessonAt" class="cell-days days-warn">
              {{ calcDays(row.lastLessonAt) }}天前
            </span>
            <span v-else class="cell-days days-danger">需安排</span>
          </div>
        </template>
      </el-table-column>
      <el-table-column label="操作" width="100" align="center" fixed="right">
        <template #default="{row}">
          <el-button type="primary" size="small" plain @click="goSchedule(row)">去约课</el-button>
        </template>
      </el-table-column>
    </el-table>

    <el-pagination
      v-if="activeTab !== 'suggest-schedule'"
      v-model:current-page="page.current"
      v-model:page-size="page.size"
      :total="page.total"
      :page-sizes="[10, 20, 50]"
      layout="total, sizes, prev, pager, next"
      @current-change="loadData"
      @size-change="onSizeChange"
      style="margin-top:16px;justify-content:flex-end"
    />
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { Search } from '@element-plus/icons-vue'
import api from '../api'

const router = useRouter()
const userInfo = JSON.parse(localStorage.getItem('userInfo') || '{}')
const isBoss = computed(() => userInfo.role === 'boss')

const loading = ref(false)
const tableData = ref([])
const needScheduleData = ref([])
const stores = ref([])
const activeTab = ref('all')
const needDays = ref(14)

const summary = reactive({ totalStudents: 0, needSchedule: 0, activeStudents: 0, inactiveStudents: 0 })

const page = reactive({ current: 1, size: 20, total: 0 })
const filters = reactive({
  keyword: '',
  storeId: null,
  sortBy: 'totalPaid',
  sortOrder: 'desc'
})

const palette = [
  'linear-gradient(135deg,#a8e6cf,#88d8a8)',
  'linear-gradient(135deg,#ffd3b6,#ffaaa5)',
  'linear-gradient(135deg,#a0e7e5,#7fd8d5)',
  'linear-gradient(135deg,#b4f8c8,#90e0a8)',
  'linear-gradient(135deg,#fbe7c6,#f5d99a)',
  'linear-gradient(135deg,#fcbad3,#f8a0c0)',
  'linear-gradient(135deg,#c7ceea,#a5b4d8)',
  'linear-gradient(135deg,#caffbf,#a8e6a0)'
]
const avatarColor = (id) => palette[(id || 0) % palette.length]

const formatDate = (dt) => {
  if (!dt) return '-'
  try {
    const d = typeof dt === 'string' ? new Date(dt.replace(' ', 'T')) : new Date(dt)
    const mm = String(d.getMonth() + 1).padStart(2, '0')
    const dd = String(d.getDate()).padStart(2, '0')
    const hh = String(d.getHours()).padStart(2, '0')
    const mi = String(d.getMinutes()).padStart(2, '0')
    return `${mm}/${dd} ${hh}:${mi}`
  } catch { return '-' }
}

const calcDays = (dt) => {
  if (!dt) return 0
  try {
    const d = typeof dt === 'string' ? new Date(dt.replace(' ', 'T')) : new Date(dt)
    return Math.floor((Date.now() - d.getTime()) / (24 * 60 * 60 * 1000))
  } catch { return 0 }
}

const loadData = async () => {
  loading.value = true
  try {
    const params = {
      current: page.current,
      size: page.size,
      sortBy: filters.sortBy,
      sortOrder: filters.sortOrder,
      keyword: filters.keyword || undefined,
      storeId: isBoss.value ? (filters.storeId || undefined) : userInfo.storeId
    }
    const res = await api.get('/customer-pool', { params })
    let records = res.data.records || []
    // 过滤 Tab
    if (activeTab.value === 'active') {
      records = records.filter(r => r.status === 1)
    } else if (activeTab.value === 'inactive') {
      records = records.filter(r => r.status === 0)
    }
    tableData.value = records
    page.total = res.data.total
    loadSummary()
  } finally { loading.value = false }
}

const loadNeedSchedule = async () => {
  loading.value = true
  try {
    const params = { days: needDays.value }
    if (isBoss.value && filters.storeId) params.storeId = filters.storeId
    if (!isBoss.value) params.storeId = userInfo.storeId
    const res = await api.get('/customer-pool/suggest-schedule', { params })
    needScheduleData.value = res.data || []
  } finally { loading.value = false }
}

const loadSummary = async () => {
  try {
    const params = { size: 9999 }
    if (isBoss.value && filters.storeId) params.storeId = filters.storeId
    if (!isBoss.value) params.storeId = userInfo.storeId
    const res = await api.get('/customer-pool', { params })
    const all = res.data.records || []
    summary.totalStudents = res.data.total
    summary.activeStudents = all.filter(s => s.status === 1).length
    summary.inactiveStudents = all.filter(s => s.status === 0).length

    // 需约课数
    const ns = await api.get('/customer-pool/suggest-schedule', {
      params: { days: needDays.value, storeId: isBoss.value ? (filters.storeId || undefined) : userInfo.storeId }
    })
    summary.needSchedule = (ns.data || []).length
  } catch {}
}

const loadStores = async () => {
  try {
    const r = await api.get('/stores', { params: { size: 999 } })
    stores.value = r.data.records || []
  } catch {}
}

const switchTab = (tab) => {
  activeTab.value = tab
  if (tab === 'suggest-schedule') {
    loadNeedSchedule()
  } else {
    loadData()
  }
}

const onFilterChange = () => {
  page.current = 1
  if (activeTab.value === 'suggest-schedule') {
    loadNeedSchedule()
  } else {
    loadData()
  }
}

const onSizeChange = (size) => {
  page.size = size
  page.current = 1
  loadData()
}

const onSortChange = ({ prop, order }) => {
  if (prop) {
    filters.sortBy = prop
    filters.sortOrder = order === 'ascending' ? 'asc' : 'desc'
    loadData()
  }
}

const setSortOrder = (dir) => {
  filters.sortOrder = dir
  loadData()
}

const resetFilters = () => {
  filters.keyword = ''
  filters.storeId = null
  filters.sortBy = 'totalPaid'
  filters.sortOrder = 'desc'
  page.current = 1
  onFilterChange()
}

const goSchedule = (row) => {
  router.push('/schedule')
}

onMounted(async () => {
  if (!isBoss.value) {
    filters.storeId = userInfo.storeId
  }
  await loadStores()
  loadData()
})
</script>

<style scoped>
.customer-pool-page { padding: 20px 24px; }

/* ===== 统计卡片 ===== */
.pool-stats {
  display: flex;
  gap: 12px;
  margin-bottom: 16px;
  flex-wrap: wrap;
}
.pool-stat-card {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 16px;
  background: #fff;
  border-radius: 10px;
  border: 1px solid #ebeef5;
  cursor: pointer;
  transition: all 0.2s;
  min-width: 120px;
}
.pool-stat-card:hover {
  border-color: #c0c4cc;
  box-shadow: 0 2px 8px rgba(0,0,0,0.08);
}
.pool-stat-card.active {
  border-color: #409EFF;
  background: linear-gradient(135deg, #ecf5ff, #f0f9ff);
  box-shadow: 0 2px 12px rgba(64,158,255,0.15);
}
.pool-stat-icon {
  width: 36px;
  height: 36px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  flex-shrink: 0;
}
.pool-stat-info {
  display: flex;
  flex-direction: column;
  line-height: 1.2;
}
.pool-stat-num {
  font-size: 20px;
  font-weight: 800;
  color: #303133;
}
.pool-stat-label {
  font-size: 12px;
  color: #909399;
  margin-top: 2px;
}

/* ===== 工具栏 ===== */
.toolbar-right {
  display: flex;
  align-items: center;
  gap: 8px;
}
.sort-label {
  font-size: 13px;
  color: #909399;
  font-weight: 500;
  white-space: nowrap;
}

/* ===== 提示条 ===== */
.alert-bar {
  margin-bottom: 12px;
}

/* ===== 表格单元格 ===== */
.cell-person {
  display: flex;
  align-items: center;
  gap: 8px;
}
.cell-avatar {
  width: 30px;
  height: 30px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-size: 13px;
  font-weight: 700;
  flex-shrink: 0;
}
.cell-name {
  font-weight: 600;
  color: #303133;
  font-size: 14px;
}
.cell-phone {
  font-size: 13px;
  color: #606266;
}
.cell-store {
  font-size: 13px;
  color: #606266;
}
.cell-coach {
  font-size: 13px;
  color: #606266;
}
.cell-money {
  font-weight: 700;
  color: #F56C6C;
  font-size: 14px;
}
.cell-num {
  font-size: 14px;
  font-weight: 600;
  color: #303133;
}
.cell-last-lesson {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
}
.cell-date {
  font-size: 13px;
  color: #606266;
}
.cell-days {
  font-size: 11px;
  padding: 1px 6px;
  border-radius: 4px;
}
.days-ok {
  color: #67C23A;
  background: #f0f9eb;
}
.days-warn {
  color: #E6A23C;
  background: #fdf6ec;
}
.days-danger {
  color: #F56C6C;
  background: #fef0f0;
}
</style>
