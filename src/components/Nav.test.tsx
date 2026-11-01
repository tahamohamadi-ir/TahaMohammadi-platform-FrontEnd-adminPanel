import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import {
  AdminNav,
  ADMIN_NAV_GROUPS,
  ADMIN_NAV_ITEMS,
  filterNavItems,
  matchNavItem,
  type NavItem,
} from '@/components/Nav'
import type { AdminUserOut } from '@/lib/api/auth'
import {
  LOCALE_STORAGE_KEY,
  PreferencesProvider,
} from '@/lib/preferences/PreferencesProvider'

const ITEMS: NavItem[] = [
  { to: '/dashboard', label: 'Dashboard' },
  { to: '/settings', label: 'Settings' },
  { to: '/media', label: 'Media', featureFlag: 'media-library' },
  { to: '/graph', label: 'Graph editor', requiresStaff: true },
]

function staffUser(overrides: Partial<AdminUserOut> = {}): AdminUserOut {
  return {
    id: 1,
    email: 'admin@example.com',
    displayName: 'Admin',
    isStaff: true,
    mfaEnrolled: true,
    otpVerified: true,
    featureFlags: {},
    ...overrides,
  }
}

describe('permission-aware navigation (ADMIN-130)', () => {
  beforeEach(() => {
    vi.unstubAllGlobals()
  })

  it('ships the ADMIN-170/171 collection entries', () => {
    const labels = ADMIN_NAV_ITEMS.map((item) => item.label)
    for (const label of [
      'Articles',
      'Series',
      'Research topics',
      'Projects',
      'Publications',
      'Books',
      'Talks',
      'Downloads',
      'Courses',
      'Lessons',
      'Collections',
      'Creative work',
      'Profiles',
      'Landings',
    ]) {
      expect(labels, label).toContain(label)
    }
  })

  it('hides feature-flagged items when the flag is off', () => {
    const visible = filterNavItems(ITEMS, staffUser({ featureFlags: {} }))
    expect(visible.map((item) => item.to)).toEqual([
      '/dashboard',
      '/settings',
      '/graph',
    ])
  })

  it('shows feature-flagged items when the flag is on', () => {
    const visible = filterNavItems(
      ITEMS,
      staffUser({ featureFlags: { 'media-library': true } }),
    )
    expect(visible.map((item) => item.to)).toContain('/media')
  })

  it('hides staff-only items from non-staff users', () => {
    const visible = filterNavItems(ITEMS, staffUser({ isStaff: false }))
    expect(visible.map((item) => item.to)).not.toContain('/graph')
  })

  it('renders visible items as navigation links', () => {
    render(
      <MemoryRouter>
        <AdminNav items={filterNavItems(ITEMS, staffUser())} />
      </MemoryRouter>,
    )
    const nav = screen.getByRole('navigation', { name: 'Admin sections' })
    expect(nav).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Dashboard' })).toBeInTheDocument()
    expect(
      screen.queryByRole('link', { name: 'Media' }),
    ).not.toBeInTheDocument()
  })
})

describe('Atlas navigation entry (Plan B Task 9)', () => {
  it('ships the Atlas entry staff-only', () => {
    const atlas = ADMIN_NAV_ITEMS.find((item) => item.to === '/atlas')
    expect(atlas).toBeDefined()
    expect(atlas?.label).toBe('Atlas')
    expect(atlas?.requiresStaff).toBe(true)
  })

  it('hides Atlas from non-staff users', () => {
    const visible = filterNavItems(
      ADMIN_NAV_ITEMS,
      staffUser({ isStaff: false }),
    )
    expect(visible.map((item) => item.to)).not.toContain('/atlas')
  })
})

describe('grouped sidebar (Phase 6 AppShell)', () => {
  beforeEach(() => {
    window.localStorage.clear()
  })

  it('files every section except the dashboard under one of six groups', () => {
    expect(ADMIN_NAV_GROUPS.map((group) => group.label)).toEqual([
      'Content',
      'Atlas & graph',
      'Media',
      'Publishing',
      'Insights',
      'Settings',
    ])
    const ids = ADMIN_NAV_GROUPS.map((group) => group.id)
    for (const item of ADMIN_NAV_ITEMS) {
      if (item.to === '/dashboard') {
        expect(item.group).toBeUndefined()
      } else {
        expect(ids, item.to).toContain(item.group)
      }
    }
  })

  it('collapses a group and hides its links from assistive tech', () => {
    render(
      <MemoryRouter>
        <AdminNav items={filterNavItems(ADMIN_NAV_ITEMS, staffUser())} />
      </MemoryRouter>,
    )
    const toggle = screen.getByRole('button', { name: 'Content' })
    expect(toggle).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getByRole('link', { name: 'Articles' })).toBeInTheDocument()
    fireEvent.click(toggle)
    expect(toggle).toHaveAttribute('aria-expanded', 'false')
    expect(
      screen.queryByRole('link', { name: 'Articles' }),
    ).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Atlas' })).toBeInTheDocument()
  })

  it('renders Persian chrome labels under the fa locale', () => {
    window.localStorage.setItem(LOCALE_STORAGE_KEY, 'fa')
    render(
      <PreferencesProvider>
        <MemoryRouter>
          <AdminNav items={filterNavItems(ADMIN_NAV_ITEMS, staffUser())} />
        </MemoryRouter>
      </PreferencesProvider>,
    )
    expect(screen.getByRole('button', { name: 'محتوا' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'مقاله‌ها' })).toHaveAttribute(
      'href',
      '/content/article',
    )
  })

  it('matches nested routes to the longest nav entry', () => {
    expect(matchNavItem('/content/article/42')?.label).toBe('Articles')
    expect(matchNavItem('/atlas/7/preview')?.label).toBe('Atlas')
    expect(matchNavItem('/nowhere')).toBeUndefined()
  })
})
