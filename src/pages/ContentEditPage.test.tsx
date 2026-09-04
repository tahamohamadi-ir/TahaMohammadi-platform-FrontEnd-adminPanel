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
    vi.fn().mockImplementation((input: RequestInfo | URL) => {
      const url = String(input)
      if (url.includes('/auth/me')) return Promise.resolve(jsonResponse(ME))
      if (url.includes('/content/schema')) {
        return Promise.resolve(jsonResponse(SCHEMA))
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
})
