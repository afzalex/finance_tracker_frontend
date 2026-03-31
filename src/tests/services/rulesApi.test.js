import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../../services/apiConfig', () => ({
  classificationsApi: {
    listClassificationsApiV1ClassificationsGet: vi.fn(),
    createClassificationApiV1ClassificationsPost: vi.fn(),
    patchClassificationApiV1ClassificationsClassificationIdPatch: vi.fn(),
    deleteClassificationApiV1ClassificationsClassificationIdDelete: vi.fn(),
  },
  parsersApi: {
    listParsersApiV1ParsersGet: vi.fn(),
    createParserApiV1ParsersPost: vi.fn(),
    patchParserApiV1ParsersParserIdPatch: vi.fn(),
    deleteParserApiV1ParsersParserIdDelete: vi.fn(),
  },
}))

const rulesApi = await import('../../services/rulesApi')
const financeApi = await import('../../services/financeApi')
const apiConfig = await import('../../services/apiConfig')

const {
  listClassifications,
  createClassification,
  patchClassification,
  deactivateClassification,
  listParsers,
  createParser,
  patchParser,
  deactivateParser,
} = rulesApi

const { apiErrorMessage } = financeApi
const { classificationsApi, parsersApi } = apiConfig

describe('rulesApi', () => {
  beforeEach(() => {
    vi.mocked(classificationsApi.listClassificationsApiV1ClassificationsGet).mockReset()
    vi.mocked(classificationsApi.createClassificationApiV1ClassificationsPost).mockReset()
    vi.mocked(classificationsApi.patchClassificationApiV1ClassificationsClassificationIdPatch).mockReset()
    vi.mocked(classificationsApi.deleteClassificationApiV1ClassificationsClassificationIdDelete).mockReset()

    vi.mocked(parsersApi.listParsersApiV1ParsersGet).mockReset()
    vi.mocked(parsersApi.createParserApiV1ParsersPost).mockReset()
    vi.mocked(parsersApi.patchParserApiV1ParsersParserIdPatch).mockReset()
    vi.mocked(parsersApi.deleteParserApiV1ParsersParserIdDelete).mockReset()
  })

  it('listClassifications returns data', async () => {
    vi.mocked(classificationsApi.listClassificationsApiV1ClassificationsGet).mockResolvedValue({
      data: [{ id: 1, name: 'A', message_type: 'T', priority: 1, is_active: true, created_at: '', updated_at: '' }],
    })
    const out = await listClassifications()
    expect(out).toHaveLength(1)
    expect(classificationsApi.listClassificationsApiV1ClassificationsGet).toHaveBeenCalled()
  })

  it('createClassification returns data', async () => {
    vi.mocked(classificationsApi.createClassificationApiV1ClassificationsPost).mockResolvedValue({
      data: { id: 2 },
    })
    const payload = { name: 'C', message_type: 'X' }
    const out = await createClassification(payload)
    expect(out).toEqual({ id: 2 })
    expect(classificationsApi.createClassificationApiV1ClassificationsPost).toHaveBeenCalledWith(payload)
  })

  it('patchClassification passes id + payload', async () => {
    vi.mocked(classificationsApi.patchClassificationApiV1ClassificationsClassificationIdPatch).mockResolvedValue({
      data: { id: 3 },
    })
    const payload = { priority: 10 }
    const out = await patchClassification(3, payload)
    expect(out).toEqual({ id: 3 })
    expect(classificationsApi.patchClassificationApiV1ClassificationsClassificationIdPatch).toHaveBeenCalledWith(3, payload)
  })

  it('deactivateClassification passes id', async () => {
    vi.mocked(classificationsApi.deleteClassificationApiV1ClassificationsClassificationIdDelete).mockResolvedValue({
      data: { id: 4 },
    })
    const out = await deactivateClassification(4)
    expect(out).toEqual({ id: 4 })
    expect(classificationsApi.deleteClassificationApiV1ClassificationsClassificationIdDelete).toHaveBeenCalledWith(4)
  })

  it('throws friendly message on createClassification failure', async () => {
    vi.mocked(classificationsApi.createClassificationApiV1ClassificationsPost).mockRejectedValue({
      response: { data: { detail: 'Boom' } },
    })

    await expect(createClassification({ name: 'C', message_type: 'X' })).rejects.toThrow('Boom')
    expect(apiErrorMessage({ response: { data: { detail: 'Boom' } } })).toBe('Boom')
  })

  it('listParsers returns data', async () => {
    vi.mocked(parsersApi.listParsersApiV1ParsersGet).mockResolvedValue({
      data: [{ id: 1, label: 'L', name: 'P', priority: 1, is_active: true, created_at: '', updated_at: '' }],
    })
    const out = await listParsers()
    expect(out).toHaveLength(1)
  })

  it('createParser returns data', async () => {
    vi.mocked(parsersApi.createParserApiV1ParsersPost).mockResolvedValue({
      data: { id: 2 },
    })
    const payload = { label: 'L1', name: 'N1' }
    const out = await createParser(payload)
    expect(out).toEqual({ id: 2 })
    expect(parsersApi.createParserApiV1ParsersPost).toHaveBeenCalledWith(payload)
  })

  it('patchParser passes id + payload', async () => {
    vi.mocked(parsersApi.patchParserApiV1ParsersParserIdPatch).mockResolvedValue({
      data: { id: 3 },
    })
    const payload = { priority: 2 }
    const out = await patchParser(3, payload)
    expect(out).toEqual({ id: 3 })
    expect(parsersApi.patchParserApiV1ParsersParserIdPatch).toHaveBeenCalledWith(3, payload)
  })

  it('deactivateParser passes id', async () => {
    vi.mocked(parsersApi.deleteParserApiV1ParsersParserIdDelete).mockResolvedValue({
      data: { id: 4 },
    })
    const out = await deactivateParser(4)
    expect(out).toEqual({ id: 4 })
    expect(parsersApi.deleteParserApiV1ParsersParserIdDelete).toHaveBeenCalledWith(4)
  })
})

