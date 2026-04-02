import { useMemo, useState } from 'react'
import { Link, Outlet, useLocation } from 'react-router-dom'
import {
  Box,
  Drawer,
  IconButton,
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
    <Box sx={{ display: 'flex', flex: 1, minHeight: 0 }}>
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

      <Box component="main" sx={{ flexGrow: 1, p: 3 }}>
        <Toolbar />
        {isSmDown && (
          <IconButton
            aria-label="Open navigation"
            edge="start"
            onClick={() => setMobileOpen(true)}
            sx={{ mb: 2 }}
          >
            <Menu size={22} />
          </IconButton>
        )}
        <Outlet />
      </Box>
    </Box>
  )
}

