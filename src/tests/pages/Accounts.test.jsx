import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, expect, it, vi, beforeEach } from 'vitest'
import Accounts from '../../pages/Accounts'
import { renderWithTheme } from '../renderWithTheme'
import * as financeApi from '../../services/financeApi'

vi.mock('../../services/financeApi', () => ({
  listAccounts: vi.fn(),
  upsertAccount: vi.fn(),
}))

function renderAccountsAt(path = '/accounts') {
  return renderWithTheme(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="accounts" element={<Accounts />} />
        <Route path="accounts/:accountId" element={<Accounts />} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('Accounts', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders loading slate and then accounts list', async () => {
    const mockAccounts = [
      {
        id: '1',
        account_id: 'chk-local',
        provider: 'chase',
        name: 'Checking',
        type: 'depository',
        debitTotal: 200,
        creditTotal: 1200,
        net: 1000,
        balance: 1000,
        count: 5,
        currency: 'USD',
        hasConflict: false,
      },
      {
        id: '2',
        account_id: 'amex-1',
        provider: 'amex',
        name: 'Credit Card',
        type: 'credit',
        debitTotal: 700,
        creditTotal: 200,
        net: -500,
        balance: -500,
        count: 3,
        currency: 'USD',
        hasConflict: true,
      },
    ]
    financeApi.listAccounts.mockResolvedValueOnce(
      mockAccounts.map((a) => ({
        ...a,
        raw: {
          account_id: a.account_id,
          provider: a.provider,
          display_name: a.name,
          account_type: a.type,
        },
      })),
    )

    renderAccountsAt()

    await waitFor(() => {
      expect(screen.queryByRole('progressbar')).not.toBeInTheDocument()
      expect(screen.getByText('Checking')).toBeInTheDocument()
    })

    const dataRows = screen.getAllByRole('button', {
      name: /view account details for/i,
    })
    const checkingRow = dataRows[0]
    const cardRow = dataRows[1]
    const checkingCells = within(checkingRow).getAllByRole('cell')
    const cardCells = within(cardRow).getAllByRole('cell')

    expect(
      within(checkingRow).queryByLabelText(
        'Account has conflicting transaction slices',
      ),
    ).not.toBeInTheDocument()

    expect(within(checkingRow).getByText('chk-local')).toBeInTheDocument()
    expect(within(checkingRow).getByText('chase')).toBeInTheDocument()
    expect(within(checkingRow).getByText('depository')).toBeInTheDocument()
    expect(within(checkingCells[5]).getByText('INR')).toBeInTheDocument()
    expect(checkingCells[5]).toHaveTextContent('200.00')
    expect(within(checkingCells[6]).getByText('INR')).toBeInTheDocument()
    expect(checkingCells[6]).toHaveTextContent('1,200.00')
    expect(within(checkingCells[7]).getByText('INR')).toBeInTheDocument()
    expect(checkingCells[7]).toHaveTextContent('1,000.00')
    expect(within(checkingRow).getByText('5')).toBeInTheDocument()

    expect(within(cardRow).getByText('amex-1')).toBeInTheDocument()
    expect(within(cardRow).getByText('amex')).toBeInTheDocument()
    expect(within(cardRow).getByText('Credit Card')).toBeInTheDocument()
    expect(within(cardRow).getByText('credit')).toBeInTheDocument()
    expect(within(cardCells[5]).getByText('INR')).toBeInTheDocument()
    expect(cardCells[5]).toHaveTextContent('700.00')
    expect(within(cardCells[6]).getByText('INR')).toBeInTheDocument()
    expect(cardCells[6]).toHaveTextContent('200.00')
    expect(within(cardCells[7]).getByText('INR')).toBeInTheDocument()
    expect(cardCells[7]).toHaveTextContent('-500.00')
    expect(within(cardRow).getByText('3')).toBeInTheDocument()
    expect(
      within(cardRow).getByLabelText('Account has conflicting transaction slices'),
    ).toBeInTheDocument()

    const totalRow = screen.getByRole('row', { name: /Totals across all accounts/i })
    expect(within(totalRow).getByText('Totals')).toBeInTheDocument()
    const totalCells = within(totalRow).getAllByRole('cell')
    expect(within(totalCells[1]).getByText('INR')).toBeInTheDocument()
    expect(totalCells[1]).toHaveTextContent('900.00')
    expect(totalCells[2]).toHaveTextContent('1,400.00')
    expect(totalCells[3]).toHaveTextContent('500.00')
    expect(totalCells[4]).toHaveTextContent('8')
  })

  it('sorts by column when header is activated', async () => {
    financeApi.listAccounts.mockResolvedValueOnce([
      {
        id: 'a',
        account_id: 'a1',
        provider: 'p',
        name: 'Alpha',
        type: 'x',
        debitTotal: 0,
        creditTotal: 0,
        net: 100,
        balance: 100,
        count: 1,
        hasConflict: false,
      },
      {
        id: 'b',
        account_id: 'b1',
        provider: 'p',
        name: 'Beta',
        type: 'x',
        debitTotal: 0,
        creditTotal: 0,
        net: 500,
        balance: 500,
        count: 2,
        hasConflict: false,
      },
    ])

    renderAccountsAt()
    await waitFor(() => {
      expect(screen.getByText('Alpha')).toBeInTheDocument()
    })

    const nameCells = () =>
      screen
        .getAllByRole('button', { name: /view account details for/i })
        .map((row) => within(row).getAllByRole('cell')[3].textContent)

    // Default sort is count descending (Beta: 2, Alpha: 1).
    expect(nameCells()).toEqual(['Beta', 'Alpha'])

    const user = userEvent.setup()
    const netHeader = screen.getByRole('columnheader', { name: /Net/i })
    await user.click(within(netHeader).getByRole('button'))

    await waitFor(() => {
      expect(nameCells()).toEqual(['Beta', 'Alpha'])
    })

    await user.click(within(netHeader).getByRole('button'))

    await waitFor(() => {
      expect(nameCells()).toEqual(['Alpha', 'Beta'])
    })
  })

  it('renders empty message when no accounts exist', async () => {
    financeApi.listAccounts.mockResolvedValueOnce([])

    renderAccountsAt()

    await waitFor(() => {
      expect(screen.getByText('No accounts.')).toBeInTheDocument()
    })
  })

  it('renders error message when API fails', async () => {
    financeApi.listAccounts.mockRejectedValueOnce(new Error('Network Error'))

    renderAccountsAt()

    await waitFor(() => {
      expect(screen.getByText('Network Error')).toBeInTheDocument()
    })
  })

  it('opens account detail when URL includes account id', async () => {
    financeApi.listAccounts.mockResolvedValueOnce([
      {
        id: '1',
        account_id: 'chk-local',
        provider: 'chase',
        name: 'Checking',
        type: 'depository',
        debitTotal: 0,
        creditTotal: 0,
        net: 0,
        balance: 0,
        count: 1,
        currency: 'USD',
        hasConflict: false,
        raw: {
          account_id: 'chk-local',
          provider: 'chase',
          display_name: 'Checking',
          account_type: 'depository',
        },
      },
    ])

    renderAccountsAt('/accounts/chk-local')

    await waitFor(() => {
      expect(screen.getByRole('dialog', { name: 'Account' })).toBeInTheDocument()
    })
    expect(screen.getByRole('textbox', { name: /account id/i })).toHaveValue(
      'chk-local',
    )
  })

  it('opens account detail when a data row is activated', async () => {
    financeApi.listAccounts.mockResolvedValueOnce([
      {
        id: '1',
        account_id: 'chk-local',
        provider: 'chase',
        name: 'Checking',
        type: 'depository',
        debitTotal: 0,
        creditTotal: 0,
        net: 0,
        balance: 0,
        count: 1,
        currency: 'USD',
        hasConflict: false,
        raw: {
          account_id: 'chk-local',
          provider: 'chase',
          display_name: 'Checking',
          account_type: 'depository',
        },
      },
    ])

    renderAccountsAt('/accounts')
    await waitFor(() => {
      expect(screen.getByText('Checking')).toBeInTheDocument()
    })

    const user = userEvent.setup()
    await user.click(
      screen.getByRole('button', {
        name: /view account details for chk-local/i,
      }),
    )

    await waitFor(() => {
      expect(screen.getByRole('dialog', { name: 'Account' })).toBeInTheDocument()
    })
  })
})
