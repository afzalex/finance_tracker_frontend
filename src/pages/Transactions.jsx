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
  useMediaQuery,
  useTheme,
} from '@mui/material'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import HeaderDateRangeFilter from '../components/HeaderDateRangeFilter'
import LoadingBlock from '../components/LoadingBlock'
import SortableTableHeaderCell from '../components/SortableTableHeaderCell'
import PageHeader from '../components/PageHeader'
import TransactionDetailDialog from '../components/TransactionDetailDialog'
import {
  apiErrorMessage,
  findFirstTransactionRowByMailId,
  findTransactionRowById,
  listTransactionDistinctCatalog,
  listTransactions,
} from '../services/financeApi'
import useResource from '../hooks/useResource'
import useDateRange from '../contexts/useDateRange'
import { signedAmountSx } from '../utils/moneySx'
import {
  dataCardWidthSx,
  layoutSectionDividerBottomSx,
  layoutSectionMarginBottomSx,
  layoutSectionSpacing,
  pageStackWidthSx,
  tableHorizontalScrollSx,
  tablePaginationSmallScreenSx,
  tableSmallScreenTextSx,
} from '../utils/responsiveTable'
import { parseSafeReturnToParam } from '../utils/safeReturnTo'
import { DATE_RANGE_Q } from '../utils/dateRangeUrl'
import { formatDateTime } from '../utils/format'

/** Counterparty filter: unnamed rows (API sentinel); shown after “All”. */
const COUNTERPARTY_NO_NAME_LABEL = 'No Counterparty'

const cpFilterMutedItemSx = {
  fontStyle: 'italic',
  color: 'text.secondary',
}

const TRANSACTIONS_TABLE_MIN_WIDTH = 920

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

/** List view query keys (persisted in the URL). */
const TX_Q = {
  q: 'q',
  provider: 'provider',
  counterparty: 'counterparty',
  direction: 'direction',
  sort: 'sort',
  mail_id: 'mail_id',
  returnTo: 'returnTo',
}

function parseTxSortParam(sp) {
  const raw = sp.get(TX_Q.sort)
  const defaults = { sortBy: TX_SORT_COL.date, sortDir: 'desc' }
  if (!raw) return defaults
  const i = raw.lastIndexOf(':')
  if (i < 1) return defaults
  const by = raw.slice(0, i)
  const dir = raw.slice(i + 1)
  if (!Object.values(TX_SORT_COL).includes(by)) return defaults
  if (dir !== 'asc' && dir !== 'desc') return defaults
  return { sortBy: by, sortDir: dir }
}

function isDefaultTxSort(sortBy, sortDir) {
  return sortBy === TX_SORT_COL.date && sortDir === 'desc'
}

