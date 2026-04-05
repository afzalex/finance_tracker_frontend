import { screen, waitFor, fireEvent } from '@testing-library/react'
import { describe, expect, it, vi, beforeEach } from 'vitest'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import Transactions from '../../pages/Transactions'
import { DateRangeProvider } from '../../contexts/DateRangeContext'
import { renderWithTheme } from '../renderWithTheme'
import * as financeApi from '../../services/financeApi'

vi.mock('../../services/financeApi', () => ({
  listTransactions: vi.fn(),
  findTransactionRowById: vi.fn(),
  findFirstTransactionRowByMailId: vi.fn().mockResolvedValue(null),
  listTransactionDistinctCatalog: vi.fn(),
}))

describe('Transactions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    financeApi.listTransactionDistinctCatalog.mockResolvedValue({
      providers: ['Plaid'],
      merchants: [],
      counterparties: [],
    })
  })

  it('renders table and handles search and pagination', async () => {
    const user = userEvent.setup()
    financeApi.listTransactions.mockResolvedValueOnce({
      items: [
        {
          id: '1',
          date: '2023-10-01T12:00:00Z',
          description: 'Payment',
          account: 'Checking',
          merchant: 'Google',
          provider: 'Plaid',
          amount: -50,
          amountRaw: '-$50.00',
          raw: { merchant: 'Google' }
        }
      ],
      total: 100
    })

    renderWithTheme(
      <MemoryRouter initialEntries={['/transactions']}>
        <DateRangeProvider>
          <Routes>
            <Route path="/transactions" element={<Transactions />} />
            <Route path="/transactions/:transactionId" element={<Transactions />} />
          </Routes>
        </DateRangeProvider>
      </MemoryRouter>,
    )

    await waitFor(() => {
      expect(screen.queryByRole('progressbar')).not.toBeInTheDocument()
      expect(screen.getByText('Payment')).toBeInTheDocument()
    })

    // Check row
    expect(screen.getByText('Payment')).toBeInTheDocument()
    expect(screen.getByText('Google')).toBeInTheDocument()

    // Test Search Input
    financeApi.listTransactions.mockResolvedValueOnce({
      items: [
        {
          id: '2',
          date: '2023-10-02T12:00:00Z',
          description: 'Coffee',
          account: 'Checking',
          merchant: 'Starbucks',
          provider: 'Plaid',
          amount: -5,
          amountRaw: '-$5.00',
          raw: { merchant: 'Starbucks' }
        }
      ],
      total: 1
    })

    const searchInput = screen.getByPlaceholderText('Search merchant or payee…')
    fireEvent.change(searchInput, { target: { value: 'Starbucks' } })

    await waitFor(() => {
      expect(financeApi.listTransactions).toHaveBeenLastCalledWith(
        expect.objectContaining({
          query: 'Starbucks',
          page: 1,
          pageSize: 25,
          from: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
          to: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
          sortBy: 'transacted_at',
          sortOrder: 'desc',
        }),
      )
      expect(screen.getByText('Coffee')).toBeInTheDocument()
    })

    // Test clicking row to open dialog (via route)
    await user.click(screen.getByText('Coffee'))
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getAllByText('Starbucks')[1]).toBeInTheDocument()

    // Close Dialog
    await user.click(screen.getByRole('button', { name: /close/i }))
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })
    
    // Test pagination
    const nextPageButton = screen.getByRole('button', { name: /next page/i })
    if (nextPageButton && !nextPageButton.disabled) {
      await user.click(nextPageButton)
      await waitFor(() => {
        expect(financeApi.listTransactions).toHaveBeenLastCalledWith(
          expect.objectContaining({
            page: 2,
            from: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
            to: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
            sortBy: 'transacted_at',
            sortOrder: 'desc',
          }),
        )
      })
    }
  })

  it('renders correctly with no data', async () => {
    financeApi.listTransactions.mockResolvedValueOnce({
      items: [],
      total: 0
    })

    renderWithTheme(
      <MemoryRouter initialEntries={['/transactions']}>
        <DateRangeProvider>
          <Routes>
            <Route path="/transactions" element={<Transactions />} />
            <Route path="/transactions/:transactionId" element={<Transactions />} />
          </Routes>
        </DateRangeProvider>
      </MemoryRouter>,
    )

    await waitFor(() => {
      expect(screen.getByText('No matching transactions.')).toBeInTheDocument()
    })
  })

  it('restores search filter from the URL on load', async () => {
    financeApi.listTransactions.mockResolvedValueOnce({
      items: [
        {
          id: '2',
          date: '2023-10-02T12:00:00Z',
          description: 'Coffee',
          account: 'Checking',
          merchant: 'Starbucks',
          provider: 'Plaid',
          amount: -5,
          amountRaw: '-$5.00',
          raw: { merchant: 'Starbucks' },
        },
      ],
      total: 1,
    })

    renderWithTheme(
      <MemoryRouter initialEntries={['/transactions?q=Starbucks']}>
        <DateRangeProvider>
          <Routes>
            <Route path="/transactions" element={<Transactions />} />
            <Route path="/transactions/:transactionId" element={<Transactions />} />
          </Routes>
        </DateRangeProvider>
      </MemoryRouter>,
    )

    await waitFor(() => {
      expect(financeApi.listTransactions).toHaveBeenCalledWith(
        expect.objectContaining({
          query: 'Starbucks',
          page: 1,
          pageSize: 25,
          from: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
          to: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
        }),
      )
    })
    expect(
      screen.getByPlaceholderText('Search merchant or payee…'),
    ).toHaveValue('Starbucks')
    expect(await screen.findByText('Coffee')).toBeInTheDocument()
  })

  it('uses from and to from the URL for the list request', async () => {
    financeApi.listTransactions.mockResolvedValue({
      items: [],
      total: 0,
    })

    renderWithTheme(
      <MemoryRouter
        initialEntries={[
          '/transactions?from=2024-06-01&to=2024-06-30&page=0&ps=25',
        ]}
      >
        <DateRangeProvider>
          <Routes>
            <Route path="/transactions" element={<Transactions />} />
            <Route path="/transactions/:transactionId" element={<Transactions />} />
          </Routes>
        </DateRangeProvider>
      </MemoryRouter>,
    )

    await waitFor(() => {
      expect(financeApi.listTransactions).toHaveBeenCalledWith(
        expect.objectContaining({
          from: '2024-06-01',
          to: '2024-06-30',
        }),
      )
    })
  })

  it('navigates to returnTo when closing detail from deep link', async () => {
    const user = userEvent.setup()
    const deepRow = {
      id: 'deep-1',
      date: '2023-10-01T12:00:00Z',
      description: 'Deep',
      account: 'Checking',
      merchant: 'Acme',
      provider: 'Plaid',
      amount: -10,
      amountRaw: '-$10.00',
      raw: { merchant: 'Acme' },
    }
    financeApi.findTransactionRowById.mockResolvedValue(deepRow)
    financeApi.listTransactions.mockResolvedValue({
      items: [deepRow],
      total: 1,
    })

    const returnTo = encodeURIComponent('/analytics')
    renderWithTheme(
      <MemoryRouter
        initialEntries={[`/transactions/deep-1?returnTo=${returnTo}`]}
      >
        <DateRangeProvider>
          <Routes>
            <Route path="/transactions" element={<Transactions />} />
            <Route path="/transactions/:transactionId" element={<Transactions />} />
            <Route path="/analytics" element={<div>Analytics page</div>} />
          </Routes>
        </DateRangeProvider>
      </MemoryRouter>,
    )

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument()
    })

    await user.click(screen.getByRole('button', { name: /^Close$/i }))
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
      expect(screen.getByText('Analytics page')).toBeInTheDocument()
    })
  })

  it('renders API error message', async () => {
    financeApi.listTransactions.mockRejectedValueOnce(new Error('Transaction fetch failed'))

    renderWithTheme(
      <MemoryRouter initialEntries={['/transactions']}>
        <DateRangeProvider>
          <Routes>
            <Route path="/transactions" element={<Transactions />} />
            <Route path="/transactions/:transactionId" element={<Transactions />} />
          </Routes>
        </DateRangeProvider>
      </MemoryRouter>,
    )

    await waitFor(() => {
      expect(screen.getByText('Transaction fetch failed')).toBeInTheDocument()
    })
  })

  it('handles row keyboard interaction', async () => {
    const user = userEvent.setup()
    financeApi.listTransactions.mockResolvedValueOnce({
      items: [
        {
          id: '1',
          date: '2023-10-01T12:00:00Z',
          description: 'Keyboard Payment',
          account: 'Checking',
          merchant: 'Google',
          provider: 'Plaid',
          amount: -50,
          amountRaw: '-$50.00',
          raw: { merchant: 'Google' }
        }
      ],
      total: 100
    })

    renderWithTheme(
      <MemoryRouter initialEntries={['/transactions']}>
        <DateRangeProvider>
          <Routes>
            <Route path="/transactions" element={<Transactions />} />
            <Route path="/transactions/:transactionId" element={<Transactions />} />
          </Routes>
        </DateRangeProvider>
      </MemoryRouter>,
    )

    await waitFor(() => {
      expect(screen.getByText('Keyboard Payment')).toBeInTheDocument()
    })

    const row = screen.getByRole('button', { name: /View details for transaction 1/i })
    
    // Press Entr
    await user.type(row, '{Enter}')
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })

  it('handles page size change', async () => {
    const user = userEvent.setup()
    financeApi.listTransactions.mockResolvedValueOnce({
        items: [],
        total: 100
    })

    renderWithTheme(
      <MemoryRouter initialEntries={['/transactions']}>
        <DateRangeProvider>
          <Routes>
            <Route path="/transactions" element={<Transactions />} />
            <Route path="/transactions/:transactionId" element={<Transactions />} />
          </Routes>
        </DateRangeProvider>
      </MemoryRouter>,
    )
    await waitFor(() => {
      expect(screen.queryByRole('progressbar')).not.toBeInTheDocument()
    })

    const rowsPerPageDropdown = screen.getByLabelText(/rows per page/i)
    await user.click(rowsPerPageDropdown)

    const option50 = await screen.findByRole('option', { name: '50' })
    await user.click(option50)

    financeApi.listTransactions.mockResolvedValueOnce({
      items: [],
      total: 100
    })

    await waitFor(() => {
      expect(financeApi.listTransactions).toHaveBeenLastCalledWith(
        expect.objectContaining({
          pageSize: 50,
          page: 1,
          from: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
          to: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
          sortBy: 'transacted_at',
          sortOrder: 'desc',
        }),
      )
    })
  })
})
