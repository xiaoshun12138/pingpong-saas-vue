<template>
  <div class="page-card">
    <div class="page-toolbar">
      <div class="toolbar-left">
        <span class="page-title">门店列表</span>
      </div>
      <el-button type="primary" @click="openDialog()">
        <el-icon><Plus /></el-icon>&nbsp;新增门店
      </el-button>
    </div>
    <el-table :data="tableData" v-loading="loading" stripe style="width:100%">
      <el-table-column prop="id" label="ID" width="70" />
      <el-table-column prop="name" label="门店名称" min-width="160">
        <template #default="{row}"><span class="cell-name">{{ row.name }}</span></template>
      </el-table-column>
      <el-table-column prop="address" label="地址" min-width="220" show-overflow-tooltip />
      <el-table-column prop="phone" label="电话" width="150" />
      <el-table-column prop="status" label="状态" width="80" align="center">
        <template #default="{row}"><el-tag :type="row.status===1?'success':'info'" size="small">{{ row.status===1?'营业':'停业' }}</el-tag></template>
      </el-table-column>
      <el-table-column label="操作" width="70" align="center" fixed="right">
        <template #default="{row}">
          <el-tooltip content="编辑" placement="top"><el-button link type="primary" :icon="Edit" @click="openDialog(row)" /></el-tooltip>
          <el-tooltip content="删除" placement="top"><el-button link type="danger" :icon="Delete" @click="handleDelete(row)" /></el-tooltip>
        </template>
      </el-table-column>
    </el-table>
    <el-pagination v-model:current-page="page.current" v-model:page-size="page.size" :total="page.total" layout="total, prev, pager, next" @current-change="loadData" style="margin-top:16px;justify-content:flex-end" />
    <el-dialog v-model="dialogVisible" :title="form.id?'编辑门店':'新增门店'" width="500px" class="nice-dialog">
      <el-form :model="form" label-width="80px">
        <el-form-item label="名称" required><el-input v-model="form.name" placeholder="请输入门店名称" /></el-form-item>
        <el-form-item label="地址"><el-input v-model="form.address" placeholder="请输入门店地址" /></el-form-item>
        <el-form-item label="电话"><el-input v-model="form.phone" placeholder="请输入联系电话" /></el-form-item>
        <el-form-item label="状态"><el-switch v-model="form.status" :active-value="1" :inactive-value="0" active-text="营业" inactive-text="停业" /></el-form-item>
      </el-form>
      <template #footer><el-button @click="dialogVisible=false">取消</el-button><el-button type="primary" @click="handleSave" :loading="saving">保存</el-button></template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Edit, Delete } from '@element-plus/icons-vue'
import api from '../api'

const tableData = ref([]), loading = ref(false), saving = ref(false), dialogVisible = ref(false)
const page = reactive({ current: 1, size: 10, total: 0 })
const form = reactive({ id: null, name: '', address: '', phone: '', status: 1 })

const loadData = async () => {
  loading.value = true
  try { const res = await api.get('/stores', { params: { current: page.current, size: page.size } }); tableData.value = res.data.records; page.total = res.data.total } finally { loading.value = false }
}
const openDialog = (row) => { Object.assign(form, row || { id: null, name: '', address: '', phone: '', status: 1 }); dialogVisible.value = true }
const handleSave = async () => {
  if (!form.name) return ElMessage.warning('请填写名称')
  saving.value = true
  try { form.id ? await api.put('/stores', form) : await api.post('/stores', form); ElMessage.success('保存成功'); dialogVisible.value = false; loadData() } finally { saving.value = false }
}
const handleDelete = (row) => { ElMessageBox.confirm('确认删除？', '提示', { type: 'warning' }).then(async () => { await api.delete(`/stores/${row.id}`); ElMessage.success('删除成功'); loadData() }).catch(() => {}) }
onMounted(loadData)
</script>

<style scoped>
.page-title { font-size: 16px; font-weight: 600; color: #303133; }
.cell-name { font-weight: 600; color: #303133; }
</style>
