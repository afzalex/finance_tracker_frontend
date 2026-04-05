import { useMemo, useState } from 'react'
import { MobileNavContext } from './mobileNavContext'

export function MobileNavProvider({ children }) {
  const [mobileOpen, setMobileOpen] = useState(false)
  const value = useMemo(() => ({ mobileOpen, setMobileOpen }), [mobileOpen])
  return <MobileNavContext.Provider value={value}>{children}</MobileNavContext.Provider>
}
