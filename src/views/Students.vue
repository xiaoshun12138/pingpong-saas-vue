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
      <el-button type="primary" @click="openDialog()">
        <el-icon><Plus /></el-icon>&nbsp;新增学员
      </el-button>
    </div>
    <el-table :data="tableData" v-loading="loading" stripe style="width:100%">
      <el-table-column prop="id" label="ID" min-width="70" />
      <el-table-column prop="name" label="姓名" min-width="90">
        <template #default="{row}"><span class="cell-name">{{ row.name }}</span></template>
      </el-table-column>
      <el-table-column prop="phone" label="手机号" width="120" />
      <el-table-column prop="age" label="年龄" width="60" align="center" />
      <el-table-column v-if="isBoss" prop="storeName" label="所属门店" min-width="110" />
      <el-table-column prop="totalRemainingLessons" label="剩余课时" width="80" align="center">
        <template #default="{row}">
          <el-tag :type="row.totalRemainingLessons > 0 ? 'success' : 'info'" size="small">{{ row.totalRemainingLessons }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="status" label="状态" width="70" align="center">
        <template #default="{row}"><el-tag :type="row.status===1?'success':'info'" size="small">{{ row.status===1?'在读':'停课' }}</el-tag></template>
      </el-table-column>
      <el-table-column prop="source" label="来源" min-width="100" show-overflow-tooltip />
      <el-table-column label="操作" width="100" fixed="right" align="center">
        <template #default="{row}">
          <el-tooltip content="编辑" placement="top"><el-button link type="primary" :icon="Edit" @click="openDialog(row)" /></el-tooltip>
          <el-tooltip content="删除" placement="top"><el-button link type="danger" :icon="Delete" @click="handleDelete(row)" /></el-tooltip>
        </template>
      </el-table-column>
    </el-table>
    <el-pagination v-model:current-page="page.current" v-model:page-size="page.size" :total="page.total" layout="total, prev, pager, next" @current-change="loadData" style="margin-top:16px;justify-content:flex-end" />
    <el-dialog v-model="dialogVisible" :title="form.id?'编辑学员':'新增学员'" width="480px" class="nice-dialog">
      <el-form :model="form" label-width="80px">
        <el-form-item label="姓名" required><el-input v-model="form.name" placeholder="请输入姓名" /></el-form-item>
        <el-form-item label="手机号"><el-input v-model="form.phone" placeholder="请输入手机号" /></el-form-item>
        <el-form-item label="年龄"><el-input-number v-model="form.age" :min="3" :max="80" /></el-form-item>
        <el-form-item v-if="isBoss" label="所属门店">
          <el-select v-model="form.storeId" placeholder="选择门店" style="width:100%">
            <el-option v-for="s in stores" :key="s.id" :label="s.name" :value="s.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="来源"><el-input v-model="form.source" placeholder="如：抖音、美团、转介绍" /></el-form-item>
        <el-form-item label="状态"><el-switch v-model="form.status" :active-value="1" :inactive-value="0" active-text="在读" inactive-text="停课" /></el-form-item>
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
const stores = ref([])
const filterStoreId = ref(null)
const page = reactive({ current: 1, size: 10, total: 0 })
const filters = reactive({ keyword: '' })
const form = reactive({ id: null, name: '', phone: '', age: 10, storeId: 1, source: '', status: 1 })

const loadStores = async () => {
  try { const r = await api.get('/stores', { params: { size: 999 } }); stores.value = r.data.records } catch {}
}
const loadData = async () => {
  loading.value = true
  try {
    const res = await api.get('/students', { params: { current: page.current, size: page.size, storeId: filterStoreId.value || undefined, keyword: filters.keyword || undefined } })
    const records = res.data.records
    if (stores.value.length > 0) {
      const map = Object.fromEntries(stores.value.map(s => [s.id, s.name]))
      records.forEach(r => r.storeName = map[r.storeId] || `门店${r.storeId}`)
    }
    tableData.value = records; page.total = res.data.total
  } finally { loading.value = false }
}
const onFilterChange = () => { page.current = 1; loadData() }
const openDialog = (row) => {
  const def = { id: null, name: '', phone: '', age: 10, storeId: myStoreId.value || 1, source: '', status: 1 }
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
onMounted(async () => { await loadStores(); loadData() })
</script>

<style scoped>
.toolbar-left { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }
.cell-name { font-weight: 600; color: #303133; }
</style>
