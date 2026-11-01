import type { AdminUserOut } from '@/lib/api/auth'

/** Read-only profile facts from the session (/auth/me). */
export function ProfileSection({ user }: { user: AdminUserOut | null }) {
  return (
    <section aria-labelledby="profile-title" className="admin-panel">
      <h2 id="profile-title">Profile</h2>
      <dl className="grid grid-cols-[max-content_minmax(0,1fr)] gap-x-6 gap-y-1.5 text-sm">
        <dt className="muted">Display name</dt>
        <dd className="m-0">{user?.displayName}</dd>
        <dt className="muted">Email</dt>
        <dd className="m-0">{user?.email}</dd>
        <dt className="muted">MFA enrolled</dt>
        <dd className="m-0">{user?.mfaEnrolled ? 'yes' : 'no'}</dd>
        <dt className="muted">OTP verified this session</dt>
        <dd className="m-0">{user?.otpVerified ? 'yes' : 'no'}</dd>
      </dl>
      <p className="muted admin-small mt-3 mb-0">
        Profile facts come from the session and are read-only here.
      </p>
    </section>
  )
}
