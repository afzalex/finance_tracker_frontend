import { useMemo } from 'react'
import {
  Alert,
  Box,
  Card,
  CardContent,
  Divider,
  List,
  ListItem,
  ListItemText,
  Stack,
  Typography,
} from '@mui/material'
import LoadingBlock from '../components/LoadingBlock'
import PageHeader from '../components/PageHeader'
import { getDashboardStats } from '../services/financeApi'
import useResource from '../hooks/useResource'
import { signedAmountSx } from '../utils/moneySx'
import { formatDate, formatMoney } from '../utils/format'

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
  const { status, data: stats, error } = useResource(
    'dashboardStats',
    getDashboardStats,
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

  return (
    <Stack spacing={2}>
      <PageHeader
        title="Dashboard"
        description="Initial UI scaffold using mock data (no backend calls yet)."
      />

      {error && <Alert severity="error">{error}</Alert>}

      {status === 'loading' ? (
        <LoadingBlock />
      ) : (
        <>
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

          <Card variant="outlined">
            <CardContent>
              <Typography variant="h6" sx={{ mb: 1 }}>
                Recent activity
              </Typography>
              <Divider sx={{ mb: 1 }} />
              <List dense disablePadding>
                {stats?.recentActivity?.map((item) => (
                  <ListItem key={item.id} disableGutters>
                    <ListItemText
                      primary={item.label}
                      secondary={formatDate(item.date)}
                    />
                    <Typography variant="body2" sx={signedAmountSx(item.amount)}>
                      {formatMoney(item.amount)}
                    </Typography>
                  </ListItem>
                ))}
              </List>
            </CardContent>
          </Card>
        </>
      )}
    </Stack>
  )
}

