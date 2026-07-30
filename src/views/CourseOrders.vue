<template>
  <div class="page-card">
    <div class="page-toolbar">
      <div class="toolbar-left">
        <el-select v-if="isBoss" v-model="filterStoreId" placeholder="全部门店" clearable style="width:160px" @change="onFilterChange">
          <el-option v-for="s in stores" :key="s.id" :label="s.name" :value="s.id" />
        </el-select>
        <el-input v-model="filters.keyword" placeholder="学员姓名" clearable style="width:180px" @keyup.enter="loadData">
          <template #prefix><el-icon><Search /></el-icon></template>
        </el-input>
        <el-button type="primary" @click="loadData">查询</el-button>
      </div>
      <el-button type="primary" @click="openDialog()"><el-icon><Plus /></el-icon>&nbsp;新增订单</el-button>
    </div>
    <el-table :data="tableData" v-loading="loading" stripe>
      <el-table-column prop="id" label="ID" min-width="70" />
      <el-table-column prop="orderNo" label="订单编号" min-width="160" show-overflow-tooltip />
      <el-table-column v-if="isBoss" prop="storeName" label="门店" min-width="100" />
      <el-table-column prop="studentName" label="学员" min-width="90" />
      <el-table-column prop="courseTypeName" label="课包" min-width="120" show-overflow-tooltip />
      <el-table-column prop="paidAmount" label="实付" width="100" align="right">
        <template #default="{row}">¥{{ Number(row.paidAmount).toFixed(2) }}</template>
      </el-table-column>
      <el-table-column prop="totalLessons" label="总课时" width="70" align="center" />
      <el-table-column prop="consumedLessons" label="已消课" width="70" align="center" />
      <el-table-column prop="remainingLessons" label="剩余" width="70" align="center">
        <template #default="{row}"><el-tag :type="row.remainingLessons>0?'success':'danger'" size="small">{{ row.remainingLessons }}</el-tag></template>
      </el-table-column>
      <el-table-column prop="status" label="状态" width="80" align="center">
        <template #default="{row}"><el-tag :type="row.status==='active'?'success':'info'" size="small">{{ row.status==='active'?'活跃':'已退款' }}</el-tag></template>
      </el-table-column>
      <el-table-column label="操作" width="100" fixed="right" align="center">
        <template #default="{row}">
          <el-tooltip content="编辑" placement="top"><el-button link type="primary" :icon="Edit" @click="openDialog(row)" /></el-tooltip>
          <el-tooltip content="删除" placement="top"><el-button link type="danger" :icon="Delete" @click="handleDelete(row)" /></el-tooltip>
        </template>
      </el-table-column>
    </el-table>
    <el-pagination v-model:current-page="page.current" v-model:page-size="page.size" :total="page.total" layout="total, prev, pager, next" @current-change="loadData" style="margin-top:16px;justify-content:flex-end" />
    <el-dialog v-model="dialogVisible" :title="form.id?'编辑订单':'新增订单'" width="560px">
      <el-alert v-if="!form.id" title="订单编号自动生成，填学员姓名即可下单" type="info" :closable="false" style="margin-bottom:12px" />
      <el-form :model="form" label-width="90px">
        <el-form-item v-if="isBoss" label="所属门店">
          <el-select v-model="form.storeId" placeholder="选择门店" style="width:100%">
            <el-option v-for="s in stores" :key="s.id" :label="s.name" :value="s.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="学员姓名" required>
          <el-input v-model="form.studentName" placeholder="输入姓名，新学员自动创建" />
        </el-form-item>
        <el-form-item label="课包" required>
          <el-select v-model="form.courseTypeId" placeholder="选择课包" style="width:100%" @change="onCourseTypeChange">
            <el-option v-for="ct in courseTypes" :key="ct.id" :label="`${ct.name}（${ct.totalLessons}课时）`" :value="ct.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="实际课时">
          <el-input-number v-model="form.totalLessons" :min="1" :max="999" />
          <span class="form-hint">默认为课包课时，可手动改（如送课）</span>
        </el-form-item>
        <el-form-item label="实付金额" required>
          <el-input-number v-model="form.paidAmount" :min="0" :precision="2" style="width:200px" />
          <span class="form-hint">元</span>
        </el-form-item>
        <el-form-item label="销售姓名">
          <el-input v-model="form.salesName" placeholder="签单人姓名，留空不填" />
        </el-form-item>
        <el-form-item label="备注">
          <el-input v-model="form.remark" placeholder="订单备注" />
        </el-form-item>
        <el-form-item v-if="form.id" label="状态">
          <el-select v-model="form.status" :disabled="form.status === 'refunded'">
            <el-option label="活跃" value="active" />
            <el-option label="已退款" value="refunded" disabled />
          </el-select>
          <span v-if="form.status === 'refunded'" style="font-size:12px;color:#F56C6C;margin-left:8px">已退款订单不可修改状态</span>
        </el-form-item>
      </el-form>
      <template #footer><el-button @click="dialogVisible=false">取消</el-button><el-button type="primary" @click="handleSave" :loading="saving">保存</el-button></template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Edit, Delete, Search } from '@element-plus/icons-vue'
