import { Table } from '@/components/ui/primitives'
import type { SiteSettingsOut } from '@/lib/api/settings'

/** Owner seed policy (read-only; applied server-side at import). */
export function SeedPolicySection({
  seedPolicy,
}: {
  seedPolicy: SiteSettingsOut['seedPolicy'] | undefined
}) {
  return (
    <section aria-labelledby="seed-policy-title">
      <h2 id="seed-policy-title">Seed policy</h2>
      {seedPolicy ? (
        <>
          <p className="muted">
            Owner policy from the seed package (read-only; applied server-side
            at import). Surfaces it withholds show as empty in the form.
          </p>
          <Table
            caption="Seed policy decisions"
            columns={[
              { key: 'key', header: 'Policy key' },
              { key: 'value', header: 'Value' },
            ]}
            rows={Object.entries(seedPolicy).map(([key, value]) => ({
              key,
              value: String(value),
            }))}
            rowKey={(row: { key: string }) => row.key}
          />
        </>
      ) : (
        <p role="status" className="muted">
          No seed policy recorded (site settings were not seeded).
        </p>
      )}
    </section>
  )
}
