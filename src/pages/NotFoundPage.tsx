import { Link } from 'react-router-dom'

export function NotFoundPage() {
  return (
    <main className="page">
      <h1>Page not found</h1>
      <p className="muted">The requested admin route does not exist.</p>
      <p>
        <Link to="/dashboard">Back to dashboard</Link>
      </p>
    </main>
  )
}
