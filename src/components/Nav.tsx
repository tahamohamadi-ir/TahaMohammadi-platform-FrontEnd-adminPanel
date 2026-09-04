import { NavLink } from 'react-router-dom'

import type { AdminUserOut } from '@/lib/api/auth'

export interface NavItem {
  to: string
  label: string
  /** Hidden unless the user is staff. */
  requiresStaff?: boolean
  /** Hidden unless user.featureFlags[flag] is true. */
  featureFlag?: string
}

/** Sections shipped by this client. New workflows add one entry here,
 * never a bare <Link> elsewhere, so authorization stays in one place. */
export const ADMIN_NAV_ITEMS: NavItem[] = [
  { to: '/dashboard', label: 'Dashboard', requiresStaff: true },
  { to: '/content/article', label: 'Articles', requiresStaff: true },
  { to: '/content/series', label: 'Series', requiresStaff: true },
  {
    to: '/content/research-topic',
    label: 'Research topics',
    requiresStaff: true,
  },
  {
    to: '/content/research-statement',
    label: 'Research statements',
    requiresStaff: true,
  },
  { to: '/content/project', label: 'Projects', requiresStaff: true },
  { to: '/content/publication', label: 'Publications', requiresStaff: true },
  { to: '/content/book', label: 'Books', requiresStaff: true },
  { to: '/content/talk', label: 'Talks', requiresStaff: true },
  { to: '/content/download', label: 'Downloads', requiresStaff: true },
  { to: '/content/course', label: 'Courses', requiresStaff: true },
  {
    to: '/content/creative-work',
    label: 'Creative work',
    requiresStaff: true,
  },
  { to: '/settings', label: 'Settings', requiresStaff: true },
]

/** Pure visibility rule: staff bit first, then the named feature flag.
 * The backend still enforces every mutation; this only decides what the
 * sidebar offers. */
export function filterNavItems(
  items: NavItem[],
  user: AdminUserOut | null,
): NavItem[] {
  if (!user) return []
  return items.filter((item) => {
    if (item.requiresStaff && !user.isStaff) return false
    if (item.featureFlag && !user.featureFlags?.[item.featureFlag]) {
      return false
    }
    return true
  })
}

export function AdminNav({ items }: { items: NavItem[] }) {
  return (
    <nav className="admin-nav" aria-label="Admin sections">
      {items.map((item) => (
        <NavLink key={item.to} className="admin-nav__link" to={item.to}>
          {item.label}
        </NavLink>
      ))}
    </nav>
  )
}
