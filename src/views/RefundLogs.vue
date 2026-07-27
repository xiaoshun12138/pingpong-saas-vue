<template>
  <div class="page-card">
    <div class="page-toolbar">
      <div class="toolbar-left">
        <el-select v-if="isBoss" v-model="filterStoreId" placeholder="全部门店" clearable style="width:160px" @change="onFilterChange">
          <el-option v-for="s in stores" :key="s.id" :label="s.name" :value="s.id" />
        </el-select>
        <el-input v-model="filters.keyword" placeholder="学员 / 订单编号" clearable style="width:200px" @keyup.enter="loadData">
          <template #prefix><el-icon><Search /></el-icon></template>
        </el-input>
        <el-button type="primary" @click="loadData">查询</el-button>
      </div>
      <el-button type="primary" @click="openDialog()"><el-icon><Plus /></el-icon>&nbsp;新增退款</el-button>
    </div>
    <el-table :data="tableData" v-loading="loading" stripe>
      <el-table-column prop="id" label="ID" min-width="70" />
      <el-table-column prop="orderNo" label="订单编号" min-width="160" show-overflow-tooltip />
      <el-table-column v-if="isBoss" prop="storeName" label="门店" min-width="100" />
      <el-table-column prop="studentName" label="学员" min-width="90" />
      <el-table-column prop="refundAmount" label="退款金额" width="100" align="right">
        <template #default="{row}">
          <span v-if="row.refundAmount > 0" style="color:#F56C6C;font-weight:bold">-¥{{ Number(row.refundAmount).toFixed(2) }}</span>
          <span v-else>¥0.00</span>
        </template>
      </el-table-column>
      <el-table-column prop="refundLessons" label="退回课时" width="80" align="center" />
      <el-table-column prop="reason" label="退款原因" min-width="120" show-overflow-tooltip />
      <el-table-column prop="operatorName" label="操作人" min-width="90" />
      <el-table-column prop="createdAt" label="退款时间" width="160" align="center" />
      <el-table-column label="操作" width="80" fixed="right" align="center">
        <template #default="{row}">
          <el-tooltip content="编辑退款原因" placement="top"><el-button link type="primary" :icon="Edit" @click="openDialog(row)" /></el-tooltip>
        </template>
      </el-table-column>
    </el-table>
    <el-pagination v-model:current-page="page.current" v-model:page-size="page.size" :total="page.total" layout="total, prev, pager, next" @current-change="loadData" style="margin-top:16px;justify-content:flex-end" />
    <el-dialog v-model="dialogVisible" :title="form.id?'编辑退款原因':'新增退款'" width="500px" class="nice-dialog">
      <el-alert title="退款将清零订单剩余课时，此操作不可逆" type="warning" :closable="false" style="margin-bottom:16px" />
      <el-alert title="退款金额由系统按「实付金额 × (退回课时 ÷ 订单总课时)」自动计算" type="info" :closable="false" style="margin-bottom:12px" />
      <el-form :model="form" label-width="90px">
        <el-form-item label="订单ID" required><el-input-number v-model="form.courseOrderId" :min="1" :disabled="!!form.id" /></el-form-item>
        <el-form-item label="学员ID" required><el-input-number v-model="form.studentId" :min="1" :disabled="!!form.id" /></el-form-item>
        <el-form-item label="退回课时" required><el-input-number v-model="form.refundLessons" :min="1" :disabled="!!form.id" /></el-form-item>
        <el-form-item label="退款原因"><el-input v-model="form.reason" type="textarea" /></el-form-item>
        <el-form-item label="操作人ID" required>
          <el-input-number v-model="form.operatorId" :min="1" v-if="isBoss" />
          <span v-else>{{ myStaffId }}（当前用户）</span>
        </el-form-item>
      </el-form>
      <template #footer><el-button @click="dialogVisible=false">取消</el-button><el-button :type="form.id?'primary':'danger'" @click="handleSave" :loading="saving">{{ form.id ? '保存' : '确认退款' }}</el-button></template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Edit } from '@element-plus/icons-vue'
import api from '../api'

const userInfo = JSON.parse(localStorage.getItem('userInfo') || '{}')
const isBoss = computed(() => userInfo.role === 'boss')
const myStaffId = computed(() => userInfo.staffId)

const tableData = ref([]), loading = ref(false), saving = ref(false), dialogVisible = ref(false)
const stores = ref([])
const filterStoreId = ref(null)
const page = reactive({ current: 1, size: 10, total: 0 })
const filters = reactive({ keyword: '' })
const form = reactive({ id: null, courseOrderId: 1, studentId: 1, refundLessons: 1, reason: '', operatorId: 1 })

const loadStores = async () => {
  try { const r = await api.get('/stores', { params: { size: 999 } }); stores.value = r.data.records } catch {}
}
const loadData = async () => {
  loading.value = true
  try {
    const res = await api.get('/refund-logs', { params: { current: page.current, size: page.size, storeId: filterStoreId.value || undefined, keyword: filters.keyword || undefined } })
    const records = res.data.records
    if (stores.value.length > 0) {
      const smap = Object.fromEntries(stores.value.map(s => [s.id, s.name]))
      records.forEach(r => r.storeName = smap[r.storeId] || '-')
    }
    tableData.value = records; page.total = res.data.total
  } finally { loading.value = false }
}
const openDialog = (row) => {
  if (row) {
    // 编辑模式：只允许修改退款原因，其他字段只读
    Object.assign(form, { id: row.id, courseOrderId: row.courseOrderId, studentId: row.studentId, refundLessons: row.refundLessons, reason: row.reason || '', operatorId: row.operatorId })
  } else {
    Object.assign(form, { id: null, courseOrderId: 1, studentId: 1, refundLessons: 1, reason: '', operatorId: myStaffId.value || 1 })
  }
  dialogVisible.value = true
}
const onFilterChange = () => { page.current = 1; loadData() }
const handleSave = async () => {
  if (!isBoss.value) form.operatorId = myStaffId.value
  saving.value = true
  try {
    if (form.id) {
      await api.put('/refund-logs', form)
    } else {
      await api.post('/refund-logs', form)
    }
    ElMessage.success('保存成功'); dialogVisible.value = false; loadData()
  } finally { saving.value = false }
}
const handleDelete = (row) => {
  ElMessage.warning('退款记录不允许删除，退款是财务凭证只增不删')
}
onMounted(async () => { await loadStores(); loadData() })
</script>

<style scoped>
.toolbar-left { display: flex; gap: 8px; align-items: center; }
</style>
