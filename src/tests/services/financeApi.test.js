import { beforeEach, describe, expect, it, vi } from 'vitest'
import { emailsApi, transactionsApi } from '../../services/apiConfig'
import {
  apiErrorMessage,
  getFetchedEmailByMailId,
  listTransactions,
  getDashboardStats,
  listAccounts,
  getAnalytics,
} from '../../services/financeApi'
import { mockAccounts, mockStats, mockAnalytics } from '../../mocks/mockData'

vi.mock('../../services/apiConfig', () => ({
  emailsApi: {
    getEmailByMailIdApiV1EmailsMailIdGet: vi.fn(),
  },
  transactionsApi: {
    listTransactionsApiV1TransactionsGet: vi.fn(),
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

describe('Mock Services', () => {
  it('getDashboardStats resolves with mockStats', async () => {
    const stats = await getDashboardStats()
    expect(stats).toEqual(mockStats)
  })

  it('listAccounts resolves with mockAccounts', async () => {
    const accounts = await listAccounts()
    expect(accounts).toEqual(mockAccounts)
  })

  it('getAnalytics resolves with mockAnalytics', async () => {
    const analytics = await getAnalytics()
    expect(analytics).toEqual(mockAnalytics)
  })
})
