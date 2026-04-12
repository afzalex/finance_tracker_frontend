import { isValidElement, useCallback, useEffect, useMemo, useState } from 'react'
import { Link as RouterLink, useLocation } from 'react-router-dom'
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Link,
  Stack,
  Typography,
} from '@mui/material'
import ConfirmDialog from './ConfirmDialog'
import { MessageType } from '../api'
import {
  apiErrorMessage,
  getFetchedEmailByMailId,
  getUnparsedEmailDetail,
  reprocessEmailByMailId,
} from '../services/financeApi'

function normalizeUnparsedDetail(d) {
  if (!d?.email) return null
  const enrichment =
    d.enrichment ??
    (d.classification_id != null || d.parser_id != null
      ? {
          classification: d.classification ?? null,
          classification_id: d.classification_id ?? null,
          classification_name: d.classification_name ?? null,
          parser_id: d.parser_id ?? null,
          parser_name: d.parser_name ?? null,
          updated_at: d.created_at,
        }
      : null)
  return { ...d.email, enrichment }
}

/** `enrichment.classification` is the message type (e.g. TRANSACTION_ALERT). */
function isTransactionAlertClassification(enrichment) {
  const raw = enrichment?.classification
  if (raw == null || String(raw).trim() === '') return false
  const normalized = String(raw).trim().toUpperCase().replace(/\s+/g, '_')
  return (
    normalized === MessageType.TransactionAlert ||
    normalized === 'TRANSACTIONALERT'
  )
}
import { formatDateTime } from '../utils/format'

function DetailLine({ label, value }) {
  const display =
    value === null || value === undefined || value === ''
      ? '—'
      : isValidElement(value)
        ? value
        : String(value)
  return (
    <Stack
      direction={{ xs: 'column', sm: 'row' }}
      spacing={{ xs: 0, sm: 2 }}
      sx={{ py: { xs: 0.5, md: 0.75 } }}
    >
      <Typography
        component="span"
        variant="body2"
        color="text.secondary"
        sx={{ minWidth: { sm: 160 }, flexShrink: 0 }}
      >
        {label}
      </Typography>
      <Typography component="span" variant="body2" sx={{ wordBreak: 'break-word' }}>
        {display}
      </Typography>
    </Stack>
  )
}

function MailBodyBlock({ text }) {
  return (
    <Box
      component="pre"
      sx={{
        m: 0,
        mt: 0.5,
        p: 1.5,
        bgcolor: 'action.hover',
        borderRadius: 0.5,
        fontSize: '0.8125rem',
        fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
        whiteSpace: 'pre-wrap',
        wordBreak: 'break-word',
      }}
    >
      {text && String(text).trim() !== '' ? text : '—'}
    </Box>
  )
}

