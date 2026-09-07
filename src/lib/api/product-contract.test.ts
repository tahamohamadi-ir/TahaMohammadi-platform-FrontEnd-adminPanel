import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const testDir = path.dirname(fileURLToPath(import.meta.url))
const repositoryRoot = path.resolve(testDir, '..', '..', '..')
const acceptedAdminSchemaSha256 =
  '1176c0696222f9ac4c86495446d1f00988bdfde19dd147e93ece29a61e973564'
const pinPath = path.join(
  repositoryRoot,
  'src',
  'generated',
  'openapi-hash.json',
)
const generatedPath = path.join(
  repositoryRoot,
  'src',
  'generated',
  'admin-api.ts',
)

describe('PU-SYNC-admin product contract (I08)', () => {
  it('pins the accepted admin snapshot before trusting generated types', () => {
    const pin = JSON.parse(readFileSync(pinPath, 'utf8')) as {
      schema?: string
      sha256?: string
    }
    expect(pin.schema).toBe('admin-openapi.json')
    // A07 acceptance 2026-09-06: 57 paths, version 0.1.0.
    expect(pin.sha256).toBe(acceptedAdminSchemaSha256)
  })

  it('exposes the accepted publication-job operations in generated types', () => {
    const generated = readFileSync(generatedPath, 'utf8')
    for (const route of [
      '"/api/v1/admin/publication-jobs"',
      '"/api/v1/admin/publication-jobs/{job_id}"',
      '"/api/v1/admin/publication-jobs/{job_id}/retry"',
      '"/api/v1/admin/site/{locale}"',
      '"/api/v1/admin/site/{locale}/publish"',
      '"/api/v1/admin/analytics"',
    ]) {
      expect(generated, `generated types must include ${route}`).toContain(
        route,
      )
    }
  })

  it('carries the A01 revokedPaths split on the generated job shape', () => {
    const generated = readFileSync(generatedPath, 'utf8')
    expect(generated).toContain('PublicationJobOut')
    expect(generated).toContain('revokedPaths')
  })
})
