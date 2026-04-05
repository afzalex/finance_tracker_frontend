import { screen, waitFor, within } from '@testing-library/react'
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import Analytics from '../../pages/Analytics'
import { DateRangeProvider } from '../../contexts/DateRangeContext'
import { renderWithTheme } from '../renderWithTheme'
import * as financeApi from '../../services/financeApi'

vi.mock('../../services/financeApi', () => ({
  getAnalytics: vi.fn(),
  listTopMerchants: vi.fn(),
}))

function renderAnalytics(path = '/analytics') {
  return renderWithTheme(
    <MemoryRouter initialEntries={[path]}>
      <DateRangeProvider>
        <Routes>
          <Route path="analytics" element={<Analytics />} />
        </Routes>
      </DateRangeProvider>
    </MemoryRouter>,
  )
}

describe('Analytics', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    financeApi.listTopMerchants.mockResolvedValue([])
  })

  it('renders loading slate and then analytics tables', async () => {
    const mockData = {
      cashflow: [
        { month: 'Oct 2023', income: 5000, expense: 3000 }
      ],
      categoryBreakdown: [
        { category: 'Rent', total: -1500 }
      ],
    }
    financeApi.getAnalytics.mockResolvedValue(mockData)
    financeApi.listTopMerchants.mockResolvedValue([
      { merchant: 'Amazon', total: 500, transactionCount: 3 },
    ])

    renderAnalytics()

    await waitFor(() => {
      expect(screen.queryByRole('progressbar')).not.toBeInTheDocument()
      expect(screen.getByText('Top Merchants')).toBeInTheDocument()
    })

    expect(screen.getByText('Top Merchants')).toBeInTheDocument()
    const merchantsTable = screen.getByRole('table', { name: 'Top Merchants table' })
    expect(within(merchantsTable).getByText('Amazon')).toBeInTheDocument()
    expect(within(merchantsTable).getByText('3')).toBeInTheDocument()
    expect(within(merchantsTable).getByText('-500.00')).toBeInTheDocument()
    expect(within(merchantsTable).getByText('INR')).toBeInTheDocument()

    // Cashflow table verification
    const cashflowTable = screen.getByRole('table', { name: 'cashflow table' })
    expect(screen.getByText('Cashflow')).toBeInTheDocument()
    expect(screen.getByText('Oct 2023')).toBeInTheDocument()
    expect(within(cashflowTable).getByText('5,000.00')).toBeInTheDocument()
    // Net: 5000 - 3000 = 2000
    expect(within(cashflowTable).getByText('-3,000.00')).toBeInTheDocument()
    expect(within(cashflowTable).getByText('2,000.00')).toBeInTheDocument()

    // Category breakdown
    const categoryTable = screen.getByRole('table', {
      name: 'Category Breakdown table',
    })
    expect(screen.getByText('Category Breakdown')).toBeInTheDocument()
    expect(screen.getByText('Rent')).toBeInTheDocument()
    expect(within(categoryTable).getByText('1,500.00')).toBeInTheDocument()
    expect(within(categoryTable).getByText('INR')).toBeInTheDocument()
  })

  it('renders error message when API fails', async () => {
    financeApi.getAnalytics.mockRejectedValueOnce(new Error('Failed analytics'))

    renderAnalytics()

    await waitFor(() => {
      expect(screen.getByText('Failed analytics')).toBeInTheDocument()
    })
  })

  it('renders merchants error when listTopMerchants fails', async () => {
    financeApi.getAnalytics.mockResolvedValue({
      cashflow: [],
      categoryBreakdown: [],
    })
    financeApi.listTopMerchants.mockRejectedValueOnce(new Error('Bad merchants'))

    renderAnalytics()

    await waitFor(() => {
      expect(screen.getByText('Bad merchants')).toBeInTheDocument()
    })
  })
})
