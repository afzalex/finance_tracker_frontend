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
  }
})

import { getFetchedEmailByMailId } from '../../services/financeApi'

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
    renderWithTheme(
      <TransactionDetailDialog open onClose={vi.fn()} row={null} />,
    )
    expect(screen.getByText('No transaction selected.')).toBeInTheDocument()
  })

  it('renders transaction fields and tab labels', () => {
    renderWithTheme(
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
    renderWithTheme(
      <TransactionDetailDialog open onClose={vi.fn()} row={row} />,
    )
    expect(
      screen.getByRole('button', { name: 'Source Email' }),
    ).toBeDisabled()
  })

  it('loads email tab and shows subject and body after fetch', async () => {
    const user = userEvent.setup()
    renderWithTheme(
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
    expect(screen.getByText(/Line one/)).toBeInTheDocument()
    expect(screen.getByText(/Line two/)).toBeInTheDocument()
    expect(
      screen.getByText('No enrichment row for this email.'),
    ).toBeInTheDocument()
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
    renderWithTheme(
      <MemoryRouter>
        <TransactionDetailDialog open onClose={vi.fn()} row={makeRow()} />
      </MemoryRouter>,
    )

    await user.click(screen.getByRole('button', { name: 'Source Email' }))

    await waitFor(() => {
      expect(screen.getByText('transaction')).toBeInTheDocument()
    })
    expect(screen.getByText('default')).toBeInTheDocument()
    expect(
      screen.getByRole('link', { name: 'transaction' }),
    ).toHaveAttribute('href', '/settings/rules/classifications/12?tab=classifications')
    expect(screen.getByRole('link', { name: 'default' })).toHaveAttribute(
      'href',
      '/settings/rules/parsers/34?tab=parsers',
    )
  })

  it('calls onClose when Close is clicked', async () => {
    const onClose = vi.fn()
    const user = userEvent.setup()
    renderWithTheme(
      <TransactionDetailDialog open onClose={onClose} row={makeRow()} />,
    )

    await user.click(screen.getByRole('button', { name: 'Close' }))
    expect(onClose).toHaveBeenCalledTimes(1)
  })
})
