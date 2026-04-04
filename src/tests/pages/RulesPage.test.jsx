import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import RulesPage from '../../pages/RulesPage'
import { renderWithTheme } from '../renderWithTheme'

vi.mock('../../services/rulesApi', () => ({
  listClassifications: vi.fn(),
  createClassification: vi.fn(),
  patchClassification: vi.fn(),
  deactivateClassification: vi.fn(),
  listParsers: vi.fn(),
  createParser: vi.fn(),
  patchParser: vi.fn(),
  deactivateParser: vi.fn(),
}))

import {
  createClassification,
  deactivateClassification,
  listClassifications,
  listParsers,
  patchClassification,
  patchParser,
} from '../../services/rulesApi'
import { createParser } from '../../services/rulesApi'

function TxReturnStub() {
  return <div>Back on transactions</div>
}

function RulesRoutes() {
  return (
    <Routes>
      <Route
        path="/settings/rules/classifications"
        element={<RulesPage />}
      />
      <Route
        path="/settings/rules/classifications/:classificationId"
        element={<RulesPage />}
      />
      <Route path="/settings/rules/parsers" element={<RulesPage />} />
      <Route
        path="/settings/rules/parsers/:parserId"
        element={<RulesPage />}
      />
    </Routes>
  )
}

describe('RulesPage', () => {
  it('renders classifications by default and switches to parsers', async () => {
    vi.mocked(listClassifications).mockResolvedValueOnce([
      {
        id: 1,
        name: 'Cat A',
        message_type: 'TRANSACTION_ALERT',
        priority: 1,
        is_active: true,
        updated_at: '2024-01-01T00:00:00Z',
      },
    ])
    vi.mocked(listParsers).mockResolvedValueOnce([
      {
        id: 10,
        label: 'Extract',
        name: 'Parser 1',
        priority: 2,
        is_active: true,
        updated_at: '2024-01-02T00:00:00Z',
      },
    ])

    renderWithTheme(
      <MemoryRouter initialEntries={['/settings/rules/classifications']}>
        <RulesRoutes />
      </MemoryRouter>,
    )

    await waitFor(() => {
      expect(screen.getByText('Cat A')).toBeInTheDocument()
    })

    const user = userEvent.setup()
    await user.click(screen.getByRole('tab', { name: 'Parsers' }))

    await waitFor(() => {
      expect(screen.getByText('Parser 1')).toBeInTheDocument()
    })
  })

  it('creates a classification from the dialog', async () => {
    vi.mocked(listClassifications).mockResolvedValueOnce([])
    vi.mocked(listClassifications).mockResolvedValueOnce([
      {
        id: 2,
        name: 'Cat B',
        message_type: 'TRANSACTION_ALERT',
        priority: 1,
        is_active: true,
        updated_at: '2024-01-01T00:00:00Z',
      },
    ])

    vi.mocked(listParsers).mockResolvedValue([])

    vi.mocked(createClassification).mockResolvedValue({ id: 2 })

    renderWithTheme(
      <MemoryRouter initialEntries={['/settings/rules/classifications']}>
        <RulesRoutes />
      </MemoryRouter>,
    )

    await waitFor(() => {
      expect(screen.getByText('No classifications found.')).toBeInTheDocument()
    })

    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: 'Add' }))

    await waitFor(() => {
      expect(
        screen.getByRole('heading', { name: /Create classification/i }),
      ).toBeInTheDocument()
    })

    const messageTypeInput = screen.getByLabelText(/Message Type/i)
    const nameInput = screen.getByLabelText(/Name/i)

    await user.click(messageTypeInput)
    await user.click(await screen.findByRole('option', { name: /TRANSACTION ALERT/i }))
    await user.type(nameInput, 'Cat B')

    await user.click(screen.getByRole('button', { name: 'Create' }))

    await waitFor(() => {
      expect(screen.getByText('Cat B')).toBeInTheDocument()
    })

    await waitFor(() => {
      expect(
        screen.queryByRole('heading', { name: /Create classification/i }),
      ).not.toBeInTheDocument()
    })
  }, 15000)

  it('opens the correct create dialog for the active tab', async () => {
    vi.mocked(listClassifications).mockResolvedValue([])
    vi.mocked(listParsers).mockResolvedValue([])
    vi.mocked(createClassification).mockResolvedValue({ id: 1 })
    vi.mocked(createParser).mockResolvedValue({ id: 1 })

    renderWithTheme(
      <MemoryRouter initialEntries={['/settings/rules/classifications']}>
        <RulesRoutes />
      </MemoryRouter>,
    )

    const user = userEvent.setup()

    // Default tab: classifications
    await user.click(screen.getByRole('button', { name: 'Add' }))
    expect(
      await screen.findByRole('heading', { name: /Create classification/i }),
    ).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Cancel' }))
    await waitFor(() => {
      expect(
        screen.queryByRole('heading', { name: /Create classification/i }),
      ).not.toBeInTheDocument()
    })

    // Switch to parsers and open parser create dialog
    await user.click(screen.getByRole('tab', { name: 'Parsers' }))
    await user.click(screen.getByRole('button', { name: 'Add' }))
    expect(
      await screen.findByRole('heading', { name: /Create parser/i }),
    ).toBeInTheDocument()
  })

  it('warns when deactivating from edit on save (classifications)', async () => {
    vi.mocked(listClassifications).mockResolvedValue([
      {
        id: 1,
        name: 'Rule 1',
        message_type: 'TRANSACTION_ALERT',
        priority: 10,
        is_active: true,
        updated_at: '2026-01-01T00:00:00Z',
      },
    ])
    vi.mocked(listParsers).mockResolvedValue([])
    vi.mocked(patchClassification).mockResolvedValue({ id: 1 })
    vi.mocked(deactivateClassification).mockResolvedValue({ id: 1 })

    renderWithTheme(
      <MemoryRouter initialEntries={['/settings/rules/classifications']}>
        <RulesRoutes />
      </MemoryRouter>,
    )
    const user = userEvent.setup()

    await user.click(await screen.findByText('Rule 1'))
    expect(
      await screen.findByRole('heading', { name: /Edit classification/i }),
    ).toBeInTheDocument()

    await user.click(screen.getByRole('switch', { name: 'Active' }))
    await user.click(screen.getByRole('button', { name: 'Save' }))

    expect(
      await screen.findByRole('heading', { name: /Deactivate classification\?/i }),
    ).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Deactivate' }))

    await waitFor(() => {
      expect(vi.mocked(deactivateClassification)).toHaveBeenCalledWith(1)
    })
    expect(vi.mocked(patchClassification)).not.toHaveBeenCalled()
  })

  it('after classification save with returnTo, confirm redirects to that path', async () => {
    vi.mocked(listClassifications).mockResolvedValue([
      {
        id: 1,
        name: 'Rule 1',
        message_type: 'TRANSACTION_ALERT',
        priority: 10,
        is_active: true,
        updated_at: '2026-01-01T00:00:00Z',
        subject_match_regex: null,
        subject_extract_regex: null,
        sender_match_regex: null,
        body_match_regex: null,
        body_extract_regex: null,
        snippet_extract_regex: null,
      },
    ])
    vi.mocked(listParsers).mockResolvedValue([])
    vi.mocked(patchClassification).mockResolvedValue({ id: 1 })

    const returnPath = '/transactions/99?tab=email&page=0&ps=25'
    const entry = `/settings/rules/classifications/1?returnTo=${encodeURIComponent(returnPath)}`

    renderWithTheme(
      <MemoryRouter initialEntries={[entry]}>
        <Routes>
          <Route
            path="/settings/rules/classifications"
            element={<RulesPage />}
          />
          <Route
            path="/settings/rules/classifications/:classificationId"
            element={<RulesPage />}
          />
          <Route path="/transactions/:transactionId" element={<TxReturnStub />} />
        </Routes>
      </MemoryRouter>,
    )

    const user = userEvent.setup()
    expect(
      await screen.findByRole('heading', { name: /Edit classification/i }),
    ).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Save' }))

    await waitFor(() => {
      expect(vi.mocked(patchClassification)).toHaveBeenCalled()
    })

    expect(
      await screen.findByRole('heading', { name: /Return to Transaction Details\?/i }),
    ).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Continue' }))

    await waitFor(() => {
      expect(screen.getByText('Back on transactions')).toBeInTheDocument()
    })
  })

  it('after parser save with returnTo, confirm redirects to that path', async () => {
    vi.mocked(listClassifications).mockResolvedValue([])
    vi.mocked(listParsers).mockResolvedValue([
      {
        id: 1,
        label: 'L1',
        name: 'Parser 1',
        priority: 5,
        is_active: true,
        updated_at: '2026-01-01T00:00:00Z',
        transaction_type: null,
        sub_type: null,
        status: null,
        account_type: null,
        provider: null,
        subject_match_regex: null,
        subject_extract_regex: null,
        sender_match_regex: null,
        body_match_regex: null,
        body_extract_regex: null,
        snippet_extract_regex: null,
        txn_date_fmt: null,
        txn_time_fmt: null,
      },
    ])
    vi.mocked(patchParser).mockResolvedValue({ id: 1 })

    const returnPath = '/transactions/88?tab=email&page=0&ps=25'
    const entry = `/settings/rules/parsers/1?returnTo=${encodeURIComponent(returnPath)}`

    renderWithTheme(
      <MemoryRouter initialEntries={[entry]}>
        <Routes>
          <Route path="/settings/rules/parsers" element={<RulesPage />} />
          <Route
            path="/settings/rules/parsers/:parserId"
            element={<RulesPage />}
          />
          <Route path="/transactions/:transactionId" element={<TxReturnStub />} />
        </Routes>
      </MemoryRouter>,
    )

    const user = userEvent.setup()
    expect(
      await screen.findByRole('heading', { name: /Edit parser/i }),
    ).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Save' }))

    await waitFor(() => {
      expect(vi.mocked(patchParser)).toHaveBeenCalled()
    })

    expect(
      await screen.findByRole('heading', { name: /Return to Transaction Details\?/i }),
    ).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Continue' }))

    await waitFor(() => {
      expect(screen.getByText('Back on transactions')).toBeInTheDocument()
    })
  })
})

