import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Box, CircularProgress, Stack, Toolbar, Typography, Button } from '@mui/material'
import { adminApi } from '../services/apiConfig'
import { apiErrorMessage } from '../services/financeApi'
import { layoutSectionSpacing } from '../utils/responsiveTable'

export default function GmailOauthCallback() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [state, setState] = useState({ status: 'loading', error: null })

  const code = useMemo(() => searchParams.get('code'), [searchParams])
  const oauthState = useMemo(() => searchParams.get('state'), [searchParams])

  useEffect(() => {
    const run = async () => {
      const c = String(code ?? '').trim()
      const s = String(oauthState ?? '').trim()

      if (!c || !s) {
        setState({
          status: 'error',
          error: 'Missing `code` or `state` query parameter from OAuth redirect.',
        })
        return
      }

      try {
        await adminApi.finishGmailOauthTokenFlowApiV1AdminMailGmailTokenCallbackGet(
          s,
          c,
        )
        navigate('/', { replace: true })
      } catch (e) {
        setState({ status: 'error', error: apiErrorMessage(e) })
      }
    }

    void run()
  }, [code, oauthState, navigate])

  if (state.status === 'error') {
    return (
      <Box
        sx={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          p: 3,
        }}
      >
        <Toolbar />
        <Stack spacing={layoutSectionSpacing} sx={{ maxWidth: 720, width: '100%' }}>
          <Typography variant="h5" component="h1">
            OAuth initialization failed
          </Typography>
          <Typography variant="body1" color="text.secondary">
            {state.error}
          </Typography>
          <Stack direction="row" spacing={1}>
            <Button variant="contained" onClick={() => navigate('/', { replace: true })}>
              Back to app
            </Button>
          </Stack>
        </Stack>
      </Box>
    )
  }

  return (
    <Box
      sx={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        p: 3,
      }}
    >
      <Toolbar />
      <Stack spacing={layoutSectionSpacing} alignItems="center">
        <CircularProgress />
        <Typography variant="body2" color="text.secondary">
          Finishing OAuth…
        </Typography>
      </Stack>
    </Box>
  )
}

