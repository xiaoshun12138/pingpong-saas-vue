<template>
  <div class="dashboard">
    <!-- 页面页头：店名 + 门店选择 -->
    <div class="dashboard-header">
      <div class="header-left">
        <h2 class="header-title">{{ storeName }}</h2>
        <span class="header-sub">{{ currentMonth }} · 经营概览</span>
      </div>
      <el-select v-if="isBoss" v-model="selectedStoreId" placeholder="全部门店" clearable style="width:180px" @change="onStoreChange">
        <el-option label="全部门店" :value="null" />
        <el-option v-for="s in stores" :key="s.id" :label="s.name" :value="s.id" />
      </el-select>
    </div>

    <!-- 顶部：核心指标卡片 -->
    <div class="stat-grid" :style="{ '--cols': isBoss ? 4 : 4 }">
      <div class="stat-card" v-for="card in cards" :key="card.label" :style="{ '--accent': card.color }">
        <div class="stat-icon"><el-icon :size="28"><component :is="card.icon" /></el-icon></div>
        <div class="stat-body">
          <div class="stat-value">{{ card.value }}</div>
          <div class="stat-label">{{ card.label }}</div>
          <div class="stat-sub" v-if="card.sub">{{ card.sub }}</div>
        </div>
        <div class="stat-bar"></div>
      </div>
    </div>

    <!-- ==================== 老板视图 ==================== -->
    <template v-if="isBoss">
      <div class="chart-row">
        <div class="chart-card chart-main">
          <div class="chart-title">
            <span>📊 各门店本月业绩对比</span>
            <el-tag size="small" type="info">{{ currentMonth }}</el-tag>
          </div>
          <div ref="barChartRef" class="chart-canvas"></div>
        </div>
        <div class="chart-card chart-side">
          <div class="chart-title"><span>本月业绩构成</span></div>
          <div ref="pieChartRef" class="chart-canvas"></div>
        </div>
      </div>
      <div class="table-card">
        <div class="chart-title"><span>门店业绩明细</span></div>
        <el-table :data="storeData" stripe size="small" style="width:100%">
          <el-table-column prop="storeName" label="门店" min-width="120" />
          <el-table-column prop="salesAmount" label="本月销售额" width="140" align="right">
            <template #default="{row}"><span class="money">¥{{ Number(row.salesAmount).toLocaleString() }}</span></template>
          </el-table-column>
          <el-table-column prop="orderCount" label="订单数" width="80" align="center" />
          <el-table-column prop="consumptionAmount" label="本月消课额" width="140" align="right">
            <template #default="{row}"><span class="money">¥{{ Number(row.consumptionAmount || 0).toLocaleString() }}</span></template>
          </el-table-column>
          <el-table-column label="客单价" width="110" align="right">
            <template #default="{row}">
              <span v-if="row.orderCount > 0">¥{{ (Number(row.salesAmount) / row.orderCount).toFixed(0) }}</span>
              <span v-else>-</span>
            </template>
          </el-table-column>
          <el-table-column label="排名" width="70" align="center">
            <template #default="{row}"><el-tag :type="row.rank <= 3 ? 'danger' : 'info'" size="small">No.{{ row.rank }}</el-tag></template>
          </el-table-column>
        </el-table>
      </div>

      <div class="table-card">
        <div class="chart-title"><span>门店课消明细</span></div>
        <el-table :data="storeConsumptionData" stripe size="small" style="width:100%">
          <el-table-column prop="storeName" label="门店" min-width="120" />
          <el-table-column prop="consumptionCount" label="消课次数" width="90" align="center" />
          <el-table-column prop="lessonsConsumed" label="消课课时" width="90" align="center" />
          <el-table-column prop="consumptionAmount" label="消课金额" width="140" align="right">
            <template #default="{row}"><span class="money">¥{{ Number(row.consumptionAmount || 0).toLocaleString() }}</span></template>
          </el-table-column>
          <el-table-column label="排名" width="70" align="center">
            <template #default="{row}"><el-tag :type="row.rank <= 3 ? 'danger' : 'info'" size="small">No.{{ row.rank }}</el-tag></template>
          </el-table-column>
        </el-table>
      </div>

      <!-- 老板排名 -->
      <div class="rankings-section">
        <div class="ranking-block">
          <div class="ranking-header">
            <h3>教练课消排名</h3>
            <el-tag size="small" type="success">消课课时</el-tag>
          </div>
          <div class="ranking-list">
            <div class="ranking-item" v-for="c in coachLessonRank" :key="c.staffId" :class="{ 'top3': c.rank <= 3 }">
              <span class="rank-badge" :class="'rank-' + c.rank">{{ c.rank }}</span>
              <div class="rank-info">
                <div class="rank-line1">
                  <span class="rank-name">{{ c.staffName }}</span>
                  <span class="rank-value">{{ c.value }}课时</span>
                </div>
                <div class="rank-line2">
                  <span class="rank-store">{{ c.storeName }}</span>
                  <span class="rank-count">{{ c.count }}次</span>
                </div>
              </div>
            </div>
            <div v-if="coachLessonRank.length === 0" class="ranking-empty">本月暂无消课数据</div>
          </div>
        </div>
        <div class="ranking-block">
          <div class="ranking-header">
            <h3>教练业绩排名</h3>
            <el-tag size="small" type="warning">订单金额</el-tag>
          </div>
          <div class="ranking-list">
            <div class="ranking-item" v-for="c in coachSalesRank" :key="c.staffId" :class="{ 'top3': c.rank <= 3 }">
              <span class="rank-badge" :class="'rank-' + c.rank">{{ c.rank }}</span>
              <div class="rank-info">
                <div class="rank-line1">
                  <span class="rank-name">{{ c.staffName }}</span>
                  <span class="rank-value money">¥{{ Number(c.value).toLocaleString() }}</span>
                </div>
                <div class="rank-line2">
                  <span class="rank-store">{{ c.storeName }}</span>
                  <span class="rank-count">{{ c.count }}单</span>
                </div>
              </div>
            </div>
            <div v-if="coachSalesRank.length === 0" class="ranking-empty">本月暂无教练业绩数据</div>
          </div>
        </div>
        <div class="ranking-block">
          <div class="ranking-header">
            <h3>销售业绩排名</h3>
            <el-tag size="small" type="danger">订单金额</el-tag>
          </div>
          <div class="ranking-list">
            <div class="ranking-item" v-for="s in salesRank" :key="s.staffId" :class="{ 'top3': s.rank <= 3 }">
              <span class="rank-badge" :class="'rank-' + s.rank">{{ s.rank }}</span>
              <div class="rank-info">
                <div class="rank-line1">
                  <span class="rank-name">{{ s.staffName }}</span>
                  <span class="rank-value money">¥{{ Number(s.value).toLocaleString() }}</span>
                </div>
                <div class="rank-line2">
                  <span class="rank-store">{{ s.storeName }}</span>
                  <span class="rank-count">{{ s.count }}单</span>
                </div>
              </div>
            </div>
            <div v-if="salesRank.length === 0" class="ranking-empty">本月暂无销售业绩数据</div>
          </div>
        </div>
      </div>
    </template>

    <!-- ==================== 店长视图 ==================== -->
    <template v-else-if="isShopOwner">
      <!-- 目标完成率卡片：业绩 + 课消 -->
      <div class="target-grid">
        <div class="target-card">
          <div class="target-header">
            <span class="target-title">🎯 {{ storeName }}本月业绩目标</span>
            <el-tag :type="salesRate >= 100 ? 'success' : 'warning'" size="small" effect="dark">
              {{ salesRate }}%
            </el-tag>
          </div>
          <div class="target-body">
            <div class="target-ring" :style="getRingStyle(salesRate, '#409EFF')">
              <div class="target-ring-inner">
                <span class="ring-value">{{ salesRate }}<small>%</small></span>
                <span class="ring-label">完成率</span>
              </div>
            </div>
            <div class="target-detail">
              <div class="detail-row">
                <span class="detail-label">目标</span>
                <span class="detail-value">{{ formatMoney(salesTarget) }}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">已完成</span>
                <span class="detail-value done">{{ formatMoney(salesActual) }}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">差额</span>
                <span class="detail-value" :class="salesGap >= 0 ? 'gap-bad' : 'gap-good'">
                  {{ salesGap >= 0 ? '还差' : '超出' }} {{ formatMoney(Math.abs(salesGap)) }}
                </span>
              </div>
            </div>
          </div>
          <div class="target-progress">
            <div class="progress-bar" :style="{ width: Math.min(salesRate, 100) + '%', background: salesRate >= 100 ? '#67C23A' : '#409EFF' }"></div>
          </div>
        </div>

        <div class="target-card">
          <div class="target-header">
            <span class="target-title">📚 {{ storeName }}本月课消目标</span>
            <el-tag :type="lessonRate >= 100 ? 'success' : 'warning'" size="small" effect="dark">
              {{ lessonRate }}%
            </el-tag>
          </div>
          <div class="target-body">
            <div class="target-ring" :style="getRingStyle(lessonRate, '#67C23A')">
              <div class="target-ring-inner">
                <span class="ring-value">{{ lessonRate }}<small>%</small></span>
                <span class="ring-label">完成率</span>
              </div>
            </div>
            <div class="target-detail">
              <div class="detail-row">
                <span class="detail-label">目标</span>
                <span class="detail-value">{{ formatMoney(lessonTarget) }}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">已完成</span>
                <span class="detail-value done">{{ formatMoney(lessonActual) }}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">差额</span>
                <span class="detail-value" :class="lessonGap >= 0 ? 'gap-bad' : 'gap-good'">
                  {{ lessonGap >= 0 ? '还差' : '超出' }} {{ formatMoney(Math.abs(lessonGap)) }}
                </span>
              </div>
            </div>
          </div>
          <div class="target-progress">
            <div class="progress-bar" :style="{ width: Math.min(lessonRate, 100) + '%', background: lessonRate >= 100 ? '#67C23A' : '#E6A23C' }"></div>
          </div>
        </div>
      </div>

      <!-- 本月每日业绩走势折线图（全宽） -->
      <div class="chart-card">
        <div class="chart-title"><span>📈 {{ storeName }}本月每日业绩走势</span></div>
        <div ref="trendChartRef" class="chart-canvas" style="height:360px"></div>
      </div>

      <!-- 本店教练课消排名 + 销售业绩排名 -->
      <div class="rankings-section shop-owner-rankings">
        <div class="ranking-block">
          <div class="ranking-header">
            <h3>本店教练课消排名</h3>
            <el-tag size="small" type="success">消课课时</el-tag>
          </div>
          <div class="ranking-list">
            <div class="ranking-item" v-for="c in coachLessonRank" :key="c.staffId" :class="{ 'top3': c.rank <= 3 }">
              <span class="rank-badge" :class="'rank-' + c.rank">{{ c.rank }}</span>
              <div class="rank-info">
                <div class="rank-line1">
                  <span class="rank-name">{{ c.staffName }}</span>
                  <span class="rank-value">{{ c.value }}课时</span>
                </div>
                <div class="rank-line2">
                  <span class="rank-count">{{ c.count }}次</span>
                </div>
              </div>
            </div>
            <div v-if="coachLessonRank.length === 0" class="ranking-empty">本月暂无消课数据</div>
          </div>
        </div>
        <div class="ranking-block">
          <div class="ranking-header">
            <h3>本店销售业绩排名</h3>
            <el-tag size="small" type="danger">订单金额</el-tag>
          </div>
          <div class="ranking-list">
            <div class="ranking-item" v-for="s in salesRank" :key="s.staffId" :class="{ 'top3': s.rank <= 3 }">
              <span class="rank-badge" :class="'rank-' + s.rank">{{ s.rank }}</span>
              <div class="rank-info">
                <div class="rank-line1">
                  <span class="rank-name">{{ s.staffName }}</span>
                  <span class="rank-value money">¥{{ Number(s.value).toLocaleString() }}</span>
                </div>
                <div class="rank-line2">
                  <span class="rank-count">{{ s.count }}单</span>
                </div>
              </div>
            </div>
            <div v-if="salesRank.length === 0" class="ranking-empty">本月暂无销售数据</div>
          </div>
        </div>
      </div>
    </template>

    <!-- ==================== 教练视图 ==================== -->
    <template v-else>
      <div class="coach-notice">
        <el-icon :size="48" style="color:#409EFF"><TrendCharts /></el-icon>
        <p class="coach-notice-title">欢迎回来，{{ userInfo.name || '教练' }}</p>
        <p class="coach-notice-desc">以下是你负责的学员和订单概况</p>
      </div>
    </template>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, nextTick, onBeforeUnmount } from 'vue'
