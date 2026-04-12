import { useEffect, useMemo, useState } from 'react'
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
import { layoutSectionSpacing } from '../utils/responsiveTable'

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
      <Stack spacing={layoutSectionSpacing} sx={{ maxWidth: 720, width: '100%' }}>
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
  // For Web OAuth, Google must redirect to a URI that is registered on the OAuth client.
  // We use the backend callback endpoint so the backend can exchange the code and persist tokens.
  // In dev, `apiBasePath` should be `http://localhost:8000` (VITE_API_BASE_URL).
  // In prod, `apiBasePath` is empty and the SPA/API share the same origin.
  const base = (apiBasePath || window.location.origin).replace(/\/+$/, '')
  return `${base}/api/v1/admin/mail/gmail/token/callback`
}

export default function StartupGate() {
  const [reloadNonce, setReloadNonce] = useState(0)
  const [oauthInit, setOauthInit] = useState({ status: 'idle', error: null })
  const setAppMeta = useSetAppMeta()

  const { status, data, error } = useResource(
    useMemo(() => `app-meta:${reloadNonce}`, [reloadNonce]),
    async () => getAppMetadata(),
  )

  useEffect(() => {
    if (!setAppMeta) return
    if (status === 'error') {
      setAppMeta(null)
      return
    }
    if (status === 'success') {
      setAppMeta(data ?? null)
    }
  }, [status, data, setAppMeta])

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
        <Stack spacing={layoutSectionSpacing} alignItems="center">
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

  return <Outlet />
}

