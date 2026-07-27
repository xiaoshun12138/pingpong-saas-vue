<template>
  <div class="page-card">
    <div class="page-toolbar">
      <div class="toolbar-left">
        <el-select v-model="filterStoreId" placeholder="所有门店" clearable style="width:160px" @change="onFilterChange">
          <el-option label="所有门店" :value="null" />
          <el-option v-for="s in stores" :key="s.id" :label="s.name" :value="s.id" />
        </el-select>
        <el-select v-model="sortBy" style="width:160px;margin-left:8px" @change="onFilterChange">
          <el-option label="按消课课时排序" value="lessons" />
          <el-option label="按消课金额排序" value="amount" />
        </el-select>
        <el-tooltip :content="displayAsc ? '当前升序，点击切换降序' : '当前降序，点击切换升序'" placement="top">
          <el-button :icon="displayAsc ? Top : Bottom" circle size="small" style="margin-left:8px;transition:transform 0.2s" @click="toggleOrder" />
        </el-tooltip>
      </div>
      <div class="toolbar-right">
        <el-statistic title="本月消课课时" :value="summary.lessons" />
        <el-statistic title="本月消课金额" :value="summary.amount" prefix="¥" style="margin-left:24px" />
      </div>
    </div>
    <el-table :data="tableData" v-loading="loading" stripe>
      <el-table-column prop="rank" label="排名" width="70" align="center">
        <template #default="{row}">
          <el-tag v-if="row.rank <= 3" :type="row.rank === 1 ? 'danger' : row.rank === 2 ? 'warning' : 'success'" size="small" effect="dark">{{ row.rank }}</el-tag>
          <span v-else>{{ row.rank }}</span>
        </template>
      </el-table-column>
      <el-table-column prop="staffName" label="教练" min-width="120" />
      <el-table-column v-if="isBoss" prop="storeName" label="门店" min-width="120" />
      <el-table-column prop="value" label="消课课时" width="110" align="center">
        <template #default="{row}"><span style="font-weight:600;color:#409EFF">{{ row.value }}</span></template>
      </el-table-column>
      <el-table-column prop="lessonAmount" label="消课金额" width="130" align="right">
        <template #default="{row}"><span style="font-weight:600;color:#F56C6C">¥{{ Number(row.lessonAmount || 0).toFixed(2) }}</span></template>
      </el-table-column>
      <el-table-column prop="count" label="消课次数" width="90" align="center" />
    </el-table>
    <el-pagination v-model:current-page="page.current" v-model:page-size="page.size" :total="page.total" layout="total, prev, pager, next" @current-change="loadData" style="margin-top:16px;justify-content:flex-end" />
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { Top, Bottom } from '@element-plus/icons-vue'
import api from '../api'

const userInfo = JSON.parse(localStorage.getItem('userInfo') || '{}')
const isBoss = computed(() => userInfo.role === 'boss')
const myStoreId = computed(() => userInfo.storeId)

const tableData = ref([])
const loading = ref(false)
const stores = ref([])
const filterStoreId = ref(null)
const sortBy = ref('lessons')
const asc = ref(false)
const displayAsc = ref(false) // 用于按钮图标显示，延迟更新避免抖动
const page = reactive({ current: 1, size: 10, total: 0 })
const summary = reactive({ lessons: 0, amount: 0 })

const toggleOrder = () => {
  asc.value = !asc.value
  tableData.value = [] // 立即清空，避免新旧数据共存闪烁
  onFilterChange()
}

const updateDisplayAsc = () => {
  displayAsc.value = asc.value
}

const onFilterChange = () => {
  page.current = 1
  tableData.value = [] // 立即清空，避免新旧数据共存闪烁
  loadData()
}

const loadData = async () => {
  loading.value = true
  try {
    const params = { current: page.current, size: page.size, sortBy: sortBy.value, asc: asc.value }
    const sid = isBoss.value ? filterStoreId.value : myStoreId.value
    if (sid != null) params.storeId = sid

    const res = await api.get('/ranking/lesson', { params })
    tableData.value = res.data.records || []
    page.total = res.data.total || 0

    const all = res.data.records || []
    summary.lessons = all.reduce((sum, r) => sum + Number(r.value || 0), 0)
    summary.amount = all.reduce((sum, r) => sum + Number(r.lessonAmount || 0), 0)

    // 数据加载完成后再更新按钮图标方向，避免抖动
    updateDisplayAsc()
  } finally {
    loading.value = false
  }
}

const loadStores = async () => {
  if (!isBoss.value) return
  const res = await api.get('/stores', { params: { page: 1, size: 100 } })
  // /stores 返回分页格式 { records: [...] }
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
  color: #409EFF;
}
:deep(.el-statistic__title) {
  font-size: 12px;
  color: #909399;
}
</style>
