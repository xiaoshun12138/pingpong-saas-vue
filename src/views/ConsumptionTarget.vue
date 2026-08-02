<template>
  <div class="page-card">
    <!-- 筛选栏 -->
    <div class="page-toolbar" v-if="isBoss">
      <div class="toolbar-left">
        <el-select v-model="filterStoreId" placeholder="所有门店" clearable style="width:160px" @change="onFilterChange">
          <el-option label="所有门店" :value="null" />
          <el-option v-for="s in stores" :key="s.id" :label="s.name" :value="s.id" />
        </el-select>
        <el-select v-model="filterYear" placeholder="选择年份" style="width:100px;margin-left:8px" @change="onFilterChange">
          <el-option v-for="y in yearOptions" :key="y" :label="y + '年'" :value="y" />
        </el-select>
        <el-select v-model="filterMonth" placeholder="选择月份" style="width:100px;margin-left:8px" @change="onFilterChange">
          <el-option v-for="m in monthOptions" :key="m" :label="m + '月'" :value="m" />
        </el-select>
      </div>
    </div>
    <div class="page-toolbar" v-else>
      <div class="toolbar-left">
        <el-select v-model="filterYear" placeholder="选择年份" style="width:100px" @change="onFilterChange">
          <el-option v-for="y in yearOptions" :key="y" :label="y + '年'" :value="y" />
        </el-select>
        <el-select v-model="filterMonth" placeholder="选择月份" style="width:100px;margin-left:8px" @change="onFilterChange">
          <el-option v-for="m in monthOptions" :key="m" :label="m + '月'" :value="m" />
        </el-select>
      </div>
    </div>

    <!-- 目标完成率卡片 -->
    <el-row :gutter="16" class="target-row" style="margin-bottom:16px">
      <el-col :span="8">
        <div class="chart-card">
          <div class="chart-title">年度课消目标完成率</div>
          <div ref="yearChartRef" class="pie-chart"></div>
          <div class="chart-summary">
            <span>目标: {{ formatMoney(yearTarget) }}</span>
            <span>完成: {{ formatMoney(yearActual) }}</span>
            <span :class="yearRate >= 100 ? 'rate-good' : 'rate-bad'">完成率: {{ yearRate }}%</span>
          </div>
        </div>
      </el-col>
      <el-col :span="8">
        <div class="chart-card">
          <div class="chart-title">月度课消目标完成率</div>
          <div ref="monthChartRef" class="pie-chart"></div>
          <div class="chart-summary">
            <span>目标: {{ formatMoney(monthTarget) }}</span>
            <span>完成: {{ formatMoney(monthActual) }}</span>
            <span :class="monthRate >= 100 ? 'rate-good' : 'rate-bad'">完成率: {{ monthRate }}%</span>
          </div>
        </div>
      </el-col>
      <el-col :span="8">
        <div class="chart-card">
          <div class="chart-title">周度课消目标完成率</div>
          <div ref="weekChartRef" class="pie-chart"></div>
          <div class="chart-summary">
            <span>目标: {{ formatMoney(weekTarget) }}</span>
            <span>完成: {{ formatMoney(weekActual) }}</span>
            <span :class="weekRate >= 100 ? 'rate-good' : 'rate-bad'">完成率: {{ weekRate }}%</span>
          </div>
        </div>
      </el-col>
    </el-row>

    <!-- 折线图：消课金额走势 -->
    <div class="chart-card" style="margin-bottom:16px">
      <div class="chart-title">{{ isBoss ? chartTitlePrefix + '各月' : '各月' }}课消金额走势</div>
      <div ref="trendChartRef" class="line-chart"></div>
    </div>

    <!-- 柱状图：各门店消课目标对比（仅老板可见） -->
    <div class="chart-card" v-if="isBoss" style="margin-bottom:16px">
      <div class="chart-title">各门店月度课消目标与完成</div>
      <div ref="storeChartRef" class="bar-chart"></div>
    </div>

    <!-- 表格：各门店每月消课明细（仅老板可见） -->
    <div class="chart-card" v-if="isBoss">
      <div class="chart-title">各门店每月课消金额明细</div>
      <el-table :data="tableData" v-loading="loading" stripe size="small">
        <el-table-column prop="storeName" label="门店" min-width="120" fixed />
        <el-table-column v-for="m in 12" :key="m" :label="m + '月'" width="100" align="right">
          <template #default="{row}">
            <span>{{ formatMoney(row.monthData[m]) }}</span>
          </template>
        </el-table-column>
        <el-table-column label="合计" width="110" align="right">
          <template #default="{row}">
            <span style="font-weight:600;color:#67C23A">{{ formatMoney(row.total) }}</span>
          </template>
        </el-table-column>
      </el-table>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, onUnmounted, nextTick } from 'vue'
