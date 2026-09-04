import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { useQueryClient } from '@tanstack/react-query'

import type { AdminUserOut, LoginIn, AdminApiError } from '@/lib/api/auth'
import {
  fetchCurrentAdmin,
  installDefaultCsrfProvider,
  loginAdmin,
  logoutAdmin,
} from '@/lib/api/auth'

type AuthStatus = 'loading' | 'anonymous' | 'authenticated'

interface AuthContextValue {
  user: AdminUserOut | null
  status: AuthStatus
  login: (payload: LoginIn) => Promise<void>
  logout: () => Promise<void>
  refresh: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AdminUserOut | null>(null)
  const [status, setStatus] = useState<AuthStatus>('loading')
  const queryClient = useQueryClient()

  const refresh = useCallback(async () => {
    const current = await fetchCurrentAdmin()
    setUser(current)
    setStatus(current ? 'authenticated' : 'anonymous')
  }, [])

  useEffect(() => {
    installDefaultCsrfProvider()
    void refresh()
  }, [refresh])

  const login = useCallback(async (payload: LoginIn) => {
    const nextUser = await loginAdmin(payload)
    setUser(nextUser)
    setStatus('authenticated')
  }, [])

  const logout = useCallback(async () => {
    try {
      await logoutAdmin()
    } finally {
      // Never leak privileged server state across sessions.
      queryClient.clear()
      setUser(null)
      setStatus('anonymous')
    }
  }, [queryClient])

  const value = useMemo(
    () => ({ user, status, login, logout, refresh }),
    [user, status, login, logout, refresh],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}

export function isMfaRequiredError(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as AdminApiError).code === 'AUTH_FAILED'
  )
}
