const MAX_RETURN_TO_LEN = 2048

/**
 * Parse and validate a `returnTo` query value: same-origin path only (open-redirect safe).
 * @param {string | null | undefined} raw
 * @returns {string | null} pathname + search + hash, or null
 */
export function parseSafeReturnToParam(raw) {
  if (raw == null || typeof raw !== 'string') return null
  let decoded
  try {
    decoded = decodeURIComponent(raw.trim())
  } catch {
    return null
  }
  if (!decoded || decoded.length > MAX_RETURN_TO_LEN) return null
  if (!decoded.startsWith('/') || decoded.startsWith('//')) return null
  if (decoded.includes('://')) return null
  if (decoded.includes('\\')) return null
  try {
    const base =
      typeof window !== 'undefined' && window.location?.origin
        ? window.location.origin
        : 'http://localhost'
    const u = new URL(decoded, base)
    if (typeof window !== 'undefined' && window.location?.origin) {
      if (u.origin !== window.location.origin) return null
    }
    return u.pathname + u.search + u.hash
  } catch {
    return null
  }
}

/**
 * Human-readable destination when we can infer it from the return path (for dialogs).
 * @param {string | null | undefined} path from {@link parseSafeReturnToParam}
 * @returns {string | null}
 */
export function getReturnToDestinationLabel(path) {
  if (!path || typeof path !== 'string') return null
  try {
    const base =
      typeof window !== 'undefined' && window.location?.origin
        ? window.location.origin
        : 'http://localhost'
    const u = new URL(path, base)
    const segments = u.pathname.split('/').filter(Boolean)
    if (segments[0] !== 'transactions') return null
    if (segments.length === 1) return 'Transactions'
    if (segments.length === 2) return 'Transaction Details'
    return null
  } catch {
    return null
  }
}

/**
 * @param {'afterSave' | 'afterDeactivate' | 'dismiss'} variant
 * @param {{ entity?: string }} [options] entity noun for deactivate copy (default "rule")
 */
export function leaveReturnCopy(path, variant, options = {}) {
  const entity = options.entity ?? 'rule'
  const label = getReturnToDestinationLabel(path)
  const title = label ? `Return to ${label}?` : 'Return to where you came from?'
  let body
  if (variant === 'afterSave') {
    body = label
      ? `Your changes were saved. You will be taken back to ${label}. Continue?`
      : 'Your changes were saved. You will be taken back to where you opened this from. Continue?'
  } else if (variant === 'afterDeactivate') {
    body = label
      ? `This ${entity} was deactivated. Go back to ${label}?`
      : `This ${entity} was deactivated. Go back to where you opened this from?`
  } else {
    body = label
      ? `Go back to ${label}?`
      : 'Go back to where you opened this from?'
  }
  return { title, body }
}
