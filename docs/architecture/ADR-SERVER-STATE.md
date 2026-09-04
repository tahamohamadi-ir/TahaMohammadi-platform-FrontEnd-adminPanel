# ADR — Server State (TanStack Query)

Status: Accepted

Date: 2026-08-31

## Context

Admin workflows load and mutate server-owned data across many endpoints. Ad-hoc `useEffect` + `useState` per screen duplicates loading, error, cache, and invalidation logic.

## Decision

Use **TanStack Query v5** for server-state:

- `QueryClientProvider` at the app root (inside `BrowserRouter`, wrapping `AuthProvider`).
- Default options: `retry: 1` for queries, `staleTime: 30_000` for list/summary reads, `retry: false` in tests.
- Query keys centralized in `src/lib/query/keys.ts`.
- Reads: `useQuery` in `src/lib/api/hooks/`.
- Writes: `useMutation` + `adminFetch` / `adminJson`; on success, `invalidateQueries` for affected keys.
- On login/logout: `queryClient.clear()` to prevent cross-user cache leaks.
- Components do not maintain duplicate server copies except transient optimistic UI (future ADR for forms).

## Consequences

- New dependencies: `@tanstack/react-query`.
- Workflow modules add hooks, not raw fetch in page components.
- Global loading for auth bootstrap remains in `AuthProvider`; route-level loading uses query `isPending`.

## Related

- `src/lib/query/client.ts`, `src/lib/query/provider.tsx`, `src/lib/query/keys.ts`
- ADR-AUTH-SESSION (cache clear on session change)
