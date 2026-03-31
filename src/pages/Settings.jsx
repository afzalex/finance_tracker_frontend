import { Alert, Box, Button, Card, CardContent, Stack, Typography } from '@mui/material'
import { Link } from 'react-router-dom'
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

