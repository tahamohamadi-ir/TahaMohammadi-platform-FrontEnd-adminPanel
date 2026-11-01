import { QueryClientProvider } from '@tanstack/react-query'
import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { AppShell, breadcrumbsFor } from '@/components/shell/AppShell'
import { AuthProvider } from '@/lib/auth/AuthProvider'
import {
  LOCALE_STORAGE_KEY,
  PreferencesProvider,
  THEME_STORAGE_KEY,
} from '@/lib/preferences/PreferencesProvider'
import { createTestQueryClient } from '@/lib/query/client'

const ME = {
  id: 1,
  email: 'admin@example.com',
  displayName: 'Admin',
  isStaff: true,
  mfaEnrolled: true,
  otpVerified: true,
  featureFlags: {},
}

function renderShell(path = '/content/article/42') {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockImplementation(() =>
      Promise.resolve(
        new Response(JSON.stringify(ME), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        }),
      ),
    ),
  )
  return render(
    <PreferencesProvider>
      <QueryClientProvider client={createTestQueryClient()}>
        <MemoryRouter initialEntries={[path]}>
          <AuthProvider>
            <Routes>
              <Route element={<AppShell />}>
                <Route
                  path="*"
                  element={
                    <main>
                      <h1>Page body</h1>
                    </main>
                  }
                />
              </Route>
            </Routes>
          </AuthProvider>
        </MemoryRouter>
      </QueryClientProvider>
    </PreferencesProvider>,
  )
}

async function sidebarReady() {
  const sidebar = screen.getByRole('navigation', { name: 'Admin sections' })
  await within(sidebar).findByRole('link', { name: 'Articles' })
}

describe('AppShell (Phase 6)', () => {
  beforeEach(() => {
    window.localStorage.clear()
    document.documentElement.className = ''
    document.documentElement.removeAttribute('dir')
    document.documentElement.lang = 'en'
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('renders the page once inside the shared chrome', async () => {
    renderShell()
    const sidebar = screen.getByRole('navigation', { name: 'Admin sections' })
    expect(
      await within(sidebar).findByRole('link', { name: 'Articles' }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('heading', { name: 'Page body' }),
    ).toBeInTheDocument()
    expect(screen.getAllByRole('main')).toHaveLength(1)
    const crumbs = screen.getByRole('navigation', { name: 'Breadcrumb' })
    expect(crumbs).toHaveTextContent(/Admin.*Content.*Articles.*#42/)
    expect(screen.getByText('#42')).toHaveAttribute('aria-current', 'page')
  })

  it('switches light, dark and system themes on <html> and remembers them', async () => {
    renderShell()
    await sidebarReady()
    fireEvent.click(screen.getByRole('button', { name: 'Dark theme' }))
    expect(document.documentElement).toHaveClass('dark')
    expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBe('dark')
    expect(screen.getByRole('button', { name: 'Dark theme' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    fireEvent.click(screen.getByRole('button', { name: 'Light theme' }))
    expect(document.documentElement).not.toHaveClass('dark')
    fireEvent.click(screen.getByRole('button', { name: 'System theme' }))
    expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBe('system')
  })

  it('flips lang and dir together with the fa/en switch', async () => {
    renderShell()
    await sidebarReady()
    fireEvent.click(screen.getByRole('button', { name: 'فا' }))
    await waitFor(() => {
      expect(document.documentElement).toHaveAttribute('dir', 'rtl')
    })
    expect(document.documentElement).toHaveAttribute('lang', 'fa')
    expect(window.localStorage.getItem(LOCALE_STORAGE_KEY)).toBe('fa')
    const sidebar = screen.getByRole('navigation', { name: 'Admin sections' })
    expect(
      within(sidebar).getByRole('link', { name: 'مقاله‌ها' }),
    ).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'EN' }))
    await waitFor(() => {
      expect(document.documentElement).toHaveAttribute('dir', 'ltr')
    })
  })

  it('collapses the desktop sidebar from the topbar', async () => {
    renderShell()
    await sidebarReady()
    fireEvent.click(screen.getByRole('button', { name: 'Hide sidebar' }))
    expect(
      screen.queryByRole('navigation', { name: 'Admin sections' }),
    ).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Show sidebar' }))
    expect(
      screen.getByRole('navigation', { name: 'Admin sections' }),
    ).toBeInTheDocument()
  })
})

describe('breadcrumbsFor', () => {
  it('names Atlas versions and nested segments', () => {
    expect(
      breadcrumbsFor('/atlas/7/preview', 'en').map((c) => c.label),
    ).toEqual(['Admin', 'Atlas & graph', 'Atlas', 'Version 7', 'Preview'])
    expect(
      breadcrumbsFor('/content/project/new', 'fa').map((c) => c.label),
    ).toEqual(['مدیریت', 'محتوا', 'پروژه‌ها', 'جدید'])
    expect(breadcrumbsFor('/dashboard', 'en').map((c) => c.label)).toEqual([
      'Admin',
      'Dashboard',
    ])
  })
})
