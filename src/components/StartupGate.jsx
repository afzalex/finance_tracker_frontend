import { useMemo, useState } from 'react'
import { Outlet } from 'react-router-dom'
import {
  Box,
  Button,
  CircularProgress,
  Link,
  Stack,
  Typography,
  Toolbar,
} from '@mui/material'
import useResource from '../hooks/useResource'
import { apiErrorMessage, getAppMetadata } from '../services/financeApi'
import { apiBasePath } from '../services/apiConfig'
import { adminApi } from '../services/apiConfig'
import useSetAppMeta from '../contexts/useSetAppMeta'

function FullPageMessage({ title, children, actions }) {
  return (
    <Box
      sx={{
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        p: 3,
      }}
    >
      <Stack spacing={2} sx={{ maxWidth: 720, width: '100%' }}>
        <Toolbar />
        <Typography variant="h4" component="h1">
          {title}
        </Typography>
        <Typography variant="body1" color="text.secondary">
          {children}
        </Typography>
        {actions ? <Stack direction="row" spacing={1}>{actions}</Stack> : null}
      </Stack>
    </Box>
  )
}

function oauthRedirectUri() {
  // Use a frontend callback route (not `/api/*`), because in production `/api/*` is
  // reserved for the backend reverse proxy (Nginx) and in dev Vite has no proxy.
  return `${window.location.origin}/oauth/gmail/callback`
}

export default function StartupGate() {
  const [reloadNonce, setReloadNonce] = useState(0)
  const [oauthInit, setOauthInit] = useState({ status: 'idle', error: null })
  const setAppMeta = useSetAppMeta()

  const { status, data, error } = useResource(
    useMemo(() => `app-meta:${reloadNonce}`, [reloadNonce]),
    async () => getAppMetadata(),
  )

  if (status === 'idle' || status === 'loading') {
    return (
      <Box
        sx={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          p: 3,
        }}
      >
        <Stack spacing={2} alignItems="center">
          <Toolbar />
          <CircularProgress />
          <Typography variant="body2" color="text.secondary">
            Checking backend status…
          </Typography>
        </Stack>
      </Box>
    )
  }

  if (status === 'error') {
    setAppMeta?.(null)
    const errorText = typeof error === 'string' ? error : apiErrorMessage(error)
    return (
      <FullPageMessage
        title="Backend not reachable"
        actions={
          <>
            <Button variant="contained" onClick={() => setReloadNonce((n) => n + 1)}>
              Retry
            </Button>
            <Button
              variant="outlined"
              component={Link}
              href={`${apiBasePath}/docs`}
              target="_blank"
              rel="noopener noreferrer"
            >
              Open API docs
            </Button>
          </>
        }
      >
        {errorText}
      </FullPageMessage>
    )
  }

  const meta = data

  if (!meta?.is_healthy) {
    setAppMeta?.(meta ?? null)
    return (
      <FullPageMessage
        title="Backend is unhealthy"
        actions={
          <>
            <Button variant="contained" onClick={() => setReloadNonce((n) => n + 1)}>
              Retry
            </Button>
            {meta?.docs_url ? (
              <Button
                variant="outlined"
                component={Link}
                href={meta.docs_url}
                target="_blank"
                rel="noopener noreferrer"
              >
                Open API docs
              </Button>
            ) : null}
          </>
        }
      >
        The backend reports it is not healthy. Check server logs and fix the underlying
        issue, then retry.
      </FullPageMessage>
    )
  }

  if (!meta?.is_initialized) {
    setAppMeta?.(meta ?? null)
    return (
      <FullPageMessage
        title="Gmail OAuth needs initialization"
        actions={
          <>
            <Button
              variant="contained"
              disabled={oauthInit.status === 'loading'}
              onClick={async () => {
                try {
                  setOauthInit({ status: 'loading', error: null })
                  const res =
                    await adminApi.startGmailOauthTokenFlowApiV1AdminMailGmailTokenStartPost(
                      oauthRedirectUri(),
                    )
                  const authUrl = res?.data?.auth_url
                  if (typeof authUrl === 'string' && authUrl.trim()) {
                    window.location.assign(authUrl)
                    return
                  }
                  setOauthInit({
                    status: 'error',
                    error: 'Backend did not return auth_url',
                  })
                } catch (e) {
                  setOauthInit({
                    status: 'error',
                    error: apiErrorMessage(e),
                  })
                }
              }}
            >
              Initialize OAuth
            </Button>
            <Button variant="outlined" onClick={() => setReloadNonce((n) => n + 1)}>
              I already did this
            </Button>
          </>
        }
      >
        To fetch and parse emails, the backend needs a Gmail token. Click Initialize OAuth
        to start the authorization flow.
        {oauthInit.status === 'error' && oauthInit.error ? (
          <>
            <br />
            <br />
            <strong>Error:</strong> {oauthInit.error}
          </>
        ) : null}
      </FullPageMessage>
    )
  }

  // App is ready.
  setAppMeta?.(meta ?? null)
  return <Outlet />
}

