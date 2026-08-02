/**
 * 格式化金额：统一全项目金额显示
 * - null/undefined/0 → ¥0
 * - >= 10000 → ¥X.X万
 * - < 10000 → ¥X,XXX
 */
export const formatMoney = (v) => {
  if (!v) return '¥0'
  const n = Number(v)
  if (isNaN(n)) return '¥0'
  if (n >= 10000) return '¥' + (n / 10000).toFixed(1) + '万'
  return '¥' + n.toLocaleString()
}
