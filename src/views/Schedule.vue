<template>
  <div class="schedule-page">
    <!-- 顶部：周导航 + 教练选择 -->
    <div class="sch-topbar">
      <div class="sch-date-nav">
        <el-button @click="prevWeek" circle size="small"><el-icon><ArrowLeft /></el-icon></el-button>
        <span class="sch-date-text">{{ weekLabel }}</span>
        <el-button @click="nextWeek" circle size="small"><el-icon><ArrowRight /></el-icon></el-button>
        <el-button @click="goThisWeek" size="small" plain>本周</el-button>
      </div>
      <div class="sch-topbar-right">
        <span class="sch-coach-label">教练</span>
        <el-select v-model="activeCoachId" placeholder="选择教练" style="width:140px" @change="loadSchedule">
          <el-option v-for="c in coaches" :key="c.id" :label="c.name" :value="c.id" />
        </el-select>
        <el-tag v-if="weekStats.total > 0" type="success" size="small" effect="plain">本周消课 {{ weekStats.total }} 节</el-tag>
      </div>
    </div>

    <!-- 周课表网格 -->
    <div class="sch-grid-wrap" v-loading="loading">
      <div class="sch-grid-scroll">
        <table class="sch-grid" v-if="activeCoachId">
          <thead>
            <tr>
              <th class="sch-time-col">时段</th>
              <th v-for="d in weekDays" :key="d.date" class="sch-day-col" :class="{ today: d.isToday }">
                <div class="sch-day-name">{{ d.weekday }}<span v-if="d.isToday" class="sch-today-dot"></span></div>
                <div class="sch-day-date">{{ d.label }}</div>
              </th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="slot in timeSlots" :key="slot.key" :class="{ 'sch-now-row': isCurrentSlot(slot) }">
              <td class="sch-time-col">
                <span class="sch-time-label">{{ slot.startTime }}</span>
                <span class="sch-time-end">{{ slot.endTime }}</span>
              </td>
              <td
                v-for="d in weekDays"
                :key="d.date"
                class="sch-cell"
                :class="{ 'sch-has-lesson': getBookings(d.date, slot.key).length > 0, 'sch-cell-today': d.isToday }"
                @click="cellClick(d.date, slot)"
              >
                <div class="sch-booking-list">
                  <div
                    v-for="(b, i) in getBookings(d.date, slot.key)"
                    :key="b.id || i"
                    class="sch-booking"
                    :style="{ background: b.color }"
                    @click.stop="editBooking(d.date, slot, b)"
                  >
                    <span class="sch-student-name">{{ b.studentName }}</span>
                    <span class="sch-lesson-info" v-if="b.courseTypeName">{{ b.courseTypeName }}</span>
                    <span class="sch-remaining" v-if="b.remainingLessons !== undefined">余{{ b.remainingLessons }}</span>
                  </div>
                  <div v-if="getBookings(d.date, slot.key).length === 0" class="sch-empty">+</div>
                  <div v-else-if="getBookings(d.date, slot.key).length < 6" class="sch-add-more">+</div>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
        <div v-else class="sch-placeholder">👈 请选择一位教练查看周课表</div>
      </div>
    </div>

    <!-- 批量消课弹窗 -->
    <el-dialog v-model="editVisible" :title="editingBooking ? '编辑消课' : '批量消课'" width="680px" @close="resetEditForm" :close-on-click-modal="false">
      <div class="batch-info">
        <el-tag type="info" size="small">教练：{{ activeCoach?.name }}</el-tag>
        <el-tag size="small">{{ editForm.dateLabel }}</el-tag>
        <el-tag size="small">{{ editForm.startTime }} - {{ editForm.endTime }}</el-tag>
        <el-tag v-if="editForm.lessonContent" type="warning" size="small">{{ editForm.lessonContent }}</el-tag>
      </div>

      <div class="batch-rows" v-if="!editingBooking">
        <div class="batch-row" v-for="(row, idx) in rows" :key="idx">
          <span class="batch-num">{{ idx + 1 }}</span>
          <el-select v-model="row.studentId" filterable placeholder="选择学员" style="width:200px" @change="onStudentChange(idx)" clearable>
            <el-option v-for="s in availableStudents(idx)" :key="s.id" :label="`${s.name}（${s.phone || '-'}）`" :value="s.id" />
          </el-select>
          <el-select v-model="row.courseOrderId" placeholder="课包" style="width:220px" clearable :disabled="!row.studentId">
            <el-option v-for="o in (rowOrders[idx] || [])" :key="o.id" :label="`${o.courseTypeName || '课包'} - 余${o.remainingLessons}课时`" :value="o.id" />
          </el-select>
          <el-button v-if="rows.length > 1" @click="removeRow(idx)" :icon="Delete" circle size="small" type="danger" />
        </div>
        <el-button v-if="rows.length < maxSlots" @click="addRow" type="primary" plain size="small" :icon="Plus" style="margin-top:8px">添加学员</el-button>
      </div>

      <div v-else class="edit-single">
        <el-select v-model="editForm.studentId" filterable placeholder="选择学员" style="width:220px" @change="loadStudentOrders" clearable>
          <el-option v-for="s in students" :key="s.id" :label="`${s.name}（${s.phone || '-'}）`" :value="s.id" />
        </el-select>
        <el-select v-model="editForm.courseOrderId" placeholder="课包" style="width:260px" clearable :disabled="!editForm.studentId">
          <el-option v-for="o in studentOrders" :key="o.id" :label="`${o.courseTypeName || '课包'} - 余${o.remainingLessons}课时`" :value="o.id" />
        </el-select>
      </div>

      <el-form :model="editForm" label-width="80px" style="margin-top:16px">
        <el-form-item label="课程内容">
          <el-input v-model="editForm.lessonContent" placeholder="如：正手攻球、多球训练" />
        </el-form-item>
        <el-form-item label="备注">
          <el-input v-model="editForm.remark" type="textarea" :rows="2" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button v-if="editingBooking" type="danger" @click="handleDelete" :loading="saving" style="margin-right:auto">取消消课</el-button>
        <el-button @click="editVisible = false">关闭</el-button>
        <el-button type="primary" @click="handleSave" :loading="saving">{{ editingBooking ? '保存' : `批量消课（${rows.length}人）` }}</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import api from '../api'

