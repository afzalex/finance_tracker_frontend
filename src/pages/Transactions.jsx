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
  TablePagination,
  TableRow,
  TextField,
  Typography,
} from '@mui/material'
import LoadingBlock from '../components/LoadingBlock'
import PageHeader from '../components/PageHeader'
import TransactionDetailDialog from '../components/TransactionDetailDialog'
import { listTransactions } from '../services/financeApi'
import useResource from '../hooks/useResource'
import { signedAmountSx } from '../utils/moneySx'
import { formatDateTime } from '../utils/format'

const TABLE_COLGROUP = (
  <colgroup>
    <col style={{ width: '14%' }} />
    <col style={{ width: '24%' }} />
    <col style={{ width: '18%' }} />
    <col style={{ width: '18%' }} />
    <col style={{ width: '14%' }} />
    <col style={{ width: '12%' }} />
  </colgroup>
)

const clipCellSx = {
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
  maxWidth: 0,
}

export default function Transactions() {
  const [query, setQuery] = useState('')
  const [page, setPage] = useState(0)
  const [rowsPerPage, setRowsPerPage] = useState(25)
  const [selectedRow, setSelectedRow] = useState(null)

  const resourceKey = `transactions:${query}:${page}:${rowsPerPage}`
  const { status, data, error } = useResource(resourceKey, () =>
    listTransactions({
      query,
      page: page + 1,
      pageSize: rowsPerPage,
    }),
  )

  const rows = useMemo(() => data?.items ?? [], [data])
  const total = data?.total ?? 0

  const handleQueryChange = (e) => {
    setQuery(e.target.value)
    setPage(0)
  }

  const closeDetail = () => setSelectedRow(null)

  return (
    <Stack spacing={2}>
      <PageHeader
        title="Transactions"
        description="Server-side search and pagination via the Finance Tracker API."
      />

      <TextField
        label="Filter"
        value={query}
        onChange={handleQueryChange}
        placeholder="Search merchant or payee…"
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
              <Table
                size="small"
                aria-label="transactions table"
                sx={{ tableLayout: 'fixed', width: '100%' }}
              >
                {TABLE_COLGROUP}
                <TableHead>
                  <TableRow>
                    <TableCell sx={clipCellSx}>Date</TableCell>
                    <TableCell sx={clipCellSx}>Description</TableCell>
                    <TableCell sx={clipCellSx}>Account</TableCell>
                    <TableCell sx={clipCellSx}>Merchant</TableCell>
                    <TableCell sx={clipCellSx}>Provider</TableCell>
                    <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>
                      Amount
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {rows.map((t) => {
                    const when = formatDateTime(t.date)
                    return (
                    <TableRow
                      key={t.id}
                      hover
                      onClick={() => setSelectedRow(t)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault()
                          setSelectedRow(t)
                        }
                      }}
                      tabIndex={0}
                      role="button"
                      aria-label={`View details for transaction ${t.id}`}
                      sx={{ cursor: 'pointer' }}
                    >
                      <TableCell sx={clipCellSx} title={when}>
                        {when}
                      </TableCell>
                      <TableCell sx={clipCellSx} title={t.description}>
                        {t.description}
                      </TableCell>
                      <TableCell sx={clipCellSx} title={t.account}>
                        {t.account}
                      </TableCell>
                      <TableCell sx={clipCellSx} title={t.merchant}>
                        {t.merchant}
                      </TableCell>
                      <TableCell sx={clipCellSx} title={t.provider}>
                        {t.provider}
                      </TableCell>
                      <TableCell
                        align="right"
                        sx={{ ...signedAmountSx(t.amount), whiteSpace: 'nowrap' }}
                        title={t.amountRaw}
                      >
                        {t.amountRaw}
                      </TableCell>
                    </TableRow>
                    )
                  })}
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
              <TablePagination
                component="div"
                count={total}
                page={page}
                onPageChange={(_, newPage) => setPage(newPage)}
                rowsPerPage={rowsPerPage}
                onRowsPerPageChange={(e) => {
                  setRowsPerPage(Number.parseInt(e.target.value, 10))
                  setPage(0)
                }}
                rowsPerPageOptions={[10, 25, 50, 75, 100]}
              />
            </Box>
          )}
        </CardContent>
      </Card>

      <TransactionDetailDialog
        open={Boolean(selectedRow)}
        onClose={closeDetail}
        row={selectedRow}
      />
    </Stack>
  )
}