import * as echarts from 'echarts'
import api from '../api'

const userInfo = JSON.parse(localStorage.getItem('userInfo') || '{}')
const isBoss = computed(() => userInfo.role === 'boss')
const myStoreId = computed(() => userInfo.storeId)

const stores = ref([])
const filterStoreId = ref(null)
const filterYear = ref(new Date().getFullYear())
const filterMonth = ref(new Date().getMonth() + 1)
const yearOptions = ref([2024, 2025, 2026])
const monthOptions = Array.from({ length: 12 }, (_, i) => i + 1)
const loading = ref(false)

// 目标与完成数据（消课金额）
const yearTarget = ref(0)
const yearActual = ref(0)
const monthTarget = ref(0)
const monthActual = ref(0)
const weekTarget = ref(0)
const weekActual = ref(0)

const yearRate = computed(() => calcRate(yearActual.value, yearTarget.value))
const monthRate = computed(() => calcRate(monthActual.value, monthTarget.value))
const weekRate = computed(() => calcRate(weekActual.value, weekTarget.value))

const chartTitlePrefix = computed(() => filterStoreId.value ? '该门店' : '总公司')

const tableData = ref([])
const trendData = ref([])
const storeBarData = ref([])

// ECharts 实例
let yearChart = null
let monthChart = null
let weekChart = null
let trendChart = null
let storeChart = null

const yearChartRef = ref(null)
const monthChartRef = ref(null)
const weekChartRef = ref(null)
const trendChartRef = ref(null)
const storeChartRef = ref(null)

const calcRate = (actual, target) => {
  if (!target || target <= 0) return 0
  return Math.round((actual / target) * 100)
}

import { formatMoney } from '../utils/format'

const initCharts = () => {
  if (yearChartRef.value) yearChart = echarts.init(yearChartRef.value)
  if (monthChartRef.value) monthChart = echarts.init(monthChartRef.value)
  if (weekChartRef.value) weekChart = echarts.init(weekChartRef.value)
  if (trendChartRef.value) trendChart = echarts.init(trendChartRef.value)
  if (storeChartRef.value) storeChart = echarts.init(storeChartRef.value)
}

const disposeCharts = () => {
  yearChart?.dispose()
  monthChart?.dispose()
  weekChart?.dispose()
  trendChart?.dispose()
  storeChart?.dispose()
}

const updatePieChart = (chart, actual, target) => {
  if (!chart) return
  const rate = calcRate(actual, target)
  const remain = Math.max(0, target - actual)
  chart.setOption({
    tooltip: { trigger: 'item', formatter: '{b}: ¥{c} ({d}%)' },
    legend: { bottom: 0, textStyle: { fontSize: 11 } },
    graphic: [{
      type: 'text',
      left: 'center',
      top: '38%',
      style: {
        text: rate + '%',
        fontSize: 28,
        fontWeight: 'bold',
        fill: rate >= 100 ? '#67C23A' : '#409EFF',
        textAlign: 'center'
      }
    }, {
      type: 'text',
      left: 'center',
      top: '54%',
      style: {
        text: '完成率',
        fontSize: 12,
        fill: '#909399',
        textAlign: 'center'
      }
    }],
    series: [{
      type: 'pie',
      radius: ['62%', '72%'],
      center: ['50%', '50%'],
      avoidLabelOverlap: true,
      itemStyle: { borderRadius: 6, borderColor: '#fff', borderWidth: 2 },
      label: { show: false },
      labelLine: { show: false },
      data: [
        { value: actual, name: '已完成', itemStyle: { color: '#67C23A' } },
        { value: remain, name: '未完成', itemStyle: { color: '#E4E7ED' } }
      ]
    }]
  })
}

const updateTrendChart = () => {
  if (!trendChart) return
  const months = Array.from({length: 12}, (_, i) => (i + 1) + '月')
  trendChart.setOption({
    tooltip: { trigger: 'axis', formatter: '{b}<br/>消课金额: ¥{c}' },
    grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
    xAxis: { type: 'category', data: months, boundaryGap: false },
    yAxis: { type: 'value', axisLabel: { formatter: v => v >= 10000 ? (v/10000).toFixed(1) + '万' : '¥' + v } },
    series: [{
      name: '消课金额',
      type: 'line',
      smooth: true,
      data: trendData.value,
      areaStyle: { color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [{offset: 0, color: 'rgba(103,194,58,0.3)'}, {offset: 1, color: 'rgba(103,194,58,0.05)'}]) },
      lineStyle: { color: '#67C23A', width: 3 },
      itemStyle: { color: '#67C23A' },
      symbol: 'circle',
      symbolSize: 8
    }]
  })
}

