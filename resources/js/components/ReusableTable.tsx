// resources/js/components/ReusableTable.tsx

import type { ReactNode } from 'react';
import React, { useState, useMemo, useCallback } from 'react';

// ============================================================================
// TYPES
// ============================================================================

export interface Column<T = any> {
    id: keyof T | string;
    label: string;
    minWidth?: number;
    align?: 'right' | 'left' | 'center';
    format?: (value: any, row: T) => ReactNode;
    sortable?: boolean;
    filterable?: boolean;
    filterType?: 'text' | 'select' | 'status';
    filterOptions?: { value: string | number; label: string }[];
    statusColors?: Record<
        string,
        | 'default'
        | 'primary'
        | 'secondary'
        | 'error'
        | 'info'
        | 'success'
        | 'warning'
    >;
}

export interface Action<T = any> {
    label: string;
    icon?: ReactNode;
    color?:
        | 'primary'
        | 'secondary'
        | 'error'
        | 'info'
        | 'success'
        | 'warning'
        | 'inherit';
    variant?: 'text' | 'outlined' | 'contained';
    onClick: (row: T) => void;
    show?: (row: T) => boolean;
}

export interface TableProps<T = any> {
    columns: Column<T>[];
    data: T[];
    actions?: Action<T>[];
    title?: string;
    rowsPerPageOptions?: number[];
    defaultRowsPerPage?: number;
    defaultOrderBy?: keyof T | string;
    defaultOrder?: 'asc' | 'desc';
    onRowClick?: (row: T) => void;
    loading?: boolean;
    emptyMessage?: string;
    filterPlaceholder?: string;
    statusFilterKey?: keyof T | string;
    statusOptions?: { value: string | number; label: string }[];
    className?: string;
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function ReusableTable<T extends Record<string, any>>({
    columns,
    data,
    actions = [],
    title,
    rowsPerPageOptions = [8, 15, 25, 50],
    defaultRowsPerPage = 8,
    defaultOrderBy,
    defaultOrder = 'asc',
    onRowClick,
    loading = false,
    emptyMessage = 'No data available',
    filterPlaceholder = 'Search...',
    statusFilterKey,
    statusOptions = [],
    className = '',
}: TableProps<T>) {
    // ===== STATE =====
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(defaultRowsPerPage);
    const [orderBy, setOrderBy] = useState<string | keyof T | undefined>(
        defaultOrderBy,
    );
    const [order, setOrder] = useState<'asc' | 'desc'>(defaultOrder);
    const [globalFilter, setGlobalFilter] = useState('');
    const [statusFilter, setStatusFilter] = useState<string | number>('');

    // ===== FILTERING & SORTING =====
    const filteredData = useMemo(() => {
        let result = [...data];

        // Global text filter
        if (globalFilter.trim()) {
            const searchTerm = globalFilter.toLowerCase().trim();
            result = result.filter((row) =>
                columns.some((col) => {
                    const value = row[col.id as keyof T];
                    if (value == null) return false;
                    return String(value).toLowerCase().includes(searchTerm);
                }),
            );
        }

        // Status filter
        if (statusFilter && statusFilterKey) {
            result = result.filter((row) => {
                const status = row[statusFilterKey as keyof T];
                return (
                    status != null && String(status) === String(statusFilter)
                );
            });
        }

        // Sorting
        if (orderBy) {
            result.sort((a, b) => {
                const aVal = a[orderBy as keyof T];
                const bVal = b[orderBy as keyof T];

                if (aVal == null && bVal == null) return 0;
                if (aVal == null) return order === 'asc' ? -1 : 1;
                if (bVal == null) return order === 'asc' ? 1 : -1;

                if (typeof aVal === 'number' && typeof bVal === 'number') {
                    return order === 'asc' ? aVal - bVal : bVal - aVal;
                }

                const aStr = String(aVal).toLowerCase();
                const bStr = String(bVal).toLowerCase();
                return order === 'asc'
                    ? aStr.localeCompare(bStr)
                    : bStr.localeCompare(aStr);
            });
        }

        return result;
    }, [
        data,
        columns,
        globalFilter,
        statusFilter,
        statusFilterKey,
        orderBy,
        order,
    ]);

    // ===== PAGINATION =====
    const paginatedData = useMemo(() => {
        const start = page * rowsPerPage;
        return filteredData.slice(start, start + rowsPerPage);
    }, [filteredData, page, rowsPerPage]);

    const totalCount = filteredData.length;
    const totalPages = Math.ceil(totalCount / rowsPerPage);

    const handleChangePage = useCallback((newPage: number) => {
        setPage(newPage);
    }, []);

    const handleChangeRowsPerPage = useCallback(
        (event: React.ChangeEvent<HTMLSelectElement>) => {
            setRowsPerPage(parseInt(event.target.value, 10));
            setPage(0);
        },
        [],
    );

    const handleSort = useCallback(
        (columnId: string | keyof T) => {
            const isAsc = orderBy === columnId && order === 'asc';
            setOrder(isAsc ? 'desc' : 'asc');
            setOrderBy(columnId);
        },
        [order, orderBy],
    );

    const handleGlobalFilterChange = useCallback(
        (e: React.ChangeEvent<HTMLInputElement>) => {
            setGlobalFilter(e.target.value);
            setPage(0);
        },
        [],
    );

    const handleStatusFilterChange = useCallback(
        (e: React.ChangeEvent<HTMLSelectElement>) => {
            setStatusFilter(e.target.value);
            setPage(0);
        },
        [],
    );

    // ===== RENDER CELL =====
    const renderCell = useCallback((row: T, column: Column<T>) => {
        const value = row[column.id as keyof T];

        if (column.format) {
            return column.format(value, row);
        }

        // Status chip rendering
        if (column.filterType === 'status' && column.statusColors) {
            const color = column.statusColors[String(value)] || 'default';
            const colorClasses: Record<string, string> = {
                default:
                    'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
                primary:
                    'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
                secondary:
                    'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
                success:
                    'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
                error: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
                warning:
                    'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
                info: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-400',
            };
            return (
                <span
                    className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${colorClasses[color] || colorClasses.default}`}
                >
                    {value || '-'}
                </span>
            );
        }

        if (value == null) return '-';
        if (typeof value === 'boolean') return value ? 'Yes' : 'No';
        return String(value);
    }, []);

    // ===== RENDER ACTION BUTTONS =====
    const renderActionButtons = useCallback(
        (row: T) => {
            return actions.map((action) => {
                if (action.show && !action.show(row)) return null;

                const colorClasses: Record<string, string> = {
                    primary:
                        'text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-900/20',
                    secondary:
                        'text-purple-600 hover:bg-purple-50 dark:text-purple-400 dark:hover:bg-purple-900/20',
                    error: 'text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20',
                    info: 'text-cyan-600 hover:bg-cyan-50 dark:text-cyan-400 dark:hover:bg-cyan-900/20',
                    success:
                        'text-green-600 hover:bg-green-50 dark:text-green-400 dark:hover:bg-green-900/20',
                    warning:
                        'text-yellow-600 hover:bg-yellow-50 dark:text-yellow-400 dark:hover:bg-yellow-900/20',
                    inherit:
                        'text-gray-600 hover:bg-gray-50 dark:text-gray-400 dark:hover:bg-gray-700/50',
                };

                const variantClasses: Record<string, string> = {
                    text: 'hover:bg-transparent',
                    outlined:
                        'border border-gray-300 hover:bg-gray-50 dark:border-gray-600 dark:hover:bg-gray-700',
                    contained:
                        'bg-blue-600 text-white hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-700',
                };

                const baseClass = 'rounded p-1.5 transition-colors';
                const colorClass = colorClasses[action.color || 'primary'];
                const variantClass = variantClasses[action.variant || 'text'];

                return (
                    <button
                        key={action.label}
                        className={`${baseClass} ${variantClass} ${action.variant === 'contained' ? '' : colorClass}`}
                        onClick={(e) => {
                            e.stopPropagation();
                            action.onClick(row);
                        }}
                        title={action.label}
                    >
                        {action.icon || action.label}
                    </button>
                );
            });
        },
        [actions],
    );

    // ==========================================================================
    // RENDER
    // ==========================================================================

    return (
        <div
            className={`rounded-xl border border-slate-200 bg-blue-50 dark:border-slate-700 ${className}`}
        >
            {/* Header with Title and Filters */}
            <div className="border-b border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800/50">
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    {title && (
                        <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-200">
                            {title}
                        </h2>
                    )}

                    <div className="flex flex-1 flex-col gap-3 sm:flex-row md:flex-none">
                        {/* Global Search */}
                        <input
                            type="text"
                            placeholder={filterPlaceholder}
                            value={globalFilter}
                            onChange={handleGlobalFilterChange}
                            className="w-full rounded-lg border border-slate-100 bg-blue-[#e8efff] px-3 py-2 text-sm focus:border-transparent focus:ring-2 focus:ring-blue-500 focus:outline-none sm:w-64 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200"
                        />

                        {/* Status Filter */}
                        {statusFilterKey && statusOptions.length > 0 && (
                            <select
                                value={statusFilter}
                                onChange={handleStatusFilterChange}
                                className="w-full rounded-lg border bg-blue-50 border-slate-300 px-3 py-2 text-sm focus:border-transparent focus:ring-2 focus:ring-blue-500 focus:outline-none sm:w-40 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200"
                            >
                                <option value="">All Status</option>
                                {statusOptions.map((opt) => (
                                    <option
                                        key={String(opt.value)}
                                        value={opt.value}
                                    >
                                        {opt.label}
                                    </option>
                                ))}
                            </select>
                        )}
                    </div>
                </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
                <table className="w-full">
                    <thead className="bg-slate-50/50 dark:bg-slate-800/30">
                        <tr>
                            {columns.map((column) => (
                                <th
                                    key={String(column.id)}
                                    className={`px-4 py-3 text-left text-xs font-medium tracking-wider text-slate-500 uppercase dark:text-slate-400 ${
                                        column.align === 'right'
                                            ? 'text-right'
                                            : column.align === 'center'
                                              ? 'text-center'
                                              : 'text-left'
                                    }`}
                                    style={{ minWidth: column.minWidth || 100 }}
                                >
                                    {column.sortable !== false ? (
                                        <button
                                            className="flex items-center gap-1 hover:text-slate-700 dark:hover:text-slate-300"
                                            onClick={() =>
                                                handleSort(column.id)
                                            }
                                        >
                                            {column.label}
                                            {orderBy === column.id && (
                                                <span className="text-slate-400">
                                                    {order === 'asc'
                                                        ? '↑'
                                                        : '↓'}
                                                </span>
                                            )}
                                        </button>
                                    ) : (
                                        column.label
                                    )}
                                </th>
                            ))}
                            {actions.length > 0 && (
                                <th className="px-4 py-3 text-center text-xs font-medium tracking-wider text-slate-500 uppercase dark:text-slate-400">
                                    Actions
                                </th>
                            )}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 bg-white dark:divide-slate-700 dark:bg-slate-800">
                        {loading ? (
                            <tr>
                                <td
                                    colSpan={
                                        columns.length +
                                        (actions.length > 0 ? 1 : 0)
                                    }
                                    className="px-4 py-8 text-center text-slate-500 dark:text-slate-400"
                                >
                                    <div className="flex items-center justify-center gap-2">
                                        <div className="h-6 w-6 animate-spin rounded-full border-2 border-blue-600 border-t-transparent"></div>
                                        <span className="text-sm">
                                            Loading...
                                        </span>
                                    </div>
                                </td>
                            </tr>
                        ) : paginatedData.length === 0 ? (
                            <tr>
                                <td
                                    colSpan={
                                        columns.length +
                                        (actions.length > 0 ? 1 : 0)
                                    }
                                    className="px-4 py-8 text-center text-sm text-slate-500 dark:text-slate-400"
                                >
                                    {emptyMessage}
                                </td>
                            </tr>
                        ) : (
                            paginatedData.map((row, index) => (
                                <tr
                                    key={index}
                                    onClick={
                                        onRowClick
                                            ? () => onRowClick(row)
                                            : undefined
                                    }
                                    className={`transition-colors ${
                                        onRowClick
                                            ? 'cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700/50'
                                            : ''
                                    }`}
                                >
                                    {columns.map((column) => (
                                        <td
                                            key={String(column.id)}
                                            className={`px-4 py-3 text-sm text-slate-800 dark:text-slate-200 ${
                                                column.align === 'right'
                                                    ? 'text-right'
                                                    : column.align === 'center'
                                                      ? 'text-center'
                                                      : 'text-left'
                                            }`}
                                        >
                                            {renderCell(row, column)}
                                        </td>
                                    ))}
                                    {actions.length > 0 && (
                                        <td className="px-4 py-3 text-center text-sm whitespace-nowrap">
                                            <div className="flex flex-wrap justify-center gap-1">
                                                {renderActionButtons(row)}
                                            </div>
                                        </td>
                                    )}
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Pagination */}
            {totalCount > 0 && (
                <div className="flex flex-col items-center justify-between gap-3 border-t border-slate-200 bg-slate-50 px-4 py-3 sm:flex-row dark:border-slate-700 dark:bg-slate-800/50">
                    <div className="flex items-center gap-2">
                        <span className="text-sm text-slate-700 dark:text-slate-300">
                            Rows per page:
                        </span>
                        <select
                            value={rowsPerPage}
                            onChange={handleChangeRowsPerPage}
                            className="rounded-lg border border-slate-300 px-2 py-1 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200"
                        >
                            {rowsPerPageOptions.map((option) => (
                                <option key={option} value={option}>
                                    {option}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="flex items-center gap-2">
                        <span className="text-sm text-slate-700 dark:text-slate-300">
                            {totalCount > 0 ? page * rowsPerPage + 1 : 0} -{' '}
                            {Math.min((page + 1) * rowsPerPage, totalCount)} of{' '}
                            {totalCount}
                        </span>
                        <button
                            onClick={() => handleChangePage(page - 1)}
                            disabled={page === 0}
                            className="rounded-lg border border-slate-300 px-3 py-1 text-sm hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-700"
                        >
                            Previous
                        </button>
                        <button
                            onClick={() => handleChangePage(page + 1)}
                            disabled={page >= totalPages - 1}
                            className="rounded-lg border border-slate-300 px-3 py-1 text-sm hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-700"
                        >
                            Next
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

export default ReusableTable;
