import { describe, expect, it } from 'vitest'
import { balanceAmountSx, signedAmountSx } from './moneySx'

describe('signedAmountSx', () => {
  it('colors negative amounts as error', () => {
    expect(signedAmountSx(-1).color).toBe('error.main')
  })

  it('colors non-negative amounts as success', () => {
    expect(signedAmountSx(0).color).toBe('success.main')
    expect(signedAmountSx(42).color).toBe('success.main')
  })
})

describe('balanceAmountSx', () => {
  it('colors negative balances as error', () => {
    expect(balanceAmountSx(-10).color).toBe('error.main')
  })

  it('uses default text color for non-negative balances', () => {
    expect(balanceAmountSx(0).color).toBe('text.primary')
    expect(balanceAmountSx(100).color).toBe('text.primary')
  })
})