import * as echarts from 'echarts'
import api from '../api'

const userInfo = JSON.parse(localStorage.getItem('userInfo') || '{}')
const isBoss = computed(() => userInfo.role === 'boss')
const isShopOwner = computed(() => userInfo.role === 'shop_owner')

const data = ref({})
const storeName = ref('')
const storeData = ref([])
const storeConsumptionData = ref([])
const stores = ref([])
const selectedStoreId = ref(null)
const coachLessonRank = ref([])
const coachSalesRank = ref([])
const salesRank = ref([])
const cards = ref([])
const currentMonth = new Date().toLocaleDateString('zh-CN', { year: 'numeric', month: 'long' })
const barChartRef = ref(null)
const pieChartRef = ref(null)
const trendChartRef = ref(null)
let barChart = null, pieChart = null, trendChart = null

// ===== 店长目标数据 =====
const salesTarget = ref(0)
const salesActual = ref(0)
const lessonTarget = ref(0)
const lessonActual = ref(0)
const salesRate = computed(() => calcRate(salesActual.value, salesTarget.value))
const lessonRate = computed(() => calcRate(lessonActual.value, lessonTarget.value))
const salesGap = computed(() => salesTarget.value - salesActual.value)
const lessonGap = computed(() => lessonTarget.value - lessonActual.value)

