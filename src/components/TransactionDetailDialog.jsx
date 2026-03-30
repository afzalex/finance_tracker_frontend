import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Stack,
  Typography,
} from '@mui/material'
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

export default function TransactionDetailDialog({ open, onClose, row }) {
  const tx = row?.raw
  const signed = tx
    ? tx.direction === 'CREDIT'
      ? tx.amount_parsed
      : -(tx.amount_parsed ?? 0)
    : 0

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth scroll="paper">
      <DialogTitle id="transaction-detail-title">Transaction details</DialogTitle>
      <DialogContent dividers>
        {tx ? (
          <Stack component="div" aria-labelledby="transaction-detail-title">
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
        ) : (
          <Typography variant="body2" color="text.secondary">
            No transaction selected.
          </Typography>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} variant="contained">
          Close
        </Button>
      </DialogActions>
    </Dialog>
  )
}
