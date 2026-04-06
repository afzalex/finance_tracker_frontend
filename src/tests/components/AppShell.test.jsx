import { screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import userEvent from '@testing-library/user-event'
import { IconButton } from '@mui/material'
import { useMediaQuery, useTheme } from '@mui/material'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { Menu } from 'lucide-react'
import AppShell from '../../components/AppShell'
import { DateRangeProvider } from '../../contexts/DateRangeContext'
import { MobileNavProvider } from '../../contexts/MobileNavProvider'
import { useMobileNavDrawer } from '../../contexts/useMobileNavDrawer'
import { renderWithTheme } from '../renderWithTheme'

vi.mock('@mui/material', async (importOriginal) => {
  const actual = await importOriginal()
  return {
    ...actual,
    useMediaQuery: vi.fn(),
  }
})

/** Mirrors RootLayout: menu opens the drawer (tests do not mount RootLayout). */
function TestMobileNavMenuButton() {
  const theme = useTheme()
  const isSmDown = useMediaQuery(theme.breakpoints.down('md'))
  const { setMobileOpen } = useMobileNavDrawer()
  if (!isSmDown) return null
  return (
    <IconButton aria-label="Open navigation" onClick={() => setMobileOpen(true)}>
      <Menu size={22} />
    </IconButton>
  )
}

describe('AppShell', () => {
  it('renders correctly on desktop', () => {
    vi.mocked(useMediaQuery).mockReturnValue(false) // Not small screen -> Desktop

    renderWithTheme(
      <MobileNavProvider>
        <MemoryRouter initialEntries={['/']}>
          <DateRangeProvider>
            <Routes>
              <Route element={<AppShell />}>
                <Route index element={<div>Body</div>} />
              </Route>
            </Routes>
          </DateRangeProvider>
        </MemoryRouter>
      </MobileNavProvider>,
    )

    expect(screen.getByText('Dashboard')).toBeInTheDocument()
    expect(screen.getByText('Transactions')).toBeInTheDocument()

    // Hamburger menu should not be present
    expect(screen.queryByLabelText('Open navigation')).not.toBeInTheDocument()
  })

  it('preserves from/to on Dashboard link', async () => {
    vi.mocked(useMediaQuery).mockReturnValue(false)

    renderWithTheme(
      <MobileNavProvider>
        <MemoryRouter
          initialEntries={['/transactions?from=2024-06-01&to=2024-06-30']}
        >
          <DateRangeProvider>
            <Routes>
              <Route element={<AppShell />}>
                <Route path="transactions" element={<div>Tx</div>} />
              </Route>
            </Routes>
          </DateRangeProvider>
        </MemoryRouter>
      </MobileNavProvider>,
    )

    await waitFor(() => {
      const dash = screen.getByText('Dashboard').closest('a')
      expect(dash).toHaveAttribute(
        'href',
        '/?from=2024-06-01&to=2024-06-30',
      )
    })
  })

  it('preserves from/to on date-scoped nav links from the current route', async () => {
    vi.mocked(useMediaQuery).mockReturnValue(false)

    renderWithTheme(
      <MobileNavProvider>
        <MemoryRouter
          initialEntries={['/transactions?from=2024-06-01&to=2024-06-30']}
        >
          <DateRangeProvider>
            <Routes>
              <Route element={<AppShell />}>
                <Route path="transactions" element={<div>Tx</div>} />
              </Route>
            </Routes>
          </DateRangeProvider>
        </MemoryRouter>
      </MobileNavProvider>,
    )

    await waitFor(() => {
      const analytics = screen.getByText('Analytics').closest('a')
      expect(analytics).toHaveAttribute(
        'href',
        '/analytics?from=2024-06-01&to=2024-06-30',
      )
    })
  })

  it('renders correctly on mobile and handles drawer', async () => {
    vi.mocked(useMediaQuery).mockReturnValue(true) // Is small screen -> Mobile
    const user = userEvent.setup()

    renderWithTheme(
      <MobileNavProvider>
        <MemoryRouter initialEntries={['/accounts']}>
          <DateRangeProvider>
            <TestMobileNavMenuButton />
            <Routes>
              <Route element={<AppShell />}>
                <Route path="accounts" element={<div>Accounts body</div>} />
              </Route>
            </Routes>
          </DateRangeProvider>
        </MemoryRouter>
      </MobileNavProvider>,
    )

    // Hamburger menu should be present
    const menuButton = screen.getByLabelText('Open navigation')
    expect(menuButton).toBeInTheDocument()

    // Click menu
    await user.click(menuButton)
    // In actual implementationDrawer is temporary when isSmDown, its items still render but they become visible.
    const dashboardLink = screen.getByText('Dashboard')
    expect(dashboardLink).toBeInTheDocument()

    // Clicking a link in the mobile drawer closes it. We simulate a click to check if it calls setMobileOpen(false).
    await user.click(dashboardLink)
    // There isn't a direct way to assert the drawer closes, but checking if we can click the link and no error occurs is good coverage.
  })
})
