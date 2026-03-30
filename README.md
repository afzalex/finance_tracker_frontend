# Finance Tracker — Frontend

React SPA for the self-hosted Finance Tracker dashboard. Ingests financial data from Gmail via a FastAPI backend and presents it as an interactive personal finance dashboard.

## Stack

- **React** (Vite, HMR)
- **Backend**: FastAPI at `http://localhost:8000` (dev) / reverse-proxied via Nginx (prod)

## Commands

```bash
npm run dev       # Dev server at http://localhost:5173
npm run build     # Production build to dist/
npm run preview   # Preview production build locally
npm run lint      # ESLint check
```

## Pages & Components

| Page | Description |
|---|---|
| **Dashboard** | Financial overview with summary widgets (balance, recent activity, spending highlights) |
| **Transactions** | Full transaction list with filtering, sorting, and pagination |
| **Accounts** | All linked accounts and their current balances |
| **Budget** | Credit/debit totals, spending limits, and budget summaries |
| **Analytics** | Trends, category breakdowns, top merchants, cashflow charts, anomaly detection |
| **Parsers** | Create, update, and delete email parsers for transaction ingestion |
| **Classifiers** | Create, update, and delete transaction classifiers for auto-categorization |

## Backend API

All endpoints are read-only GETs under `/api/v1/`:

| Endpoint | Purpose |
|---|---|
| `GET /api/v1/transactions` | Paginated transaction list |
| `GET /api/v1/accounts` | All accounts |
| `GET /api/v1/stats` | Monthly stats |
| `GET /api/v1/analytics/cashflow` | Income vs expense over time |
| `GET /api/v1/analytics/category-breakdown` | Spend by category |
| `GET /api/v1/analytics/top-merchants` | Top merchants by spend |
| `GET /api/v1/analytics/recurring` | Recurring transaction patterns |
| `GET /api/v1/analytics/anomalies` | Anomaly detection |
| `GET /health` | Liveness check |

## Production Deployment

```bash
# From project root
docker compose up --build
# Frontend → http://localhost:3000
# Backend API → http://localhost:8000/docs
```

In production, Nginx serves the built SPA and reverse-proxies `/api/*` to the backend container.
