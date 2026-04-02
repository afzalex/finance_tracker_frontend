import { useMemo, useState } from 'react'
import { Link, Outlet, useLocation } from 'react-router-dom'
import {
  AppBar,
  Box,
  Divider,
  Drawer,
  IconButton,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Toolbar,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material'
import {
  BarChart3,
  LayoutDashboard,
  List as ListIcon,
  Mail,
  Menu,
  Settings,
  WalletCards,
} from 'lucide-react'

const drawerWidth = 240

export default function AppShell() {
  const theme = useTheme()
  const isSmDown = useMediaQuery(theme.breakpoints.down('md'))
  const location = useLocation()
  const [mobileOpen, setMobileOpen] = useState(false)

  const navItems = useMemo(
    () => [
      { label: 'Dashboard', to: '/', icon: <LayoutDashboard size={20} /> },
      { label: 'Transactions', to: '/transactions', icon: <ListIcon size={20} /> },
      { label: 'Unparsed Emails', to: '/emails/unparsed', icon: <Mail size={20} /> },
      {
        label: 'Accounts',
        to: '/accounts',
        icon: <WalletCards size={20} />,
      },
      { label: 'Analytics', to: '/analytics', icon: <BarChart3 size={20} /> },
      { label: 'Settings', to: '/settings', icon: <Settings size={20} /> },
    ],
    [],
  )

  const isActive = (to) => {
    const path = location.pathname
    if (to === '/') return path === '/'
    return path === to || path.startsWith(`${to}/`)
  }

  return (
    <Box sx={{ display: 'flex', minHeight: '100svh' }}>
      <AppBar position="fixed" sx={{ zIndex: (t) => t.zIndex.drawer + 1 }}>
        <Toolbar>
          {isSmDown && (
            <IconButton
              color="inherit"
              aria-label="Open navigation"
              edge="start"
              onClick={() => setMobileOpen(true)}
              sx={{ mr: 1 }}
            >
              <Menu size={22} />
            </IconButton>
          )}
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            Finance Tracker
          </Typography>
          <Typography variant="body2" color="inherit" sx={{ opacity: 0.8 }}>
            Made by <a href="https://www.afzalex.com/" rel="noopener noreferrer">Mohammad Afzal</a>
          </Typography>
        </Toolbar>
      </AppBar>

      <Box component="nav" sx={{ width: { md: drawerWidth }, flexShrink: 0 }}>
        <Drawer
          variant={isSmDown ? 'temporary' : 'permanent'}
          open={isSmDown ? mobileOpen : true}
          onClose={() => setMobileOpen(false)}
          ModalProps={{ keepMounted: true }}
          sx={{
            '& .MuiDrawer-paper': {
              width: drawerWidth,
              boxSizing: 'border-box',
              m: 0,
              height: '100%',
              borderRadius: 0,
              // Temporary drawer sits above a dimmed backdrop; frosted/semi-transparent
              // paper lets the backdrop show through and makes the nav look grayed out.
              ...(isSmDown && {
                bgcolor: 'background.paper',
                backgroundImage: 'none',
                backdropFilter: 'none',
              }),
            },
          }}
        >
          <Toolbar />
          <List>
            {navItems.map((item) => (
              <ListItemButton
                key={item.to}
                component={Link}
                to={item.to}
                selected={isActive(item.to)}
                onClick={() => {
                  if (isSmDown) setMobileOpen(false)
                }}
              >
                <ListItemIcon>{item.icon}</ListItemIcon>
                <ListItemText primary={item.label} />
              </ListItemButton>
            ))}
          </List>
          <Divider />
          <Box sx={{ p: 2 }}>
            <Typography variant="caption" color="text.secondary">
              Connect to backend later
            </Typography>
          </Box>
        </Drawer>
      </Box>

      <Box component="main" sx={{ flexGrow: 1, p: 3 }}>
        <Toolbar />
        <Outlet />
      </Box>
    </Box>
  )
}

