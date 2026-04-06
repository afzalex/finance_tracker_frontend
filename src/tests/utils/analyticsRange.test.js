import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest'
import {
  parseAnalyticsMonthsParam,
  ymdRangeForLastNCalendarMonths,
} from '../../utils/analyticsRange'

describe('parseAnalyticsMonthsParam', () => {
  it('defaults invalid or missing to 12', () => {
    expect(parseAnalyticsMonthsParam(null)).toBe(12)
    expect(parseAnalyticsMonthsParam('')).toBe(12)
    expect(parseAnalyticsMonthsParam('99')).toBe(12)
  })

  it('accepts allowed choices', () => {
    expect(parseAnalyticsMonthsParam('3')).toBe(3)
    expect(parseAnalyticsMonthsParam('6')).toBe(6)
    expect(parseAnalyticsMonthsParam('24')).toBe(24)
  })
})

describe('ymdRangeForLastNCalendarMonths', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date(2026, 3, 10, 12, 0, 0))
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it('returns first of (N-1) prior months through today', () => {
    expect(ymdRangeForLastNCalendarMonths(3)).toEqual({
      from: '2026-02-01',
      to: '2026-04-10',
    })
    expect(ymdRangeForLastNCalendarMonths(12)).toEqual({
      from: '2025-05-01',
      to: '2026-04-10',
    })
  })
})
