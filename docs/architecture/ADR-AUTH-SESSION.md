# ADR — Auth and Session

Status: Accepted

Date: 2026-08-31

## Context

The admin panel is a same-origin authenticated SPA. The backend owns session cookies, CSRF tokens, MFA, and authorization. The client must not invent auth behavior beyond the accepted OpenAPI and `Docs/03-contracts/AUTH-CONTRACT.md`.

## Decision

Use **cookie-based session authentication** with:

- `credentials: 'include'` on every admin API request (`adminFetch`).
- CSRF token from `GET /api/v1/admin/auth/csrf`, cached in memory, sent as `X-CSRFToken` on mutations.
- `AuthProvider` as the session boundary: `loading` → `anonymous` | `authenticated`.
- Sign-in via `POST /api/v1/admin/auth/login`; identity from `GET /api/v1/admin/auth/me`.
- MFA: optional `otpToken` on login when the server returns `AUTH_FAILED` for OTP-required staff.
- Sign-out via `POST /api/v1/admin/auth/logout`; clear local CSRF cache and TanStack Query cache.
- Unauthenticated users redirect to `/sign-in`; forbidden server responses (403) render `ForbiddenPage`, not sign-in.
- Session expiry: treat 401 on protected routes as anonymous and redirect to sign-in with return path.

## Consequences

- No bearer tokens or localStorage session secrets.
- `AdminUserOut.featureFlags` and `isStaff` may inform UI only; every mutation is re-authorized server-side.
- Re-authentication flows reuse the sign-in page with MFA field when required.

## Related

- `src/lib/auth/AuthProvider.tsx`
- `src/lib/api/auth.ts`, `src/lib/api/client.ts`
- `Docs/03-contracts/AUTH-CONTRACT.md`
