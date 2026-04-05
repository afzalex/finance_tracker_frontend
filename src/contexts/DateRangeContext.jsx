import {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  DATE_RANGE_Q,
  parseDateRangeFromSearchParams,
} from '../utils/dateRangeUrl'

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

function readInitialRangeFromWindow() {
  if (typeof window === 'undefined') return defaultRangeYmd()
  const sp = new URLSearchParams(window.location.search)
  return parseDateRangeFromSearchParams(sp) ?? defaultRangeYmd()
}

const DateRangeContext = createContext(null)

export function DateRangeProvider({ children }) {
  const [searchParams, setSearchParams] = useSearchParams()
  const initial = useMemo(() => readInitialRangeFromWindow(), [])
  const [from, setFrom] = useState(initial.from)
  const [to, setTo] = useState(initial.to)
  const skipUrlToStateRef = useRef(false)

  const fromParam = searchParams.get(DATE_RANGE_Q.from)
  const toParam = searchParams.get(DATE_RANGE_Q.to)

  useEffect(() => {
    if (skipUrlToStateRef.current) {
      skipUrlToStateRef.current = false
      return
    }
    const pair =
      fromParam &&
      toParam &&
      /^\d{4}-\d{2}-\d{2}$/.test(fromParam) &&
      /^\d{4}-\d{2}-\d{2}$/.test(toParam) &&
      fromParam <= toParam
        ? { from: fromParam, to: toParam }
        : null
    if (pair) {
      // Sync browser URL (back/forward, shared links) into context; not redundant with setRange.
      // eslint-disable-next-line react-hooks/set-state-in-effect -- router is external source of truth
      setFrom(pair.from)
      setTo(pair.to)
    }
  }, [fromParam, toParam])

  const setRange = useCallback(
    (range) => {
      setFrom(range.from)
      setTo(range.to)
      skipUrlToStateRef.current = true
      setSearchParams(
        (prev) => {
          const sp = new URLSearchParams(prev)
          sp.set(DATE_RANGE_Q.from, range.from)
          sp.set(DATE_RANGE_Q.to, range.to)
          return sp
        },
        { replace: true },
      )
    },
    [setSearchParams],
  )

  const value = useMemo(() => ({ from, to, setRange }), [from, to, setRange])

  return <DateRangeContext.Provider value={value}>{children}</DateRangeContext.Provider>
}

export default DateRangeContext
