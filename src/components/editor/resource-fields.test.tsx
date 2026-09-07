import { fireEvent, render, screen } from '@testing-library/react'
import { useRef, useState } from 'react'
import { describe, expect, it, vi } from 'vitest'

import { ResourceFields } from '@/components/editor/resource-fields'

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
      <ResourceFields fields={fields} onChange={onChange} disabled={false} />
      <span data-testid="last-change">
        {JSON.stringify(onChange.mock.calls.at(-1) ?? null)}
      </span>
    </>
  )
}

describe('download family editor (PU-10-resource)', () => {
  it('fails before the family editor when download fields are missing', () => {
    render(<Harness />)
    for (const label of [
      /^description$/i,
      /media file/i,
      /download type/i,
      /^language$/i,
      /access state/i,
      /seo title/i,
      /related records/i,
    ]) {
      expect(screen.getByLabelText(label)).toBeDefined()
    }
  })

  it('propagates the versioned media reference without inventing keys', () => {
    render(<Harness />)
    fireEvent.change(screen.getByLabelText(/media file/i), {
      target: { value: '42' },
    })
    expect(screen.getByTestId('last-change').textContent).toBe(
      JSON.stringify(['mediaId', 42]),
    )
  })
})
