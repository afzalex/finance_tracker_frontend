import { useContext } from 'react'
import { MobileNavContext } from './mobileNavContext'

export function useMobileNavDrawer() {
  const ctx = useContext(MobileNavContext)
  if (!ctx) {
    throw new Error('useMobileNavDrawer must be used within MobileNavProvider')
  }
  return ctx
}
