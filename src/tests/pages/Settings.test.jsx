import { screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { AppMetaProvider } from '../../contexts/AppMetaContext'
import Settings from '../../pages/Settings'
import { renderWithTheme } from '../renderWithTheme'
import { MemoryRouter } from 'react-router-dom'

vi.mock('../../services/financeApi', () => ({
  reprocessAllEmailsOffline: vi.fn(),
  listMailAccounts: vi.fn().mockResolvedValue([{ id: 1, provider: 'gmail', is_active: true }]),
  getAppConfig: vi.fn().mockResolvedValue([
    { key: 'app.mail.poll_seconds', value: '3600' },
    { key: 'app.mail.initial_lookback_days', value: '7' },
    { key: 'app.mail.gmail.labels', value: 'INBOX' },
  ]),
  updateAppConfig: vi.fn(),
}))

vi.mock('../../services/rulesApi', () => ({
  listClassifications: vi.fn().mockResolvedValue([]),
  createClassification: vi.fn(),
  patchClassification: vi.fn(),
  deactivateClassification: vi.fn(),
  listParsers: vi.fn().mockResolvedValue([]),
  createParser: vi.fn(),
  patchParser: vi.fn(),
  deactivateParser: vi.fn(),
  listExclusionRules: vi.fn().mockResolvedValue([]),
  createExclusionRule: vi.fn(),
  patchExclusionRule: vi.fn(),
  deactivateExclusionRule: vi.fn(),
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
        <MemoryRouter initialEntries={['/settings/classifications']}>
          <Settings />
        </MemoryRouter>
      </AppMetaProvider>,
    )

    expect(screen.getByText('Settings')).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Classifications' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Parsers' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Rules' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'System' })).toBeInTheDocument()
  })
})