export default function EmailSourcePanel({
  mailId,
  unparsedMessageId,
  active,
  onNotify,
  onReprocessSuccess,
  reprocessAlign = 'center',
  showReprocessButton = true,
  onBindOpenReprocessConfirm,
}) {
  const [mailState, setMailState] = useState({
    status: 'idle',
    data: null,
    error: null,
  })
  const [reprocessState, setReprocessState] = useState({ status: 'idle' })
  const [confirmReprocessOpen, setConfirmReprocessOpen] = useState(false)
  const openReprocessConfirm = useCallback(
    () => setConfirmReprocessOpen(true),
    [],
  )

  const location = useLocation()

  useEffect(() => {
    if (!active) return

    const unparsedId = Number(unparsedMessageId)
    const useUnparsedDetail = Number.isFinite(unparsedId)
    const rawMail = String(mailId ?? '').trim()

    if (!useUnparsedDetail && !rawMail) return

    let cancelled = false
    setReprocessState({ status: 'idle' })
    queueMicrotask(() => {
      if (!cancelled) setMailState({ status: 'loading', data: null, error: null })
    })

    const load = useUnparsedDetail
      ? getUnparsedEmailDetail(unparsedId).then((detail) => {
          const normalized = normalizeUnparsedDetail(detail)
          if (!normalized) throw new Error('Invalid unparsed email response')
          return normalized
        })
      : getFetchedEmailByMailId(rawMail)

    load
      .then((data) => {
        if (!cancelled) setMailState({ status: 'success', data, error: null })
      })
      .catch((err) => {
        if (!cancelled) {
          setMailState({
            status: 'error',
            data: null,
            error: apiErrorMessage(err),
          })
        }
      })
    return () => {
      cancelled = true
    }
  }, [active, mailId, unparsedMessageId])

  const mail = mailState.data
  const enrichment = mail?.enrichment

  const classificationLinkTo = useMemo(() => {
    if (enrichment?.classification_id == null) return null
    const qs = new URLSearchParams()
    qs.set('returnTo', `${location.pathname}${location.search}`)
    const ctxMail =
      mailState.status === 'success' && mail?.mail_id != null
        ? String(mail.mail_id).trim()
        : String(mailId ?? '').trim()
    if (ctxMail) qs.set('context_mail_id', ctxMail)
    return `/settings/classifications/${enrichment.classification_id}?${qs.toString()}`
  }, [
    enrichment?.classification_id,
    location.pathname,
    location.search,
    mail?.mail_id,
    mailId,
    mailState.status,
  ])

  const parserLinkTo = useMemo(() => {
    if (enrichment?.parser_id == null) return null
    const qs = new URLSearchParams()
    qs.set('returnTo', `${location.pathname}${location.search}`)
    const ctxMail =
      mailState.status === 'success' && mail?.mail_id != null
        ? String(mail.mail_id).trim()
        : String(mailId ?? '').trim()
    if (ctxMail) qs.set('context_mail_id', ctxMail)
    return `/settings/parsers/${enrichment.parser_id}?${qs.toString()}`
  }, [
    enrichment?.parser_id,
    location.pathname,
    location.search,
    mail?.mail_id,
    mailId,
    mailState.status,
  ])

  const createParserLinkTo = useMemo(() => {
    const qs = new URLSearchParams()
    qs.set('returnTo', `${location.pathname}${location.search}`)
    const ctxMail =
      mailState.status === 'success' && mail?.mail_id != null
        ? String(mail.mail_id).trim()
        : String(mailId ?? '').trim()
    if (ctxMail) qs.set('context_mail_id', ctxMail)
    return `/settings/parsers/new?${qs.toString()}`
  }, [location.pathname, location.search, mail?.mail_id, mailId, mailState.status])

  const reprocessMailId =
    mailState.status === 'success' && mailState.data?.mail_id != null
      ? String(mailState.data.mail_id).trim()
      : String(mailId ?? '').trim()

  const showReprocess =
    Number.isFinite(Number(unparsedMessageId)) || reprocessMailId !== ''

  return (
    <>
      <Stack spacing={1}>
        {showReprocess && (
          <DetailLine
            label="Email ID"
            value={mail?.mail_id ?? mailId ?? '—'}
          />
        )}

        {mailState.status === 'loading' && (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
            <CircularProgress size={32} aria-label="Loading email" />
          </Box>
        )}

        {mailState.status === 'error' && (
          <Alert severity="warning">{mailState.error}</Alert>
        )}

        {mailState.status === 'success' && mail && (
          <>
            <DetailLine label="Subject" value={mail.subject} />
            <DetailLine label="Sender" value={mail.sender} />
            <DetailLine label="Snippet" value={mail.snippet} />
            <DetailLine
              label="Internal date"
              value={
                mail.internal_date_ms != null
                  ? formatDateTime(new Date(mail.internal_date_ms).toISOString())
                  : '—'
              }
            />
            <DetailLine label="Stored at" value={formatDateTime(mail.created_at)} />
            <Box component="section" sx={{ pt: 0.5, pb: 1.5 }}>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                Body
              </Typography>
              <MailBodyBlock text={mail.body_text} />
            </Box>

            {enrichment ? (
              <Box component="section">
                <DetailLine
                  label="Classification"
                  value={
                    enrichment.classification_id && classificationLinkTo ? (
                      <Link
                        component={RouterLink}
                        to={classificationLinkTo}
                        underline="hover"
                      >
                        {enrichment.classification_name ??
                          enrichment.classification ??
                          String(enrichment.classification_id)}
                      </Link>
                    ) : (
                      enrichment.classification_name ??
                      enrichment.classification ??
                      '—'
                    )
                  }
                />
                <DetailLine
                  label="Parser"
                  value={
                    enrichment.parser_id != null && parserLinkTo ? (
                      <Link component={RouterLink} to={parserLinkTo} underline="hover">
                        {enrichment.parser_name ?? String(enrichment.parser_id)}
                      </Link>
                    ) : String(enrichment.parser_name ?? '').trim() !== '' ? (
                      enrichment.parser_name
                    ) : isTransactionAlertClassification(enrichment) ? (
                      <Stack component="span" spacing={0.5}>
                        <Typography
                          component="span"
                          variant="body2"
                          color="text.secondary"
                        >
                          No Parser Found
                        </Typography>
                        <Link
                          component={RouterLink}
                          to={createParserLinkTo}
                          underline="hover"
                          sx={{ fontStyle: 'italic', alignSelf: 'flex-start' }}
                        >
                          Create parser
                        </Link>
                      </Stack>
                    ) : (
                      '—'
                    )
                  }
                />
                <DetailLine
                  label="Enrichment updated"
                  value={formatDateTime(enrichment.updated_at)}
                />
              </Box>
            ) : (
              <Typography variant="body2" color="text.secondary">
                No enrichment row for this email.
              </Typography>
            )}
          </>
        )}

        {showReprocess && showReprocessButton && (
          <Box
            sx={{
              pt: 2,
              pb: 0.5,
              display: 'flex',
              justifyContent: reprocessAlign === 'left' ? 'flex-start' : 'center',
            }}
          >
            <Button
              size="small"
              variant="outlined"
              disabled={reprocessState.status === 'loading'}
              onClick={openReprocessConfirm}
            >
              {reprocessState.status === 'loading' ? 'Reprocessing…' : 'Reprocess'}
            </Button>
          </Box>
        )}
      </Stack>

      {typeof onBindOpenReprocessConfirm === 'function' && (
        <BindOpenReprocessConfirm
          onBind={onBindOpenReprocessConfirm}
          onOpen={openReprocessConfirm}
        />
      )}

      <ConfirmDialog
        open={confirmReprocessOpen}
        title="Reprocess this email?"
        onClose={() => setConfirmReprocessOpen(false)}
        cancelText="Cancel"
        confirmText="Reprocess"
        confirmButtonProps={{
          color: 'warning',
          disabled:
            reprocessState.status === 'loading' || reprocessMailId === '',
        }}
        cancelButtonProps={{
          disabled: reprocessState.status === 'loading',
        }}
        onConfirm={async () => {
          const raw = reprocessMailId
          if (!raw) return
          setReprocessState({ status: 'loading' })
          try {
            await reprocessEmailByMailId(raw)
            onNotify?.('Reprocess started for this email.')
            setConfirmReprocessOpen(false)
            onReprocessSuccess?.()
          } catch (e) {
            onNotify?.(apiErrorMessage(e))
            setConfirmReprocessOpen(false)
          } finally {
            setReprocessState({ status: 'idle' })
          }
        }}
      >
        <Typography variant="body2" color="text.secondary">
          Reprocessing can change the derived transaction and may result in this
          transaction being removed or getting a new ID. Continue?
        </Typography>
      </ConfirmDialog>
    </>
  )
}

function BindOpenReprocessConfirm({ onBind, onOpen }) {
  useEffect(() => {
    onBind(onOpen)
    return () => onBind(null)
  }, [onBind, onOpen])
  return null
}

