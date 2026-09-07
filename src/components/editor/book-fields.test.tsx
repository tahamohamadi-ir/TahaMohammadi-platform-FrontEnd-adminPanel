import { fireEvent, render, screen } from '@testing-library/react'
import { useRef, useState } from 'react'
import { describe, expect, it, vi } from 'vitest'

import { BookFields } from '@/components/editor/book-fields'

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
      <BookFields fields={fields} onChange={onChange} disabled={false} />
      <span data-testid="last-change">
        {JSON.stringify(onChange.mock.calls.at(-1) ?? null)}
      </span>
    </>
  )
}

describe('book family editor (PU-10-book)', () => {
  it('fails before the family editor when book fields are missing', () => {
    render(<Harness />)
    for (const label of [
      /authors/i,
      /isbn/i,
      /publisher/i,
      /publication date/i,
      /^description$/i,
      /access state/i,
      /cover media/i,
      /seo title/i,
      /related records/i,
    ]) {
      expect(screen.getByLabelText(label)).toBeDefined()
    }
  })

  it('propagates typed book metadata without inventing keys', () => {
    render(<Harness />)
    fireEvent.change(screen.getByLabelText(/isbn/i), {
      target: { value: '978-0-00-000000-0' },
    })
    expect(screen.getByTestId('last-change').textContent).toBe(
      JSON.stringify(['isbn', '978-0-00-000000-0']),
    )
  })
})
