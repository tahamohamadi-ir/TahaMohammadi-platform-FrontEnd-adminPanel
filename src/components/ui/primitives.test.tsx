import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import {
  CheckboxField,
  Dialog,
  Notice,
  SelectField,
  Table,
  TextareaField,
  TextField,
  UploadInput,
  ValidationSummary,
} from '@/components/ui/primitives'

describe('admin primitives (ADMIN-120)', () => {
  it('renders a table with accessible headers and rows', () => {
    render(
      <Table
        caption="Content rows"
        columns={[{ key: 'title', header: 'Title' }]}
        rows={[{ title: 'Hello' }]}
        rowKey={(row: { title: string }) => row.title}
      />,
    )
    expect(
      screen.getByRole('table', { name: 'Content rows' }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('columnheader', { name: 'Title' }),
    ).toBeInTheDocument()
    expect(screen.getByRole('cell', { name: 'Hello' })).toBeInTheDocument()
  })

  it('renders an empty table state instead of an empty grid', () => {
    render(
      <Table
        caption="Content rows"
        columns={[{ key: 'title', header: 'Title' }]}
        rows={[]}
        rowKey={(_row: { title: string }, index: number) => index}
        emptyMessage="No rows yet."
      />,
    )
    expect(screen.getByText('No rows yet.')).toBeInTheDocument()
    expect(screen.queryByRole('table')).not.toBeInTheDocument()
  })

  it('associates field labels, errors, and descriptions for screen readers', () => {
    render(
      <TextField
        id="brand"
        label="Brand name"
        error="Too long"
        description="Shown in the header."
        defaultValue="x"
      />,
    )
    const input = screen.getByLabelText('Brand name')
    expect(input).toHaveAttribute('aria-invalid', 'true')
    expect(input).toHaveAccessibleDescription('Shown in the header. Too long')
    expect(screen.getByRole('alert')).toHaveTextContent('Too long')
  })

  it('renders select, textarea, and checkbox fields with labels', () => {
    render(
      <>
        <SelectField
          id="locale"
          label="Locale"
          options={[
            { value: 'en', label: 'English' },
            { value: 'fa', label: 'فارسی' },
          ]}
        />
        <TextareaField id="bio" label="Bio" />
        <CheckboxField id="enabled" label="Enabled" />
      </>,
    )
    expect(screen.getByLabelText('Locale')).toBeInTheDocument()
    expect(screen.getByLabelText('Bio')).toBeInTheDocument()
    expect(screen.getByLabelText('Enabled')).toBeInTheDocument()
  })

  it('renders a dialog with role and labelledby, and closes on action', () => {
    const onClose = vi.fn()
    render(
      <Dialog title="Confirm delete" onClose={onClose} open>
        <p>Are you sure?</p>
      </Dialog>,
    )
    const dialog = screen.getByRole('dialog', { name: 'Confirm delete' })
    expect(dialog).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Close' }))
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('announces error and success notices with status roles', () => {
    render(
      <>
        <Notice tone="error" title="Save failed">
          Body
        </Notice>
        <Notice tone="success" title="Saved" />
      </>,
    )
    expect(screen.getByRole('alert')).toHaveTextContent('Save failed')
    expect(screen.getByRole('status')).toHaveTextContent('Saved')
  })

  it('summarises validation errors as a linked list', () => {
    render(
      <ValidationSummary
        title="There is a problem"
        errors={[
          { field: 'brandName', message: 'Too long', targetId: 'brand' },
        ]}
      />,
    )
    const summary = screen.getByRole('alert')
    expect(summary).toHaveTextContent('There is a problem')
    expect(screen.getByRole('link', { name: 'Too long' })).toHaveAttribute(
      'href',
      '#brand',
    )
  })

  it('exposes selected file names from the upload input', () => {
    const onChange = vi.fn()
    render(<UploadInput id="media" label="Media file" onChange={onChange} />)
    const input = screen.getByLabelText('Media file')
    expect(input).toHaveAttribute('type', 'file')
    const file = new File(['bytes'], 'cover.png', { type: 'image/png' })
    fireEvent.change(input, { target: { files: [file] } })
    expect(onChange).toHaveBeenCalledTimes(1)
    expect(screen.getByText('cover.png')).toBeInTheDocument()
  })
})
