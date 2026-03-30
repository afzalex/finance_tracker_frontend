import { AccountsApi, Configuration, TransactionsApi } from '../api'

const basePath =
  (import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000').replace(
    /\/+$/,
    '',
  )

const configuration = new Configuration({ basePath })

export const accountsApi = new AccountsApi(configuration)
export const transactionsApi = new TransactionsApi(configuration)
