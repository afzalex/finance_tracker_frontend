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
  Typography,
} from '@mui/material'
import { useMemo } from 'react'
import HeaderDateRangeFilter from '../components/HeaderDateRangeFilter'
import LoadingBlock from '../components/LoadingBlock'
import PageHeader from '../components/PageHeader'
import useDateRange from '../contexts/useDateRange'
import useResource from '../hooks/useResource'
import { getAnalytics } from '../services/financeApi'
import { signedAmountSx } from '../utils/moneySx'
import { formatMoney } from '../utils/format'

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

      {status === 'loading' ? (
        <LoadingBlock />
      ) : (
        <Box
          sx={{
            display: 'grid',
            gap: 2,
            gridTemplateColumns: { xs: '1fr', lg: '1fr 1fr' },
          }}
        >
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
                        <TableCell align="right">{formatMoney(row.income)}</TableCell>
                        <TableCell align="right">
                          {formatMoney(-row.expense)}
                        </TableCell>
                        <TableCell align="right" sx={signedAmountSx(net)}>
                          {formatMoney(net)}
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
              <Typography variant="h6">Category breakdown</Typography>
              <Divider sx={{ my: 1 }} />
              <Table size="small" aria-label="category breakdown table">
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
                      <TableCell
                        align="right"
                        sx={{ fontVariantNumeric: 'tabular-nums' }}
                      >
                        {formatMoney(-row.total)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Card
            variant="outlined"
            sx={{ gridColumn: { xs: 'auto', lg: '1 / -1' } }}
          >
            <CardContent>
              <Typography variant="h6">Top merchants</Typography>
              <Divider sx={{ my: 1 }} />
              <Table size="small" aria-label="top merchants table">
                <TableHead>
                  <TableRow>
                    <TableCell>Merchant</TableCell>
                    <TableCell align="right">Total</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {data?.topMerchants?.map((row) => (
                    <TableRow key={row.merchant} hover>
                      <TableCell>{row.merchant}</TableCell>
                      <TableCell
                        align="right"
                        sx={{ fontVariantNumeric: 'tabular-nums' }}
                      >
                        {formatMoney(-row.total)}
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

