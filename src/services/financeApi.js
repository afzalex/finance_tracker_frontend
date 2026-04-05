import { mockAnalytics, mockStats, mockTransactions } from '../mocks/mockData'
import {
  accountsApi,
  adminApi,
  emailsApi,
  metadataApi,
  transactionsApi,
} from './apiConfig'

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

/** GET /api/v1/meta — high-level backend status for gating the UI. */
export async function getAppMetadata() {
  const res = await metadataApi.getMetadataApiV1MetaGet()
  return res.data
}

/**
 * Cached email row + optional nested enrichment.
 * `GET /api/v1/emails/{mail_id}` — `mail_id` is the provider message id (e.g. same as `transactions.mail_id`).
 */
export async function getFetchedEmailByMailId(mailId) {
  const raw = String(mailId ?? '').trim()
  if (!raw) throw new Error('Missing mail id')

  const res = await emailsApi.getEmailByMailIdApiV1EmailsMailIdGet(raw)
  return res.data
}

/**
 * Re-run classification + parsing for all cached emails (offline).
 * POST /api/v1/admin/emails/reprocess
 * @param {{ wait?: boolean }} [opts] wait=true runs synchronously (can be slow).
 */
export async function reprocessAllEmailsOffline({ wait = false } = {}) {
  const res =
    await adminApi.reprocessAllEmailsOfflineApiV1AdminEmailsReprocessPost(wait)
  return res.data
}

/**
 * Re-run classification + parsing for one cached email (offline).
 * POST /api/v1/emails/{mail_id}/reprocess
 */
export async function reprocessEmailByMailId(mailId) {
  const raw = String(mailId ?? '').trim()
  if (!raw) throw new Error('Missing mail id')

  const res = await emailsApi.reprocessEmailByMailIdApiV1EmailsMailIdReprocessPost(
    raw,
  )
  return res.data
}

/** GET /api/v1/emails/unparsed — list items omit body/snippet; includes queue `id` (unparsed_message_id). */
export async function listUnparsedEmails({ from, to } = {}) {
  const fromParam = normalizeYmd(from)
  const toParam = normalizeYmd(to)
  const res = await emailsApi.listUnparsedEmailsApiV1EmailsUnparsedGet(
    fromParam,
    toParam,
    undefined,
    undefined,
  )
  return res.data
}

/**
 * One unparsed queue row with full cached email + enrichment.
 * GET /api/v1/emails/unparsed/{unparsed_message_id}
 */
