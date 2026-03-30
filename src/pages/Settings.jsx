import { Alert, Card, CardContent, Stack, Typography } from '@mui/material'
import PageHeader from '../components/PageHeader'

export default function Settings() {
  return (
    <Stack spacing={2}>
      <PageHeader
        title="Settings"
        description="Placeholder settings page."
      />

      <Alert severity="info">
        Backend integration is not wired yet. Next step: add `VITE_API_BASE_URL`
        and swap mock services to real `fetch()` calls.
      </Alert>

      <Card variant="outlined">
        <CardContent>
          <Typography variant="h6">API</Typography>
          <Typography variant="body2" color="text.secondary">
            Planned: configurable base URL and connectivity check.
          </Typography>
        </CardContent>
      </Card>
    </Stack>
  )
}

