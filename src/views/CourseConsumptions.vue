<template>
  <div class="page-card">
    <div class="page-toolbar">
      <div class="toolbar-left">
        <el-select v-if="isBoss" v-model="filterStoreId" placeholder="全部门店" clearable style="width:160px" @change="onFilterChange">
          <el-option v-for="s in stores" :key="s.id" :label="s.name" :value="s.id" />
        </el-select>
        <el-input v-model="filters.keyword" placeholder="学员 / 教练 / 订单" clearable style="width:200px" @keyup.enter="loadData">
          <template #prefix><el-icon><Search /></el-icon></template>
        </el-input>
        <el-button type="primary" @click="loadData">查询</el-button>
      </div>
      <el-button type="primary" @click="openDialog()"><el-icon><Plus /></el-icon>&nbsp;新增消课</el-button>
    </div>
    <el-table :data="tableData" v-loading="loading" stripe>
      <el-table-column prop="id" label="ID" min-width="70" />
      <el-table-column v-if="isBoss" prop="storeName" label="门店" min-width="100" />
      <el-table-column prop="studentName" label="学员" min-width="90" />
      <el-table-column prop="coachName" label="教练" min-width="90" />
      <el-table-column prop="orderNo" label="订单编号" min-width="160" show-overflow-tooltip />
      <el-table-column prop="lessons" label="消课课时" width="80" align="center" />
      <el-table-column prop="recordDate" label="上课日期" width="110" align="center" />
      <el-table-column prop="recordTime" label="上课时间" width="90" align="center" />
      <el-table-column prop="remark" label="备注" min-width="120" show-overflow-tooltip />
      <el-table-column label="操作" width="100" fixed="right" align="center">
        <template #default="{row}">
          <el-tooltip content="编辑" placement="top"><el-button link type="primary" :icon="Edit" @click="openDialog(row)" /></el-tooltip>
          <el-tooltip content="删除" placement="top"><el-button link type="danger" :icon="Delete" @click="handleDelete(row)" /></el-tooltip>
        </template>
      </el-table-column>
    </el-table>
    <el-pagination v-model:current-page="page.current" v-model:page-size="page.size" :total="page.total" layout="total, prev, pager, next" @current-change="loadData" style="margin-top:16px;justify-content:flex-end" />
    <el-dialog v-model="dialogVisible" :title="form.id?'编辑消课（仅可修改备注/日期）':'新增消课'" width="500px">
      <el-alert v-if="!form.id" title="门店信息将根据订单自动填写，无需手动选择" type="info" :closable="false" style="margin-bottom:12px" />
      <el-form :model="form" label-width="90px">
        <el-form-item label="学员" required>
          <el-select v-model="form.studentId" placeholder="选择学员" style="width:100%" filterable @change="loadStudentOrders">
            <el-option v-for="s in students" :key="s.id" :label="s.name" :value="s.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="教练" required>
          <el-select v-model="form.coachId" placeholder="选择教练" style="width:100%">
            <el-option v-for="c in coaches" :key="c.id" :label="c.name" :value="c.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="订单" required>
          <el-select v-model="form.courseOrderId" placeholder="选择订单" style="width:100%" filterable>
            <el-option v-for="o in studentOrders" :key="o.id" :label="`${o.orderNo} 余${o.remainingLessons}课时`" :value="o.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="消课课时" required><el-input-number v-model="form.lessons" :min="1" /></el-form-item>
        <el-form-item label="上课日期"><el-date-picker v-model="form.recordDate" type="date" value-format="YYYY-MM-DD" /></el-form-item>
        <el-form-item label="上课时间"><el-time-picker v-model="form.recordTime" format="HH:mm:ss" value-format="HH:mm:ss" /></el-form-item>
        <el-form-item label="备注"><el-input v-model="form.remark" type="textarea" /></el-form-item>
      </el-form>
      <template #footer><el-button @click="dialogVisible=false">取消</el-button><el-button type="primary" @click="handleSave" :loading="saving">保存</el-button></template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Edit, Delete } from '@element-plus/icons-vue'
