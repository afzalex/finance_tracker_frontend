import {
  mockAccounts,
  mockAnalytics,
  mockStats,
  mockTransactions,
} from '../mocks/mockData'

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

// Mock "API client" boundary.
// Later we can swap these implementations to real `fetch()` calls
// without rewriting the pages.

export async function getDashboardStats() {
  await sleep(150)
  return mockStats
}

export async function listAccounts() {
  await sleep(150)
  return mockAccounts
}

export async function listTransactions({ query, page, pageSize } = {}) {
  await sleep(150)

  const q = (query ?? '').trim().toLowerCase()

  let items = [...mockTransactions].sort((a, b) => b.date.localeCompare(a.date))
  if (q) {
    items = items.filter((t) => {
      const haystack = `${t.description} ${t.merchant} ${t.category}`.toLowerCase()
      return haystack.includes(q)
    })
  }

  const currentPage = Math.max(1, page ?? 1)
  const currentPageSize = Math.max(1, pageSize ?? 10)
  const total = items.length
  const start = (currentPage - 1) * currentPageSize
  const paged = items.slice(start, start + currentPageSize)

  return {
    items: paged,
    total,
    page: currentPage,
    pageSize: currentPageSize,
  }
}

export async function getAnalytics() {
  await sleep(150)
  return mockAnalytics
}

