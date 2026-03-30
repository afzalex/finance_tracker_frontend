import axios from 'axios'
import {
  mockAccounts,
  mockAnalytics,
  mockStats,
} from '../mocks/mockData'
import { accountsApi, apiBasePath, transactionsApi } from './apiConfig'

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

/** Cached email + optional enrichment for a provider ``mail_id`` (see ``GET /api/v1/fetched-emails/by-mail-id``). */
export async function getFetchedEmailByMailId(mailId) {
  const mid = (mailId ?? '').trim()
  if (!mid) {
    throw new Error('Missing mail id')
  }
  const { data } = await axios.get(
    `${apiBasePath}/api/v1/fetched-emails/by-mail-id`,
    { params: { mail_id: mid } },
  )
  return data
}

function signedAmountFromTx(tx) {
  const n = tx.amount_parsed ?? 0
  return tx.direction === 'CREDIT' ? n : -n
}

function mapTransactionRow(tx, accountById) {
  const aid = tx.account_id ?? ''
  const acc = aid ? accountById.get(aid) : null
  const accountLabel =
    acc?.display_name ?? acc?.account_id ?? (aid || '—')
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

  const [accountsResult, txResult] = await Promise.allSettled([
    accountsApi.listAccountsApiV1AccountsGet(),
    transactionsApi.listTransactionsApiV1TransactionsGet(
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
    ),
  ])

  if (txResult.status === 'rejected') {
    throw new Error(apiErrorMessage(txResult.reason))
  }

  const accountById = new Map()
  if (accountsResult.status === 'fulfilled') {
    for (const a of accountsResult.value.data ?? []) {
      accountById.set(a.account_id, a)
    }
  }

  const body = txResult.value.data
  const items = (body.items ?? []).map((tx) =>
    mapTransactionRow(tx, accountById),
  )

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

