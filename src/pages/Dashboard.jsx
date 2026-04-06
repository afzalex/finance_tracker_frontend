import { useMemo, useState, useEffect } from 'react'
import {
  Alert,
  Box,
  Card,
  CardActionArea,
  CardContent,
  CircularProgress,
  Divider,
  Link,
  Stack,
  Typography,
} from '@mui/material'
import { Link as RouterLink, useLocation } from 'react-router-dom'
import useDateRange from '../contexts/useDateRange'
import InrAmountCell from '../components/InrAmountCell'
import LoadingBlock from '../components/LoadingBlock'
import PageHeader from '../components/PageHeader'
import {
  getDashboardStats,
  getTransactionSummary,
  listTopEmailsWithTransactions,
  listTransactions,
} from '../services/financeApi'
import useResource from '../hooks/useResource'
import { signedAmountSx } from '../utils/moneySx'
import { formatDate, formatDateTime } from '../utils/format'
import {
  layoutSectionDividerBottomSx,
  layoutSectionMarginBottomSx,
  layoutSectionSpacing,
  pageStackWidthSx,
} from '../utils/responsiveTable'
import { DATE_RANGE_Q, pathWithDateRangeQuery } from '../utils/dateRangeUrl'

const RECENT_TX_PAGE_SIZE = 8
const RECENT_MAIL_LIMIT = 6

/** Inclusive YYYY-MM-DD range for the calendar month containing `d` (local). */
function calendarMonthRangeYmd(d = new Date()) {
  const y = d.getFullYear()
  const monthIndex = d.getMonth()
  const pad = (n) => String(n).padStart(2, '0')
  const from = `${y}-${pad(monthIndex + 1)}-01`
  const lastDay = new Date(y, monthIndex + 1, 0).getDate()
  const to = `${y}-${pad(monthIndex + 1)}-${pad(lastDay)}`
  return { from, to }
}

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

/** Subject line, or snippet / mail id when there is no subject. */
function recentMailSubjectDisplay(e) {
  const sub = e.subject != null && String(e.subject).trim() !== ''
    ? String(e.subject).trim()
    : ''
  if (sub) return sub
  const sn = e.snippet != null && String(e.snippet).trim() !== ''
    ? String(e.snippet).trim()
    : ''
  if (sn) return sn
  const mid = e.mail_id != null && String(e.mail_id).trim() !== ''
    ? String(e.mail_id).trim()
    : ''
  return mid || '—'
}

function recentMailActivityDateTime(e) {
  const raw = e.last_transacted_at
  if (raw == null || String(raw).trim() === '') return null
  return formatDateTime(raw)
}

/** Sender, classification, cached date — not transaction counts (section context). */
function recentMailSecondaryAttributes(e) {
  const parts = []
  const sender = e.sender != null && String(e.sender).trim() !== ''
    ? String(e.sender).trim()
    : ''
  if (sender) parts.push(sender)
  const cls = e.enrichment?.classification_name
  if (cls != null && String(cls).trim() !== '') {
    parts.push(String(cls).trim())
  }
  return parts.length ? parts.join(' · ') : null
}

function recentMailSnippetLine(e) {
  const sub = e.subject != null && String(e.subject).trim() !== ''
    ? String(e.subject).trim()
    : ''
  const sn = e.snippet != null && String(e.snippet).trim() !== ''
    ? String(e.snippet).trim()
    : ''
  if (!sub || !sn || sn === sub) return null
  return sn
}

function recentMailHasSubject(e) {
  return e.subject != null && String(e.subject).trim() !== ''
}

/** Body preview: max 2 lines (snippet, or primary line when there is no subject). */
const recentMailBodyClampSx = {
  overflow: 'hidden',
  display: '-webkit-box',
  WebkitBoxOrient: 'vertical',
  WebkitLineClamp: 2,
  wordBreak: 'break-word',
}

function StatCard({ title, value, subtitle, to }) {
  const content = (
    <CardContent sx={{ textAlign: 'center', width: '100%' }}>
      <Typography variant="overline" color="text.secondary" sx={{ display: 'block' }}>
        {title}
      </Typography>
      <Box
        sx={{
          mt: 0.5,
          display: 'flex',
          justifyContent: 'center',
          width: '100%',
        }}
      >
        {typeof value === 'string' ? (
          <Typography variant="h5">{value}</Typography>
        ) : (
          value
        )}
      </Box>
      {subtitle && (
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
          {subtitle}
        </Typography>
      )}
    </CardContent>
  )

  return (
    <Card
      variant="outlined"
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {to ? (
        <CardActionArea
          component={RouterLink}
          to={to}
          aria-label={`Open analytics: ${title}`}
          sx={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'stretch',
            justifyContent: 'flex-start',
          }}
        >
          {content}
        </CardActionArea>
      ) : (
        content
      )}
    </Card>
  )
}

