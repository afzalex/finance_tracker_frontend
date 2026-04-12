import {
  Alert,
  Box,
  Card,
  CardContent,
  CircularProgress,
  Divider,
  FormControlLabel,
  Stack,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material'
import { useCallback, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import AnalyticsMonthsControl from '../components/AnalyticsMonthsControl'
import InrAmountCell from '../components/InrAmountCell'
import LoadingBlock from '../components/LoadingBlock'
import PageHeader from '../components/PageHeader'
import useResource from '../hooks/useResource'
import { getAnalytics, listTopMerchants } from '../services/financeApi'
import { formatMonthYearShortHyphen } from '../utils/format'
import { signedAmountSx } from '../utils/moneySx'
import {
  ANALYTICS_MONTHS_Q,
  parseAnalyticsMonthsParam,
  ymdRangeForLastNCalendarMonths,
} from '../utils/analyticsRange'
import {
  dataCardWidthSx,
  layoutSectionDividerSx,
  layoutSectionSpacing,
  pageStackWidthSx,
  tableHorizontalScrollSx,
  tableSmallScreenTextSx,
} from '../utils/responsiveTable'

const MERCHANTS_TABLE_MIN = 400

/** Backend `TOP_MERCHANTS_UNDEFINED_MERCHANT` — no merchant and no counterparty name. */
const TOP_MERCHANT_UNDEFINED_SENTINEL = '__UNDEFINED__'

function TopMerchantNameCell({ merchant }) {
  if (merchant === TOP_MERCHANT_UNDEFINED_SENTINEL) {
    return (
      <Typography
        component="span"
        sx={{ fontStyle: 'italic', color: 'text.secondary' }}
      >
        UNDEFINED
      </Typography>
    )
  }
  return merchant
}
const CASHFLOW_TABLE_MIN = 560
const CATEGORY_TABLE_MIN = 320

/** Calendar YYYY-MM-DD → local `Date` (avoids UTC parse shifting the day). */
function dateFromYmd(ymd) {
  const [y, m, d] = String(ymd).split('-').map(Number)
  return new Date(y, m - 1, d)
}

export default function Analytics() {
  const theme = useTheme()
  const isMdDown = useMediaQuery(theme.breakpoints.down('md'))
  const [searchParams, setSearchParams] = useSearchParams()
  const analyticsMonths = useMemo(
    () => parseAnalyticsMonthsParam(searchParams.get(ANALYTICS_MONTHS_Q)),
    [searchParams],
  )
  const apiRange = useMemo(
    () => ymdRangeForLastNCalendarMonths(analyticsMonths),
    [analyticsMonths],
  )
  const analyticsKey = useMemo(
    () => JSON.stringify({ months: analyticsMonths, ...apiRange }),
    [analyticsMonths, apiRange],
  )
  const topMerchantsResourceKey = useMemo(
    () => `${analyticsKey}:tmSelf:false`,
    [analyticsKey],
  )
  const setAnalyticsMonths = useCallback(
    (nextMonths) => {
      setSearchParams(
        (prev) => {
          const sp = new URLSearchParams(prev)
          sp.set(ANALYTICS_MONTHS_Q, String(nextMonths))
          return sp
        },
        { replace: true },
      )
    },
    [setSearchParams],
  )
  const { status, data, error } = useResource(
    `analytics:${analyticsKey}`,
    () => getAnalytics({ from: apiRange.from, to: apiRange.to }),
  )
  const {
    status: merchantsStatus,
    data: topMerchants,
    error: merchantsError,
  } = useResource(
    `analyticsTopMerchants:${topMerchantsResourceKey}`,
    () =>
      listTopMerchants({
        from: apiRange.from,
        to: apiRange.to,
        limit: 5,
      }),
  )

  const tablesLoading = status === 'loading'
  return (
    <Stack spacing={layoutSectionSpacing} sx={pageStackWidthSx}>
      <Stack
        direction={{ xs: 'column', md: 'row' }}
        alignItems={{ xs: 'stretch', md: 'flex-start' }}
        justifyContent="space-between"
        gap={layoutSectionSpacing}
      >
        <PageHeader
          title="Analytics"
        />
        <Box
          sx={{
            width: { xs: '100%', md: 'auto' },
            flexShrink: { md: 0 },
            alignSelf: { md: 'center' },
          }}
        >
          <AnalyticsMonthsControl
            value={analyticsMonths}
            onChange={setAnalyticsMonths}
            fullWidth={isMdDown}
          />
        </Box>
      </Stack>

      {error && <Alert severity="error">{error}</Alert>}
      {merchantsError && (
        <Alert severity="error">{merchantsError}</Alert>
      )}

      {tablesLoading ? (
        <LoadingBlock />
      ) : (
        <Box
          sx={{
            display: 'grid',
            gap: layoutSectionSpacing,
            minWidth: 0,
            maxWidth: '100%',
            width: '100%',
            gridTemplateColumns: { xs: '1fr', lg: '1fr 1fr' },
          }}
        >
          <Card
            variant="outlined"
            sx={{
              ...dataCardWidthSx,
              gridColumn: { xs: 'auto', lg: '1 / -1' },
            }}
          >
            <CardContent sx={{ minWidth: 0 }}>
              <Stack
                direction={{ xs: 'column', sm: 'row' }}
                alignItems={{ xs: 'stretch', sm: 'center' }}
                justifyContent="space-between"
                gap={1}
                sx={{ mb: 0 }}
              >
                <Typography variant="h6">Top merchants and counterparties</Typography>
              </Stack>
              <Divider sx={layoutSectionDividerSx} />
              <Box sx={tableHorizontalScrollSx}>
                <Table
                  size="small"
                  aria-label="Top merchants and counterparties table"
                  sx={[
                    { minWidth: MERCHANTS_TABLE_MIN, width: '100%' },
                    tableSmallScreenTextSx(theme),
                  ]}
                >
                <TableHead>
                  <TableRow>
                    <TableCell>Merchant / counterparty</TableCell>
                    <TableCell align="right">Transactions</TableCell>
                    <TableCell align="right">Total</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {merchantsStatus === 'loading' ? (
                    <TableRow>
                      <TableCell colSpan={3} align="center" sx={{ py: 4 }}>
                        <CircularProgress size={28} />
                      </TableCell>
                    </TableRow>
                  ) : (topMerchants?.length ?? 0) === 0 ? (
                    <TableRow>
                      <TableCell colSpan={3}>
                        <Typography variant="body2" color="text.secondary">
                          No merchant data for this range.
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ) : (
                    topMerchants.map((row, i) => (
                      <TableRow key={`${row.merchant}:${i}`} hover>
                        <TableCell>
                          <TopMerchantNameCell merchant={row.merchant} />
                        </TableCell>
                        <TableCell
                          align="right"
                          sx={{ fontVariantNumeric: 'tabular-nums' }}
                        >
                          {row.transactionCount}
                        </TableCell>
                        <TableCell align="right">
                          <InrAmountCell value={-row.total} />
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
              </Box>
            </CardContent>
          </Card>

          <Card variant="outlined" sx={dataCardWidthSx}>
            <CardContent sx={{ minWidth: 0 }}>
              <Stack
                direction={{ xs: 'column', sm: 'row' }}
                alignItems={{ xs: 'flex-start', sm: 'baseline' }}
                justifyContent="space-between"
                gap={0.75}
                sx={{ mb: 0 }}
              >
                <Typography variant="h6" component="h2">
                  Cashflow
                </Typography>
                {data?.cashflowRange?.from && data?.cashflowRange?.to ? (
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{
                      textAlign: { xs: 'left', sm: 'right' },
                      alignSelf: { xs: 'stretch', sm: 'auto' },
                      whiteSpace: { sm: 'nowrap' },
                    }}
                    aria-label={`Cashflow from ${data.cashflowRange.from} through ${data.cashflowRange.to}`}
                  >
                    {formatMonthYearShortHyphen(dateFromYmd(data.cashflowRange.from))} –{' '}
                    {formatMonthYearShortHyphen(dateFromYmd(data.cashflowRange.to))}
                  </Typography>
                ) : null}
              </Stack>
              <Divider sx={layoutSectionDividerSx} />
              <Box sx={tableHorizontalScrollSx}>
                <Table
                  size="small"
                  aria-label="cashflow table"
                  sx={[
                    { minWidth: CASHFLOW_TABLE_MIN, width: '100%' },
                    tableSmallScreenTextSx(theme),
                  ]}
                >
                <TableHead>
                  <TableRow>
                    <TableCell>Month</TableCell>
                    <TableCell align="right">Transactions</TableCell>
                    <TableCell align="right">Credit</TableCell>
                    <TableCell align="right">Debit</TableCell>
                    <TableCell align="right">Total</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {(data?.cashflow?.length ?? 0) === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5}>
                        <Typography variant="body2" color="text.secondary">
                          No cashflow rows for this range.
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ) : (
                    data.cashflow.map((row) => {
                      const total = row.total
                      return (
                        <TableRow key={row.month} hover>
                          <TableCell>{row.month}</TableCell>
                          <TableCell
                            align="right"
                            sx={{ fontVariantNumeric: 'tabular-nums' }}
                          >
                            {row.count}
                          </TableCell>
                          <TableCell align="right">
                            <InrAmountCell value={row.credit} />
                          </TableCell>
                          <TableCell align="right">
                            <InrAmountCell value={-row.debit} />
                          </TableCell>
                          <TableCell align="right">
                            <InrAmountCell
                              value={total}
                              figureSx={signedAmountSx(total)}
                            />
                          </TableCell>
                        </TableRow>
                      )
                    })
                  )}
                </TableBody>
              </Table>
              </Box>
            </CardContent>
          </Card>

          <Card variant="outlined" sx={dataCardWidthSx}>
            <CardContent sx={{ minWidth: 0 }}>
              <Typography variant="h6">Category Breakdown</Typography>
              <Divider sx={layoutSectionDividerSx} />
              <Box sx={tableHorizontalScrollSx}>
                <Table
                  size="small"
                  aria-label="Category Breakdown table"
                  sx={[
                    { minWidth: CATEGORY_TABLE_MIN, width: '100%' },
                    tableSmallScreenTextSx(theme),
                  ]}
                >
                <TableHead>
                  <TableRow>
                    <TableCell>Category</TableCell>
                    <TableCell align="right">Total</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {data?.categoryBreakdown?.map((row) => (
                      <TableRow key={row.category} hover>
                      <TableCell>{row.category}</TableCell>
                      <TableCell align="right">
                        <InrAmountCell value={-row.total} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              </Box>
            </CardContent>
          </Card>
        </Box>
      )}
    </Stack>
  )
}

