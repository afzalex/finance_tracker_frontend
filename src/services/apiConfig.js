import {
  AdminApi,
  ClassificationsApi,
  Configuration,
  EmailsApi,
  MetadataApi,
  ParsersApi,
  TransactionsApi,
} from '../api'

// In production (Docker) the SPA is served by the same server as the API,
// so relative URLs work and no base URL is needed.
// For local dev, set VITE_API_BASE_URL=http://localhost:8000 in .env.local
export const apiBasePath = (import.meta.env.VITE_API_BASE_URL ?? '').replace(
  /\/+$/,
  '',
)

const configuration = new Configuration({ basePath: apiBasePath })

export const transactionsApi = new TransactionsApi(configuration)
export const emailsApi = new EmailsApi(configuration)
export const metadataApi = new MetadataApi(configuration)
export const adminApi = new AdminApi(configuration)
export const classificationsApi = new ClassificationsApi(configuration)
export const parsersApi = new ParsersApi(configuration)
