import { createContext, useState } from 'react'

const AppMetaContext = createContext(null)

export function AppMetaProvider({ children }) {
  const [meta, setMeta] = useState(null)
  return (
    <AppMetaContext.Provider value={{ meta, setMeta }}>
      {children}
    </AppMetaContext.Provider>
  )
}

export default AppMetaContext

