import { fireEvent, render, screen } from '@testing-library/react'
import { useRef, useState } from 'react'
import { describe, expect, it, vi } from 'vitest'

import { CourseFields } from '@/components/editor/course-fields'

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
      <CourseFields fields={fields} onChange={onChange} disabled={false} />
      <span data-testid="last-change">
        {JSON.stringify(onChange.mock.calls.at(-1) ?? null)}
      </span>
    </>
  )
}

describe('course family editor (PU-10-course)', () => {
  it('fails before the family editor when course fields are missing', () => {
    render(<Harness />)
    for (const label of [
      /^description$/i,
      /^body$/i,
      /level/i,
      /prerequisites/i,
      /outcomes/i,
      /course format/i,
      /course language/i,
      /availability/i,
      /last updated/i,
      /cover media/i,
      /seo title/i,
      /related records/i,
    ]) {
      expect(screen.getByLabelText(label)).toBeDefined()
    }
  })

  it('propagates typed course metadata without inventing keys', () => {
    render(<Harness />)
    fireEvent.change(screen.getByLabelText(/level/i), {
      target: { value: 'intermediate' },
    })
    expect(screen.getByTestId('last-change').textContent).toBe(
      JSON.stringify(['level', 'intermediate']),
    )
  })
})
