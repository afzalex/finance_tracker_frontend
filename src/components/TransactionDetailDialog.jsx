import { isValidElement, useState } from 'react'
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Stack,
  Typography,
} from '@mui/material'
import EmailSourcePanel from './EmailSourcePanel'
import { formatDateTime, formatMoney } from '../utils/format'

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

export default function TransactionDetailDialog({
  open,
  onClose,
  row,
  initialTab,
  onTabChange,
  onNotify,
}) {
  const tx = row?.raw
  const signed = tx
    ? tx.direction === 'CREDIT'
      ? tx.amount_parsed
      : -(tx.amount_parsed ?? 0)
    : 0

  const [detailTab, setDetailTab] = useState(initialTab ?? 'transaction')

  const titleId =
    detailTab === 'email' ? 'detail-source-email-title' : 'transaction-detail-title'

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      scroll="paper"
      TransitionProps={{
        onEnter: () => {
          if (initialTab) setDetailTab(initialTab)
        },
      }}
    >
      <DialogTitle id={titleId}>
        {detailTab === 'email' ? 'Source Email' : 'Transaction Details'}
      </DialogTitle>
      <DialogContent dividers>
        {tx && (
          <Box sx={{ position: 'relative' }}>
            {/* In-flow: height follows transaction details; stays in layout when hidden */}
            <Stack
              component="div"
              spacing={0}
              aria-labelledby="transaction-detail-title"
              aria-hidden={detailTab !== 'transaction'}
              sx={{
                visibility: detailTab === 'transaction' ? 'visible' : 'hidden',
                pointerEvents: detailTab === 'transaction' ? 'auto' : 'none',
                pb: 3,
              }}
            >
              <DetailLine label="ID" value={tx.id} />
              <DetailLine label="Transacted" value={formatDateTime(tx.transacted_at)} />
              <DetailLine label="Created" value={formatDateTime(tx.created_at)} />
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
              <Divider sx={{ my: 1 }} />
              <DetailLine
                label="Counterparty"
                value={tx.counterparty_name ?? tx.merchant}
              />
              <DetailLine label="Category" value={tx.category} />
              <DetailLine label="Account" value={row.account} />
              <DetailLine label="Account ID" value={tx.account_id} />
              <DetailLine label="Account type" value={tx.account_type} />
            </Stack>

            {/* Fills the transaction box; scrolls when email is taller */}
            <Box
              sx={{
                position: 'absolute',
                inset: 0,
                overflow: 'auto',
                pb: 3,
                visibility: detailTab === 'email' ? 'visible' : 'hidden',
                pointerEvents: detailTab === 'email' ? 'auto' : 'none',
              }}
              aria-hidden={detailTab !== 'email'}
              aria-labelledby="detail-source-email-title"
            >
              <EmailSourcePanel
                mailId={tx.mail_id}
                active={open && detailTab === 'email'}
                onNotify={onNotify}
                onReprocessSuccess={() => onClose?.()}
              />
            </Box>
          </Box>
        )}

        {!tx && (
          <Typography variant="body2" color="text.secondary">
            No transaction selected.
          </Typography>
        )}
      </DialogContent>
      <DialogActions sx={{ gap: 1, flexWrap: 'wrap', justifyContent: 'flex-start' }}>
        <Button onClick={onClose} variant="outlined">
          Close
        </Button>
        <Box sx={{ flexGrow: 1 }} />
        <Button
          variant={detailTab === 'transaction' ? 'contained' : 'outlined'}
          onClick={() => {
            setDetailTab('transaction')
            onTabChange?.('transaction')
          }}
          disabled={!tx}
        >
          Transaction
        </Button>
        <Button
          variant={detailTab === 'email' ? 'contained' : 'outlined'}
          onClick={() => {
            setDetailTab('email')
            onTabChange?.('email')
          }}
          disabled={!tx?.mail_id}
        >
          Source Email
        </Button>
      </DialogActions>

    </Dialog>
  )
}
