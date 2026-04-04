import { mockAnalytics, mockStats } from '../mocks/mockData'
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
export async function listUnparsedEmails() {
  const res = await emailsApi.listUnparsedEmailsApiV1EmailsUnparsedGet()
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
export async function listAccounts() {
  try {
    const res = await accountsApi.listAccountsApiV1AccountsGet()
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

/**
 * @param {{
 *   query?: string,
 *   page?: number,
 *   pageSize?: number,
 *   provider?: string,
 *   direction?: 'DEBIT'|'CREDIT',
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

  const txResult = await transactionsApi.listTransactionsApiV1TransactionsGet(
    currentPage,
    currentPageSize,
    undefined,
    providerParam,
    undefined,
    directionParam,
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
  { pageSize = 25, maxPages = 20, query, provider, direction } = {},
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

export async function getAnalytics() {
  await sleep(150)
  return mockAnalytics
}

