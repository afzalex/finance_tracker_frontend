import { createContext, useCallback, useMemo, useState } from 'react'

function defaultRangeYmd() {
  const now = new Date()
  const from = formatYmd(new Date(now.getFullYear(), now.getMonth(), 1))
  const to = formatYmd(now)
  return { from, to }
}

function formatYmd(d) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

const DateRangeContext = createContext(null)

export function DateRangeProvider({ children }) {
  const initial = useMemo(() => defaultRangeYmd(), [])
  const [from, setFrom] = useState(initial.from)
  const [to, setTo] = useState(initial.to)

  const setRange = useCallback((range) => {
    setFrom(range.from)
    setTo(range.to)
  }, [])

  const value = useMemo(() => ({ from, to, setRange }), [from, to, setRange])

  return <DateRangeContext.Provider value={value}>{children}</DateRangeContext.Provider>
}

export default DateRangeContext
