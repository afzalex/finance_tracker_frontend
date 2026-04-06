import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import Analytics from '../../pages/Analytics'
import { renderWithTheme } from '../renderWithTheme'
import * as financeApi from '../../services/financeApi'

vi.mock('../../services/financeApi', () => ({
  getAnalytics: vi.fn(),
  listTopMerchants: vi.fn(),
}))

function renderAnalytics(path = '/analytics') {
  return renderWithTheme(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/analytics" element={<Analytics />} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('Analytics', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    financeApi.listTopMerchants.mockResolvedValue([])
  })

  it('renders loading slate and then analytics tables', async () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date(2026, 3, 10, 12, 0, 0))
    try {
    const mockData = {
      cashflowRange: { from: '2025-05-01', to: '2026-04-10' },
      cashflow: [
        {
          month: '2023-10',
          credit: 5000,
          debit: 3000,
          total: 2000,
          count: 7,
        },
      ],
      categoryBreakdown: [
        { category: 'Rent', total: -1500 }
      ],
    }
    financeApi.getAnalytics.mockResolvedValue(mockData)
    financeApi.listTopMerchants.mockResolvedValue([
      {
        merchant: 'Amazon',
        total: 500,
        transactionCount: 3,
        selfTransferDebitTotal: 0,
        selfTransferCount: 0,
      },
    ])

    renderAnalytics()

    await waitFor(() => {
      expect(financeApi.getAnalytics).toHaveBeenCalledWith({
        from: '2025-05-01',
        to: '2026-04-10',
      })
    })

    await waitFor(() => {
      expect(screen.queryByRole('progressbar')).not.toBeInTheDocument()
      expect(
        screen.getByText('Top merchants and counterparties'),
      ).toBeInTheDocument()
    })

    expect(
      screen.getByText('Top merchants and counterparties'),
    ).toBeInTheDocument()
    const merchantsTable = screen.getByRole('table', {
      name: 'Top merchants and counterparties table',
    })
    expect(within(merchantsTable).getByText('Amazon')).toBeInTheDocument()
    expect(within(merchantsTable).getByText('3')).toBeInTheDocument()
    expect(within(merchantsTable).getByText('-500.00')).toBeInTheDocument()
    expect(within(merchantsTable).getByText('INR')).toBeInTheDocument()

    // Cashflow table verification
    const cashflowTable = screen.getByRole('table', { name: 'cashflow table' })
    expect(screen.getByText('Cashflow')).toBeInTheDocument()
    expect(
      screen.getByLabelText('Cashflow from 2025-05-01 through 2026-04-10'),
    ).toBeInTheDocument()
    expect(screen.getByText('2023-10')).toBeInTheDocument()
    expect(within(cashflowTable).getByText('5,000.00')).toBeInTheDocument()
    expect(within(cashflowTable).getByText('-3,000.00')).toBeInTheDocument()
    expect(within(cashflowTable).getByText('2,000.00')).toBeInTheDocument()
    expect(within(cashflowTable).getByText('7')).toBeInTheDocument()

    // Category breakdown
    const categoryTable = screen.getByRole('table', {
      name: 'Category Breakdown table',
    })
    expect(screen.getByText('Category Breakdown')).toBeInTheDocument()
    expect(screen.getByText('Rent')).toBeInTheDocument()
    expect(within(categoryTable).getByText('1,500.00')).toBeInTheDocument()
    expect(within(categoryTable).getByText('INR')).toBeInTheDocument()
    } finally {
      vi.useRealTimers()
    }
  })

  it('updates analytics months and refetches with new window', async () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date(2026, 3, 10, 12, 0, 0))
    const user = userEvent.setup()
    try {
    financeApi.getAnalytics.mockResolvedValue({
      cashflowRange: null,
      cashflow: [],
      categoryBreakdown: [],
    })

    renderAnalytics(
      '/analytics?from=2024-01-01&to=2024-06-30&am=12',
    )

    await waitFor(() => {
      expect(financeApi.getAnalytics).toHaveBeenCalled()
    })
    vi.mocked(financeApi.getAnalytics).mockClear()

    const combobox = screen.getByRole('combobox', { name: 'Analytics period' })
    await user.click(combobox)
    const listbox = await screen.findByRole('listbox')
    const opt = within(listbox).getByText('Last 3 months')
    await user.click(opt)

    await waitFor(() => {
      expect(financeApi.getAnalytics).toHaveBeenCalledWith({
        from: '2026-02-01',
        to: '2026-04-10',
      })
    })
    } finally {
      vi.useRealTimers()
    }
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
      cashflowRange: null,
      cashflow: [],
      categoryBreakdown: [],
    })
    financeApi.listTopMerchants.mockRejectedValueOnce(new Error('Bad merchants'))

    renderAnalytics()

    await waitFor(() => {
      expect(screen.getByText('Bad merchants')).toBeInTheDocument()
    })
  })

  it('renders UNDEFINED for top merchant __UNDEFINED__ sentinel', async () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date(2026, 3, 10, 12, 0, 0))
    try {
      financeApi.getAnalytics.mockResolvedValue({
        cashflowRange: null,
        cashflow: [],
        categoryBreakdown: [],
      })
      financeApi.listTopMerchants.mockResolvedValue([
        {
          merchant: '__UNDEFINED__',
          total: 100,
          transactionCount: 2,
          selfTransferDebitTotal: 0,
          selfTransferCount: 0,
        },
      ])

      renderAnalytics()

      await waitFor(() => {
        expect(screen.queryByRole('progressbar')).not.toBeInTheDocument()
      })

      const merchantsTable = screen.getByRole('table', {
        name: 'Top merchants and counterparties table',
      })
      expect(within(merchantsTable).getByText('UNDEFINED')).toBeInTheDocument()
      expect(
        within(merchantsTable).queryByText('__UNDEFINED__'),
      ).not.toBeInTheDocument()
    } finally {
      vi.useRealTimers()
    }
  })
})