const calcRate = (actual, target) => {
  if (!target || target <= 0) return 0
  return Math.round((actual / target) * 100)
}
import { formatMoney } from '../utils/format'
const formatCount = (v) => {
  if (!v) return '0'
  return Number(v).toLocaleString()
}
const getRingStyle = (rate, color) => {
  const deg = (Math.min(rate, 100) / 100) * 360
  return {
    background: `conic-gradient(${color} ${deg}deg, #e8e8e8 ${deg}deg)`
  }
}

const initCharts = () => {
  // 饼图（老板视图：新报/续费/消课收入构成）
  if (pieChartRef.value) {
    pieChart = echarts.init(pieChartRef.value)
    const d = data.value
    pieChart.setOption({
      tooltip: { trigger: 'item', formatter: '{b}: ¥{c} ({d}%)' },
      legend: { bottom: 5, left: 'center' },
      series: [{
        type: 'pie', radius: ['40%', '70%'], center: ['50%', '45%'],
        itemStyle: { borderRadius: 6, borderColor: '#fff', borderWidth: 2 },
        label: { show: true, formatter: '{b}\n¥{c}' },
        data: [
          { value: Number(d.monthNewAmount || 0), name: '新报收入', itemStyle: { color: '#409EFF' } },
          { value: Number(d.monthRenewAmount || 0), name: '续费收入', itemStyle: { color: '#67C23A' } }
        ]
      }]
    })
  }
  // 柱状图（仅老板）
  if (barChartRef.value && isBoss.value) {
    barChart = echarts.init(barChartRef.value)
    const names = storeData.value.map(s => s.storeName)
    const sales = storeData.value.map(s => Number(s.salesAmount))
    // 消课量从 storeConsumptionData 取，按门店名对齐
    const consumptionMap = Object.fromEntries(storeConsumptionData.value.map(s => [s.storeName, s.lessonsConsumed || 0]))
    const lessons = storeData.value.map(s => consumptionMap[s.storeName] || 0)
    barChart.setOption({
      tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
      legend: { data: ['销售额(元)', '消课量(课时)'], top: 5 },
      grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
      xAxis: { type: 'category', data: names, axisLabel: { interval: 0, rotate: names.length > 6 ? 30 : 0 } },
      yAxis: [
        { type: 'value', name: '销售额(元)', axisLabel: { formatter: '{value}' } },
        { type: 'value', name: '消课量', axisLabel: { formatter: '{value}' } }
      ],
      series: [
        { name: '销售额(元)', type: 'bar', data: sales, itemStyle: { color: '#409EFF', borderRadius: [4,4,0,0] }, barWidth: '30%' },
        { name: '消课量(课时)', type: 'bar', yAxisIndex: 1, data: lessons, itemStyle: { color: '#67C23A', borderRadius: [4,4,0,0] }, barWidth: '30%' }
      ]
    })
  }
  // 走势折线图（仅店长）
  if (trendChartRef.value && !isBoss.value) {
    trendChart = echarts.init(trendChartRef.value)
    const days = trendDays.value.map(d => d.day)
    const amounts = trendDays.value.map(d => d.amount)
    trendChart.setOption({
      tooltip: { trigger: 'axis', formatter: '{b}<br/>业绩: ¥{c}' },
      grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
      xAxis: {
        type: 'category',
        data: days,
        boundaryGap: false,
        axisLabel: {
          interval: 0, // 每天都显示标签
          fontSize: 11
        }
      },
      yAxis: {
        type: 'value',
        axisLabel: {
          formatter: v => {
            if (v >= 10000) return (v / 10000).toFixed(1) + '万'
            if (v >= 1000) return (v / 1000).toFixed(1) + 'k'
            return v
          }
        },
        splitLine: { lineStyle: { type: 'dashed', color: '#e8e8e8' } }
      },
      series: [{
        name: '业绩',
        type: 'line',
        smooth: true,
        data: amounts,
        areaStyle: { color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [{offset: 0, color: 'rgba(64,158,255,0.3)'}, {offset: 1, color: 'rgba(64,158,255,0.02)'}]) },
        lineStyle: { color: '#409EFF', width: 2 },
        itemStyle: { color: '#409EFF' },
        symbol: 'circle',
        symbolSize: 6
      }]
    })
  }
}

