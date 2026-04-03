import { screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { AppMetaProvider } from '../../contexts/AppMetaContext'
import Settings from '../../pages/Settings'
import { renderWithTheme } from '../renderWithTheme'
import { MemoryRouter } from 'react-router-dom'

vi.mock('../../services/financeApi', () => ({
  reprocessAllEmailsOffline: vi.fn(),
}))

const sampleMeta = {
  app_version: '0.0.0-test',
  docs_url: 'http://localhost:8000/docs',
  is_healthy: true,
  is_initialized: true,
  is_mail_connectivity_working: true,
  openapi_url: 'http://localhost:8000/openapi.json',
  redoc_url: 'http://localhost:8000/redoc',
}

describe('Settings', () => {
  it('renders settings page elements', () => {
    renderWithTheme(
      <AppMetaProvider initialMeta={sampleMeta}>
        <MemoryRouter>
          <Settings />
        </MemoryRouter>
      </AppMetaProvider>,
    )

    expect(screen.getByText('Settings')).toBeInTheDocument()
    expect(
      screen.getByText('Reprocess cached emails, manage rules, and view backend status.'),
    ).toBeInTheDocument()
    expect(screen.getByText('API')).toBeInTheDocument()
    expect(screen.getByText('0.0.0-test')).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: /Reprocess All Emails/i }),
    ).toBeInTheDocument()
  })
})