import api from '../api'

const userInfo = JSON.parse(localStorage.getItem('userInfo') || '{}')
const isBoss = computed(() => userInfo.role === 'boss')
const myStoreId = computed(() => userInfo.storeId)

const tableData = ref([]), loading = ref(false), saving = ref(false), dialogVisible = ref(false)
const stores = ref([]), coaches = ref([]), students = ref([]), studentOrders = ref([])
const filterStoreId = ref(null)
const page = reactive({ current: 1, size: 10, total: 0 })
const today = new Date().toISOString().slice(0, 10)
const filters = reactive({ keyword: '' })
const form = reactive({ id: null, studentId: null, coachId: null, courseOrderId: null, lessons: 1, recordDate: today, recordTime: '14:00:00', remark: '' })

const loadRefs = async () => {
  try {
    const [sr, er, str] = await Promise.all([
      api.get('/stores', { params: { size: 999 } }),
      api.get('/staff', { params: { role: 'coach', storeId: isBoss.value ? undefined : myStoreId.value, size: 999 } }),
      api.get('/students', { params: { storeId: isBoss.value ? undefined : myStoreId.value, size: 9999 } })
    ])
    stores.value = sr.data.records; coaches.value = er.data.records; students.value = str.data.records
  } catch {}
}
const loadStudentOrders = async (studentId) => {
  if (!studentId) { studentOrders.value = []; return }
  try {
    const r = await api.get('/course-orders', { params: { studentId, status: 'active', size: 999 } })
    studentOrders.value = r.data.records || []
  } catch { studentOrders.value = [] }
}
const loadData = async () => {
  loading.value = true
  try {
    const res = await api.get('/course-consumptions', { params: { current: page.current, size: page.size, storeId: filterStoreId.value || undefined, keyword: filters.keyword || undefined } })
    const records = res.data.records
    if (stores.value.length > 0) {
      const smap = Object.fromEntries(stores.value.map(s => [s.id, s.name]))
      records.forEach(r => r.storeName = smap[r.storeId] || '-')
    }
    if (coaches.value.length > 0) {
      const cmap = Object.fromEntries(coaches.value.map(c => [c.id, c.name]))
      records.forEach(r => r.coachName = cmap[r.coachId] || `教练${r.coachId}`)
    }
    tableData.value = records; page.total = res.data.total
  } finally { loading.value = false }
}
const openDialog = (row) => {
  if (row) {
    // 编辑模式：只允许修改备注、日期、时间
    Object.assign(form, {
      id: row.id, studentId: row.studentId, coachId: row.coachId,
      courseOrderId: row.courseOrderId, lessons: row.lessons,
      recordDate: row.recordDate, recordTime: row.recordTime, remark: row.remark
    })
    loadStudentOrders(row.studentId)
  } else {
    const def = { id: null, studentId: null, coachId: coaches.value[0]?.id || null, courseOrderId: null, lessons: 1, recordDate: today, recordTime: '14:00:00', remark: '' }
    Object.assign(form, def)
    studentOrders.value = []
  }
  dialogVisible.value = true
}
const handleSave = async () => {
  saving.value = true
  try {
    if (form.id) {
      // 编辑只传可修改字段
      await api.put('/course-consumptions', {
        id: form.id, remark: form.remark, recordDate: form.recordDate, recordTime: form.recordTime
      })
    } else {
      await api.post('/course-consumptions', form)
    }
    ElMessage.success('保存成功'); dialogVisible.value = false; loadData()
  } finally { saving.value = false }
}
const handleDelete = (row) => {
  ElMessageBox.confirm('确认删除此消课记录？', '提示', { type: 'warning' }).then(async () => {
    await api.delete(`/course-consumptions/${row.id}`); ElMessage.success('已删除'); loadData()
  }).catch(() => {})
}
const onFilterChange = () => { page.current = 1; loadData() }
onMounted(async () => { await loadRefs(); loadData() })
</script>

<style scoped>
.toolbar-left { display: flex; gap: 8px; align-items: center; }
</style>
