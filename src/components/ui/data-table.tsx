"use client"

import * as React from "react"
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  ChevronsUpDownIcon,
} from "lucide-react"

import { cn } from "@/lib/utils"
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table"
import { Skeleton } from "@/components/ui/skeleton"
import { EmptyState } from "@/components/ui/empty-state"
import { Button } from "@/components/ui/button"

interface DataTableColumn<T> {
  id: string
  header: string
  /** Function to extract cell value for rendering */
  cell: (row: T) => React.ReactNode
  /** Responsive priority: 0 = always visible, 1 = md+, 2 = lg+, 3 = xl+ */
  priority?: 0 | 1 | 2 | 3
  /** Cell alignment */
  align?: "left" | "right" | "center"
  /** Whether this column is sortable */
  sortable?: boolean
  /** Optional min width */
  minWidth?: string
}

interface DataTableProps<T> {
  columns: DataTableColumn<T>[]
  data: T[]
  /** Row key extractor */
  rowKey: (row: T) => string | number
  /** Row click handler */
  onRowClick?: (row: T) => void
  /** Loading state */
  loading?: boolean
  /** Empty state icon */
  emptyIcon?: React.ReactNode
  /** Empty state title */
  emptyTitle?: string
  /** Empty state description */
  emptyDescription?: string
  /** Empty state action */
  emptyAction?: React.ReactNode
  /** Page size for pagination */
  pageSize?: number
  /** Currently sorted column id (controlled) */
  sortColumn?: string
  /** Sort direction (controlled) */
  sortDirection?: "asc" | "desc"
  /** Sort change handler (controlled) */
  onSortChange?: (column: string, direction: "asc" | "desc") => void
}

const PRIORITY_CLASSES: Record<number, string> = {
  0: "",
  1: "hidden md:table-cell",
  2: "hidden lg:table-cell",
  3: "hidden xl:table-cell",
}

const ALIGN_CLASSES: Record<string, string> = {
  left: "text-left",
  right: "text-right",
  center: "text-center",
}

const SKELETON_ROW_COUNT = 5

function DataTable<T>({
  columns,
  data,
  rowKey,
  onRowClick,
  loading = false,
  emptyIcon,
  emptyTitle = "No data",
  emptyDescription,
  emptyAction,
  pageSize = 10,
  sortColumn,
  sortDirection,
  onSortChange,
}: DataTableProps<T>) {
  const [currentPage, setCurrentPage] = React.useState(0)

  // Reset to first page when data changes
  const dataLength = data.length
  React.useEffect(() => {
    setCurrentPage(0)
  }, [dataLength])

  const totalPages = Math.max(1, Math.ceil(data.length / pageSize))
  const showPagination = data.length > pageSize
  const startIndex = currentPage * pageSize
  const endIndex = Math.min(startIndex + pageSize, data.length)
  const paginatedData = data.slice(startIndex, endIndex)

  function handleSortClick(columnId: string) {
    if (!onSortChange) return

    if (sortColumn === columnId) {
      // Toggle direction: asc -> desc -> asc
      const nextDirection = sortDirection === "asc" ? "desc" : "asc"
      onSortChange(columnId, nextDirection)
    } else {
      // New column, start with asc
      onSortChange(columnId, "asc")
    }
  }

  function getAriaSortValue(
    columnId: string
  ): "ascending" | "descending" | undefined {
    if (sortColumn !== columnId) return undefined
    return sortDirection === "asc" ? "ascending" : "descending"
  }

  function renderSortIcon(columnId: string) {
    if (sortColumn === columnId) {
      return sortDirection === "asc" ? (
        <ArrowUpIcon className="size-3.5" />
      ) : (
        <ArrowDownIcon className="size-3.5" />
      )
    }
    return <ChevronsUpDownIcon className="size-3.5 opacity-50" />
  }

  function renderHeaderCells() {
    return columns.map((col) => {
      const priority = col.priority ?? 0
      const align = col.align ?? "left"
      const priorityClass = PRIORITY_CLASSES[priority]
      const alignClass = ALIGN_CLASSES[align]

      if (col.sortable) {
        return (
          <TableHead
            key={col.id}
            className={cn(priorityClass, alignClass, "select-none")}
            style={col.minWidth ? { minWidth: col.minWidth } : undefined}
            aria-sort={getAriaSortValue(col.id)}
          >
            <button
              type="button"
              className={cn(
                "inline-flex items-center gap-1 hover:text-foreground transition-colors",
                align === "right" && "flex-row-reverse"
              )}
              onClick={() => handleSortClick(col.id)}
            >
              {col.header}
              {renderSortIcon(col.id)}
            </button>
          </TableHead>
        )
      }

      return (
        <TableHead
          key={col.id}
          className={cn(priorityClass, alignClass)}
          style={col.minWidth ? { minWidth: col.minWidth } : undefined}
        >
          {col.header}
        </TableHead>
      )
    })
  }

  function renderSkeletonRows() {
    return Array.from({ length: SKELETON_ROW_COUNT }, (_, rowIndex) => (
      <TableRow key={`skeleton-${rowIndex}`} className="h-11">
        {columns.map((col) => {
          const priority = col.priority ?? 0
          const priorityClass = PRIORITY_CLASSES[priority]

          return (
            <TableCell key={col.id} className={cn(priorityClass)}>
              <Skeleton className="h-4 w-full max-w-[120px]" />
            </TableCell>
          )
        })}
      </TableRow>
    ))
  }

  function renderEmptyState() {
    return (
      <TableRow>
        <TableCell colSpan={columns.length} className="h-48">
          <EmptyState
            icon={emptyIcon}
            title={emptyTitle}
            description={emptyDescription}
            action={emptyAction}
          />
        </TableCell>
      </TableRow>
    )
  }

  function renderDataRows() {
    return paginatedData.map((row) => (
      <TableRow
        key={rowKey(row)}
        className={cn("h-11", onRowClick && "cursor-pointer")}
        onClick={onRowClick ? () => onRowClick(row) : undefined}
      >
        {columns.map((col) => {
          const priority = col.priority ?? 0
          const align = col.align ?? "left"
          const priorityClass = PRIORITY_CLASSES[priority]
          const alignClass = ALIGN_CLASSES[align]

          return (
            <TableCell
              key={col.id}
              className={cn(priorityClass, alignClass)}
              style={col.minWidth ? { minWidth: col.minWidth } : undefined}
            >
              {col.cell(row)}
            </TableCell>
          )
        })}
      </TableRow>
    ))
  }

  function renderBody() {
    if (loading) return renderSkeletonRows()
    if (data.length === 0) return renderEmptyState()
    return renderDataRows()
  }

  return (
    <div data-slot="data-table" className="w-full">
      <Table>
        <TableHeader>
          <TableRow>{renderHeaderCells()}</TableRow>
        </TableHeader>
        <TableBody>{renderBody()}</TableBody>
      </Table>

      {showPagination && !loading && (
        <div className="flex items-center justify-between border-t border-border/60 px-3 py-3">
          <p className="text-sm text-muted-foreground">
            Showing {startIndex + 1}&ndash;{endIndex} of {data.length}
          </p>
          <div className="flex items-center gap-1.5">
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage === 0}
              onClick={() => setCurrentPage((p) => p - 1)}
              aria-label="Previous page"
            >
              <ChevronLeftIcon />
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage >= totalPages - 1}
              onClick={() => setCurrentPage((p) => p + 1)}
              aria-label="Next page"
            >
              Next
              <ChevronRightIcon />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

export { DataTable }
export type { DataTableColumn, DataTableProps }
