import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  compositionListPath,
  createComposition,
  fetchCompositionDetail,
  isCompositionPublished,
  listCompositions,
  updateComposition,
} from '@/lib/api/composition'
import {
  fetchPublicationJob,
  listPublicationJobs,
  publicationJobListPath,
  retryPublicationJob,
} from '@/lib/api/publication-jobs'

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

const COMPOSITION_DETAIL = {
  id: 3,
  key: 'home-en',
  kind: 'landing',
  locale: 'en',
  title: 'Home',
  status: 'draft',
  publishedAt: null,
  createdAt: '2026-09-01T00:00:00.000Z',
  updatedAt: '2026-09-02T00:00:00.000Z',
  sections: [],
}

const JOB = {
  id: '11111111-2222-4333-8444-555555555555',
  state: 'failed',
  locale: 'en',
  requestedRevision: 'abc123',
  deployedRevision: null,
  affectedPaths: ['/en/'],
  revokedPaths: [],
  removalState: 'none',
  createdAt: '2026-09-02T00:00:00.000Z',
  startedAt: '2026-09-02T00:01:00.000Z',
  finishedAt: '2026-09-02T00:02:00.000Z',
  errorCode: 'BUILD_FAILED',
  updatedAt: '2026-09-02T00:02:00.000Z',
}

