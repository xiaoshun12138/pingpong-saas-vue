<template>
  <div class="page-card">
    <div class="page-toolbar">
      <div class="toolbar-left">
        <el-radio-group v-model="viewMode" size="small" @change="onModeChange">
          <el-radio-button label="performance">业绩排名</el-radio-button>
          <el-radio-button label="lesson">课消排名</el-radio-button>
        </el-radio-group>
      </div>
    </div>
    <el-table :data="tableData" v-loading="loading" stripe>
      <el-table-column prop="rank" label="排名" width="70" align="center">
        <template #default="{row}">
          <el-tag v-if="row.rank <= 3" :type="row.rank === 1 ? 'danger' : row.rank === 2 ? 'warning' : 'success'" size="small" effect="dark">{{ row.rank }}</el-tag>
          <span v-else>{{ row.rank }}</span>
        </template>
      </el-table-column>
      <el-table-column prop="storeName" label="门店" min-width="120" />
      <!-- 业绩排名模式 -->
      <el-table-column v-if="viewMode === 'performance'" prop="salesAmount" label="销售额" width="130" align="right">
        <template #default="{row}"><span style="font-weight:600;color:#F56C6C">¥{{ Number(row.salesAmount || 0).toFixed(2) }}</span></template>
      </el-table-column>
      <el-table-column v-if="viewMode === 'performance'" prop="orderCount" label="订单数" width="90" align="center" />
      <el-table-column v-if="viewMode === 'performance'" prop="lessonsConsumed" label="消课课时" width="110" align="center">
        <template #default="{row}"><span style="color:#409EFF">{{ row.lessonsConsumed || 0 }}</span></template>
      </el-table-column>
      <!-- 课消排名模式 -->
      <el-table-column v-if="viewMode === 'lesson'" prop="lessonAmount" label="消课金额" width="140" align="right">
        <template #default="{row}"><span style="font-weight:600;color:#F56C6C">¥{{ Number(row.lessonAmount || 0).toFixed(2) }}</span></template>
      </el-table-column>
      <el-table-column v-if="viewMode === 'lesson'" prop="lessonsConsumed" label="消课课时" width="110" align="center">
        <template #default="{row}"><span style="font-weight:600;color:#409EFF">{{ row.lessonsConsumed || 0 }}</span></template>
      </el-table-column>
      <el-table-column v-if="viewMode === 'lesson'" prop="lessonCount" label="消课次数" width="100" align="center" />
    </el-table>
    <el-pagination v-model:current-page="page.current" v-model:page-size="page.size" :total="page.total" layout="total, prev, pager, next" @current-change="loadData" style="margin-top:16px;justify-content:flex-end" />
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import api from '../api'

const tableData = ref([])
const loading = ref(false)
const viewMode = ref('performance')
const page = reactive({ current: 1, size: 10, total: 0 })

const onModeChange = () => {
  page.current = 1
  loadData()
}

const loadData = async () => {
  loading.value = true
  try {
    const params = { current: page.current, size: page.size }
    const url = viewMode.value === 'lesson' ? '/ranking/store-lesson' : '/ranking/store-performance'
    const res = await api.get(url, { params })
    tableData.value = res.data.records || []
    page.total = res.data.total || 0
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  loadData()
})
</script>
