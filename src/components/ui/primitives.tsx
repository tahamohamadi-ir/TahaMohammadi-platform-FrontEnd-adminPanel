import { useId, useState, type ReactNode } from 'react'

import './primitives.css'

/* Shared admin primitives (ADMIN-120). Presentational and accessible by
 * default: every control has a real <label>, errors use aria-describedby,
 * destructive or blocking states never rely on color alone. */

export interface TableColumn<TRow> {
  key: string
  header: string
  render?: (row: TRow) => ReactNode
}

interface TableProps<TRow> {
  caption: string
  columns: TableColumn<TRow>[]
  rows: TRow[]
  rowKey: (row: TRow, index: number) => string | number
  emptyMessage?: string
}

export function Table<TRow>({
  caption,
  columns,
  rows,
  rowKey,
  emptyMessage = 'No rows.',
}: TableProps<TRow>) {
  if (rows.length === 0) {
    return <p className="admin-empty">{emptyMessage}</p>
  }
  return (
    <div
      className="admin-table-scroll"
      role="region"
      aria-label={caption}
      tabIndex={0}
    >
      <table className="admin-table">
        <caption className="admin-table__caption">{caption}</caption>
        <thead>
          <tr>
            {columns.map((column) => (
              <th key={column.key} scope="col">
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={rowKey(row, index)}>
              {columns.map((column) => (
                <td key={column.key}>
                  {column.render
                    ? column.render(row)
                    : (row as Record<string, ReactNode>)[column.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

interface FieldShellProps {
  id: string
  label: string
  error?: string
  description?: string
  children: (inputProps: {
    id: string
    describedBy: string | undefined
    invalid: boolean
  }) => ReactNode
}

function FieldShell({
  id,
  label,
  error,
  description,
  children,
}: FieldShellProps) {
  const descriptionId = useId()
  const errorId = useId()
  const describedBy = [
    description ? descriptionId : null,
    error ? errorId : null,
  ]
    .filter(Boolean)
    .join(' ')
  return (
    <div className="admin-field">
      <label className="admin-field__label" htmlFor={id}>
        {label}
      </label>
      {description ? (
        <p className="admin-field__description" id={descriptionId}>
          {description}
        </p>
      ) : null}
      {children({
        id,
        describedBy: describedBy || undefined,
        invalid: Boolean(error),
      })}
      {error ? (
        <p className="admin-field__error" id={errorId} role="alert">
          {error}
        </p>
      ) : null}
    </div>
  )
}

interface TextFieldProps {
  id: string
  label: string
  error?: string
  description?: string
  defaultValue?: string
  value?: string
  onChange?: (value: string) => void
  type?: string
  name?: string
}

export function TextField({ onChange, ...props }: TextFieldProps) {
  return (
    <FieldShell {...props}>
      {({ id, describedBy, invalid }) => (
        <input
          className="admin-input"
          id={id}
          name={props.name ?? id}
          type={props.type ?? 'text'}
          defaultValue={props.defaultValue}
          value={props.value}
          aria-invalid={invalid}
          aria-describedby={describedBy}
          onChange={
            onChange
              ? (event) => onChange(event.currentTarget.value)
              : undefined
          }
        />
      )}
    </FieldShell>
  )
}

interface SelectFieldProps {
  id: string
  label: string
  error?: string
  description?: string
  options: { value: string; label: string }[]
  defaultValue?: string
  name?: string
}

export function SelectField(props: SelectFieldProps) {
  return (
    <FieldShell {...props}>
      {({ id, describedBy, invalid }) => (
        <select
          className="admin-input"
          id={id}
          name={props.name ?? id}
          defaultValue={props.defaultValue}
          aria-invalid={invalid}
          aria-describedby={describedBy}
        >
          {props.options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      )}
    </FieldShell>
  )
}

interface TextareaFieldProps {
  id: string
  label: string
  error?: string
  description?: string
  defaultValue?: string
  rows?: number
  name?: string
}

export function TextareaField(props: TextareaFieldProps) {
  return (
    <FieldShell {...props}>
      {({ id, describedBy, invalid }) => (
        <textarea
          className="admin-input"
          id={id}
          name={props.name ?? id}
          rows={props.rows ?? 4}
          defaultValue={props.defaultValue}
          aria-invalid={invalid}
          aria-describedby={describedBy}
        />
      )}
    </FieldShell>
  )
}

interface CheckboxFieldProps {
  id: string
  label: string
  description?: string
  defaultChecked?: boolean
  name?: string
}

export function CheckboxField({
  id,
  label,
  description,
  defaultChecked,
  name,
}: CheckboxFieldProps) {
  return (
    <div className="admin-field admin-field--check">
      <input
        className="admin-check"
        type="checkbox"
        id={id}
        name={name ?? id}
        defaultChecked={defaultChecked}
        aria-describedby={description ? `${id}-description` : undefined}
      />
      <label className="admin-field__label" htmlFor={id}>
        {label}
      </label>
      {description ? (
        <p className="admin-field__description" id={`${id}-description`}>
          {description}
        </p>
      ) : null}
    </div>
  )
}

interface DialogProps {
  title: string
  open: boolean
  onClose: () => void
  children: ReactNode
}

export function Dialog({ title, open, onClose, children }: DialogProps) {
  const titleId = useId()
  if (!open) return null
  return (
    <div className="admin-dialog-backdrop">
      <div
        className="admin-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <h2 className="admin-dialog__title" id={titleId}>
          {title}
        </h2>
        <div className="admin-dialog__body">{children}</div>
        <div className="admin-dialog__actions">
          <button type="button" className="admin-button" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  )
}

export type NoticeTone = 'error' | 'success' | 'warning' | 'info'

interface NoticeProps {
  tone: NoticeTone
  title: string
  children?: ReactNode
}

export function Notice({ tone, title, children }: NoticeProps) {
  return (
    <div
      className={`admin-notice admin-notice--${tone}`}
      role={tone === 'error' ? 'alert' : 'status'}
    >
      <p className="admin-notice__title">{title}</p>
      {children ? <div className="admin-notice__body">{children}</div> : null}
    </div>
  )
}

export interface ValidationIssue {
  field: string
  message: string
  targetId: string
}

interface ValidationSummaryProps {
  title: string
  errors: ValidationIssue[]
}

export function ValidationSummary({ title, errors }: ValidationSummaryProps) {
  if (errors.length === 0) return null
  return (
    <div
      className="admin-notice admin-notice--error"
      role="alert"
      tabIndex={-1}
    >
      <p className="admin-notice__title">{title}</p>
      <ul className="admin-notice__list">
        {errors.map((issue) => (
          <li key={issue.field}>
            <a href={`#${issue.targetId}`}>{issue.message}</a>
          </li>
        ))}
      </ul>
    </div>
  )
}

interface UploadInputProps {
  id: string
  label: string
  accept?: string
  multiple?: boolean
  onChange?: (files: File[]) => void
}

export function UploadInput({
  id,
  label,
  accept,
  multiple,
  onChange,
}: UploadInputProps) {
  const [names, setNames] = useState<string[]>([])
  return (
    <div className="admin-field">
      <label className="admin-field__label" htmlFor={id}>
        {label}
      </label>
      <input
        className="admin-input"
        type="file"
        id={id}
        accept={accept}
        multiple={multiple}
        onChange={(event) => {
          const files = Array.from(event.currentTarget.files ?? [])
          setNames(files.map((file) => file.name))
          onChange?.(files)
        }}
      />
      {names.length > 0 ? (
        <ul className="admin-upload-list">
          {names.map((name) => (
            <li key={name}>{name}</li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}
