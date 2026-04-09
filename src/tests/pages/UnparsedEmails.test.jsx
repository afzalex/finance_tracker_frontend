import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import UnparsedEmails from '../../pages/UnparsedEmails'
import { DateRangeProvider } from '../../contexts/DateRangeContext'
import { renderWithTheme } from '../renderWithTheme'

vi.mock('../../services/financeApi', async (importOriginal) => {
  const actual = await importOriginal()
  return {
    ...actual,
    listUnparsedEmails: vi.fn(),
    getUnparsedEmailDetail: vi.fn(),
    reprocessEmailByMailId: vi.fn(),
  }
})

import {
  getUnparsedEmailDetail,
  listUnparsedEmails,
  reprocessEmailByMailId,
} from '../../services/financeApi'

describe('UnparsedEmails', () => {
  beforeEach(() => {
    vi.mocked(listUnparsedEmails).mockReset()
    vi.mocked(getUnparsedEmailDetail).mockReset()
    vi.mocked(reprocessEmailByMailId).mockReset()
  })

  it('lists unparsed rows and opens details on click', async () => {
    vi.mocked(listUnparsedEmails).mockResolvedValue([
      {
        id: 1,
        mail_id: 'm1',
        subject: 'S1',
        mail_received_at: '2024-06-01T12:00:00Z',
        classification_name: 'Card alerts',
        parser_name: null,
        parser_id: 7,
        reason: 'Parse error',
        fetched_email_id: 10,
        created_at: '2024-06-01T12:00:00Z',
      },
    ])
    vi.mocked(getUnparsedEmailDetail).mockResolvedValue({
      id: 1,
      created_at: '2024-06-01T12:00:00Z',
      reason: null,
      email: {
        id: 10,
        mail_id: 'm1',
        subject: 'S1',
        sender: 'sender@example.com',
        snippet: 'N1',
        internal_date_ms: null,
        created_at: '2024-06-01T12:00:00Z',
        body_text: 'Body content',
        thread_id: null,
      },
      enrichment: null,
    })

    const user = userEvent.setup()
    renderWithTheme(
      <MemoryRouter initialEntries={['/emails/unparsed']}>
        <DateRangeProvider>
        <Routes>
          <Route path="/emails/unparsed" element={<UnparsedEmails />} />
          <Route path="/emails/unparsed/:mailId" element={<UnparsedEmails />} />
        </Routes>
        </DateRangeProvider>
      </MemoryRouter>,
    )

    expect(await screen.findByText('m1')).toBeInTheDocument()
    expect(screen.getByText('Card alerts')).toBeInTheDocument()
    expect(screen.getByText('#7')).toBeInTheDocument()
    expect(screen.getByText('Parse error')).toBeInTheDocument()

    await user.click(
      screen.getByRole('button', { name: /View unparsed queue item 1/i }),
    )

    await waitFor(() => {
      expect(vi.mocked(getUnparsedEmailDetail)).toHaveBeenCalledWith(1)
    })

    expect(await screen.findByText('sender@example.com')).toBeInTheDocument()
    expect(screen.getByText('Body content')).toBeInTheDocument()
    expect(screen.getByText('No enrichment row for this email.')).toBeInTheDocument()
  })

  it('includes returnTo in rules links and can reprocess', async () => {
    vi.mocked(listUnparsedEmails).mockResolvedValue([
      {
        id: 2,
        mail_id: 'm2',
        subject: 'S2',
        mail_received_at: null,
        classification_name: 'transaction',
        parser_name: 'default',
        reason: 'No match',
        fetched_email_id: 20,
        created_at: '2024-06-01T12:00:00Z',
      },
    ])
    vi.mocked(getUnparsedEmailDetail).mockResolvedValue({
      id: 2,
      created_at: '2024-06-01T12:00:00Z',
      reason: null,
      email: {
        id: 20,
        mail_id: 'm2',
        subject: 'S2',
        sender: null,
        snippet: 'N2',
        internal_date_ms: null,
        created_at: '2024-06-01T12:00:00Z',
        body_text: 'B',
        thread_id: null,
      },
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
        <DateRangeProvider>
        <Routes>
          <Route path="/emails/unparsed" element={<UnparsedEmails />} />
          <Route path="/emails/unparsed/:mailId" element={<UnparsedEmails />} />
        </Routes>
        </DateRangeProvider>
      </MemoryRouter>,
    )

    expect(await screen.findByText('m2')).toBeInTheDocument()
    expect(screen.getAllByText('transaction').length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText('default').length).toBeGreaterThanOrEqual(1)
    await user.click(
      screen.getByRole('button', { name: /View unparsed queue item 2/i }),
    )

    await waitFor(() => {
      expect(vi.mocked(getUnparsedEmailDetail)).toHaveBeenCalledWith(2)
    })

    const expectedReturn = encodeURIComponent('/emails/unparsed/2')
    expect(screen.getByRole('link', { name: 'transaction' })).toHaveAttribute(
      'href',
      `/settings/classifications/12?returnTo=${expectedReturn}`,
    )
    expect(screen.getByRole('link', { name: 'default' })).toHaveAttribute(
      'href',
      `/settings/parsers/34?returnTo=${expectedReturn}`,
    )

    await user.click(screen.getByRole('button', { name: /^Reprocess$/ }))
    const confirmHeading = await screen.findByRole('heading', {
      name: /Reprocess this email\?/i,
    })
    expect(confirmHeading).toBeInTheDocument()
    const confirmDialog = confirmHeading.closest('[role="dialog"]')
    await user.click(
      within(confirmDialog).getByRole('button', { name: /^Reprocess$/i }),
    )

    await waitFor(() => {
      expect(vi.mocked(reprocessEmailByMailId)).toHaveBeenCalledWith('m2')
    })
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('filters rows by classification and parser', async () => {
    vi.mocked(listUnparsedEmails).mockResolvedValue([
      {
        id: 10,
        mail_id: 'a',
        subject: 'Sub A',
        mail_received_at: null,
        classification_name: 'Alpha',
        parser_name: 'P1',
        reason: 'r1',
        fetched_email_id: 1,
        created_at: '2024-06-01T12:00:00Z',
      },
      {
        id: 11,
        mail_id: 'b',
        subject: 'Sub B',
        mail_received_at: null,
        classification_name: 'Beta',
        parser_name: 'P2',
        reason: 'r2',
        fetched_email_id: 2,
        created_at: '2024-06-01T12:00:00Z',
      },
    ])

    const user = userEvent.setup()
    renderWithTheme(
      <MemoryRouter initialEntries={['/emails/unparsed']}>
        <DateRangeProvider>
        <Routes>
          <Route path="/emails/unparsed" element={<UnparsedEmails />} />
        </Routes>
        </DateRangeProvider>
      </MemoryRouter>,
    )

    expect(await screen.findByText('Sub A')).toBeInTheDocument()
    expect(screen.getByText('Sub B')).toBeInTheDocument()

    await user.click(screen.getByLabelText(/Classification/i))
    await user.click(await screen.findByRole('option', { name: 'Beta' }))

    expect(screen.queryByText('Sub A')).not.toBeInTheDocument()
    expect(screen.getByText('Sub B')).toBeInTheDocument()

    const parserFilter = screen.getByTestId('unparsed-filter-parser')
    await user.click(within(parserFilter).getByRole('combobox'))
    await user.click(await screen.findByRole('option', { name: 'P2' }))

    expect(screen.getByText('Sub B')).toBeInTheDocument()

    await user.click(within(parserFilter).getByRole('combobox'))
    await user.click(await screen.findByRole('option', { name: 'P1' }))

    expect(
      await screen.findByText(/No rows match the current filters/i),
    ).toBeInTheDocument()
  })

  it('filters rows by subject search', async () => {
    vi.mocked(listUnparsedEmails).mockResolvedValue([
      {
        id: 20,
        mail_id: 'x',
        subject: 'Alpha invoice',
        mail_received_at: null,
        classification_name: 'C',
        parser_name: 'P',
        reason: 'r',
        fetched_email_id: 1,
        created_at: '2024-06-01T12:00:00Z',
      },
      {
        id: 21,
        mail_id: 'y',
        subject: 'Beta receipt',
        mail_received_at: null,
        classification_name: 'C',
        parser_name: 'P',
        reason: 'r',
        fetched_email_id: 2,
        created_at: '2024-06-01T12:00:00Z',
      },
    ])

    const user = userEvent.setup()
    renderWithTheme(
      <MemoryRouter initialEntries={['/emails/unparsed']}>
        <DateRangeProvider>
        <Routes>
          <Route path="/emails/unparsed" element={<UnparsedEmails />} />
        </Routes>
        </DateRangeProvider>
      </MemoryRouter>,
    )

    expect(await screen.findByText('Alpha invoice')).toBeInTheDocument()
    expect(screen.getByText('Beta receipt')).toBeInTheDocument()

    await user.type(screen.getByLabelText(/Search subject/i), 'beta')

    expect(screen.queryByText('Alpha invoice')).not.toBeInTheDocument()
    expect(screen.getByText('Beta receipt')).toBeInTheDocument()
  })

  it('restores subject filter from the URL on load', async () => {
    vi.mocked(listUnparsedEmails).mockResolvedValue([
      {
        id: 20,
        mail_id: 'x',
        subject: 'Alpha invoice',
        mail_received_at: null,
        classification_name: 'C',
        parser_name: 'P',
        reason: 'r',
        fetched_email_id: 1,
        created_at: '2024-06-01T12:00:00Z',
      },
      {
        id: 21,
        mail_id: 'y',
        subject: 'Beta receipt',
        mail_received_at: null,
        classification_name: 'C',
        parser_name: 'P',
        reason: 'r',
        fetched_email_id: 2,
        created_at: '2024-06-01T12:00:00Z',
      },
    ])

    renderWithTheme(
      <MemoryRouter initialEntries={['/emails/unparsed?q=beta']}>
        <DateRangeProvider>
        <Routes>
          <Route path="/emails/unparsed" element={<UnparsedEmails />} />
        </Routes>
        </DateRangeProvider>
      </MemoryRouter>,
    )

    expect(await screen.findByText('Beta receipt')).toBeInTheDocument()
    expect(screen.queryByText('Alpha invoice')).not.toBeInTheDocument()
    expect(screen.getByLabelText(/Search subject/i)).toHaveValue('beta')
  })

  it('Parser filter "(Has Parser)" shows only rows with a parser', async () => {
    vi.mocked(listUnparsedEmails).mockResolvedValue([
      {
        id: 30,
        mail_id: 'no-p',
        subject: 'No parser row',
        mail_received_at: null,
        classification_name: 'C',
        parser_name: null,
        parser_id: null,
        reason: 'r',
        fetched_email_id: 1,
        created_at: '2024-06-01T12:00:00Z',
      },
      {
        id: 31,
        mail_id: 'has-p',
        subject: 'Has parser row',
        mail_received_at: null,
        classification_name: 'C',
        parser_name: 'P1',
        reason: 'r',
        fetched_email_id: 2,
        created_at: '2024-06-01T12:00:00Z',
      },
    ])

    const user = userEvent.setup()
    renderWithTheme(
      <MemoryRouter initialEntries={['/emails/unparsed']}>
        <DateRangeProvider>
        <Routes>
          <Route path="/emails/unparsed" element={<UnparsedEmails />} />
        </Routes>
        </DateRangeProvider>
      </MemoryRouter>,
    )

    expect(await screen.findByText('No parser row')).toBeInTheDocument()
    expect(screen.getByText('Has parser row')).toBeInTheDocument()

    await user.click(document.getElementById('unparsed-filter-parser'))
    await user.click(
      await screen.findByRole('option', { name: /^\(Has Parser\)$/i }),
    )

    expect(screen.queryByText('No parser row')).not.toBeInTheDocument()
    expect(screen.getByText('Has parser row')).toBeInTheDocument()
  })
})
