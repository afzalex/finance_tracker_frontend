import { Alert, Box, Button, Card, CardContent, Stack, Typography } from '@mui/material'
import { Link } from 'react-router-dom'
import { useState } from 'react'
import PageHeader from '../components/PageHeader'
import { reprocessAllEmailsOffline } from '../services/financeApi'

export default function Settings() {
  const [reprocessState, setReprocessState] = useState({
    status: 'idle',
    message: '',
  })

  const onReprocessAll = async () => {
    setReprocessState({ status: 'loading', message: '' })
    try {
      await reprocessAllEmailsOffline()
      setReprocessState({
        status: 'success',
        message: 'Reprocess started for all cached emails.',
      })
    } catch (e) {
      const msg = e?.message ?? 'Request failed'
      setReprocessState({ status: 'error', message: msg })
    }
  }

  return (
    <Stack spacing={2}>
      <PageHeader
        title="Settings"
        description="Placeholder settings page."
      />

      <Card variant="outlined">
        <CardContent>
          <Typography variant="h6">API</Typography>
          <Typography variant="body2" color="text.secondary">
            Planned: configurable base URL and connectivity check.
          </Typography>
          <Box sx={{ mt: 2, display: 'flex', gap: 1, alignItems: 'center' }}>
            <Button
              size="small"
              variant="contained"
              onClick={onReprocessAll}
              disabled={reprocessState.status === 'loading'}
            >
              Reprocess All Emails
            </Button>
          </Box>
          {reprocessState.message && (
            <Box sx={{ mt: 1 }}>
              <Alert
                severity={reprocessState.status === 'error' ? 'error' : 'success'}
              >
                {reprocessState.message}
              </Alert>
            </Box>
          )}
        </CardContent>
      </Card>

      <Card variant="outlined">
        <CardContent>
          <Typography variant="h6">Rules</Typography>
          <Typography variant="body2" color="text.secondary">
            Configure email classifications and transaction parsers.
          </Typography>

          <Box sx={{ mt: 2 }}>
            <Button component={Link} to="/settings/rules" variant="contained">
              Manage Classifications & Parsers
            </Button>
          </Box>
        </CardContent>
      </Card>
    </Stack>
  )
}

