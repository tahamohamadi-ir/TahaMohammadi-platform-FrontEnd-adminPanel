import { type FormEvent, useEffect, useState } from 'react'
import { Link, Navigate, useLocation } from 'react-router-dom'

import { AdminApiError, fetchCsrfToken } from '@/lib/api/auth'
import { isMfaRequiredError, useAuth } from '@/lib/auth/AuthProvider'

export function SignInPage() {
  const { login, status } = useAuth()
  const location = useLocation()
  const redirectTo =
    (location.state as { from?: string } | null)?.from ?? '/dashboard'

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [otpToken, setOtpToken] = useState('')
  const [showMfa, setShowMfa] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    void fetchCsrfToken().catch(() => {
      setError('Could not initialize CSRF token.')
    })
  }, [])

  if (status === 'authenticated') {
    return <Navigate to={redirectTo} replace />
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSubmitting(true)
    setError(null)

    try {
      await login({
        email: email.trim(),
        password,
        otpToken: otpToken.trim() || null,
      })
    } catch (caught) {
      if (isMfaRequiredError(caught) && !showMfa) {
        setShowMfa(true)
        setError('Enter your authenticator code or recovery code.')
      } else if (caught instanceof AdminApiError) {
        setError(caught.message)
      } else {
        setError('Sign-in failed. Please try again.')
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className="page">
      <h1>Sign in</h1>
      <p className="muted">Session cookie authentication with CSRF protection.</p>
      <section className="card">
        <form className="auth-form" aria-label="Sign in" onSubmit={handleSubmit}>
          <label>
            Email
            <input
              type="email"
              name="email"
              autoComplete="username"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </label>
          <label>
            Password
            <input
              type="password"
              name="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </label>
          {showMfa && (
            <label>
              Authenticator or recovery code
              <input
                type="text"
                name="otpToken"
                autoComplete="one-time-code"
                inputMode="numeric"
                value={otpToken}
                onChange={(event) => setOtpToken(event.target.value)}
              />
            </label>
          )}
          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}
          <button type="submit" disabled={submitting}>
            {submitting ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
      </section>
      <p>
        <Link to="/dashboard">Back to dashboard</Link>
      </p>
    </main>
  )
}