export default function Dashboard() {
  const location = useLocation()
  const { from: dateRangeFrom, to: dateRangeTo } = useDateRange()
  const [monthRange, setMonthRange] = useState(() => calendarMonthRangeYmd())

  useEffect(() => {
    const tick = () => {
      const next = calendarMonthRangeYmd()
      setMonthRange((prev) =>
        prev.from === next.from && prev.to === next.to ? prev : next,
      )
    }
    const id = setInterval(tick, 60_000)
    return () => clearInterval(id)
  }, [])

  const {
    status: totalsStatus,
    data: totals,
    error: totalsError,
  } = useResource(
    `dashboardTransactionSummary:${monthRange.from}|${monthRange.to}`,
    () => getTransactionSummary(monthRange),
  )
  const {
    status: miscStatus,
    data: miscStats,
    error: miscError,
  } = useResource('dashboardMiscStats', getDashboardStats)
  const {
    status: recentTxStatus,
    data: recentTxData,
    error: recentTxError,
  } = useResource('dashboardRecentTransactions', () =>
    listTransactions({
      page: 1,
      pageSize: RECENT_TX_PAGE_SIZE,
      sortBy: 'transacted_at',
      sortOrder: 'desc',
    }),
  )
  const {
    status: recentMailStatus,
    data: recentMails,
    error: recentMailError,
  } = useResource('dashboardRecentMail', () =>
    listTopEmailsWithTransactions({ limit: RECENT_MAIL_LIMIT }),
  )

  const summary = useMemo(() => {
    if (!totals || !miscStats) return null
    const analyticsTo = pathWithDateRangeQuery('/analytics', {
      from: dateRangeFrom,
      to: dateRangeTo,
    })
    return [
      {
        title: 'Net (This Month)',
        value: <InrAmountCell value={totals.net} density="emphasized" align="center" />,
        to: analyticsTo,
      },
      {
        title: 'Income (This Month)',
        value: (
          <InrAmountCell value={totals.totalCredit} density="emphasized" align="center" />
        ),
        to: analyticsTo,
      },
      {
        title: 'Expenses (This Month)',
        value: (
          <InrAmountCell value={totals.totalDebit} density="emphasized" align="center" />
        ),
        to: analyticsTo,
      },
      {
        title: 'Top Category',
        value: miscStats.topCategory,
        to: analyticsTo,
      },
    ]
  }, [totals, miscStats, dateRangeFrom, dateRangeTo])

  const recentTxItems = recentTxData?.items ?? []
  const recentMailItems = recentMails ?? []

  return (
    <Stack spacing={layoutSectionSpacing} sx={pageStackWidthSx}>
      <PageHeader
        title="Dashboard"
      />

      {(totalsError || miscError) && (
        <Alert severity="error">{totalsError || miscError}</Alert>
      )}

      {totalsStatus === 'loading' || miscStatus === 'loading' ? (
        <LoadingBlock />
      ) : (
        <Box
          sx={{
            display: 'grid',
            gap: layoutSectionSpacing,
            minWidth: 0,
            maxWidth: '100%',
            width: '100%',
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

      <Box
        sx={{
          display: 'grid',
          gap: layoutSectionSpacing,
          minWidth: 0,
          maxWidth: '100%',
          width: '100%',
          gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
          alignItems: 'stretch',
        }}
      >
        <Card variant="outlined" sx={{ minWidth: 0, height: '100%' }}>
          <CardContent sx={{ py: 2, '&:last-child': { pb: 2 } }}>
            <Typography variant="h6" sx={layoutSectionMarginBottomSx}>
              Recent Transactions
            </Typography>
            <Divider sx={layoutSectionDividerBottomSx} />
            {recentTxError && (
              <Alert severity="error" sx={layoutSectionMarginBottomSx}>
                {recentTxError}
              </Alert>
            )}
            {recentTxStatus === 'loading' ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                <CircularProgress size={28} />
              </Box>
            ) : recentTxItems.length === 0 ? (
              <Typography variant="body2" color="text.secondary">
                No recent transactions.
              </Typography>
            ) : (
              <Stack divider={<Divider flexItem />} spacing={0}>
                {recentTxItems.map((item) => {
                  const txDetailSp = new URLSearchParams()
                  txDetailSp.set('returnTo', `${location.pathname}${location.search}`)
                  txDetailSp.set(DATE_RANGE_Q.from, dateRangeFrom)
                  txDetailSp.set(DATE_RANGE_Q.to, dateRangeTo)
                  return (
                  <Link
                    key={item.id}
                    component={RouterLink}
                    to={`/transactions/${encodeURIComponent(item.id)}?${txDetailSp.toString()}`}
                    underline="none"
                    color="inherit"
                    aria-label={`Open transaction: ${recentActivityPrimary(item)}`}
                    sx={{
                      display: 'block',
                      py: { xs: 0.875, md: 1.25 },
                      px: 1,
                      mx: -1,
                      '&:hover': { bgcolor: 'action.hover' },
                    }}
                  >
                    <Box
                      sx={{
                        display: 'flex',
                        alignItems: 'baseline',
                        justifyContent: 'space-between',
                        gap: { xs: 1, md: 1.5 },
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
                      <Box
                        sx={{
                          flexShrink: 0,
                          whiteSpace: 'nowrap',
                          maxWidth: '50%',
                        }}
                      >
                        <InrAmountCell
                          inline
                          value={item.amount}
                          figureSx={signedAmountSx(item.amount)}
                        />
                      </Box>
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
                  </Link>
                  )
                })}
              </Stack>
            )}
          </CardContent>
        </Card>

        <Card variant="outlined" sx={{ minWidth: 0, alignSelf: 'start', width: '100%' }}>
          <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
            <Typography variant="h6" sx={{ mb: 0.25 }}>
              Recent Mails
            </Typography>
            <Divider sx={layoutSectionDividerBottomSx} />
            {recentMailError && (
              <Alert severity="error" sx={layoutSectionMarginBottomSx}>
                {recentMailError}
              </Alert>
            )}
            {recentMailStatus === 'loading' ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
                <CircularProgress size={28} />
              </Box>
            ) : recentMailItems.length === 0 ? (
              <Typography variant="body2" color="text.secondary">
                No mail with transactions yet.
              </Typography>
            ) : (
              <Stack divider={<Divider flexItem />} spacing={0}>
                {recentMailItems.map((item) => {
                  const snippet = recentMailSnippetLine(item)
                  const hasSubject = recentMailHasSubject(item)
                  const subjectTitle = recentMailSubjectDisplay(item)
                  const activityWhen = recentMailActivityDateTime(item)
                  const secondary = recentMailSecondaryAttributes(item)
                  const mailTxSp = new URLSearchParams()
                  mailTxSp.set('mail_id', String(item.mail_id))
                  mailTxSp.set('tab', 'email')
                  mailTxSp.set('returnTo', `${location.pathname}${location.search}`)
                  mailTxSp.set(DATE_RANGE_Q.from, dateRangeFrom)
                  mailTxSp.set(DATE_RANGE_Q.to, dateRangeTo)
                  return (
                    <Link
                      key={`${item.mail_id}:${item.id}`}
                      component={RouterLink}
                      to={`/transactions?${mailTxSp.toString()}`}
                      underline="none"
                      color="inherit"
                      aria-label={
                        activityWhen
                          ? `Open source email: ${subjectTitle}, ${activityWhen}`
                          : `Open source email: ${subjectTitle}`
                      }
                      sx={{
                        display: 'block',
                        py: 0.875,
                        px: 1,
                        mx: -1,
                        '&:hover': { bgcolor: 'action.hover' },
                      }}
                    >
                      <Box
                        sx={{
                          display: 'flex',
                          alignItems: 'flex-start',
                          justifyContent: 'space-between',
                          gap: 1.5,
                          minWidth: 0,
                        }}
                      >
                        <Typography
                          variant="body2"
                          component="div"
                          fontWeight={600}
                          sx={{
                            minWidth: 0,
                            flex: '1 1 auto',
                            lineHeight: 1.35,
                            wordBreak: 'break-word',
                            ...(!hasSubject ? recentMailBodyClampSx : {}),
                          }}
                        >
                          {subjectTitle}
                        </Typography>
                        {activityWhen ? (
                          <Typography
                            variant="caption"
                            color="text.secondary"
                            component="span"
                            sx={{
                              flexShrink: 0,
                              lineHeight: 1.35,
                              whiteSpace: 'nowrap',
                              maxWidth: '42%',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              textAlign: 'right',
                            }}
                          >
                            {activityWhen}
                          </Typography>
                        ) : null}
                      </Box>
                      {secondary ? (
                        <Typography
                          variant="caption"
                          color="text.secondary"
                          component="div"
                          sx={{
                            display: 'block',
                            lineHeight: 1.45,
                            wordBreak: 'break-word',
                            mt: 0.375,
                          }}
                        >
                          {secondary}
                        </Typography>
                      ) : null}
                      {snippet ? (
                        <Typography
                          variant="caption"
                          color="text.secondary"
                          sx={{
                            display: 'block',
                            lineHeight: 1.45,
                            mt: 0.25,
                            opacity: 0.92,
                            ...recentMailBodyClampSx,
                          }}
                        >
                          {snippet} ...
                        </Typography>
                      ) : null}
                    </Link>
                  )
                })}
              </Stack>
            )}
          </CardContent>
        </Card>
      </Box>
    </Stack>
  )
}
