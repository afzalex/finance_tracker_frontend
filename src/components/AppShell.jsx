import { useMemo } from 'react'
import { Link, Outlet, useLocation } from 'react-router-dom'
import {
  Box,
  Drawer,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Toolbar,
  useMediaQuery,
  useTheme,
} from '@mui/material'
import {
  BarChart3,
  Landmark,
  LayoutDashboard,
  List as ListIcon,
  Mail,
  Settings,
} from 'lucide-react'
import { useMobileNavDrawer } from '../contexts/useMobileNavDrawer'

const drawerWidth = 240

export default function AppShell() {
  const theme = useTheme()
  const isSmDown = useMediaQuery(theme.breakpoints.down('md'))
  const location = useLocation()
  const { mobileOpen, setMobileOpen } = useMobileNavDrawer()

  const navItems = useMemo(
    () => [
      { label: 'Dashboard', to: '/', icon: <LayoutDashboard size={20} /> },
      { label: 'Transactions', to: '/transactions', icon: <ListIcon size={20} /> },
      { label: 'Unparsed Emails', to: '/emails/unparsed', icon: <Mail size={20} /> },
      {
        label: 'Accounts',
        to: '/accounts',
        icon: <Landmark size={20} />,
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
    <Box sx={{ display: 'flex', flex: 1, minHeight: 0, minWidth: 0, maxWidth: '100%' }}>
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
        </Drawer>
      </Box>

      <Box
        component="main"
        sx={{
          flexGrow: 1,
          minWidth: 0,
          maxWidth: '100%',
          px: { xs: 1.5, sm: 2, md: 3 },
          py: { xs: 1, sm: 2, md: 3 },
        }}
      >
        <Toolbar />
        <Outlet />
      </Box>
    </Box>
  )
}

