import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { AuthProvider } from '@/lib/auth/AuthProvider'
import { createTestQueryClient } from '@/lib/query/client'
import { AtlasEditorPage } from '@/pages/AtlasEditorPage'

const ME = {
  id: 1,
  email: 'admin@example.com',
  displayName: 'Admin',
  isStaff: true,
  mfaEnrolled: true,
  otpVerified: true,
  featureFlags: {},
}

const REVISION = '7-2026-09-21T00:00:00+00:00'

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

function renderEditor() {
  return render(
    <QueryClientProvider client={createTestQueryClient()}>
      <MemoryRouter initialEntries={['/atlas/7']}>
        <AuthProvider>
          <Routes>
            <Route path="/atlas/:versionId" element={<AtlasEditorPage />} />
          </Routes>
        </AuthProvider>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('AtlasEditorPage publish lifecycle (Plan B Task 15)', () => {
  beforeEach(() => {
    vi.unstubAllGlobals()
  })

  function stubEditor(options: {
    status?: () => string
    activate?: (url: string, init?: RequestInit) => Response
  }) {
    const statusOf = options.status ?? (() => 'draft')
    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation((url: string, init?: RequestInit) => {
        const target = String(url)
        if (target.endsWith('/auth/me')) {
          return Promise.resolve(jsonResponse(ME))
        }
        if (target.endsWith('/auth/csrf')) {
          return Promise.resolve(jsonResponse({ csrfToken: 'test-csrf' }))
        }
        if (
          target.endsWith('/atlas/versions/7/activate') &&
          init?.method === 'POST'
        ) {
          return Promise.resolve(
            options.activate?.(target, init) ??
              jsonResponse({ code: 'STUB', message: 'no activate mock' }, 500),
          )
        }
        if (target.endsWith('/atlas/versions/7/validate')) {
          return Promise.resolve(jsonResponse({ blocking: [], warnings: [] }))
        }
        if (target.endsWith('/atlas/versions/7')) {
          const status = statusOf()
          return Promise.resolve(
            jsonResponse({
              id: 7,
              label: 'Draft',
              status,
              nodeCount: 0,
              relationCount: 0,
              revision: REVISION,
              createdAt: '2026-09-21T00:00:00+00:00',
              updatedAt: '2026-09-21T00:00:00+00:00',
              publishedAt:
                status === 'draft' ? null : '2026-09-21T01:00:00+00:00',
            }),
          )
        }
        if (
          target.endsWith('/atlas/versions/7/nodes') ||
          target.endsWith('/atlas/versions/7/relations') ||
          target.endsWith('/atlas/versions/7/groups') ||
          target.endsWith('/atlas/node-types') ||
          target.endsWith('/atlas/relation-types')
        ) {
          return Promise.resolve(jsonResponse([]))
        }
        return Promise.resolve(
          jsonResponse({ code: 'STUB', message: `not mocked: ${target}` }, 500),
        )
      }),
    )
  }

  async function openPublish() {
    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: 'Publish' }),
      ).toBeInTheDocument()
    })
    fireEvent.click(screen.getByRole('button', { name: 'Publish' }))
    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: 'Confirm publish' }),
      ).toBeInTheDocument()
    })
  }

  it('reflects Draft → Active after a successful publish', async () => {
    let status = 'draft'
    stubEditor({
      status: () => status,
      activate: () => {
        status = 'active'
        return jsonResponse({
          id: 7,
          status: 'active',
          publishedAt: '2026-09-21T01:00:00+00:00',
          enqueuedPublicationJob: 42,
        })
      },
    })
    renderEditor()
    await openPublish()
    fireEvent.click(screen.getByRole('button', { name: 'Confirm publish' }))
    await waitFor(() => {
      expect(screen.getByText('This version is published')).toBeInTheDocument()
    })
    expect(screen.getByText(/Publication job 42/)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Publish' })).toBeNull()
  })

  it('shows Reload on stale revision without success state', async () => {
    stubEditor({
      activate: () =>
        jsonResponse(
          {
            code: 'STALE_REVISION',
            message: 'The Atlas version was modified by someone else.',
          },
          409,
        ),
    })
    renderEditor()
    await openPublish()
    fireEvent.click(screen.getByRole('button', { name: 'Confirm publish' }))
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Reload' })).toBeInTheDocument()
    })
    expect(screen.queryByText(/Published /)).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Reload' }))
    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: 'Publish' }),
      ).toBeInTheDocument()
    })
  })

  it('renders an active version read-only with no publish path', async () => {
    stubEditor({ status: () => 'active' })
    renderEditor()
    await waitFor(() => {
      expect(screen.getByText('This version is published')).toBeInTheDocument()
    })
    expect(screen.queryByRole('button', { name: 'Publish' })).toBeNull()
    expect(screen.queryByLabelText('Node')).toBeNull()
  })

  it('keeps the draft editable after a failed publish', async () => {
    stubEditor({
      activate: () => jsonResponse({ code: 'HTTP_500', message: 'Boom.' }, 500),
    })
    renderEditor()
    await openPublish()
    fireEvent.click(screen.getByRole('button', { name: 'Confirm publish' }))
    await waitFor(() => {
      expect(screen.getByText(/Boom/)).toBeInTheDocument()
    })
    expect(screen.queryByText(/Published /)).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: 'Publish' }),
      ).toBeInTheDocument()
    })
  })

  it('switches the panel to the returned issues on publish precondition failure', async () => {
    stubEditor({
      activate: () =>
        jsonResponse(
          {
            code: 'VALIDATION_BLOCKED',
            message: 'The publish battery refused.',
            issues: [
              {
                code: 'NODE_TYPE_INACTIVE',
                nodeKey: 'project-2b3c4d5e',
                messageToken: 'atlas.nodeTypeInactive',
              },
            ],
          },
          409,
        ),
    })
    renderEditor()
    await openPublish()
    fireEvent.click(screen.getByRole('button', { name: 'Confirm publish' }))
    await waitFor(() => {
      // Both the dialog and the validation panel render the returned
      // issues: the dialog reports the failure, the panel gates publish.
      expect(screen.getAllByText(/inactive node type/i)).toHaveLength(2)
    })
    expect(screen.getByRole('button', { name: 'Publish' })).toBeDisabled()
  })

  it('renders an archived version read-only', async () => {
    stubEditor({ status: () => 'archived' })
    renderEditor()
    await waitFor(() => {
      expect(screen.getByText('This version is archived')).toBeInTheDocument()
    })
    expect(screen.queryByRole('button', { name: 'Publish' })).toBeNull()
  })
})