import api from '../api'

const userInfo = JSON.parse(localStorage.getItem('userInfo') || '{}')
const isBoss = computed(() => userInfo.role === 'boss')
const myStoreId = computed(() => userInfo.storeId)

const tableData = ref([]), loading = ref(false), saving = ref(false), dialogVisible = ref(false)
const stores = ref([]), courseTypes = ref([])
const page = reactive({ current: 1, size: 10, total: 0 })
const filterStoreId = ref(null)
const filters = reactive({ keyword: '' })
const form = reactive({ id: null, storeId: null, studentName: '', courseTypeId: null, totalLessons: null, paidAmount: 0, salesName: '', remark: '', status: 'active' })

const loadRefs = async () => {
  try {
    const [sr, cr] = await Promise.all([api.get('/stores', { params: { size: 999 } }), api.get('/course-types', { params: { size: 999 } })])
    stores.value = sr.data.records; courseTypes.value = cr.data.records
  } catch {}
}
const loadData = async () => {
  loading.value = true
  try {
    const params = { current: page.current, size: page.size, storeId: filterStoreId.value || undefined, keyword: filters.keyword || undefined }
    const res = await api.get('/course-orders', { params })
    const records = res.data.records
    if (stores.value.length > 0) {
      const map = Object.fromEntries(stores.value.map(s => [s.id, s.name]))
      records.forEach(r => r.storeName = map[r.storeId] || `门店${r.storeId}`)
    }
    tableData.value = records; page.total = res.data.total
  } finally { loading.value = false }
}
const onCourseTypeChange = (ctId) => {
  const ct = courseTypes.value.find(c => c.id === ctId)
  if (ct && !form.id) {
    form.paidAmount = ct.listPrice
    form.totalLessons = ct.totalLessons
  }
}
const openDialog = (row) => {
  if (row) {
    Object.assign(form, row)
  } else {
    const def = { id: null, storeId: myStoreId.value || null, studentName: '', courseTypeId: null, totalLessons: null, paidAmount: 0, salesName: '', remark: '', status: 'active' }
    Object.assign(form, def)
  }
  dialogVisible.value = true
}
const handleSave = async () => {
  if (!form.studentName) return ElMessage.warning('请输入学员姓名')
  if (!form.courseTypeId) return ElMessage.warning('请选择课包')
  if (!isBoss.value) form.storeId = myStoreId.value
  saving.value = true
  try {
    const payload = {
      id: form.id,
      storeId: form.storeId,
      courseTypeId: form.courseTypeId,
      totalLessons: form.totalLessons || undefined,
      paidAmount: form.paidAmount,
      remark: form.remark,
      status: form.status,
      params: {
        studentName: form.studentName,
        salesName: form.salesName || undefined
      }
    }
    form.id ? await api.put('/course-orders', payload) : await api.post('/course-orders', payload)
    ElMessage.success('保存成功'); dialogVisible.value = false; loadData()
  } catch (e) {
    ElMessage.error(e?.response?.data?.message || '保存失败')
  } finally { saving.value = false }
}
const handleDelete = (row) => {
  ElMessageBox.confirm('确认删除？', '提示', { type: 'warning' }).then(async () => {
    await api.delete(`/course-orders/${row.id}`); ElMessage.success('已删除'); loadData()
  }).catch(() => {})
}
const onFilterChange = () => { page.current = 1; loadData() }
onMounted(async () => { await loadRefs(); loadData() })
</script>

<style scoped>
.toolbar-left { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }
.cell-name { font-weight: 600; color: #303133; }
.form-hint { font-size: 12px; color: #909399; margin-left: 8px; }
</style>
