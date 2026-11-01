import {
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type SortingState,
} from '@tanstack/react-table'
import { ArrowDownIcon, ArrowUpDownIcon, ArrowUpIcon } from 'lucide-react'
import { useMemo, useState, type ReactNode } from 'react'

import {
  TableBody,
  TableCaption,
  TableCell,
  TableEl,
  TableHead,
  TableHeader,
  TableRow,
  TableScroll,
} from '@/components/ui/table'

export interface DataTableColumn<TRow> {
  key: string
  header: string
  render?: (row: TRow) => ReactNode
  /** Opt-in client-side sorting on the raw `row[key]` value. */
  sortable?: boolean
}

interface DataTableProps<TRow> {
  caption: string
  columns: DataTableColumn<TRow>[]
  rows: TRow[]
  rowKey: (row: TRow, index: number) => string | number
}

/** TanStack-backed table: accessible caption, scoped headers, keyboard
 * scrolling and optional sorting announced through aria-sort. */
export function DataTable<TRow>({
  caption,
  columns,
  rows,
  rowKey,
}: DataTableProps<TRow>) {
  const [sorting, setSorting] = useState<SortingState>([])
  const columnDefs = useMemo<ColumnDef<TRow>[]>(
    () =>
      columns.map((column) => ({
        id: column.key,
        header: column.header,
        accessorFn: (row) => (row as Record<string, unknown>)[column.key],
        enableSorting: Boolean(column.sortable),
        cell: ({ row }) =>
          column.render
            ? column.render(row.original)
            : ((row.original as Record<string, ReactNode>)[column.key] ?? null),
      })),
    [columns],
  )
  const table = useReactTable({
    data: rows,
    columns: columnDefs,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getRowId: (row, index) => String(rowKey(row, index)),
  })

  return (
    <TableScroll aria-label={caption}>
      <TableEl>
        <TableCaption>{caption}</TableCaption>
        <TableHeader>
          {table.getHeaderGroups().map((group) => (
            <tr key={group.id}>
              {group.headers.map((header) => {
                const sorted = header.column.getIsSorted()
                const label = flexRender(
                  header.column.columnDef.header,
                  header.getContext(),
                )
                return (
                  <TableHead
                    key={header.id}
                    scope="col"
                    aria-sort={
                      sorted === 'asc'
                        ? 'ascending'
                        : sorted === 'desc'
                          ? 'descending'
                          : undefined
                    }
                  >
                    {header.column.getCanSort() ? (
                      <button
                        type="button"
                        className="-mx-1 inline-flex items-center gap-1 rounded px-1 font-semibold hover:text-foreground"
                        onClick={header.column.getToggleSortingHandler()}
                      >
                        {label}
                        {sorted === 'asc' ? (
                          <ArrowUpIcon
                            className="size-3.5"
                            aria-hidden="true"
                          />
                        ) : sorted === 'desc' ? (
                          <ArrowDownIcon
                            className="size-3.5"
                            aria-hidden="true"
                          />
                        ) : (
                          <ArrowUpDownIcon
                            className="size-3.5 opacity-50"
                            aria-hidden="true"
                          />
                        )}
                      </button>
                    ) : (
                      label
                    )}
                  </TableHead>
                )
              })}
            </tr>
          ))}
        </TableHeader>
        <TableBody>
          {table.getRowModel().rows.map((row) => (
            <TableRow key={row.id}>
              {row.getVisibleCells().map((cell) => (
                <TableCell key={cell.id}>
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </TableEl>
    </TableScroll>
  )
}
