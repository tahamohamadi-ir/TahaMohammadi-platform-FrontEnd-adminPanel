import { fireEvent, render, screen } from '@testing-library/react'
import { useRef, useState } from 'react'
import { describe, expect, it, vi } from 'vitest'

import { SeriesFields } from '@/components/editor/series-fields'

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
      <SeriesFields fields={fields} onChange={onChange} disabled={false} />
      <span data-testid="last-change">
        {JSON.stringify(onChange.mock.calls.at(-1) ?? null)}
      </span>
    </>
  )
}

describe('series family editor (PU-10-series)', () => {
  it('fails before the family editor when series fields are missing', () => {
    render(<Harness />)
    for (const label of [
      /^description$/i,
      /ordering/i,
      /^members$/i,
      /seo title/i,
      /related records/i,
    ]) {
      expect(screen.getByLabelText(label)).toBeDefined()
    }
  })

  it('propagates ordering and membership without inventing keys', () => {
    render(<Harness />)
    fireEvent.change(screen.getByLabelText(/ordering/i), {
      target: { value: '2' },
    })
    expect(screen.getByTestId('last-change').textContent).toBe(
      JSON.stringify(['ordering', 2]),
    )
  })
})
