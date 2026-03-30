import {
  mockAccounts,
  mockAnalytics,
  mockStats,
} from '../mocks/mockData'
import { fetchedEmailsApi, transactionsApi } from './apiConfig'

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

export function apiErrorMessage(error) {
  const data = error?.response?.data
  const detail = data?.detail
  if (typeof detail === 'string') return detail
  if (Array.isArray(detail)) {
    const parts = detail.map((d) => d?.msg ?? d).filter(Boolean)
    if (parts.length) return parts.join(', ')
  }
  return error?.message ?? 'Request failed'
}

/**
 * Fetch cached email + enrichment using the generated API client.
 *
 * Note: current OpenAPI client fetches by numeric `fetched_email_id`:
 * `GET /api/v1/fetched-emails/{fetched_email_id}`.
 *
 * We accept the transaction's `mail_id` here because that's what the transaction model exposes.
 * If `mail_id` is not a numeric id in your backend, this will throw with a helpful error.
 */
export async function getFetchedEmailByMailId(mailId) {
  const raw = (mailId ?? '').trim()
  if (!raw) throw new Error('Missing mail id')

  const fetchedEmailId = Number.parseInt(raw, 10)
  if (!Number.isFinite(fetchedEmailId)) {
    throw new Error(
      `Email detail API expects numeric fetched_email_id; got mail_id=${JSON.stringify(raw)}`,
    )
  }

  const res =
    await fetchedEmailsApi.getFetchedEmailWithEnrichmentApiV1FetchedEmailsFetchedEmailIdGet(
      fetchedEmailId,
    )
  return res.data
}

function signedAmountFromTx(tx) {
  const n = tx.amount_parsed ?? 0
  return tx.direction === 'CREDIT' ? n : -n
}

function mapTransactionRow(tx) {
  const aid = tx.account_id ?? ''
  const accountLabel =
    [aid, tx.account_type].filter(Boolean).join(' · ') || '—'
  const typeParts = [tx.transaction_type, tx.sub_type].filter(Boolean)
  return {
    id: String(tx.id),
    date: tx.transacted_at,
    merchant: tx.merchant ?? '—',
    description: typeParts.length ? typeParts.join(' · ') : '—',
    provider: tx.provider ?? '—',
    account: accountLabel,
    amount: signedAmountFromTx(tx),
    amountRaw:
      tx.amount != null && String(tx.amount).trim() !== ''
        ? String(tx.amount)
        : '—',
    currency: tx.currency ?? 'USD',
    raw: tx,
  }
}

export async function getDashboardStats() {
  await sleep(150)
  return mockStats
}

export async function listAccounts() {
  await sleep(150)
  return mockAccounts
}

export async function listTransactions({ query, page, pageSize } = {}) {
  const currentPage = Math.max(1, page ?? 1)
  const currentPageSize = Math.max(1, pageSize ?? 10)
  const search = (query ?? '').trim() || undefined

  const txResult = await transactionsApi.listTransactionsApiV1TransactionsGet(
    currentPage,
    currentPageSize,
    undefined,
    undefined,
    undefined,
    undefined,
    undefined,
    undefined,
    search,
    'transacted_at',
    'desc',
  )

  const body = txResult.data
  const items = (body.items ?? []).map((tx) => mapTransactionRow(tx))

  return {
    items,
    total: body.total ?? 0,
    page: body.page ?? currentPage,
    pageSize: body.page_size ?? currentPageSize,
  }
}

export async function getAnalytics() {
  await sleep(150)
  return mockAnalytics
}

