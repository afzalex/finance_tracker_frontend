import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { apiErrorMessage, postEmailMatchPreview } from '../services/financeApi'

/** When opening rules from mail/transaction flows, links may include this query key. */
export const CONTEXT_MAIL_Q = 'context_mail_id'

/** Outlined control aligned with `Chip size="small"` (matcher row). */
export const matcherMailPreviewTriggerSx = {
  textTransform: 'none',
  height: 24,
  minHeight: 24,
  px: 1,
  py: 0,
  fontWeight: 400,
  borderRadius: '16px',
  flexShrink: 0,
  fontSize: '0.8125rem',
  whiteSpace: 'nowrap',
}

export const MATCH_PREVIEW_LIMIT = 3
export const MATCH_PREVIEW_LOOKBACK_DAYS = 30
/** Shown when the API does not return a window label; matches `lookback_days`. */
export const MATCH_PREVIEW_FALLBACK_WINDOW = 'last 30 days'

export function parseContextMailIdFromSearchParams(sp) {
  const primary = (sp.get(CONTEXT_MAIL_Q) ?? '').trim()
  if (primary) return primary
  return (sp.get('mail_id') ?? '').trim()
}

export function normalizeMatchPreviewListResponse(data) {
  const rawItems = Array.isArray(data?.items) ? data.items : []
  const wl =
    data?.window_label ?? data?.windowLabel ?? data?.lookback_label ?? data?.period_label
  const windowLabel =
    typeof wl === 'string' && wl.trim() ? wl.trim() : MATCH_PREVIEW_FALLBACK_WINDOW

  const items = rawItems.slice(0, MATCH_PREVIEW_LIMIT).map((row, index) => {
    const mail_id = String(row?.mail_id ?? row?.id ?? `mail-${index}`)
    const subject = String(row?.subject ?? '').trim() || '—'
    const sender = String(row?.sender ?? row?.from ?? '').trim()
    const when = String(
      row?.when ?? row?.received_at ?? row?.sent_at ?? row?.date ?? '',
    ).trim()
    const snippet = String(
      row?.snippet ?? row?.preview ?? row?.body_snippet ?? '',
    ).trim()
    const bodyText = String(
      row?.body_text ??
        row?.body ??
        row?.mail_body ??
        row?.message_body ??
        row?.text_body ??
        row?.plain_body ??
        row?.bodyText ??
        '',
    ).trim()
    return { mail_id, subject, sender, when, snippet, bodyText }
  })

  return { windowLabel, items }
}

/**
 * Shared matcher UX for classification + parser rule dialogs (create and edit):
 * context-mail match badge, list match preview, debounced single-mail check.
 */
