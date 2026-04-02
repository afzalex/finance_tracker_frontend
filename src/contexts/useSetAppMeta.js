import { useContext } from 'react'
import AppMetaContext from './AppMetaContext'

export default function useSetAppMeta() {
  return useContext(AppMetaContext)?.setMeta ?? null
}