const userInfo = JSON.parse(localStorage.getItem('userInfo') || '{}')
const myStoreId = userInfo.storeId

// ===== 教练 & 学员 =====
const coaches = ref([])
const students = ref([])
const activeCoachId = ref(null)
const activeCoach = computed(() => coaches.value.find(c => c.id === activeCoachId.value) || null)

// 本周统计
const weekStats = computed(() => {
  const total = scheduleData.value.length
  const uniqueStudents = new Set(scheduleData.value.map(s => s.studentId)).size
  return { total, uniqueStudents }
})

// 判断是否当前时间段（只对今天有效）
const isCurrentSlot = (slot) => {
  const now = new Date()
  const todayStr = now.toISOString().slice(0, 10)
  const hh = String(now.getHours()).padStart(2, '0')
  const mm = String(now.getMinutes()).padStart(2, '0')
  const nowTime = `${hh}:${mm}`
  return slot.startTime <= nowTime && nowTime < slot.endTime
}

// ===== 周日期 =====
const weekOffset = ref(0)  // 0=本周, -1=上周, 1=下周

const weekDays = computed(() => {
  const today = new Date()
  const dayOfWeek = today.getDay() || 7  // 周日=7
  const monday = new Date(today)
  monday.setDate(today.getDate() - dayOfWeek + 1 + weekOffset.value * 7)

  const names = ['周一', '周二', '周三', '周四', '周五', '周六', '周日']
  const result = []
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday)
    d.setDate(monday.getDate() + i)
    const dateStr = d.toISOString().slice(0, 10)
    result.push({
      date: dateStr,
      weekday: names[i],
      label: `${d.getMonth() + 1}/${d.getDate()}`,
      isToday: dateStr === today.toISOString().slice(0, 10)
    })
  }
  return result
})

