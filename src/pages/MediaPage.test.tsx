import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react'
import { QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { AuthProvider } from '@/lib/auth/AuthProvider'
import { createTestQueryClient } from '@/lib/query/client'
import { MediaPage } from '@/pages/MediaPage'

const ME = {
  id: 1,
  email: 'admin@example.com',
  displayName: 'Admin',
  isStaff: true,
  mfaEnrolled: true,
  otpVerified: true,
  featureFlags: {},
}

const ITEM = {
  id: 5,
  title: 'Cover image',
  mime: 'image/png',
  size: 12345,
  url: '/media/cover.png',
  altText: '',
  altTextEn: '',
  altTextFa: '',
  isActive: true,
  usageCount: 2,
  createdAt: '2026-09-01T00:00:00.000Z',
  updatedAt: '2026-09-01T00:00:00.000Z',
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

function stubMedia(
  overrides?: (url: string, init?: RequestInit) => Response | null,
) {
  vi.stubGlobal(
    'fetch',
    vi
      .fn()
      .mockImplementation((input: RequestInfo | URL, init?: RequestInit) => {
        const url = String(input)
        if (url.includes('/auth/me')) return Promise.resolve(jsonResponse(ME))
        const custom = overrides?.(url, init)
        if (custom) return Promise.resolve(custom)
        return Promise.resolve(
          jsonResponse({ items: [ITEM], page: 1, pageSize: 20, total: 1 }),
        )
      }),
  )
}

function renderMedia() {
  return render(
    <QueryClientProvider client={createTestQueryClient()}>
      <MemoryRouter>
        <AuthProvider>
          <MediaPage />
        </AuthProvider>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('MediaPage (ADMIN-180)', () => {
  beforeEach(() => {
    vi.unstubAllGlobals()
  })

  it('renders rows with title, mime, and usage count', async () => {
    stubMedia()
    renderMedia()
    const table = await screen.findByRole('table', { name: /media library/i })
    expect(table).toBeInTheDocument()
    expect(screen.getByText(/cover image/i)).toBeInTheDocument()
    expect(screen.getByText('image/png')).toBeInTheDocument()
    expect(screen.getByText(/used by 2/i)).toBeInTheDocument()
  })

  it('uploads a file through the multipart create op', async () => {
    stubMedia()
    renderMedia()
    const input = await screen.findByLabelText(/upload file/i)
    const file = new File(['bytes'], 'cover.png', { type: 'image/png' })
    fireEvent.change(input, { target: { files: [file] } })
    fireEvent.change(screen.getByLabelText(/upload title/i), {
      target: { value: 'Cover image' },
    })
    fireEvent.click(screen.getByRole('button', { name: /upload/i }))
    await waitFor(() => {
      const uploadCall = vi
        .mocked(fetch)
        .mock.calls.find(
          ([url, init]) =>
            String(url).endsWith('/api/v1/admin/media') &&
            (init as RequestInit | undefined)?.method === 'POST',
        )
      expect(uploadCall).toBeTruthy()
      expect((uploadCall![1]?.body as FormData).get('file')).toBe(file)
    })
  })

  it('deletes with confirmation and shows the in-use guard honestly', async () => {
    let deleteCount = 0
    stubMedia((_url, init) => {
      if (init?.method === 'DELETE') {
        deleteCount += 1
        if (deleteCount === 1) {
          return jsonResponse(
            {
              code: 'MEDIA_IN_USE',
              message:
                'Media is still referenced by content and cannot be deleted.',
              field_errors: {},
              usageCount: 2,
            },
            409,
          )
        }
        return new Response(null, { status: 204 })
      }
      return null
    })
    renderMedia()
    fireEvent.click(await screen.findByRole('button', { name: /delete/i }))
    const dialog = screen.getByRole('dialog', { name: /delete media/i })
    expect(dialog).toBeInTheDocument()
    fireEvent.click(
      within(dialog).getByRole('button', { name: /confirm delete/i }),
    )
    await waitFor(() => {
      const alert = screen.getByRole('alert')
      expect(alert).toHaveTextContent(/referenced by content/i)
    })
    // Second attempt succeeds after the (simulated) reference removal.
    fireEvent.click(screen.getByRole('button', { name: /delete/i }))
    fireEvent.click(
      within(screen.getByRole('dialog')).getByRole('button', {
        name: /confirm delete/i,
      }),
    )
    await waitFor(() => {
      expect(deleteCount).toBe(2)
    })
  })
})
