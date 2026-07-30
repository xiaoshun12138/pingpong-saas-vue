<template>
  <div class="page-card">
    <div class="page-toolbar">
      <div class="toolbar-left">
        <el-select v-if="isBoss" v-model="filterStoreId" placeholder="全部门店" clearable style="width:160px" @change="onFilterChange">
          <el-option v-for="s in stores" :key="s.id" :label="s.name" :value="s.id" />
        </el-select>
        <el-input v-model="filters.keyword" placeholder="姓名 / 手机号" clearable style="width:220px" @keyup.enter="loadData">
          <template #prefix><el-icon><Search /></el-icon></template>
        </el-input>
        <el-button type="primary" @click="loadData">查询</el-button>
      </div>
    </div>

    <el-table :data="tableData" v-loading="loading" stripe style="width:100%" row-key="id"
              :expand-row-keys="expandedRows" @expand-change="handleExpand">
      <el-table-column type="expand">
        <template #default="{ row }">
          <div class="expand-wrapper">
            <div v-if="orderLoading[row.id]" class="expand-loading">
              <el-icon class="is-loading"><Loading /></el-icon> 加载课包中...
            </div>
            <div v-else-if="orderError[row.id]" class="expand-error">{{ orderError[row.id] }}</div>
            <div v-else>
              <p class="expand-summary">
                <span>📦 <strong>{{ studentOrders[row.id]?.length || 0 }}</strong> 个课包</span>
                <span v-if="studentOrders[row.id]" style="margin-left:16px">
                  合计已付 <strong>¥{{ totalPaid(row.id) }}</strong>
                </span>
              </p>
              <el-table :data="studentOrders[row.id]" stripe size="small" style="margin-top:6px"
                        :show-header="studentOrders[row.id] && studentOrders[row.id].length > 0">
                <el-table-column prop="courseTypeName" label="课包名称" min-width="110" />
                <el-table-column prop="coachName" label="教练" min-width="80" />
                <el-table-column prop="totalLessons" label="总课时" width="75" align="center" />
                <el-table-column prop="remainingLessons" label="剩余课时" width="85" align="center">
                  <template #default="{ row: o }">
                    <el-tag :type="o.remainingLessons > 0 ? 'success' : 'danger'" size="small">
                      {{ o.remainingLessons }}
                    </el-tag>
                  </template>
                </el-table-column>
                <el-table-column prop="consumedLessons" label="已消课时" width="85" align="center" />
                <el-table-column prop="paidAmount" label="实付金额" width="110" align="right">
                  <template #default="{ row: o }">¥{{ Number(o.paidAmount || 0).toLocaleString() }}</template>
                </el-table-column>
                <el-table-column prop="status" label="状态" width="75" align="center">
                  <template #default="{ row: o }">
                    <el-tag :type="o.status === 'active' ? 'success' : 'info'" size="small">
                      {{ statusLabel(o.status) }}
                    </el-tag>
                  </template>
                </el-table-column>
              </el-table>
              <div v-if="studentOrders[row.id] && studentOrders[row.id].length === 0" class="empty-orders">
                暂无课包记录
              </div>
            </div>
          </div>
        </template>
      </el-table-column>
      <el-table-column prop="id" label="ID" min-width="60" />
      <el-table-column prop="name" label="姓名" min-width="80">
        <template #default="{row}"><span class="cell-name">{{ row.name }}</span></template>
      </el-table-column>
      <el-table-column prop="phone" label="手机号" width="125" />
      <el-table-column v-if="isBoss" prop="storeName" label="所属门店" min-width="100" />
      <el-table-column prop="coachName" label="带教教练" min-width="80" />
      <el-table-column prop="totalRemainingLessons" label="剩余课时" width="85" align="center">
        <template #default="{row}">
          <el-tag :type="row.totalRemainingLessons > 0 ? 'success' : 'info'" size="small">{{ row.totalRemainingLessons }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="source" label="来源" min-width="80" show-overflow-tooltip />
      <el-table-column label="就读状态" width="110" align="center">
        <template #default="{row}">
          <el-switch :model-value="row.status === 1" :loading="togglingMap[row.id]"
                     active-text="活跃" inactive-text="停课"
                     :before-change="() => onToggleStatus(row)"
                     active-color="#67C23A" inactive-color="#F56C6C" inline-prompt />
        </template>
      </el-table-column>
      <el-table-column label="操作" width="170" fixed="right" align="center">
        <template #default="{row}">
          <el-tooltip content="续费" placement="top"><el-button link type="success" :icon="Plus" @click="openRenew(row)" /></el-tooltip>
          <el-tooltip content="编辑" placement="top"><el-button link type="primary" :icon="Edit" @click="openDialog(row)" /></el-tooltip>
          <el-tooltip content="删除" placement="top"><el-button link type="danger" :icon="Delete" @click="handleDelete(row)" /></el-tooltip>
        </template>
      </el-table-column>
    </el-table>

    <el-pagination v-model:current-page="page.current" v-model:page-size="page.size" :total="page.total"
                   layout="total, prev, pager, next" @current-change="loadData" style="margin-top:16px;justify-content:flex-end" />

    <!-- 编辑弹窗（仅编辑已有学员常用信息，新增学员通过订单页面自动创建） -->
    <el-dialog v-model="dialogVisible" title="编辑学员" width="480px" class="nice-dialog">
      <el-form :model="form" label-width="80px">
        <el-form-item label="姓名"><span class="form-text">{{ form.name }}</span></el-form-item>
        <el-form-item label="手机号"><el-input v-model="form.phone" placeholder="请输入手机号" /></el-form-item>
        <el-form-item label="年龄"><el-input-number v-model="form.age" :min="3" :max="80" /></el-form-item>
        <el-form-item v-if="isBoss" label="所属门店">
          <el-select v-model="form.storeId" placeholder="选择门店" style="width:100%">
            <el-option v-for="s in stores" :key="s.id" :label="s.name" :value="s.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="带教教练">
          <el-select v-model="form.primaryCoachId" placeholder="选择教练" clearable style="width:100%">
            <el-option v-for="c in coaches" :key="c.id" :label="c.name" :value="c.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="来源"><el-input v-model="form.source" placeholder="如：抖音、美团、转介绍" /></el-form-item>
        <el-form-item label="就读状态"><el-switch v-model="form.status" :active-value="1" :inactive-value="0" active-text="活跃" inactive-text="停课" inline-prompt /></el-form-item>
      </el-form>
      <template #footer><el-button @click="dialogVisible=false">取消</el-button><el-button type="primary" @click="handleSave" :loading="saving">保存</el-button></template>
    </el-dialog>

    <!-- 续费弹窗 -->
    <el-dialog v-model="renewVisible" :title="`续费 - ${renewStudent.name}`" width="500px" @close="resetRenew">
      <el-form :model="renewForm" label-width="90px">
        <el-form-item label="学员"><span class="form-text">{{ renewStudent.name }}（ID: {{ renewStudent.id }}）</span></el-form-item>
        <el-form-item label="课包" required>
          <el-select v-model="renewForm.courseTypeId" placeholder="选择课包" style="width:100%" @change="onRenewCourseTypeChange">
            <el-option v-for="ct in courseTypes" :key="ct.id" :label="`${ct.name}（${ct.totalLessons}课时 ¥${ct.listPrice}）`" :value="ct.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="实际课时">
          <el-input-number v-model="renewForm.totalLessons" :min="1" :max="999" />
          <span class="form-hint">默认为课包课时，可手动改</span>
        </el-form-item>
        <el-form-item label="实付金额" required>
          <el-input-number v-model="renewForm.paidAmount" :min="0" :precision="2" style="width:200px" />
          <span class="form-hint">元</span>
        </el-form-item>
        <el-form-item label="销售姓名">
          <el-input v-model="renewForm.salesName" placeholder="签单人姓名" />
        </el-form-item>
        <el-form-item label="备注">
          <el-input v-model="renewForm.remark" placeholder="续费备注" />
        </el-form-item>
      </el-form>
      <template #footer><el-button @click="renewVisible=false">取消</el-button><el-button type="primary" @click="handleRenew" :loading="renewSaving">确认续费</el-button></template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Edit, Delete, Loading, Plus } from '@element-plus/icons-vue'
import api from '../api'

const userInfo = JSON.parse(localStorage.getItem('userInfo') || '{}')
const isBoss = computed(() => userInfo.role === 'boss')
const canToggle = computed(() => userInfo.role === 'boss' || userInfo.role === 'shop_owner')
const myStoreId = computed(() => userInfo.storeId)

const tableData = ref([]), loading = ref(false), saving = ref(false), dialogVisible = ref(false)
const stores = ref([]), coaches = ref([])
const filterStoreId = ref(null)
const page = reactive({ current: 1, size: 10, total: 0 })
const filters = reactive({ keyword: '' })
const form = reactive({ id: null, name: '', phone: '', age: 10, storeId: 1, primaryCoachId: null, source: '', status: 1 })

// 展开行课包数据
const expandedRows = ref([])
const studentOrders = reactive({})
const orderLoading = reactive({})
const orderError = reactive({})
const togglingMap = reactive({})

const statusLabel = (s) => {
  if (s === 'active') return '活跃'
  if (s === 'refunded') return '已退'
  if (s === 'finished') return '已结课'
  return s
}

const totalPaid = (id) => {
  const orders = studentOrders[id]
  if (!orders) return '0'
  return orders.reduce((sum, o) => sum + Number(o.paidAmount || 0), 0).toLocaleString()
}

const loadStores = async () => {
  try { const r = await api.get('/stores', { params: { size: 999 } }); stores.value = r.data.records } catch {}
}
const loadCoaches = async () => {
  try {
    const r = await api.get('/staff', { params: { role: 'coach', size: 9999 } })
    coaches.value = r.data.records || []
  } catch {}
}
const loadData = async () => {
  loading.value = true
  expandedRows.value = []
  try {
    const res = await api.get('/students', { params: { current: page.current, size: page.size, storeId: filterStoreId.value || undefined, keyword: filters.keyword || undefined } })
    const records = res.data.records
    if (stores.value.length > 0) {
      const storeMap = Object.fromEntries(stores.value.map(s => [s.id, s.name]))
      records.forEach(r => r.storeName = storeMap[r.storeId] || `门店${r.storeId}`)
    }
    if (coaches.value.length > 0) {
      const coachMap = Object.fromEntries(coaches.value.map(c => [c.id, c.name]))
      records.forEach(r => r.coachName = r.primaryCoachId ? (coachMap[r.primaryCoachId] || '-') : '-')
    }
    tableData.value = records; page.total = res.data.total
  } finally { loading.value = false }
}
const onFilterChange = () => { page.current = 1; loadData() }
const openDialog = (row) => {
  const def = { id: null, name: '', phone: '', age: 10, storeId: myStoreId.value || 1, primaryCoachId: null, source: '', status: 1 }
  Object.assign(form, row || def)
  dialogVisible.value = true
}
const handleSave = async () => {
  if (!form.name) return ElMessage.warning('请填写姓名')
  if (!isBoss.value) form.storeId = myStoreId.value
  saving.value = true
  try { form.id ? await api.put('/students', form) : await api.post('/students', form); ElMessage.success('保存成功'); dialogVisible.value = false; loadData() } finally { saving.value = false }
}
const handleDelete = (row) => {
  ElMessageBox.confirm('确认删除？', '提示', { type: 'warning' }).then(async () => {
    await api.delete(`/students/${row.id}`); ElMessage.success('已删除'); loadData()
  }).catch(() => {})
}

// ===== 续费 =====
const renewVisible = ref(false)
const renewSaving = ref(false)
const courseTypes = ref([])
const renewStudent = reactive({ id: null, name: '' })
const renewForm = reactive({ courseTypeId: null, totalLessons: null, paidAmount: 0, salesName: '', remark: '' })

const loadCourseTypes = async () => {
  try { const r = await api.get('/course-types', { params: { size: 999 } }); courseTypes.value = r.data.records } catch {}
}

const openRenew = (row) => {
  renewStudent.id = row.id
  renewStudent.name = row.name
  resetRenew()
  renewVisible.value = true
  if (courseTypes.value.length === 0) loadCourseTypes()
}

const resetRenew = () => {
  Object.assign(renewForm, { courseTypeId: null, totalLessons: null, paidAmount: 0, salesName: '', remark: '' })
}

const onRenewCourseTypeChange = (ctId) => {
  const ct = courseTypes.value.find(c => c.id === ctId)
  if (ct) {
    renewForm.paidAmount = ct.listPrice
    renewForm.totalLessons = ct.totalLessons
  }
}

const handleRenew = async () => {
  if (!renewForm.courseTypeId) return ElMessage.warning('请选择课包')
  if (!renewForm.paidAmount && renewForm.paidAmount !== 0) return ElMessage.warning('请填写实付金额')
  renewSaving.value = true
  try {
    await api.post('/course-orders/renew', {
      studentId: renewStudent.id,
      storeId: myStoreId.value,
      courseTypeId: renewForm.courseTypeId,
      totalLessons: renewForm.totalLessons || undefined,
      paidAmount: renewForm.paidAmount,
      remark: renewForm.remark,
      params: { salesName: renewForm.salesName || undefined }
    })
    ElMessage.success('续费成功')
    renewVisible.value = false
    loadData()
  } catch (e) {
    ElMessage.error(e?.response?.data?.message || '续费失败')
  } finally { renewSaving.value = false }
}

const handleExpand = async (row, isExpanded) => {
  // Element Plus expand-change 第二个参数是 boolean
  if (isExpanded) {
    if (!expandedRows.value.includes(row.id)) {
      expandedRows.value = [...expandedRows.value, row.id]
    }
  } else {
    expandedRows.value = expandedRows.value.filter(id => id !== row.id)
    return
  }
  if (studentOrders[row.id] !== undefined) return
  orderLoading[row.id] = true
  try {
    const res = await api.get(`/students/${row.id}/orders`)
    studentOrders[row.id] = res.data || []
    delete orderError[row.id]
  } catch (e) {
    orderError[row.id] = '加载失败，请重试'
  } finally {
    delete orderLoading[row.id]
  }
}

const onToggleStatus = (row) => {
  if (!canToggle.value) {
    ElMessage.warning('仅老板和店长可操作停课/复课')
    return false
  }
  const newStatus = row.status === 1 ? 0 : 1
  const action = newStatus === 0 ? '停课' : '复课'
  return ElMessageBox.confirm(`确认将该学员${action}？`, '提示', {
    confirmButtonText: '确认',
    cancelButtonText: '取消',
    type: 'warning'
  }).then(async () => {
    togglingMap[row.id] = true
    try {
      await api.put(`/students/${row.id}/status`, null, { params: { status: newStatus } })
      row.status = newStatus
      ElMessage.success(`${action}成功`)
      return true
    } catch (e) {
      ElMessage.error(`${action}失败`)
      return false
    } finally {
      delete togglingMap[row.id]
    }
  }).catch(() => false)
}

onMounted(async () => { await Promise.all([loadStores(), loadCoaches(), loadCourseTypes()]); loadData() })
</script>

<style scoped>
.toolbar-left { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }
.cell-name { font-weight: 600; color: #303133; }
.form-text { font-size: 14px; color: #303133; font-weight: 500; }
.form-hint { font-size: 12px; color: #909399; margin-left: 8px; }
.expand-wrapper { padding: 12px 20px; background: #fafafa; border-radius: 6px; }
.expand-summary { margin: 0 0 8px; font-size: 13px; color: #606266; }
.expand-loading, .expand-error, .empty-orders { color: #909399; font-size: 13px; padding: 12px 0; text-align: center; }
.expand-error { color: #F56C6C; }
.form-hint { font-size: 12px; color: #909399; margin-left: 8px; }
</style>
