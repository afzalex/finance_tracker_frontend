/** Query keys for global date range (YYYY-MM-DD). */
export const DATE_RANGE_Q = {
  from: 'from',
  to: 'to',
}

/** Sidebar targets that share the global date range across the app. */
export const SHARED_DATE_RANGE_NAV_PATHS = new Set([
  '/transactions',
  '/emails/unparsed',
  '/accounts',
  '/analytics',
])

/**
 * @param {string} pathname
 * @param {{ from: string, to: string }} range
 * @returns {string} `pathname` or `pathname?from&to` when range is valid
 */
export function pathWithDateRangeQuery(pathname, range) {
  if (!range?.from || !range?.to) return pathname
  if (!YMD_RE.test(range.from) || !YMD_RE.test(range.to)) return pathname
  if (range.from > range.to) return pathname
  const sp = new URLSearchParams()
  sp.set(DATE_RANGE_Q.from, range.from)
  sp.set(DATE_RANGE_Q.to, range.to)
  return `${pathname}?${sp.toString()}`
}

const YMD_RE = /^\d{4}-\d{2}-\d{2}$/

/**
 * @param {URLSearchParams} sp
 * @returns {{ from: string, to: string } | null}
 */
export function parseDateRangeFromSearchParams(sp) {
  const from = sp.get(DATE_RANGE_Q.from)
  const to = sp.get(DATE_RANGE_Q.to)
  if (!from || !to || !YMD_RE.test(from) || !YMD_RE.test(to)) return null
  if (from > to) return null
  return { from, to }
}
