import { createContext, useState } from 'react'

const AppMetaContext = createContext(null)

export function AppMetaProvider({ children, initialMeta = null }) {
  const [meta, setMeta] = useState(initialMeta)
  return (
    <AppMetaContext.Provider value={{ meta, setMeta }}>
      {children}
    </AppMetaContext.Provider>
  )
}

export default AppMetaContext

