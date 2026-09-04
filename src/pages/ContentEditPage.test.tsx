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

const DETAIL = {
  id: 7,
  locale: 'en',
  slug: 'hello-world',
  title: 'Hello world',
  status: 'draft',
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

function stubDefault() {
  vi.stubGlobal(
    'fetch',
    vi
      .fn()
      .mockImplementation((input: RequestInfo | URL, init?: RequestInit) => {
        const url = String(input)
        if (url.includes('/auth/me')) return Promise.resolve(jsonResponse(ME))
        if (url.includes('/content/schema')) {
          return Promise.resolve(jsonResponse(SCHEMA))
        }
        if (url.includes('/revisions')) {
          if (init?.method === 'POST' && !url.includes('/restore')) {
            return Promise.resolve(jsonResponse(REVISIONS.items[0]))
          }
          return Promise.resolve(jsonResponse(REVISIONS))
        }
        return Promise.resolve(jsonResponse(DETAIL))
      }),
  )
}

function renderEdit(route: string) {
  return render(
    <QueryClientProvider client={createTestQueryClient()}>
      <MemoryRouter initialEntries={[route]}>
        <AuthProvider>
          <Routes>
            <Route
              path="content/:entity/new"
              element={<ContentEditPage entity="article" />}
            />
            <Route
              path="content/:entity/:id"
              element={<ContentEditPage entity="article" />}
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
    const title = await screen.findByLabelText(/title/i)
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

  it('renders schema-driven fields and disables media fields honestly', async () => {
    stubDefault()
    renderEdit('/content/article/7')
    expect(await screen.findByLabelText(/excerpt/i)).toBeInTheDocument()
    const mediaField = screen.getByLabelText(/featured media/i)
    expect(mediaField).toBeDisabled()
    expect(
      screen.getByText(/media library workflow pending/i),
    ).toBeInTheDocument()
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
})
