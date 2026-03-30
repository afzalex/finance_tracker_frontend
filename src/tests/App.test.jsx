import { render, screen } from '@testing-library/react'
import { ThemeProvider } from '@mui/material'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import App from '../App'
import theme from '../theme'

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
  it('renders dashboard route with title', async () => {
    renderApp('/')
    expect(await screen.findByRole('heading', { name: 'Dashboard' })).toBeInTheDocument()
  })

  it('renders accounts route', async () => {
    renderApp('/accounts')
    expect(await screen.findByRole('heading', { name: 'Accounts' })).toBeInTheDocument()
  })
})
