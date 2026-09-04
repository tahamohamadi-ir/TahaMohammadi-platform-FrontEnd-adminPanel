import { Link } from 'react-router-dom'

import { AdminNav, ADMIN_NAV_ITEMS, filterNavItems } from '@/components/Nav'
import { Notice } from '@/components/ui/primitives'
import { Table } from '@/components/ui/primitives'
import { useAuth } from '@/lib/auth/AuthProvider'
import {
  useContentHealth,
  useDashboardSummary,
} from '@/lib/api/hooks/useDashboard'

/** Dashboard + backend health/degraded status (ADMIN-140). Reads the real
 * dashboard-summary and content-health operations; every number shown comes
 * from the server, degraded media health is an explicit warning. */
export function DashboardPage() {
  const { user, logout } = useAuth()
  const summary = useDashboardSummary()
  const health = useContentHealth()

  const isPending = summary.isPending || health.isPending
  const failure = summary.error ?? health.error ?? null
  const retry = () => {
    void summary.refetch()
    void health.refetch()
  }

  const healthData = health.data
  const degradedCount =
    (healthData?.missingAltMedia ?? 0) +
    (healthData?.orphanMedia ?? 0) +
    (healthData?.incompleteTranslations ?? 0)

  const countRows = summary.data
    ? [
        { metric: 'Drafts', value: summary.data.drafts },
        { metric: 'Published', value: summary.data.published },
        ...Object.entries(summary.data.contentCounts).map(
          ([metric, value]) => ({ metric, value }),
        ),
      ]
    : []

  return (
    <main className="page">
      <AdminNav items={filterNavItems(ADMIN_NAV_ITEMS, user)} />
      <h1>Dashboard</h1>
      <p className="muted">
        Signed in as <strong>{user?.displayName ?? user?.email}</strong>
        {user?.mfaEnrolled ? ' · MFA enrolled' : ''}
      </p>

      {isPending ? <p role="status">Loading dashboard…</p> : null}

      {failure ? (
        <>
          <Notice tone="error" title="Dashboard unavailable">
            The backend did not answer. Check the API origin and try again.
          </Notice>
          <p>
            <button type="button" className="admin-button" onClick={retry}>
              Retry
            </button>
          </p>
        </>
      ) : null}

      {!isPending && !failure && summary.data ? (
        <section aria-labelledby="dashboard-counts">
          <h2 id="dashboard-counts">Content overview</h2>
          <Table
            caption="Action-oriented content counts"
            columns={[
              { key: 'metric', header: 'Metric' },
              { key: 'value', header: 'Count' },
            ]}
            rows={countRows}
            rowKey={(row) => row.metric}
          />
        </section>
      ) : null}

      {!isPending && !failure && healthData ? (
        <section aria-labelledby="dashboard-health">
          <h2 id="dashboard-health">Backend health</h2>
          {degradedCount > 0 ? (
            <Notice tone="warning" title="Media health needs attention">
              {[
                healthData.missingAltMedia > 0 &&
                  `${healthData.missingAltMedia} media items missing alt text`,
                healthData.orphanMedia > 0 &&
                  `${healthData.orphanMedia} orphan media items`,
                healthData.incompleteTranslations > 0 &&
                  `${healthData.incompleteTranslations} incomplete translations`,
              ]
                .filter(Boolean)
                .join(' · ')}
              .
            </Notice>
          ) : (
            <p role="status">All health indicators are clear.</p>
          )}
          <Table
            caption="Lifecycle and media health counts"
            columns={[
              { key: 'metric', header: 'Metric' },
              { key: 'value', header: 'Count' },
            ]}
            rows={[
              { metric: 'Drafts', value: healthData.drafts },
              { metric: 'In review', value: healthData.review },
              { metric: 'Scheduled', value: healthData.scheduled },
              { metric: 'Published', value: healthData.published },
              { metric: 'Archived', value: healthData.archived },
            ]}
            rowKey={(row) => row.metric}
          />
        </section>
      ) : null}

      <p>
        <button
          type="button"
          className="admin-button admin-button--secondary"
          onClick={() => void logout()}
        >
          Sign out
        </button>{' '}
        · <Link to="/sign-in">Switch account</Link>
      </p>
    </main>
  )
}
