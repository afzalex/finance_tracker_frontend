# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev       # Dev server at http://localhost:5173 (HMR enabled)
npm run build     # Production build to dist/
npm run preview   # Preview production build locally
npm run lint      # ESLint check
npm run test      # Vitest (watch mode)
npm run test:run  # Vitest single run (CI)
npm run test:coverage  # Vitest with coverage report (generated `src/api` excluded)
```

Tests use **Vitest** + **React Testing Library** + **jsdom**. Everything lives under `src/tests/`: `setup.js`, `renderWithTheme.jsx`, and spec files (mirroring `components/`, `services/`, etc.).

## Architecture

This is the React frontend for **Finance Tracker** — a self-hosted Gmail-to-SQLite personal finance dashboard.

### Request Flow

```
Gmail → backend ingestion (CLI) → SQLite
                                     ↓
                         FastAPI REST API (port 8000)
                                     ↓
                     React SPA (Vite dev: 5173 / prod: 3000)
```

In production (Docker), Nginx serves the built SPA and reverse-proxies `/api/*` to `http://backend:8000`. In development, API calls must target `http://localhost:8000` directly (no proxy configured in `vite.config.js` yet).

### Backend API Endpoints

All endpoints are read-only GETs under `/api/v1/`. **All handlers are currently stubs** (return `NotImplementedError`) — the schemas and models are complete.

| Endpoint | Response schema |
|---|---|
| `GET /api/v1/transactions` | `TransactionListResponse` (paginated) |
| `GET /api/v1/accounts` | `list[AccountRead]` |
| `GET /api/v1/stats` | `list[MonthlyStats]` |
| `GET /api/v1/analytics/cashflow` | `list[CashflowPoint]` |
| `GET /api/v1/analytics/category-breakdown` | `list[CategoryBreakdown]` |
| `GET /api/v1/analytics/top-merchants` | `list[MerchantSummary]` |
| `GET /api/v1/analytics/recurring` | (stub) |
| `GET /api/v1/analytics/anomalies` | (stub) |
| `GET /health` | liveness check |

Key response shapes (from `../backend/app/schemas/__init__.py`):
- `TransactionRead`: `id, provider, account_id, amount, direction (DEBIT|CREDIT), merchant?, category?, transacted_at, mail_id, created_at`
- `CashflowPoint`: `month (YYYY-MM), income, expense`
- `CategoryBreakdown`: `category, total, transaction_count`
- `MerchantSummary`: `merchant, total, transaction_count`

### Current Frontend State

`src/App.jsx` is a Vite boilerplate scaffold — no real components exist yet. The project is ready for UI development. No UI library, HTTP client, state manager, or router has been installed.

### Production Deployment

```bash
# From project root
docker compose up --build
# Frontend → http://localhost:3000
# Backend API → http://localhost:8000/docs
```
