import { describe, expect, it } from 'vitest'

import { normalizeAdminError } from '@/lib/api/errors'

describe('normalizeAdminError', () => {
  it('maps AdminError auth failures', async () => {
    const response = new Response(
      JSON.stringify({ code: 'AUTH_FAILED', message: 'Invalid credentials.' }),
      { status: 401 },
    )

    const error = await normalizeAdminError(response)
    expect(error.kind).toBe('auth')
    expect(error.code).toBe('AUTH_FAILED')
    expect(error.message).toBe('Invalid credentials.')
  })

  it('maps CSRF failures', async () => {
    const response = new Response(
      JSON.stringify({
        code: 'CSRF_FAILED',
        message: 'CSRF token missing or invalid.',
      }),
      { status: 403 },
    )

    const error = await normalizeAdminError(response)
    expect(error.kind).toBe('csrf')
  })

  it('maps validation field errors', async () => {
    const response = new Response(
      JSON.stringify({
        code: 'VALIDATION',
        message: 'Invalid input.',
        fields: { email: ['Required'] },
      }),
      { status: 422 },
    )

    const error = await normalizeAdminError(response)
    expect(error.kind).toBe('validation')
    expect(error.fieldErrors.email).toBe('Required')
  })
})
