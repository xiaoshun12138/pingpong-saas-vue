<template>
  <div class="page-card">
    <div class="page-toolbar">
      <div class="toolbar-left">
        <el-select v-if="isBoss" v-model="filterStoreId" placeholder="全部门店" clearable style="width:160px" @change="onFilterChange">
          <el-option v-for="s in stores" :key="s.id" :label="s.name" :value="s.id" />
        </el-select>
        <el-input v-model="filters.keyword" placeholder="姓名 / 手机号" clearable style="width:200px" @keyup.enter="loadData">
          <template #prefix><el-icon><Search /></el-icon></template>
        </el-input>
        <el-button type="primary" @click="loadData">查询</el-button>
      </div>
      <el-button type="primary" @click="openDialog()">
        <el-icon><Plus /></el-icon>&nbsp;新增员工
      </el-button>
    </div>
    <el-table :data="tableData" v-loading="loading" stripe style="width:100%">
      <el-table-column prop="id" label="ID" min-width="70" />
      <el-table-column prop="name" label="姓名" min-width="90">
        <template #default="{row}"><span class="cell-name">{{ row.name }}</span></template>
      </el-table-column>
      <el-table-column prop="phone" label="手机号" width="120" />
      <el-table-column prop="storeName" label="所属门店" min-width="120" />
      <el-table-column prop="role" label="角色" width="80" align="center">
        <template #default="{row}">
          <el-tag :type="roleTag(row.role)" size="small">{{ roleLabel(row.role) }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="entryDate" label="入职日期" width="100" align="center" />
      <el-table-column prop="status" label="状态" width="70" align="center">
        <template #default="{row}"><el-tag :type="row.status===1?'success':'info'" size="small">{{ row.status===1?'在职':'离职' }}</el-tag></template>
      </el-table-column>
      <el-table-column label="操作" width="70" align="center" fixed="right">
        <template #default="{row}">
          <el-tooltip content="编辑" placement="top"><el-button link type="primary" :icon="Edit" @click="openDialog(row)" /></el-tooltip>
          <el-tooltip content="删除" placement="top"><el-button link type="danger" :icon="Delete" @click="handleDelete(row)" /></el-tooltip>
        </template>
      </el-table-column>
    </el-table>
    <el-pagination v-model:current-page="page.current" v-model:page-size="page.size" :total="page.total" layout="total, prev, pager, next" @current-change="loadData" style="margin-top:16px;justify-content:flex-end" />
    <el-dialog v-model="dialogVisible" :title="form.id?'编辑员工':'新增员工'" width="500px" class="nice-dialog">
      <el-form :model="form" label-width="80px">
        <el-form-item label="姓名" required><el-input v-model="form.name" placeholder="请输入姓名" /></el-form-item>
        <el-form-item label="手机号" required><el-input v-model="form.phone" placeholder="请输入手机号" /></el-form-item>
        <el-form-item label="所属门店">
          <el-select v-model="form.storeId" placeholder="选择门店" style="width:100%" clearable>
            <el-option v-for="s in stores" :key="s.id" :label="s.name" :value="s.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="角色">
          <el-select v-model="form.role" style="width:100%">
            <el-option label="老板" value="boss" />
            <el-option label="店长" value="shop_owner" />
            <el-option label="教练" value="coach" />
            <el-option label="销售" value="sales" />
          </el-select>
        </el-form-item>
        <el-form-item v-if="!form.id" label="密码"><el-input v-model="form.password" placeholder="默认 123456" /></el-form-item>
        <el-form-item v-else label="密码"><span style="color:#909399;font-size:13px">修改密码请走专门接口</span></el-form-item>
        <el-form-item label="状态"><el-switch v-model="form.status" :active-value="1" :inactive-value="0" active-text="在职" inactive-text="离职" /></el-form-item>
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

const tableData = ref([]), loading = ref(false), saving = ref(false), dialogVisible = ref(false)
const userInfo = JSON.parse(localStorage.getItem('userInfo') || '{}')
const isBoss = computed(() => userInfo.role === 'boss')
const stores = ref([])
const filterStoreId = ref(null)
const page = reactive({ current: 1, size: 10, total: 0 })
const filters = reactive({ keyword: '' })
const form = reactive({ id: null, name: '', phone: '', storeId: null, role: 'coach', password: '123456', status: 1 })

const loadData = async () => {
  loading.value = true
  try {
    const res = await api.get('/staff', { params: { current: page.current, size: page.size, storeId: filterStoreId.value || undefined, keyword: filters.keyword || undefined } })
    const records = res.data.records
    if (stores.value.length > 0) {
      const map = Object.fromEntries(stores.value.map(s => [s.id, s.name]))
      records.forEach(r => r.storeName = map[r.storeId] || '-')
    }
    tableData.value = records; page.total = res.data.total
  } finally { loading.value = false }
}
const loadStores = async () => {
  try { const r = await api.get('/stores', { params: { size: 999 } }); stores.value = r.data.records } catch {}
}
const openDialog = (row) => {
  Object.assign(form, row || { id: null, name: '', phone: '', storeId: null, role: 'coach', password: '123456', status: 1 })
  dialogVisible.value = true
}
const handleSave = async () => {
  if (!form.name) return ElMessage.warning('请填写姓名')
  saving.value = true
  try {
    const payload = { ...form }
    // 编辑时不传 password，后端 PUT 会忽略此字段（已有字段保护）
    // 新增时如果 password 为空则用默认值
    if (form.id) {
      delete payload.password
    } else if (!payload.password) {
      payload.password = '123456'
    }
    form.id ? await api.put('/staff', payload) : await api.post('/staff', payload)
    ElMessage.success('保存成功'); dialogVisible.value = false; loadData()
  } finally { saving.value = false }
}
const handleDelete = (row) => {
  ElMessageBox.confirm('确认删除该员工？', '提示', { type: 'warning' }).then(async () => {
    await api.delete(`/staff/${row.id}`); ElMessage.success('已删除'); loadData()
  }).catch(() => {})
}
const roleLabel = (r) => ({ boss: '老板', shop_owner: '店长', coach: '教练', sales: '销售' }[r] || r)
const roleTag = (r) => ({ boss: 'danger', shop_owner: 'warning', coach: 'success', sales: 'primary' }[r] || '')
const onFilterChange = () => { page.current = 1; loadData() }
onMounted(async () => { await loadStores(); loadData() })
</script>

<style scoped>
.toolbar-left { display: flex; gap: 8px; align-items: center; }
.cell-name { font-weight: 600; color: #303133; }
</style>
