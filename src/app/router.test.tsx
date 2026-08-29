import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { AppRouter } from '@/app/router'
import { AuthProvider } from '@/lib/auth/AuthProvider'

describe('AppRouter', () => {
  beforeEach(() => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(null, {
          status: 401,
        }),
      ),
    )
  })

  it('redirects unauthenticated users from dashboard to sign-in', async () => {
    render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <AuthProvider>
          <AppRouter />
        </AuthProvider>
      </MemoryRouter>,
    )

    await waitFor(() => {
      expect(
        screen.getByRole('heading', { name: 'Sign in' }),
      ).toBeInTheDocument()
    })
  })
})
