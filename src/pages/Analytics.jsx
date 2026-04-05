import {
  Alert,
  Box,
  Card,
  CardContent,
  CircularProgress,
  Divider,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material'
import { useMemo } from 'react'
import HeaderDateRangeFilter from '../components/HeaderDateRangeFilter'
import InrAmountCell from '../components/InrAmountCell'
import LoadingBlock from '../components/LoadingBlock'
import PageHeader from '../components/PageHeader'
import useDateRange from '../contexts/useDateRange'
import useResource from '../hooks/useResource'
import { getAnalytics, listTopMerchants } from '../services/financeApi'
import { signedAmountSx } from '../utils/moneySx'
import {
  dataCardWidthSx,
  layoutSectionDividerSx,
  layoutSectionSpacing,
  pageStackWidthSx,
  tableHorizontalScrollSx,
  tableSmallScreenTextSx,
} from '../utils/responsiveTable'

const MERCHANTS_TABLE_MIN = 400
const CASHFLOW_TABLE_MIN = 480
const CATEGORY_TABLE_MIN = 320

export default function Analytics() {
  const theme = useTheme()
  const isMdDown = useMediaQuery(theme.breakpoints.down('md'))
  const { from: dateRangeFrom, to: dateRangeTo } = useDateRange()
  const analyticsKey = useMemo(
    () => JSON.stringify({ from: dateRangeFrom, to: dateRangeTo }),
    [dateRangeFrom, dateRangeTo],
  )
  const { status, data, error } = useResource(
    `analytics:${analyticsKey}`,
    () => getAnalytics({ from: dateRangeFrom, to: dateRangeTo }),
  )
  const {
    status: merchantsStatus,
    data: topMerchants,
    error: merchantsError,
  } = useResource(
    `analyticsTopMerchants:${analyticsKey}`,
    () =>
      listTopMerchants({ from: dateRangeFrom, to: dateRangeTo }),
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
          <HeaderDateRangeFilter fullWidth={isMdDown} />
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
              <Typography variant="h6">Top Merchants</Typography>
              <Divider sx={layoutSectionDividerSx} />
              <Box sx={tableHorizontalScrollSx}>
                <Table
                  size="small"
                  aria-label="Top Merchants table"
                  sx={[
                    { minWidth: MERCHANTS_TABLE_MIN, width: '100%' },
                    tableSmallScreenTextSx(theme),
                  ]}
                >
                <TableHead>
                  <TableRow>
                    <TableCell>Merchant</TableCell>
                    <TableCell align="right">Txns</TableCell>
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
                        <TableCell>{row.merchant}</TableCell>
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
              <Typography variant="h6">Cashflow</Typography>
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
                    <TableCell align="right">Income</TableCell>
                    <TableCell align="right">Expense</TableCell>
                    <TableCell align="right">Net</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {data?.cashflow?.map((row) => {
                    const net = row.income - row.expense
                    return (
                      <TableRow key={row.month} hover>
                        <TableCell>{row.month}</TableCell>
                        <TableCell align="right">
                          <InrAmountCell value={row.income} />
                        </TableCell>
                        <TableCell align="right">
                          <InrAmountCell value={-row.expense} />
                        </TableCell>
                        <TableCell align="right">
                          <InrAmountCell value={net} figureSx={signedAmountSx(net)} />
                        </TableCell>
                      </TableRow>
                    )
                  })}
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

