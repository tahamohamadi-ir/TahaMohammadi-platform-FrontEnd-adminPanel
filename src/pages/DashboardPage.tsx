import { Link } from 'react-router-dom'

import { adminApiPath, apiBaseUrl } from '@/config/env'
import { useAuth } from '@/lib/auth/AuthProvider'

export function DashboardPage() {
  const { user, logout } = useAuth()

  return (
    <main className="page">
      <h1>Dashboard</h1>
      <p className="muted">
        Signed in as <strong>{user?.displayName ?? user?.email}</strong>
        {user?.mfaEnrolled ? ' · MFA enrolled' : ''}
      </p>
      <section className="card">
        <dl>
          <dt>API base</dt>
          <dd>
            <code>{apiBaseUrl() || '(same-origin relative)'}</code>
          </dd>
          <dt>Admin API prefix</dt>
          <dd>
            <code>{adminApiPath()}</code>
          </dd>
          <dt>OTP verified this session</dt>
          <dd>
            <code>{user?.otpVerified ? 'yes' : 'no'}</code>
          </dd>
        </dl>
      </section>
      <p>
        <button type="button" onClick={() => void logout()}>
          Sign out
        </button>
        {' · '}
        <Link to="/sign-in">Switch account</Link>
      </p>
    </main>
  )
}