const weekLabel = computed(() => {
  if (weekDays.value.length < 2) return ''
  const first = weekDays.value[0].label
  const last = weekDays.value[6].label
  const label = weekOffset.value === 0 ? '本周' : weekOffset.value === -1 ? '上周' : weekOffset.value === 1 ? '下周' : `第${weekOffset.value > 0 ? '+' : ''}${weekOffset.value}周`
  return `${label}  ${first} - ${last}`
})

const prevWeek = () => { weekOffset.value--; loadSchedule() }
const nextWeek = () => { weekOffset.value++; loadSchedule() }
const goThisWeek = () => { weekOffset.value = 0; loadSchedule() }

// ===== 时间段（6个固定时段） =====
const timeSlots = [
  { key: '09:00-10:30', label: '09:00\n10:30', startTime: '09:00', endTime: '10:30' },
  { key: '10:30-12:00', label: '10:30\n12:00', startTime: '10:30', endTime: '12:00' },
  { key: '14:30-16:00', label: '14:30\n16:00', startTime: '14:30', endTime: '16:00' },
  { key: '16:00-17:30', label: '16:00\n17:30', startTime: '16:00', endTime: '17:30' },
  { key: '17:30-19:00', label: '17:30\n19:00', startTime: '17:30', endTime: '19:00' },
  { key: '19:00-20:30', label: '19:00\n20:30', startTime: '19:00', endTime: '20:30' }
]

// ===== 排课数据 =====
const scheduleData = ref([])  // 一周的所有排课记录
const loading = ref(false)

// 颜色调色板（按学员ID固定颜色）
const palette = [
  '#e8f5e9', '#e3f2fd', '#fff3e0', '#fce4ec', '#f3e5f5',
  '#e0f7fa', '#e8eaf6', '#f1f8e9', '#fff8e1', '#efebe9',
  '#e8f0fe', '#fef7e0', '#fde0f0', '#e0f2f1', '#f0f4c3'
]
let colorI = 0
const colorMap = {}
const getColor = (studentId) => {
  if (!colorMap[studentId]) colorMap[studentId] = palette[colorI++ % palette.length]
  return colorMap[studentId]
}

// 从 scheduleData 中提取某天某时段的排课
const getBookings = (date, slotKey) => {
  return scheduleData.value.filter(s => {
    const sDate = typeof s.scheduleDate === 'string' ? s.scheduleDate : s.scheduleDate
    const slotStart = slotKey.split('-')[0]
    const sTime = (s.startTime || '').substring(0, 5)
    return sDate === date && sTime === slotStart
  })
}

// ===== 弹窗 =====
const editVisible = ref(false)
const saving = ref(false)
const editingBooking = ref(false) // 新建=批量，编辑=单个
const studentOrders = ref([])      // 编辑单个时用
const maxSlots = 6

// 批量行 [{studentId, courseOrderId}]
const rows = ref([{ studentId: null, courseOrderId: null }])
const rowOrders = ref([])  // rows[0]={studentId, courseOrderId} → rowOrders[0]=[{...orders}]

const editForm = ref({
  id: null,
  lessonContent: '', remark: '',
  date: '', dateLabel: '', startTime: '', endTime: ''
})

const resetEditForm = () => {
  editingBooking.value = false
  editForm.value = { id: null, lessonContent: '', remark: '', date: '', dateLabel: '', startTime: '', endTime: '', studentId: null, courseOrderId: null }
  studentOrders.value = []
  rows.value = [{ studentId: null, courseOrderId: null }]
  rowOrders.value = []
}

const addRow = () => {
  if (rows.value.length >= maxSlots) return
  const existing = getBookings(editForm.value.date, `${editForm.value.startTime}-${editForm.value.endTime}`)
  if (existing.length + rows.value.length >= maxSlots) { ElMessage.warning(`该时段最多${maxSlots}人`); return }
  rows.value.push({ studentId: null, courseOrderId: null })
}

const removeRow = (idx) => {
  rows.value.splice(idx, 1)
  rowOrders.value.splice(idx, 1)
}

