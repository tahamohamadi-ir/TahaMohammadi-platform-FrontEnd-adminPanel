import { InboxIcon, type LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'

import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

/* Loading and empty states (Phase 6). Loading keeps the honest textual
 * status for assistive tech (role="status") and shows stable geometry
 * instead of false progress; empty states say what is missing and, when the
 * page offers one, the next action. */

interface LoadingStateProps {
  /** Announced to screen readers, e.g. "Loading media…". */
  label: string
  /** Visual shape of the placeholder. */
  variant?: 'table' | 'form' | 'cards' | 'lines'
  rows?: number
  className?: string
}

export function LoadingState({
  label,
  variant = 'lines',
  rows = 4,
  className,
}: LoadingStateProps) {
  return (
    <div className={cn('my-4 grid gap-3', className)} data-loading="true">
      <p role="status" className="sr-only">
        {label}
      </p>
      {variant === 'table' ? (
        <div className="overflow-hidden rounded-lg border bg-card">
          <Skeleton className="h-10 rounded-none" />
          {Array.from({ length: rows }, (_, index) => (
            <div key={index} className="flex gap-4 border-t px-4 py-3">
              <Skeleton className="h-4 w-1/4" />
              <Skeleton className="h-4 w-1/3" />
              <Skeleton className="h-4 flex-1" />
            </div>
          ))}
        </div>
      ) : variant === 'form' ? (
        Array.from({ length: rows }, (_, index) => (
          <div key={index} className="grid max-w-2xl gap-2">
            <Skeleton className="h-3.5 w-32" />
            <Skeleton className="h-11 w-full" />
          </div>
        ))
      ) : variant === 'cards' ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: rows }, (_, index) => (
            <div
              key={index}
              className="grid gap-3 rounded-lg border bg-card p-4"
            >
              <Skeleton className="h-3.5 w-24" />
              <Skeleton className="h-7 w-16" />
            </div>
          ))}
        </div>
      ) : (
        Array.from({ length: rows }, (_, index) => (
          <Skeleton
            key={index}
            className={cn(
              'h-4',
              index % 3 === 2 ? 'w-2/3' : 'w-full max-w-2xl',
            )}
          />
        ))
      )}
    </div>
  )
}

interface EmptyStateProps {
  title: ReactNode
  description?: ReactNode
  icon?: LucideIcon
  action?: ReactNode
  className?: string
}

export function EmptyState({
  title,
  description,
  icon: Icon = InboxIcon,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        'my-4 flex flex-col items-center gap-2 rounded-lg border border-dashed border-input bg-card/60 px-6 py-10 text-center',
        className,
      )}
    >
      <span className="mb-1 inline-flex size-11 items-center justify-center rounded-full bg-accent text-accent-foreground">
        <Icon className="size-5" aria-hidden="true" />
      </span>
      <p className="m-0 font-semibold text-foreground">{title}</p>
      {description ? (
        <p className="m-0 max-w-md text-sm text-muted-foreground">
          {description}
        </p>
      ) : null}
      {action ? <div className="mt-2">{action}</div> : null}
    </div>
  )
}
