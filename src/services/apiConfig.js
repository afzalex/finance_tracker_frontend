import { Configuration, EmailsApi, TransactionsApi } from '../api'

export const apiBasePath =
  (import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000').replace(
    /\/+$/,
    '',
  )

const configuration = new Configuration({ basePath: apiBasePath })

export const transactionsApi = new TransactionsApi(configuration)
export const emailsApi = new EmailsApi(configuration)