// 已选的学员ID（防止重复选同一个人）
const selectedStudentIds = computed(() => rows.value.map(r => r.studentId).filter(Boolean))

const availableStudents = (skipIdx) => {
  const skipId = rows.value[skipIdx]?.studentId
  return students.value.filter(s => !selectedStudentIds.value.includes(s.id) || s.id === skipId)
}

const onStudentChange = async (idx) => {
  const sid = rows.value[idx].studentId
  rows.value[idx].courseOrderId = null
  if (!sid) { rowOrders.value[idx] = []; return }
  try {
    const r = await api.get('/course-orders', { params: { studentId: sid, status: 'active', size: 999 } })
    rowOrders.value[idx] = r.data.records || []
  } catch { rowOrders.value[idx] = [] }
}

// ===== 数据加载 =====
const loadCoaches = async () => {
  try {
    const r = await api.get('/staff', { params: { storeId: myStoreId, size: 999 } })
    coaches.value = (r.data.records || r.data || []).filter(s => s.role === 'coach' || s.role === 'shop_owner')
  } catch {}
}

const loadStudents = async () => {
  try {
    const r = await api.get('/students', { params: { storeId: myStoreId, size: 9999 } })
    students.value = r.data.records || r.data || []
  } catch {}
}

const loadSchedule = async () => {
  if (!activeCoachId.value) return
  loading.value = true
  try {
    // 查询本周7天的排课：逐天查或一次查
    // 后端支持 coachId + date 参数，我们查周一的日期让它返回全部（如果后端不支持范围）
    // 实际后端是精确匹配 date，所以我们并行查7天
    const days = weekDays.value.map(d => d.date)
    const results = await Promise.all(
      days.map(date => 
        api.get('/schedules', { params: { coachId: activeCoachId.value, date } })
           .catch(() => ({ data: { records: [] } }))
      )
    )
    const all = []
    results.forEach(r => {
      const recs = r.data.records || r.data || []
      recs.forEach(s => {
        s.color = getColor(s.studentId)
        // 填充学员名
        const stu = students.value.find(x => x.id === s.studentId)
        if (stu) s.studentName = stu.name
        all.push(s)
      })
    })
    // 先赋值让页面渲染
    scheduleData.value = all
    // 再异步批量填充课包信息（避免每条记录单独发请求导致渲染时没数据）
    const orderIds = [...new Set(all.map(s => s.courseOrderId).filter(Boolean))]
    if (orderIds.length > 0) {
      const orderMap = {}
      await Promise.all(orderIds.map(id =>
        api.get(`/course-orders/${id}`).then(res => {
          orderMap[id] = res.data
        }).catch(() => {})
      ))
      all.forEach(s => {
        if (s.courseOrderId && orderMap[s.courseOrderId]) {
          s.courseTypeName = orderMap[s.courseOrderId].courseTypeName || ''
          s.remainingLessons = orderMap[s.courseOrderId].remainingLessons
        }
      })
      scheduleData.value = [...all]
    }
  } catch {
    scheduleData.value = []
  } finally {
    loading.value = false
  }
}

const loadStudentOrders = async (studentId) => {
  if (!studentId) { studentOrders.value = []; return }
  try {
    const r = await api.get('/course-orders', { params: { studentId, status: 'active', size: 999 } })
    studentOrders.value = r.data.records || []
  } catch { studentOrders.value = [] }
}

// ===== 交互 =====
const cellClick = (date, slot) => {
  if (!activeCoachId.value) return
  const dayInfo = weekDays.value.find(d => d.date === date)
  editingBooking.value = false
  editForm.value = {
    id: null, lessonContent: '', remark: '',
    date, dateLabel: `${dayInfo.weekday} ${dayInfo.label}`,
    startTime: slot.startTime, endTime: slot.endTime
  }
  rows.value = [{ studentId: null, courseOrderId: null }]
  rowOrders.value = []
  if (students.value.length === 0) loadStudents()
  editVisible.value = true
}

