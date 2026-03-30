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
import LoadingBlock from '../components/LoadingBlock'
import PageHeader from '../components/PageHeader'
import useResource from '../hooks/useResource'
import { listAccounts } from '../services/financeApi'
import { balanceAmountSx } from '../utils/moneySx'
import { formatMoney } from '../utils/format'

export default function Accounts() {
  const { status, data, error } = useResource('accounts', listAccounts)
  const accounts = data ?? []

  return (
    <Stack spacing={2}>
      <PageHeader title="Accounts" description="Mock accounts list." />

      {error && <Alert severity="error">{error}</Alert>}

      <Card variant="outlined">
        <CardContent>
          <Typography variant="h6">Balances</Typography>
          <Divider sx={{ my: 1 }} />

          {status === 'loading' ? (
            <LoadingBlock />
          ) : (
            <Box sx={{ width: '100%', overflowX: 'auto' }}>
              <Table size="small" aria-label="accounts table">
                <TableHead>
                  <TableRow>
                    <TableCell>Name</TableCell>
                    <TableCell>Type</TableCell>
                    <TableCell align="right">Balance</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {accounts.map((a) => (
                    <TableRow key={a.id} hover>
                      <TableCell>{a.name}</TableCell>
                      <TableCell>{a.type}</TableCell>
                      <TableCell align="right" sx={balanceAmountSx(a.balance)}>
                        {formatMoney(a.balance, a.currency)}
                      </TableCell>
                    </TableRow>
                  ))}
                  {accounts.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={3}>
                        <Typography variant="body2" color="text.secondary">
                          No accounts.
                        </Typography>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </Box>
          )}
        </CardContent>
      </Card>
    </Stack>
  )
}

