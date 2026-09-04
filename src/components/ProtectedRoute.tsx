import { Navigate, useLocation } from 'react-router-dom'

import { ForbiddenState } from '@/components/ForbiddenState'
import { useAuth } from '@/lib/auth/AuthProvider'

interface ProtectedRouteProps {
  children: React.ReactNode
  /** Require user.isStaff (server is still the enforcer). */
  requireStaff?: boolean
  /** Require user.featureFlags[flag] to be true. */
  featureFlag?: string
}

export function ProtectedRoute({
  children,
  requireStaff,
  featureFlag,
}: ProtectedRouteProps) {
  const { user, status } = useAuth()
  const location = useLocation()

  if (status === 'loading') {
    return (
      <main className="page">
        <p className="muted">Checking session…</p>
      </main>
    )
  }

  if (status === 'anonymous') {
    return (
      <Navigate to="/sign-in" replace state={{ from: location.pathname }} />
    )
  }

  if (requireStaff && !user?.isStaff) {
    return (
      <ForbiddenState detail="Staff access is required for this section." />
    )
  }

  if (featureFlag && !user?.featureFlags?.[featureFlag]) {
    return (
      <ForbiddenState detail="This section is not enabled for your account." />
    )
  }

  return children
}
