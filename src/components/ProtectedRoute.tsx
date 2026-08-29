import { Navigate, useLocation } from 'react-router-dom'

import { useAuth } from '@/lib/auth/AuthProvider'

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { status } = useAuth()
  const location = useLocation()

  if (status === 'loading') {
    return (
      <main className="page">
        <p className="muted">Checking session…</p>
      </main>
    )
  }

  if (status === 'anonymous') {
    return <Navigate to="/sign-in" replace state={{ from: location.pathname }} />
  }

  return children
}