// 店长本月每日业绩走势数据
const trendDays = ref([])

const handleResize = () => { barChart?.resize(); pieChart?.resize(); trendChart?.resize() }

const destroyCharts = () => {
  barChart?.dispose(); barChart = null
  pieChart?.dispose(); pieChart = null
  trendChart?.dispose(); trendChart = null
}

// 核心加载函数，boss 切换门店时复用
const loadDashboard = async (storeId) => {
  destroyCharts()
  try {
    const params = storeId != null ? { storeId } : {}
    const [overviewRes, perfRes] = await Promise.all([
      api.get('/dashboard/overview', { params }),
      api.get('/dashboard/store-performance', { params })
    ])
    data.value = overviewRes.data
    storeName.value = overviewRes.data.storeName || ''
    const d = overviewRes.data

    if (isBoss.value) {
      // ===== 老板视角 =====
      try {
        const rankParams = storeId != null ? { storeId, topN: 10 } : { topN: 10 }
        const [clr, csr, sr] = await Promise.all([
          api.get('/dashboard/coach-lesson-ranking', { params: rankParams }),
          api.get('/dashboard/coach-sales-ranking', { params: rankParams }),
          api.get('/dashboard/sales-ranking', { params: rankParams })
        ])
        coachLessonRank.value = clr.data || []
        coachSalesRank.value = csr.data || []
        salesRank.value = sr.data || []
      } catch (e) {
        console.error('排名加载失败', e)
      }

      cards.value = [
        { label: '门店数', value: d.storeCount || 0, icon: 'Shop', color: '#409EFF' },
        { label: '员工数', value: d.staffCount || 0, icon: 'User', color: '#67C23A' },
        { label: '学员总数', value: (d.studentCount || 0).toLocaleString(), icon: 'Reading', color: '#E6A23C' },
        { label: '活跃学员', value: (d.activeStudentCount || 0).toLocaleString(), icon: 'UserFilled', color: '#F56C6C' },
        { label: '本月课消', value: '¥' + Number(d.monthConsumptionAmount || 0).toLocaleString(), sub: formatCount(d.monthConsumptionCount) + ' 次消课', icon: 'TrendCharts', color: '#909399' },
        { label: '本月新报', value: formatCount(d.monthNewCount), sub: '金额 ¥' + Number(d.monthNewAmount || 0).toLocaleString(), icon: 'Plus', color: '#9B59B6' },
        { label: '本月续费', value: formatCount(d.monthRenewCount), sub: '金额 ¥' + Number(d.monthRenewAmount || 0).toLocaleString(), icon: 'Refresh', color: '#1ABC9C' },
        { label: '本月退款', value: formatCount(d.monthRefundCount), sub: '退款额 ¥' + Number(d.monthRefundAmount || 0).toLocaleString(), icon: 'WarningFilled', color: '#E74C3C' }
      ]
      if (perfRes.data) {
        const sorted = [...perfRes.data].sort((a, b) => Number(b.salesAmount) - Number(a.salesAmount))
        sorted.forEach((s, i) => s.rank = i + 1)
        storeData.value = sorted
      }
      // 门店课消明细
      try {
        const consumptionRes = await api.get('/dashboard/store-consumption', { params })
        if (consumptionRes.data) {
          const sorted = [...consumptionRes.data].sort((a, b) => Number(b.consumptionAmount) - Number(a.consumptionAmount))
          sorted.forEach((s, i) => s.rank = i + 1)
          storeConsumptionData.value = sorted
        }
      } catch { storeConsumptionData.value = [] }
    } else if (isShopOwner.value) {
      // ===== 店长视角 =====
      try {
        const [salesTargetRes, lessonTargetRes] = await Promise.all([
          api.get('/target-dashboard/sales', { params: { year: new Date().getFullYear() } }),
          api.get('/target-dashboard/consumption', { params: { year: new Date().getFullYear() } })
        ])
        salesTarget.value = Number(salesTargetRes.data?.monthTarget || 0)
        salesActual.value = Number(salesTargetRes.data?.monthActual || 0)
        lessonTarget.value = Number(lessonTargetRes.data?.monthTarget || 0)
        lessonActual.value = Number(lessonTargetRes.data?.monthActual || 0)
      } catch (e) {
        console.error('目标数据加载失败', e)
      }

      try {
        const [clr, sr] = await Promise.all([
          api.get('/dashboard/coach-lesson-ranking', { params: { topN: 10 } }),
          api.get('/dashboard/sales-ranking', { params: { topN: 10 } })
        ])
        coachLessonRank.value = clr.data || []
        salesRank.value = sr.data || []
      } catch (e) {
        console.error('排名加载失败', e)
      }

      try {
        const trendRes = await api.get('/dashboard/daily-trend')
        const rows = trendRes.data || []
        const dayMap = Object.fromEntries(rows.map(r => [r.day, Number(r.amount) || 0]))
        const daysInMonth = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate()
        trendDays.value = Array.from({ length: daysInMonth }, (_, i) => {
          const day = i + 1
          return { day: day + '日', amount: dayMap[day] || 0 }
        })
      } catch { trendDays.value = [] }

      cards.value = [
        { label: '员工数', value: d.staffCount || 0, icon: 'User', color: '#67C23A' },
        { label: '学员总数', value: (d.studentCount || 0).toLocaleString(), icon: 'Reading', color: '#E6A23C' },
        { label: '活跃学员', value: (d.activeStudentCount || 0).toLocaleString(), icon: 'UserFilled', color: '#F56C6C' },
        { label: '本月课消', value: '¥' + Number(d.monthConsumptionAmount || 0).toLocaleString(), sub: formatCount(d.monthConsumptionCount) + ' 次消课', icon: 'TrendCharts', color: '#909399' },
        { label: '本月新报', value: formatCount(d.monthNewCount), sub: '金额 ¥' + Number(d.monthNewAmount || 0).toLocaleString(), icon: 'Plus', color: '#9B59B6' },
        { label: '本月续费', value: formatCount(d.monthRenewCount), sub: '金额 ¥' + Number(d.monthRenewAmount || 0).toLocaleString(), icon: 'Refresh', color: '#1ABC9C' },
        { label: '本月退款', value: formatCount(d.monthRefundCount), sub: '退款额 ¥' + Number(d.monthRefundAmount || 0).toLocaleString(), icon: 'WarningFilled', color: '#E74C3C' }
      ]
    } else {
      // ===== 教练视角 =====
      cards.value = [
        { label: '员工数', value: d.staffCount || 0, icon: 'User', color: '#67C23A' },
        { label: '学员总数', value: (d.studentCount || 0).toLocaleString(), icon: 'Reading', color: '#E6A23C' },
        { label: '活跃学员', value: (d.activeStudentCount || 0).toLocaleString(), icon: 'UserFilled', color: '#F56C6C' },
        { label: '本月课消', value: '¥' + Number(d.monthConsumptionAmount || 0).toLocaleString(), sub: formatCount(d.monthConsumptionCount) + ' 次消课', icon: 'TrendCharts', color: '#909399' },
        { label: '本月新报', value: formatCount(d.monthNewCount), sub: '金额 ¥' + Number(d.monthNewAmount || 0).toLocaleString(), icon: 'Plus', color: '#9B59B6' },
        { label: '本月续费', value: formatCount(d.monthRenewCount), sub: '金额 ¥' + Number(d.monthRenewAmount || 0).toLocaleString(), icon: 'Refresh', color: '#1ABC9C' },
        { label: '本月退款', value: formatCount(d.monthRefundCount), sub: '退款额 ¥' + Number(d.monthRefundAmount || 0).toLocaleString(), icon: 'WarningFilled', color: '#E74C3C' }
      ]
    }

    await nextTick()
    initCharts()
  } catch (e) {
    console.error('Dashboard加载失败', e)
  }
}

