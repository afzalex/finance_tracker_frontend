import { mockAnalytics, mockStats, mockTransactions } from '../mocks/mockData'
import {
  accountsApi,
  adminApi,
  analyticsApi,
  apiBasePath,
  emailsApi,
  metadataApi,
  transactionsApi,
  appConfigApi,
  mailAccountsApi,
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
 * POST /api/v1/emails/match-preview — scan cached mail for regex matches.
 * With `mail_id`, response includes `matched` for that row; without it, returns up to `limit` hits.
 * Batch `items[]` may include full mail body as `body_text` (or `body`) when the API provides it for extract preview.
 *
 * @param {Record<string, unknown>} payload
 * @param {{ signal?: AbortSignal }} [opts]
 */
export async function postEmailMatchPreview(payload, opts = {}) {
  const base = (apiBasePath || '').replace(/\/+$/, '')
  const abs = base ? `${base}/api/v1/emails/match-preview` : `/api/v1/emails/match-preview`
  const res = await fetch(abs, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(payload),
    signal: opts.signal,
  })
  const text = await res.text()
  let data = null
  if (text) {
    try {
      data = JSON.parse(text)
    } catch {
      data = null
    }
  }
  if (!res.ok) {
    const detail = data?.detail
    let msg
    if (typeof detail === 'string') msg = detail
    else if (Array.isArray(detail)) {
      msg = detail.map((d) => d?.msg ?? d).filter(Boolean).join(', ')
    } else {
      msg = text || res.statusText || `HTTP ${res.status}`
    }
    const err = new Error(msg)
    err.status = res.status
    err.response = { data }
    throw err
  }
  return data
}

/**
 * POST /api/v1/emails/extract-regex-preview — first-match spans for extract regexes on one cached mail.
 *
 * @param {{
 *   mail_id: string,
 *   subject_extract_regex?: string,
 *   body_extract_regex?: string,
 *   snippet_extract_regex?: string,
 * }} payload
 * @param {{ signal?: AbortSignal }} [opts]
 */
export async function postEmailExtractRegexPreview(payload, opts = {}) {
  const base = (apiBasePath || '').replace(/\/+$/, '')
  const abs = base
    ? `${base}/api/v1/emails/extract-regex-preview`
    : `/api/v1/emails/extract-regex-preview`
  const res = await fetch(abs, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(payload),
    signal: opts.signal,
  })
  const text = await res.text()
  let data = null
  if (text) {
    try {
      data = JSON.parse(text)
    } catch {
      data = null
    }
  }
  if (!res.ok) {
    const detail = data?.detail
    let msg
    if (typeof detail === 'string') msg = detail
    else if (Array.isArray(detail)) {
      msg = detail.map((d) => d?.msg ?? d).filter(Boolean).join(', ')
    } else {
      msg = text || res.statusText || `HTTP ${res.status}`
    }
    const err = new Error(msg)
    err.status = res.status
    err.response = { data }
    throw err
  }
  return data
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
 * GET /api/v1/emails/top-with-transactions — cached emails with enrichment that have ledger rows (same `mail_id`).
 * @param {{ limit?: number }} [opts]
 * @returns {Promise<import('../api').FetchedEmailWithLinkedTransactionsRead[]>}
 */
export async function listTopEmailsWithTransactions({ limit = 8 } = {}) {
  const lim = Math.min(100, Math.max(1, Number(limit) || 8))
  try {
    const res =
      await emailsApi.topEmailsWithTransactionsApiV1EmailsTopWithTransactionsGet(
        lim,
      )
    return res.data ?? []
  } catch (err) {
    throw new Error(apiErrorMessage(err))
  }
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
    currency: tx.currency ?? 'INR',
    raw: tx,
  }
}

export async function getDashboardStats() {
  await sleep(150)
  return mockStats
}

/**
 * GET /api/v1/analytics/transaction-summary — credit/debit sums, net, and counts
 * (same filters as list transactions). `from` / `to` are YYYY-MM-DD, inclusive.
 * @param {{ from: string, to: string }} opts
 * @returns {Promise<{ net: number, totalCredit: number, totalDebit: number, count: number, creditCount: number, debitCount: number }>}
 */
