import { screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi, beforeEach } from 'vitest'
import Accounts from '../../pages/Accounts'
import { renderWithTheme } from '../renderWithTheme'
import * as financeApi from '../../services/financeApi'

vi.mock('../../services/financeApi', () => ({
  listAccounts: vi.fn(),
}))

describe('Accounts', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders loading slate and then accounts list', async () => {
    const mockAccounts = [
      { id: '1', name: 'Checking', type: 'depository', balance: 1000, currency: 'USD' },
      { id: '2', name: 'Credit Card', type: 'credit', balance: -500, currency: 'USD' },
    ]
    financeApi.listAccounts.mockResolvedValueOnce(mockAccounts)

    renderWithTheme(<Accounts />)

    // Wait for data to load
    await waitFor(() => {
      expect(screen.queryByRole('progressbar')).not.toBeInTheDocument()
      expect(screen.getByText('Checking')).toBeInTheDocument()
    })

    // Check account rendering
    expect(screen.getByText('Checking')).toBeInTheDocument()
    expect(screen.getByText('depository')).toBeInTheDocument()
    // It formats $1,000.00
    expect(screen.getByText('$1,000.00')).toBeInTheDocument()

    expect(screen.getByText('Credit Card')).toBeInTheDocument()
    expect(screen.getByText('credit')).toBeInTheDocument()
    expect(screen.getByText('-$500.00')).toBeInTheDocument()
  })

  it('renders empty message when no accounts exist', async () => {
    financeApi.listAccounts.mockResolvedValueOnce([])

    renderWithTheme(<Accounts />)

    await waitFor(() => {
      expect(screen.getByText('No accounts.')).toBeInTheDocument()
    })
  })

  it('renders error message when API fails', async () => {
    financeApi.listAccounts.mockRejectedValueOnce(new Error('Network Error'))

    renderWithTheme(<Accounts />)

    await waitFor(() => {
      expect(screen.getByText('Network Error')).toBeInTheDocument()
    })
  })
})