const onStoreChange = () => {
  loadDashboard(selectedStoreId.value)
}

onMounted(async () => {
  // 加载门店列表（boss 下拉）
  if (isBoss.value) {
    try {
      const res = await api.get('/stores', { params: { current: 1, size: 200 } })
      // Page 对象取 records
      stores.value = res.data?.records || []
    } catch {}
  }
  await loadDashboard(null)
  window.addEventListener('resize', handleResize)
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', handleResize)
  destroyCharts()
})
</script>

<style scoped>
.dashboard { padding: 0; }

.dashboard-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  margin-bottom: 18px;
  padding-bottom: 12px;
  border-bottom: 1px solid #e8e8e8;
}
.header-left {
  display: flex;
  align-items: baseline;
  gap: 12px;
}
.header-title {
  margin: 0;
  font-size: 20px;
  font-weight: 700;
  color: #1a1a2e;
}
.header-sub {
  font-size: 13px;
  color: #909399;
}

.stat-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 14px;
  margin-bottom: 20px;
}
.stat-card {
  background: #fff;
  border-radius: 10px;
  padding: 18px 20px;
  display: flex;
  align-items: center;
  gap: 14px;
  position: relative;
  overflow: hidden;
  box-shadow: 0 1px 3px rgba(0,0,0,0.06);
  transition: box-shadow 0.2s;
}
.stat-card:hover { box-shadow: 0 4px 12px rgba(0,0,0,0.1); }
.stat-icon {
  width: 48px; height: 48px;
  border-radius: 10px;
  display: flex; align-items: center; justify-content: center;
  background: color-mix(in srgb, var(--accent) 12%, transparent);
  color: var(--accent);
  flex-shrink: 0;
}
.stat-value { font-size: 22px; font-weight: 700; color: #1a1a2e; line-height: 1.2; }
.stat-label { font-size: 13px; color: #909399; margin-top: 2px; }
.stat-sub { font-size: 11px; color: #b0b0b0; margin-top: 3px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.stat-bar {
  position: absolute; bottom: 0; left: 0; right: 0; height: 3px;
  background: var(--accent);
  opacity: 0.3;
}

/* ===== 老板视图样式 ===== */
.chart-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  margin-bottom: 20px;
}
.chart-card {
  background: #fff;
  border-radius: 10px;
  padding: 16px 20px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.06);
}
.chart-title {
  display: flex; align-items: center; justify-content: space-between;
  font-size: 15px; font-weight: 600; color: #303133;
  margin-bottom: 12px;
}
.chart-canvas { height: 320px; }
.table-card {
  background: #fff;
  border-radius: 10px;
  padding: 16px 20px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.06);
  margin-bottom: 20px;
}
.money { color: #F56C6C; font-weight: 600; }

.rankings-section {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
  margin-top: 4px;
}
.shop-owner-rankings {
  grid-template-columns: repeat(2, 1fr);
}
.ranking-block {
  background: #fff;
  border-radius: 10px;
  padding: 16px 20px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.06);
}
.ranking-header {
  display: flex; align-items: center; justify-content: space-between;
  margin-bottom: 14px;
}
.ranking-header h3 {
  margin: 0;
  font-size: 15px; font-weight: 600; color: #303133;
}
.ranking-list { display: flex; flex-direction: column; gap: 8px; }
.ranking-item {
  display: flex; align-items: stretch; gap: 10px;
  padding: 8px 10px;
  border-radius: 8px;
  background: #fafafa;
  transition: background 0.15s;
}
.ranking-item:hover { background: #eef2ff; }
.ranking-item.top3 { background: linear-gradient(135deg, #fff9e6, #fff3cd); }
.rank-badge {
  width: 28px; height: 28px;
  border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  font-size: 13px; font-weight: 700;
  background: #e5e7eb;
  color: #6b7280;
  flex-shrink: 0;
  align-self: center;
}
.rank-badge.rank-1 { background: linear-gradient(135deg, #F56C6C, #E74C3C); color: #fff; }
.rank-badge.rank-2 { background: linear-gradient(135deg, #E6A23C, #F39C12); color: #fff; }
.rank-badge.rank-3 { background: linear-gradient(135deg, #67C23A, #27AE60); color: #fff; }

.rank-info {
  flex: 1; min-width: 0;
  display: flex; flex-direction: column; gap: 2px;
}
.rank-line1 {
  display: flex; align-items: center; justify-content: space-between; gap: 6px;
}
.rank-line2 {
  display: flex; align-items: center; justify-content: space-between; gap: 6px;
}
.rank-name {
  font-weight: 600; font-size: 13px; color: #303133;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.rank-store {
  font-size: 11px; color: #b0b0b0;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.rank-value {
  font-size: 13px; font-weight: 700; color: #409EFF;
  text-align: right; white-space: nowrap; flex-shrink: 0;
}
.rank-value.money { color: #F56C6C; }
.rank-count {
  font-size: 11px; color: #b0b0b0;
  text-align: right; white-space: nowrap; flex-shrink: 0;
}
.ranking-empty {
  text-align: center; padding: 40px 0; color: #c0c4cc; font-size: 14px;
}

/* ===== 店长目标卡片 ===== */
.target-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16px;
  margin-bottom: 20px;
}
.target-card {
  background: #fff;
  border-radius: 12px;
  padding: 20px 24px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.06);
  position: relative;
  overflow: hidden;
}
.target-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
}
.target-title {
  font-size: 16px;
  font-weight: 700;
  color: #303133;
}
.target-body {
  display: flex;
  align-items: center;
  gap: 24px;
}
.target-ring {
  width: 100px;
  height: 100px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  transition: background 0.3s;
}
.target-ring-inner {
  width: 76px;
  height: 76px;
  border-radius: 50%;
  background: #fff;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}
.ring-value {
  font-size: 22px;
  font-weight: 700;
  color: #303133;
  line-height: 1;
}
.ring-value small {
  font-size: 12px;
  font-weight: 600;
}
.ring-label {
  font-size: 11px;
  color: #909399;
  margin-top: 2px;
}
.target-detail {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.detail-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 13px;
}
.detail-label {
  color: #909399;
}
.detail-value {
  font-weight: 600;
  color: #303133;
}
.detail-value.done {
  color: #409EFF;
}
.gap-good {
  color: #67C23A !important;
}
.gap-bad {
  color: #F56C6C !important;
}
.target-progress {
  margin-top: 16px;
  height: 6px;
  background: #f0f2f5;
  border-radius: 3px;
  overflow: hidden;
}
.progress-bar {
  height: 100%;
  border-radius: 3px;
  transition: width 0.4s ease;
}

/* ===== 教练视图 ===== */
.coach-notice {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 80px 20px;
  background: #fff;
  border-radius: 10px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.06);
}
.coach-notice-title {
  margin-top: 16px;
  font-size: 20px;
  font-weight: 700;
  color: #303133;
}
.coach-notice-desc {
  margin-top: 8px;
  font-size: 14px;
  color: #909399;
}

@media (max-width: 1200px) {
  .stat-grid { grid-template-columns: repeat(2, 1fr); }
  .chart-row { grid-template-columns: 1fr; }
  .rankings-section { grid-template-columns: 1fr; }
  .target-grid { grid-template-columns: 1fr; }
}
</style>
