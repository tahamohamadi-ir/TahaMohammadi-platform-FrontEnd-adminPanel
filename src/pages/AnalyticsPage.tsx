import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'

import { AdminNav, ADMIN_NAV_ITEMS, filterNavItems } from '@/components/Nav'
import { Notice, SelectField, TextField } from '@/components/ui/primitives'
import { AdminApiError } from '@/lib/api/auth'
import {
  fetchAnalyticsReport,
  type AnalyticsReportOut,
} from '@/lib/api/analytics'
import { useAuth } from '@/lib/auth/AuthProvider'

function defaultFromDate(): string {
  const d = new Date()
  d.setDate(d.getDate() - 30)
  return d.toISOString().split('T')[0]!
}

function defaultToDate(): string {
  return new Date().toISOString().split('T')[0]!
}

/** First-party aggregate analytics dashboard (PU-22-analytics, §I07).
 * Shows date/locale event counts with metric definitions and empty/error/not-connected states. */
export function AnalyticsPage() {
  const { user } = useAuth()
  const [fromDate, setFromDate] = useState<string>(defaultFromDate)
  const [toDate, setToDate] = useState<string>(defaultToDate)
  const [locale, setLocale] = useState<string>('all')

  const queryKey = ['analytics-report', fromDate, toDate, locale] as const

  const analyticsQuery = useQuery<AnalyticsReportOut, Error>({
    queryKey,
    queryFn: () => fetchAnalyticsReport({ from: fromDate, to: toDate, locale }),
    retry: false,
  })

  const isNotConnected =
    analyticsQuery.error instanceof AdminApiError &&
    (analyticsQuery.error.status === 404 ||
      analyticsQuery.error.kind === 'not_found')

  const totalEvents =
    analyticsQuery.data?.rows.reduce((sum, r) => sum + r.count, 0) ?? 0

  return (
    <main className="page">
      <AdminNav items={filterNavItems(ADMIN_NAV_ITEMS, user)} />
      <h1>Analytics</h1>

      {/* Metric Definitions & Privacy Notice */}
      <section
        aria-labelledby="analytics-definitions-heading"
        style={{
          padding: '1rem',
          backgroundColor: 'var(--surface-muted, #f8f9fa)',
          border: '1px solid var(--border, #e9ecef)',
          borderRadius: '6px',
          marginBottom: '1.5rem',
        }}
      >
        <h2
          id="analytics-definitions-heading"
          style={{ fontSize: '1.1rem', marginTop: 0 }}
        >
          Metric definitions & privacy notice
        </h2>
        <p>
          Metrics represent anonymous <strong>received events</strong> recorded
          directly by the first-party Django service. Zero cookies, zero visitor
          IDs, and zero cross-site scripts are loaded. Automated crawlers,
          retries, and bots may inflate counts; metrics do not represent unique
          human beings.
        </p>
        <details style={{ marginTop: '0.5rem' }}>
          <summary style={{ cursor: 'pointer', fontWeight: 600 }}>
            Event type definitions
          </summary>
          <ul
            style={{
              margin: '0.5rem 0',
              paddingLeft: '1.2rem',
              fontSize: '0.9rem',
            }}
          >
            <li>
              <code>page_view</code>: Canonical route visit.
            </li>
            <li>
              <code>cv_download</code>: Curriculum vitae retrieval (target:{' '}
              <code>academic_cv</code> or <code>industry_resume</code>).
            </li>
            <li>
              <code>research_profile_download</code>: Research profile statement
              document download.
            </li>
            <li>
              <code>demo_click</code>: External demo or code repository
              interaction.
            </li>
            <li>
              <code>contact_click</code>: Contact modal or email link
              interaction.
            </li>
            <li>
              <code>contact_submit_success</code>: Verified contact form
              submission.
            </li>
          </ul>
        </details>
      </section>

      {/* Filter Controls */}
      <div
        style={{
          display: 'flex',
          gap: '1rem',
          alignItems: 'flex-end',
          marginBottom: '1.5rem',
          flexWrap: 'wrap',
        }}
      >
        <TextField
          id="analytics-from"
          label="From date"
          type="date"
          value={fromDate}
          onChange={setFromDate}
        />
        <TextField
          id="analytics-to"
          label="To date"
          type="date"
          value={toDate}
          onChange={setToDate}
        />
        <SelectField
          id="analytics-locale"
          label="Locale"
          value={locale}
          onChange={setLocale}
          options={[
            { value: 'all', label: 'All locales' },
            { value: 'en', label: 'English (en)' },
            { value: 'fa', label: 'فارسی (fa)' },
          ]}
        />
        <button
          type="button"
          className="admin-button admin-button--secondary"
          onClick={() => void analyticsQuery.refetch()}
          disabled={analyticsQuery.isFetching}
          style={{ marginBottom: '0.25rem' }}
        >
          {analyticsQuery.isFetching ? 'Updating…' : 'Apply filters'}
        </button>
      </div>

      {analyticsQuery.isPending ? (
        <p role="status">Loading analytics report…</p>
      ) : null}

      {/* Not-Connected State */}
      {isNotConnected ? (
        <Notice tone="warning" title="Analytics service not connected">
          The first-party aggregate analytics endpoint is not currently
          connected on the server. No visitor tracking is executed on the public
          site.
        </Notice>
      ) : null}

      {/* Generic Error State */}
      {!isNotConnected && analyticsQuery.error ? (
        <Notice tone="error" title="Failed to load analytics">
          {analyticsQuery.error.message}{' '}
          <button
            type="button"
            className="admin-button admin-button--secondary"
            onClick={() => void analyticsQuery.refetch()}
          >
            Retry
          </button>
        </Notice>
      ) : null}

      {/* Report Data */}
      {analyticsQuery.data && !isNotConnected ? (
        <>
          <div
            style={{
              display: 'flex',
              gap: '2rem',
              padding: '1rem',
              backgroundColor: 'var(--surface-muted, #f8f9fa)',
              border: '1px solid var(--border, #e9ecef)',
              borderRadius: '6px',
              marginBottom: '1.5rem',
            }}
          >
            <div>
              <div className="muted" style={{ fontSize: '0.85rem' }}>
                Primary Metric
              </div>
              <strong style={{ fontSize: '1.2rem' }}>
                {analyticsQuery.data.metric.replace('_', ' ')}
              </strong>
            </div>
            <div>
              <div className="muted" style={{ fontSize: '0.85rem' }}>
                Total Events Count
              </div>
              <strong style={{ fontSize: '1.2rem' }}>{totalEvents}</strong>
            </div>
            <div>
              <div className="muted" style={{ fontSize: '0.85rem' }}>
                Reporting Range
              </div>
              <div>
                {analyticsQuery.data.from} to {analyticsQuery.data.to} (
                {analyticsQuery.data.timezone})
              </div>
            </div>
          </div>

          <div
            className="admin-table-scroll"
            tabIndex={0}
            role="region"
            aria-label="Analytics events table"
          >
            <table className="admin-table">
              <caption className="admin-table__caption">
                Received events ({analyticsQuery.data.rows.length} rows)
              </caption>
              <thead>
                <tr>
                  <th scope="col">Date</th>
                  <th scope="col">Page path</th>
                  <th scope="col">Locale</th>
                  <th scope="col">Event</th>
                  <th scope="col">Target action</th>
                  <th scope="col">Count</th>
                </tr>
              </thead>
              <tbody>
                {analyticsQuery.data.rows.length === 0 ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="muted"
                      style={{ textAlign: 'center', padding: '2rem' }}
                    >
                      No events recorded for the selected date range and locale.
                    </td>
                  </tr>
                ) : (
                  analyticsQuery.data.rows.map((row, index) => (
                    <tr
                      key={`${row.date}-${row.pagePath}-${row.event}-${row.target}-${index}`}
                    >
                      <td>{row.date}</td>
                      <td>
                        <code>{row.pagePath}</code>
                      </td>
                      <td>{row.locale}</td>
                      <td>
                        <strong>{row.event}</strong>
                      </td>
                      <td>
                        {row.target ? (
                          <code>{row.target}</code>
                        ) : (
                          <span className="muted">—</span>
                        )}
                      </td>
                      <td>
                        <strong>{row.count}</strong>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </>
      ) : null}
    </main>
  )
}
