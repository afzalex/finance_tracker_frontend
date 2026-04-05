import { useContext } from 'react'
import DateRangeContext from './DateRangeContext'

export default function useDateRange() {
  const ctx = useContext(DateRangeContext)
  if (!ctx) {
    throw new Error('useDateRange must be used within DateRangeProvider')
  }
  return ctx
}
