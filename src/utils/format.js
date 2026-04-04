export function formatDate(isoDate) {
  const d = new Date(isoDate)
  if (Number.isNaN(d.getTime())) return isoDate
  return d.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
  })
}

export function formatDateTime(isoDate) {
  const d = new Date(isoDate)
  if (Number.isNaN(d.getTime())) return isoDate
  return d.toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: 'numeric',
    minute: '2-digit',
  })
}

export function formatMoney(amount, currency = 'USD') {
  return new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency,
    maximumFractionDigits: 2,
  }).format(amount)
}

/** `{ code, figure }` for styling the currency label separately from the amount. */
export function formatInrAmountParts(amount) {
  const n = Number(amount)
  if (!Number.isFinite(n)) return { code: 'INR', figure: '—' }
  const figure = new Intl.NumberFormat(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n)
  return { code: 'INR', figure }
}

/** Plain "INR " + fixed decimals (no currency symbol). */
export function formatInrAmount(amount) {
  const { code, figure } = formatInrAmountParts(amount)
  return `${code} ${figure}`
}