const editBooking = (date, slot, booking) => {
  editingBooking.value = true
  const dayInfo = weekDays.value.find(d => d.date === date)
  editForm.value = {
    id: booking.id,
    lessonContent: booking.lessonContent || '', remark: booking.remark || '',
    date, dateLabel: `${dayInfo.weekday} ${dayInfo.label}`,
    startTime: slot.startTime, endTime: slot.endTime
  }
  // 编辑单个时，复用 loadStudentOrders 填充课包
  loadStudentOrders(booking.studentId)
  // 把 studentId/courseOrderId 临时挂在 editForm 上给模板用
  editForm.value.studentId = booking.studentId
  editForm.value.courseOrderId = booking.courseOrderId
  editVisible.value = true
}

const handleSave = async () => {
  if (editingBooking.value) {
    // ===== 编辑单个 =====
    if (!editForm.value.studentId) { ElMessage.warning('请选择学员'); return }
    saving.value = true
    try {
      await api.put('/schedules', {
        id: editForm.value.id,
        storeId: myStoreId,
        coachId: activeCoachId.value,
        studentId: editForm.value.studentId,
        courseOrderId: editForm.value.courseOrderId || null,
        scheduleDate: editForm.value.date,
        startTime: editForm.value.startTime,
        endTime: editForm.value.endTime,
        lessonContent: editForm.value.lessonContent,
        remark: editForm.value.remark
      })
      ElMessage.success('保存成功')
      editVisible.value = false
      loadSchedule()
    } catch (e) {
      ElMessage.error(e?.response?.data?.message || e?.message || '保存失败')
    } finally { saving.value = false }
    return
  }

  // ===== 批量消课 =====
  const validRows = rows.value.filter(r => r.studentId && r.courseOrderId)
  if (validRows.length === 0) { ElMessage.warning('请至少完善一条学员课包'); return }

  const existing = getBookings(editForm.value.date, `${editForm.value.startTime}-${editForm.value.endTime}`)
  if (existing.length + validRows.length > maxSlots) {
    ElMessage.warning(`该时段已有${existing.length}人，最多再添加${maxSlots - existing.length}人`)
    return
  }

  saving.value = true
  let ok = 0, fail = 0
  for (const row of validRows) {
    try {
      await api.post('/schedules', {
        storeId: myStoreId,
        coachId: activeCoachId.value,
        studentId: row.studentId,
        courseOrderId: row.courseOrderId,
        scheduleDate: editForm.value.date,
        startTime: editForm.value.startTime,
        endTime: editForm.value.endTime,
        lessonContent: editForm.value.lessonContent,
        remark: editForm.value.remark
      })
      ok++
    } catch (e) {
      fail++
      console.error('消课失败 row=', row, e)
    }
  }
  saving.value = false
  ElMessage.success(`消课完成：成功${ok}人` + (fail ? `，失败${fail}人` : ''))
  if (ok > 0) { editVisible.value = false; loadSchedule() }
}

const handleDelete = () => {
  ElMessageBox.confirm('确认取消该消课？', '提示', { type: 'warning' })
    .then(async () => {
      try {
        await api.delete(`/schedules/${editForm.value.id}`)
        ElMessage.success('已取消排课')
        editVisible.value = false
        loadSchedule()
      } catch { ElMessage.error('取消失败') }
    }).catch(() => {})
}

onMounted(async () => {
  // 先加载学员和教练，再加载课表，否则课表里没名字
  await Promise.all([loadCoaches(), loadStudents()])
  if (coaches.value.length) {
    activeCoachId.value = coaches.value[0].id
    loadSchedule()
  }
})
</script>

<style scoped>
.schedule-page { max-width: 100%; }

