import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Divider,
  Link,
  Stack,
  Typography,
} from '@mui/material'
import { Link as RouterLink } from 'react-router-dom'
import { useState } from 'react'
import PageHeader from '../components/PageHeader'
import useAppMeta from '../contexts/useAppMeta'
import { reprocessAllEmailsOffline } from '../services/financeApi'

const META_ROWS = [
  { key: 'app_version', label: 'App version' },
  { key: 'mail_user_email', label: 'Gmail account' },
  { key: 'is_healthy', label: 'API healthy', format: 'bool' },
  { key: 'is_initialized', label: 'Initialized', format: 'bool' },
  { key: 'is_mail_connectivity_working', label: 'Mail connectivity', format: 'bool' },
  { key: 'docs_url', label: 'API docs', format: 'url' },
  { key: 'openapi_url', label: 'OpenAPI JSON', format: 'url' },
  { key: 'redoc_url', label: 'ReDoc', format: 'url' },
]

function formatMetaValue(meta, { key, format: fmt }) {
  const raw = meta?.[key]
  if (raw === null || raw === undefined || raw === '') return null
  if (fmt === 'bool') {
    return (
      <Chip
        size="small"
        label={raw ? 'Yes' : 'No'}
        color={raw ? 'success' : 'default'}
        variant={raw ? 'filled' : 'outlined'}
        sx={{ height: 22 }}
      />
    )
  }
  if (fmt === 'url' && typeof raw === 'string') {
    return (
      <Link href={raw} target="_blank" rel="noopener noreferrer" variant="body2">
        {raw}
      </Link>
    )
  }
  return String(raw)
}

export default function Settings() {
  const meta = useAppMeta()
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
        description="Reprocess cached emails, manage rules, and view backend status."
      />

      <Card variant="outlined">
        <CardContent>
          <Typography variant="h6">API</Typography>
          {meta ? (
            <Stack component="dl" spacing={1.25} sx={{ m: 0, mt: 2 }}>
              {META_ROWS.map((row) => {
                const value = formatMetaValue(meta, row)
                if (value == null) return null
                return (
                  <Box
                    key={row.key}
                    sx={{
                      display: 'grid',
                      gridTemplateColumns: { xs: '1fr', sm: 'minmax(140px, 200px) 1fr' },
                      gap: { xs: 0.25, sm: 2 },
                      alignItems: 'center',
                    }}
                  >
                    <Typography
                      component="dt"
                      variant="body2"
                      color="text.secondary"
                      sx={{ fontWeight: 500 }}
                    >
                      {row.label}
                    </Typography>
                    <Box component="dd" sx={{ m: 0 }}>
                      {value}
                    </Box>
                  </Box>
                )
              })}
            </Stack>
          ) : (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
              No metadata loaded.
            </Typography>
          )}
          <Divider sx={{ my: 2 }} />
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
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
            <Button component={RouterLink} to="/settings/rules" variant="contained">
              Manage Classifications & Parsers
            </Button>
          </Box>
        </CardContent>
      </Card>
    </Stack>
  )
}

