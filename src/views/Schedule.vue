<template>
  <div class="schedule-page">
    <!-- 顶部：周导航 + 教练选择 -->
    <div class="sch-topbar">
      <div class="sch-date-nav">
        <el-button @click="prevWeek" circle><el-icon><ArrowLeft /></el-icon></el-button>
        <span class="sch-date-text">{{ weekLabel }}</span>
        <el-button @click="nextWeek" circle><el-icon><ArrowRight /></el-icon></el-button>
        <el-button @click="goThisWeek" size="small">本周</el-button>
      </div>
      <div class="sch-topbar-right">
        <el-select v-model="activeCoachId" placeholder="选择教练" style="width:160px" @change="loadSchedule">
          <el-option v-for="c in coaches" :key="c.id" :label="c.name" :value="c.id" />
        </el-select>
        <el-tag type="info">{{ activeCoach?.name || '未选择' }} 的课表</el-tag>
      </div>
    </div>

    <!-- 周课表网格 -->
    <div class="sch-grid-wrap" v-loading="loading">
      <div class="sch-grid-scroll">
        <table class="sch-grid" v-if="activeCoachId">
          <thead>
            <tr>
              <th class="sch-time-col">时间段</th>
              <th v-for="d in weekDays" :key="d.date" class="sch-day-col" :class="{ today: d.isToday }">
                <div class="sch-day-name">{{ d.weekday }}</div>
                <div class="sch-day-date">{{ d.label }}</div>
              </th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="slot in timeSlots" :key="slot.key">
              <td class="sch-time-col">
                <span class="sch-time-label">{{ slot.label }}</span>
              </td>
              <td
                v-for="d in weekDays"
                :key="d.date"
                class="sch-cell"
                :class="{ 'sch-has-lesson': getBookings(d.date, slot.key).length > 0 }"
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
                    <el-icon v-if="i === 0" class="sch-booking-count">{{ getBookings(d.date, slot.key).length }}/6</el-icon>
                  </div>
                  <div v-if="getBookings(d.date, slot.key).length === 0" class="sch-empty">+</div>
                  <div v-else-if="getBookings(d.date, slot.key).length < 6" class="sch-add-more">+ 添加</div>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
        <div v-else class="sch-placeholder">👈 请选择一位教练查看周课表</div>
      </div>
    </div>

    <!-- 添加/编辑排课弹窗 -->
    <el-dialog v-model="editVisible" :title="editForm.id ? '编辑排课' : '添加排课'" width="520px" @close="resetEditForm">
      <el-form :model="editForm" label-width="90px">
        <el-form-item label="教练">
          <span class="form-text">{{ activeCoach?.name }}</span>
        </el-form-item>
        <el-form-item label="日期">
          <span class="form-text">{{ editForm.dateLabel }}</span>
        </el-form-item>
        <el-form-item label="时间段">
          <span class="form-text">{{ editForm.startTime }} - {{ editForm.endTime }}</span>
        </el-form-item>
        <el-form-item label="学员" required>
          <el-select v-model="editForm.studentId" filterable placeholder="搜索学员姓名/手机号" style="width:100%">
            <el-option v-for="s in students" :key="s.id" :label="`${s.name}（${s.phone || '无手机'}）`" :value="s.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="关联订单">
          <el-select v-model="editForm.courseOrderId" placeholder="选中学员后自动推荐" style="width:100%" clearable>
            <el-option v-for="o in studentOrders" :key="o.id" :label="`${o.orderNo} 余${o.remainingLessons}课时`" :value="o.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="课程内容">
          <el-input v-model="editForm.lessonContent" placeholder="如：正手攻球、多球训练" />
        </el-form-item>
        <el-form-item label="备注">
          <el-input v-model="editForm.remark" type="textarea" :rows="2" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button v-if="editForm.id" type="danger" @click="handleDelete" :loading="saving" style="margin-right:auto">取消排课</el-button>
        <el-button @click="editVisible = false">关闭</el-button>
        <el-button type="primary" @click="handleSave" :loading="saving">保存</el-button>
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
    return sDate === date && s.startTime === slotKey.split('-')[0]
  })
}

// ===== 弹窗 =====
const editVisible = ref(false)
const saving = ref(false)
const studentOrders = ref([])
const editForm = ref({
  id: null, studentId: null, courseOrderId: null,
  lessonContent: '', remark: '',
  date: '', dateLabel: '', startTime: '', endTime: ''
})

const resetEditForm = () => {
  editForm.value = { id: null, studentId: null, courseOrderId: null, lessonContent: '', remark: '', date: '', dateLabel: '', startTime: '', endTime: '' }
  studentOrders.value = []
}

