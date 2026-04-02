import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  Alert,
  Box,
  Card,
  CardContent,
  Divider,
  FormControl,
  InputLabel,
  MenuItem,
  Portal,
  Select,
  Snackbar,
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
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import LoadingBlock from '../components/LoadingBlock'
import SortableTableHeaderCell from '../components/SortableTableHeaderCell'
import PageHeader from '../components/PageHeader'
import TransactionDetailDialog from '../components/TransactionDetailDialog'
import {
  apiErrorMessage,
  findTransactionRowById,
  listTransactionDistinctCatalog,
  listTransactions,
} from '../services/financeApi'
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

function displayCounterparty(row) {
  const v = row?.counterparty_name ?? row?.merchant
  return v != null && String(v).trim() !== '' ? String(v) : '—'
}

/** UI column keys for the transactions table. */
const TX_SORT_COL = {
  date: 'date',
  description: 'description',
  account: 'account',
  counterparty: 'counterparty',
  provider: 'provider',
  amount: 'amount',
}

/** Maps to `GET /api/v1/transactions` `sort_by` (server-side). */
const TX_SORT_API = {
  [TX_SORT_COL.date]: 'transacted_at',
  [TX_SORT_COL.description]: 'transaction_type',
  [TX_SORT_COL.account]: 'account_id',
  [TX_SORT_COL.counterparty]: 'counterparty',
  [TX_SORT_COL.provider]: 'provider',
  [TX_SORT_COL.amount]: 'amount',
}

