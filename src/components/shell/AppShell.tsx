import {
  ChevronRightIcon,
  LogOutIcon,
  MenuIcon,
  MonitorIcon,
  MoonIcon,
  PanelLeftCloseIcon,
  PanelLeftOpenIcon,
  SunIcon,
} from 'lucide-react'
import { useState } from 'react'
import { Link, Outlet, useLocation } from 'react-router-dom'

import {
  ADMIN_NAV_GROUPS,
  ADMIN_NAV_ITEMS,
  AdminNav,
  filterNavItems,
  matchNavItem,
  navLabel,
} from '@/components/Nav'
import { Button } from '@/components/ui/button'
import { DialogRoot, DialogTitle, SheetContent } from '@/components/ui/dialog'
import { Toaster } from '@/components/ui/sonner'
import { useAuth } from '@/lib/auth/AuthProvider'
import {
  usePreferences,
  type AdminLocale,
  type ThemePreference,
} from '@/lib/preferences/PreferencesProvider'
import { cn } from '@/lib/utils'

/* Admin chrome, authored once (Phase 6). Every protected route renders
 * inside this layout: a grouped sidebar, a topbar with breadcrumb, theme
 * (light / dark / system) and locale (en / fa, which also flips `dir`).
 * Pages own their <main> landmark; the shell never adds a second one. */

const CHROME = {
  en: {
    brand: 'Taha Mohammadi',
    brandSub: 'Content admin',
    home: 'Admin',
    breadcrumb: 'Breadcrumb',
    openNav: 'Open navigation',
    closeNav: 'Close navigation',
    collapse: 'Hide sidebar',
    expand: 'Show sidebar',
    theme: 'Colour theme',
    light: 'Light theme',
    dark: 'Dark theme',
    system: 'System theme',
    language: 'Interface language',
    signOut: 'Sign out',
    skip: 'Skip to content',
    newItem: 'New',
    preview: 'Preview',
    taxonomy: 'Taxonomy',
    version: 'Version',
  },
  fa: {
    brand: 'طاها محمدی',
    brandSub: 'مدیریت محتوا',
    home: 'مدیریت',
    breadcrumb: 'مسیر صفحه',
    openNav: 'باز کردن منو',
    closeNav: 'بستن منو',
    collapse: 'پنهان کردن نوار کناری',
    expand: 'نمایش نوار کناری',
    theme: 'پوستهٔ رنگی',
    light: 'پوستهٔ روشن',
    dark: 'پوستهٔ تیره',
    system: 'پوستهٔ سیستم',
    language: 'زبان رابط',
    signOut: 'خروج',
    skip: 'رفتن به محتوا',
    newItem: 'جدید',
    preview: 'پیش‌نمایش',
    taxonomy: 'رده‌بندی',
    version: 'نسخه',
  },
} as const

type Chrome = (typeof CHROME)[AdminLocale]

interface Crumb {
  label: string
  to?: string
}

/** Pure breadcrumb trail for a router pathname (exported for tests). */
export function breadcrumbsFor(pathname: string, locale: AdminLocale): Crumb[] {
  const t: Chrome = CHROME[locale]
  const crumbs: Crumb[] = [{ label: t.home, to: '/dashboard' }]
  const item = matchNavItem(pathname)
  if (!item) return crumbs
  const group = ADMIN_NAV_GROUPS.find((entry) => entry.id === item.group)
  if (group) crumbs.push({ label: navLabel(group, locale) })
  crumbs.push({ label: navLabel(item, locale), to: item.to })
  const rest = pathname.slice(item.to.length).split('/').filter(Boolean)
  for (const segment of rest) {
    if (segment === 'new') crumbs.push({ label: t.newItem })
    else if (segment === 'preview') crumbs.push({ label: t.preview })
    else if (segment === 'taxonomy') crumbs.push({ label: t.taxonomy })
    else if (/^\d+$/.test(segment)) {
      crumbs.push({
        label:
          item.group === 'atlas' ? `${t.version} ${segment}` : `#${segment}`,
      })
    } else crumbs.push({ label: segment })
  }
  return crumbs
}

