import { beforeEach, describe, expect, it, vi } from 'vitest'
import { accountsApi, emailsApi, transactionsApi } from '../../services/apiConfig'
import {
  apiErrorMessage,
  getFetchedEmailByMailId,
  listTransactions,
  getDashboardStats,
  listAccounts,
  getAnalytics,
  upsertAccount,
} from '../../services/financeApi'
import { mockStats, mockAnalytics } from '../../mocks/mockData'

vi.mock('../../services/apiConfig', () => ({
  emailsApi: {
    getEmailByMailIdApiV1EmailsMailIdGet: vi.fn(),
  },
  transactionsApi: {
    listTransactionsApiV1TransactionsGet: vi.fn(),
  },
  accountsApi: {
    listAccountsApiV1AccountsGet: vi.fn(),
    putAccountApiV1AccountsPut: vi.fn(),
  },
}))

describe('apiErrorMessage', () => {
  it('returns string detail from API response', () => {
    expect(
      apiErrorMessage({
        response: { data: { detail: 'Not found' } },
      }),
    ).toBe('Not found')
  })

  it('joins validation-style detail array', () => {
    expect(
      apiErrorMessage({
        response: {
          data: {
            detail: [{ msg: 'bad field' }, { msg: 'other' }],
          },
        },
      }),
    ).toBe('bad field, other')
  })

  it('falls back to Error.message', () => {
    expect(apiErrorMessage({ message: 'Network down' })).toBe('Network down')
  })

  it('falls back to generic copy when nothing matches', () => {
    expect(apiErrorMessage({})).toBe('Request failed')
  })
})

describe('getFetchedEmailByMailId', () => {
  beforeEach(() => {
    vi.mocked(emailsApi.getEmailByMailIdApiV1EmailsMailIdGet).mockReset()
  })

  it('trims mail id and returns response data', async () => {
    vi.mocked(emailsApi.getEmailByMailIdApiV1EmailsMailIdGet).mockResolvedValue({
      data: { mail_id: 'abc', body_text: 'x' },
    })

    await expect(getFetchedEmailByMailId('  abc  ')).resolves.toEqual({
      mail_id: 'abc',
      body_text: 'x',
    })
    expect(emailsApi.getEmailByMailIdApiV1EmailsMailIdGet).toHaveBeenCalledWith(
      'abc',
    )
  })

  it('throws when mail id is missing or blank', async () => {
    await expect(getFetchedEmailByMailId('')).rejects.toThrow('Missing mail id')
    await expect(getFetchedEmailByMailId('   ')).rejects.toThrow('Missing mail id')
    await expect(getFetchedEmailByMailId(null)).rejects.toThrow('Missing mail id')
  })
})

describe('listTransactions', () => {
  beforeEach(() => {
    vi.mocked(transactionsApi.listTransactionsApiV1TransactionsGet).mockReset()
  })

  const baseTx = {
    id: 1,
    transacted_at: '2024-06-01T12:00:00Z',
    created_at: '2024-06-01T12:00:01Z',
    amount_parsed: 25.5,
    direction: 'DEBIT',
    amount: '25.50',
    currency: 'USD',
    provider: 'bank',
    transaction_type: 'purchase',
    sub_type: null,
    status: 'posted',
    txn_id: 't1',
    mail_id: 'm1',
    merchant: 'Coffee',
    category: 'food',
    account_id: 'a1',
    account_type: 'checking',
  }

  it('maps items and uses API response totals', async () => {
    vi.mocked(transactionsApi.listTransactionsApiV1TransactionsGet).mockResolvedValue({
      data: {
        items: [baseTx],
        total: 42,
        page: 2,
        page_size: 25,
      },
    })

    const out = await listTransactions({ query: 'coffee', page: 2, pageSize: 25 })

    expect(transactionsApi.listTransactionsApiV1TransactionsGet).toHaveBeenCalledWith(
      2,
      25,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      'coffee',
      'transacted_at',
      'desc',
    )

    expect(out.total).toBe(42)
    expect(out.page).toBe(2)
    expect(out.pageSize).toBe(25)
    expect(out.items).toHaveLength(1)
    expect(out.items[0].merchant).toBe('Coffee')
    expect(out.items[0].amount).toBe(-25.5)
    expect(out.items[0].raw).toEqual(baseTx)
  })

  it('uses positive amount for CREDIT direction', async () => {
    vi.mocked(transactionsApi.listTransactionsApiV1TransactionsGet).mockResolvedValue({
      data: {
        items: [{ ...baseTx, direction: 'CREDIT', amount_parsed: 100 }],
        total: 1,
        page: 1,
        page_size: 10,
      },
    })

    const out = await listTransactions({})
    expect(out.items[0].amount).toBe(100)
  })
})

