import {
  CircularProgress,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TableSortLabel,
  Typography,
} from "@mui/material"
import React, { useEffect, useMemo, useRef, useState } from "react"

export type HeaderCell = {
  field?: string
  sortable?: boolean
  sx?: any
  label: string
  align?: "center" | "left" | "right"
}

type InMemoryTableProps = {
  headerCells: HeaderCell[]
  data: any[]
  /**
   * @default 30
   */
  pageSize?: number
  renderRow: (row: any) => React.ReactNode
  initialSortField: string
  initialSortDir: "asc" | "desc"
}

export function InMemoryTable(props: InMemoryTableProps) {
  const {
    data,
    pageSize = 30,
    renderRow,
    headerCells,
    initialSortField,
    initialSortDir,
  } = props

  const loaderRef = useRef(null)

  const [listSize, setListSize] = useState(pageSize)
  const [endReached, setEndReached] = useState(false)

  useEffect(() => {
    setListSize(pageSize)
  }, [data, pageSize])

  useEffect(() => {
    if (endReached) return
    const observer = new IntersectionObserver(
      (entries) => {
        const first = entries[0]
        if (first.isIntersecting) {
          console.log("Intersecting - Showing more data")
          setListSize((prev) => {
            if (prev + pageSize >= data.length) {
              setEndReached(true)
              return data.length
            }
            return prev + pageSize
          })
        } else {
          console.log("Not intersecting")
        }
      },
      { threshold: 1 },
    )

    if (loaderRef.current) {
      observer.observe(loaderRef.current)
    }

    return () => observer.disconnect()
  }, [data.length, endReached, pageSize])

  const [sortAscending, setSortAscending] = useState<boolean>(
    initialSortDir === "asc",
  )
  const [sortField, setSortField] = useState<string>(initialSortField)

  const visibleRows = useMemo(
    () =>
      data
        .sort((a, b) => {
          if (a[sortField] < b[sortField]) {
            return sortAscending ? -1 : 1
          }
          if (a[sortField] > b[sortField]) {
            return sortAscending ? 1 : -1
          }
          return 0
        })
        .slice(0, listSize),
    [data, listSize, sortAscending, sortField],
  )

  return (
    <Stack>
      <Table>
        <TableHead>
          <TableRow>
            {headerCells.map((cell, index) => (
              <TableCell
                key={index}
                align={cell.align}
                sx={{
                  color: "#9ea2aa",
                  ...(cell.sx || {}),
                }}
              >
                {cell.sortable ? (
                  <TableSortLabel
                    active={sortField === cell.field}
                    direction={sortAscending ? "asc" : "desc"}
                    onClick={() => {
                      if (sortField !== cell.field) {
                        setSortField(cell.field as string)
                      } else {
                        setSortAscending(!sortAscending)
                      }
                    }}
                  >
                    {cell.label}
                  </TableSortLabel>
                ) : (
                  cell.label
                )}
              </TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>{visibleRows.map(renderRow)}</TableBody>
      </Table>
      <Stack
        marginY={2}
        marginX={1}
        ref={loaderRef}
        sx={{ width: "100%" }}
        direction="row"
        gap={1}
        alignItems="center"
        // justifyContent="center"
      >
        {!endReached && <CircularProgress size={12} color="primary" />}
        <Typography variant="body2" color="text.secondary">
          {endReached
            ? `Total rows: ${data.length}`
            : "Loading more records..."}
        </Typography>
      </Stack>
    </Stack>
  )
}
