import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  accountsApi,
  analyticsApi,
  emailsApi,
  transactionsApi,
} from '../../services/apiConfig'
import {
  apiErrorMessage,
  getFetchedEmailByMailId,
  listTopEmailsWithTransactions,
  listTransactions,
  findFirstTransactionRowByMailId,
  getDashboardStats,
  getTransactionSummary,
  listTopMerchants,
  listAccounts,
  getAnalytics,
  upsertAccount,
} from '../../services/financeApi'
import { mockStats, mockAnalytics } from '../../mocks/mockData'

vi.mock('../../services/apiConfig', () => ({
  emailsApi: {
    getEmailByMailIdApiV1EmailsMailIdGet: vi.fn(),
    topEmailsWithTransactionsApiV1EmailsTopWithTransactionsGet: vi.fn(),
  },
  transactionsApi: {
    listTransactionsApiV1TransactionsGet: vi.fn(),
  },
  analyticsApi: {
    transactionSummaryApiV1AnalyticsTransactionSummaryGet: vi.fn(),
    topMerchantsApiV1AnalyticsTopMerchantsGet: vi.fn(),
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

describe('listTopEmailsWithTransactions', () => {
  beforeEach(() => {
    vi.mocked(
      emailsApi.topEmailsWithTransactionsApiV1EmailsTopWithTransactionsGet,
    ).mockReset()
  })

  it('returns response data array', async () => {
    const row = {
      id: 1,
      mail_id: 'm1',
      subject: 'Hi',
      sender: 'a@b.com',
      snippet: null,
      body_text: '',
      created_at: '2026-01-01T00:00:00Z',
      internal_date_ms: 0,
      last_transacted_at: '2026-01-02T00:00:00Z',
      transaction_count: 2,
      enrichment: {
        created_at: '2026-01-01T00:00:00Z',
        fetched_email_id: 1,
        updated_at: '2026-01-01T00:00:00Z',
      },
    }
    vi.mocked(
      emailsApi.topEmailsWithTransactionsApiV1EmailsTopWithTransactionsGet,
    ).mockResolvedValue({ data: [row] })

    await expect(listTopEmailsWithTransactions({ limit: 5 })).resolves.toEqual([
      row,
    ])
    expect(
      emailsApi.topEmailsWithTransactionsApiV1EmailsTopWithTransactionsGet,
    ).toHaveBeenCalledWith(5)
  })

  it('throws with apiErrorMessage when the request fails', async () => {
    vi.mocked(
      emailsApi.topEmailsWithTransactionsApiV1EmailsTopWithTransactionsGet,
    ).mockRejectedValue({
      response: { data: { detail: 'no' } },
    })

    await expect(listTopEmailsWithTransactions()).rejects.toThrow('no')
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
    currency: 'INR',
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

  it('passes valid YYYY-MM-DD from/to and drops invalid `to`', async () => {
    vi.mocked(transactionsApi.listTransactionsApiV1TransactionsGet).mockResolvedValue({
      data: { items: [], total: 0, page: 1, page_size: 10 },
    })
    await listTransactions({ from: '2024-01-15', to: 'bad', page: 1, pageSize: 10 })
    expect(transactionsApi.listTransactionsApiV1TransactionsGet).toHaveBeenCalledWith(
      1,
      10,
      undefined,
      undefined,
      undefined,
      undefined,
      '2024-01-15',
      undefined,
      undefined,
      undefined,
      undefined,
      'transacted_at',
      'desc',
    )
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

describe('findFirstTransactionRowByMailId', () => {
  beforeEach(() => {
    vi.mocked(transactionsApi.listTransactionsApiV1TransactionsGet).mockReset()
  })

  const tx = {
    id: 1,
    transacted_at: '2024-06-01T12:00:00Z',
    created_at: '2024-06-01T12:00:01Z',
    amount_parsed: 1,
    direction: 'DEBIT',
    amount: '1',
    currency: 'INR',
    provider: 'bank',
    transaction_type: 'purchase',
    sub_type: null,
    status: 'posted',
    txn_id: 't1',
    mail_id: 'm-a',
    merchant: 'A',
    category: 'food',
    account_id: 'a1',
    account_type: 'checking',
  }

  it('returns first row whose raw.mail_id matches across pages', async () => {
    const txTarget = { ...tx, id: 99, mail_id: 'gmail-target' }
    vi.mocked(transactionsApi.listTransactionsApiV1TransactionsGet)
      .mockResolvedValueOnce({
        data: { items: [{ ...tx, id: 2, mail_id: 'other' }], total: 5, page: 1, page_size: 1 },
      })
      .mockResolvedValueOnce({
        data: { items: [txTarget], total: 5, page: 2, page_size: 1 },
      })

    const row = await findFirstTransactionRowByMailId('gmail-target', {
      pageSize: 1,
      maxPages: 5,
    })
    expect(row?.id).toBe('99')
    expect(row?.raw?.mail_id).toBe('gmail-target')
    expect(transactionsApi.listTransactionsApiV1TransactionsGet).toHaveBeenCalledTimes(2)
  })

  it('returns null when not found within maxPages', async () => {
    vi.mocked(transactionsApi.listTransactionsApiV1TransactionsGet).mockResolvedValue({
      data: { items: [tx], total: 1, page: 1, page_size: 25 },
    })
    await expect(
      findFirstTransactionRowByMailId('missing', { pageSize: 25, maxPages: 2 }),
    ).resolves.toBeNull()
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
      currency: 'INR',
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

describe('getTransactionSummary', () => {
  beforeEach(() => {
    vi.mocked(
      analyticsApi.transactionSummaryApiV1AnalyticsTransactionSummaryGet,
    ).mockReset()
  })

  it('maps TransactionSummaryRead to UI fields', async () => {
    vi.mocked(
      analyticsApi.transactionSummaryApiV1AnalyticsTransactionSummaryGet,
    ).mockResolvedValue({
      data: {
        amount: 12.5,
        count: 9,
        credit_amount: 100,
        credit_count: 4,
        debit_amount: 87.5,
        debit_count: 5,
      },
    })

    await expect(
      getTransactionSummary({ from: '2026-04-01', to: '2026-04-30' }),
    ).resolves.toEqual({
      net: 12.5,
      totalCredit: 100,
      totalDebit: 87.5,
      count: 9,
      creditCount: 4,
      debitCount: 5,
    })
    expect(
      analyticsApi.transactionSummaryApiV1AnalyticsTransactionSummaryGet,
    ).toHaveBeenCalledWith(
      undefined,
      undefined,
      undefined,
      undefined,
      '2026-04-01',
      '2026-04-30',
      undefined,
      undefined,
      undefined,
    )
  })

  it('throws when from or to is missing', async () => {
    await expect(getTransactionSummary({ from: '2026-04-01' })).rejects.toThrow(
      'from and to dates',
    )
  })

  it('throws with apiErrorMessage when the request fails', async () => {
    vi.mocked(
      analyticsApi.transactionSummaryApiV1AnalyticsTransactionSummaryGet,
    ).mockRejectedValue({
      response: { data: { detail: 'bad range' } },
    })

    await expect(
      getTransactionSummary({ from: '2026-04-01', to: '2026-04-30' }),
    ).rejects.toThrow('bad range')
  })
})

describe('listTopMerchants', () => {
  beforeEach(() => {
    vi.mocked(analyticsApi.topMerchantsApiV1AnalyticsTopMerchantsGet).mockReset()
  })

  it('passes month when range is a single calendar month', async () => {
    vi.mocked(analyticsApi.topMerchantsApiV1AnalyticsTopMerchantsGet).mockResolvedValue({
      data: [
        { merchant: 'Acme', total: 10, transaction_count: 2 },
      ],
    })

    await expect(
      listTopMerchants({ from: '2026-04-01', to: '2026-04-15', limit: 20 }),
    ).resolves.toEqual([
      { merchant: 'Acme', total: 10, transactionCount: 2 },
    ])
    expect(
      analyticsApi.topMerchantsApiV1AnalyticsTopMerchantsGet,
    ).toHaveBeenCalledWith('2026-04', 20)
  })

  it('omits month when range spans multiple months', async () => {
    vi.mocked(analyticsApi.topMerchantsApiV1AnalyticsTopMerchantsGet).mockResolvedValue({
      data: [],
    })

    await listTopMerchants({ from: '2026-03-01', to: '2026-04-30' })
    expect(
      analyticsApi.topMerchantsApiV1AnalyticsTopMerchantsGet,
    ).toHaveBeenCalledWith(undefined, 50)
  })

  it('throws with apiErrorMessage when the request fails', async () => {
    vi.mocked(analyticsApi.topMerchantsApiV1AnalyticsTopMerchantsGet).mockRejectedValue({
      response: { data: { detail: 'nope' } },
    })

    await expect(
      listTopMerchants({ from: '2026-04-01', to: '2026-04-30' }),
    ).rejects.toThrow('nope')
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
