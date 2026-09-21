import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { QueryClientProvider } from '@tanstack/react-query'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { PublishDialog } from '@/components/atlas/PublishDialog'
import { createTestQueryClient } from '@/lib/query/client'

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

const SUCCESS = {
  id: 3,
  status: 'active',
  publishedAt: '2026-09-21T00:00:00+00:00',
  enqueuedPublicationJob: 41,
}

function renderDialog(
  props: Partial<Parameters<typeof PublishDialog>[0]> = {},
) {
  const onPublished = vi.fn()
  const onValidationBlocked = vi.fn()
  const onReload = vi.fn()
  const onClose = vi.fn()
  render(
    <QueryClientProvider client={createTestQueryClient()}>
      <PublishDialog
        versionId={3}
        revision="3-2026-09-21T00:00:00+00:00"
        versionLabel="Draft v3"
        nodeCount={2}
        relationCount={1}
        warningCount={1}
        onPublished={onPublished}
        onValidationBlocked={onValidationBlocked}
        onReload={onReload}
        onClose={onClose}
        {...props}
      />
    </QueryClientProvider>,
  )
  return { onPublished, onValidationBlocked, onReload, onClose }
}

describe('PublishDialog (Plan B Task 15)', () => {
  beforeEach(() => {
    vi.unstubAllGlobals()
    vi.stubGlobal('fetch', vi.fn())
  })

  it('requires confirmation before the call and names the version', async () => {
    vi.mocked(fetch).mockImplementation(() =>
      Promise.resolve(jsonResponse(SUCCESS)),
    )
    renderDialog()
    expect(screen.getByText(/Draft v3/)).toBeInTheDocument()
    expect(screen.getByText(/2 nodes/)).toBeInTheDocument()
    expect(screen.getByText(/1 warning/)).toBeInTheDocument()
    expect(vi.mocked(fetch)).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: 'Confirm publish' }))
    await waitFor(() => {
      expect(vi.mocked(fetch)).toHaveBeenCalledTimes(1)
    })
    const [url, init] = vi.mocked(fetch).mock.calls[0] as [string, RequestInit]
    expect(String(url)).toBe('/api/v1/admin/atlas/versions/3/activate')
    expect(init.method).toBe('POST')
    expect(new Headers(init.headers).get('If-Match')).toBe(
      '3-2026-09-21T00:00:00+00:00',
    )
  })

  it('shows the status line with the job id after success', async () => {
    vi.mocked(fetch).mockImplementation(() =>
      Promise.resolve(jsonResponse(SUCCESS)),
    )
    const { onPublished } = renderDialog()
    fireEvent.click(screen.getByRole('button', { name: 'Confirm publish' }))
    await waitFor(() => {
      expect(screen.getByText(/Published /)).toBeInTheDocument()
    })
    expect(screen.getByText(/Publication job 41/)).toBeInTheDocument()
    expect(onPublished).toHaveBeenCalledWith(SUCCESS)
    expect(screen.queryByRole('button', { name: 'Confirm publish' })).toBeNull()
  })

  it('renders the returned issues on VALIDATION_BLOCKED without success', async () => {
    vi.mocked(fetch).mockImplementation(() =>
      Promise.resolve(
        jsonResponse(
          {
            code: 'VALIDATION_BLOCKED',
            message: 'The publish battery refused.',
            issues: [
              {
                code: 'HIERARCHY_CYCLE',
                relationKey: 'a~contains~b',
                messageToken: 'atlas.hierarchyCycle',
              },
            ],
          },
          409,
        ),
      ),
    )
    const { onValidationBlocked, onPublished } = renderDialog()
    fireEvent.click(screen.getByRole('button', { name: 'Confirm publish' }))
    await waitFor(() => {
      expect(screen.getByText(/a~contains~b/)).toBeInTheDocument()
    })
    expect(onValidationBlocked).toHaveBeenCalledTimes(1)
    expect(onPublished).not.toHaveBeenCalled()
    expect(screen.queryByText(/Published /)).toBeNull()
  })

  it('offers Reload on STALE_REVISION without claiming success', async () => {
    vi.mocked(fetch).mockImplementation(() =>
      Promise.resolve(
        jsonResponse(
          {
            code: 'STALE_REVISION',
            message: 'The Atlas version was modified by someone else.',
          },
          409,
        ),
      ),
    )
    const { onReload, onPublished } = renderDialog()
    fireEvent.click(screen.getByRole('button', { name: 'Confirm publish' }))
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Reload' })).toBeInTheDocument()
    })
    expect(onPublished).not.toHaveBeenCalled()
    expect(screen.queryByText(/Published /)).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Reload' }))
    expect(onReload).toHaveBeenCalledTimes(1)
  })

  it('prevents double-submit while publishing', async () => {
    let release!: (value: Response) => void
    vi.mocked(fetch).mockImplementation(
      () =>
        new Promise<Response>((resolve) => {
          release = resolve
        }),
    )
    renderDialog()
    fireEvent.click(screen.getByRole('button', { name: 'Confirm publish' }))
    // The pending state disables the button: a second submit cannot start
    // while the first is in flight.
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Publishing…' })).toBeDisabled()
    })
    expect(vi.mocked(fetch)).toHaveBeenCalledTimes(1)
    release(jsonResponse(SUCCESS))
    await waitFor(() => {
      expect(screen.getByText(/Published /)).toBeInTheDocument()
    })
    expect(vi.mocked(fetch)).toHaveBeenCalledTimes(1)
  })

  it('never presents success state after a failed publish', async () => {
    vi.mocked(fetch).mockImplementation(() =>
      Promise.resolve(
        jsonResponse({ code: 'HTTP_500', message: 'Boom.' }, 500),
      ),
    )
    renderDialog()
    fireEvent.click(screen.getByRole('button', { name: 'Confirm publish' }))
    await waitFor(() => {
      expect(screen.getByText(/Boom/)).toBeInTheDocument()
    })
    expect(screen.queryByText(/Published /)).toBeNull()
  })
})
