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
import { SettingsPage } from '@/pages/SettingsPage'

const SETTINGS = {
  brandName: 'Taha Mohammadi',
  tagline: 'Research',
  contactEmail: 'a@example.com',
  contactEmployer: '',
  contactEmployerUrl: '',
  contactFormEnabled: true,
  contactLinkedin: '',
  contactLocation: '',
  contactOrcid: '',
  contactPhone: '',
  contactPhoneIntl: '',
  currentCv: null,
  currentCvMediaId: null,
  currentResume: null,
  currentResumeMediaId: null,
  footerText: 'Footer',
  navLinks: [],
  primaryColor: '#0f766e',
  seoDefaultDescription: 'Desc',
  seoDefaultTitle: 'Title',
  seedPolicy: { show_phone: false, public_cv_download: false },
  updatedAt: '2026-09-01T00:00:00.000Z',
}

const ME = {
  id: 1,
  email: 'admin@example.com',
  displayName: 'Admin',
  isStaff: true,
  mfaEnrolled: true,
  otpVerified: true,
  featureFlags: {},
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

function renderSettings() {
  return render(
    <QueryClientProvider client={createTestQueryClient()}>
      <MemoryRouter initialEntries={['/settings']}>
        <AuthProvider>
          <SettingsPage />
        </AuthProvider>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('SettingsPage (ADMIN-150)', () => {
  beforeEach(() => {
    vi.unstubAllGlobals()
    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation((url: string) => {
        if (String(url).includes('/auth/me'))
          return Promise.resolve(jsonResponse(ME))
        if (String(url).includes('/api/v1/admin/site')) {
          return Promise.resolve(jsonResponse(SETTINGS))
        }
        return Promise.resolve(new Response(null, { status: 404 }))
      }),
    )
  })

  it('shows the signed-in profile and loads settings into the form', async () => {
    renderSettings()
    await waitFor(() => {
      expect(screen.getByDisplayValue('Taha Mohammadi')).toBeInTheDocument()
    })
    expect(screen.getByText('admin@example.com')).toBeInTheDocument()
  })

  it('renders the seed policy read-only (ADMIN-281)', async () => {
    renderSettings()
    const table = await screen.findByRole('table', {
      name: /seed policy decisions/i,
    })
    expect(table).toBeInTheDocument()
    expect(
      within(table).getByRole('cell', { name: 'show_phone' }),
    ).toBeInTheDocument()
    expect(
      within(table).getAllByRole('cell', { name: 'false' }).length,
    ).toBeGreaterThan(0)
  })

  it('blocks client-side when brandName exceeds the server limit', async () => {
    renderSettings()
    const input = await screen.findByLabelText(/brand name/i)
    fireEvent.change(input, { target: { value: 'x'.repeat(201) } })
    fireEvent.submit(input.closest('form')!)
    await waitFor(() => {
      const alerts = screen.getAllByRole('alert')
      expect(
        alerts.some((alert) => /200 characters/i.test(alert.textContent ?? '')),
      ).toBe(true)
    })
    expect(
      vi
        .mocked(fetch)
        .mock.calls.some(
          ([url, init]) =>
            String(url).includes('/api/v1/admin/site') &&
            (init as RequestInit | undefined)?.method === 'PUT',
        ),
    ).toBe(false)
  })

  it('shows a conflict state with reload when settings changed elsewhere', async () => {
    vi.mocked(fetch).mockImplementation(
      (input: RequestInfo | URL, init?: RequestInit) => {
        const url = String(input)
        if (url.includes('/auth/me')) return Promise.resolve(jsonResponse(ME))
        if (init?.method === 'PUT') {
          return Promise.resolve(
            jsonResponse({ code: 'CONFLICT', message: 'Stale settings' }, 409),
          )
        }
        return Promise.resolve(jsonResponse(SETTINGS))
      },
    )
    renderSettings()
    const input = await screen.findByLabelText(/brand name/i)
    fireEvent.change(input, { target: { value: 'New name' } })
    fireEvent.submit(input.closest('form')!)
    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(
        /changed elsewhere|reload/i,
      )
    })
    expect(
      screen.getByRole('button', { name: /reload latest/i }),
    ).toBeInTheDocument()
  })

  it('renders localized site settings and scene presets (PU-08-settings)', async () => {
    vi.mocked(fetch).mockImplementation((input: RequestInfo | URL) => {
      const url = String(input)
      if (url.includes('/auth/me')) return Promise.resolve(jsonResponse(ME))
      if (url.includes('/api/v1/admin/site/en')) {
        return Promise.resolve(
          jsonResponse({
            locale: 'en',
            revision: 'rev-en-1',
            brandName: 'Taha Mohammadi',
            tagline: 'Research and Platform',
            footerText: 'Footer content en',
            seo: {
              title: 'Taha Mohammadi - Research',
              description: 'Research platform profile and portfolio',
            },
            navLinks: [{ label: 'Research', href: '/en/research' }],
            audienceLinks: [
              {
                kind: 'research',
                label: 'Academic Work',
                href: '/en/research',
              },
              { kind: 'employment', label: 'Industry CV', href: '/en/cv' },
            ],
            scene: {
              graphPreset: 'atlas-v2',
              portalPreset: 'arch-v2',
              motion: 'full',
              density: 'standard',
            },
            status: 'draft',
            publishedAt: null,
            updatedAt: '2026-09-01T12:00:00.000Z',
          }),
        )
      }
      if (url.includes('/api/v1/admin/site')) {
        return Promise.resolve(jsonResponse(SETTINGS))
      }
      return Promise.resolve(new Response(null, { status: 404 }))
    })

    renderSettings()
    const heading = await screen.findByRole('heading', {
      name: /localized site identity/i,
    })
    expect(heading).toBeInTheDocument()
    expect(screen.getByLabelText(/graph scene preset/i)).toHaveValue('atlas-v2')
    expect(screen.getByLabelText(/portal preset/i)).toHaveValue('arch-v2')
  })

  it('saves and publishes localized site settings (PU-08-settings)', async () => {
    let putCalled = false
    let publishCalled = false

    vi.mocked(fetch).mockImplementation(
      (input: RequestInfo | URL, init?: RequestInit) => {
        const url = String(input)
        if (url.includes('/auth/me')) return Promise.resolve(jsonResponse(ME))
        if (url.includes('/auth/csrf'))
          return Promise.resolve(
            jsonResponse({ csrfToken: 'dummy-csrf-token' }),
          )
        if (
          url.includes('/api/v1/admin/site/en/publish') &&
          init?.method === 'POST'
        ) {
          publishCalled = true
          return Promise.resolve(
            jsonResponse({
              locale: 'en',
              revision: 'rev-en-2',
              status: 'published',
              publishedAt: '2026-09-06T12:00:00.000Z',
            }),
          )
        }
        if (url.includes('/api/v1/admin/site/en') && init?.method === 'PUT') {
          putCalled = true
          return Promise.resolve(
            jsonResponse({
              locale: 'en',
              revision: 'rev-en-2',
              brandName: 'Updated Name',
              tagline: 'Research',
              footerText: 'Footer',
              seo: { title: 'T', description: 'D' },
              navLinks: [],
              audienceLinks: [],
              scene: {
                graphPreset: 'atlas-v2',
                portalPreset: 'arch-v2',
                motion: 'full',
                density: 'standard',
              },
              status: 'draft',
              publishedAt: null,
              updatedAt: '2026-09-06T12:01:00.000Z',
            }),
          )
        }
        if (url.includes('/api/v1/admin/site/en')) {
          return Promise.resolve(
            jsonResponse({
              locale: 'en',
              revision: 'rev-en-1',
              brandName: 'Taha Mohammadi',
              tagline: 'Research and Platform',
              footerText: 'Footer content en',
              seo: { title: 'Title', description: 'Desc' },
              navLinks: [],
              audienceLinks: [],
              scene: {
                graphPreset: 'atlas-v2',
                portalPreset: 'arch-v2',
                motion: 'full',
                density: 'standard',
              },
              status: 'draft',
              publishedAt: null,
              updatedAt: '2026-09-01T12:00:00.000Z',
            }),
          )
        }
        if (url.includes('/api/v1/admin/site')) {
          return Promise.resolve(jsonResponse(SETTINGS))
        }
        return Promise.resolve(new Response(null, { status: 404 }))
      },
    )

    renderSettings()
    await screen.findByRole('heading', { name: /localized site identity/i })

    // Save draft
    const saveDraftBtn = await screen.findByRole('button', {
      name: /save draft/i,
    })
    fireEvent.submit(saveDraftBtn.closest('form')!)
    await waitFor(() => {
      expect(putCalled).toBe(true)
      expect(screen.getByText(/localized draft saved/i)).toBeInTheDocument()
    })

    // Publish
    const publishBtn = screen.getByRole('button', {
      name: /publish localized settings/i,
    })
    fireEvent.click(publishBtn)
    await waitFor(() => {
      expect(publishCalled).toBe(true)
      expect(
        screen.getByText(/localized settings published/i),
      ).toBeInTheDocument()
    })
  })
})
