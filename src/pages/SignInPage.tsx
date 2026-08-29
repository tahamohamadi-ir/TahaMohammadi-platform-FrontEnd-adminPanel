import { Link } from 'react-router-dom'

export function SignInPage() {
  return (
    <main className="page">
      <h1>Sign in</h1>
      <p className="muted">
        Placeholder only. Authentication flow is not implemented in Wave 0.
      </p>
      <section className="card">
        <form className="placeholder-form" aria-label="Sign in placeholder">
          <label>
            Email
            <input type="email" name="email" autoComplete="username" disabled />
          </label>
          <label>
            Password
            <input
              type="password"
              name="password"
              autoComplete="current-password"
              disabled
            />
          </label>
          <button type="button" disabled>
            Sign in (not wired)
          </button>
        </form>
      </section>
      <p>
        <Link to="/dashboard">Continue to dashboard placeholder</Link>
      </p>
    </main>
  )
}
