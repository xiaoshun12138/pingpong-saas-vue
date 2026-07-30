<template>
  <div class="page-card">
    <!-- Toolbar -->
    <div class="page-toolbar">
      <div class="toolbar-left">
        <el-radio-group v-model="tab" @change="onTabChange">
          <el-radio-button value="monthly">月度目标</el-radio-button>
          <el-radio-button value="weekly">周度目标</el-radio-button>
        </el-radio-group>
        <el-select v-model="filterStoreId" placeholder="全部门店" clearable style="width:160px;margin-left:12px" @change="onFilterChange">
          <el-option v-for="s in stores" :key="s.id" :label="s.name" :value="s.id" />
        </el-select>
        <el-select v-model="filterType" placeholder="全部类型" clearable style="width:140px" @change="onFilterChange">
          <el-option label="销售额" value="sales" />
          <el-option label="消课额" value="consumption" />
        </el-select>
      </div>
      <el-button type="primary" @click="openDialog()"><el-icon><Plus /></el-icon>&nbsp;新增目标</el-button>
    </div>

    <!-- Table -->
    <el-table :data="tableData" v-loading="loading" stripe>
      <el-table-column type="index" label="#" width="55" />
      <el-table-column prop="storeName" label="门店" min-width="120" />
      <el-table-column prop="targetType" label="目标类型" width="100" align="center">
        <template #default="{row}">
          <el-tag size="small" :type="row.targetType === 'sales' ? 'primary' : 'success'">
            {{ row.targetType === 'sales' ? '销售额' : '消课额' }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="targetAmount" label="目标金额" width="150" align="right">
        <template #default="{row}">¥{{ Number(row.targetAmount || 0).toLocaleString() }}</template>
      </el-table-column>
      <el-table-column label="目标周期" width="160" align="center">
        <template #default="{row}">{{ formatPeriod(row) }}</template>
      </el-table-column>
      <el-table-column label="适用范围" min-width="120">
        <template #default="{row}">
          <el-tag size="small" :type="row.staffId ? 'warning' : ''">{{ row.staffName || '全店' }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="操作" width="80" align="center" fixed="right">
        <template #default="{row}">
          <el-tooltip content="编辑" placement="top"><el-button link type="primary" :icon="Edit" @click="openDialog(row)" /></el-tooltip>
          <el-tooltip content="删除" placement="top"><el-button link type="danger" :icon="Delete" @click="handleDelete(row)" /></el-tooltip>
        </template>
      </el-table-column>
    </el-table>

    <el-pagination v-model:current-page="page.current" v-model:page-size="page.size" :total="page.total"
      layout="total, prev, pager, next" @current-change="loadData" style="margin-top:16px;justify-content:flex-end" />

    <!-- Dialog -->
    <el-dialog v-model="dialogVisible" :title="form.id ? '编辑目标' : '新增目标'" width="520px">
      <el-form :model="form" label-width="90px">
        <el-form-item label="适用范围">
          <el-radio-group v-model="unifiedMode" class="unified-toggle">
            <el-radio :value="false">单个门店</el-radio>
            <el-radio :value="true">全部门店统一</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item v-if="!unifiedMode" label="门店" required>
          <el-select v-model="form.storeId" placeholder="选择门店" style="width:100%" @change="onDialogStoreChange">
            <el-option v-for="s in stores" :key="s.id" :label="s.name" :value="s.id" />
          </el-select>
        </el-form-item>
        <el-form-item v-else label="门店">
          <el-tag type="info" size="large" style="width:100%;text-align:center;padding:8px 0">
            全部门店 ({{ stores.length }} 个)
          </el-tag>
        </el-form-item>
        <el-form-item label="员工">
          <el-select v-model="form.staffId" placeholder="选择员工" style="width:100%" clearable>
            <el-option v-for="s in staffList" :key="s.id" :label="s.name" :value="s.id" />
          </el-select>
          <span class="form-hint">选空 = 门店级目标（适用于全店所有员工）</span>
        </el-form-item>
        <el-form-item label="目标类型" required>
          <el-select v-model="form.targetType" style="width:100%">
            <el-option label="💰 销售额" value="sales" />
            <el-option label="📚 消课额" value="consumption" />
          </el-select>
        </el-form-item>
        <el-form-item label="目标金额" required>
          <el-input-number v-model="form.targetAmount" :min="0" :precision="2" :step="10000" style="width:100%" />
        </el-form-item>
        <el-form-item :label="tab === 'monthly' ? '目标月份' : '目标周'" required>
          <el-date-picker
            v-if="tab === 'monthly'"
            v-model="form.targetDate"
            type="month"
            value-format="YYYY-MM-DD"
            placeholder="选择月份"
            style="width:100%"
          />
          <el-date-picker
            v-else
            v-model="form.targetDate"
            type="week"
            value-format="YYYY-MM-DD"
            format="YYYY-MM-DD"
            placeholder="选择周"
            style="width:100%"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleSave" :loading="saving">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Edit, Delete } from '@element-plus/icons-vue'
import api from '../api'

const userInfo = JSON.parse(localStorage.getItem('userInfo') || '{}')

const tab = ref('monthly')
const stores = ref([])
const staffList = ref([])
const tableData = ref([])
const loading = ref(false)
const saving = ref(false)
const dialogVisible = ref(false)
const filterStoreId = ref(null)
const filterType = ref(null)
const unifiedMode = ref(false)

const page = reactive({ current: 1, size: 10, total: 0 })
const form = reactive({
  id: null, storeId: 1, staffId: null,
  targetType: 'sales', targetAmount: 0, targetDate: ''
})

const apiPath = () => tab.value === 'monthly' ? '/monthly-targets' : '/weekly-targets'

const onTabChange = () => { page.current = 1; loadData() }
const onFilterChange = () => { page.current = 1; loadData() }

const loadRefs = async () => {
  try {
    const [sr] = await Promise.all([
      api.get('/stores', { params: { size: 999 } })
    ])
    stores.value = sr.data?.records || sr.data || []
  } catch {}
}

const loadStaff = async (storeId) => {
  try {
    const res = await api.get('/staff', { params: { storeId, size: 999 } })
    staffList.value = res.data?.records || res.data || []
  } catch {}
}

const loadData = async () => {
  loading.value = true
  try {
    const params = { current: page.current, size: page.size }
    if (filterStoreId.value) params.storeId = filterStoreId.value
    // MyBatis-Plus 会自动把 MonthlyTarget/WeeklyTarget 实体属性映射为查询条件
    // 但 keyword 目前后端未实现，targetType 需要通过条件查询
    const res = await api.get(apiPath(), { params })

    let records = res.data?.records || res.data || []
    const total = res.data?.total ?? records.length

    // 前端按 targetType 过滤（后端 LambdaQueryWrapper 未接 targetType 参数）
    if (filterType.value) {
      records = records.filter(r => r.targetType === filterType.value)
    }

    // 填充门店/员工名称
    const smap = Object.fromEntries(stores.value.map(s => [s.id, s.name]))
    records.forEach(r => r.storeName = smap[r.storeId] || '-')

    const emap = Object.fromEntries(staffList.value.map(s => [s.id, s.name]))
    records.forEach(r => r.staffName = r.staffId ? (emap[r.staffId] || `员工${r.staffId}`) : null)

    tableData.value = records
    page.total = filterType.value ? records.length : total // 前端过滤时total不准
  } finally {
    loading.value = false
  }
}

const openDialog = (row) => {
  unifiedMode.value = false
  if (row) {
    Object.assign(form, {
      ...row,
      targetDate: tab.value === 'monthly'
        ? (typeof row.targetMonth === 'string' ? row.targetMonth : row.targetMonth)
        : (typeof row.targetWeek === 'string' ? row.targetWeek : row.targetWeek)
    })
  } else {
    Object.assign(form, {
      id: null, storeId: stores.value[0]?.id || 1, staffId: null,
      targetType: filterType.value || 'sales', targetAmount: 0, targetDate: ''
    })
  }
  dialogVisible.value = true
}

const onDialogStoreChange = (storeId) => {
  loadStaff(storeId)
}

const handleSave = async () => {
  if (!unifiedMode.value && !form.storeId) { ElMessage.warning('请选择门店'); return }
  if (!form.targetAmount || form.targetAmount <= 0) { ElMessage.warning('请输入目标金额'); return }
  if (!form.targetDate) { ElMessage.warning(tab.value === 'monthly' ? '请选择目标月份' : '请选择目标周'); return }

  const buildPayload = (storeId) => {
    const p = {
      id: unifiedMode.value ? null : form.id,  // 统一模式不传id
      storeId,
      staffId: form.staffId || null,
      targetType: form.targetType,
      targetAmount: form.targetAmount
    }
    if (tab.value === 'monthly') {
      p.targetMonth = form.targetDate
    } else {
      p.targetWeek = form.targetDate
    }
    return p
  }

  saving.value = true
  try {
    if (unifiedMode.value) {
      // 全部门店统一：批量创建，同一个周期+类型如果已有就跳过
      if (form.id) {
        ElMessage.warning('编辑模式下不支持批量门店设定，请关闭统一模式后操作')
        saving.value = false
        return
      }
      let created = 0
      for (const s of stores.value) {
        try {
          await api.post(apiPath(), buildPayload(s.id))
          created++
        } catch { /* 跳过重复 */ }
      }
      ElMessage.success(`已为 ${created} 个门店设定目标`)
    } else {
      // 单个门店
      const payload = buildPayload(form.storeId)
      if (form.id) {
        payload.id = form.id
        await api.put(apiPath(), payload)
      } else {
        await api.post(apiPath(), payload)
      }
      ElMessage.success('保存成功')
    }
    dialogVisible.value = false
    loadData()
  } catch {
    // handled by interceptor
  } finally {
    saving.value = false
  }
}

const handleDelete = (row) => {
  ElMessageBox.confirm('确认删除该目标？删除后对应的目标看板将不再显示。', '提示', { type: 'warning' })
    .then(async () => {
      await api.delete(`${apiPath()}/${row.id}`)
      ElMessage.success('已删除')
      loadData()
    })
    .catch(() => {})
}

const formatPeriod = (row) => {
  const dateStr = tab.value === 'monthly' ? row.targetMonth : row.targetWeek
  if (!dateStr) return '-'

  // LocalDate from backend could be string "2026-07-01" or array [2026,7,1]
  let d
  if (typeof dateStr === 'string') {
    d = new Date(dateStr)
  } else if (Array.isArray(dateStr)) {
    d = new Date(dateStr[0], dateStr[1] - 1, dateStr[2] || 1)
  } else {
    return String(dateStr)
  }

  if (tab.value === 'monthly') {
    return d.getFullYear() + '年' + (d.getMonth() + 1) + '月'
  }
  // Weekly: compute ISO week number
  const start = new Date(d.getFullYear(), 0, 1)
  const diff = Math.floor((d - start) / 86400000)
  const week = Math.ceil((diff + start.getDay() + 1) / 7)
  return d.getFullYear() + '年 第' + week + '周'
}

onMounted(async () => {
  await loadRefs()
  await loadStaff()
  loadData()
})
</script>

<style scoped>
.toolbar-left {
  display: flex;
  gap: 8px;
  align-items: center;
}
.form-hint {
  font-size: 12px;
  color: #909399;
  margin-top: 2px;
  display: block;
}
</style>
