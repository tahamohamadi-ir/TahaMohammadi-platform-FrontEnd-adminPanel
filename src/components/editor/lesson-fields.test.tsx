import { fireEvent, render, screen } from '@testing-library/react'
import { useRef, useState } from 'react'
import { describe, expect, it, vi } from 'vitest'

import { LessonFields } from '@/components/editor/lesson-fields'

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
      <LessonFields fields={fields} onChange={onChange} disabled={false} />
      <span data-testid="last-change">
        {JSON.stringify(onChange.mock.calls.at(-1) ?? null)}
      </span>
    </>
  )
}

describe('lesson family editor (PU-10-lesson)', () => {
  it('fails before the family editor when lesson fields are missing', () => {
    render(<Harness />)
    for (const label of [
      /course id/i,
      /position/i,
      /summary/i,
      /seo title/i,
      /related records/i,
    ]) {
      expect(screen.getByLabelText(label)).toBeDefined()
    }
  })

  it('propagates the required parent course reference', () => {
    render(<Harness />)
    fireEvent.change(screen.getByLabelText(/course id/i), {
      target: { value: '5' },
    })
    expect(screen.getByTestId('last-change').textContent).toBe(
      JSON.stringify(['courseId', 5]),
    )
  })
})
