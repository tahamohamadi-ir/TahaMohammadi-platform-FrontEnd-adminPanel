import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react'
import { QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { AuthProvider } from '@/lib/auth/AuthProvider'
import { createTestQueryClient } from '@/lib/query/client'
import { ContentEditPage } from '@/pages/ContentEditPage'

const ME = {
  id: 1,
  email: 'admin@example.com',
  displayName: 'Admin',
  isStaff: true,
  mfaEnrolled: true,
  otpVerified: true,
  featureFlags: {},
}

const SCHEMA = {
  entities: {
    article: {
      entity: 'article',
      fields: [
        { key: 'excerpt', label: 'Excerpt', type: 'textarea' },
        { key: 'featuredMediaId', label: 'Featured media', type: 'media' },
      ],
    },
  },
}

const REVISIONS = {
  items: [
    {
      id: 3,
      entityKey: 'article',
      objectId: 7,
      note: 'before publish',
      createdAt: '2026-09-01T12:00:00.000Z',
      createdById: 1,
    },
    {
      id: 2,
      entityKey: 'article',
      objectId: 7,
      note: '',
      createdAt: '2026-08-31T12:00:00.000Z',
      createdById: null,
    },
  ],
}

const MEDIA_LIST = {
  items: [
    {
      id: 9,
      title: 'Cover image',
      mime: 'image/png',
      size: 12345,
      url: '/media/cover.png',
      altText: '',
      altTextEn: '',
      altTextFa: '',
      isActive: true,
      usageCount: 0,
      createdAt: '2026-09-01T00:00:00.000Z',
      updatedAt: '2026-09-01T00:00:00.000Z',
    },
  ],
  page: 1,
  pageSize: 100,
  total: 1,
}

const DETAIL = {
  id: 7,
  locale: 'en',
  slug: 'hello-world',
  title: 'Hello world',
  status: 'draft',
  approvalState: 'approved',
  fields: { excerpt: 'Hi' },
  publishedAt: null,
  createdAt: '2026-08-31T00:00:00.000Z',
  updatedAt: '2026-09-01T00:00:00.000Z',
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

function stubDefault(
  handlers?: (url: string, init?: RequestInit) => Response | null,
) {
  vi.stubGlobal(
    'fetch',
    vi
      .fn()
      .mockImplementation((input: RequestInfo | URL, init?: RequestInit) => {
        const url = String(input)
        if (url.includes('/auth/me')) return Promise.resolve(jsonResponse(ME))
        const custom = handlers?.(url, init)
        if (custom) return Promise.resolve(custom)
        if (url.includes('/content/schema')) {
          return Promise.resolve(jsonResponse(SCHEMA))
        }
        if (url.includes('/revisions')) {
          if (init?.method === 'POST' && !url.includes('/restore')) {
            return Promise.resolve(jsonResponse(REVISIONS.items[0]))
          }
          return Promise.resolve(jsonResponse(REVISIONS))
        }
        if (url.includes('/api/v1/admin/media')) {
          return Promise.resolve(jsonResponse(MEDIA_LIST))
        }
        if (url.includes('/preview-link')) {
          return Promise.resolve(
            jsonResponse({
              url: 'http://testserver/pv/article/7?token=abc',
              path: '/pv/article/7?token=abc',
              expiresAt: '2026-09-04T12:00:00Z',
              ttlSeconds: 900,
            }),
          )
        }
        return Promise.resolve(jsonResponse(DETAIL))
      }),
  )
}

function renderEdit(route: string, entity = 'article') {
  return render(
    <QueryClientProvider client={createTestQueryClient()}>
      <MemoryRouter initialEntries={[route]}>
        <AuthProvider>
          <Routes>
            <Route
              path="content/:entity/new"
              element={<ContentEditPage entity={entity} />}
            />
            <Route
              path="content/:entity/:id"
              element={<ContentEditPage entity={entity} />}
            />
          </Routes>
        </AuthProvider>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('ContentEditPage (ADMIN-160/170)', () => {
  beforeEach(() => {
    vi.unstubAllGlobals()
  })

  it('creates a draft through the real POST operation', async () => {
    stubDefault()
    renderEdit('/content/article/new')
    const title = await screen.findByLabelText(/title/i)
    const slug = screen.getByLabelText(/slug/i)
    fireEvent.change(title, { target: { value: 'Fresh article' } })
    fireEvent.change(slug, { target: { value: 'fresh-article' } })
    fireEvent.submit(title.closest('form')!)
    await waitFor(() => {
      const createCall = vi
        .mocked(fetch)
        .mock.calls.find(
          ([input, init]) =>
            String(input).endsWith('/api/v1/admin/content/article') &&
            (init as RequestInit | undefined)?.method === 'POST',
        )
      expect(createCall).toBeTruthy()
      expect(JSON.parse(String(createCall![1]?.body))).toMatchObject({
        title: 'Fresh article',
        slug: 'fresh-article',
        locale: 'en',
      })
    })
  })

  it('loads the detail and saves edits with If-Match', async () => {
    stubDefault()
    renderEdit('/content/article/7')
    // Anchored: the PU-10 family sections add their own "SEO title" control
    // outside the main form; the metadata title is matched exactly.
    const title = await screen.findByLabelText(/^title$/i)
    expect(title).toHaveValue('Hello world')
    fireEvent.change(title, { target: { value: 'Edited title' } })
    fireEvent.submit(title.closest('form')!)
    await waitFor(() => {
      const putCall = vi
        .mocked(fetch)
        .mock.calls.find(
          ([input, init]) =>
            String(input).endsWith('/api/v1/admin/content/article/7') &&
            (init as RequestInit | undefined)?.method === 'PUT',
        )
      expect(putCall).toBeTruthy()
      expect(new Headers(putCall![1]?.headers).get('If-Match')).toBe(
        '2026-09-01T00:00:00.000Z',
      )
      expect(JSON.parse(String(putCall![1]?.body))).toEqual({
        title: 'Edited title',
        slug: 'hello-world',
        status: 'draft',
        fields: { excerpt: 'Hi' },
      })
    })
  })

  it('blocks submit without required title and slug', async () => {
    stubDefault()
    renderEdit('/content/article/new')
    const title = await screen.findByLabelText(/title/i)
    fireEvent.submit(title.closest('form')!)
    await waitFor(() => {
      const alerts = screen.getAllByRole('alert')
      expect(alerts.length).toBeGreaterThan(0)
    })
    expect(
      vi
        .mocked(fetch)
        .mock.calls.some(
          ([input, init]) =>
            String(input).endsWith('/api/v1/admin/content/article') &&
            (init as RequestInit | undefined)?.method === 'POST',
        ),
    ).toBe(false)
  })

  it('requires confirmation before publishing and calls the transition', async () => {
    stubDefault()
    renderEdit('/content/article/7')
    const publish = await screen.findByRole('button', { name: /publish/i })
    fireEvent.click(publish)
    const dialog = screen.getByRole('dialog', { name: /publish/i })
    expect(dialog).toBeInTheDocument()
    fireEvent.click(
      within(dialog).getByRole('button', { name: /confirm publish/i }),
    )
    await waitFor(() => {
      expect(
        vi
          .mocked(fetch)
          .mock.calls.some(
            ([input, init]) =>
              String(input).includes('/content/article/7/transition') &&
              (init as RequestInit | undefined)?.method === 'POST',
          ),
      ).toBe(true)
    })
  })

  it('renders schema-driven fields with a media picker for media fields', async () => {
    stubDefault()
    renderEdit('/content/article/7')
    // Scoped to the metadata form: the PU-10 article section renders its own
    // excerpt control outside this form.
    const title = await screen.findByLabelText(/^title$/i)
    const form = title.closest('form')!
    expect(await within(form).findByLabelText(/^excerpt$/i)).toBeInTheDocument()
    const mediaSelect = within(form).getByLabelText(/featured media/i)
    expect(mediaSelect.tagName).toBe('SELECT')
    const option = await within(
      mediaSelect.closest('.admin-field')!,
    ).findByRole('option', { name: /cover image/i })
    expect(option).toBeInTheDocument()
  })

  it('lists revision history with notes and timestamps (ADMIN-230)', async () => {
    stubDefault()
    renderEdit('/content/article/7')
    const history = await screen.findByRole('table', {
      name: /revision history/i,
    })
    expect(history).toBeInTheDocument()
    expect(screen.getByText(/before publish/)).toBeInTheDocument()
    expect(screen.getByText('3')).toBeInTheDocument()
  })

  it('creates a snapshot with a note from the history form', async () => {
    stubDefault()
    renderEdit('/content/article/7')
    await screen.findByRole('table', { name: /revision history/i })
    fireEvent.change(screen.getByLabelText(/snapshot note/i), {
      target: { value: 'pre-cleanup' },
    })
    fireEvent.click(screen.getByRole('button', { name: /save snapshot/i }))
    await waitFor(() => {
      const snapCall = vi
        .mocked(fetch)
        .mock.calls.find(
          ([input, init]) =>
            String(input).endsWith(
              '/api/v1/admin/content/article/7/revisions',
            ) && (init as RequestInit | undefined)?.method === 'POST',
        )
      expect(snapCall).toBeTruthy()
      expect(JSON.parse(String(snapCall![1]?.body))).toEqual({
        note: 'pre-cleanup',
      })
    })
  })

  it('requires confirmation before restore and calls the restore op', async () => {
    stubDefault()
    renderEdit('/content/article/7')
    await screen.findByRole('table', { name: /revision history/i })
    fireEvent.click(screen.getByRole('button', { name: /restore revision 3/i }))
    const dialog = screen.getByRole('dialog', { name: /restore revision/i })
    expect(dialog).toBeInTheDocument()
    fireEvent.click(
      within(dialog).getByRole('button', { name: /confirm restore/i }),
    )
    await waitFor(() => {
      expect(
        vi
          .mocked(fetch)
          .mock.calls.some(
            ([input, init]) =>
              String(input).includes(
                '/content/article/7/revisions/3/restore',
              ) && (init as RequestInit | undefined)?.method === 'POST',
          ),
      ).toBe(true)
    })
  })

  it('schedules through a dialog with the datetime input (ADMIN-240)', async () => {
    stubDefault()
    renderEdit('/content/article/7')
    fireEvent.click(await screen.findByRole('button', { name: /schedule/i }))
    const dialog = screen.getByRole('dialog', { name: /schedule publication/i })
    fireEvent.change(within(dialog).getByLabelText(/publish at/i), {
      target: { value: '2026-10-01T09:00' },
    })
    fireEvent.click(
      within(dialog).getByRole('button', { name: /confirm schedule/i }),
    )
    await waitFor(() => {
      expect(
        vi
          .mocked(fetch)
          .mock.calls.some(
            ([input, init]) =>
              String(input).includes('/content/article/7/transition') &&
              (init as RequestInit | undefined)?.method === 'POST',
          ),
      ).toBe(true)
      const transitionCall = vi
        .mocked(fetch)
        .mock.calls.find(([input]) =>
          String(input).includes('/content/article/7/transition'),
        )
      const body = JSON.parse(String(transitionCall![1]?.body))
      expect(body.to).toBe('scheduled')
      // The wire value is a real instant; exact ISO depends on the host TZ.
      expect(body.scheduledFor).toBe(new Date('2026-10-01T09:00').toISOString())
    })
  })

  it('creates a preview share link and shows url + expiry (ADMIN-220)', async () => {
    stubDefault()
    renderEdit('/content/article/7')
    fireEvent.click(
      await screen.findByRole('button', { name: /create preview link/i }),
    )
    expect(await screen.findByText(/\/pv\/article\/7/)).toBeInTheDocument()
    expect(screen.getByText(/2026-09-04T12:00:00Z/)).toBeInTheDocument()
    expect(
      vi
        .mocked(fetch)
        .mock.calls.some(
          ([input, init]) =>
            String(input).includes('/content/article/7/preview-link') &&
            (init as RequestInit | undefined)?.method === 'POST',
        ),
    ).toBe(true)
  })

  it('hides preview share for unsupported entities', () => {
    stubDefault()
    renderEdit('/content/project/1', 'project')
    expect(
      screen.queryByRole('button', { name: /create preview link/i }),
    ).not.toBeInTheDocument()
  })

  it('blocks publish while owner approval is missing (ADMIN-280)', async () => {
    stubDefault((url) => {
      if (/\/api\/v1\/admin\/content\/article\/7$/.test(url)) {
        return jsonResponse({
          ...DETAIL,
          approvalState: 'needs-owner-input',
        })
      }
      return null
    })
    renderEdit('/content/article/7')
    const publish = await screen.findByRole('button', { name: /publish/i })
    expect(publish).toBeDisabled()
    expect(screen.getByText(/owner approval required/i)).toBeInTheDocument()
    expect(screen.getByText(/approval: needs-owner-input/)).toBeInTheDocument()
  })
})

const STORY_COMPOSITION = {
  id: 11,
  key: 'story-en-1',
  kind: 'story',
  locale: 'en',
  title: 'Test story',
  status: 'draft',
  publishedAt: null,
  createdAt: '2026-09-01T00:00:00.000Z',
  updatedAt: '2026-09-02T00:00:00.000Z',
  sections: [
    {
      id: 1,
      position: 0,
      layout: '1col',
      ratio: '',
      enabled: true,
      blocks: [
        {
          id: 5,
          position: 0,
          blockType: 'text',
          enabled: true,
          settings: { markdown: 'Hello' },
        },
      ],
    },
  ],
}

const STORY_SCHEMA = {
  kind: 'story',
  blockTypes: [
    {
      type: 'text',
      labelFa: 'متن',
      required: ['markdown'],
      fields: [{ key: 'markdown', label: 'Markdown', type: 'textarea' }],
    },
  ],
  sectionLayouts: [{ value: '1col', label: 'One column', ratios: [] }],
}

function stubStory(
  handlers?: (url: string, init?: RequestInit) => Response | null,
) {
  vi.stubGlobal(
    'fetch',
    vi
      .fn()
      .mockImplementation((input: RequestInfo | URL, init?: RequestInit) => {
        const url = String(input)
        if (url.includes('/auth/me')) return Promise.resolve(jsonResponse(ME))
        const custom = handlers?.(url, init)
        if (custom) return Promise.resolve(custom)
        if (url.includes('/api/v1/admin/composition/schema')) {
          return Promise.resolve(jsonResponse(STORY_SCHEMA))
        }
        if (url.includes('/api/v1/admin/composition/12')) {
          return Promise.resolve(
            jsonResponse({ ...STORY_COMPOSITION, id: 12, kind: 'landing' }),
          )
        }
        if (url.includes('/api/v1/admin/composition/11')) {
          return Promise.resolve(jsonResponse(STORY_COMPOSITION))
        }
        if (url.includes('/content/schema')) {
          return Promise.resolve(jsonResponse(SCHEMA))
        }
        if (url.includes('/revisions')) {
          return Promise.resolve(jsonResponse(REVISIONS))
        }
        if (url.includes('/api/v1/admin/media')) {
          return Promise.resolve(jsonResponse(MEDIA_LIST))
        }
        return Promise.resolve(jsonResponse(DETAIL))
      }),
  )
}

describe('ContentEditPage story connection (PU-09-host)', () => {
  beforeEach(() => {
    vi.unstubAllGlobals()
  })

  it('fails before the story connection when no story UI exists', async () => {
    stubStory()
    renderEdit('/content/article/7')
    // The story slice owns this heading; without the host wiring the
    // attach flow below has no mounting point.
    expect(
      await screen.findByRole('heading', { name: /^story$/i }),
    ).toBeInTheDocument()
  })

  it('attaches a story-kind composition with If-Match', async () => {
    stubStory()
    renderEdit('/content/article/7')
    const input = await screen.findByLabelText(/story id/i)
    fireEvent.change(input, { target: { value: '11' } })
    fireEvent.click(screen.getByRole('button', { name: /attach story/i }))
    await waitFor(() => {
      const putCall = vi
        .mocked(fetch)
        .mock.calls.find(
          ([callUrl, init]) =>
            String(callUrl).endsWith('/api/v1/admin/content/article/7') &&
            (init as RequestInit | undefined)?.method === 'PUT' &&
            String((init as RequestInit | undefined)?.body ?? '').includes(
              'storyId',
            ),
        )
      expect(putCall).toBeTruthy()
      expect(new Headers(putCall![1]?.headers).get('If-Match')).toBe(
        '2026-09-01T00:00:00.000Z',
      )
      expect(JSON.parse(String(putCall![1]?.body))).toEqual({
        fields: { storyId: 11 },
      })
    })
  })

  it('refuses non-story compositions without saving', async () => {
    stubStory()
    renderEdit('/content/article/7')
    const input = await screen.findByLabelText(/story id/i)
    fireEvent.change(input, { target: { value: '12' } })
    fireEvent.click(screen.getByRole('button', { name: /attach story/i }))
    expect(await screen.findByText(/not a story/i)).toBeInTheDocument()
    expect(
      vi
        .mocked(fetch)
        .mock.calls.some(
          ([callUrl, init]) =>
            String(callUrl).endsWith('/api/v1/admin/content/article/7') &&
            (init as RequestInit | undefined)?.method === 'PUT' &&
            String((init as RequestInit | undefined)?.body ?? '').includes(
              'storyId',
            ),
        ),
    ).toBe(false)
  })

  it('previews the attached story and surfaces block-save conflicts', async () => {
    stubStory((url, init) => {
      if (/\/api\/v1\/admin\/content\/article\/7$/.test(url)) {
        return jsonResponse({
          ...DETAIL,
          fields: { excerpt: 'Hi', storyId: 11 },
        })
      }
      if (
        url.includes('/api/v1/admin/composition/11') &&
        init?.method === 'PUT'
      ) {
        return jsonResponse(
          { code: 'STALE_REVISION', message: 'Stale composition' },
          409,
        )
      }
      return null
    })
    renderEdit('/content/article/7')
    expect(await screen.findByText(/attached story:/i)).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /edit blocks/i }))
    expect(
      await screen.findByRole('heading', { name: /story blocks/i }),
    ).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /^save story$/i }))
    await waitFor(() => {
      expect(
        vi
          .mocked(fetch)
          .mock.calls.some(
            ([callUrl, init]) =>
              String(callUrl).endsWith('/api/v1/admin/composition/11') &&
              (init as RequestInit | undefined)?.method === 'PUT' &&
              new Headers((init as RequestInit | undefined)?.headers).get(
                'If-Match',
              ) === '2026-09-02T00:00:00.000Z',
          ),
      ).toBe(true)
    })
    expect(await screen.findByText(/changed elsewhere/i)).toBeInTheDocument()
  })
})

