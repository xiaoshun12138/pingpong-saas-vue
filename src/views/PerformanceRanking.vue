<template>
  <div class="page-card">
    <div class="page-toolbar">
      <div class="toolbar-left">
        <el-select v-if="isBoss" v-model="filterStoreId" placeholder="所有门店" clearable style="width:160px" @change="onFilterChange">
          <el-option label="所有门店" :value="null" />
          <el-option v-for="s in stores" :key="s.id" :label="s.name" :value="s.id" />
        </el-select>
        <el-radio-group v-model="filterType" size="small" style="margin-left:12px" @change="onFilterChange">
          <el-radio-button label="all">所有员工</el-radio-button>
          <el-radio-button label="coach">教练</el-radio-button>
          <el-radio-button label="sales">销售</el-radio-button>
        </el-radio-group>
        <el-select v-model="sortBy" style="width:160px;margin-left:8px" @change="onFilterChange">
          <el-option label="按业绩金额排序" value="amount" />
          <el-option label="按订单数排序" value="count" />
        </el-select>
        <el-tooltip :content="displayAsc ? '当前升序，点击切换降序' : '当前降序，点击切换升序'" placement="top">
          <el-button :icon="displayAsc ? Top : Bottom" circle size="small" style="margin-left:8px;transition:transform 0.2s" @click="toggleOrder" />
        </el-tooltip>
        <el-input v-model="filters.keyword" placeholder="员工姓名" clearable style="width:160px;margin-left:8px" @keyup.enter="loadData">
          <template #prefix><el-icon><Search /></el-icon></template>
        </el-input>
        <el-button type="primary" @click="loadData">查询</el-button>
      </div>
      <div class="toolbar-right">
        <el-statistic title="本月业绩总额" :value="summary.amount" prefix="¥" />
        <el-statistic title="本月订单总数" :value="summary.orders" style="margin-left:24px" />
      </div>
    </div>
    <el-table :data="tableData" empty-text="暂无数据" v-loading="loading" stripe>
      <el-table-column prop="rank" label="排名" width="70" align="center">
        <template #default="{row}">
          <el-tag v-if="row.rank <= 3" :type="row.rank === 1 ? 'danger' : row.rank === 2 ? 'warning' : 'success'" size="small" effect="dark">{{ row.rank }}</el-tag>
          <span v-else>{{ row.rank }}</span>
        </template>
      </el-table-column>
      <el-table-column prop="staffName" label="员工" min-width="100" />
      <el-table-column v-if="isBoss" prop="storeName" label="门店" min-width="120" />
      <el-table-column prop="roleLabel" label="角色" width="80" align="center">
        <template #default="{row}"><el-tag :type="row.roleLabel === '教练' ? 'success' : 'primary'" size="small">{{ row.roleLabel }}</el-tag></template>
      </el-table-column>
      <el-table-column prop="value" label="业绩金额" width="130" align="right">
        <template #default="{row}"><span style="font-weight:600;color:#F56C6C">¥{{ Number(row.value).toFixed(2) }}</span></template>
      </el-table-column>
      <el-table-column prop="count" label="订单数" width="80" align="center" />
    </el-table>
    <el-pagination v-model:current-page="page.current" v-model:page-size="page.size" :total="page.total" :page-sizes="[10,20,50]" layout="total, sizes, prev, pager, next" @size-change="onSizeChange" @current-change="loadData" style="margin-top:16px;justify-content:flex-end" />
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { Top, Bottom, Search } from '@element-plus/icons-vue'
import api from '../api'

const userInfo = JSON.parse(localStorage.getItem('userInfo') || '{}')
const isBoss = computed(() => userInfo.role === 'boss')
const myStoreId = computed(() => userInfo.storeId)

const tableData = ref([])
const loading = ref(false)
const stores = ref([])
const filterType = ref('all')
const filterStoreId = ref(null)
const filters = reactive({ keyword: '' })
const sortBy = ref('amount')
const asc = ref(false)
const displayAsc = ref(false) // 用于按钮图标显示，延迟更新避免抖动
const page = reactive({ current: 1, size: 10, total: 0 })
const summary = reactive({ amount: 0, orders: 0 })

const toggleOrder = () => {
  asc.value = !asc.value
  tableData.value = [] // 立即清空，避免新旧数据共存闪烁
  onFilterChange()
}

const updateDisplayAsc = () => {
  displayAsc.value = asc.value
}

const onSizeChange = (s) => { page.size = s; page.current = 1; loadData() }
const onFilterChange = () => {
  page.current = 1
  tableData.value = [] // 立即清空，避免新旧数据共存闪烁
  loadData()
}

const loadData = async () => {
  loading.value = true
  try {
    const params = { current: page.current, size: page.size, type: filterType.value, sortBy: sortBy.value, asc: asc.value, keyword: filters.keyword || undefined }
    const sid = isBoss.value ? filterStoreId.value : myStoreId.value
    if (sid != null) params.storeId = sid

    const res = await api.get('/ranking/performance', { params })
    tableData.value = res.data.records || []
    page.total = res.data.total || 0

    const all = res.data.records || []
    summary.amount = all.reduce((sum, r) => sum + Number(r.value || 0), 0)
    summary.orders = all.reduce((sum, r) => sum + Number(r.count || 0), 0)

    // 数据加载完成后再更新按钮图标方向，避免抖动
    updateDisplayAsc()
  } finally {
    loading.value = false
  }
}

const loadStores = async () => {
  if (!isBoss.value) return
  const res = await api.get('/stores', { params: { page: 1, size: 100 } })
  stores.value = res.data?.records || res.data || []
}

onMounted(() => {
  displayAsc.value = asc.value
  loadStores()
  loadData()
})
</script>

<style scoped>
.toolbar-right {
  display: flex;
  align-items: center;
}
:deep(.el-statistic__content) {
  font-size: 20px;
  font-weight: 600;
  color: #F56C6C;
}
:deep(.el-statistic__title) {
  font-size: 12px;
  color: #909399;
}
</style>
