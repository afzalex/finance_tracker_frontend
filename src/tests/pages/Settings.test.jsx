import { screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import Settings from '../../pages/Settings'
import { renderWithTheme } from '../renderWithTheme'
import { MemoryRouter } from 'react-router-dom'

vi.mock('../../services/financeApi', () => ({
  reprocessAllEmailsOffline: vi.fn(),
}))

describe('Settings', () => {
  it('renders settings page elements', () => {
    renderWithTheme(
      <MemoryRouter>
        <Settings />
      </MemoryRouter>,
    )
    
    expect(screen.getByText('Settings')).toBeInTheDocument()
    expect(screen.getByText('Placeholder settings page.')).toBeInTheDocument()
    expect(screen.getByText('API')).toBeInTheDocument()
    expect(
      screen.getByText(/Planned: configurable base URL and connectivity check./i)
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: /Reprocess All Emails/i }),
    ).toBeInTheDocument()
  })
})
