import { useCallback, useMemo, useState } from 'react'
import WarningAmberIcon from '@mui/icons-material/WarningAmber'
import {
  Alert,
  Box,
  Card,
  CardContent,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableRow,
  Tooltip,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import AccountDetailDialog from '../components/AccountDetailDialog'
import HeaderDateRangeFilter from '../components/HeaderDateRangeFilter'
import LoadingBlock from '../components/LoadingBlock'
import PageHeader from '../components/PageHeader'
import SortableTableHeaderCell from '../components/SortableTableHeaderCell'
import useDateRange from '../contexts/useDateRange'
import useResource from '../hooks/useResource'
import { listAccounts } from '../services/financeApi'
import InrAmountCell from '../components/InrAmountCell'
import { balanceAmountSx } from '../utils/moneySx'
import {
  dataCardWidthSx,
  layoutSectionSpacing,
  pageStackWidthSx,
  tableHorizontalScrollSx,
  tableSmallScreenTextSx,
} from '../utils/responsiveTable'

const ACCOUNTS_TABLE_MIN_WIDTH = 1040

/** Persisted in URL on the accounts page (same pattern as transactions `sort`). */
const ACC_SORT_Q = 'acc_sort'

const ACC_SORT_COL = {
  accountId: 'account_id',
  provider: 'provider',
  name: 'name',
  type: 'type',
  debits: 'debits',
  credits: 'credits',
  net: 'net',
  count: 'count',
}

const ACC_SORT_FIELDS = Object.values(ACC_SORT_COL)

function parseAccSortParam(sp) {
  const raw = sp.get(ACC_SORT_Q)
  const defaults = { sortBy: ACC_SORT_COL.count, sortDir: 'desc' }
  if (!raw) return defaults
  const i = raw.lastIndexOf(':')
  if (i < 1) return defaults
  const by = raw.slice(0, i)
  const dir = raw.slice(i + 1)
  if (!ACC_SORT_FIELDS.includes(by)) return defaults
  if (dir !== 'asc' && dir !== 'desc') return defaults
  return { sortBy: by, sortDir: dir }
}

function isDefaultAccSort(sortBy, sortDir) {
  return sortBy === ACC_SORT_COL.count && sortDir === 'desc'
}

function defaultDirForAccSortKey(key) {
  if (
    key === ACC_SORT_COL.debits ||
    key === ACC_SORT_COL.credits ||
    key === ACC_SORT_COL.net ||
    key === ACC_SORT_COL.count
  ) {
    return 'desc'
  }
  return 'asc'
}

const EMPTY_ACCOUNTS = []

export default function Accounts() {
  const theme = useTheme()
  const isMdDown = useMediaQuery(theme.breakpoints.down('md'))
  const navigate = useNavigate()
  const params = useParams()
  const [searchParams, setSearchParams] = useSearchParams()
  const routeAccountId = params.accountId ? String(params.accountId) : null

  const decodedAccountId = useMemo(() => {
    if (!routeAccountId) return ''
    try {
      return decodeURIComponent(routeAccountId)
    } catch {
      return routeAccountId
    }
  }, [routeAccountId])

  const [listRefresh, setListRefresh] = useState(0)
  const { from: dateRangeFrom, to: dateRangeTo } = useDateRange()
  const accountsResourceKey = useMemo(
    () =>
      JSON.stringify({
        refresh: listRefresh,
        from: dateRangeFrom,
        to: dateRangeTo,
      }),
    [listRefresh, dateRangeFrom, dateRangeTo],
  )
  const { status, data, error } = useResource(
    `accounts:${accountsResourceKey}`,
    () => listAccounts({ from: dateRangeFrom, to: dateRangeTo }),
  )
  const accounts = data ?? EMPTY_ACCOUNTS

  const selectedAccount = useMemo(() => {
    if (!decodedAccountId) return null
    return accounts.find((a) => a.account_id === decodedAccountId) ?? null
  }, [accounts, decodedAccountId])

  const openDetail = useCallback(
    (row) => {
      const qs = searchParams.toString()
      navigate(
        `/accounts/${encodeURIComponent(row.account_id)}${qs ? `?${qs}` : ''}`,
      )
    },
    [navigate, searchParams],
  )

  const closeDetail = useCallback(() => {
    const qs = searchParams.toString()
    navigate(qs ? `/accounts?${qs}` : '/accounts')
  }, [navigate, searchParams])

  const handleAccountSaved = useCallback(() => {
    setListRefresh((n) => n + 1)
  }, [])

  const { sortBy, sortDir } = useMemo(
    () => parseAccSortParam(searchParams),
    [searchParams],
  )

  const sortedAccounts = useMemo(() => {
    const dir = sortDir === 'asc' ? 1 : -1
    const copy = [...accounts]
    copy.sort((a, b) => {
      if (sortBy === ACC_SORT_COL.accountId) {
        return String(a.account_id ?? '').localeCompare(String(b.account_id ?? '')) * dir
      }
      if (sortBy === ACC_SORT_COL.provider) {
        return String(a.provider ?? '').localeCompare(String(b.provider ?? '')) * dir
      }
      if (sortBy === ACC_SORT_COL.name) {
        return String(a.name ?? '').localeCompare(String(b.name ?? '')) * dir
      }
      if (sortBy === ACC_SORT_COL.type) {
        return String(a.type ?? '').localeCompare(String(b.type ?? '')) * dir
      }
      if (sortBy === ACC_SORT_COL.debits) {
        return ((a.debitTotal ?? 0) - (b.debitTotal ?? 0)) * dir
      }
      if (sortBy === ACC_SORT_COL.credits) {
        return ((a.creditTotal ?? 0) - (b.creditTotal ?? 0)) * dir
      }
      if (sortBy === ACC_SORT_COL.net) {
        return ((a.net ?? a.balance ?? 0) - (b.net ?? b.balance ?? 0)) * dir
      }
      if (sortBy === ACC_SORT_COL.count) {
        return ((a.count ?? 0) - (b.count ?? 0)) * dir
      }
      return 0
    })
    return copy
  }, [accounts, sortBy, sortDir])

  const totals = useMemo(() => {
    let debits = 0
    let credits = 0
    let net = 0
    let count = 0
    for (const a of accounts) {
      debits += Number(a.debitTotal) || 0
      credits += Number(a.creditTotal) || 0
      net += Number(a.net ?? a.balance) || 0
      count += Number(a.count) || 0
    }
    return { debits, credits, net, count }
  }, [accounts])

  const toggleAccSort = useCallback(
    (key) => {
      setSearchParams(
        (prev) => {
          const sp = new URLSearchParams(prev)
          const cur = parseAccSortParam(sp)
          let nextBy = key
          let nextDir = cur.sortDir
          if (cur.sortBy === key) {
            nextDir = cur.sortDir === 'asc' ? 'desc' : 'asc'
          } else {
            nextBy = key
            nextDir = defaultDirForAccSortKey(key)
          }
          if (isDefaultAccSort(nextBy, nextDir)) sp.delete(ACC_SORT_Q)
          else sp.set(ACC_SORT_Q, `${nextBy}:${nextDir}`)
          return sp
        },
        { replace: true },
      )
    },
    [setSearchParams],
  )

  return (
    <Stack spacing={layoutSectionSpacing} sx={pageStackWidthSx}>
      <Stack
        direction={{ xs: 'column', md: 'row' }}
        alignItems={{ xs: 'stretch', md: 'center' }}
        justifyContent="space-between"
        gap={layoutSectionSpacing}
      >
        <PageHeader title="Accounts" />
        <Box sx={{ width: { xs: '100%', md: 'auto' }, flexShrink: { md: 0 } }}>
          <HeaderDateRangeFilter fullWidth={isMdDown} />
        </Box>
      </Stack>

      {error && <Alert severity="error">{error}</Alert>}

      <Card variant="outlined" sx={dataCardWidthSx}>
        <CardContent sx={{ minWidth: 0 }}>
          {status === 'loading' ? (
            <LoadingBlock />
          ) : (
            <Box sx={tableHorizontalScrollSx}>
              <Table
                size="small"
                aria-label="accounts table"
                sx={[
                  {
                    minWidth: ACCOUNTS_TABLE_MIN_WIDTH,
                    tableLayout: 'auto',
                  },
                  tableSmallScreenTextSx(theme),
                ]}
              >
                <TableHead>
                  <TableRow>
                    <TableCell align="center" sx={{ width: 44, px: 0.5 }}>
                      <Typography
                        component="span"
                        variant="caption"
                        sx={{
                          position: 'absolute',
                          width: 1,
                          height: 1,
                          padding: 0,
                          margin: -1,
                          overflow: 'hidden',
                          clip: 'rect(0, 0, 0, 0)',
                          whiteSpace: 'nowrap',
                          border: 0,
                        }}
                      >
                        Alerts
                      </Typography>
                    </TableCell>
                    <SortableTableHeaderCell
                      sortDirection={
                        sortBy === ACC_SORT_COL.accountId ? sortDir : false
                      }
                      active={sortBy === ACC_SORT_COL.accountId}
                      direction={
                        sortBy === ACC_SORT_COL.accountId ? sortDir : 'asc'
                      }
                      onSort={() => toggleAccSort(ACC_SORT_COL.accountId)}
                    >
                      Account ID
                    </SortableTableHeaderCell>
                    <SortableTableHeaderCell
                      sortDirection={
                        sortBy === ACC_SORT_COL.provider ? sortDir : false
                      }
                      active={sortBy === ACC_SORT_COL.provider}
                      direction={
                        sortBy === ACC_SORT_COL.provider ? sortDir : 'asc'
                      }
                      onSort={() => toggleAccSort(ACC_SORT_COL.provider)}
                    >
                      Provider
                    </SortableTableHeaderCell>
                    <SortableTableHeaderCell
                      sortDirection={sortBy === ACC_SORT_COL.name ? sortDir : false}
                      active={sortBy === ACC_SORT_COL.name}
                      direction={sortBy === ACC_SORT_COL.name ? sortDir : 'asc'}
                      onSort={() => toggleAccSort(ACC_SORT_COL.name)}
                    >
                      Name
                    </SortableTableHeaderCell>
                    <SortableTableHeaderCell
                      sortDirection={sortBy === ACC_SORT_COL.type ? sortDir : false}
                      active={sortBy === ACC_SORT_COL.type}
                      direction={sortBy === ACC_SORT_COL.type ? sortDir : 'asc'}
                      onSort={() => toggleAccSort(ACC_SORT_COL.type)}
                    >
                      Type
                    </SortableTableHeaderCell>
                    <SortableTableHeaderCell
                      align="right"
                      sx={{ whiteSpace: 'nowrap' }}
                      sortDirection={sortBy === ACC_SORT_COL.count ? sortDir : false}
                      active={sortBy === ACC_SORT_COL.count}
                      direction={sortBy === ACC_SORT_COL.count ? sortDir : 'asc'}
                      onSort={() => toggleAccSort(ACC_SORT_COL.count)}
                    >
                      Count
                    </SortableTableHeaderCell>
                    <SortableTableHeaderCell
                      align="right"
                      sx={{ whiteSpace: 'nowrap' }}
                      sortDirection={sortBy === ACC_SORT_COL.debits ? sortDir : false}
                      active={sortBy === ACC_SORT_COL.debits}
                      direction={sortBy === ACC_SORT_COL.debits ? sortDir : 'asc'}
                      onSort={() => toggleAccSort(ACC_SORT_COL.debits)}
                    >
                      Debits
                    </SortableTableHeaderCell>
                    <SortableTableHeaderCell
                      align="right"
                      sx={{ whiteSpace: 'nowrap' }}
                      sortDirection={sortBy === ACC_SORT_COL.credits ? sortDir : false}
                      active={sortBy === ACC_SORT_COL.credits}
                      direction={sortBy === ACC_SORT_COL.credits ? sortDir : 'asc'}
                      onSort={() => toggleAccSort(ACC_SORT_COL.credits)}
                    >
                      Credits
                    </SortableTableHeaderCell>
                    <SortableTableHeaderCell
                      align="right"
                      sx={{ whiteSpace: 'nowrap' }}
                      sortDirection={sortBy === ACC_SORT_COL.net ? sortDir : false}
                      active={sortBy === ACC_SORT_COL.net}
                      direction={sortBy === ACC_SORT_COL.net ? sortDir : 'asc'}
                      onSort={() => toggleAccSort(ACC_SORT_COL.net)}
                    >
                      Net
                    </SortableTableHeaderCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {sortedAccounts.map((a) => (
                    <TableRow
                      key={a.id}
                      hover
                      onClick={() => openDetail(a)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault()
                          openDetail(a)
                        }
                      }}
                      tabIndex={0}
                      role="button"
                      aria-label={`View account details for ${a.account_id ?? 'account'}`}
                      sx={{ cursor: 'pointer' }}
                    >
                      <TableCell align="center" sx={{ px: 0.5, width: 44 }}>
                        {a.hasConflict ? (
                          <Tooltip title="Overlapping transaction slices for this account">
                            <WarningAmberIcon
                              fontSize="small"
                              color="warning"
                              aria-label="Account has conflicting transaction slices"
                            />
                          </Tooltip>
                        ) : null}
                      </TableCell>
                      <TableCell
                        sx={{
                          fontFamily:
                            'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                          fontSize: '0.8125rem',
                          maxWidth: 200,
                        }}
                      >
                        <Typography variant="body2" sx={{ wordBreak: 'break-word' }}>
                          {a.account_id?.trim() ? a.account_id : '—'}
                        </Typography>
                      </TableCell>
                      <TableCell sx={{ maxWidth: 140 }}>
                        <Typography variant="body2" sx={{ wordBreak: 'break-word' }}>
                          {a.provider?.trim() ? a.provider : '—'}
                        </Typography>
                      </TableCell>
                      <TableCell sx={{ maxWidth: 200 }}>
                        <Typography variant="body2" sx={{ wordBreak: 'break-word' }}>
                          {a.name?.trim() ? a.name : '—'}
                        </Typography>
                      </TableCell>
                      <TableCell>{a.type}</TableCell>
                      <TableCell align="right">
                        {a.count != null ? a.count : '—'}
                      </TableCell>
                      <TableCell align="right">
                        <InrAmountCell value={a.debitTotal ?? 0} />
                      </TableCell>
                      <TableCell align="right">
                        <InrAmountCell value={a.creditTotal ?? 0} />
                      </TableCell>
                      <TableCell
                        align="right"
                        sx={balanceAmountSx(a.net ?? a.balance)}
                      >
                        <InrAmountCell value={a.net ?? a.balance} />
                      </TableCell>
                    </TableRow>
                  ))}
                  {accounts.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={9}>
                        <Typography variant="body2" color="text.secondary">
                          No accounts.
                        </Typography>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
                {accounts.length > 0 && (
                  <TableFooter
                    sx={{
                      '& .MuiTableCell-root': {
                        borderTop: (t) => `3px solid ${t.palette.divider}`,
                        borderBottom: 'none',
                        py: 1.5,
                        fontSize: '0.875rem',
                        [theme.breakpoints.down('md')]: {
                          fontSize: '0.8125rem',
                        },
                      },
                    }}
                  >
                    <TableRow aria-label="Totals across all accounts">
                      <TableCell colSpan={5} align="right" sx={{ verticalAlign: 'middle' }}>
                        <Typography
                          component="span"
                          variant="caption"
                          color="text.secondary"
                          sx={{
                            fontWeight: 800,
                            textTransform: 'uppercase',
                            letterSpacing: '0.12em',
                            fontSize: '0.7rem',
                          }}
                        >
                          Totals
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Typography
                          variant="body2"
                          fontWeight={700}
                          sx={{ fontVariantNumeric: 'tabular-nums', color: 'text.primary' }}
                          component="span"
                        >
                          {totals.count}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <InrAmountCell value={totals.debits} totalRow />
                      </TableCell>
                      <TableCell align="right">
                        <InrAmountCell value={totals.credits} totalRow />
                      </TableCell>
                      <TableCell
                        align="right"
                        sx={balanceAmountSx(totals.net)}
                      >
                        <InrAmountCell value={totals.net} totalRow />
                      </TableCell>
                    </TableRow>
                  </TableFooter>
                )}
              </Table>
            </Box>
          )}
        </CardContent>
      </Card>

      <AccountDetailDialog
        open={Boolean(routeAccountId)}
        account={selectedAccount}
        listStatus={status}
        decodedAccountId={decodedAccountId}
        onClose={closeDetail}
        onSaved={handleAccountSaved}
      />
    </Stack>
  )
}
