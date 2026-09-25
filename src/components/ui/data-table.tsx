'use client';

import React from 'react';
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  SortingState,
  useReactTable,
} from '@tanstack/react-table';
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
} from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  isLoading?: boolean;
  emptyMessage?: string;
  pageSize?: number;
  showNumberColumn?: boolean;
  defaultSorting?: SortingState;
}

export function DataTable<TData, TValue>({
  columns,
  data,
  isLoading = false,
  emptyMessage = 'Tidak ada data yang tersedia.',
  pageSize = 10,
  showNumberColumn = true,
  defaultSorting,
}: DataTableProps<TData, TValue>) {
  // Default sorting on column 1 (the first data column) with 'desc' order if not explicitly specified
  const initialSorting = React.useMemo<SortingState>(() => {
    if (defaultSorting) return defaultSorting;
    if (columns.length > 0) {
      const firstColId =
        columns[0].id || ((columns[0] as any).accessorKey as string | undefined);
      if (firstColId && columns[0].enableSorting !== false) {
        return [{ id: firstColId, desc: true }];
      }
    }
    return [];
  }, [columns, defaultSorting]);

  const [sorting, setSorting] = React.useState<SortingState>(initialSorting);
  const [pagination, setPagination] = React.useState({
    pageIndex: 0,
    pageSize: pageSize,
  });

  // Automatically prepend a "No" column (Column index 0)
  const tableColumns = React.useMemo<ColumnDef<TData, any>[]>(() => {
    if (!showNumberColumn) return columns;

    const numberColumn: ColumnDef<TData, any> = {
      id: '_row_number',
      header: () => <div className="text-center w-full">No</div>,
      cell: ({ row, table: t }) => {
        const pageIndex = t.getState().pagination.pageIndex;
        const currentSize = t.getState().pagination.pageSize;
        // In TanStack Table, rows in table.getRowModel().rows are in visual sorted/paginated order
        const rows = t.getRowModel().rows;
        const indexOnPage = rows.findIndex((r) => r.id === row.id);
        const displayNo = pageIndex * currentSize + (indexOnPage >= 0 ? indexOnPage : 0) + 1;
        return (
          <div className="text-center text-slate-500 font-semibold w-full">
            {displayNo}
          </div>
        );
      },
      enableSorting: false,
    };

    return [numberColumn, ...columns];
  }, [columns, showNumberColumn]);

  const table = useReactTable({
    data,
    columns: tableColumns,
    state: {
      sorting,
      pagination,
    },
    onSortingChange: setSorting,
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  });

  return (
    <div className="space-y-3">
      {/* Table Container */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-700 uppercase tracking-wider font-bold border-b border-slate-200 select-none">
              {table.getHeaderGroups().map((headerGroup) => (
                <tr key={headerGroup.id}>
                  {headerGroup.headers.map((header) => {
                    const canSort = header.column.getCanSort();
                    const isSorted = header.column.getIsSorted();
                    const isNoCol = header.column.id === '_row_number';

                    return (
                      <th
                        key={header.id}
                        className={`py-3.5 px-4 text-slate-700 font-bold ${
                          isNoCol ? 'w-14 text-center' : ''
                        } ${
                          canSort ? 'cursor-pointer hover:bg-slate-100 transition-colors' : ''
                        }`}
                        onClick={header.column.getToggleSortingHandler()}
                      >
                        <div className={`flex items-center gap-1.5 ${isNoCol ? 'justify-center' : ''}`}>
                          {flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                          {canSort && (
                            <span className="text-slate-400">
                              {isSorted === 'asc' ? (
                                <ArrowUp size={13} className="text-sky-600 font-bold" />
                              ) : isSorted === 'desc' ? (
                                <ArrowDown size={13} className="text-sky-600 font-bold" />
                              ) : (
                                <ArrowUpDown size={13} className="text-slate-300 hover:text-slate-500" />
                              )}
                            </span>
                          )}
                        </div>
                      </th>
                    );
                  })}
                </tr>
              ))}
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {isLoading ? (
                <tr>
                  <td
                    colSpan={tableColumns.length}
                    className="py-10 text-center text-slate-400 font-medium animate-pulse"
                  >
                    Memuat data tabel...
                  </td>
                </tr>
              ) : table.getRowModel().rows?.length ? (
                table.getRowModel().rows.map((row) => (
                  <tr
                    key={row.id}
                    className="hover:bg-slate-50/80 transition-colors"
                  >
                    {row.getVisibleCells().map((cell) => {
                      const isNoCol = cell.column.id === '_row_number';
                      return (
                        <td
                          key={cell.id}
                          className={`py-3.5 px-4 text-slate-800 ${
                            isNoCol ? 'w-14 text-center' : ''
                          }`}
                        >
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </td>
                      );
                    })}
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan={tableColumns.length}
                    className="py-10 text-center text-slate-400 font-medium"
                  >
                    {emptyMessage}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination Controls */}
      {!isLoading && data.length > 0 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-2 py-1 text-xs text-slate-600">
          <div className="flex items-center gap-2">
            <span>Baris per halaman:</span>
            <div className="w-20">
              <Select
                value={String(table.getState().pagination.pageSize)}
                onValueChange={(val) => table.setPageSize(Number(val))}
              >
                <SelectTrigger className="h-8 rounded-lg bg-white border-slate-200 text-xs font-semibold">
                  <SelectValue placeholder={String(table.getState().pagination.pageSize)} />
                </SelectTrigger>
                <SelectContent>
                  {[5, 10, 20, 50].map((size) => (
                    <SelectItem key={size} value={String(size)}>
                      {size}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <span className="text-slate-400 ml-1">
              Menampilkan {table.getState().pagination.pageIndex * table.getState().pagination.pageSize + 1} -{' '}
              {Math.min(
                (table.getState().pagination.pageIndex + 1) * table.getState().pagination.pageSize,
                data.length
              )}{' '}
              dari {data.length} data
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-slate-600 font-medium mr-2">
              Halaman {table.getState().pagination.pageIndex + 1} dari{' '}
              {table.getPageCount() || 1}
            </span>

            <button
              onClick={() => table.setPageIndex(0)}
              disabled={!table.getCanPreviousPage()}
              className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
              title="Halaman Pertama"
            >
              <ChevronsLeft size={15} />
            </button>
            <button
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
              className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
              title="Sebelumnya"
            >
              <ChevronLeft size={15} />
            </button>
            <button
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
              className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
              title="Berikutnya"
            >
              <ChevronRight size={15} />
            </button>
            <button
              onClick={() => table.setPageIndex(table.getPageCount() - 1)}
              disabled={!table.getCanNextPage()}
              className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
              title="Halaman Terakhir"
            >
              <ChevronsRight size={15} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
