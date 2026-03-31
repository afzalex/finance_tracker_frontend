import { alpha, createTheme } from '@mui/material/styles'

// Central theme so we can easily extend palette/typography later.
export default createTheme({
  palette: {
    mode: 'light',
    primary: { main: '#0B1B3A' },
    text: {
      primary: '#0B1220',
      secondary: '#556176',
    },
    background: {
      default: '#EEF3F8',
      paper: '#F7FAFD',
    },
    divider: alpha('#0B1B3A', 0.08),
  },
  shape: {
    borderRadius: 16,
  },
  typography: {
    fontFamily: [
      '"Space Grotesk"',
      'system-ui',
      '-apple-system',
      '"Segoe UI"',
      'Roboto',
      '"Helvetica Neue"',
      'Arial',
      'sans-serif',
    ].join(','),
    h4: {
      fontWeight: 700,
      letterSpacing: -0.5,
    },
    h6: {
      fontWeight: 600,
      letterSpacing: -0.2,
    },
  },
  shadows: [
    'none',
    '0px 1px 1px rgba(10, 25, 60, 0.06), 0px 6px 18px rgba(10, 25, 60, 0.06)',
    '0px 2px 2px rgba(10, 25, 60, 0.06), 0px 10px 30px rgba(10, 25, 60, 0.08)',
    ...Array.from({ length: 22 }, () => 'none'),
  ],
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          backgroundImage:
            'radial-gradient(1000px 500px at 10% 0%, rgba(15, 70, 120, 0.08), transparent 55%), radial-gradient(900px 450px at 90% 10%, rgba(120, 150, 190, 0.10), transparent 60%)',
          backgroundAttachment: 'fixed',
        },
      },
    },
    MuiAppBar: {
      defaultProps: {
        elevation: 0,
        color: 'transparent',
      },
      styleOverrides: {
        root: ({ theme }) => ({
          backdropFilter: 'blur(10px)',
          backgroundColor: alpha(theme.palette.background.default, 0.7),
          borderBottom: `1px solid ${theme.palette.divider}`,
        }),
      },
    },
    MuiDrawer: {
      styleOverrides: {
        paper: ({ theme }) => ({
          backgroundColor: alpha('#FFFFFF', 0.55),
          backdropFilter: 'blur(14px)',
          borderRight: `1px solid ${theme.palette.divider}`,
        }),
      },
    },
    MuiCard: {
      defaultProps: {
        elevation: 0,
      },
      styleOverrides: {
        root: ({ theme }) => ({
          border: `1px solid ${theme.palette.divider}`,
          backgroundColor: alpha(theme.palette.background.paper, 0.75),
          backdropFilter: 'blur(10px)',
        }),
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: ({ theme }) => ({
          borderColor: theme.palette.divider,
        }),
      },
    },
    MuiListItemButton: {
      styleOverrides: {
        root: ({ theme }) => ({
          borderRadius: 14,
          margin: theme.spacing(0.5, 1),
          '&.Mui-selected': {
            backgroundColor: alpha(theme.palette.primary.main, 0.10),
          },
          '&.Mui-selected:hover': {
            backgroundColor: alpha(theme.palette.primary.main, 0.14),
          },
        }),
      },
    },
    MuiListItemIcon: {
      styleOverrides: {
        root: ({ theme }) => ({
          minWidth: 38,
          color: theme.palette.text.secondary,
          '.Mui-selected &': {
            color: theme.palette.primary.main,
          },
        }),
      },
    },
    MuiButton: {
      defaultProps: {
        size: 'small',
      },
      styleOverrides: {
        root: {
          minWidth: 100,
          textTransform: 'none',
        },
        sizeSmall: {
          minHeight: 30,
          paddingTop: 4,
          paddingBottom: 4,
          paddingLeft: 12,
          paddingRight: 12,
        },
      },
    },
    MuiIconButton: {
      defaultProps: {
        size: 'small',
      },
    },
    MuiDialogActions: {
      styleOverrides: {
        root: {
          paddingTop: 8,
          paddingBottom: 8,
          paddingLeft: 16,
          paddingRight: 16,
        },
      },
    },
    MuiTextField: {
      defaultProps: {
        variant: 'outlined',
        size: 'small',
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          // Keep cards/papers rounded, but make form fields tighter.
          borderRadius: 8,
        },
      },
    },
  },
})

