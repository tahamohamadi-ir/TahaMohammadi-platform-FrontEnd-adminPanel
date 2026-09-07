import { createHash } from 'node:crypto'
import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const testDir = path.dirname(fileURLToPath(import.meta.url))
const repositoryRoot = path.resolve(testDir, '..', '..', '..')
const workspaceRoot = path.resolve(repositoryRoot, '..', '..')
const backendAdminSchema = path.join(
  workspaceRoot,
  'Back-End',
  'docs',
  'contracts',
  'openapi',
  'current',
  'admin-openapi.json',
)
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

function crlfSha256(file: string): string {
  const raw = readFileSync(file)
  const lf = Buffer.from(raw.toString('utf8').replace(/\r\n/g, '\n'))
  const crlf = Buffer.from(lf.toString('utf8').replace(/\n/g, '\r\n'))
  return createHash('sha256').update(crlf).digest('hex')
}

describe('PU-SYNC-admin product contract (I08)', () => {
  it('pins the accepted admin snapshot before trusting generated types', () => {
    expect(
      existsSync(backendAdminSchema),
      'backend admin snapshot must exist',
    ).toBe(true)
    const pin = JSON.parse(readFileSync(pinPath, 'utf8')) as {
      schema?: string
      sha256?: string
    }
    expect(pin.schema).toBe('admin-openapi.json')
    // A07 acceptance 2026-09-06: 57 paths, version 0.1.0.
    expect(pin.sha256).toBe(crlfSha256(backendAdminSchema))
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