export function useRuleMatcherPreview({
  dialogOpen,
  subjectMatch,
  senderMatch,
  bodyMatch,
}) {
  const [searchParams] = useSearchParams()
  const contextMailFromUrl = useMemo(
    () => parseContextMailIdFromSearchParams(searchParams),
    [searchParams],
  )
  const hasContextMail = Boolean(dialogOpen && contextMailFromUrl)

  const [previewEnabled, setPreviewEnabled] = useState(false)
  const [previewState, setPreviewState] = useState({
    status: 'idle',
    data: null,
    error: null,
  })
  const matchPreviewAbortRef = useRef(null)

  const [contextMailMatch, setContextMailMatch] = useState({
    status: 'idle',
    matched: null,
    notInCache: false,
    error: null,
    mailSubject: null,
  })

  const fetchMatchingMailsPreview = useCallback(async () => {
    if (!dialogOpen || hasContextMail) return

    matchPreviewAbortRef.current?.abort()
    const ac = new AbortController()
    matchPreviewAbortRef.current = ac
    const { signal } = ac

    const anyMatcher =
      String(subjectMatch ?? '').trim() !== '' ||
      String(senderMatch ?? '').trim() !== '' ||
      String(bodyMatch ?? '').trim() !== ''

    setPreviewState({ status: 'loading', data: null, error: null })

    if (!anyMatcher) {
      setPreviewState({
        status: 'empty',
        data: { windowLabel: MATCH_PREVIEW_FALLBACK_WINDOW, items: [] },
        error: null,
      })
      return
    }

    try {
      const raw = await postEmailMatchPreview(
        {
          subject_match_regex: subjectMatch,
          sender_match_regex: senderMatch,
          body_match_regex: bodyMatch,
          limit: MATCH_PREVIEW_LIMIT,
          lookback_days: MATCH_PREVIEW_LOOKBACK_DAYS,
        },
        { signal },
      )
      if (signal.aborted) return
      const { windowLabel, items } = normalizeMatchPreviewListResponse(raw)
      if (items.length === 0) {
        setPreviewState({
          status: 'empty',
          data: { windowLabel, items: [] },
          error: null,
        })
      } else {
        setPreviewState({
          status: 'success',
          data: { windowLabel, items },
          error: null,
        })
      }
    } catch (e) {
      if (signal.aborted) return
      setPreviewState({
        status: 'error',
        data: null,
        error: apiErrorMessage(e),
      })
    }
  }, [dialogOpen, hasContextMail, subjectMatch, senderMatch, bodyMatch])

  useEffect(() => {
    if (dialogOpen) return
    matchPreviewAbortRef.current?.abort()
    matchPreviewAbortRef.current = null
    /* Reset list preview when the rule dialog closes (derive UI from `dialogOpen`). */
    queueMicrotask(() => {
      setPreviewEnabled(false)
      setPreviewState({ status: 'idle', data: null, error: null })
    })
  }, [dialogOpen])

  const fetchContextMailMatch = useCallback(
    async ({ signal } = {}) => {
      if (!contextMailFromUrl || !dialogOpen) return

      const anyMatcher =
        String(subjectMatch ?? '').trim() !== '' ||
        String(senderMatch ?? '').trim() !== '' ||
        String(bodyMatch ?? '').trim() !== ''

      if (!anyMatcher) {
        setContextMailMatch({
          status: 'ready',
          matched: null,
          notInCache: false,
          error: null,
          mailSubject: null,
        })
        return
      }

      setContextMailMatch((prev) => ({
        ...prev,
        status: 'loading',
        error: null,
        notInCache: false,
        mailSubject: null,
      }))

      try {
        const data = await postEmailMatchPreview(
          {
            mail_id: contextMailFromUrl,
            subject_match_regex: subjectMatch,
            sender_match_regex: senderMatch,
            body_match_regex: bodyMatch,
          },
          { signal },
        )
        const m = data?.matched
        const sub = data?.tested_mail?.subject
        setContextMailMatch({
          status: 'ready',
          matched: typeof m === 'boolean' ? m : null,
          notInCache: false,
          error: null,
          mailSubject: typeof sub === 'string' && sub.trim() ? sub.trim() : null,
        })
      } catch (e) {
        if (signal?.aborted) return
        if (e?.status === 404) {
          setContextMailMatch({
            status: 'ready',
            matched: null,
            notInCache: true,
            error: null,
            mailSubject: null,
          })
          return
        }
        setContextMailMatch({
          status: 'error',
          matched: null,
          notInCache: false,
          error: apiErrorMessage(e),
          mailSubject: null,
        })
      }
    },
    [contextMailFromUrl, dialogOpen, subjectMatch, senderMatch, bodyMatch],
  )

  useEffect(() => {
    if (!hasContextMail) {
      queueMicrotask(() => {
        setContextMailMatch({
          status: 'idle',
          matched: null,
          notInCache: false,
          error: null,
          mailSubject: null,
        })
      })
      return undefined
    }
    const ac = new AbortController()
    const tid = window.setTimeout(() => {
      void fetchContextMailMatch({ signal: ac.signal })
    }, 400)
    return () => {
      ac.abort()
      window.clearTimeout(tid)
    }
  }, [hasContextMail, fetchContextMailMatch])

  return {
    contextMailFromUrl,
    hasContextMail,
    previewEnabled,
    setPreviewEnabled,
    previewState,
    setPreviewState,
    fetchMatchingMailsPreview,
    matchPreviewAbortRef,
    contextMailMatch,
  }
}