export async function getUnparsedEmailDetail(unparsedMessageId) {
  const id = Number(unparsedMessageId)
  if (!Number.isFinite(id)) throw new Error('Invalid unparsed message id')

  const res =
    await emailsApi.getUnparsedEmailDetailApiV1EmailsUnparsedUnparsedMessageIdGet(
      id,
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
    ...tx,
    id: String(tx.id),
    date: tx.transacted_at,
    description: typeParts.length ? typeParts.join(' · ') : '—',
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

/**
 * GET /api/v1/accounts — merged rollup per account (optional `_conflict` on row ignored in UI for now).
 * `name` is `display_name` trimmed only; use `account_id` and `provider` for identity.
 * @returns {Promise<Array<{
 *   id: string,
 *   account_id: string,
 *   provider: string,
 *   name: string,
 *   type: string,
 *   debitTotal: number,
 *   creditTotal: number,
 *   net: number,
 *   balance: number,
 *   count: number,
 *   currency: string,
 *   hasConflict: boolean,
 *   raw: import('../api').AccountFromTransactionsMergedRead,
 * }>>}
 */
export async function listAccounts({ from, to } = {}) {
  try {
    const fromParam = normalizeYmd(from)
    const toParam = normalizeYmd(to)
    const res = await accountsApi.listAccountsApiV1AccountsGet(
      fromParam,
      toParam,
      undefined,
      undefined,
    )
    const items = res.data ?? []
    return items.map((a) => {
      const name = String(a.display_name ?? '').trim()
      const net = a.amount
      const conflict = a._conflict
      const hasConflict = Array.isArray(conflict) && conflict.length > 0
      return {
        id:
          a.id != null && Number.isFinite(Number(a.id))
            ? String(a.id)
            : `${a.provider}:${a.account_id}`,
        account_id: a.account_id,
        provider: a.provider,
        name,
        type: a.account_type ?? '—',
        debitTotal: a.debit_amount,
        creditTotal: a.credit_amount,
        net,
        balance: net,
        count: a.count,
        currency: 'USD',
        hasConflict,
        raw: a,
      }
    })
  } catch (err) {
    throw new Error(apiErrorMessage(err))
  }
}

/** PUT /api/v1/accounts — create or update metadata for ``provider`` + ``account_id``. */
export async function upsertAccount(payload) {
  try {
    const res = await accountsApi.putAccountApiV1AccountsPut(payload)
    return res.data
  } catch (err) {
    throw new Error(apiErrorMessage(err))
  }
}

function normalizeYmd(value) {
  if (value == null) return undefined
  const s = String(value).trim()
  return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : undefined
}

/**
 * @param {{
 *   query?: string,
 *   page?: number,
 *   pageSize?: number,
 *   provider?: string,
 *   direction?: 'DEBIT'|'CREDIT',
 *   from?: string,
 *   to?: string,
 *   sortBy?: 'transacted_at'|'amount'|'merchant'|'provider'|'account_id'|'transaction_type'|'counterparty',
 *   sortOrder?: 'asc'|'desc',
 * }} [opts]
 */
export async function listTransactions({
  query,
  page,
  pageSize,
  sortBy = 'transacted_at',
  sortOrder = 'desc',
  provider,
  direction,
  from,
  to,
} = {}) {
  const currentPage = Math.max(1, page ?? 1)
  const currentPageSize = Math.max(1, pageSize ?? 10)
  const search = (query ?? '').trim() || undefined
  const providerParam =
    provider != null && String(provider).trim() !== ''
      ? String(provider).trim()
      : undefined
  const directionParam =
    direction === 'DEBIT' || direction === 'CREDIT' ? direction : undefined
  const fromParam = normalizeYmd(from)
  const toParam = normalizeYmd(to)

  // Arg order must match generated TransactionsApi (from/to/dateFrom/dateTo before search/sort).
  const txResult = await transactionsApi.listTransactionsApiV1TransactionsGet(
    currentPage,
    currentPageSize,
    undefined,
    providerParam,
    undefined,
    directionParam,
    fromParam,
    toParam,
    undefined,
    undefined,
    search,
    sortBy,
    sortOrder,
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

/**
 * Attempts to locate a transaction row by its numeric id by scanning pages.
 * This is used for deep-links like `/transactions/:id` when backend search does not support id lookup.
 */
export async function findTransactionRowById(
  transactionId,
  { pageSize = 25, maxPages = 20, query, provider, direction, from, to } = {},
) {
  const id = String(transactionId ?? '').trim()
  if (!id) throw new Error('Missing transaction id')

  for (let p = 1; p <= maxPages; p += 1) {
    const res = await listTransactions({
      page: p,
      pageSize,
      query,
      provider,
      direction,
      from,
      to,
    })
    const match = (res.items ?? []).find((t) => String(t.id) === id)
    if (match) return match
    if ((res.items ?? []).length === 0) break
  }

  return null
}

/** GET /api/v1/transactions/distinct — provider / merchant / counterparty pickers. */
export async function listTransactionDistinctCatalog() {
  const res =
    await transactionsApi.distinctTransactionCatalogApiV1TransactionsDistinctGet()
  return res.data
}

function calendarMonthOverlapsYmdRange(monthYm, fromYmd, toYmd) {
  const parts = String(monthYm ?? '').trim().split('-')
  if (parts.length < 2) return false
  const y = Number(parts[0])
  const m = Number(parts[1])
  if (!Number.isFinite(y) || !Number.isFinite(m) || m < 1 || m > 12) return false
  const pad = (n) => String(n).padStart(2, '0')
  const start = `${y}-${pad(m)}-01`
  const lastDay = new Date(y, m, 0).getDate()
  const end = `${y}-${pad(m)}-${pad(lastDay)}`
  return start <= toYmd && end >= fromYmd
}

/**
 * Analytics tables (currently mock); when `from`/`to` are set, narrows mock data to that range.
 * @param {{ from?: string, to?: string }} [opts]
 */
export async function getAnalytics({ from, to } = {}) {
  await sleep(150)
  const fromP = normalizeYmd(from)
  const toP = normalizeYmd(to)
  if (!fromP || !toP) return mockAnalytics

  const cashflow = mockAnalytics.cashflow.filter((row) =>
    calendarMonthOverlapsYmdRange(row.month, fromP, toP),
  )

  const categoryBreakdownMap = Object.create(null)
  const topMerchantsMap = Object.create(null)
  for (const tx of mockTransactions) {
    if (tx.date < fromP || tx.date > toP) continue
    if (tx.amount < 0) {
      const spend = -tx.amount
      const cat = tx.category || '—'
      const mer = tx.merchant || '—'
      categoryBreakdownMap[cat] = (categoryBreakdownMap[cat] || 0) + spend
      topMerchantsMap[mer] = (topMerchantsMap[mer] || 0) + spend
    }
  }
  const categoryBreakdown = Object.entries(categoryBreakdownMap)
    .map(([category, total]) => ({ category, total }))
    .sort((a, b) => b.total - a.total)
  const topMerchants = Object.entries(topMerchantsMap)
    .map(([merchant, total]) => ({ merchant, total }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 20)

  return { cashflow, categoryBreakdown, topMerchants }
}

