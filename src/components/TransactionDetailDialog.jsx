import { isValidElement, useCallback, useState } from 'react'
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
import useDetailDialogSlotProps from '../hooks/useDetailDialogSlotProps'
import { dialogActionsCompactSx } from '../utils/dialogActionsCompactSx'
import {
  layoutSectionDividerSx,
  layoutSectionSpacing,
} from '../utils/responsiveTable'
import EmailSourcePanel from './EmailSourcePanel'
import { formatDateTime, formatInrAmount } from '../utils/format'

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

export default function TransactionDetailDialog({
  open,
  onClose,
  row,
  initialTab,
  onTabChange,
  onNotify,
  /** After successful email reprocess: refresh lists, then dialog calls `onClose`. */
  onReprocessComplete,
}) {
  const tx = row?.raw
  const signed = tx
    ? tx.direction === 'CREDIT'
      ? tx.amount_parsed
      : -(tx.amount_parsed ?? 0)
    : 0

  const [detailTab, setDetailTab] = useState(initialTab ?? 'transaction')
  const [openReprocessConfirm, setOpenReprocessConfirm] = useState(null)
  const bindOpenReprocessConfirm = useCallback((fn) => {
    setOpenReprocessConfirm(() => fn)
  }, [])
  const detailSlotProps = useDetailDialogSlotProps()

  const titleId =
    detailTab === 'email' ? 'detail-source-title' : 'transaction-detail-title'

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      scroll="paper"
      aria-labelledby={titleId}
      slotProps={detailSlotProps}
      TransitionProps={{
        onEnter: () => {
          if (initialTab) setDetailTab(initialTab)
        },
      }}
    >
      <DialogTitle
        component="div"
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: layoutSectionSpacing,
          flexWrap: 'wrap',
        }}
      >
        <Typography id={titleId} component="h2" variant="h6" sx={{ flex: '1 1 auto' }}>
          {detailTab === 'email' ? 'Source' : 'Transaction Details'}
        </Typography>
        {tx?.mail_id ? (
          <Button
            size="small"
            variant="outlined"
            disabled={typeof openReprocessConfirm !== 'function'}
            onClick={() => openReprocessConfirm?.()}
            sx={{ flexShrink: 0, ml: 'auto' }}
          >
            Reprocess
          </Button>
        ) : null}
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
              <Divider sx={layoutSectionDividerSx} />
              <DetailLine
                label="Amount"
                value={formatInrAmount(signed)}
              />
              <DetailLine label="Direction" value={tx.direction} />
              <DetailLine label="Amount (raw)" value={tx.amount} />
              <DetailLine label="Currency" value={tx.currency ?? row.currency} />
              <Divider sx={layoutSectionDividerSx} />
              <DetailLine label="Provider" value={tx.provider} />
              <DetailLine label="Transaction type" value={tx.transaction_type} />
              <DetailLine label="Sub type" value={tx.sub_type} />
              <DetailLine label="Status" value={tx.status} />
              <DetailLine label="Transaction ID" value={tx.txn_id} />
              <DetailLine label="Mail ID" value={tx.mail_id} />
              <Divider sx={layoutSectionDividerSx} />
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
              aria-labelledby="detail-source-title"
            >
              <EmailSourcePanel
                mailId={tx.mail_id}
                active={open && detailTab === 'email'}
                onNotify={onNotify}
                onReprocessSuccess={() => {
                  onReprocessComplete?.()
                  onClose?.()
                }}
                showReprocessButton={false}
                onBindOpenReprocessConfirm={bindOpenReprocessConfirm}
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
      <DialogActions
        sx={{
          flexWrap: 'wrap',
          justifyContent: 'flex-start',
          ...dialogActionsCompactSx,
        }}
      >
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
          Source
        </Button>
      </DialogActions>

    </Dialog>
  )
}