function Breadcrumbs({ crumbs, label }: { crumbs: Crumb[]; label: string }) {
  return (
    <nav aria-label={label} className="min-w-0 flex-1">
      <ol className="m-0 flex min-w-0 list-none items-center gap-1 p-0 text-sm">
        {crumbs.map((crumb, index) => {
          const last = index === crumbs.length - 1
          return (
            <li
              key={`${crumb.label}-${index}`}
              className="flex min-w-0 items-center gap-1"
            >
              {index > 0 ? (
                <ChevronRightIcon
                  className="size-3.5 shrink-0 text-muted-foreground rtl:rotate-180"
                  aria-hidden="true"
                />
              ) : null}
              {last ? (
                <span
                  aria-current="page"
                  className="truncate font-semibold text-foreground"
                >
                  {crumb.label}
                </span>
              ) : crumb.to ? (
                <Link
                  to={crumb.to}
                  className="truncate text-muted-foreground no-underline hover:text-foreground"
                >
                  {crumb.label}
                </Link>
              ) : (
                <span className="truncate text-muted-foreground">
                  {crumb.label}
                </span>
              )}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}

const THEME_OPTIONS: {
  value: ThemePreference
  icon: typeof SunIcon
  key: 'light' | 'dark' | 'system'
}[] = [
  { value: 'light', icon: SunIcon, key: 'light' },
  { value: 'dark', icon: MoonIcon, key: 'dark' },
  { value: 'system', icon: MonitorIcon, key: 'system' },
]

const segmentGroup =
  'inline-flex items-center gap-0.5 rounded-lg border bg-card p-0.5'
const segmentButton =
  'inline-flex min-h-9 min-w-9 items-center justify-center rounded-md px-2 text-xs font-semibold text-muted-foreground transition-colors duration-150 hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/40 focus-visible:outline-none aria-pressed:bg-accent aria-pressed:text-accent-foreground'

function ThemeSwitch({ t }: { t: Chrome }) {
  const { theme, setTheme } = usePreferences()
  return (
    <div role="group" aria-label={t.theme} className={segmentGroup}>
      {THEME_OPTIONS.map(({ value, icon: Icon, key }) => (
        <button
          key={value}
          type="button"
          aria-pressed={theme === value}
          aria-label={t[key]}
          title={t[key]}
          className={segmentButton}
          onClick={() => setTheme(value)}
        >
          <Icon className="size-4" aria-hidden="true" />
        </button>
      ))}
    </div>
  )
}

function LocaleSwitch({ t }: { t: Chrome }) {
  const { locale, setLocale } = usePreferences()
  return (
    <div role="group" aria-label={t.language} className={segmentGroup}>
      <button
        type="button"
        lang="en"
        aria-pressed={locale === 'en'}
        className={segmentButton}
        onClick={() => setLocale('en')}
      >
        EN
      </button>
      <button
        type="button"
        lang="fa"
        aria-pressed={locale === 'fa'}
        className={cn(segmentButton, 'font-fa')}
        onClick={() => setLocale('fa')}
      >
        فا
      </button>
    </div>
  )
}

function Brand({ t }: { t: Chrome }) {
  return (
    <Link
      to="/dashboard"
      className="flex items-center gap-3 rounded-md px-2 py-1 text-sidebar-foreground no-underline focus-visible:ring-[3px] focus-visible:ring-ring/40 focus-visible:outline-none"
    >
      <span
        aria-hidden="true"
        className="inline-flex size-9 items-center justify-center rounded-lg bg-primary text-sm font-bold text-primary-foreground"
      >
        tm
      </span>
      <span className="grid leading-tight">
        <span className="text-sm font-semibold">{t.brand}</span>
        <span className="text-xs text-muted-foreground">{t.brandSub}</span>
      </span>
    </Link>
  )
}

export function AppShell() {
  const { user, logout } = useAuth()
  const { locale } = usePreferences()
  const { pathname } = useLocation()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [collapsed, setCollapsed] = useState(false)
  const t = CHROME[locale]
  const items = filterNavItems(ADMIN_NAV_ITEMS, user)

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      <a
        href="#admin-content"
        className="sr-only z-50 rounded-md bg-primary px-3 py-2 text-primary-foreground focus:not-sr-only focus:fixed focus:start-3 focus:top-3"
      >
        {t.skip}
      </a>

      {!collapsed ? (
        <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-e border-sidebar-border bg-sidebar lg:flex">
          <div className="flex h-16 items-center border-b border-sidebar-border px-3">
            <Brand t={t} />
          </div>
          <div className="flex-1 overflow-y-auto px-2 py-4">
            <AdminNav items={items} />
          </div>
          {user ? (
            <div className="border-t border-sidebar-border p-3">
              <p
                className="m-0 truncate text-xs text-muted-foreground"
                title={user.email}
              >
                {user.displayName ?? user.email}
              </p>
            </div>
          ) : null}
        </aside>
      ) : null}

      <DialogRoot open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent
          closeLabel={t.closeNav}
          aria-describedby={undefined}
          dir={locale === 'fa' ? 'rtl' : 'ltr'}
        >
          <DialogTitle className="sr-only">{t.openNav}</DialogTitle>
          <div className="flex h-16 items-center border-b border-sidebar-border px-3">
            <Brand t={t} />
          </div>
          <div className="flex-1 overflow-y-auto px-2 py-4">
            <AdminNav items={items} onNavigate={() => setMobileOpen(false)} />
          </div>
        </SheetContent>
      </DialogRoot>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b bg-background/85 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/70 sm:px-6">
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className="lg:hidden"
            aria-label={t.openNav}
            onClick={() => setMobileOpen(true)}
          >
            <MenuIcon aria-hidden="true" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className="hidden lg:inline-flex"
            aria-label={collapsed ? t.expand : t.collapse}
            aria-pressed={collapsed}
            onClick={() => setCollapsed((value) => !value)}
          >
            {collapsed ? (
              <PanelLeftOpenIcon
                className="rtl:-scale-x-100"
                aria-hidden="true"
              />
            ) : (
              <PanelLeftCloseIcon
                className="rtl:-scale-x-100"
                aria-hidden="true"
              />
            )}
          </Button>
          <Breadcrumbs
            crumbs={breadcrumbsFor(pathname, locale)}
            label={t.breadcrumb}
          />
          <div className="flex shrink-0 items-center gap-2">
            <LocaleSwitch t={t} />
            <ThemeSwitch t={t} />
            {user ? (
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label={t.signOut}
                title={t.signOut}
                onClick={() => void logout()}
              >
                <LogOutIcon className="rtl:-scale-x-100" aria-hidden="true" />
              </Button>
            ) : null}
          </div>
        </header>
        <div
          id="admin-content"
          tabIndex={-1}
          className="min-w-0 flex-1 outline-none"
        >
          <Outlet />
        </div>
      </div>
      <Toaster />
    </div>
  )
}
