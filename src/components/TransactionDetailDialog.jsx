import { useEffect, useState } from 'react'
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Stack,
  Typography,
} from '@mui/material'
import { apiErrorMessage, getFetchedEmailByMailId } from '../services/financeApi'
import { formatDateTime, formatMoney } from '../utils/format'

function DetailLine({ label, value }) {
  const display =
    value === null || value === undefined || value === '' ? '—' : String(value)
  return (
    <Stack
      direction={{ xs: 'column', sm: 'row' }}
      spacing={{ xs: 0, sm: 2 }}
      sx={{ py: 0.75 }}
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
        maxHeight: 280,
        overflow: 'auto',
        bgcolor: 'action.hover',
        borderRadius: 1,
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

export default function TransactionDetailDialog({ open, onClose, row }) {
  const tx = row?.raw
  const signed = tx
    ? tx.direction === 'CREDIT'
      ? tx.amount_parsed
      : -(tx.amount_parsed ?? 0)
    : 0

  const [detailTab, setDetailTab] = useState('transaction')
  const [mailState, setMailState] = useState({
    status: 'idle',
    data: null,
    error: null,
  })

  useEffect(() => {
    if (!open || detailTab !== 'email' || !tx?.mail_id) return
    let cancelled = false
    const mid = tx.mail_id
    queueMicrotask(() => {
      if (!cancelled) setMailState({ status: 'loading', data: null, error: null })
    })
    getFetchedEmailByMailId(mid)
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
  }, [open, detailTab, tx?.mail_id])

  const email = mailState.data?.email
  const enrichment = mailState.data?.enrichment

  const titleId =
    detailTab === 'email' ? 'detail-source-email-title' : 'transaction-detail-title'

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth scroll="paper">
      <DialogTitle id={titleId}>
        {detailTab === 'email' ? 'Source Email' : 'Transaction details'}
      </DialogTitle>
      <DialogContent dividers>
        {tx && detailTab === 'transaction' && (
          <Stack component="div" spacing={0} aria-labelledby="transaction-detail-title">
            <DetailLine label="ID" value={tx.id} />
            <DetailLine label="Transacted" value={formatDateTime(tx.transacted_at)} />
            <DetailLine label="Created" value={formatDateTime(tx.created_at)} />
            <Divider sx={{ my: 1 }} />
            <DetailLine label="Merchant" value={tx.merchant} />
            <DetailLine label="Category" value={tx.category} />
            <DetailLine label="Account" value={row.account} />
            <DetailLine label="Account ID" value={tx.account_id} />
            <DetailLine label="Account type" value={tx.account_type} />
            <Divider sx={{ my: 1 }} />
            <DetailLine
              label="Amount"
              value={formatMoney(signed, row.currency ?? tx.currency ?? 'USD')}
            />
            <DetailLine label="Direction" value={tx.direction} />
            <DetailLine label="Amount (raw)" value={tx.amount} />
            <DetailLine label="Currency" value={tx.currency ?? row.currency} />
            <Divider sx={{ my: 1 }} />
            <DetailLine label="Provider" value={tx.provider} />
            <DetailLine label="Transaction type" value={tx.transaction_type} />
            <DetailLine label="Sub type" value={tx.sub_type} />
            <DetailLine label="Status" value={tx.status} />
            <DetailLine label="Transaction ID" value={tx.txn_id} />
            <DetailLine label="Mail ID" value={tx.mail_id} />
          </Stack>
        )}

        {tx && detailTab === 'email' && (
          <Stack spacing={1} aria-labelledby="detail-source-email-title">
            {mailState.status === 'loading' && (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
                <CircularProgress size={32} aria-label="Loading email" />
              </Box>
            )}
            {mailState.status === 'error' && (
              <Alert severity="warning">{mailState.error}</Alert>
            )}
            {mailState.status === 'success' && email && (
              <>
                <DetailLine label="Email row ID" value={email.id} />
                <DetailLine label="Mail ID" value={email.mail_id} />
                <DetailLine label="Subject" value={email.subject} />
                <DetailLine label="Sender" value={email.sender} />
                <DetailLine label="Snippet" value={email.snippet} />
                <DetailLine label="Thread ID" value={email.thread_id} />
                <DetailLine
                  label="Internal date"
                  value={
                    email.internal_date_ms != null
                      ? formatDateTime(new Date(email.internal_date_ms).toISOString())
                      : '—'
                  }
                />
                <DetailLine label="Stored at" value={formatDateTime(email.created_at)} />
                <Typography variant="body2" color="text.secondary" sx={{ pt: 0.5 }}>
                  Body
                </Typography>
                <MailBodyBlock text={email.body_text} />
                {enrichment ? (
                  <>
                    <Typography variant="subtitle2" color="text.secondary" sx={{ pt: 1 }}>
                      Parser / classification
                    </Typography>
                    <DetailLine label="Classification" value={enrichment.classification} />
                    <DetailLine
                      label="Classification reason"
                      value={enrichment.classification_reason}
                    />
                    <DetailLine label="Classification ID" value={enrichment.classification_id} />
                    <DetailLine label="Parser ID" value={enrichment.parser_id} />
                    <DetailLine
                      label="Enrichment updated"
                      value={formatDateTime(enrichment.updated_at)}
                    />
                  </>
                ) : (
                  <Typography variant="body2" color="text.secondary">
                    No enrichment row for this email.
                  </Typography>
                )}
              </>
            )}
          </Stack>
        )}

        {!tx && (
          <Typography variant="body2" color="text.secondary">
            No transaction selected.
          </Typography>
        )}
      </DialogContent>
      <DialogActions sx={{ gap: 1, flexWrap: 'wrap', justifyContent: 'flex-start' }}>
        <Button
          variant={detailTab === 'transaction' ? 'contained' : 'outlined'}
          onClick={() => setDetailTab('transaction')}
          disabled={!tx}
        >
          Transaction
        </Button>
        <Button
          variant={detailTab === 'email' ? 'contained' : 'outlined'}
          onClick={() => setDetailTab('email')}
          disabled={!tx?.mail_id}
        >
          Source Email
        </Button>
        <Box sx={{ flexGrow: 1 }} />
        <Button onClick={onClose} variant="contained">
          Close
        </Button>
      </DialogActions>
    </Dialog>
  )
}
