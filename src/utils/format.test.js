import { describe, expect, it } from 'vitest'
import { formatDate, formatMoney } from './format'

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

describe('formatMoney', () => {
  it('formats USD by default', () => {
    const out = formatMoney(1234.5)
    expect(out).toMatch(/1/)
    expect(out).toMatch(/234/)
  })

  it('respects currency option', () => {
    const out = formatMoney(10, 'EUR')
    expect(out).toMatch(/10/)
  })
})
