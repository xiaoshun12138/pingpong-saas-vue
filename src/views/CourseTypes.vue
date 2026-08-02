<template>
  <div class="page-card">
    <div class="page-toolbar">
      <div class="toolbar-left">
        <span class="page-title">课包配置</span>
      </div>
      <el-button type="primary" @click="openDialog()">
        <el-icon><Plus /></el-icon>&nbsp;新增课包
      </el-button>
    </div>
    <el-row :gutter="16" v-if="tableData.length" justify="start">
      <el-col :xs="24" :sm="12" :md="8" :lg="6" v-for="ct in tableData" :key="ct.id" style="margin-bottom:16px">
        <el-card class="course-card" shadow="hover">
          <div class="course-header">
            <span class="course-name">{{ ct.name }}</span>
            <el-tag :type="ct.status===1?'success':'info'" size="small">{{ ct.status===1?'上架':'下架' }}</el-tag>
          </div>
          <div class="course-body">
            <div class="course-stat"><span class="label">总课时</span><span class="value">{{ ct.totalLessons }} 节</span></div>
            <div class="course-stat"><span class="label">价格</span><span class="value price">¥{{ Number(ct.listPrice).toFixed(2) }}</span></div>
          </div>
          <div class="course-actions">
            <el-tooltip content="编辑" placement="top"><el-button link type="primary" :icon="Edit" @click="openDialog(ct)" /></el-tooltip>
            <el-tooltip content="删除" placement="top"><el-button link type="danger" :icon="Delete" @click="handleDelete(ct)" /></el-tooltip>
          </div>
        </el-card>
      </el-col>
    </el-row>
    <el-empty v-else description="暂无课包" />
    <el-pagination v-model:current-page="page.current" v-model:page-size="page.size" :total="page.total" :page-sizes="[10,20,50]" layout="total, sizes, prev, pager, next" @size-change="onSizeChange" @current-change="loadData" style="margin-top:8px;justify-content:flex-end" />
    <el-dialog v-model="dialogVisible" :title="form.id?'编辑课包':'新增课包'" width="480px" class="nice-dialog">
      <el-form :model="form" label-width="90px">
        <el-form-item label="课包名称" required><el-input v-model="form.name" placeholder="如：少儿启蒙 48课时" /></el-form-item>
        <el-form-item label="总课时" required><el-input-number v-model="form.totalLessons" :min="1" style="width:100%" /></el-form-item>
        <el-form-item label="标价" required><el-input-number v-model="form.listPrice" :min="0" :precision="2" style="width:100%" /></el-form-item>
        <el-form-item label="状态"><el-switch v-model="form.status" :active-value="1" :inactive-value="0" active-text="上架" inactive-text="下架" /></el-form-item>
      </el-form>
      <template #footer><el-button @click="dialogVisible=false">取消</el-button><el-button type="primary" @click="handleSave" :loading="saving">保存</el-button></template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { Edit, Delete } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import api from '../api'

const tableData = ref([]), loading = ref(false), saving = ref(false), dialogVisible = ref(false)
const page = reactive({ current: 1, size: 12, total: 0 })
const form = reactive({ id: null, name: '', totalLessons: 10, listPrice: 0, status: 1 })

const onSizeChange = (s) => { page.size = s; page.current = 1; loadData() }
const loadData = async () => {
  loading.value = true
  try { const res = await api.get('/course-types', { params: { current: page.current, size: page.size } }); tableData.value = res.data.records; page.total = res.data.total } finally { loading.value = false }
}
const openDialog = (row) => { Object.assign(form, row || { id: null, name: '', totalLessons: 10, listPrice: 0, status: 1 }); dialogVisible.value = true }
const handleSave = async () => {
  if (!form.name) return ElMessage.warning('请填写名称')
  saving.value = true
  try { form.id ? await api.put('/course-types', form) : await api.post('/course-types', form); ElMessage.success('保存成功'); dialogVisible.value = false; loadData() } finally { saving.value = false }
}
const handleDelete = (row) => { ElMessageBox.confirm('确认删除？', '提示', { type: 'warning' }).then(async () => { await api.delete(`/course-types/${row.id}`); ElMessage.success('删除成功'); loadData() }).catch(() => {}) }
onMounted(loadData)
</script>

<style scoped>
.page-title { font-size: 16px; font-weight: 600; color: #303133; }
.course-card { border-radius: 10px; position: relative; overflow: hidden; }
.course-card::before {
  content: '';
  position: absolute; top: 0; left: 0; right: 0; height: 4px;
  background: linear-gradient(90deg, #409EFF, #36cfc9);
}
.course-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px; }
.course-name { font-size: 16px; font-weight: 700; color: #303133; }
.course-body { display: flex; gap: 24px; margin-bottom: 16px; }
.course-stat { display: flex; flex-direction: column; gap: 4px; }
.course-stat .label { font-size: 12px; color: #909399; }
.course-stat .value { font-size: 18px; font-weight: 700; color: #303133; }
.course-stat .value.price { color: #F56C6C; }
.course-actions { display: flex; justify-content: flex-end; gap: 4px; border-top: 1px solid #f0f2f5; padding-top: 12px; }
</style>
