import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  createTimelineRecord,
  deleteTimelineRecord,
  fetchTimeline,
  reorderTimeline,
  updateTimelineRecord,
} from '@/lib/api/timeline'

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

const ROWS = {
  items: [
    {
      id: 3,
      type: 'job',
      label: 'Backend engineer',
      period_label: '2020—2024',
      body: '',
      role: '',
      weight: 0,
      detail_url: '',
      order: 1,
      attach: null,
      updatedAt: '2026-09-01T00:00:00.000Z',
    },
    {
      id: 4,
      type: 'education',
      label: 'MSc',
      period_label: '2016—2020',
      body: '',
      role: '',
      weight: 0,
      detail_url: '',
      order: 2,
      attach: null,
      updatedAt: '2026-08-30T00:00:00.000Z',
    },
  ],
}

describe('timeline API (ADMIN-200)', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('fetches the ordered locale timeline', async () => {
    vi.mocked(fetch).mockResolvedValue(jsonResponse({ items: ROWS.items }))
    const result = await fetchTimeline('en')
    expect(fetch).toHaveBeenCalledWith(
      '/api/v1/admin/timeline/en',
      expect.anything(),
    )
    expect(result.items[0]?.label).toBe('Backend engineer')
  })

  it('creates records with the real create payload', async () => {
    vi.mocked(fetch).mockResolvedValue(jsonResponse(ROWS.items[0]))
    await createTimelineRecord('en', {
      type: 'job',
      label: 'Backend engineer',
      period_label: '2020—2024',
      body: '',
      role: '',
      weight: 0,
      detail_url: '',
      attach: null,
      after_id: null,
    })
    const [, init] = vi.mocked(fetch).mock.calls[0] as [string, RequestInit]
    expect(init.method).toBe('POST')
    expect(JSON.parse(String(init.body))).toMatchObject({ type: 'job' })
  })

  it('reorders with the full id permutation', async () => {
    vi.mocked(fetch).mockResolvedValue(jsonResponse({ items: ROWS.items }))
    await reorderTimeline('en', [4, 3])
    const [, init] = vi.mocked(fetch).mock.calls[0] as [string, RequestInit]
    expect(init.method).toBe('POST')
    expect(String(vi.mocked(fetch).mock.calls[0]?.[0])).toContain(
      '/timeline/en/reorder',
    )
    expect(JSON.parse(String(init.body))).toEqual({ ids: [4, 3] })
  })

  it('patches fields with If-Match row revision', async () => {
    vi.mocked(fetch).mockResolvedValue(jsonResponse(ROWS.items[0]))
    await updateTimelineRecord(
      'en',
      3,
      { label: 'Senior backend engineer' },
      ROWS.items[0].updatedAt,
    )
    const [, init] = vi.mocked(fetch).mock.calls[0] as [string, RequestInit]
    expect(init.method).toBe('PATCH')
    expect(new Headers(init.headers).get('If-Match')).toBe(
      ROWS.items[0].updatedAt,
    )
  })

  it('maps 428 PRECONDITION_REQUIRED to a conflict error', async () => {
    vi.mocked(fetch).mockResolvedValue(
      jsonResponse(
        { code: 'PRECONDITION_REQUIRED', message: 'Send If-Match' },
        428,
      ),
    )
    await expect(
      updateTimelineRecord('en', 3, { label: 'x' }, 'stale'),
    ).rejects.toMatchObject({ kind: 'conflict' })
  })

  it('deletes with If-Match and confirms first', async () => {
    vi.mocked(fetch).mockResolvedValue(new Response(null, { status: 204 }))
    await deleteTimelineRecord('en', 3, ROWS.items[0].updatedAt)
    const [, init] = vi.mocked(fetch).mock.calls[0] as [string, RequestInit]
    expect(init.method).toBe('DELETE')
    expect(new Headers(init.headers).get('If-Match')).toBe(
      ROWS.items[0].updatedAt,
    )
  })
})
