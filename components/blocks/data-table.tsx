"use client";

import { ArrowsDownUpIcon, CaretDownIcon, CaretUpIcon, MagnifyingGlassIcon } from "@phosphor-icons/react";
import {
  type Column,
  type ColumnDef,
  type ColumnFiltersState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  type SortingState,
  useReactTable,
} from "@tanstack/react-table";
import * as React from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";

interface Member {
  id: string;
  name: string;
  email: string;
  role: string;
  status: "active" | "pending" | "inactive";
  contributions: number;
}

const data: Member[] = [
  {
    id: "1",
    name: "Ada Lovelace",
    email: "ada@sistine.dev",
    role: "Owner",
    status: "active",
    contributions: 312,
  },
  {
    id: "2",
    name: "Alan Turing",
    email: "alan@sistine.dev",
    role: "Admin",
    status: "active",
    contributions: 287,
  },
  {
    id: "3",
    name: "Grace Hopper",
    email: "grace@sistine.dev",
    role: "Maintainer",
    status: "active",
    contributions: 244,
  },
  {
    id: "4",
    name: "Katherine Johnson",
    email: "katherine@sistine.dev",
    role: "Contributor",
    status: "pending",
    contributions: 98,
  },
  {
    id: "5",
    name: "Linus Torvalds",
    email: "linus@sistine.dev",
    role: "Maintainer",
    status: "active",
    contributions: 401,
  },
  {
    id: "6",
    name: "Margaret Hamilton",
    email: "margaret@sistine.dev",
    role: "Admin",
    status: "active",
    contributions: 356,
  },
  {
    id: "7",
    name: "Dennis Ritchie",
    email: "dennis@sistine.dev",
    role: "Contributor",
    status: "inactive",
    contributions: 41,
  },
  {
    id: "8",
    name: "Barbara Liskov",
    email: "barbara@sistine.dev",
    role: "Maintainer",
    status: "active",
    contributions: 198,
  },
  {
    id: "9",
    name: "Tim Berners-Lee",
    email: "tim@sistine.dev",
    role: "Contributor",
    status: "pending",
    contributions: 73,
  },
  {
    id: "10",
    name: "Donald Knuth",
    email: "don@sistine.dev",
    role: "Contributor",
    status: "active",
    contributions: 165,
  },
  {
    id: "11",
    name: "Edsger Dijkstra",
    email: "edsger@sistine.dev",
    role: "Contributor",
    status: "inactive",
    contributions: 29,
  },
  {
    id: "12",
    name: "John Carmack",
    email: "john@sistine.dev",
    role: "Admin",
    status: "active",
    contributions: 220,
  },
];

const statusStyles: Record<Member["status"], string> = {
  active: "border-green-500/40 text-green-600 dark:text-green-400",
  pending: "border-yellow-500/40 text-yellow-600 dark:text-yellow-400",
  inactive: "border-[var(--glass-border)] text-muted-foreground",
};

function SortHeader({ column, children, className }: { column: Column<Member, unknown>; children: React.ReactNode; className?: string }) {
  const sorted = column.getIsSorted();
  return (
    <button
      type="button"
      onClick={() => column.toggleSorting(sorted === "asc")}
      className={cn("inline-flex items-center gap-1 transition-colors hover:text-foreground", className)}
    >
      {children}
      {sorted === "asc" ? (
        <CaretUpIcon className="h-3.5 w-3.5" />
      ) : sorted === "desc" ? (
        <CaretDownIcon className="h-3.5 w-3.5" />
      ) : (
        <ArrowsDownUpIcon className="h-3.5 w-3.5 opacity-40" />
      )}
    </button>
  );
}

const columns: ColumnDef<Member>[] = [
  {
    accessorKey: "name",
    header: ({ column }) => <SortHeader column={column}>Name</SortHeader>,
    cell: ({ row }) => <span className="font-medium text-foreground">{row.getValue("name")}</span>,
  },
  {
    accessorKey: "email",
    header: "Email",
    cell: ({ row }) => <span className="text-muted-foreground">{row.getValue("email")}</span>,
  },
  {
    accessorKey: "role",
    header: "Role",
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => {
      const status = row.getValue<Member["status"]>("status");
      return (
        <Badge variant="glass" className={cn("capitalize", statusStyles[status])}>
          {status}
        </Badge>
      );
    },
  },
  {
    accessorKey: "contributions",
    header: ({ column }) => (
      <SortHeader column={column} className="ml-auto">
        Contributions
      </SortHeader>
    ),
    cell: ({ row }) => <div className="text-right font-mono tabular-nums text-foreground">{row.getValue<number>("contributions")}</div>,
  },
];

export function DataTableBlock() {
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);

  const table = useReactTable({
    data,
    columns,
    state: {
      sorting,
      columnFilters,
    },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: {
      pagination: {
        pageSize: 6,
      },
    },
  });

  return (
    <div className="space-y-4 p-6">
      <div>
        <h2 className="text-3xl font-bold text-foreground">Members</h2>
        <p className="text-muted-foreground">A sortable, filterable data table built on the glass Table primitive.</p>
      </div>

      <div className="relative max-w-sm">
        <MagnifyingGlassIcon className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          variant="glass"
          placeholder="Filter by name…"
          value={(table.getColumn("name")?.getFilterValue() as string) ?? ""}
          onChange={(event) => table.getColumn("name")?.setFilterValue(event.target.value)}
          className="pl-9"
        />
      </div>

      <Table variant="glass">
        <TableHeader>
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id}>
              {headerGroup.headers.map((header) => (
                <TableHead key={header.id}>{header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}</TableHead>
              ))}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {table.getRowModel().rows.length ? (
            table.getRowModel().rows.map((row) => (
              <TableRow key={row.id}>
                {row.getVisibleCells().map((cell) => (
                  <TableCell key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</TableCell>
                ))}
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={columns.length} className="h-24 text-center text-muted-foreground">
                No results.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>

      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount()} · {table.getFilteredRowModel().rows.length} members
        </p>
        <div className="flex gap-2">
          <Button variant="glass" size="sm" onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()}>
            Previous
          </Button>
          <Button variant="glass" size="sm" onClick={() => table.nextPage()} disabled={!table.getCanNextPage()}>
            Next
          </Button>
        </div>
      </div>
    </div>
  );
}