export async function getTransactionSummary({ from, to } = {}) {
  const fromParam = normalizeYmd(from)
  const toParam = normalizeYmd(to)
  if (!fromParam || !toParam) {
    throw new Error('from and to dates (YYYY-MM-DD) are required')
  }
  try {
    const res =
      await analyticsApi.transactionSummaryApiV1AnalyticsTransactionSummaryGet(
        undefined,
        undefined,
        undefined,
        undefined,
        fromParam,
        toParam,
        undefined,
        undefined,
        undefined,
      )
    const d = res.data
    return {
      net: d.amount ?? 0,
      totalCredit: d.credit_amount ?? 0,
      totalDebit: d.debit_amount ?? 0,
      count: d.count ?? 0,
      creditCount: d.credit_count ?? 0,
      debitCount: d.debit_count ?? 0,
    }
  } catch (err) {
    throw new Error(apiErrorMessage(err))
  }
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
        currency: 'INR',
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

/** GET /api/v1/mail-accounts */
export async function listMailAccounts() {
  try {
    const res = await mailAccountsApi.listMailAccountsApiV1MailAccountsGet()
    const data = res.data
    if (Array.isArray(data)) return data
    if (data && Array.isArray(data.items)) return data.items
    return []
  } catch (err) {
    throw new Error(apiErrorMessage(err))
  }
}

/** GET /api/v1/app-config */
export async function getAppConfig(mailAccountId = 0) {
  try {
    const res = await appConfigApi.listAppConfigApiV1AppConfigGet(false, mailAccountId)
    const data = res.data
    if (Array.isArray(data)) return data
    if (data && Array.isArray(data.items)) return data.items
    return []
  } catch (err) {
    throw new Error(apiErrorMessage(err))
  }
}

/** PATCH /api/v1/app-config/{key} */
export async function updateAppConfig(key, value, mailAccountId = 0) {
  try {
    const res = await appConfigApi.updateAppConfigApiV1AppConfigKeyPatch(
      key,
      { value },
      mailAccountId
    )
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
 * @param {Date} [now]
 * @returns {{ from: string, to: string }} YYYY-MM-DD — `from` = 1st of month 12 months before `now`’s month; `to` = local calendar date of `now`.
 */
export function getCashflowQueryRangeToday(now = new Date()) {
  const y = now.getFullYear()
  const m = now.getMonth() + 1
  const d = now.getDate()
  const toOut = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`
  const start = new Date(y, m - 1 - 12, 1)
  const sy = start.getFullYear()
  const sm = start.getMonth() + 1
  const fromOut = `${sy}-${String(sm).padStart(2, '0')}-01`
  return { from: fromOut, to: toOut }
}

/**
 * @param {{
 *   query?: string,
 *   page?: number,
 *   pageSize?: number,
 *   provider?: string,
 *   direction?: 'DEBIT'|'CREDIT',
 *   counterparty?: string,
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
  counterparty,
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
  const counterpartyParam =
    counterparty != null && String(counterparty).trim() !== ''
      ? String(counterparty).trim()
      : undefined

  // Arg order must match generated TransactionsApi: … dateTo, counterparty, search, sortBy, sortOrder.
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
    counterpartyParam,
    search,
    sortBy,
    sortOrder,
    undefined,
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
  {
    pageSize = 25,
    maxPages = 20,
    query,
    provider,
    direction,
    counterparty,
    from,
    to,
  } = {},
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
      counterparty,
      from,
      to,
    })
    const match = (res.items ?? []).find((t) => String(t.id) === id)
    if (match) return match
    if ((res.items ?? []).length === 0) break
  }

  return null
}

/**
 * Finds the first transaction row whose `raw.mail_id` matches (paged scan; no date filters).
 * Used to open transaction detail → Source tab from a `mail_id` deep link.
 */
export async function findFirstTransactionRowByMailId(
  mailId,
  { pageSize = 25, maxPages = 40 } = {},
) {
  const mid = String(mailId ?? '').trim()
  if (!mid) throw new Error('Missing mail id')

  for (let p = 1; p <= maxPages; p += 1) {
    const res = await listTransactions({
      page: p,
      pageSize,
    })
    const match = (res.items ?? []).find(
      (t) =>
        t.raw?.mail_id != null && String(t.raw.mail_id).trim() === mid,
    )
    if (match) return match
    if ((res.items ?? []).length === 0) break
  }

  return null
}

/** GET /api/v1/transactions/distinct — provider / merchant / counterparty pickers (scoped to range). */
export async function listTransactionDistinctCatalog({ from, to } = {}) {
  const res =
    await transactionsApi.distinctTransactionCatalogApiV1TransactionsDistinctGet(
      true,
      from ?? undefined,
      to ?? undefined,
      undefined,
      undefined,
    )
  return res.data
}

/**
 * Cashflow from `GET /api/v1/analytics/cashflow` when `from`/`to` are set.
 * Uses the same `from`/`to` as the analytics period (e.g. Analytics PERIOD dropdown). Returned
 * cashflow rows are sorted by `month` descending. `cashflowRange` echoes those bounds. Category
 * breakdown still uses the exact `from`/`to` and mock txs.
 * @param {{ from?: string, to?: string }} [opts]
 */
export async function getAnalytics({ from, to } = {}) {
  const fromP = normalizeYmd(from)
  const toP = normalizeYmd(to)
  if (!fromP || !toP) {
    await sleep(150)
    return mockAnalytics
  }

  let cashflow
  try {
    const res = await analyticsApi.cashflowApiV1AnalyticsCashflowGet(
      undefined,
      undefined,
      undefined,
      undefined,
      fromP,
      toP,
      undefined,
      undefined,
      undefined,
    )
    cashflow = (res.data ?? [])
      .map((row) => ({
        month: row.month,
        credit: row.credit ?? 0,
        debit: row.debit ?? 0,
        total: row.total ?? 0,
        count: row.count ?? 0,
      }))
      .sort((a, b) => String(b.month).localeCompare(String(a.month)))
  } catch (err) {
    throw new Error(apiErrorMessage(err))
  }

  const categoryBreakdownMap = Object.create(null)
  for (const tx of mockTransactions) {
    if (tx.date < fromP || tx.date > toP) continue
    if (tx.amount < 0) {
      const spend = -tx.amount
      const cat = tx.category || '—'
      categoryBreakdownMap[cat] = (categoryBreakdownMap[cat] || 0) + spend
    }
  }
  const categoryBreakdown = Object.entries(categoryBreakdownMap)
    .map(([category, total]) => ({ category, total }))
    .sort((a, b) => b.total - a.total)

  return {
    cashflow,
    categoryBreakdown,
    cashflowRange: { from: fromP, to: toP },
  }
}

const DEFAULT_TOP_MERCHANTS_LIMIT = 50

/**
 * GET /api/v1/analytics/top-merchants — top payees by spend (merchant, else counterparty name, else `__UNDEFINED__`).
 * When `from` and `to` fall in the same calendar month, passes `month=YYYY-MM`; otherwise omits `month` (backend default window).
 * @param {{ from: string, to: string, limit?: number }} opts
 * @returns {Promise<Array<{
 *   merchant: string,
 *   total: number,
 *   transactionCount: number,
 * }>>}
 */
export async function listTopMerchants({
  from,
  to,
  limit = DEFAULT_TOP_MERCHANTS_LIMIT,
} = {}) {
  const fromP = normalizeYmd(from)
  const toP = normalizeYmd(to)
  if (!fromP || !toP) {
    throw new Error('from and to dates (YYYY-MM-DD) are required')
  }
  const month =
    fromP.slice(0, 7) === toP.slice(0, 7) ? fromP.slice(0, 7) : undefined
  try {
    const res = await analyticsApi.topMerchantsApiV1AnalyticsTopMerchantsGet(
      month,
      limit,
      undefined,
      undefined,
      undefined,
      fromP,
      toP,
      undefined,
      undefined,
      undefined,
    )
    return (res.data ?? []).map((row) => {
      const m = row.merchant
      const merchant =
        m != null && String(m).trim() !== '' ? String(m).trim() : '—'
      return {
        merchant,
        total: row.total ?? 0,
        transactionCount: row.transaction_count ?? 0,
      }
    })
  } catch (err) {
    throw new Error(apiErrorMessage(err))
  }
}

