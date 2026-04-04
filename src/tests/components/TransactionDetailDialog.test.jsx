import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import TransactionDetailDialog from '../../components/TransactionDetailDialog'
import { renderWithTheme } from '../renderWithTheme'

vi.mock('../../services/financeApi', async (importOriginal) => {
  const actual = await importOriginal()
  return {
    ...actual,
    getFetchedEmailByMailId: vi.fn(),
    reprocessEmailByMailId: vi.fn(),
  }
})

import { getFetchedEmailByMailId, reprocessEmailByMailId } from '../../services/financeApi'

function renderWithRouter(ui, { initialEntries = ['/'] } = {}) {
  return renderWithTheme(
    <MemoryRouter initialEntries={initialEntries}>{ui}</MemoryRouter>,
  )
}

function makeRow(overrides = {}) {
  const raw = {
    id: 99,
    transacted_at: '2024-06-01T12:00:00Z',
    created_at: '2024-06-01T12:00:01Z',
    amount_parsed: 10,
    direction: 'DEBIT',
    amount: '10.00',
    currency: 'USD',
    provider: 'Prov',
    transaction_type: 'card',
    sub_type: null,
    status: 'posted',
    txn_id: 'txn-1',
    mail_id: 'gmail-msg-abc',
    merchant: 'Shop',
    category: 'general',
    account_id: 'acc1',
    account_type: 'checking',
    ...overrides.raw,
  }
  return {
    id: String(raw.id),
    account: 'acc1 · checking',
    currency: 'USD',
    raw,
    ...overrides,
  }
}

