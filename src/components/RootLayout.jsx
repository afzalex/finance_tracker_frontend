import { Outlet } from 'react-router-dom'
import { AppBar, Box, Toolbar, Typography } from '@mui/material'
import useAppMeta from '../contexts/useAppMeta'

export default function RootLayout() {
  const meta = useAppMeta()
  const footerH = 44

  return (
    <Box sx={{ minHeight: '100svh', display: 'flex', flexDirection: 'column' }}>
      <AppBar position="fixed" sx={{ zIndex: (t) => t.zIndex.drawer + 1 }}>
        <Toolbar>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            Finance Tracker
          </Typography>
          {meta?.mail_user_email ? (
            <Typography variant="body2" color="inherit" sx={{ opacity: 0.85 }}>
              Connected: {meta.mail_user_email}
            </Typography>
          ) : null}
        </Toolbar>
      </AppBar>

      {/* Content area (header is fixed) */}
      <Box sx={{ flex: 1, display: 'flex', minHeight: 0, pb: `${footerH}px` }}>
        <Outlet />
      </Box>

      <Box
        component="footer"
        sx={{
          position: 'fixed',
          left: 0,
          right: 0,
          bottom: 0,
          height: `${footerH}px`,
          display: 'flex',
          alignItems: 'center',
          borderTop: '1px solid',
          borderColor: 'divider',
          px: 2,
          color: 'text.secondary',
          typography: 'body2',
          bgcolor: 'background.paper',
          zIndex: (t) => t.zIndex.drawer + 1,
        }}
      >
        Finance Tracker
      </Box>
    </Box>
  )
}

