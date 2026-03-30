import { screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi, beforeEach } from 'vitest'
import Analytics from '../../pages/Analytics'
import { renderWithTheme } from '../renderWithTheme'
import * as financeApi from '../../services/financeApi'

vi.mock('../../services/financeApi', () => ({
  getAnalytics: vi.fn(),
}))

describe('Analytics', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders loading slate and then analytics tables', async () => {
    const mockData = {
      cashflow: [
        { month: 'Oct 2023', income: 5000, expense: 3000 }
      ],
      categoryBreakdown: [
        { category: 'Rent', total: -1500 }
      ],
      topMerchants: [
        { merchant: 'Amazon', total: -500 }
      ]
    }
    financeApi.getAnalytics.mockResolvedValue(mockData)

    renderWithTheme(<Analytics />)

    await waitFor(() => {
      expect(screen.queryByRole('progressbar')).not.toBeInTheDocument()
      expect(screen.getByText('Cashflow')).toBeInTheDocument()
    })

    // Cashflow table verification
    expect(screen.getByText('Cashflow')).toBeInTheDocument()
    expect(screen.getByText('Oct 2023')).toBeInTheDocument()
    expect(screen.getByText('$5,000.00')).toBeInTheDocument()
    // Net: 5000 - 3000 = 2000
    expect(screen.getByText('-$3,000.00')).toBeInTheDocument()
    expect(screen.getByText('$2,000.00')).toBeInTheDocument()

    // Category breakdown
    expect(screen.getByText('Category breakdown')).toBeInTheDocument()
    expect(screen.getByText('Rent')).toBeInTheDocument()
    expect(screen.getByText('$1,500.00')).toBeInTheDocument() // The format changes it to -total internally, then formatMoney adds $

    // Top merchants
    expect(screen.getByText('Top merchants')).toBeInTheDocument()
    expect(screen.getByText('Amazon')).toBeInTheDocument()
    expect(screen.getByText('$500.00')).toBeInTheDocument()
  })

  it('renders error message when API fails', async () => {
    financeApi.getAnalytics.mockRejectedValueOnce(new Error('Failed analytics'))

    renderWithTheme(<Analytics />)

    await waitFor(() => {
      expect(screen.getByText('Failed analytics')).toBeInTheDocument()
    })
  })
})
