/** Query key for Analytics period (number of calendar months ending today). */
export const ANALYTICS_MONTHS_Q = 'am'

export const ANALYTICS_MONTH_CHOICES = Object.freeze([3, 6, 12, 24])

const CHOICE_SET = new Set(ANALYTICS_MONTH_CHOICES)

const DEFAULT_MONTHS = 12

/**
 * @param {string | null | undefined} raw
 * @returns {number}
 */
export function parseAnalyticsMonthsParam(raw) {
  const n = Number(raw)
  if (!Number.isFinite(n) || !CHOICE_SET.has(n)) return DEFAULT_MONTHS
  return n
}

export function analyticsMonthsLabel(n) {
  if (n === 1) return 'Last 1 month'
  return `Last ${n} months`
}

/**
 * Inclusive window: first day of the month (N−1) months before the current month, through today (local).
 * @param {number} n
 * @param {Date} [now]
 * @returns {{ from: string, to: string }}
 */
export function ymdRangeForLastNCalendarMonths(n, now = new Date()) {
  const y = now.getFullYear()
  const mIdx = now.getMonth()
  const day = now.getDate()
  const toYmd = `${y}-${String(mIdx + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
  const fromDate = new Date(y, mIdx - (n - 1), 1)
  const fy = fromDate.getFullYear()
  const fm = fromDate.getMonth() + 1
  const fromYmd = `${fy}-${String(fm).padStart(2, '0')}-01`
  return { from: fromYmd, to: toYmd }
}