export default function Transactions() {
  const theme = useTheme()
  const isMdDown = useMediaQuery(theme.breakpoints.down('md'))
  const navigate = useNavigate()
  const params = useParams()
  const [searchParams, setSearchParams] = useSearchParams()
  const { from: dateRangeFrom, to: dateRangeTo } = useDateRange()

  const routeTransactionId = params.transactionId ? String(params.transactionId) : null
  const tabParam = String(searchParams.get('tab') ?? '').toLowerCase()

  const query = searchParams.get(TX_Q.q) ?? ''
  const providerFilter = searchParams.get(TX_Q.provider) ?? ''
  const counterpartyFilter = searchParams.get(TX_Q.counterparty) ?? ''
  const directionFilter = searchParams.get(TX_Q.direction) ?? ''
  const mailIdParam = (searchParams.get(TX_Q.mail_id) ?? '').trim()
  const page = useMemo(() => {
    const n = Number(searchParams.get('page'))
    return Number.isFinite(n) && n >= 0 ? n : 0
  }, [searchParams])
  const rowsPerPage = useMemo(() => {
    const n = Number(searchParams.get('ps'))
    return Number.isFinite(n) && n > 0 ? n : 25
  }, [searchParams])
  const { sortBy, sortDir } = useMemo(
    () => parseTxSortParam(searchParams),
    [searchParams],
  )

  const safeReturnTo = useMemo(
    () => parseSafeReturnToParam(searchParams.get(TX_Q.returnTo)),
    [searchParams],
  )

  const [selectedRow, setSelectedRow] = useState(null)
  const suppressRouteOpenRef = useRef(false)
  const [snack, setSnack] = useState({ open: false, message: '' })
  const [routeOpenError, setRouteOpenError] = useState(null)
  const [routeOpening, setRouteOpening] = useState(false)
  const [mailLinkError, setMailLinkError] = useState(null)
  const [mailLinkResolving, setMailLinkResolving] = useState(false)
  const [listRefreshKey, setListRefreshKey] = useState(0)

  useEffect(() => {
    setSearchParams(
      (prev) => {
        const sp = new URLSearchParams(prev)
        let changed = false
        if (!sp.has('page')) {
          sp.set('page', '0')
          changed = true
        }
        if (!sp.has('ps')) {
          sp.set('ps', '25')
          changed = true
        }
        return changed ? sp : prev
      },
      { replace: true },
    )
  }, [setSearchParams])

  const dateRangeKeyRef = useRef(null)
  useEffect(() => {
    const key = `${dateRangeFrom}|${dateRangeTo}`
    if (dateRangeKeyRef.current === null) {
      dateRangeKeyRef.current = key
      return
    }
    if (dateRangeKeyRef.current === key) return
    dateRangeKeyRef.current = key
    // Keep `from`/`to` in sync with DateRangeContext. Using only `prev` here can race with
    // `setRange` (child effects run before the provider’s URL update commits) and briefly
    // write stale `from`/`to` back into the URL.
    setSearchParams(
      (prev) => {
        const sp = new URLSearchParams(prev)
        sp.set(DATE_RANGE_Q.from, dateRangeFrom)
        sp.set(DATE_RANGE_Q.to, dateRangeTo)
        sp.set('page', '0')
        return sp
      },
      { replace: true },
    )
  }, [dateRangeFrom, dateRangeTo, setSearchParams])

  const distinctKey = useMemo(
    () =>
      JSON.stringify({
        from: dateRangeFrom,
        to: dateRangeTo,
      }),
    [dateRangeFrom, dateRangeTo],
  )
  const {
    status: distinctStatus,
    data: distinctData,
    error: distinctError,
  } = useResource(distinctKey, () =>
    listTransactionDistinctCatalog({ from: dateRangeFrom, to: dateRangeTo }),
  )

  // Normalize page/ps into the key so the first paint matches post-hydration URL (avoids two
  // useResource stores when `page`/`ps` are injected by the effect below).
  const listSearchKey = useMemo(
    () =>
      JSON.stringify({
        q: searchParams.get(TX_Q.q) ?? '',
        provider: searchParams.get(TX_Q.provider) ?? '',
        counterparty: searchParams.get(TX_Q.counterparty) ?? '',
        direction: searchParams.get(TX_Q.direction) ?? '',
        sort: searchParams.get(TX_Q.sort) ?? '',
        page,
        rowsPerPage,
        from: dateRangeFrom,
        to: dateRangeTo,
        refresh: listRefreshKey,
      }),
    [searchParams, page, rowsPerPage, dateRangeFrom, dateRangeTo, listRefreshKey],
  )
  const resourceKey = `transactions:${listSearchKey}`
  const { status, data, error } = useResource(resourceKey, () =>
    listTransactions({
      query,
      page: page + 1,
      pageSize: rowsPerPage,
      provider: providerFilter,
      counterparty: counterpartyFilter || undefined,
      direction: directionFilter || undefined,
      from: dateRangeFrom,
      to: dateRangeTo,
      sortBy: TX_SORT_API[sortBy],
      sortOrder: sortDir,
    }),
  )

  const toggleTxSort = useCallback(
    (key) => {
      setSearchParams(
        (prev) => {
          const sp = new URLSearchParams(prev)
          const cur = parseTxSortParam(sp)
          let nextBy = key
          let nextDir = cur.sortDir
          if (cur.sortBy === key) {
            nextDir = cur.sortDir === 'asc' ? 'desc' : 'asc'
          } else {
            nextBy = key
            nextDir =
              key === TX_SORT_COL.date || key === TX_SORT_COL.amount
                ? 'desc'
                : 'asc'
            sp.set('page', '0')
          }
          if (isDefaultTxSort(nextBy, nextDir)) sp.delete(TX_Q.sort)
          else sp.set(TX_Q.sort, `${nextBy}:${nextDir}`)
          return sp
        },
        { replace: true },
      )
    },
    [setSearchParams],
  )

  const rows = useMemo(() => data?.items ?? [], [data])
  const total = data?.total ?? 0

  useEffect(() => {
    // Once the URL no longer points at a specific transaction, allow auto-open again.
    if (!routeTransactionId) suppressRouteOpenRef.current = false
  }, [routeTransactionId])

  useEffect(() => {
    if (!mailIdParam || routeTransactionId) {
      setMailLinkError(null)
      setMailLinkResolving(false)
      return
    }
    let cancelled = false
    setMailLinkResolving(true)
    setMailLinkError(null)
    findFirstTransactionRowByMailId(mailIdParam)
      .then((found) => {
        if (cancelled) return
        if (!found) {
          setMailLinkError(
            'No transaction found for this mail message in the scanned pages.',
          )
          setMailLinkResolving(false)
          return
        }
        const sp = new URLSearchParams(searchParams)
        sp.delete(TX_Q.mail_id)
        sp.set('tab', 'email')
        navigate(`/transactions/${found.id}?${sp.toString()}`, { replace: true })
        setMailLinkResolving(false)
      })
      .catch((e) => {
        if (cancelled) return
        setMailLinkError(apiErrorMessage(e))
        setMailLinkResolving(false)
      })
    return () => {
      cancelled = true
    }
  }, [mailIdParam, routeTransactionId, navigate, searchParams])

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
      counterparty: counterpartyFilter || undefined,
      direction: directionFilter || undefined,
      from: dateRangeFrom,
      to: dateRangeTo,
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
    counterpartyFilter,
    directionFilter,
    dateRangeFrom,
    dateRangeTo,
  ])

  const handleQueryChange = (e) => {
    const v = e.target.value
    setSearchParams(
      (prev) => {
        const sp = new URLSearchParams(prev)
        if (!v.trim()) sp.delete(TX_Q.q)
        else sp.set(TX_Q.q, v)
        sp.set('page', '0')
        return sp
      },
      { replace: true },
    )
  }

  const providerOptions = distinctData?.providers ?? []
  const unnamedCounterpartyKey =
    distinctData?.unnamed_counterparty_key ?? '__NO_COUNTERPARTY__'
  const counterpartyRestOptions = useMemo(() => {
    const raw = distinctData?.counterparties ?? []
    return raw
      .filter((c) => c !== unnamedCounterpartyKey)
      .sort((a, b) =>
        String(a).localeCompare(String(b), undefined, { sensitivity: 'base' }),
      )
  }, [distinctData?.counterparties, unnamedCounterpartyKey])
  const hasUnnamedCounterpartyOption = useMemo(
    () => (distinctData?.counterparties ?? []).includes(unnamedCounterpartyKey),
    [distinctData?.counterparties, unnamedCounterpartyKey],
  )

  const openDetail = useCallback(
    (
      row,
      nextTab = tabParam === 'email' ? 'email' : 'transaction',
    ) => {
      const sp = new URLSearchParams(searchParams)
      sp.set('tab', nextTab)
      navigate(`/transactions/${row.id}?${sp.toString()}`)
    },
    [navigate, searchParams, tabParam],
  )

  const closeDetail = useCallback(() => {
    suppressRouteOpenRef.current = true
    if (safeReturnTo) {
      navigate(safeReturnTo)
      setSelectedRow(null)
      return
    }
    const sp = new URLSearchParams(searchParams)
    sp.delete('tab')
    sp.delete(TX_Q.returnTo)
    const qs = sp.toString()
    navigate(qs ? `/transactions?${qs}` : '/transactions')
    setSelectedRow(null)
  }, [navigate, searchParams, safeReturnTo])

  const detailTab = tabParam === 'email' ? 'email' : 'transaction'
  return (
    <Stack spacing={layoutSectionSpacing} sx={pageStackWidthSx}>
      <Stack
        direction={{ xs: 'column', md: 'row' }}
        alignItems={{ xs: 'stretch', md: 'center' }}
        justifyContent="space-between"
        gap={layoutSectionSpacing}
      >
        <PageHeader title="Transactions" />
        <Box sx={{ width: { xs: '100%', md: 'auto' }, flexShrink: { md: 0 } }}>
          <HeaderDateRangeFilter fullWidth={isMdDown} />
        </Box>
      </Stack>

      <Stack
        direction="row"
        flexWrap="wrap"
        gap={layoutSectionSpacing}
        alignItems="center"
        sx={{ width: '100%' }}
      >
        <TextField
          label="Filter"
          value={query}
          onChange={handleQueryChange}
          placeholder="Search merchant or payee…"
          size="small"
          sx={{
            flex: { xs: '1 1 100%', md: '1 1 200px' },
            width: { xs: '100%', md: 'auto' },
            minWidth: { xs: 0, md: 220 },
          }}
        />
        <FormControl
          size="small"
          sx={{
            flex: { xs: '1 1 calc(50% - 8px)', md: '0 1 auto' },
            minWidth: { xs: 0, md: 160 },
            maxWidth: { xs: 'calc(50% - 8px)', md: 'none' },
            width: { xs: 'calc(50% - 8px)', md: 'auto' },
          }}
          disabled={distinctStatus !== 'success'}
        >
          <InputLabel id="tx-filter-provider-label">Provider</InputLabel>
          <Select
            labelId="tx-filter-provider-label"
            label="Provider"
            value={providerFilter}
            onChange={(e) => {
              const v = e.target.value
              setSearchParams(
                (prev) => {
                  const sp = new URLSearchParams(prev)
                  if (!v) sp.delete(TX_Q.provider)
                  else sp.set(TX_Q.provider, v)
                  sp.set('page', '0')
                  return sp
                },
                { replace: true },
              )
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
        <FormControl
          size="small"
          sx={{
            display: { xs: 'none', md: 'flex' },
            flex: { md: '0 1 auto' },
            minWidth: { md: 180 },
            width: { md: 'auto' },
          }}
          disabled={distinctStatus !== 'success'}
        >
          <InputLabel id="tx-filter-counterparty-label">Counterparty</InputLabel>
          <Select
            labelId="tx-filter-counterparty-label"
            label="Counterparty"
            value={counterpartyFilter}
            renderValue={(selected) => {
              if (selected === '') {
                return (
                  <Typography component="span" sx={cpFilterMutedItemSx}>
                    All
                  </Typography>
                )
              }
              if (selected === unnamedCounterpartyKey) {
                return (
                  <Typography component="span" sx={cpFilterMutedItemSx}>
                    {COUNTERPARTY_NO_NAME_LABEL}
                  </Typography>
                )
              }
              return selected
            }}
            onChange={(e) => {
              const v = e.target.value
              setSearchParams(
                (prev) => {
                  const sp = new URLSearchParams(prev)
                  if (!v) sp.delete(TX_Q.counterparty)
                  else sp.set(TX_Q.counterparty, v)
                  sp.set('page', '0')
                  return sp
                },
                { replace: true },
              )
            }}
          >
            <MenuItem value="">
              <Typography component="span" sx={cpFilterMutedItemSx}>
                All
              </Typography>
            </MenuItem>
            {hasUnnamedCounterpartyOption ? (
              <MenuItem key={unnamedCounterpartyKey} value={unnamedCounterpartyKey}>
                <Typography component="span" sx={cpFilterMutedItemSx}>
                  {COUNTERPARTY_NO_NAME_LABEL}
                </Typography>
              </MenuItem>
            ) : null}
            {counterpartyRestOptions.map((c) => (
              <MenuItem key={c} value={c}>
                {c}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <FormControl
          size="small"
          sx={{
            flex: { xs: '1 1 calc(50% - 8px)', md: '0 1 auto' },
            minWidth: { xs: 0, md: 140 },
            maxWidth: { xs: 'calc(50% - 8px)', md: 'none' },
            width: { xs: 'calc(50% - 8px)', md: 'auto' },
          }}
        >
          <InputLabel id="tx-filter-direction-label">Debit/Credit</InputLabel>
          <Select
            labelId="tx-filter-direction-label"
            label="Direction"
            value={directionFilter}
            onChange={(e) => {
              const v = e.target.value
              setSearchParams(
                (prev) => {
                  const sp = new URLSearchParams(prev)
                  if (!v) sp.delete(TX_Q.direction)
                  else sp.set(TX_Q.direction, v)
                  sp.set('page', '0')
                  return sp
                },
                { replace: true },
              )
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
      {mailLinkError && <Alert severity="warning">{mailLinkError}</Alert>}

      <Card variant="outlined" sx={dataCardWidthSx}>
        <CardContent sx={{ minWidth: 0 }}>
          <Stack
            direction="row"
            justifyContent="space-between"
            sx={layoutSectionMarginBottomSx}
          >
            <Typography variant="h6">Latest</Typography>
            <Typography variant="body2" color="text.secondary">
              {total} total
            </Typography>
          </Stack>
          <Divider sx={layoutSectionDividerBottomSx} />

          {status === 'loading' ? (
            <LoadingBlock />
          ) : routeOpening || mailLinkResolving ? (
            <LoadingBlock />
          ) : (
            <>
            <Box sx={tableHorizontalScrollSx}>
              <Table
                size="small"
                aria-label="transactions table"
                sx={[
                  {
                    minWidth: TRANSACTIONS_TABLE_MIN_WIDTH,
                    tableLayout: 'fixed',
                    width: '100%',
                  },
                  tableSmallScreenTextSx(theme),
                ]}
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
                      sx={[clipCellSx, { whiteSpace: 'nowrap' }]}
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
                        sx={[
                          clipCellSx,
                          { ...signedAmountSx(t.amount), whiteSpace: 'nowrap' },
                        ]}
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
            </Box>
              <TablePagination
                component="div"
                count={total}
                page={page}
                onPageChange={(_, newPage) => {
                  setSearchParams(
                    (prev) => {
                      const sp = new URLSearchParams(prev)
                      sp.set('page', String(newPage))
                      return sp
                    },
                    { replace: true },
                  )
                }}
                rowsPerPage={rowsPerPage}
                onRowsPerPageChange={(e) => {
                  const n = Number.parseInt(e.target.value, 10)
                  setSearchParams(
                    (prev) => {
                      const sp = new URLSearchParams(prev)
                      sp.set('ps', String(n))
                      sp.set('page', '0')
                      return sp
                    },
                    { replace: true },
                  )
                }}
                rowsPerPageOptions={[10, 25, 50, 75, 100]}
                sx={[
                  { width: '100%', maxWidth: '100%', overflow: 'hidden' },
                  tablePaginationSmallScreenSx(theme),
                ]}
              />
            </>
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
        onReprocessComplete={() => setListRefreshKey((k) => k + 1)}
        onRowUpdate={(updated) => setSelectedRow(updated)}
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

