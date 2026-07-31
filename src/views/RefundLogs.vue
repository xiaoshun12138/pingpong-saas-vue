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
      <el-table-column label="操作" width="70" align="center" fixed="right">
        <template #default="{row}">
          <el-tooltip content="编辑退款原因" placement="top"><el-button link type="primary" :icon="Edit" @click="openDialog(row)" /></el-tooltip>
        </template>
      </el-table-column>
    </el-table>
    <el-pagination v-model:current-page="page.current" v-model:page-size="page.size" :total="page.total" layout="total, prev, pager, next" @current-change="loadData" style="margin-top:16px;justify-content:flex-end" />

    <!-- 新增退款弹窗 -->
    <el-dialog v-model="dialogVisible" :title="form.id ? '编辑退款原因' : '新增退款'" width="560px" class="nice-dialog">
      <el-alert v-if="!form.id" title="退款将清零订单剩余课时，此操作不可逆" type="warning" :closable="false" style="margin-bottom:16px" />
      <el-alert v-if="!form.id" title="退款金额 = 实付金额 × (退回课时 ÷ 订单总课时)，由系统自动计算" type="info" :closable="false" style="margin-bottom:16px" />

      <!-- 编辑模式：只改退款原因 -->
      <el-form v-if="form.id" :model="form" label-width="90px">
        <el-form-item label="退款原因"><el-input v-model="form.reason" type="textarea" :rows="3" /></el-form-item>
      </el-form>

      <!-- 新增模式 -->
      <el-form v-else :model="form" label-width="90px">
        <!-- 步骤 1：选择学员 -->
        <el-form-item label="学员姓名" required>
          <el-select
            v-model="form.studentId"
            filterable
            remote
            reserve-keyword
            placeholder="输入学员姓名搜索"
            :remote-method="searchStudents"
            :loading="studentLoading"
            style="width:100%"
            @change="onStudentChange"
          >
            <el-option v-for="s in studentOptions" :key="s.id" :label="`${s.name}（${s.phone || '无手机号'}）`" :value="s.id" />
          </el-select>
        </el-form-item>

        <!-- 步骤 2：选择课包（仅 active 状态） -->
        <el-form-item v-if="form.studentId" label="课包" required>
          <el-select v-model="form.courseOrderId" placeholder="选择课包" style="width:100%" @change="onOrderChange">
            <el-option
              v-for="o in studentOrders"
              :key="o.orderId"
              :label="`${o.courseTypeName}（剩余${o.remainingLessons}/${o.totalLessons}课时）`"
              :value="o.orderId"
              :disabled="o.status !== 'active' || o.remainingLessons === 0"
            />
          </el-select>
        </el-form-item>

        <!-- 步骤 3：自动匹配信息（只读） -->
        <template v-if="form.courseOrderId">
          <el-form-item label="订单编号">
            <el-input :model-value="selectedOrder?.orderNo || '-'" disabled style="width:100%">
              <template #prefix><span style="color:#c0c4cc">🔒</span></template>
            </el-input>
          </el-form-item>

          <el-form-item label="剩余课时">
            <el-input :model-value="selectedOrder ? `${selectedOrder.remainingLessons} 课时` : '-'" disabled style="width:100%" />
          </el-form-item>

          <el-form-item label="折算单价">
            <el-input :model-value="unitPriceDisplay" disabled style="width:100%" />
          </el-form-item>
        </template>

        <!-- 步骤 4：输入退回课时 -->
        <el-form-item v-if="form.courseOrderId" label="退回课时" required>
          <el-input-number
            v-model="form.refundLessons"
            :min="1"
            :max="selectedOrder?.remainingLessons || 1"
            style="width:200px"
          />
          <span style="margin-left:8px;font-size:12px;color:#909399">最多退 {{ selectedOrder?.remainingLessons || 0 }} 课时</span>
        </el-form-item>

        <!-- 步骤 5：自动计算退款金额（只读） -->
        <el-form-item v-if="form.courseOrderId && form.refundLessons > 0" label="退款金额">
          <el-input :model-value="calculatedRefundDisplay" disabled style="width:200px">
            <template #prefix><span style="color:#F56C6C;font-weight:600">¥</span></template>
          </el-input>
          <span style="margin-left:8px;font-size:12px;color:#909399">系统自动计算</span>
        </el-form-item>

        <el-form-item label="退款原因"><el-input v-model="form.reason" type="textarea" :rows="2" placeholder="退款原因（选填）" /></el-form-item>
      </el-form>

      <template #footer>
        <el-button @click="dialogVisible=false">取消</el-button>
        <el-button :type="form.id ? 'primary' : 'danger'" @click="handleSave" :loading="saving">
          {{ form.id ? '保存' : '确认退款' }}
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Edit, Plus, Search } from '@element-plus/icons-vue'
import api from '../api'