const updateStoreChart = () => {
  if (!storeChart) return
  const storeNames = storeBarData.value.map(d => d.storeName)
  const targets = storeBarData.value.map(d => d.target)
  const actuals = storeBarData.value.map(d => d.actual)
  storeChart.setOption({
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' }, formatter: '{b}<br/>{a0}: ¥{c0}<br/>{a1}: ¥{c1}' },
    legend: { data: ['目标', '已完成'] },
    grid: { left: '3%', right: '4%', bottom: storeNames.length > 4 ? '15%' : '3%', containLabel: true },
    xAxis: { type: 'category', data: storeNames, axisLabel: { interval: 0, fontSize: 11 } },
    yAxis: { type: 'value', axisLabel: { formatter: v => v >= 10000 ? (v/10000).toFixed(1) + '万' : '¥' + v } },
    series: [
      { name: '目标', type: 'bar', data: targets, itemStyle: { color: '#E4E7ED', borderRadius: [4, 4, 0, 0] } },
      { name: '已完成', type: 'bar', data: actuals, itemStyle: { color: '#67C23A', borderRadius: [4, 4, 0, 0] } }
    ]
  })
}

const loadData = async () => {
  loading.value = true
  try {
    const params = { year: filterYear.value, month: filterMonth.value }
    const sid = isBoss.value ? filterStoreId.value : myStoreId.value
    if (sid != null) params.storeId = sid

    const res = await api.get('/target-dashboard/consumption', { params })
    const data = res.data || {}

    // 目标完成率（金额）
    yearTarget.value = data.yearTarget || 0
    yearActual.value = data.yearActual || 0
    monthTarget.value = data.monthTarget || 0
    monthActual.value = data.monthActual || 0
    weekTarget.value = data.weekTarget || 0
    weekActual.value = data.weekActual || 0

    // 走势数据
    trendData.value = data.monthlyTrend || Array(12).fill(0)

    // 门店柱状图数据
    storeBarData.value = data.storeComparison || []

    // 表格数据
    tableData.value = data.storeMonthlyData || []

    // 更新图表
    await nextTick()
    updatePieChart(yearChart, yearActual.value, yearTarget.value)
    updatePieChart(monthChart, monthActual.value, monthTarget.value)
    updatePieChart(weekChart, weekActual.value, weekTarget.value)
    updateTrendChart()
    updateStoreChart()
  } finally {
    loading.value = false
  }
}

const loadStores = async () => {
  if (!isBoss.value) return
  const res = await api.get('/stores', { params: { page: 1, size: 100 } })
  stores.value = res.data?.records || res.data || []
}

const onFilterChange = () => {
  loadData()
}

const handleResize = () => {
  yearChart?.resize()
  monthChart?.resize()
  weekChart?.resize()
  trendChart?.resize()
  storeChart?.resize()
}

onMounted(async () => {
  await loadStores()
  initCharts()
  loadData()
  window.addEventListener('resize', handleResize)
})

onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
  disposeCharts()
})
</script>

<style scoped>
/* 修复 el-row 负 margin 导致内容溢出 page-card */
.target-row {
  margin-left: 0 !important;
  margin-right: 0 !important;
}
.target-row .el-col {
  padding-left: 8px !important;
  padding-right: 8px !important;
}
.chart-card {
  background: #fff;
  border-radius: 10px;
  padding: 16px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.05);
  height: 100%;
}
.chart-title {
  font-size: 15px;
  font-weight: 600;
  color: #303133;
  margin-bottom: 12px;
  text-align: center;
}
.pie-chart {
  width: 100%;
  height: 200px;
}
.line-chart {
  width: 100%;
  height: 320px;
}
.bar-chart {
  width: 100%;
  height: 300px;
}
.chart-summary {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  color: #606266;
  margin-top: 8px;
  padding-top: 8px;
  border-top: 1px solid #f0f0f0;
}
.chart-summary span {
  white-space: nowrap;
}
.rate-good { color: #67C23A; font-weight: 600; }
.rate-bad { color: #F56C6C; font-weight: 600; }
</style>
