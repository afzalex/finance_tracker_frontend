import { Outlet } from 'react-router-dom'
import { AppBar, Box, Toolbar, Typography } from '@mui/material'
import { alpha } from '@mui/material/styles'
import useAppMeta from '../contexts/useAppMeta'

export default function RootLayout() {
  const meta = useAppMeta()
  const footerH = 44

  return (
    <Box sx={{ minHeight: '100svh', display: 'flex', flexDirection: 'column' }}>
      <AppBar position="fixed" sx={{ zIndex: (t) => t.zIndex.drawer + 1 }}>
        <Toolbar sx={{ gap: 2, flexWrap: 'wrap', alignItems: 'center', py: { xs: 1, sm: 0.5 } }}>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1, minWidth: 0 }}>
            Finance Tracker
          </Typography>
        </Toolbar>
      </AppBar>

      {/* Content area (header is fixed) */}
      <Box sx={{ flex: 1, display: 'flex', minHeight: 0, pb: `${footerH}px` }}>
        <Outlet />
      </Box>

      <Box
        component="footer"
        sx={(theme) => ({
          position: 'fixed',
          left: 0,
          right: 0,
          bottom: 0,
          height: `${footerH}px`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 2,
          px: 2,
          color: 'text.secondary',
          typography: 'body2',
          backdropFilter: 'blur(10px)',
          backgroundColor: alpha(theme.palette.background.default, 0.7),
          borderTop: `1px solid ${theme.palette.divider}`,
          zIndex: theme.zIndex.drawer + 1,
        })}
      >
        <Typography variant="body2" color="inherit" component="span">
          Finance Tracker
        </Typography>
        {meta?.mail_user_email ? (
          <Typography variant="body2" color="inherit" sx={{ opacity: 0.85 }}>
            Connected: {meta.mail_user_email}
          </Typography>
        ) : null}
      </Box>
    </Box>
  )
}

