import { useMemo, useState } from 'react'
import {
  Alert,
  Box,
  Card,
  CardContent,
  Divider,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material'
import LoadingBlock from '../components/LoadingBlock'
import PageHeader from '../components/PageHeader'
import { listTransactions } from '../services/financeApi'
import useResource from '../hooks/useResource'
import { signedAmountSx } from '../utils/moneySx'
import { formatDate, formatMoney } from '../utils/format'

export default function Transactions() {
  const [query, setQuery] = useState('')
  const { status, data, error } = useResource(
    `transactions:${query}`,
    () => listTransactions({ query, page: 1, pageSize: 12 }),
  )

  const rows = useMemo(() => data?.items ?? [], [data])
  const total = data?.total ?? 0

  return (
    <Stack spacing={2}>
      <PageHeader
        title="Transactions"
        description="Mock table with basic client-side filtering."
      />

      <TextField
        label="Filter"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search merchant, description, category…"
        size="small"
      />

      {error && <Alert severity="error">{error}</Alert>}

      <Card variant="outlined">
        <CardContent>
          <Stack direction="row" justifyContent="space-between" sx={{ mb: 1 }}>
            <Typography variant="h6">Latest</Typography>
            <Typography variant="body2" color="text.secondary">
              {total} total
            </Typography>
          </Stack>
          <Divider sx={{ mb: 1 }} />

          {status === 'loading' ? (
            <LoadingBlock />
          ) : (
            <Box sx={{ width: '100%', overflowX: 'auto' }}>
              <Table size="small" aria-label="transactions table">
                <TableHead>
                  <TableRow>
                    <TableCell>Date</TableCell>
                    <TableCell>Merchant</TableCell>
                    <TableCell>Description</TableCell>
                    <TableCell>Category</TableCell>
                    <TableCell>Account</TableCell>
                    <TableCell align="right">Amount</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {rows.map((t) => (
                    <TableRow key={t.id} hover>
                      <TableCell>{formatDate(t.date)}</TableCell>
                      <TableCell>{t.merchant}</TableCell>
                      <TableCell>{t.description}</TableCell>
                      <TableCell>{t.category}</TableCell>
                      <TableCell>{t.account}</TableCell>
                      <TableCell align="right" sx={signedAmountSx(t.amount)}>
                        {formatMoney(t.amount)}
                      </TableCell>
                    </TableRow>
                  ))}
                  {rows.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6}>
                        <Typography variant="body2" color="text.secondary">
                          No matching transactions.
                        </Typography>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </Box>
          )}
        </CardContent>
      </Card>
    </Stack>
  )
}

