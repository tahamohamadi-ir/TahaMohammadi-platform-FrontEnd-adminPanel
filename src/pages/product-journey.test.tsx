import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { AuthProvider } from '@/lib/auth/AuthProvider'
import { createTestQueryClient } from '@/lib/query/client'
import { ContentEditPage } from '@/pages/ContentEditPage'
import { StoryLibraryField } from '@/components/editor/story-library-fields'

const ME = {
  id: 1,
  email: 'admin@example.com',
  displayName: 'Admin User',
  isStaff: true,
  mfaEnrolled: true,
  otpVerified: true,
  featureFlags: {},
}

const SCHEMA = {
  entities: {
    project: {
      entity: 'project',
      fields: [
        { key: 'objective', label: 'Objective', type: 'textarea' },
        { key: 'projectType', label: 'Project type', type: 'text' },
      ],
    },
    article: {
      entity: 'article',
      fields: [
        { key: 'excerpt', label: 'Excerpt', type: 'textarea' },
        { key: 'body', label: 'Body', type: 'markdown' },
      ],
    },
  },
}

const PROJECT_DETAIL = {
  id: 42,
  locale: 'en',
  slug: 'autonomous-system-platform',
  title: 'Autonomous System Platform',
  status: 'draft',
  approvalState: 'approved',
  fields: {
    objective: 'Scalable autonomous architectures.',
    projectType: 'Research Platform',
  },
  publishedAt: null,
  createdAt: '2026-08-31T00:00:00.000Z',
  updatedAt: '2026-09-01T00:00:00.000Z',
}

const REVISIONS = {
  items: [
    {
      id: 101,
      entityKey: 'project',
      objectId: 42,
      note: 'Snapshot before revision',
      createdAt: '2026-09-01T09:00:00.000Z',
      createdById: 1,
    },
  ],
}

const MEDIA_LIST = {
  items: [],
  page: 1,
  pageSize: 20,
  total: 0,
}

