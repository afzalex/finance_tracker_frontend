/** Shared MUI `sx` fragments for currency / numeric display. */

export function signedAmountSx(amount) {
  return {
    fontVariantNumeric: 'tabular-nums',
    color: amount < 0 ? 'error.main' : 'success.main',
  }
}

export function balanceAmountSx(amount) {
  return {
    fontVariantNumeric: 'tabular-nums',
    color: amount < 0 ? 'error.main' : 'text.primary',
  }
}
