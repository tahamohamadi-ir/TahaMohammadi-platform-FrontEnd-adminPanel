import { fireEvent, render, screen, waitFor } from '@testing-library/react'
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
})
