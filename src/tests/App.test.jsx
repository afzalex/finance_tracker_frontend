import { render, screen } from '@testing-library/react'
import { ThemeProvider } from '@mui/material'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import App from '../App'
import theme from '../theme'
import * as financeApi from '../services/financeApi'

vi.mock('../services/financeApi', async (importOriginal) => {
  const actual = await importOriginal()
  return {
    ...actual,
    getAppMetadata: vi.fn(),
  }
})

function renderApp(initialEntry = '/') {
  return render(
    <ThemeProvider theme={theme}>
      <MemoryRouter initialEntries={[initialEntry]}>
        <App />
      </MemoryRouter>
    </ThemeProvider>,
  )
}

describe('App', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    financeApi.getAppMetadata.mockResolvedValue({
      app_version: 'test',
      docs_url: 'http://localhost:8000/docs',
      is_healthy: true,
      is_initialized: true,
      is_mail_connectivity_working: true,
      openapi_url: 'http://localhost:8000/openapi.json',
      redoc_url: 'http://localhost:8000/redoc',
    })
  })

  it('renders dashboard route with title', async () => {
    renderApp('/')
    expect(await screen.findByRole('heading', { name: 'Dashboard' })).toBeInTheDocument()
  })

  it('renders accounts route', async () => {
    renderApp('/accounts')
    expect(await screen.findByRole('heading', { name: 'Accounts' })).toBeInTheDocument()
  })
})
