import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { AdminNav, filterNavItems, type NavItem } from '@/components/Nav'
import type { AdminUserOut } from '@/lib/api/auth'

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
