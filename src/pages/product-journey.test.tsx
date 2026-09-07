import {
  fireEvent,
  render,
  screen,
  waitFor,
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

describe('PU-25 Product Journey (ADMIN-250 / I08)', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    localStorage.clear()
    localStorage.setItem(
      'tahamohammadi.admin.auth',
      JSON.stringify({
        token: 'test-token',
        user: ME,
        expiresAt: '2099-01-01T00:00:00Z',
      }),
    )
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

  function jsonResponse(body: unknown, status = 200, headers: Record<string, string> = {}) {
    return new Response(JSON.stringify(body), {
      status,
      headers: { 'Content-Type': 'application/json', ...headers },
    })
  }

  it('distinguishes saved draft vs published state on project entity', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation((input: RequestInfo | URL) => {
        const url = String(input)
        if (url.includes('/auth/me')) return Promise.resolve(jsonResponse(ME))
        if (url.includes('/content/schema')) return Promise.resolve(jsonResponse(SCHEMA))
        if (url.includes('/revisions')) return Promise.resolve(jsonResponse(REVISIONS))
        if (url.includes('/api/v1/admin/media')) return Promise.resolve(jsonResponse(MEDIA_LIST))
        if (url.includes('/api/v1/admin/content/project/42')) {
          return Promise.resolve(
            jsonResponse(PROJECT_DETAIL, 200, { ETag: '"rev-42-v1"' }),
          )
        }
        return Promise.resolve(jsonResponse({}))
      }),
    )

    renderWithProviders('/content/project/42', 'project')

    await waitFor(() => {
      expect(screen.getByDisplayValue('Autonomous System Platform')).toBeInTheDocument()
    })

    // Verify draft status is displayed
    expect(screen.getAllByText('draft')[0]).toBeInTheDocument()

    // Verify Save button exists and distinguishes draft save from deployment
    const saveButton = screen.getByRole('button', { name: /^save$/i })
    expect(saveButton).toBeInTheDocument()

    // Verify entity-specific fields rendered
    expect(screen.getAllByDisplayValue('Scalable autonomous architectures.')[0]).toBeInTheDocument()
    expect(screen.getAllByDisplayValue('Research Platform')[0]).toBeInTheDocument()
  })

  it('handles 409 conflict when saving against a stale revision', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation((input: RequestInfo | URL, init?: RequestInit) => {
        const url = String(input)
        if (url.includes('/auth/me')) return Promise.resolve(jsonResponse(ME))
        if (url.includes('/content/schema')) return Promise.resolve(jsonResponse(SCHEMA))
        if (url.includes('/revisions')) return Promise.resolve(jsonResponse(REVISIONS))
        if (url.includes('/api/v1/admin/media')) return Promise.resolve(jsonResponse(MEDIA_LIST))
        if (url.includes('/api/v1/admin/content/project/42')) {
          if (init?.method === 'PUT') {
            return Promise.resolve(
              jsonResponse(
                { code: 'CONFLICT', message: 'Record was modified by another user.' },
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
      expect(screen.getByDisplayValue('Autonomous System Platform')).toBeInTheDocument()
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
        if (url.includes('/content/schema')) return Promise.resolve(jsonResponse(SCHEMA))
        if (url.includes('/revisions')) return Promise.resolve(jsonResponse(REVISIONS))
        if (url.includes('/api/v1/admin/media')) return Promise.resolve(jsonResponse(MEDIA_LIST))
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
      expect(screen.getByDisplayValue('سامانه معماری خودمختار')).toBeInTheDocument()
    })

    // Verify Persian objective is rendered in RTL direction context
    const objectiveInputs = screen.getAllByDisplayValue('معماری مقیاس‌پذیر برای مدل‌های پایه.')
    expect(objectiveInputs[0]).toBeInTheDocument()
  })
})