describe('TransactionDetailDialog', () => {
  beforeEach(() => {
    vi.mocked(getFetchedEmailByMailId).mockReset()
    vi.mocked(getFetchedEmailByMailId).mockResolvedValue({
      mail_id: 'gmail-msg-abc',
      subject: 'Your receipt',
      sender: 'noreply@shop.com',
      snippet: 'Thanks',
      internal_date_ms: 1_718_236_800_000,
      created_at: '2024-06-01T12:00:00Z',
      body_text: 'Line one\nLine two',
      enrichment: null,
    })
  })

  it('shows empty state when no transaction', () => {
    renderWithRouter(
      <TransactionDetailDialog open onClose={vi.fn()} row={null} />,
    )
    expect(screen.getByText('No transaction selected.')).toBeInTheDocument()
  })

  it('renders transaction fields and tab labels', () => {
    renderWithRouter(
      <TransactionDetailDialog open onClose={vi.fn()} row={makeRow()} />,
    )

    const dialog = screen.getByRole('dialog')
    expect(within(dialog).getByText('Transaction Details')).toBeInTheDocument()
    expect(within(dialog).getByText('Shop')).toBeInTheDocument()
    expect(within(dialog).getByText('99')).toBeInTheDocument()
    expect(
      within(dialog).getByRole('button', { name: 'Transaction' }),
    ).toBeInTheDocument()
    expect(
      within(dialog).getByRole('button', { name: 'Source Email' }),
    ).toBeInTheDocument()
  })

  it('disables Source Email when mail_id is missing', () => {
    const row = makeRow()
    row.raw = { ...row.raw, mail_id: null }
    renderWithRouter(
      <TransactionDetailDialog open onClose={vi.fn()} row={row} />,
    )
    expect(
      screen.getByRole('button', { name: 'Source Email' }),
    ).toBeDisabled()
  })

  it('loads email tab and shows subject and body after fetch', async () => {
    const user = userEvent.setup()
    renderWithRouter(
      <TransactionDetailDialog open onClose={vi.fn()} row={makeRow()} />,
    )

    await user.click(screen.getByRole('button', { name: 'Source Email' }))

    expect(getFetchedEmailByMailId).toHaveBeenCalledWith('gmail-msg-abc')

    await waitFor(() => {
      expect(screen.getByText('Your receipt')).toBeInTheDocument()
    })

    expect(
      screen.getByRole('heading', { level: 2, name: 'Source Email' }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: /Reprocess Email/i }),
    ).toBeInTheDocument()
    expect(screen.getByText(/Line one/)).toBeInTheDocument()
    expect(screen.getByText(/Line two/)).toBeInTheDocument()
    expect(
      screen.getByText('No enrichment row for this email.'),
    ).toBeInTheDocument()
  })

  it('calls reprocess for the current mail_id', async () => {
    const user = userEvent.setup()
    vi.mocked(reprocessEmailByMailId).mockResolvedValue({})
    const onClose = vi.fn()
    const onNotify = vi.fn()

    renderWithRouter(
      <TransactionDetailDialog
        open
        onClose={onClose}
        onNotify={onNotify}
        row={makeRow()}
      />,
    )

    await user.click(screen.getByRole('button', { name: 'Source Email' }))

    await user.click(await screen.findByRole('button', { name: /Reprocess Email/i }))

    expect(
      await screen.findByRole('heading', { name: /Reprocess this email\?/i }),
    ).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /^Reprocess$/i }))

    await waitFor(() => {
      expect(vi.mocked(reprocessEmailByMailId)).toHaveBeenCalledWith('gmail-msg-abc')
    })
    expect(onNotify).toHaveBeenCalledWith('Reprocess started for this email.')
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('shows enrichment fields when API returns enrichment', async () => {
    vi.mocked(getFetchedEmailByMailId).mockResolvedValue({
      mail_id: 'gmail-msg-abc',
      subject: 'S',
      sender: null,
      snippet: null,
      internal_date_ms: null,
      created_at: '2024-06-01T12:00:00Z',
      body_text: 'x',
      enrichment: {
        classification_name: 'transaction',
        classification: null,
        classification_id: 12,
        parser_name: 'default',
        parser_id: 34,
        updated_at: '2024-06-02T00:00:00Z',
      },
    })

    const user = userEvent.setup()
    const fromPath = '/transactions/99?tab=email&page=0&ps=25'
    renderWithRouter(
      <TransactionDetailDialog open onClose={vi.fn()} row={makeRow()} />,
      { initialEntries: [fromPath] },
    )

    await user.click(screen.getByRole('button', { name: 'Source Email' }))

    await waitFor(() => {
      expect(screen.getByText('transaction')).toBeInTheDocument()
    })
    expect(screen.getByText('default')).toBeInTheDocument()
    const expectedTo = `/settings/rules/classifications/12?returnTo=${encodeURIComponent(fromPath)}`
    expect(screen.getByRole('link', { name: 'transaction' })).toHaveAttribute(
      'href',
      expectedTo,
    )
    const expectedParserTo = `/settings/rules/parsers/34?returnTo=${encodeURIComponent(fromPath)}`
    expect(screen.getByRole('link', { name: 'default' })).toHaveAttribute(
      'href',
      expectedParserTo,
    )
  })

  it('shows Create parser link when enrichment has no parser', async () => {
    vi.mocked(getFetchedEmailByMailId).mockResolvedValue({
      mail_id: 'gmail-msg-abc',
      subject: 'S',
      sender: null,
      snippet: null,
      internal_date_ms: null,
      created_at: '2024-06-01T12:00:00Z',
      body_text: 'x',
      enrichment: {
        classification_name: 'transaction',
        classification: 'TRANSACTION_ALERT',
        classification_id: 12,
        parser_name: null,
        parser_id: null,
        updated_at: '2024-06-02T00:00:00Z',
      },
    })

    const user = userEvent.setup()
    const fromPath = '/transactions/99?tab=email&page=0&ps=25'
    renderWithRouter(
      <TransactionDetailDialog open onClose={vi.fn()} row={makeRow()} />,
      { initialEntries: [fromPath] },
    )

    await user.click(screen.getByRole('button', { name: 'Source Email' }))

    await waitFor(() => {
      expect(screen.getByRole('link', { name: 'Create parser' })).toBeInTheDocument()
    })
    const expectedCreateParserTo = `/settings/rules/parsers/new?returnTo=${encodeURIComponent(fromPath)}`
    expect(screen.getByRole('link', { name: 'Create parser' })).toHaveAttribute(
      'href',
      expectedCreateParserTo,
    )
    expect(screen.getByText('No Parser Found')).toBeInTheDocument()
  })

  it('does not show Create parser when classification is not transaction alert', async () => {
    vi.mocked(getFetchedEmailByMailId).mockResolvedValue({
      mail_id: 'gmail-msg-abc',
      subject: 'S',
      sender: null,
      snippet: null,
      internal_date_ms: null,
      created_at: '2024-06-01T12:00:00Z',
      body_text: 'x',
      enrichment: {
        classification_name: 'statement',
        classification: 'STATEMENT',
        classification_id: 5,
        parser_name: null,
        parser_id: null,
        updated_at: '2024-06-02T00:00:00Z',
      },
    })

    const user = userEvent.setup()
    renderWithRouter(
      <TransactionDetailDialog open onClose={vi.fn()} row={makeRow()} />,
      { initialEntries: ['/transactions/99'] },
    )

    await user.click(screen.getByRole('button', { name: 'Source Email' }))

    await waitFor(() => {
      expect(screen.getByText('statement')).toBeInTheDocument()
    })
    expect(screen.queryByRole('link', { name: 'Create parser' })).not.toBeInTheDocument()
    expect(screen.queryByText('No Parser Found')).not.toBeInTheDocument()
  })

  it('calls onClose when Close is clicked', async () => {
    const onClose = vi.fn()
    const user = userEvent.setup()
    renderWithRouter(
      <TransactionDetailDialog open onClose={onClose} row={makeRow()} />,
    )

    await user.click(screen.getByRole('button', { name: 'Close' }))
    expect(onClose).toHaveBeenCalledTimes(1)
  })
})