// ===== 数据加载 =====
const loadCoaches = async () => {
  try {
    const r = await api.get('/staff', { params: { role: 'coach', storeId: myStoreId, size: 999 } })
    coaches.value = r.data.records || r.data || []
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
    scheduleData.value = all
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
  editForm.value = {
    id: null, studentId: null, courseOrderId: null,
    lessonContent: '', remark: '',
    date, dateLabel: `${dayInfo.weekday} ${dayInfo.label}`,
    startTime: slot.startTime, endTime: slot.endTime
  }
  if (students.value.length === 0) loadStudents()
  editVisible.value = true
}

const editBooking = (date, slot, booking) => {
  const dayInfo = weekDays.value.find(d => d.date === date)
  editForm.value = {
    id: booking.id, studentId: booking.studentId, courseOrderId: booking.courseOrderId || null,
    lessonContent: booking.lessonContent || '', remark: booking.remark || '',
    date, dateLabel: `${dayInfo.weekday} ${dayInfo.label}`,
    startTime: slot.startTime, endTime: slot.endTime
  }
  loadStudentOrders(booking.studentId)
  editVisible.value = true
}

const handleSave = async () => {
  if (!editForm.value.studentId) { ElMessage.warning('请选择学员'); return }
  // 检查同时段是否已满6人
  const existing = getBookings(editForm.value.date, `${editForm.value.startTime}-${editForm.value.endTime}`)
  if (!editForm.value.id && existing.length >= 6) {
    ElMessage.warning('该时段已满6人，无法继续添加')
    return
  }

  saving.value = true
  try {
    const payload = {
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
    }
    if (editForm.value.id) {
      await api.put('/schedules', payload)
    } else {
      await api.post('/schedules', payload)
    }
    ElMessage.success('保存成功')
    editVisible.value = false
    loadSchedule()
  } catch {
    // handled by interceptor
  } finally {
    saving.value = false
  }
}

const handleDelete = () => {
  ElMessageBox.confirm('确认取消该排课？', '提示', { type: 'warning' })
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
  await loadCoaches()
  if (coaches.value.length) {
    activeCoachId.value = coaches.value[0].id
    loadSchedule()
  }
  loadStudents()
})
</script>

<style scoped>
.schedule-page { max-width: 100%; }

.sch-topbar {
  background: #fff; padding: 12px 20px; border-radius: 10px;
  display: flex; align-items: center; justify-content: space-between;
  box-shadow: 0 1px 3px rgba(0,0,0,0.06); margin-bottom: 14px;
  flex-wrap: wrap; gap: 8px;
}
.sch-date-nav { display: flex; align-items: center; gap: 8px; }
.sch-date-text { font-size: 16px; font-weight: 600; min-width: 200px; text-align: center; }
.sch-topbar-right { display: flex; align-items: center; gap: 10px; }

.sch-grid-wrap {
  background: #fff; border-radius: 10px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.06); overflow: hidden;
}
.sch-grid-scroll { overflow: auto; max-height: calc(100vh - 180px); }
.sch-placeholder {
  display: flex; align-items: center; justify-content: center;
  height: 400px; color: #909399; font-size: 16px;
}

.sch-grid { width: 100%; border-collapse: collapse; table-layout: fixed; min-width: 900px; }
.sch-grid th {
  background: #f5f7fa; padding: 8px 4px; border: 1px solid #ebeef5;
  font-weight: 500; text-align: center;
}
.sch-day-col.today { background: #ecf5ff; }
.sch-day-col.today .sch-day-name { color: #409EFF; }
.sch-day-name { font-size: 13px; color: #303133; font-weight: 600; }
.sch-day-date { font-size: 12px; color: #909399; margin-top: 2px; }

.sch-grid td { border: 1px solid #ebeef5; vertical-align: top; }

.sch-time-col {
  width: 90px; text-align: center; background: #fafafa;
  white-space: pre-line; font-size: 12px; color: #606266;
}
.sch-time-label { display: block; padding: 10px 0; font-weight: 500; }

.sch-cell {
  height: 80px; padding: 2px; cursor: pointer; transition: background 0.15s;
  vertical-align: top;
}
.sch-cell:hover:not(.sch-has-lesson) { background: #f0f9ff; }
.sch-has-lesson:hover { opacity: 0.95; }

.sch-booking-list {
  display: flex; flex-direction: column; gap: 2px;
  height: 100%; overflow: hidden;
}

.sch-booking {
  border-radius: 4px; padding: 3px 6px;
  display: flex; align-items: center; justify-content: space-between;
  cursor: pointer; transition: transform 0.1s;
  font-size: 12px; min-height: 22px;
}
.sch-booking:hover { transform: scale(1.02); }
.sch-student-name { font-weight: 600; color: #303133; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.sch-booking-count { font-size: 10px; color: #909399; }

.sch-empty {
  display: flex; align-items: center; justify-content: center;
  height: 100%; color: transparent; font-size: 20px; font-weight: 300;
}
.sch-cell:hover .sch-empty { color: #c0c4cc; }

.sch-add-more {
  font-size: 11px; color: #409EFF; text-align: center;
  padding: 2px; cursor: pointer;
}

.form-text { font-size: 14px; color: #303133; font-weight: 500; }
</style>
