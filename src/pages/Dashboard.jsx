import { useMemo } from 'react'
import {
  Alert,
  Box,
  Card,
  CardContent,
  CircularProgress,
  Divider,
  Stack,
  Typography,
} from '@mui/material'
import LoadingBlock from '../components/LoadingBlock'
import PageHeader from '../components/PageHeader'
import { getDashboardStats, listTransactions } from '../services/financeApi'
import useResource from '../hooks/useResource'
import { signedAmountSx } from '../utils/moneySx'
import { formatDate, formatMoney } from '../utils/format'

const RECENT_TX_PAGE_SIZE = 8

function recentActivityPrimary(row) {
  const c = row?.counterparty_name ?? row?.merchant
  const cp = c != null && String(c).trim() !== '' ? String(c).trim() : ''
  const desc =
    row?.description != null &&
    String(row.description).trim() !== '' &&
    row.description !== '—'
      ? String(row.description).trim()
      : ''
  if (cp && desc) return `${cp} · ${desc}`
  if (cp) return cp
  if (desc) return desc
  return '—'
}

function recentActivityAccountProviderLine(row) {
  const parts = []
  if (row.account && row.account !== '—') parts.push(row.account)
  const p = row.provider != null && String(row.provider).trim() !== '' ? String(row.provider).trim() : ''
  if (p) parts.push(p)
  return parts.length ? parts.join(' · ') : null
}

function recentActivityCategoryLine(row) {
  if (row.category != null && String(row.category).trim() !== '') {
    return String(row.category).trim()
  }
  return null
}

function recentActivityMetaLine(item) {
  const parts = [formatDate(item.date)]
  const ap = recentActivityAccountProviderLine(item)
  if (ap) parts.push(ap)
  const cat = recentActivityCategoryLine(item)
  if (cat) parts.push(cat)
  return parts.join(' · ')
}

function StatCard({ title, value, subtitle }) {
  return (
    <Card variant="outlined" sx={{ height: '100%' }}>
      <CardContent>
        <Typography variant="overline" color="text.secondary">
          {title}
        </Typography>
        <Typography variant="h5" sx={{ mt: 0.5 }}>
          {value}
        </Typography>
        {subtitle && (
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            {subtitle}
          </Typography>
        )}
      </CardContent>
    </Card>
  )
}

export default function Dashboard() {
  const { status: statsStatus, data: stats, error: statsError } = useResource(
    'dashboardStats',
    getDashboardStats,
  )
  const {
    status: recentStatus,
    data: recentData,
    error: recentError,
  } = useResource('dashboardRecentTransactions', () =>
    listTransactions({
      page: 1,
      pageSize: RECENT_TX_PAGE_SIZE,
      sortBy: 'transacted_at',
      sortOrder: 'desc',
    }),
  )

  const summary = useMemo(() => {
    if (!stats) return null
    return [
      {
        title: 'Net (This Month)',
        value: formatMoney(stats.netThisMonth),
        subtitle: 'Income - Expenses',
      },
      {
        title: 'Income (This Month)',
        value: formatMoney(stats.incomeThisMonth),
      },
      {
        title: 'Expenses (This Month)',
        value: formatMoney(stats.expenseThisMonth),
      },
      {
        title: 'Top Category',
        value: stats.topCategory,
      },
    ]
  }, [stats])

  const recentItems = recentData?.items ?? []

  return (
    <Stack spacing={2}>
      <PageHeader
        title="Dashboard"
      />

      {statsError && <Alert severity="error">{statsError}</Alert>}

      {statsStatus === 'loading' ? (
        <LoadingBlock />
      ) : (
        <Box
          sx={{
            display: 'grid',
            gap: 2,
            gridTemplateColumns: {
              xs: '1fr',
              sm: '1fr 1fr',
              lg: '1fr 1fr 1fr 1fr',
            },
          }}
        >
          {summary?.map((s) => (
            <Box key={s.title} sx={{ height: '100%' }}>
              <StatCard {...s} />
            </Box>
          ))}
        </Box>
      )}

      <Card
        variant="outlined"
        sx={{ maxWidth: 560, width: '100%', alignSelf: 'flex-start' }}
      >
        <CardContent sx={{ py: 2, '&:last-child': { pb: 2 } }}>
          <Typography variant="h6" sx={{ mb: 1 }}>
            Recent Activity
          </Typography>
          <Divider sx={{ mb: 1 }} />
          {recentError && (
            <Alert severity="error" sx={{ mb: 1 }}>
              {recentError}
            </Alert>
          )}
          {recentStatus === 'loading' ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress size={28} />
            </Box>
          ) : recentItems.length === 0 ? (
            <Typography variant="body2" color="text.secondary">
              No recent transactions.
            </Typography>
          ) : (
            <Stack divider={<Divider flexItem />} spacing={0}>
              {recentItems.map((item) => (
                <Box key={item.id} sx={{ py: 1.25 }}>
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'baseline',
                      justifyContent: 'space-between',
                      gap: 1.5,
                      mb: 0.375,
                    }}
                  >
                    <Typography
                      variant="body2"
                      fontWeight={600}
                      sx={{
                        minWidth: 0,
                        flex: '1 1 auto',
                        lineHeight: 1.35,
                        pr: 0.5,
                      }}
                    >
                      {recentActivityPrimary(item)}
                    </Typography>
                    <Typography
                      variant="body2"
                      sx={{
                        ...signedAmountSx(item.amount),
                        flexShrink: 0,
                        fontVariantNumeric: 'tabular-nums',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {formatMoney(item.amount, item.currency)}
                    </Typography>
                  </Box>
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{
                      display: 'block',
                      lineHeight: 1.45,
                      wordBreak: 'break-word',
                    }}
                  >
                    {recentActivityMetaLine(item)}
                  </Typography>
                </Box>
              ))}
            </Stack>
          )}
        </CardContent>
      </Card>
    </Stack>
  )
}
