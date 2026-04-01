import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import UnparsedEmails from '../../pages/UnparsedEmails'
import { renderWithTheme } from '../renderWithTheme'

vi.mock('../../services/financeApi', async (importOriginal) => {
  const actual = await importOriginal()
  return {
    ...actual,
    listUnparsedEmails: vi.fn(),
    getFetchedEmailByMailId: vi.fn(),
    reprocessEmailByMailId: vi.fn(),
  }
})

import {
  getFetchedEmailByMailId,
  listUnparsedEmails,
  reprocessEmailByMailId,
} from '../../services/financeApi'

describe('UnparsedEmails', () => {
  beforeEach(() => {
    vi.mocked(listUnparsedEmails).mockReset()
    vi.mocked(getFetchedEmailByMailId).mockReset()
    vi.mocked(reprocessEmailByMailId).mockReset()
  })

  it('lists unparsed rows and opens details on click', async () => {
    vi.mocked(listUnparsedEmails).mockResolvedValue([
      { mail_id: 'm1', subject: 'S1', snippet: 'N1', reason: 'Parse error' },
    ])
    vi.mocked(getFetchedEmailByMailId).mockResolvedValue({
      mail_id: 'm1',
      subject: 'S1',
      sender: 'sender@example.com',
      snippet: 'N1',
      internal_date_ms: null,
      created_at: '2024-06-01T12:00:00Z',
      body_text: 'Body content',
      enrichment: null,
    })

    const user = userEvent.setup()
    renderWithTheme(
      <MemoryRouter initialEntries={['/emails/unparsed']}>
        <Routes>
          <Route path="/emails/unparsed" element={<UnparsedEmails />} />
          <Route path="/emails/unparsed/:mailId" element={<UnparsedEmails />} />
        </Routes>
      </MemoryRouter>,
    )

    expect(await screen.findByText('m1')).toBeInTheDocument()
    expect(screen.getByText('Parse error')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /View unparsed email m1/i }))

    await waitFor(() => {
      expect(vi.mocked(getFetchedEmailByMailId)).toHaveBeenCalledWith('m1')
    })

    expect(await screen.findByText('sender@example.com')).toBeInTheDocument()
    expect(screen.getByText('Body content')).toBeInTheDocument()
    expect(screen.getByText('No enrichment row for this email.')).toBeInTheDocument()
  })

  it('includes returnTo in rules links and can reprocess', async () => {
    vi.mocked(listUnparsedEmails).mockResolvedValue([
      { mail_id: 'm2', subject: 'S2', snippet: 'N2', reason: 'No match' },
    ])
    vi.mocked(getFetchedEmailByMailId).mockResolvedValue({
      mail_id: 'm2',
      subject: 'S2',
      sender: null,
      snippet: 'N2',
      internal_date_ms: null,
      created_at: '2024-06-01T12:00:00Z',
      body_text: 'B',
      enrichment: {
        classification_name: 'transaction',
        classification: null,
        classification_id: 12,
        parser_name: 'default',
        parser_id: 34,
        updated_at: '2024-06-02T00:00:00Z',
      },
    })
    vi.mocked(reprocessEmailByMailId).mockResolvedValue({})

    const user = userEvent.setup()
    renderWithTheme(
      <MemoryRouter initialEntries={['/emails/unparsed']}>
        <Routes>
          <Route path="/emails/unparsed" element={<UnparsedEmails />} />
          <Route path="/emails/unparsed/:mailId" element={<UnparsedEmails />} />
        </Routes>
      </MemoryRouter>,
    )

    expect(await screen.findByText('m2')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /View unparsed email m2/i }))

    await waitFor(() => {
      expect(vi.mocked(getFetchedEmailByMailId)).toHaveBeenCalledWith('m2')
    })

    const expectedReturn = encodeURIComponent('/emails/unparsed/m2')
    expect(screen.getByRole('link', { name: 'transaction' })).toHaveAttribute(
      'href',
      `/settings/rules/classifications/12?tab=classifications&returnTo=${expectedReturn}`,
    )
    expect(screen.getByRole('link', { name: 'default' })).toHaveAttribute(
      'href',
      `/settings/rules/parsers/34?tab=parsers&returnTo=${expectedReturn}`,
    )

    await user.click(screen.getByRole('button', { name: /Reprocess Email/i }))
    expect(
      await screen.findByRole('heading', { name: /Reprocess this email\?/i }),
    ).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /^Reprocess$/i }))

    await waitFor(() => {
      expect(vi.mocked(reprocessEmailByMailId)).toHaveBeenCalledWith('m2')
    })
  })
})

