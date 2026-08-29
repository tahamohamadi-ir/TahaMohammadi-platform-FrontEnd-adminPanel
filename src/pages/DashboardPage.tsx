import { Link } from 'react-router-dom'

import { adminApiPath, apiBaseUrl } from '@/config/env'

export function DashboardPage() {
  return (
    <main className="page">
      <h1>Dashboard</h1>
      <p className="muted">
        Placeholder shell for Wave 0. No session or API calls are made yet.
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
        </dl>
      </section>
      <p>
        <Link to="/sign-in">Sign in placeholder</Link>
      </p>
    </main>
  )
}