describe('product authoring transport (PU-09-transport, I03/I06)', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('fails before adapters exist against the real generated contract', async () => {
    // Regression guard for the packet goal: the generated admin schema must
    // expose the composition and publication-job operations these adapters
    // type. A missing route here means PU-SYNC-admin drifted, not that the
    // adapter may invent a path.
    const generated = await import('@/generated/admin-api')
    expect(generated).toBeDefined()
    expect(compositionListPath({ locale: 'en' })).toBe('/composition?locale=en')
    expect(publicationJobListPath({ state: 'failed' })).toBe(
      '/publication-jobs?state=failed',
    )
  })

  it('lists compositions with filters and pagination as query params', async () => {
    vi.mocked(fetch).mockResolvedValue(
      jsonResponse({ items: [], page: 1, pageSize: 20, total: 0 }),
    )
    await listCompositions({
      q: 'home',
      locale: 'en',
      status: 'draft',
      page: 1,
      pageSize: 20,
    })
    expect(fetch).toHaveBeenCalledWith(
      '/api/v1/admin/composition?q=home&locale=en&status=draft&page=1&pageSize=20',
      expect.objectContaining({ credentials: 'include' }),
    )
  })

  it('omits unset composition filters', async () => {
    vi.mocked(fetch).mockResolvedValue(
      jsonResponse({ items: [], page: 1, pageSize: 20, total: 0 }),
    )
    await listCompositions({})
    expect(fetch).toHaveBeenCalledWith(
      '/api/v1/admin/composition',
      expect.anything(),
    )
  })

  it('fetches one composition detail and creates with the real payload', async () => {
    vi.mocked(fetch).mockResolvedValue(jsonResponse(COMPOSITION_DETAIL))
    const detail = await fetchCompositionDetail(3)
    expect(fetch).toHaveBeenCalledWith(
      '/api/v1/admin/composition/3',
      expect.anything(),
    )
    expect(detail.key).toBe('home-en')

    vi.mocked(fetch).mockResolvedValue(jsonResponse(COMPOSITION_DETAIL))
    await createComposition({
      key: 'home-en',
      kind: 'landing',
      locale: 'en',
      status: 'draft',
      title: 'Home',
    })
    const [, init] = vi.mocked(fetch).mock.calls[1] as [string, RequestInit]
    expect(init.method).toBe('POST')
    expect(JSON.parse(String(init.body))).toEqual({
      key: 'home-en',
      kind: 'landing',
      locale: 'en',
      status: 'draft',
      title: 'Home',
    })
  })

  it('replaces composition with If-Match and surfaces stale revisions as conflicts', async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce(jsonResponse(COMPOSITION_DETAIL))
      .mockResolvedValueOnce(
        jsonResponse({ code: 'STALE_REVISION', message: 'Stale' }, 409),
      )
    await updateComposition(
      3,
      { sections: [], title: 'Home v2' },
      '2026-09-02T00:00:00.000Z',
    )
    const [, init] = vi.mocked(fetch).mock.calls[0] as [string, RequestInit]
    expect(init.method).toBe('PUT')
    expect(new Headers(init.headers).get('If-Match')).toBe(
      '2026-09-02T00:00:00.000Z',
    )
    await expect(
      updateComposition(3, { sections: [] }, '2026-09-01T00:00:00.000Z'),
    ).rejects.toMatchObject({ kind: 'conflict', code: 'STALE_REVISION' })
  })

  it('keeps the saved/published distinction on the server status field', () => {
    expect(isCompositionPublished(COMPOSITION_DETAIL)).toBe(false)
    expect(
      isCompositionPublished({ ...COMPOSITION_DETAIL, status: 'published' }),
    ).toBe(true)
    expect(
      isCompositionPublished({ ...COMPOSITION_DETAIL, status: 'scheduled' }),
    ).toBe(false)
  })

  it('surfaces composition validation with field errors', async () => {
    vi.mocked(fetch).mockResolvedValue(
      jsonResponse(
        {
          code: 'VALIDATION',
          message: 'key must match ^[a-z0-9-]+$.',
          fields: { key: 'key must match ^[a-z0-9-]+$.' },
        },
        400,
      ),
    )
    await expect(
      createComposition({
        key: 'Bad Key!',
        kind: 'landing',
        locale: 'en',
        status: 'draft',
        title: 'x',
      }),
    ).rejects.toMatchObject({
      kind: 'validation',
      fieldErrors: { key: 'key must match ^[a-z0-9-]+$.' },
    })
  })

  it('lists publication jobs with server paging and filters', async () => {
    vi.mocked(fetch).mockResolvedValue(jsonResponse({ count: 1, items: [JOB] }))
    const result = await listPublicationJobs({
      page: 2,
      pageSize: 20,
      state: 'failed',
      locale: 'en',
    })
    expect(fetch).toHaveBeenCalledWith(
      '/api/v1/admin/publication-jobs?page=2&page_size=20&state=failed&locale=en',
      expect.objectContaining({ credentials: 'include' }),
    )
    expect(result.count).toBe(1)
    expect(result.items[0]?.revokedPaths).toEqual([])
  })

  it('fetches one job and retries with If-Match plus idempotency key', async () => {
    vi.mocked(fetch).mockResolvedValue(jsonResponse(JOB))
    const job = await fetchPublicationJob(JOB.id)
    expect(fetch).toHaveBeenCalledWith(
      `/api/v1/admin/publication-jobs/${JOB.id}`,
      expect.anything(),
    )
    expect(job.errorCode).toBe('BUILD_FAILED')

    vi.mocked(fetch).mockResolvedValue(jsonResponse(JOB))
    await retryPublicationJob(JOB.id, {
      ifMatch: JOB.updatedAt,
      idempotencyKey: 'retry-1',
    })
    const [url, init] = vi.mocked(fetch).mock.calls[1] as [string, RequestInit]
    expect(String(url)).toContain(`/publication-jobs/${JOB.id}/retry`)
    expect(init.method).toBe('POST')
    const headers = new Headers(init.headers)
    expect(headers.get('If-Match')).toBe(JOB.updatedAt)
    expect(headers.get('Idempotency-Key')).toBe('retry-1')
  })

  it('maps session expiry to auth and CSRF failures to csrf', async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce(
        jsonResponse({ code: 'OTP_REQUIRED', message: 'OTP required' }, 403),
      )
      .mockResolvedValueOnce(
        jsonResponse(
          { code: 'CSRF_FAILED', message: 'CSRF check failed' },
          403,
        ),
      )
    await expect(fetchPublicationJob(JOB.id)).rejects.toMatchObject({
      kind: 'auth',
    })
    await expect(retryPublicationJob(JOB.id)).rejects.toMatchObject({
      kind: 'csrf',
    })
  })
})
