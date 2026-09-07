import { fireEvent, render, screen } from '@testing-library/react'
import { useRef, useState } from 'react'
import { describe, expect, it, vi } from 'vitest'

import { ProfileFields } from '@/components/editor/profile-fields'

function Harness({ initial = {} }: { initial?: Record<string, unknown> }) {
  const [fields, setFields] = useState<Record<string, unknown>>(initial)
  const onChangeRef = useRef(
    vi.fn((key: string, value: unknown) => {
      setFields((prev) => ({ ...prev, [key]: value }))
    }),
  )
  const onChange = onChangeRef.current
  return (
    <>
      <ProfileFields fields={fields} onChange={onChange} disabled={false} />
      <span data-testid="last-change">
        {JSON.stringify(onChange.mock.calls.at(-1) ?? null)}
      </span>
    </>
  )
}

describe('profile family editor (PU-08-profile)', () => {
  it('fails before the family editor when profile fields are missing', () => {
    render(<Harness />)
    for (const label of [
      /short bio/i,
      /long bio/i,
      /collaboration availability/i,
      /profile body/i,
      /cv resource/i,
      /research profile resource/i,
      /seo title/i,
      /related records/i,
    ]) {
      expect(screen.getByLabelText(label)).toBeDefined()
    }
  })

  it('propagates CV and research-profile resource selection without inventing keys', () => {
    render(<Harness />)
    fireEvent.change(screen.getByLabelText(/cv resource/i), {
      target: { value: '42' },
    })
    expect(screen.getByTestId('last-change').textContent).toBe(
      JSON.stringify(['cvResourceId', 42]),
    )

    fireEvent.change(screen.getByLabelText(/research profile resource/i), {
      target: { value: '88' },
    })
    expect(screen.getByTestId('last-change').textContent).toBe(
      JSON.stringify(['researchProfileResourceId', 88]),
    )
  })

  it('provides locale-safe biography fields with auto text direction', () => {
    render(<Harness initial={{ shortBio: 'پژوهشگر سیستم‌های توزیع‌شده' }} />)
    const shortBioInput = screen.getByLabelText(/short bio/i)
    expect(shortBioInput).toHaveAttribute('dir', 'auto')
    expect(shortBioInput).toHaveValue('پژوهشگر سیستم‌های توزیع‌شده')
  })
})
