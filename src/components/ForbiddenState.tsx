import { Link } from 'react-router-dom'

/** Honest forbidden state (ADMIN-130): shown when the signed-in user lacks
 * the staff bit or a required feature flag. Never renders the guarded page. */
export function ForbiddenState({ detail }: { detail?: string }) {
  return (
    <main className="page">
      <h1>Forbidden</h1>
      <p className="muted">
        {detail ?? 'Your account is not permitted to use this section.'}
      </p>
      <p>
        <Link to="/dashboard">Back to dashboard</Link>
      </p>
    </main>
  )
}