const userInfo = JSON.parse(localStorage.getItem('userInfo') || '{}')
const isBoss = computed(() => userInfo.role === 'boss')
const myStaffId = computed(() => userInfo.staffId)
const myName = computed(() => userInfo.name || '当前用户')

const tableData = ref([]), loading = ref(false), saving = ref(false), dialogVisible = ref(false)
const stores = ref([])
const filterStoreId = ref(null)
const page = reactive({ current: 1, size: 10, total: 0 })
const filters = reactive({ keyword: '' })

// 新增退款表单
const form = reactive({
  id: null,
  studentId: null,
  courseOrderId: null,
  refundLessons: 1,
  reason: ''
})

// 学员搜索
const studentOptions = ref([])
const studentLoading = ref(false)
// 选中学员名下的课包列表
const studentOrders = ref([])

// 选中的订单对象（自动匹配信息用）
const selectedOrder = computed(() => {
  if (!form.courseOrderId) return null
  return studentOrders.value.find(o => o.orderId === form.courseOrderId)
})

// 折算单价 = 实付金额 / 总课时
const unitPriceDisplay = computed(() => {
  const o = selectedOrder.value
  if (!o || !o.totalLessons) return '-'
  const unit = (Number(o.paidAmount) / o.totalLessons).toFixed(2)
  return `¥${unit} / 课时（¥${Number(o.paidAmount).toLocaleString()} ÷ ${o.totalLessons}课时）`
})

// 退款金额 = 单价 × 退回课时
const calculatedRefundDisplay = computed(() => {
  const o = selectedOrder.value
  if (!o || !o.totalLessons || !form.refundLessons) return '0.00'
  const amount = (Number(o.paidAmount) * form.refundLessons / o.totalLessons).toFixed(2)
  return amount
})

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

// 远程搜索学员
const searchStudents = async (query) => {
  if (!query) { studentOptions.value = []; return }
  studentLoading.value = true
  try {
    const res = await api.get('/students', { params: { keyword: query, size: 20 } })
    studentOptions.value = res.data.records || []
  } catch {
    studentOptions.value = []
  } finally {
    studentLoading.value = false
  }
}

// 选中学员后，拉取名下课包
const onStudentChange = async (studentId) => {
  // 重置下级选项
  form.courseOrderId = null
  form.refundLessons = 1
  studentOrders.value = []
  if (!studentId) return
  try {
    const res = await api.get(`/students/${studentId}/orders`)
    studentOrders.value = res.data || []
    // 过滤出 active 且有剩余课时的订单
    if (studentOrders.value.length === 0) {
      ElMessage.warning('该学员名下没有可退款的课包')
    }
  } catch {
    ElMessage.error('加载课包失败')
  }
}

// 选中课包后，默认退回全部剩余课时
const onOrderChange = () => {
  const o = selectedOrder.value
  if (o) {
    form.refundLessons = o.remainingLessons
  }
}

const openDialog = (row) => {
  if (row) {
    Object.assign(form, { id: row.id, studentId: row.studentId, courseOrderId: row.courseOrderId, refundLessons: row.refundLessons, reason: row.reason || '' })
    studentOrders.value = []
  } else {
    Object.assign(form, { id: null, studentId: null, courseOrderId: null, refundLessons: 1, reason: '' })
    studentOptions.value = []
    studentOrders.value = []
  }
  dialogVisible.value = true
}

const onFilterChange = () => { page.current = 1; loadData() }

const handleSave = async () => {
  if (!form.id) {
    // 新增模式校验
    if (!form.studentId) return ElMessage.warning('请选择学员')
    if (!form.courseOrderId) return ElMessage.warning('请选择课包')
    if (!form.refundLessons || form.refundLessons <= 0) return ElMessage.warning('退回课时必须大于0')
  }
  saving.value = true
  try {
    if (form.id) {
      await api.put('/refund-logs', { id: form.id, reason: form.reason })
    } else {
      // 不传 operatorId，后端从 JWT token 取
      await api.post('/refund-logs', {
        studentId: form.studentId,
        courseOrderId: form.courseOrderId,
        refundLessons: form.refundLessons,
        reason: form.reason
      })
    }
    ElMessage.success(form.id ? '保存成功' : '退款成功')
    dialogVisible.value = false
    loadData()
  } catch (e) {
    ElMessage.error(e?.response?.data?.message || '操作失败')
  } finally {
    saving.value = false
  }
}

onMounted(async () => { await loadStores(); loadData() })
</script>

<style scoped>
.toolbar-left { display: flex; gap: 8px; align-items: center; }
</style>
