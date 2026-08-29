import { describe, expect, it } from 'vitest'

import { adminApiPath, adminPath, apiBaseUrl } from '@/config/env'

describe('env helpers', () => {
  it('builds admin routes under /admin', () => {
    expect(adminPath('dashboard')).toBe('/admin/dashboard')
  })

  it('uses same-origin admin API paths when VITE_API_BASE is empty', () => {
    expect(apiBaseUrl()).toBe('')
    expect(adminApiPath()).toBe('/api/v1/admin')
  })
})