describe('ContentEditPage family sections (PU-10)', () => {
  beforeEach(() => {
    vi.unstubAllGlobals()
  })

  it('saves article metadata through the family section with If-Match', async () => {
    stubStory()
    renderEdit('/content/article/7')
    const section = await screen.findByRole('region', {
      name: /article details/i,
    })
    fireEvent.change(within(section).getByLabelText(/^excerpt$/i), {
      target: { value: 'Family excerpt' },
    })
    fireEvent.click(
      within(section).getByRole('button', { name: /save article details/i }),
    )
    await waitFor(() => {
      const putCall = vi
        .mocked(fetch)
        .mock.calls.find(
          ([callUrl, init]) =>
            String(callUrl).endsWith('/api/v1/admin/content/article/7') &&
            (init as RequestInit | undefined)?.method === 'PUT' &&
            String((init as RequestInit | undefined)?.body ?? '').includes(
              'Family excerpt',
            ),
        )
      expect(putCall).toBeTruthy()
      expect(new Headers(putCall![1]?.headers).get('If-Match')).toBe(
        '2026-09-01T00:00:00.000Z',
      )
    })
    expect(await within(section).findByText(/^saved\.$/i)).toBeInTheDocument()
  })

  it('surfaces family-save conflicts without touching the metadata form', async () => {
    stubStory((url, init) => {
      if (
        /\/api\/v1\/admin\/content\/article\/7$/.test(url) &&
        init?.method === 'PUT' &&
        String(init.body ?? '').includes('Family excerpt')
      ) {
        return jsonResponse({ code: 'STALE_REVISION', message: 'Stale' }, 409)
      }
      return null
    })
    renderEdit('/content/article/7')
    const section = await screen.findByRole('region', {
      name: /article details/i,
    })
    fireEvent.change(within(section).getByLabelText(/^excerpt$/i), {
      target: { value: 'Family excerpt' },
    })
    fireEvent.click(
      within(section).getByRole('button', { name: /save article details/i }),
    )
    expect(
      await within(section).findByText(/changed elsewhere/i),
    ).toBeInTheDocument()
  })
})
