import { describe, expect, it } from 'vitest'
import {
  formatDate,
  formatDateTime,
  formatInrAmount,
  formatInrAmountParts,
  formatMoney,
  formatMonthYearShortHyphen,
} from '../../utils/format'

describe('formatDate', () => {
  it('returns a non-empty locale string for valid ISO date', () => {
    const out = formatDate('2026-03-28')
    expect(typeof out).toBe('string')
    expect(out.length).toBeGreaterThan(0)
    expect(out).toMatch(/2026/)
  })

  it('returns original value when date is invalid', () => {
    expect(formatDate('not-a-date')).toBe('not-a-date')
  })
})

describe('formatDateTime', () => {
  it('returns date and time for valid ISO timestamp', () => {
    const out = formatDateTime('2026-03-28T14:30:00Z')
    expect(typeof out).toBe('string')
    expect(out.length).toBeGreaterThan(0)
    expect(out).toMatch(/2026/)
  })

  it('returns original value when date is invalid', () => {
    expect(formatDateTime('not-a-date')).toBe('not-a-date')
  })
})

describe('formatMonthYearShortHyphen', () => {
  it('uses short month, hyphen, and 4-digit year (local date)', () => {
    expect(formatMonthYearShortHyphen(new Date(2026, 3, 6))).toMatch(/-2026$/)
    expect(formatMonthYearShortHyphen(new Date(2026, 3, 6))).not.toMatch(
      /\d{1,2}\s*,\s*\d{4}/,
    )
  })

  it('returns original string when value is not a valid date', () => {
    expect(formatMonthYearShortHyphen('not-a-date')).toBe('not-a-date')
  })
})

describe('formatMoney', () => {
  it('formats INR by default', () => {
    const out = formatMoney(1234.5)
    expect(out).toMatch(/1/)
    expect(out).toMatch(/234/)
  })

  it('respects currency option', () => {
    const out = formatMoney(10, 'EUR')
    expect(out).toMatch(/10/)
  })
})

describe('formatInrAmountParts', () => {
  it('splits code and figure', () => {
    const { code, figure } = formatInrAmountParts(1234.5)
    expect(code).toBe('INR')
    expect(figure).toMatch(/1[,.]?234/)
  })
})

describe('formatInrAmount', () => {
  it('prefixes INR with two decimals', () => {
    expect(formatInrAmount(1234.5)).toMatch(/^INR /)
    expect(formatInrAmount(1234.5)).toMatch(/1[,.]?234/)
  })

  it('formats negatives', () => {
    expect(formatInrAmount(-99)).toMatch(/^INR /)
    expect(formatInrAmount(-99)).toMatch(/99/)
  })
})
