import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'

/* Admin display preferences (Phase 6): colour theme and interface locale.
 * Only these two non-sensitive choices touch localStorage; credentials never
 * do. Both are applied to <html> so light/dark and fa/en stay in step for
 * every page, portal and dialog. */

export type ThemePreference = 'light' | 'dark' | 'system'
export type AdminLocale = 'en' | 'fa'

export const THEME_STORAGE_KEY = 'admin-theme'
export const LOCALE_STORAGE_KEY = 'admin-locale'

interface PreferencesContextValue {
  theme: ThemePreference
  resolvedTheme: 'light' | 'dark'
  setTheme: (theme: ThemePreference) => void
  locale: AdminLocale
  dir: 'ltr' | 'rtl'
  setLocale: (locale: AdminLocale) => void
}

const PreferencesContext = createContext<PreferencesContextValue | null>(null)

function readStored<T extends string>(key: string, allowed: T[], fallback: T) {
  try {
    const value = window.localStorage.getItem(key)
    return allowed.includes(value as T) ? (value as T) : fallback
  } catch {
    return fallback
  }
}

function writeStored(key: string, value: string) {
  try {
    window.localStorage.setItem(key, value)
  } catch {
    // Private mode or blocked storage: the choice lasts for this tab only.
  }
}

function systemPrefersDark() {
  return (
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-color-scheme: dark)').matches
  )
}

export function PreferencesProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<ThemePreference>(() =>
    readStored(THEME_STORAGE_KEY, ['light', 'dark', 'system'], 'system'),
  )
  const [locale, setLocaleState] = useState<AdminLocale>(() =>
    readStored(LOCALE_STORAGE_KEY, ['en', 'fa'], 'en'),
  )
  const [systemDark, setSystemDark] = useState(systemPrefersDark)

  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return
    const query = window.matchMedia('(prefers-color-scheme: dark)')
    const onChange = () => setSystemDark(query.matches)
    query.addEventListener('change', onChange)
    return () => query.removeEventListener('change', onChange)
  }, [])

  const resolvedTheme: 'light' | 'dark' =
    theme === 'system' ? (systemDark ? 'dark' : 'light') : theme
  const dir = locale === 'fa' ? 'rtl' : 'ltr'

  useEffect(() => {
    const root = document.documentElement
    root.classList.toggle('dark', resolvedTheme === 'dark')
    root.style.colorScheme = resolvedTheme
  }, [resolvedTheme])

  useEffect(() => {
    const root = document.documentElement
    root.lang = locale
    root.dir = dir
  }, [locale, dir])

  const setTheme = useCallback((next: ThemePreference) => {
    writeStored(THEME_STORAGE_KEY, next)
    setThemeState(next)
  }, [])

  const setLocale = useCallback((next: AdminLocale) => {
    writeStored(LOCALE_STORAGE_KEY, next)
    setLocaleState(next)
  }, [])

  const value = useMemo(
    () => ({ theme, resolvedTheme, setTheme, locale, dir, setLocale }) as const,
    [theme, resolvedTheme, setTheme, locale, dir, setLocale],
  )

  return (
    <PreferencesContext.Provider value={value}>
      {children}
    </PreferencesContext.Provider>
  )
}

/** Falls back to light/en outside the provider so isolated component tests
 * keep rendering without wiring preferences. */
export function usePreferences(): PreferencesContextValue {
  const context = useContext(PreferencesContext)
  if (context) return context
  return {
    theme: 'light',
    resolvedTheme: 'light',
    setTheme: () => undefined,
    locale: 'en',
    dir: 'ltr',
    setLocale: () => undefined,
  }
}
