<template>
  <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:60vh;text-align:center">
    <div style="font-size:72px;font-weight:700;color:#409eff;margin-bottom:16px">404</div>
    <div style="font-size:18px;color:#606266;margin-bottom:24px">页面不存在</div>
    <el-button type="primary" @click="$router.push('/dashboard')">返回首页</el-button>
  </div>
</template>
