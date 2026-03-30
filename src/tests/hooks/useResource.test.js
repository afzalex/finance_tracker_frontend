import { renderHook, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import useResource from '../../hooks/useResource'

describe('useResource', () => {
  it('should initially return idle status and transition to loading then success', async () => {
    const mockData = { id: 1 }
    const loader = vi.fn().mockResolvedValue(mockData)
    
    const { result } = renderHook(() => useResource('test-key-1', loader))

    expect(result.current.status).toBe('idle')
    expect(result.current.data).toBeNull()

    // Wait for the microtask to trigger loading and then success
    await waitFor(() => {
      expect(result.current.status).toBe('success')
    })
    
    expect(result.current.data).toBe(mockData)
    expect(result.current.error).toBeNull()
    expect(loader).toHaveBeenCalledTimes(1)
  })

  it('should transition to error state if loader rejects', async () => {
    const loader = vi.fn().mockRejectedValue(new Error('Fetch error'))
    
    const { result } = renderHook(() => useResource('test-key-2', loader))

    await waitFor(() => {
      expect(result.current.status).toBe('error')
    })
    
    expect(result.current.error).toBe('Fetch error')
  })

  it('caches the resource based on key', async () => {
    let callCount = 0
    const loader = async () => {
      callCount++
      return callCount
    }
    
    const { result, rerender } = renderHook(
      ({ key }) => useResource(key, loader),
      { initialProps: { key: 'cache-key' } }
    )

    await waitFor(() => {
      expect(result.current.status).toBe('success')
    })
    expect(result.current.data).toBe(1)
    
    // Rerender with the same key
    rerender({ key: 'cache-key' })
    // It should still return the cached snapshot
    expect(result.current.data).toBe(1)
    
    // Give time for any microtasks, loader should not be called again
    await new Promise((resolve) => setTimeout(resolve, 0))
    expect(callCount).toBe(1)

    // Rerender with a NEW key
    rerender({ key: 'new-key' })
    await waitFor(() => {
      expect(result.current.data).toBe(2) // callCount incremented
    })
    expect(callCount).toBe(2)
  })
  
  it('returns default error message if error is undefined', async () => {
    // eslint-disable-next-line prefer-promise-reject-errors
    const loader = vi.fn().mockRejectedValue(undefined)
    
    const { result } = renderHook(() => useResource('test-key-4', loader))

    await waitFor(() => {
      expect(result.current.status).toBe('error')
    })
    
    expect(result.current.error).toBe('Request failed')
  })
})