describe('listAccounts', () => {
  beforeEach(() => {
    vi.mocked(accountsApi.listAccountsApiV1AccountsGet).mockReset()
  })

  it('maps API rows for the Accounts page', async () => {
    vi.mocked(accountsApi.listAccountsApiV1AccountsGet).mockResolvedValue({
      data: [
        {
          account_id: 'chk-1',
          provider: 'chase',
          account_type: 'CHECKING',
          display_name: 'Checking',
          amount: 12842.53,
          count: 10,
          credit_amount: 13000,
          credit_count: 5,
          debit_amount: 157.47,
          debit_count: 5,
          id: 1,
        },
      ],
    })

    const rows = await listAccounts()

    expect(accountsApi.listAccountsApiV1AccountsGet).toHaveBeenCalled()
    expect(rows).toHaveLength(1)
    expect(rows[0]).toMatchObject({
      id: '1',
      account_id: 'chk-1',
      provider: 'chase',
      name: 'Checking',
      type: 'CHECKING',
      debitTotal: 157.47,
      creditTotal: 13000,
      net: 12842.53,
      balance: 12842.53,
      count: 10,
      currency: 'USD',
      hasConflict: false,
    })
  })

  it('sets hasConflict when _conflict is non-empty', async () => {
    vi.mocked(accountsApi.listAccountsApiV1AccountsGet).mockResolvedValue({
      data: [
        {
          account_id: 'a1',
          provider: 'p',
          amount: 0,
          count: 1,
          credit_amount: 0,
          credit_count: 0,
          debit_amount: 0,
          debit_count: 1,
          _conflict: [{ provider: 'x', count: 1 }],
        },
      ],
    })

    const rows = await listAccounts()
    expect(rows[0].hasConflict).toBe(true)
  })

  it('uses provider · account_id when display_name is blank', async () => {
    vi.mocked(accountsApi.listAccountsApiV1AccountsGet).mockResolvedValue({
      data: [
        {
          account_id: 'x',
          provider: 'bank',
          amount: 0,
          count: 0,
          credit_amount: 0,
          credit_count: 0,
          debit_amount: 0,
          debit_count: 0,
        },
      ],
    })

    const rows = await listAccounts()
    expect(rows[0].name).toBe('')
    expect(rows[0].account_id).toBe('x')
    expect(rows[0].provider).toBe('bank')
    expect(rows[0].id).toBe('bank:x')
  })

  it('throws with apiErrorMessage when the request fails', async () => {
    vi.mocked(accountsApi.listAccountsApiV1AccountsGet).mockRejectedValue({
      response: { data: { detail: 'nope' } },
    })

    await expect(listAccounts()).rejects.toThrow('nope')
  })
})

describe('upsertAccount', () => {
  beforeEach(() => {
    vi.mocked(accountsApi.putAccountApiV1AccountsPut).mockReset()
  })

  it('returns response data', async () => {
    vi.mocked(accountsApi.putAccountApiV1AccountsPut).mockResolvedValue({
      data: { account_id: 'a1', provider: 'bank' },
    })

    const out = await upsertAccount({
      account_id: 'a1',
      provider: 'bank',
      display_name: 'Main',
    })

    expect(out).toEqual({ account_id: 'a1', provider: 'bank' })
    expect(accountsApi.putAccountApiV1AccountsPut).toHaveBeenCalledWith({
      account_id: 'a1',
      provider: 'bank',
      display_name: 'Main',
    })
  })

  it('throws with apiErrorMessage when the request fails', async () => {
    vi.mocked(accountsApi.putAccountApiV1AccountsPut).mockRejectedValue({
      response: { data: { detail: 'reject' } },
    })

    await expect(
      upsertAccount({ account_id: 'a1', provider: 'bank' }),
    ).rejects.toThrow('reject')
  })
})

describe('Mock Services', () => {
  it('getDashboardStats resolves with mockStats', async () => {
    const stats = await getDashboardStats()
    expect(stats).toEqual(mockStats)
  })

  it('getAnalytics resolves with mockAnalytics', async () => {
    const analytics = await getAnalytics()
    expect(analytics).toEqual(mockAnalytics)
  })
})