.sch-topbar {
  background: #fff; padding: 10px 16px; border-radius: 10px;
  display: flex; align-items: center; justify-content: space-between;
  box-shadow: 0 1px 3px rgba(0,0,0,0.06); margin-bottom: 12px;
  flex-wrap: wrap; gap: 8px;
}
.sch-date-nav { display: flex; align-items: center; gap: 6px; }
.sch-date-text { font-size: 15px; font-weight: 600; min-width: 180px; text-align: center; color: #303133; }
.sch-topbar-right { display: flex; align-items: center; gap: 8px; }
.sch-coach-label { font-size: 13px; color: #909399; }

.sch-grid-wrap {
  background: #fff; border-radius: 10px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.06); overflow: hidden;
}
.sch-grid-scroll { overflow: auto; max-height: calc(100vh - 160px); }
.sch-placeholder {
  display: flex; align-items: center; justify-content: center;
  height: 400px; color: #909399; font-size: 16px;
}

.sch-grid { width: 100%; border-collapse: collapse; table-layout: fixed; min-width: 860px; }
.sch-grid th {
  background: #f5f7fa; padding: 6px 4px; border: 1px solid #ebeef5;
  font-weight: 500; text-align: center; position: relative;
}
.sch-day-col.today { background: #ecf5ff; }
.sch-day-col.today .sch-day-name { color: #409EFF; }
.sch-today-dot {
  display: inline-block; width: 6px; height: 6px; border-radius: 50%;
  background: #409EFF; margin-left: 4px; vertical-align: middle;
}
.sch-day-name { font-size: 13px; color: #303133; font-weight: 600; }
.sch-day-date { font-size: 11px; color: #909399; margin-top: 1px; }

.sch-grid td { border: 1px solid #ebeef5; vertical-align: top; }

.sch-time-col {
  width: 70px; text-align: center; background: #fafafa;
  font-size: 12px; color: #606266; padding: 4px 0;
}
.sch-time-label { display: block; font-weight: 600; color: #303133; }
.sch-time-end { display: block; color: #c0c4cc; font-size: 11px; margin-top: 1px; }

/* 当前时段行高亮 */
.sch-now-row .sch-time-col {
  background: #f0f9ff; border-left: 3px solid #409EFF;
}
.sch-now-row .sch-time-label { color: #409EFF; }

.sch-cell {
  height: 64px; padding: 2px; cursor: pointer; transition: background 0.12s;
  vertical-align: top;
}
.sch-cell-today { background: #fafcff; }
.sch-cell:hover:not(.sch-has-lesson) { background: #f0f9ff; }
.sch-has-lesson:hover { opacity: 0.95; }

.sch-booking-list {
  display: flex; flex-direction: column; gap: 2px;
  height: 100%; overflow: hidden;
}

.sch-booking {
  border-radius: 4px; padding: 2px 6px;
  display: flex; align-items: center; gap: 4px;
  cursor: pointer; transition: transform 0.1s, box-shadow 0.1s;
  font-size: 12px; min-height: 20px; line-height: 1.3;
}
.sch-booking:hover { transform: scale(1.03); box-shadow: 0 1px 4px rgba(0,0,0,0.1); }
.sch-student-name { font-weight: 600; color: #303133; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; flex-shrink: 0; }
.sch-lesson-info { font-size: 10px; color: #606266; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; flex: 1; }
.sch-remaining { font-size: 10px; color: #606266; font-weight: 600; flex-shrink: 0; background: rgba(255,255,255,0.7); border-radius: 2px; padding: 0 3px; }

.sch-empty {
  display: flex; align-items: center; justify-content: center;
  height: 100%; color: transparent; font-size: 18px; font-weight: 300;
}
.sch-cell:hover .sch-empty { color: #d0d0d0; }

.sch-add-more {
  font-size: 11px; color: #409EFF; text-align: center;
  padding: 1px; cursor: pointer; font-weight: 600;
}

.batch-info {
  display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 16px;
}
.batch-rows { margin-bottom: 8px; }
.batch-row {
  display: flex; align-items: center; gap: 10px; margin-bottom: 8px;
}
.batch-num {
  display: inline-flex; align-items: center; justify-content: center;
  width: 24px; height: 24px; border-radius: 50%;
  background: #409EFF; color: #fff; font-size: 12px; font-weight: 600; flex-shrink: 0;
}
.edit-single {
  display: flex; gap: 10px; align-items: center; margin-bottom: 8px;
}
</style>
