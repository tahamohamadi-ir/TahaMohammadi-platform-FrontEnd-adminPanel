import { fireEvent, render, screen } from '@testing-library/react'
import { useRef, useState } from 'react'
import { describe, expect, it, vi } from 'vitest'

import { ArticleFields } from '@/components/editor/article-fields'

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
      <ArticleFields fields={fields} onChange={onChange} disabled={false} />
      <span data-testid="last-change">
        {JSON.stringify(onChange.mock.calls.at(-1) ?? null)}
      </span>
    </>
  )
}

describe('article family editor (PU-10-article)', () => {
  it('fails before the family editor when article fields are missing', () => {
    render(<Harness />)
    for (const label of [
      /excerpt/i,
      /^body$/i,
      /license/i,
      /reading time/i,
      /accessibility notes/i,
      /featured image/i,
      /seo title/i,
      /related records/i,
    ]) {
      expect(screen.getByLabelText(label)).toBeDefined()
    }
  })

  it('propagates typed article metadata without inventing keys', () => {
    render(<Harness />)
    fireEvent.change(screen.getByLabelText(/excerpt/i), {
      target: { value: 'Short version' },
    })
    expect(screen.getByTestId('last-change').textContent).toBe(
      JSON.stringify(['excerpt', 'Short version']),
    )
    fireEvent.change(screen.getByLabelText(/reading time/i), {
      target: { value: '8' },
    })
    expect(screen.getByTestId('last-change').textContent).toBe(
      JSON.stringify(['readingTimeMinutes', 8]),
    )
  })
})
