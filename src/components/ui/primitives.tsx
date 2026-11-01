import {
  CircleAlertIcon,
  CircleCheckIcon,
  InfoIcon,
  TriangleAlertIcon,
  UploadIcon,
} from 'lucide-react'
import { useId, useState, type ReactNode } from 'react'

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { DataTable, type DataTableColumn } from '@/components/ui/data-table'
import {
  DialogClose,
  DialogContent,
  DialogRoot,
  DialogTitle,
} from '@/components/ui/dialog'
import { EmptyState } from '@/components/ui/states'

import './primitives.css'

/* Shared admin primitives (ADMIN-120, rebuilt on shadcn/ui in Phase 6).
 * The exported API is unchanged so every page keeps compiling. Presentational
 * and accessible by default: every control has a real <label>, errors use
 * aria-describedby, destructive or blocking states never rely on colour
 * alone (each notice carries an icon and a title). Form controls stay native
 * elements so browser validation, form serialisation and tests keep working. */

export type TableColumn<TRow> = DataTableColumn<TRow>

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
    return <EmptyState title={emptyMessage} />
  }
  return (
    <DataTable
      caption={caption}
      columns={columns}
      rows={rows}
      rowKey={rowKey}
    />
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
  disabled?: boolean
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
          disabled={props.disabled}
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
  value?: string
  onChange?: (value: string) => void
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
          value={props.value}
          aria-invalid={invalid}
          aria-describedby={describedBy}
          onChange={
            props.onChange
              ? (event) => props.onChange?.(event.currentTarget.value)
              : undefined
          }
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
  value?: string
  onChange?: (value: string) => void
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
          value={props.value}
          aria-invalid={invalid}
          aria-describedby={describedBy}
          onChange={
            props.onChange
              ? (event) => props.onChange?.(event.currentTarget.value)
              : undefined
          }
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

/** Modal dialog on Radix: focus trap, Escape and outside click all route to
 * `onClose`, focus returns to the opener. */
export function Dialog({ title, open, onClose, children }: DialogProps) {
  return (
    <DialogRoot
      open={open}
      onOpenChange={(next) => {
        if (!next) onClose()
      }}
    >
      <DialogContent showCloseButton={false} aria-describedby={undefined}>
        <DialogTitle>{title}</DialogTitle>
        <div className="text-sm">{children}</div>
        <div className="flex justify-end gap-2">
          <DialogClose asChild>
            <Button type="button" variant="outline">
              Close
            </Button>
          </DialogClose>
        </div>
      </DialogContent>
    </DialogRoot>
  )
}

export type NoticeTone = 'error' | 'success' | 'warning' | 'info'

const NOTICE_ICONS = {
  error: CircleAlertIcon,
  success: CircleCheckIcon,
  warning: TriangleAlertIcon,
  info: InfoIcon,
} as const

interface NoticeProps {
  tone: NoticeTone
  title: string
  children?: ReactNode
}

export function Notice({ tone, title, children }: NoticeProps) {
  const Icon = NOTICE_ICONS[tone]
  return (
    <Alert variant={tone} role={tone === 'error' ? 'alert' : 'status'}>
      <Icon aria-hidden="true" />
      <AlertTitle>{title}</AlertTitle>
      {children ? <AlertDescription>{children}</AlertDescription> : null}
    </Alert>
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
    <Alert variant="error" role="alert" tabIndex={-1}>
      <CircleAlertIcon aria-hidden="true" />
      <AlertTitle>{title}</AlertTitle>
      <AlertDescription>
        <ul className="m-0 list-disc ps-4">
          {errors.map((issue) => (
            <li key={issue.field}>
              <a href={`#${issue.targetId}`}>{issue.message}</a>
            </li>
          ))}
        </ul>
      </AlertDescription>
    </Alert>
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
      <div className="relative flex items-center gap-3 rounded-md border border-dashed border-input bg-card px-3 py-2 focus-within:border-ring">
        <UploadIcon
          className="size-4 shrink-0 text-muted-foreground"
          aria-hidden="true"
        />
        <input
          className="w-full text-sm file:me-3 file:rounded-md file:border-0 file:bg-secondary file:px-3 file:py-1.5 file:font-semibold file:text-secondary-foreground"
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
      </div>
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