export default function Transactions() {
  const navigate = useNavigate()
  const params = useParams()
  const [searchParams, setSearchParams] = useSearchParams()

  const routeTransactionId = params.transactionId ? String(params.transactionId) : null
  const tabParam = String(searchParams.get('tab') ?? '').toLowerCase()

  const [query, setQuery] = useState('')
  const [providerFilter, setProviderFilter] = useState('')
  const [directionFilter, setDirectionFilter] = useState('')
  const [page, setPage] = useState(() => {
    const n = Number(searchParams.get('page'))
    return Number.isFinite(n) && n >= 0 ? n : 0
  })
  const [rowsPerPage, setRowsPerPage] = useState(() => {
    const n = Number(searchParams.get('ps'))
    return Number.isFinite(n) && n > 0 ? n : 25
  })
  const [selectedRow, setSelectedRow] = useState(null)
  const suppressRouteOpenRef = useRef(false)
  const [snack, setSnack] = useState({ open: false, message: '' })
  const [sortBy, setSortBy] = useState(TX_SORT_COL.date)
  const [sortDir, setSortDir] = useState('desc')

  const distinctKey = 'transactions:distinct-catalog'
  const {
    status: distinctStatus,
    data: distinctData,
    error: distinctError,
  } = useResource(distinctKey, () => listTransactionDistinctCatalog())

  const resourceKey = `transactions:${query}:${providerFilter}:${directionFilter}:${page}:${rowsPerPage}:${sortBy}:${sortDir}`
  const { status, data, error } = useResource(resourceKey, () =>
    listTransactions({
      query,
      page: page + 1,
      pageSize: rowsPerPage,
      provider: providerFilter,
      direction: directionFilter || undefined,
      sortBy: TX_SORT_API[sortBy],
      sortOrder: sortDir,
    }),
  )

  const toggleTxSort = useCallback(
    (key) => {
      if (sortBy === key) {
        setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
      } else {
        setSortBy(key)
        setSortDir(
          key === TX_SORT_COL.date || key === TX_SORT_COL.amount ? 'desc' : 'asc',
        )
        setPage(0)
      }
    },
    [sortBy],
  )

  const rows = useMemo(() => data?.items ?? [], [data])
  const total = data?.total ?? 0

  useEffect(() => {
    // Keep page + page size in the URL (but avoid syncing other state).
    setSearchParams((prev) => {
      const sp = new URLSearchParams(prev)
      sp.set('ps', String(rowsPerPage))
      sp.set('page', String(page))
      return sp
    }, { replace: true })
  }, [page, rowsPerPage, setSearchParams])

  useEffect(() => {
    // If user edits page/ps in the URL (or uses Back/Forward), reflect it in state.
    const psFromUrl = Number(searchParams.get('ps'))
    const pageFromUrl = Number(searchParams.get('page'))

    const nextPs =
      Number.isFinite(psFromUrl) && psFromUrl > 0 ? psFromUrl : rowsPerPage
    const nextPage =
      Number.isFinite(pageFromUrl) && pageFromUrl >= 0 ? pageFromUrl : page

    if (nextPs !== rowsPerPage) {
      setRowsPerPage(nextPs)
      setPage(0)
      return
    }

    if (nextPage !== page) {
      setPage(nextPage)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams])

  useEffect(() => {
    // Once the URL no longer points at a specific transaction, allow auto-open again.
    if (!routeTransactionId) suppressRouteOpenRef.current = false
  }, [routeTransactionId])

  const [routeOpenError, setRouteOpenError] = useState(null)
  const [routeOpening, setRouteOpening] = useState(false)

  useEffect(() => {
    if (!routeTransactionId) {
      setSelectedRow(null)
      setRouteOpenError(null)
      return
    }
    if (suppressRouteOpenRef.current) return
    if (selectedRow && String(selectedRow.id) === String(routeTransactionId)) return

    const matchInPage = rows.find((r) => String(r.id) === String(routeTransactionId))
    if (matchInPage) {
      setSelectedRow(matchInPage)
      setRouteOpenError(null)
      return
    }

    // Deep link: scan pages to find the transaction id (without changing the filter field).
    let cancelled = false
    setRouteOpening(true)
    setRouteOpenError(null)
    findTransactionRowById(routeTransactionId, {
      pageSize: rowsPerPage,
      query,
      provider: providerFilter,
      direction: directionFilter || undefined,
    })
      .then((found) => {
        if (cancelled) return
        if (found) {
          setSelectedRow(found)
          return
        }
        setRouteOpenError(`Transaction ${routeTransactionId} not found in recent pages.`)
      })
      .catch((e) => {
        if (cancelled) return
        setRouteOpenError(apiErrorMessage(e))
      })
      .finally(() => {
        if (!cancelled) setRouteOpening(false)
      })

    return () => {
      cancelled = true
    }
  }, [
    routeTransactionId,
    rows,
    rowsPerPage,
    selectedRow,
    query,
    providerFilter,
    directionFilter,
  ])

  const handleQueryChange = (e) => {
    setQuery(e.target.value)
    setPage(0)
  }

  const providerOptions = distinctData?.providers ?? []

  const openDetail = (
    row,
    nextTab = tabParam === 'email' ? 'email' : 'transaction',
  ) =>
    navigate(
      `/transactions/${row.id}?tab=${nextTab}&ps=${rowsPerPage}&page=${page}`,
    )

  const closeDetail = () => {
    suppressRouteOpenRef.current = true
    navigate(`/transactions?ps=${rowsPerPage}&page=${page}`)
    setSelectedRow(null)
  }

  const detailTab = tabParam === 'email' ? 'email' : 'transaction'

  return (
    <Stack spacing={2}>
      <PageHeader title="Transactions" />

      <Stack
        direction="row"
        flexWrap="wrap"
        gap={2}
        alignItems="center"
        sx={{ width: '100%' }}
      >
        <TextField
          label="Filter"
          value={query}
          onChange={handleQueryChange}
          placeholder="Search merchant or payee…"
          size="small"
          sx={{ minWidth: 220, flex: '1 1 200px' }}
        />
        <FormControl size="small" sx={{ minWidth: 160 }} disabled={distinctStatus !== 'success'}>
          <InputLabel id="tx-filter-provider-label">Provider</InputLabel>
          <Select
            labelId="tx-filter-provider-label"
            label="Provider"
            value={providerFilter}
            onChange={(e) => {
              setProviderFilter(e.target.value)
              setPage(0)
            }}
          >
            <MenuItem value="">
              <em>All</em>
            </MenuItem>
            {providerOptions.map((p) => (
              <MenuItem key={p} value={p}>
                {p}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <FormControl size="small" sx={{ minWidth: 140 }}>
          <InputLabel id="tx-filter-direction-label">Direction</InputLabel>
          <Select
            labelId="tx-filter-direction-label"
            label="Direction"
            value={directionFilter}
            onChange={(e) => {
              setDirectionFilter(e.target.value)
              setPage(0)
            }}
          >
            <MenuItem value="">
              <em>All</em>
            </MenuItem>
            <MenuItem value="DEBIT">Debit</MenuItem>
            <MenuItem value="CREDIT">Credit</MenuItem>
          </Select>
        </FormControl>
      </Stack>

      {distinctStatus === 'error' && distinctError ? (
        <Alert severity="warning">
          Could not load provider list: {distinctError}
        </Alert>
      ) : null}

      {error && <Alert severity="error">{error}</Alert>}
      {routeOpenError && <Alert severity="warning">{routeOpenError}</Alert>}

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
          ) : routeOpening ? (
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
                    <SortableTableHeaderCell
                      sx={clipCellSx}
                      sortDirection={
                        sortBy === TX_SORT_COL.date ? sortDir : false
                      }
                      active={sortBy === TX_SORT_COL.date}
                      direction={
                        sortBy === TX_SORT_COL.date ? sortDir : 'asc'
                      }
                      onSort={() => toggleTxSort(TX_SORT_COL.date)}
                    >
                      Date
                    </SortableTableHeaderCell>
                    <SortableTableHeaderCell
                      sx={clipCellSx}
                      sortDirection={
                        sortBy === TX_SORT_COL.description ? sortDir : false
                      }
                      active={sortBy === TX_SORT_COL.description}
                      direction={
                        sortBy === TX_SORT_COL.description ? sortDir : 'asc'
                      }
                      onSort={() => toggleTxSort(TX_SORT_COL.description)}
                    >
                      Description
                    </SortableTableHeaderCell>
                    <SortableTableHeaderCell
                      sx={clipCellSx}
                      sortDirection={
                        sortBy === TX_SORT_COL.account ? sortDir : false
                      }
                      active={sortBy === TX_SORT_COL.account}
                      direction={
                        sortBy === TX_SORT_COL.account ? sortDir : 'asc'
                      }
                      onSort={() => toggleTxSort(TX_SORT_COL.account)}
                    >
                      Account
                    </SortableTableHeaderCell>
                    <SortableTableHeaderCell
                      sx={clipCellSx}
                      sortDirection={
                        sortBy === TX_SORT_COL.counterparty ? sortDir : false
                      }
                      active={sortBy === TX_SORT_COL.counterparty}
                      direction={
                        sortBy === TX_SORT_COL.counterparty ? sortDir : 'asc'
                      }
                      onSort={() => toggleTxSort(TX_SORT_COL.counterparty)}
                    >
                      Counterparty
                    </SortableTableHeaderCell>
                    <SortableTableHeaderCell
                      sx={clipCellSx}
                      sortDirection={
                        sortBy === TX_SORT_COL.provider ? sortDir : false
                      }
                      active={sortBy === TX_SORT_COL.provider}
                      direction={
                        sortBy === TX_SORT_COL.provider ? sortDir : 'asc'
                      }
                      onSort={() => toggleTxSort(TX_SORT_COL.provider)}
                    >
                      Provider
                    </SortableTableHeaderCell>
                    <SortableTableHeaderCell
                      align="right"
                      sx={{ whiteSpace: 'nowrap' }}
                      sortDirection={
                        sortBy === TX_SORT_COL.amount ? sortDir : false
                      }
                      active={sortBy === TX_SORT_COL.amount}
                      direction={
                        sortBy === TX_SORT_COL.amount ? sortDir : 'asc'
                      }
                      onSort={() => toggleTxSort(TX_SORT_COL.amount)}
                    >
                      Amount
                    </SortableTableHeaderCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {rows.map((t) => {
                    const when = formatDateTime(t.date)
                    const counterpartyLabel = displayCounterparty(t)
                    return (
                      <TableRow
                        key={t.id}
                        hover
                        onClick={() => openDetail(t, 'transaction')}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault()
                            openDetail(t, 'transaction')
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
                      <TableCell sx={clipCellSx} title={counterpartyLabel}>
                        {counterpartyLabel}
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
        key={selectedRow?.id ?? 'closed'}
        open={Boolean(selectedRow)}
        onClose={closeDetail}
        row={selectedRow}
        initialTab={detailTab}
        onTabChange={(t) => {
          if (!selectedRow) return
          openDetail(selectedRow, t)
        }}
        onNotify={(message) => setSnack({ open: true, message })}
      />

      <Portal>
        <Snackbar
          open={snack.open}
          autoHideDuration={3000}
          onClose={() => setSnack({ open: false, message: '' })}
          message={snack.message}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
          sx={{
            position: 'fixed',
            left: '50%',
            transform: 'translateX(-50%)',
            bottom: 16,
            zIndex: (theme) => theme.zIndex.snackbar,
          }}
        />
      </Portal>
    </Stack>
  )
}

