import { screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi, beforeEach } from 'vitest'
import Dashboard from '../../pages/Dashboard'
import { renderWithTheme } from '../renderWithTheme'
import * as financeApi from '../../services/financeApi'

vi.mock('../../services/financeApi', () => ({
  getDashboardStats: vi.fn(),
}))

describe('Dashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders loading slate and then dashboard stats', async () => {
    const mockStats = {
      netThisMonth: 1000,
      incomeThisMonth: 3000,
      expenseThisMonth: 2000,
      topCategory: 'Groceries',
      recentActivity: [
        { id: '1', label: 'Whole Foods', date: '2023-10-01T12:00:00Z', amount: -150 }
      ]
    }
    financeApi.getDashboardStats.mockResolvedValueOnce(mockStats)

    renderWithTheme(<Dashboard />)

    await waitFor(() => {
      expect(screen.queryByRole('progressbar')).not.toBeInTheDocument()
      expect(screen.getByText('Net (This Month)')).toBeInTheDocument()
    })

    // StatCards
    expect(screen.getByText('Net (This Month)')).toBeInTheDocument()
    expect(screen.getByText('$1,000.00')).toBeInTheDocument()
    expect(screen.getByText('Income - Expenses')).toBeInTheDocument()

    expect(screen.getByText('Income (This Month)')).toBeInTheDocument()
    expect(screen.getByText('$3,000.00')).toBeInTheDocument()

    expect(screen.getByText('Expenses (This Month)')).toBeInTheDocument()
    expect(screen.getByText('$2,000.00')).toBeInTheDocument()

    expect(screen.getByText('Top Category')).toBeInTheDocument()
    expect(screen.getByText('Groceries')).toBeInTheDocument()

    // Recent Activity
    expect(screen.getByText('Recent activity')).toBeInTheDocument()
    expect(screen.getByText('Whole Foods')).toBeInTheDocument()
    expect(screen.getByText('-$150.00')).toBeInTheDocument()
  })

  it('renders error message when API fails', async () => {
    financeApi.getDashboardStats.mockRejectedValueOnce(new Error('Failed to fetch stats'))

    renderWithTheme(<Dashboard />)

    await waitFor(() => {
      expect(screen.getByText('Failed to fetch stats')).toBeInTheDocument()
    })
  })
})
