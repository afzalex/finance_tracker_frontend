import { useMemo, useRef } from 'react'
import { useSyncExternalStore } from 'react'

function createResource(loader) {
  let state = { status: 'idle', data: null, error: null }
  const listeners = new Set()

  const emit = () => {
    for (const l of listeners) l()
  }

  const load = async () => {
    state = { status: 'loading', data: state.data, error: null }
    emit()
    try {
      const data = await loader()
      state = { status: 'success', data, error: null }
      emit()
    } catch (e) {
      state = {
        status: 'error',
        data: state.data,
        error: e?.message ?? 'Request failed',
      }
      emit()
    }
  }

  return {
    getSnapshot: () => state,
    subscribe: (listener) => {
      listeners.add(listener)
      if (state.status === 'idle') {
        // Defer to avoid update loops during subscription/mount.
        queueMicrotask(() => {
          void load()
        })
      }
      return () => listeners.delete(listener)
    },
  }
}

// Generic async loader hook without useEffect setState patterns.
export default function useResource(key, loader) {
  const loaderRef = useRef(loader)
  loaderRef.current = loader

  // Cache the resource store by key, not by function identity.
  const store = useMemo(
    () => createResource(() => loaderRef.current()),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [key],
  )
  return useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot)
}

