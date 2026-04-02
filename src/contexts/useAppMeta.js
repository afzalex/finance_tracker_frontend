import { useContext } from 'react'
import AppMetaContext from './AppMetaContext'

export default function useAppMeta() {
  return useContext(AppMetaContext)?.meta ?? null
}

