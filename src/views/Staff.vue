<template>
  <div class="page-card staff-page">
    <!-- 工具栏 -->
    <div class="page-toolbar">
      <div class="toolbar-left">
        <!-- 角色筛选 -->
        <div class="filter-group">
          <span class="filter-label">角色</span>
          <el-select v-model="filters.role" placeholder="全部角色" clearable style="width:120px" @change="onFilterChange">
            <el-option label="老板" value="boss" />
            <el-option label="店长" value="shop_owner" />
            <el-option label="教练" value="coach" />
            <el-option label="销售" value="sales" />
          </el-select>
        </div>
        <!-- 门店筛选 -->
        <div class="filter-group" v-if="isBoss">
          <span class="filter-label">门店</span>
          <el-select v-model="filters.storeId" placeholder="全部门店" clearable style="width:140px" @change="onFilterChange">
            <el-option v-for="s in stores" :key="s.id" :label="s.name" :value="s.id" />
          </el-select>
        </div>
        <!-- 状态筛选 -->
        <div class="filter-group">
          <span class="filter-label">状态</span>
          <el-select v-model="filters.status" placeholder="全部状态" clearable style="width:100px" @change="onFilterChange">
            <el-option label="在职" :value="1" />
            <el-option label="离职" :value="0" />
          </el-select>
        </div>
        <!-- 关键词 -->
        <el-input v-model="filters.keyword" placeholder="姓名 / 手机号" clearable style="width:180px" @keyup.enter="onFilterChange" @clear="onFilterChange">
          <template #prefix><el-icon><Search /></el-icon></template>
        </el-input>
        <el-button type="primary" @click="onFilterChange">
          <el-icon><Search /></el-icon>&nbsp;查询
        </el-button>
        <el-button @click="resetFilters">重置</el-button>
      </div>
      <el-button type="primary" @click="openDialog()">
        <el-icon><Plus /></el-icon>&nbsp;新增员工
      </el-button>
    </div>

    <!-- 角色统计卡片 -->
    <div class="role-stats">
      <div class="role-stat-card" v-for="r in roleStats" :key="r.role" :class="{ active: filters.role === r.role }" @click="toggleRoleFilter(r.role)">
        <div class="role-stat-icon" :style="{ background: r.color }">
          <span>{{ r.icon }}</span>
        </div>
        <div class="role-stat-info">
          <span class="role-stat-num">{{ r.count }}</span>
          <span class="role-stat-label">{{ r.label }}</span>
        </div>
      </div>
    </div>

    <!-- 表格 -->
    <el-table :data="tableData" empty-text="暂无数据" v-loading="loading" stripe style="width:100%" :header-cell-style="{ background:'#f5f7fa', color:'#606266', fontWeight:600 }">
      <el-table-column prop="name" label="姓名" min-width="100" />
      <el-table-column prop="phone" label="手机号" width="130" />
      <el-table-column prop="role" label="角色" width="90" align="center">
        <template #default="{row}">
          <el-tag :type="roleTag(row.role)" size="small" effect="light" round>{{ roleLabel(row.role) }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="storeName" label="所属门店" min-width="120">
        <template #default="{row}">
          <span class="cell-store">{{ row.storeName || '-' }}</span>
        </template>
      </el-table-column>
      <el-table-column prop="entryDate" label="入职日期" width="110" align="center">
        <template #default="{row}">
          <span class="cell-date">{{ row.entryDate || '-' }}</span>
        </template>
      </el-table-column>
      <el-table-column prop="status" label="状态" width="80" align="center">
        <template #default="{row}">
          <el-tag :type="row.status===1?'success':'info'" size="small" effect="plain" round>{{ row.status===1?'在职':'离职' }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="操作" width="90" align="center" fixed="right">
        <template #default="{row}">
          <el-tooltip content="编辑" placement="top"><el-button link type="primary" :icon="Edit" @click="openDialog(row)" /></el-tooltip>
          <el-tooltip content="删除" placement="top"><el-button link type="danger" :icon="Delete" @click="handleDelete(row)" /></el-tooltip>
        </template>
      </el-table-column>
    </el-table>

    <el-pagination
      v-model:current-page="page.current"
      v-model:page-size="page.size"
      :total="page.total"
      :page-sizes="[10, 20, 50]"
      layout="total, sizes, prev, pager, next"
      @current-change="loadData"
      @size-change="onSizeChange"
      style="margin-top:16px;justify-content:flex-end"
    />

    <!-- 新增/编辑弹窗 -->
    <el-dialog v-model="dialogVisible" :title="form.id?'编辑员工':'新增员工'" width="520px" class="nice-dialog" :close-on-click-modal="false">
      <el-form :model="form" label-width="80px">
        <el-form-item label="姓名" required>
          <el-input v-model="form.name" placeholder="请输入姓名" />
        </el-form-item>
        <el-form-item label="手机号" required>
          <el-input v-model="form.phone" placeholder="请输入手机号" maxlength="11" />
        </el-form-item>
        <el-form-item label="角色">
          <el-select v-model="form.role" style="width:100%">
            <el-option label="老板" value="boss" />
            <el-option label="店长" value="shop_owner" />
            <el-option label="教练" value="coach" />
            <el-option label="销售" value="sales" />
          </el-select>
        </el-form-item>
        <el-form-item label="所属门店">
          <el-select v-model="form.storeId" placeholder="选择门店" style="width:100%" clearable>
            <el-option v-for="s in stores" :key="s.id" :label="s.name" :value="s.id" />
          </el-select>
        </el-form-item>
        <el-form-item v-if="!form.id" label="密码">
          <el-input v-model="form.password" placeholder="默认 123456" />
        </el-form-item>
        <el-form-item v-else label="密码">
          <span class="form-hint">修改密码请走专门接口</span>
        </el-form-item>
        <el-form-item label="状态">
          <el-switch v-model="form.status" :active-value="1" :inactive-value="0" active-text="在职" inactive-text="离职" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible=false">取消</el-button>
        <el-button type="primary" @click="handleSave" :loading="saving">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Edit, Delete, Search, Plus } from '@element-plus/icons-vue'
import api from '../api'

const tableData = ref([])
const loading = ref(false)
const saving = ref(false)
const dialogVisible = ref(false)
const userInfo = JSON.parse(localStorage.getItem('userInfo') || '{}')
const isBoss = computed(() => userInfo.role === 'boss')
const stores = ref([])

const page = reactive({ current: 1, size: 10, total: 0 })
const filters = reactive({ keyword: '', role: null, storeId: null, status: null })
const form = reactive({ id: null, name: '', phone: '', storeId: null, role: 'coach', password: '123456', status: 1 })

// 角色统计
const roleStats = ref([
  { role: 'boss', label: '老板', icon: '👑', color: 'linear-gradient(135deg, #F56C6C, #E74C3C)', count: 0 },
  { role: 'shop_owner', label: '店长', icon: '🏪', color: 'linear-gradient(135deg, #E6A23C, #F39C12)', count: 0 },
  { role: 'coach', label: '教练', icon: '🏸', color: 'linear-gradient(135deg, #67C23A, #27AE60)', count: 0 },
  { role: 'sales', label: '销售', icon: '💰', color: 'linear-gradient(135deg, #409EFF, #36cfc9)', count: 0 }
])

const loadData = async () => {
  loading.value = true
  try {
    const params = {
      current: page.current,
      size: page.size,
      keyword: filters.keyword || undefined,
      role: filters.role || undefined,
      storeId: filters.storeId || undefined,
      status: filters.status !== null && filters.status !== '' ? filters.status : undefined
    }
    // 店长只能看自己门店
    if (!isBoss.value) {
      params.storeId = userInfo.storeId
    }
    const res = await api.get('/staff', { params })
    const records = res.data.records || []
    if (stores.value.length > 0) {
      const map = Object.fromEntries(stores.value.map(s => [s.id, s.name]))
      records.forEach(r => r.storeName = map[r.storeId] || '-')
    }
    tableData.value = records
    page.total = res.data.total
    loadRoleStats()
  } finally { loading.value = false }
}

// 统计各角色人数（基于当前门店筛选）
const loadRoleStats = async () => {
  const baseParams = isBoss.value
    ? { storeId: filters.storeId || undefined, size: 9999 }
    : { storeId: userInfo.storeId, size: 9999 }
  try {
    const res = await api.get('/staff', { params: baseParams })
    const all = res.data.records || []
    roleStats.value.forEach(r => {
      r.count = all.filter(s => s.role === r.role && (filters.status === null || filters.status === '' || s.status === filters.status)).length
    })
  } catch {}
}

const loadStores = async () => {
  try {
    const r = await api.get('/stores', { params: { size: 999 } })
    stores.value = r.data.records || []
  } catch {}
}

const openDialog = (row) => {
  if (row) {
    Object.assign(form, { id: row.id, name: row.name, phone: row.phone, storeId: row.storeId, role: row.role, password: '', status: row.status })
  } else {
    Object.assign(form, { id: null, name: '', phone: '', storeId: null, role: 'coach', password: '123456', status: 1 })
  }
  dialogVisible.value = true
}

const handleSave = async () => {
  if (!form.name?.trim()) return ElMessage.warning('请填写姓名')
  if (!form.phone?.trim()) return ElMessage.warning('请填写手机号')
  saving.value = true
  try {
    const payload = { ...form }
    if (form.id) {
      delete payload.password
    } else if (!payload.password) {
      payload.password = '123456'
    }
    form.id ? await api.put('/staff', payload) : await api.post('/staff', payload)
    ElMessage.success('保存成功')
    dialogVisible.value = false
    loadData()
  } catch (e) {
    ElMessage.error(e?.response?.data?.message || '保存失败')
  } finally { saving.value = false }
}

const handleDelete = (row) => {
  ElMessageBox.confirm(`确认删除员工「${row.name}」？`, '提示', { type: 'warning' })
    .then(async () => {
      await api.delete(`/staff/${row.id}`)
      ElMessage.success('已删除')
      loadData()
    }).catch(() => {})
}

const roleLabel = (r) => ({ boss: '老板', shop_owner: '店长', coach: '教练', sales: '销售' }[r] || r)
const roleTag = (r) => ({ boss: 'danger', shop_owner: 'warning', coach: 'success', sales: 'primary' }[r] || '')

const onFilterChange = () => {
  page.current = 1
  loadData()
}

const onSizeChange = (size) => {
  page.size = size
  page.current = 1
  loadData()
}

const resetFilters = () => {
  filters.keyword = ''
  filters.role = null
  filters.storeId = null
  filters.status = null
  page.current = 1
  loadData()
}

// 点击角色统计卡片切换筛选
const toggleRoleFilter = (role) => {
  filters.role = filters.role === role ? null : role
  onFilterChange()
}

onMounted(async () => {
  await loadStores()
  // 店长预设门店筛选
  if (!isBoss.value) {
    filters.storeId = userInfo.storeId
  }
  loadData()
})
</script>

<style scoped>
.staff-page { padding: 20px 24px; }

/* ===== 工具栏筛选 ===== */
.filter-group {
  display: flex;
  align-items: center;
  gap: 6px;
}
.filter-label {
  font-size: 13px;
  color: #909399;
  white-space: nowrap;
  font-weight: 500;
}

/* ===== 角色统计卡片 ===== */
.role-stats {
  display: flex;
  gap: 12px;
  margin-bottom: 16px;
  flex-wrap: wrap;
}
.role-stat-card {
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
.role-stat-card:hover {
  border-color: #c0c4cc;
  box-shadow: 0 2px 8px rgba(0,0,0,0.08);
}
.role-stat-card.active {
  border-color: #409EFF;
  background: linear-gradient(135deg, #ecf5ff, #f0f9ff);
  box-shadow: 0 2px 12px rgba(64,158,255,0.15);
}
.role-stat-icon {
  width: 36px;
  height: 36px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  flex-shrink: 0;
}
.role-stat-info {
  display: flex;
  flex-direction: column;
  line-height: 1.2;
}
.role-stat-num {
  font-size: 20px;
  font-weight: 800;
  color: #303133;
}
.role-stat-label {
  font-size: 12px;
  color: #909399;
  margin-top: 2px;
}

/* ===== 表格 ===== */
.cell-store {
  font-size: 13px;
  color: #606266;
}
.cell-date {
  font-size: 13px;
  color: #909399;
}
.form-hint {
  font-size: 13px;
  color: #909399;
}
</style>
