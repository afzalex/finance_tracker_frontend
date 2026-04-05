import { screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import Dashboard from '../../pages/Dashboard'
import { renderWithTheme } from '../renderWithTheme'
import * as financeApi from '../../services/financeApi'

vi.mock('../../services/financeApi', () => ({
  getDashboardStats: vi.fn(),
  getTransactionSummary: vi.fn(),
  listTopEmailsWithTransactions: vi.fn(),
  listTransactions: vi.fn(),
}))

const emptyTxList = {
  items: [],
  total: 0,
  page: 1,
  pageSize: 8,
}

describe('Dashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    financeApi.listTransactions.mockResolvedValue(emptyTxList)
    financeApi.listTopEmailsWithTransactions.mockResolvedValue([])
  })

  it('renders loading slate and then dashboard stats', async () => {
    const mockStats = {
      netThisMonth: 1000,
      incomeThisMonth: 3000,
      expenseThisMonth: 2000,
      topCategory: 'Groceries',
    }
    financeApi.getTransactionSummary.mockResolvedValueOnce({
      net: 1000,
      totalCredit: 3000,
      totalDebit: 2000,
    })
    financeApi.getDashboardStats.mockResolvedValueOnce(mockStats)
    financeApi.listTransactions.mockResolvedValueOnce({
      items: [
        {
          id: '1',
          date: '2023-10-01T12:00:00Z',
          description: 'Purchase',
          merchant: 'Whole Foods',
          amount: -150,
          currency: 'INR',
        },
      ],
      total: 1,
      page: 1,
      pageSize: 8,
    })
    financeApi.listTopEmailsWithTransactions.mockResolvedValueOnce([
      {
        id: 1,
        mail_id: 'msg-abc',
        subject: 'Your Whole Foods receipt',
        sender: 'receipts@wholefoods.com',
        snippet: 'Thanks for your purchase',
        body_text: '',
        created_at: '2023-10-01T12:00:00Z',
        internal_date_ms: 0,
        last_transacted_at: '2023-10-01T12:00:00Z',
        transaction_count: 1,
        enrichment: {
          classification_name: 'Groceries',
          created_at: '2023-10-01T12:00:00Z',
          fetched_email_id: 1,
          updated_at: '2023-10-01T12:00:00Z',
        },
      },
    ])

    renderWithTheme(
      <MemoryRouter>
        <Dashboard />
      </MemoryRouter>,
    )

    await waitFor(() => {
      expect(screen.queryByRole('progressbar')).not.toBeInTheDocument()
      expect(screen.getByText('Net (This Month)')).toBeInTheDocument()
    })

    // StatCards link to Analytics
    const netAnalyticsLink = screen.getByRole('link', {
      name: 'Open analytics: Net (This Month)',
    })
    expect(netAnalyticsLink).toHaveAttribute('href', '/analytics')

    expect(screen.getByText('Net (This Month)')).toBeInTheDocument()
    expect(screen.getByText('1,000.00')).toBeInTheDocument()

    expect(screen.getByText('Income (This Month)')).toBeInTheDocument()
    expect(screen.getByText('3,000.00')).toBeInTheDocument()

    expect(screen.getByText('Expenses (This Month)')).toBeInTheDocument()
    expect(screen.getByText('2,000.00')).toBeInTheDocument()
    expect(screen.getAllByText('INR').length).toBeGreaterThanOrEqual(4)

    expect(screen.getByText('Top Category')).toBeInTheDocument()
    expect(screen.getByText('Groceries')).toBeInTheDocument()

    await waitFor(() => {
      expect(screen.getByText('Recent Transactions')).toBeInTheDocument()
      expect(screen.getByText('Recent Mails')).toBeInTheDocument()
    })
    expect(screen.getByText(/Whole Foods · Purchase/)).toBeInTheDocument()
    expect(screen.getByText('-150.00')).toBeInTheDocument()
    expect(screen.getByText(/Your Whole Foods receipt/)).toBeInTheDocument()
    expect(screen.getByText(/Thanks for your purchase/)).toBeInTheDocument()
    expect(screen.getByText(/1 transaction/)).toBeInTheDocument()

    expect(financeApi.listTransactions).toHaveBeenCalledWith({
      page: 1,
      pageSize: 8,
      sortBy: 'transacted_at',
      sortOrder: 'desc',
    })
    expect(financeApi.listTopEmailsWithTransactions).toHaveBeenCalledWith({
      limit: 5,
    })
  })

  it('renders error message when API fails', async () => {
    financeApi.getTransactionSummary.mockRejectedValueOnce(
      new Error('Failed to fetch stats'),
    )
    financeApi.getDashboardStats.mockResolvedValueOnce({
      topCategory: 'Groceries',
    })

    renderWithTheme(
      <MemoryRouter>
        <Dashboard />
      </MemoryRouter>,
    )

    await waitFor(() => {
      expect(screen.getByText('Failed to fetch stats')).toBeInTheDocument()
    })
  })
})
