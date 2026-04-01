import { describe, expect, it } from 'vitest'
import {
  getReturnToDestinationLabel,
  leaveReturnCopy,
  parseSafeReturnToParam,
} from '../../utils/safeReturnTo'

describe('parseSafeReturnToParam', () => {
  it('accepts same-origin path + search', () => {
    const raw = encodeURIComponent('/transactions/1?tab=email&page=0')
    expect(parseSafeReturnToParam(raw)).toBe('/transactions/1?tab=email&page=0')
  })

  it('rejects null, empty, protocol-relative, and external-looking values', () => {
    expect(parseSafeReturnToParam(null)).toBeNull()
    expect(parseSafeReturnToParam('')).toBeNull()
    expect(parseSafeReturnToParam(encodeURIComponent('//evil.com/path'))).toBeNull()
    expect(parseSafeReturnToParam(encodeURIComponent('https://evil.com/'))).toBeNull()
  })

  it('rejects malformed percent-encoding', () => {
    expect(parseSafeReturnToParam('%')).toBeNull()
  })
})

describe('getReturnToDestinationLabel', () => {
  it('labels transaction detail URLs', () => {
    expect(getReturnToDestinationLabel('/transactions/42')).toBe('Transaction Details')
    expect(getReturnToDestinationLabel('/transactions/42?tab=email')).toBe(
      'Transaction Details',
    )
  })

  it('labels transactions list', () => {
    expect(getReturnToDestinationLabel('/transactions')).toBe('Transactions')
    expect(getReturnToDestinationLabel('/transactions?page=1')).toBe('Transactions')
  })

  it('returns null for unknown paths', () => {
    expect(getReturnToDestinationLabel('/settings/rules')).toBeNull()
    expect(getReturnToDestinationLabel('/transactions/foo/bar')).toBeNull()
  })
})

describe('leaveReturnCopy', () => {
  it('uses entity in afterDeactivate copy', () => {
    const rule = leaveReturnCopy('/transactions/1', 'afterDeactivate')
    expect(rule.body).toContain('rule')
    const parser = leaveReturnCopy('/transactions/1', 'afterDeactivate', {
      entity: 'parser',
    })
    expect(parser.body).toContain('parser')
  })
})
