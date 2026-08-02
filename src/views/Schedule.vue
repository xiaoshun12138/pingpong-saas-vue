<template>
  <div class="schedule-page">
    <!-- 顶部工具栏 -->
    <div class="sch-topbar">
      <div class="sch-topbar-left">
        <!-- 月份切换 -->
        <div class="sch-month-nav">
          <button class="sch-nav-btn" @click="prevMonth">‹</button>
          <span class="sch-month-label" @click="goThisMonth">{{ monthLabel }}</span>
          <button class="sch-nav-btn" @click="nextMonth">›</button>
          <button class="sch-today-btn" @click="goThisMonth">回到本月</button>
        </div>
        <!-- 日窗口左右翻阅 -->
        <div class="sch-window-nav">
          <button class="sch-nav-btn" @click="shiftLeft">◀</button>
          <span class="sch-window-label">{{ visibleDays[0]?.label }} — {{ visibleDays[visibleDays.length - 1]?.label }}</span>
          <button class="sch-nav-btn" @click="shiftRight">▶</button>
        </div>
      </div>
      <div class="sch-topbar-right">
        <div class="sch-coach-picker">
          <span class="sch-picker-label">👤 教练</span>
          <el-select v-model="activeCoachId" placeholder="选择教练" style="width:150px" @change="loadSchedule" size="small">
            <el-option v-for="c in coaches" :key="c.id" :label="c.name" :value="c.id" />
          </el-select>
        </div>
        <div class="sch-week-stats">
          <span class="sch-stat-num">{{ displayTotal }}节</span>
          <span class="sch-stat-label">本月消课</span>
        </div>
      </div>
    </div>

    <!-- 月课表网格 -->
    <div class="sch-grid-wrap" v-loading="loading">
      <div class="sch-grid-scroll">
        <table class="sch-grid" v-if="activeCoachId">
          <thead>
            <tr>
              <th class="sch-time-col">时间</th>
              <th v-for="d in visibleDays" :key="d.date" class="sch-day-col" :class="{ today: d.isToday, weekend: d.isWeekend, 'other-month': !d.isCurrentMonth }">
                <div class="sch-day-name">{{ d.weekday }}</div>
                <div class="sch-day-date" :class="{ 'date-today': d.isToday }">{{ d.label }}</div>
                <div v-if="d.isToday" class="sch-today-badge">今天</div>
              </th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="slot in timeSlots" :key="slot.key" :class="{ 'sch-now-row': isCurrentSlot(slot) && !slot.isBreak, 'sch-break-row': slot.isBreak }">
              <td class="sch-time-col">
                <template v-if="!slot.isBreak">
                  <span class="sch-time-label">{{ slot.startTime }}</span>
                  <span class="sch-time-end">~ {{ slot.endTime }}</span>
                </template>
                <template v-else>
                  <span class="sch-time-label break-label">{{ slot.breakLabel }}</span>
                </template>
              </td>
              <td
                v-for="d in visibleDays"
                :key="d.date"
                :class="slot.isBreak ? 'sch-break-cell' : ['sch-cell', { 'sch-cell-today': d.isToday, 'sch-has-lesson': getBookings(d.date, slot.key).length > 0, 'sch-other-month': !d.isCurrentMonth, 'sch-past': d.isPast }]"
                @click="!slot.isBreak && !d.isPast && cellClick(d.date, slot)"
              >
                <template v-if="slot.isBreak">
                  <div class="sch-break-bar">{{ slot.breakLabel }}</div>
                </template>
                <template v-else>
                  <div class="sch-booking-list">
                    <div
                      v-for="(b, i) in getBookings(d.date, slot.key)"
                      :key="b.id || i"
                      class="sch-booking"
                      :style="{ '--booking-color': b.color, background: b.color }"
                      @click.stop="!d.isPast && editBooking(d.date, slot, b)"
                    >
                      <div class="sch-booking-left">
                        <span class="sch-booking-bar"></span>
                        <div class="sch-booking-info">
                          <span class="sch-student-name">{{ b.studentName }}</span>
                          <span class="sch-lesson-info" v-if="b.courseTypeName">{{ b.courseTypeName }}</span>
                        </div>
                      </div>
                      <span class="sch-remaining" v-if="b.remainingLessons !== undefined">余{{ b.remainingLessons }}</span>
                    </div>
                    <div v-if="getBookings(d.date, slot.key).length === 0" class="sch-empty">
                      <span class="sch-empty-plus">+</span>
                    </div>
                    <div v-else-if="getBookings(d.date, slot.key).length < 6" class="sch-add-more">
                      <span>+ 添加</span>
                    </div>
                  </div>
                </template>
              </td>
            </tr>
          </tbody>
        </table>
        <div v-else class="sch-placeholder">
          <div class="sch-placeholder-icon">🏸</div>
          <p>请选择一位教练查看月课表</p>
        </div>
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
            <el-option v-for="o in (rowOrders[idx] || []).filter(x => x.remainingLessons > 0)" :key="o.id" :label="`${o.courseTypeName || '课包'} - 余${o.remainingLessons}课时`" :value="o.id" />
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
          <el-option v-for="o in studentOrders.filter(x => x.remainingLessons > 0)" :key="o.id" :label="`${o.courseTypeName || '课包'} - 余${o.remainingLessons}课时`" :value="o.id" />
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
import { ref, computed, onMounted, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import api from '../api'

const userInfo = JSON.parse(localStorage.getItem('userInfo') || '{}')
const myStoreId = userInfo.storeId

// ===== 基础状态 =====
const coaches = ref([])
const students = ref([])
const activeCoachId = ref(null)
const activeCoach = computed(() => coaches.value?.find(c => c.id === activeCoachId.value) || null)

const monthOffset = ref(0)
const WINDOW_SIZE = 7
const SHIFT_DAYS = 1

const scheduleData = ref([])
const loading = ref(false)
const windowStart = ref(0)

const monthLabel = computed(() => {
  const now = new Date()
  const y = now.getFullYear()
  const m = now.getMonth() + monthOffset.value + 1
  const isThisMonth = monthOffset.value === 0
  return `${y}年${m}月${isThisMonth ? '（本月）' : ''}`
})

// ===== 月历日期 =====
const allMonthDays = computed(() => {
  const now = new Date()
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
  const y = now.getFullYear()
  const m = now.getMonth() + monthOffset.value
  const wdNames = ['周一', '周二', '周三', '周四', '周五', '周六', '周日']

  const firstOfMonth = new Date(y, m, 1)
  const lastOfMonth = new Date(y, m + 1, 0)
  const lastDayNum = lastOfMonth.getDate()

  const firstDow = firstOfMonth.getDay() || 7
  const gridStart = new Date(firstOfMonth)
  gridStart.setDate(1 - firstDow + 1)

  const lastDow = lastOfMonth.getDay() || 7
  const gridEnd = new Date(lastOfMonth)
  gridEnd.setDate(lastDayNum + (7 - lastDow) + 1)

  const days = []
  const d = new Date(gridStart)
  while (d < gridEnd) {
    const ds = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    const dow = d.getDay() || 7
    days.push({
      date: ds,
      label: `${d.getMonth() + 1}/${d.getDate()}`,
      weekday: wdNames[dow - 1],
      isCurrentMonth: d.getMonth() === m,
      isToday: ds === today,
      isPast: ds < today,
      isWeekend: dow >= 6
    })
    d.setDate(d.getDate() + 1)
  }
  return days
})

const visibleDays = computed(() => {
  const all = allMonthDays.value || []
  if (all.length === 0) return []
  const start = Math.max(0, Math.min(windowStart.value, all.length - 1))
  const end = Math.min(all.length, start + WINDOW_SIZE)
  return all.slice(start, end)
})

const resetWindow = () => {
  const days = allMonthDays.value || []
  if (days.length === 0) return
  if (monthOffset.value === 0) {
    const todayIdx = days.findIndex(d => d.isToday)
    windowStart.value = Math.max(0, Math.min(days.length - WINDOW_SIZE, todayIdx - Math.floor(WINDOW_SIZE / 2)))
  } else {
    windowStart.value = 0
  }
}

// ===== 本月消课统计 =====
const displayTotal = ref(0)
let animTimer = null

const monthStats = computed(() => {
  try {
    const now = new Date()
    const days = allMonthDays.value || []
    const cm = days.filter(d => d.isCurrentMonth)
    let records
    if (cm.length > 0) {
      const currentMonthDates = new Set(cm.map(d => d.date))
      records = (scheduleData.value || []).filter(s => {
        const sd = typeof s.scheduleDate === 'string' ? s.scheduleDate : s.scheduleDate
        return sd && currentMonthDates.has(sd)
      })
    } else {
      const m = days.length > 0 ? new Date(days[0].date).getMonth() : now.getMonth() + monthOffset.value
      records = (scheduleData.value || []).filter(s => {
        const sd = typeof s.scheduleDate === 'string' ? s.scheduleDate : s.scheduleDate
        if (!sd) return false
        const d = new Date(sd)
        return d.getMonth() === m
      })
    }
    return { total: records.length }
  } catch {
    return { total: 0 }
  }
})

watch(monthStats, (stats) => {
  clearInterval(animTimer)
  const target = stats?.total || 0
  const start = displayTotal.value
  if (start === target) return
  const steps = 15
  let step = 0
  animTimer = setInterval(() => {
    step++
    const progress = step / steps
    const eased = 1 - Math.pow(1 - progress, 3)
    displayTotal.value = Math.round(start + (target - start) * eased)
    if (step >= steps) {
      displayTotal.value = target
      clearInterval(animTimer)
    }
  }, 20)
})

const isCurrentSlot = (slot) => {
  const days = visibleDays.value || []
  const todayCol = days.find(d => d.isToday)
  if (!todayCol || !slot) return false
  const now = new Date()
  const hh = String(now.getHours()).padStart(2, '0')
  const mm = String(now.getMinutes()).padStart(2, '0')
  const t = `${hh}:${mm}`
  return (slot.startTime || '') <= t && t < (slot.endTime || '')
}

// ===== 导航 =====
const prevMonth = () => { monthOffset.value--; resetWindow(); loadSchedule() }
const nextMonth = () => { monthOffset.value++; resetWindow(); loadSchedule() }
const goThisMonth = () => { monthOffset.value = 0; resetWindow(); loadSchedule() }

const shiftLeft = () => {
  if (windowStart.value > 0) {
    windowStart.value = Math.max(0, windowStart.value - SHIFT_DAYS)
  } else {
    monthOffset.value--
    resetWindow()
    windowStart.value = Math.max(0, (allMonthDays.value || []).length - WINDOW_SIZE)
  }
  loadSchedule()
}
const shiftRight = () => {
  const days = allMonthDays.value || []
  if (windowStart.value + WINDOW_SIZE < days.length) {
    windowStart.value = Math.min(days.length - WINDOW_SIZE, windowStart.value + SHIFT_DAYS)
  } else {
    monthOffset.value++
    resetWindow()
  }
  loadSchedule()
}

// ===== 时间段 =====
const timeSlots = [
  { key: '09:00-10:30', startTime: '09:00', endTime: '10:30' },
  { key: '10:30-12:00', startTime: '10:30', endTime: '12:00' },
  { key: '12:00-14:00', startTime: '12:00', endTime: '14:00', isBreak: true, breakLabel: '午休' },
  { key: '14:00-15:30', startTime: '14:00', endTime: '15:30' },
  { key: '15:30-17:00', startTime: '15:30', endTime: '17:00' },
  { key: '17:00-18:00', startTime: '17:00', endTime: '18:00', isBreak: true, breakLabel: '休息' },
  { key: '18:00-19:30', startTime: '18:00', endTime: '19:30' },
  { key: '19:30-21:00', startTime: '19:30', endTime: '21:00' }
]

const palette = [
  '#a8e6cf', '#dcedc1', '#ffd3b6', '#ffaaa5', '#ff8b94',
  '#a0e7e5', '#b4f8c8', '#fbe7c6', '#f38181', '#aa96da',
  '#fcbad3', '#ffffd2', '#c7ceea', '#caffbf', '#a0ced9'
]
let colorI = 0
const colorMap = {}
const getColor = (studentId) => {
  if (!colorMap[studentId]) colorMap[studentId] = palette[colorI++ % palette.length]
  return colorMap[studentId]
}

const getBookings = (date, slotKey) => {
  const [slotStart, slotEnd] = slotKey.split('-')
  return scheduleData.value.filter(s => {
    const sDate = typeof s.scheduleDate === 'string' ? s.scheduleDate : s.scheduleDate
    const sTime = (s.startTime || '').substring(0, 5)
    // 匹配时间段区间：消课上课时间落在哪个时段就显示在哪个格子里
    return sDate === date && sTime >= slotStart && sTime < slotEnd
  })
}

// ===== 弹窗 =====
const editVisible = ref(false)
const saving = ref(false)
const editingBooking = ref(false)
const studentOrders = ref([])
const maxSlots = 6

const rows = ref([{ studentId: null, courseOrderId: null }])
const rowOrders = ref([])

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

// 跟踪上个月份偏移
const loadedMonthOffset = ref(null)
const loadedCoachId = ref(null)

const loadSchedule = async () => {
  if (!activeCoachId.value) return
  loading.value = true
  try {
    const currentMonth = monthOffset.value
    const monthChanged = loadedMonthOffset.value !== currentMonth

    // 切月或切教练时都需重载数据
    const coachChanged = loadedCoachId.value !== activeCoachId.value
    const needReload = monthChanged || coachChanged
    if (needReload) {
      scheduleData.value = []
      // 重置颜色映射，避免跨月/跨教练复用导致不同学员分到相同颜色
      Object.keys(colorMap).forEach(k => delete colorMap[k])
      colorI = 0
      loadedMonthOffset.value = currentMonth
      loadedCoachId.value = activeCoachId.value
    }

    // 切月或切教练时加载整月数据，同月同教练翻页只加载新出现的日期
    let datesToLoad
    if (needReload) {
      datesToLoad = allMonthDays.value.filter(d => d.isCurrentMonth).map(d => d.date)
    } else {
      const alreadyLoaded = new Set((scheduleData.value || []).map(s => {
        const sd = typeof s.scheduleDate === 'string' ? s.scheduleDate : s.scheduleDate
        return sd
      }))
      datesToLoad = visibleDays.value.map(d => d.date).filter(d => !alreadyLoaded.has(d))
    }

    if (datesToLoad.length === 0) {
      loading.value = false
      return
    }

    const results = await Promise.all(
      datesToLoad.map(date =>
        api.get('/schedules', { params: { coachId: activeCoachId.value, date } })
           .catch(() => ({ data: { records: [] } }))
      )
    )
    const newRecords = []
    results.forEach(r => {
      const recs = r.data.records || r.data || []
      recs.forEach(s => {
        s.color = getColor(s.studentId)
        const stu = students.value.find(x => x.id === s.studentId)
        if (stu) s.studentName = stu.name
        newRecords.push(s)
      })
    })
    scheduleData.value = [...scheduleData.value, ...newRecords]

    const orderIds = [...new Set(scheduleData.value.map(s => s.courseOrderId).filter(Boolean))]
    if (orderIds.length > 0) {
      const orderMap = {}
      await Promise.all(orderIds.map(id =>
        api.get(`/course-orders/${id}`).then(res => {
          orderMap[id] = res.data
        }).catch(() => {})
      ))
      scheduleData.value = scheduleData.value.map(s => {
        if (s.courseOrderId && orderMap[s.courseOrderId]) {
          return { ...s, courseTypeName: orderMap[s.courseOrderId].courseTypeName || '', remainingLessons: orderMap[s.courseOrderId].remainingLessons }
        }
        return s
      })
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
  const dayInfo = visibleDays.value.find(d => d.date === date)
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
  const dayInfo = visibleDays.value.find(d => d.date === date)
  editForm.value = {
    id: booking.id,
    lessonContent: booking.lessonContent || '', remark: booking.remark || '',
    date, dateLabel: `${dayInfo.weekday} ${dayInfo.label}`,
    startTime: slot.startTime, endTime: slot.endTime
  }
  loadStudentOrders(booking.studentId)
  editForm.value.studentId = booking.studentId
  editForm.value.courseOrderId = booking.courseOrderId
  editVisible.value = true
}

const handleSave = async () => {
  if (editingBooking.value) {
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
      loadedMonthOffset.value = null; loadedCoachId.value = null
      scheduleData.value = []
      await loadSchedule()
    } catch (e) {
      ElMessage.error(e?.response?.data?.message || e?.message || '保存失败')
    } finally { saving.value = false }
    return
  }

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
  if (ok > 0) {
    editVisible.value = false
    // 强制重新加载当前月数据（增量加载逻辑会跳过已加载日期，需重置标记）
    loadedMonthOffset.value = null; loadedCoachId.value = null
    scheduleData.value = []
    await loadSchedule()
  }
}

const handleDelete = () => {
  ElMessageBox.confirm('确认取消该消课？', '提示', { type: 'warning' })
    .then(async () => {
      try {
        await api.delete(`/schedules/${editForm.value.id}`)
        ElMessage.success('已取消消课')
        editVisible.value = false
        loadedMonthOffset.value = null; loadedCoachId.value = null
        scheduleData.value = []
        await loadSchedule()
      } catch { ElMessage.error('取消失败') }
    }).catch(() => {})
}

onMounted(async () => {
  await Promise.all([loadCoaches(), loadStudents()])
  if (coaches.value.length) {
    activeCoachId.value = coaches.value[0].id
    resetWindow()
    loadSchedule()
  }
})
</script>

<style scoped>
.schedule-page { max-width: 100%; }

/* ===== 顶部工具栏 ===== */
.sch-topbar {
  background: #fff;
  padding: 14px 20px;
  border-radius: 14px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  box-shadow: 0 2px 12px rgba(0,0,0,0.06);
  margin-bottom: 14px;
  flex-wrap: wrap;
  gap: 10px;
}
.sch-topbar-left {
  display: flex;
  align-items: center;
  gap: 24px;
}
.sch-month-nav {
  display: flex;
  align-items: center;
  gap: 6px;
}
.sch-window-nav {
  display: flex;
  align-items: center;
  gap: 8px;
  padding-left: 20px;
  border-left: 1px solid #ebeef5;
}
.sch-nav-btn {
  width: 32px; height: 32px;
  border: 1px solid #e4e7ed;
  border-radius: 8px;
  background: #fff;
  font-size: 16px;
  color: #606266;
  cursor: pointer;
  display: flex; align-items: center; justify-content: center;
  transition: all 0.2s;
  user-select: none;
}
.sch-nav-btn:hover { background: #ecf5ff; border-color: #409EFF; color: #409EFF; }
.sch-nav-btn:active { background: #d9ecff; }
.sch-month-label {
  font-size: 15px; font-weight: 700; color: #1a1a2e;
  min-width: 120px; text-align: center;
  cursor: pointer;
  padding: 4px 8px;
  border-radius: 6px;
  transition: background 0.15s;
}
.sch-month-label:hover { background: #f0f2f5; }
.sch-window-label {
  font-size: 13px; color: #606266;
  min-width: 100px; text-align: center;
  font-weight: 500;
}
.sch-today-btn {
  margin-left: 6px;
  padding: 6px 14px;
  border: 1px solid #dcdfe6;
  border-radius: 8px;
  background: #fff;
  font-size: 13px;
  color: #606266;
  cursor: pointer;
  transition: all 0.2s;
}
.sch-today-btn:hover { background: #409EFF; border-color: #409EFF; color: #fff; }
.sch-topbar-right { display: flex; align-items: center; gap: 14px; }
.sch-coach-picker { display: flex; align-items: center; gap: 8px; }
.sch-picker-label { font-size: 13px; color: #606266; font-weight: 500; }
.sch-week-stats {
  display: flex; align-items: baseline; gap: 4px;
  background: linear-gradient(135deg, #e8f5e9, #f1f8e9);
  padding: 6px 14px; border-radius: 10px;
  border: 1px solid #c8e6c9;
}
.sch-stat-num { font-size: 20px; font-weight: 800; color: #2e7d32; line-height: 1; transition: all 0.35s cubic-bezier(0.4, 0, 0.2, 1); display: inline-block; min-width: 32px; text-align: center; }
.sch-stat-label { font-size: 12px; color: #558b2f; }

/* ===== 课表网格容器 ===== */
.sch-grid-wrap {
  background: #fff;
  border-radius: 14px;
  box-shadow: 0 2px 12px rgba(0,0,0,0.06);
  overflow: hidden;
}
.sch-grid-scroll { overflow: auto; max-height: calc(100vh - 170px); }
.sch-placeholder {
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  height: 400px; color: #909399; font-size: 15px;
}
.sch-placeholder-icon { font-size: 48px; margin-bottom: 12px; }

/* ===== 表格 ===== */
.sch-grid { width: 100%; border-collapse: collapse; table-layout: fixed; min-width: 580px; }
.sch-grid th {
  background: linear-gradient(180deg, #f8f9fb, #f0f2f5);
  padding: 10px 4px;
  border-bottom: 2px solid #e4e7ed;
  border-right: 1px solid #ebeef5;
  font-weight: 500;
  text-align: center;
  position: sticky;
  top: 0;
  z-index: 2;
}
.sch-time-col {
  width: 76px;
  background: #fafbfc !important;
  border-right: 2px solid #ebeef5;
}
.sch-day-col { position: relative; }
.sch-day-col.today { background: linear-gradient(180deg, #ecf5ff, #e8f4ff); }
.sch-day-col.today .sch-day-name { color: #409EFF; }
.sch-day-col.weekend { background: #f9fafb; }
.sch-day-col.other-month { background: #f5f5f5; }
.sch-day-col.other-month .sch-day-name { color: #c0c4cc; }
.sch-day-col.other-month .sch-day-date { color: #c0c4cc; }
.sch-day-col.weekend.today { background: linear-gradient(180deg, #ecf5ff, #e8f4ff); }
.sch-day-name { font-size: 13px; color: #303133; font-weight: 600; line-height: 1.4; }
.sch-day-date { font-size: 12px; color: #909399; margin-top: 2px; }
.sch-day-date.date-today { color: #409EFF; font-weight: 700; }
.sch-today-badge {
  position: absolute; top: 2px; right: 4px;
  font-size: 9px; color: #fff;
  background: #409EFF;
  padding: 1px 5px; border-radius: 4px;
  line-height: 1.3;
}
.sch-grid td { border-right: 1px solid #ebeef5; border-bottom: 1px solid #ebeef5; vertical-align: top; }

/* ===== 时间列 ===== */
.sch-time-col { text-align: center; font-size: 12px; color: #606266; padding: 6px 0; }
.sch-time-label { display: block; font-weight: 700; color: #303133; font-size: 13px; }
.sch-time-end { display: block; color: #b0b0b0; font-size: 11px; margin-top: 2px; }
.sch-time-label.break-label { color: #c0c4cc; font-weight: 400; font-size: 12px; }

/* ===== 当前时段高亮 ===== */
.sch-now-row .sch-time-col {
  background: linear-gradient(180deg, #f0f9ff, #e6f7ff) !important;
  border-left: 3px solid #409EFF;
}
.sch-now-row .sch-time-label { color: #409EFF; }
.sch-now-row td:not(.sch-time-col):not(.sch-break-cell) { background: rgba(64,158,255,0.02); }

/* ===== 休息时段 ===== */
.sch-break-row .sch-time-col { background: #f5f5f5 !important; color: #c0c4cc; }
.sch-break-row .sch-time-label, .sch-break-row .sch-time-end { color: #c0c4cc; font-weight: 400; }
.sch-break-cell {
  background: repeating-linear-gradient(135deg, #f9f9f9, #f9f9f9 4px, #f5f5f5 4px, #f5f5f5 8px) !important;
  text-align: center; vertical-align: middle;
  cursor: default;
  height: 32px;
  border-bottom: 1px solid #eee !important;
  border-right: 1px solid #ebeef5;
}
.sch-break-bar { font-size: 11px; color: #c0c4cc; letter-spacing: 3px; font-weight: 400; }

/* ===== 课程格子 ===== */
.sch-cell {
  height: 72px;
  padding: 3px;
  cursor: pointer;
  transition: background 0.15s;
  vertical-align: top;
  position: relative;
}
.sch-cell-today { background: rgba(64,158,255,0.015); }
.sch-other-month { background: #f5f5f5; }
.sch-other-month.sch-cell-today { background: rgba(64,158,255,0.04); }
.sch-cell:hover:not(.sch-has-lesson) { background: #f0f9ff; }
.sch-cell.sch-other-month:hover:not(.sch-has-lesson) { background: #eaeaea; }
.sch-cell.sch-past { cursor: default; opacity: 0.55; background: #f8f8f8; }
.sch-cell.sch-past:hover { background: #f8f8f8; }
.sch-cell.sch-past .sch-booking { cursor: default; }
.sch-cell.sch-past .sch-booking:hover { transform: none; box-shadow: none; }
.sch-cell.sch-past .sch-empty-plus { color: transparent; }
.sch-cell.sch-past:hover .sch-empty-plus { color: transparent; }
.sch-has-lesson:hover { background: rgba(64,158,255,0.02); }

.sch-booking-list { display: flex; flex-direction: column; gap: 3px; height: 100%; overflow: hidden; }

.sch-booking {
  border-radius: 6px;
  padding: 4px 8px;
  display: flex; align-items: center; justify-content: space-between;
  cursor: pointer;
  transition: all 0.15s;
  font-size: 12px;
  min-height: 24px;
  line-height: 1.3;
  border-left: 3px solid rgba(0,0,0,0.15);
}
.sch-booking:hover { transform: translateX(2px); box-shadow: 0 2px 8px rgba(0,0,0,0.12); }
.sch-booking-left { display: flex; align-items: center; gap: 4px; overflow: hidden; flex: 1; }
.sch-booking-info { display: flex; flex-direction: column; overflow: hidden; }
.sch-student-name { font-weight: 700; color: #303133; font-size: 12px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.sch-lesson-info { font-size: 10px; color: #666; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.sch-remaining {
  font-size: 10px; color: #555; font-weight: 700;
  flex-shrink: 0;
  background: rgba(255,255,255,0.65);
  border-radius: 4px;
  padding: 1px 5px;
}

.sch-empty { display: flex; align-items: center; justify-content: center; height: 100%; }
.sch-empty-plus { font-size: 20px; font-weight: 300; color: transparent; transition: color 0.15s; }
.sch-cell:hover .sch-empty-plus { color: #c8d0d8; }

.sch-add-more { font-size: 10px; color: #409EFF; text-align: center; padding: 2px; cursor: pointer; font-weight: 600; border-radius: 4px; transition: background 0.15s; }
.sch-add-more:hover { background: rgba(64,158,255,0.08); }

/* ===== 弹窗样式 ===== */
.batch-info { display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 16px; }
.batch-rows { margin-bottom: 8px; }
.batch-row { display: flex; align-items: center; gap: 10px; margin-bottom: 8px; }
.batch-num {
  display: inline-flex; align-items: center; justify-content: center;
  width: 24px; height: 24px; border-radius: 50%;
  background: #409EFF; color: #fff; font-size: 12px; font-weight: 600; flex-shrink: 0;
}
.edit-single { display: flex; gap: 10px; align-items: center; margin-bottom: 8px; }

/* ===== 滚动条美化 ===== */
.sch-grid-scroll::-webkit-scrollbar { width: 6px; height: 6px; }
.sch-grid-scroll::-webkit-scrollbar-track { background: transparent; }
.sch-grid-scroll::-webkit-scrollbar-thumb { background: #d0d0d0; border-radius: 3px; }
.sch-grid-scroll::-webkit-scrollbar-thumb:hover { background: #b0b0b0; }
</style>