describe('PU-25 component journeys with mocked HTTP (not live E2E)', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    localStorage.clear()
  })

  function renderWithProviders(route: string, entity = 'project') {
    const queryClient = createTestQueryClient()
    return render(
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <MemoryRouter initialEntries={[route]}>
            <Routes>
              <Route
                path="content/:entity/:id"
                element={<ContentEditPage entity={entity} />}
              />
            </Routes>
          </MemoryRouter>
        </AuthProvider>
      </QueryClientProvider>,
    )
  }

  function jsonResponse(
    body: unknown,
    status = 200,
    headers: Record<string, string> = {},
  ) {
    return new Response(JSON.stringify(body), {
      status,
      headers: { 'Content-Type': 'application/json', ...headers },
    })
  }

  it('searches authenticated media over the existing HTTP adapter and returns typed selections', async () => {
    const requests: URL[] = []
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = new URL(String(input), 'http://localhost')
        requests.push(url)
        expect(init?.credentials).toBe('include')
        if (url.pathname === '/api/v1/admin/media')
          return jsonResponse({
            items:
              url.searchParams.get('q') === 'diagram'
                ? [{ id: 17, title: 'Synthetic diagram', mime: 'image/png' }]
                : [],
            page: 1,
            pageSize: 20,
            total: 1,
          })
        return jsonResponse({ code: 'NOT_FOUND' }, 404)
      }),
    )
    const onChange = vi.fn()
    render(
      <StoryLibraryField
        inputId="journey-media"
        locale="fa"
        kind="mediaList"
        mediaType="image"
        value={[]}
        onChange={onChange}
      />,
    )
    fireEvent.change(screen.getByLabelText('Search media library'), {
      target: { value: 'diagram' },
    })
    fireEvent.click(
      await screen.findByRole('button', { name: 'Choose Synthetic diagram' }),
    )
    expect(onChange).toHaveBeenCalledWith([17])
    expect(requests.at(-1)?.pathname).toBe('/api/v1/admin/media')
    expect(Object.fromEntries(requests.at(-1)!.searchParams)).toEqual({
      q: 'diagram',
      type: 'image',
      active: 'true',
      page: '1',
      pageSize: '20',
    })
  })

  it('saves edited draft through the real client, then publishes only after confirmation and server acknowledgment', async () => {
    let current = { ...PROJECT_DETAIL }
    const mutations: {
      path: string
      method: string
      body: Record<string, unknown>
      headers: Headers
      credentials?: RequestCredentials
    }[] = []
    let acknowledgePublish: (() => void) | undefined
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        const path = new URL(String(input), 'http://localhost').pathname
        if (path === '/api/v1/admin/auth/me') return jsonResponse(ME)
        if (path === '/api/v1/admin/auth/csrf')
          return jsonResponse({ csrfToken: 'synthetic-csrf' })
        if (path === '/api/v1/admin/content/schema') return jsonResponse(SCHEMA)
        if (path === '/api/v1/admin/content/project/42/revisions')
          return jsonResponse(REVISIONS)
        if (path === '/api/v1/admin/media') return jsonResponse(MEDIA_LIST)
        if (init?.method === 'PUT' || init?.method === 'POST') {
          const body = JSON.parse(String(init.body)) as Record<string, unknown>
          mutations.push({
            path,
            method: init.method,
            body,
            headers: new Headers(init.headers),
            credentials: init.credentials,
          })
          if (
            path === '/api/v1/admin/content/project/42' &&
            init.method === 'PUT'
          ) {
            current = {
              ...current,
              title: String(body.title),
              updatedAt: '2026-09-07T00:00:00.000Z',
            }
            return jsonResponse(current)
          }
          if (
            path === '/api/v1/admin/content/project/42/transition' &&
            init.method === 'POST'
          ) {
            await new Promise<void>((resolve) => {
              acknowledgePublish = resolve
            })
            current = { ...current, status: 'published' }
            return jsonResponse(current)
          }
        }
        if (path === '/api/v1/admin/content/project/42' && !init?.method)
          return jsonResponse(current)
        return jsonResponse(
          { code: 'NOT_FOUND', message: `Unmocked ${path}` },
          404,
        )
      }),
    )
    renderWithProviders('/content/project/42', 'project')
    const title = await screen.findByDisplayValue(PROJECT_DETAIL.title)
    fireEvent.change(title, { target: { value: 'Synthetic revised project' } })
    fireEvent.click(screen.getByRole('button', { name: /^save$/i }))
    await screen.findByText('Saved')
    expect(mutations).toHaveLength(1)
    expect(mutations[0]).toMatchObject({
      path: '/api/v1/admin/content/project/42',
      method: 'PUT',
      body: { title: 'Synthetic revised project', status: 'draft' },
      credentials: 'include',
    })
    expect(mutations[0]?.headers.get('If-Match')).toBe(PROJECT_DETAIL.updatedAt)
    expect(mutations[0]?.headers.get('X-CSRFToken')).toBe('synthetic-csrf')
    expect(screen.getAllByText('draft').length).toBeGreaterThan(0)
    fireEvent.click(screen.getByRole('button', { name: /^publish$/i }))
    expect(
      screen.getByRole('dialog', { name: 'Publish this content?' }),
    ).toBeInTheDocument()
    expect(mutations).toHaveLength(1)
    fireEvent.click(screen.getByRole('button', { name: 'Confirm publish' }))
    await waitFor(() => expect(mutations).toHaveLength(2))
    expect(mutations[1]).toMatchObject({
      path: '/api/v1/admin/content/project/42/transition',
      method: 'POST',
      body: { to: 'published' },
      credentials: 'include',
    })
    expect(screen.getAllByText('draft').length).toBeGreaterThan(0)
    acknowledgePublish!()
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    await waitFor(() =>
      expect(screen.getAllByText('published').length).toBeGreaterThan(0),
    )
  })

  it('handles 409 conflict when saving against a stale revision', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockImplementation((input: RequestInfo | URL, init?: RequestInit) => {
          const url = String(input)
          if (url.includes('/auth/me')) return Promise.resolve(jsonResponse(ME))
          if (url.includes('/content/schema'))
            return Promise.resolve(jsonResponse(SCHEMA))
          if (url.includes('/revisions'))
            return Promise.resolve(jsonResponse(REVISIONS))
          if (url.includes('/api/v1/admin/media'))
            return Promise.resolve(jsonResponse(MEDIA_LIST))
          if (url.includes('/api/v1/admin/content/project/42')) {
            if (init?.method === 'PUT') {
              return Promise.resolve(
                jsonResponse(
                  {
                    code: 'CONFLICT',
                    message: 'Record was modified by another user.',
                  },
                  409,
                ),
              )
            }
            return Promise.resolve(
              jsonResponse(PROJECT_DETAIL, 200, { ETag: '"rev-42-v1"' }),
            )
          }
          return Promise.resolve(jsonResponse({}))
        }),
    )

    renderWithProviders('/content/project/42', 'project')

    await waitFor(() => {
      expect(
        screen.getByDisplayValue('Autonomous System Platform'),
      ).toBeInTheDocument()
    })

    const saveButton = screen.getByRole('button', { name: /^save$/i })
    fireEvent.click(saveButton)

    await waitFor(() => {
      expect(screen.getByText('Changed elsewhere')).toBeInTheDocument()
    })
  })

  it('handles backend error gracefully with content unavailable notice', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation((input: RequestInfo | URL) => {
        const url = String(input)
        if (url.includes('/auth/me')) return Promise.resolve(jsonResponse(ME))
        return Promise.resolve(
          jsonResponse(
            { code: 'UNAUTHORIZED', message: 'Session expired or forbidden' },
            401,
          ),
        )
      }),
    )

    renderWithProviders('/content/project/42', 'project')

    await waitFor(() => {
      expect(screen.getByText('Content unavailable')).toBeInTheDocument()
    })
    expect(screen.getByText(/The backend did not answer/i)).toBeInTheDocument()
  })

  it('supports Persian RTL locale editing direction correctly', async () => {
    const FA_PROJECT = {
      ...PROJECT_DETAIL,
      locale: 'fa',
      title: 'سامانه معماری خودمختار',
      fields: {
        objective: 'معماری مقیاس‌پذیر برای مدل‌های پایه.',
        projectType: 'پلتفرم پژوهشی',
      },
    }

    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation((input: RequestInfo | URL) => {
        const url = String(input)
        if (url.includes('/auth/me')) return Promise.resolve(jsonResponse(ME))
        if (url.includes('/content/schema'))
          return Promise.resolve(jsonResponse(SCHEMA))
        if (url.includes('/revisions'))
          return Promise.resolve(jsonResponse(REVISIONS))
        if (url.includes('/api/v1/admin/media'))
          return Promise.resolve(jsonResponse(MEDIA_LIST))
        if (url.includes('/api/v1/admin/content/project/42')) {
          return Promise.resolve(
            jsonResponse(FA_PROJECT, 200, { ETag: '"rev-42-fa"' }),
          )
        }
        return Promise.resolve(jsonResponse({}))
      }),
    )

    renderWithProviders('/content/project/42', 'project')

    await waitFor(() => {
      expect(
        screen.getByDisplayValue('سامانه معماری خودمختار'),
      ).toBeInTheDocument()
    })

    // The editor must expose RTL on the locale-specific fields.
    const objectiveInputs = screen.getAllByDisplayValue(
      'معماری مقیاس‌پذیر برای مدل‌های پایه.',
    )
    expect(objectiveInputs[0]?.closest('[dir]')).toHaveAttribute('dir', 'rtl')
  })
})
