import {
  BarChart3Icon,
  ChevronDownIcon,
  FileTextIcon,
  ImageIcon,
  LayoutDashboardIcon,
  NetworkIcon,
  SendIcon,
  SettingsIcon,
  type LucideIcon,
} from 'lucide-react'
import { useState } from 'react'
import { NavLink } from 'react-router-dom'

import type { AdminUserOut } from '@/lib/api/auth'
import {
  usePreferences,
  type AdminLocale,
} from '@/lib/preferences/PreferencesProvider'
import { cn } from '@/lib/utils'

export type NavGroupId =
  'content' | 'atlas' | 'media' | 'publishing' | 'insights' | 'settings'

export interface NavItem {
  to: string
  label: string
  /** Persian chrome label; the English label is the fallback. */
  labelFa?: string
  /** Sidebar group; ungrouped items render above the groups. */
  group?: NavGroupId
  /** Hidden unless the user is staff. */
  requiresStaff?: boolean
  /** Hidden unless user.featureFlags[flag] is true. */
  featureFlag?: string
}

export interface NavGroup {
  id: NavGroupId
  label: string
  labelFa: string
  icon: LucideIcon
}

/** Sidebar groups in display order (Phase 6 AppShell). */
export const ADMIN_NAV_GROUPS: NavGroup[] = [
  { id: 'content', label: 'Content', labelFa: 'محتوا', icon: FileTextIcon },
  {
    id: 'atlas',
    label: 'Atlas & graph',
    labelFa: 'اطلس و گراف',
    icon: NetworkIcon,
  },
  { id: 'media', label: 'Media', labelFa: 'رسانه', icon: ImageIcon },
  {
    id: 'publishing',
    label: 'Publishing',
    labelFa: 'انتشار',
    icon: SendIcon,
  },
  { id: 'insights', label: 'Insights', labelFa: 'تحلیل', icon: BarChart3Icon },
  {
    id: 'settings',
    label: 'Settings',
    labelFa: 'تنظیمات',
    icon: SettingsIcon,
  },
]

/** Sections shipped by this client. New workflows add one entry here,
 * never a bare <Link> elsewhere, so authorization stays in one place. */
