import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'

import { AppRouter } from '@/app/router'

describe('AppRouter', () => {
  it('renders the dashboard placeholder at /dashboard', () => {
    render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <AppRouter />
      </MemoryRouter>,
    )

    expect(
      screen.getByRole('heading', { name: 'Dashboard' }),
    ).toBeInTheDocument()
  })
})
