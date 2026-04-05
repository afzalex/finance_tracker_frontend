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

export default function Analytics() {
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
    <Stack spacing={2}>
      <Stack
        direction="row"
        alignItems="flex-start"
        justifyContent="space-between"
        flexWrap="wrap"
        gap={2}
      >
        <PageHeader
          title="Analytics"
        />
        <Box sx={{ flexShrink: 0, alignSelf: 'center' }}>
          <HeaderDateRangeFilter />
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
            gap: 2,
            gridTemplateColumns: { xs: '1fr', lg: '1fr 1fr' },
          }}
        >
          <Card
            variant="outlined"
            sx={{ gridColumn: { xs: 'auto', lg: '1 / -1' } }}
          >
            <CardContent>
              <Typography variant="h6">Top Merchants</Typography>
              <Divider sx={{ my: 1 }} />
              <Table size="small" aria-label="Top Merchants table">
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
            </CardContent>
          </Card>

          <Card variant="outlined">
            <CardContent>
              <Typography variant="h6">Cashflow</Typography>
              <Divider sx={{ my: 1 }} />
              <Table size="small" aria-label="cashflow table">
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
            </CardContent>
          </Card>

          <Card variant="outlined">
            <CardContent>
              <Typography variant="h6">Category Breakdown</Typography>
              <Divider sx={{ my: 1 }} />
              <Table size="small" aria-label="Category Breakdown table">
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
            </CardContent>
          </Card>
        </Box>
      )}
    </Stack>
  )
}

