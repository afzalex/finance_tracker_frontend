import { Outlet } from 'react-router-dom'
import { AppBar, Box, IconButton, Toolbar, Typography, useMediaQuery, useTheme } from '@mui/material'
import { alpha } from '@mui/material/styles'
import { Menu } from 'lucide-react'
import { MobileNavProvider } from '../contexts/MobileNavProvider'
import { useMobileNavDrawer } from '../contexts/useMobileNavDrawer'
import useAppMeta from '../contexts/useAppMeta'

const footerContentH = 44

function RootLayoutInner() {
  const meta = useAppMeta()
  const theme = useTheme()
  const isSmDown = useMediaQuery(theme.breakpoints.down('md'))
  const { setMobileOpen } = useMobileNavDrawer()
  const footerReserve = `calc(${footerContentH}px + env(safe-area-inset-bottom, 0px))`

  return (
    <Box sx={{ minHeight: '100svh', display: 'flex', flexDirection: 'column' }}>
      <AppBar position="fixed" sx={{ zIndex: (t) => t.zIndex.drawer + 1 }}>
        <Toolbar
          sx={{
            gap: 1,
            flexWrap: 'wrap',
            alignItems: 'center',
            py: { xs: 1, sm: 0.5 },
          }}
        >
          {isSmDown ? (
            <IconButton
              aria-label="Open navigation"
              edge="start"
              color="inherit"
              onClick={() => setMobileOpen(true)}
              sx={{ mr: 0.5, flexShrink: 0 }}
            >
              <Menu size={22} />
            </IconButton>
          ) : null}
          <Typography variant="h6" component="div" sx={{ flexGrow: 1, minWidth: 0 }}>
            Finance Tracker
          </Typography>
        </Toolbar>
      </AppBar>

      <Box
        sx={{
          flex: 1,
          display: 'flex',
          minHeight: 0,
          minWidth: 0,
          maxWidth: '100%',
          pb: footerReserve,
        }}
      >
        <Outlet />
      </Box>

      <Box
        component="footer"
        sx={(t) => ({
          position: 'fixed',
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: t.zIndex.drawer + 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'stretch',
          width: '100%',
          maxWidth: '100%',
          paddingBottom: 'env(safe-area-inset-bottom, 0px)',
          backdropFilter: 'blur(10px)',
          backgroundColor: alpha(t.palette.background.default, 0.7),
          borderTop: `1px solid ${t.palette.divider}`,
          color: 'text.secondary',
          typography: 'body2',
        })}
      >
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            minHeight: footerContentH,
            px: 2,
            gap: 1,
            width: '100%',
            boxSizing: 'border-box',
          }}
        >
          <Typography variant="body2" color="inherit" component="span" sx={{ flexShrink: 0 }}>
            Finance Tracker
          </Typography>
          {meta?.mail_user_email ? (
            <Typography
              variant="body2"
              color="inherit"
              sx={{
                ml: 'auto',
                textAlign: 'right',
                opacity: 0.85,
                minWidth: 0,
                pl: 1,
                wordBreak: 'break-word',
              }}
            >
              Connected: {meta.mail_user_email}
            </Typography>
          ) : null}
        </Box>
      </Box>
    </Box>
  )
}

export default function RootLayout() {
  return (
    <MobileNavProvider>
      <RootLayoutInner />
    </MobileNavProvider>
  )
}