export const ADMIN_NAV_ITEMS: NavItem[] = [
  {
    to: '/dashboard',
    label: 'Dashboard',
    labelFa: 'پیشخوان',
    requiresStaff: true,
  },
  {
    to: '/content/article',
    label: 'Articles',
    labelFa: 'مقاله‌ها',
    group: 'content',
    requiresStaff: true,
  },
  {
    to: '/content/series',
    label: 'Series',
    labelFa: 'مجموعه‌نوشته‌ها',
    group: 'content',
    requiresStaff: true,
  },
  {
    to: '/content/research-topic',
    label: 'Research topics',
    labelFa: 'موضوع‌های پژوهشی',
    group: 'content',
    requiresStaff: true,
  },
  {
    to: '/content/research-statement',
    label: 'Research statements',
    labelFa: 'بیانیه‌های پژوهشی',
    group: 'content',
    requiresStaff: true,
  },
  {
    to: '/content/project',
    label: 'Projects',
    labelFa: 'پروژه‌ها',
    group: 'content',
    requiresStaff: true,
  },
  {
    to: '/content/publication',
    label: 'Publications',
    labelFa: 'انتشارات',
    group: 'content',
    requiresStaff: true,
  },
  {
    to: '/content/book',
    label: 'Books',
    labelFa: 'کتاب‌ها',
    group: 'content',
    requiresStaff: true,
  },
  {
    to: '/content/talk',
    label: 'Talks',
    labelFa: 'سخنرانی‌ها',
    group: 'content',
    requiresStaff: true,
  },
  {
    to: '/content/download',
    label: 'Downloads',
    labelFa: 'دانلودها',
    group: 'content',
    requiresStaff: true,
  },
  {
    to: '/content/course',
    label: 'Courses',
    labelFa: 'دوره‌ها',
    group: 'content',
    requiresStaff: true,
  },
  {
    to: '/content/lesson',
    label: 'Lessons',
    labelFa: 'درس‌ها',
    group: 'content',
    requiresStaff: true,
  },
  {
    to: '/content/collection',
    label: 'Collections',
    labelFa: 'کلکسیون‌ها',
    group: 'content',
    requiresStaff: true,
  },
  {
    to: '/content/creative-work',
    label: 'Creative work',
    labelFa: 'آثار خلاقانه',
    group: 'content',
    requiresStaff: true,
  },
  {
    to: '/content/profile',
    label: 'Profiles',
    labelFa: 'پروفایل‌ها',
    group: 'content',
    requiresStaff: true,
  },
  {
    to: '/content/landing',
    label: 'Landings',
    labelFa: 'صفحه‌های فرود',
    group: 'content',
    requiresStaff: true,
  },
  {
    to: '/home',
    label: 'Home composition',
    labelFa: 'چیدمان خانه',
    group: 'content',
    requiresStaff: true,
  },
  {
    to: '/timeline',
    label: 'Timeline',
    labelFa: 'خط زمانی',
    group: 'content',
    requiresStaff: true,
  },
  {
    to: '/graph',
    label: 'Graph editor',
    labelFa: 'ویرایشگر گراف',
    group: 'atlas',
    requiresStaff: true,
  },
  {
    to: '/atlas',
    label: 'Atlas',
    labelFa: 'اطلس',
    group: 'atlas',
    requiresStaff: true,
  },
  {
    to: '/media',
    label: 'Media',
    labelFa: 'کتابخانهٔ رسانه',
    group: 'media',
    requiresStaff: true,
  },
  {
    to: '/approvals',
    label: 'Approval queue',
    labelFa: 'صف تأیید',
    group: 'publishing',
    requiresStaff: true,
  },
  {
    to: '/publication-jobs',
    label: 'Publication jobs',
    labelFa: 'کارهای انتشار',
    group: 'publishing',
    requiresStaff: true,
  },
  {
    to: '/analytics',
    label: 'Analytics',
    labelFa: 'آمار',
    group: 'insights',
    requiresStaff: true,
  },
  {
    to: '/settings',
    label: 'Settings',
    labelFa: 'تنظیمات سایت',
    group: 'settings',
    requiresStaff: true,
  },
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

export function navLabel(
  item: { label: string; labelFa?: string },
  locale: AdminLocale,
) {
  return locale === 'fa' && item.labelFa ? item.labelFa : item.label
}

/** Longest nav entry whose path prefixes `pathname` (for breadcrumbs). */
export function matchNavItem(
  pathname: string,
  items: NavItem[] = ADMIN_NAV_ITEMS,
) {
  let best: NavItem | undefined
  for (const item of items) {
    if (pathname === item.to || pathname.startsWith(`${item.to}/`)) {
      if (!best || item.to.length > best.to.length) best = item
    }
  }
  return best
}

const linkClass = ({ isActive }: { isActive: boolean }) =>
  cn(
    'flex min-h-9 items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium no-underline transition-colors duration-150',
    'text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
    'focus-visible:ring-[3px] focus-visible:ring-ring/40 focus-visible:outline-none',
    isActive &&
      'bg-sidebar-accent font-semibold text-sidebar-accent-foreground shadow-[inset_3px_0_0_var(--primary)] rtl:shadow-[inset_-3px_0_0_var(--primary)]',
  )

function NavGroupSection({
  group,
  items,
  onNavigate,
}: {
  group: NavGroup
  items: NavItem[]
  onNavigate?: () => void
}) {
  const { locale } = usePreferences()
  const [open, setOpen] = useState(true)
  const listId = `admin-nav-group-${group.id}`
  const Icon = group.icon
  return (
    <li className="grid gap-0.5">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={listId}
        onClick={() => setOpen((value) => !value)}
        className="flex min-h-9 w-full items-center gap-2 rounded-md px-3 text-xs font-semibold tracking-wide text-muted-foreground uppercase hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/40 focus-visible:outline-none"
      >
        <Icon className="size-4" aria-hidden="true" />
        <span className="flex-1 text-start">{navLabel(group, locale)}</span>
        <ChevronDownIcon
          className={cn(
            'size-4 transition-transform duration-150',
            !open && '-rotate-90 rtl:rotate-90',
          )}
          aria-hidden="true"
        />
      </button>
      <ul
        id={listId}
        hidden={!open}
        className="m-0 grid list-none gap-0.5 p-0 ps-3"
      >
        {items.map((item) => (
          <li key={item.to}>
            <NavLink className={linkClass} to={item.to} onClick={onNavigate}>
              {navLabel(item, locale)}
            </NavLink>
          </li>
        ))}
      </ul>
    </li>
  )
}

/** Grouped, collapsible sidebar navigation (Phase 6). Groups start open;
 * collapsing hides the group's links from every user, not only visually. */
export function AdminNav({
  items,
  onNavigate,
}: {
  items: NavItem[]
  onNavigate?: () => void
}) {
  const { locale } = usePreferences()
  const ungrouped = items.filter((item) => !item.group)
  return (
    <nav className="admin-nav" aria-label="Admin sections">
      <ul className="m-0 grid list-none gap-3 p-0">
        {ungrouped.length > 0 ? (
          <li>
            <ul className="m-0 grid list-none gap-0.5 p-0">
              {ungrouped.map((item) => (
                <li key={item.to}>
                  <NavLink
                    className={linkClass}
                    to={item.to}
                    onClick={onNavigate}
                  >
                    {item.to === '/dashboard' ? (
                      <LayoutDashboardIcon
                        className="size-4"
                        aria-hidden="true"
                      />
                    ) : null}
                    {navLabel(item, locale)}
                  </NavLink>
                </li>
              ))}
            </ul>
          </li>
        ) : null}
        {ADMIN_NAV_GROUPS.map((group) => {
          const groupItems = items.filter((item) => item.group === group.id)
          if (groupItems.length === 0) return null
          return (
            <NavGroupSection
              key={group.id}
              group={group}
              items={groupItems}
              onNavigate={onNavigate}
            />
          )
        })}
      </ul>
    </nav>
  )
}
