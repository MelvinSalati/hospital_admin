import {
    Search,
    ChevronUp,
    ChevronDown,
    ChevronLeft,
    ChevronRight,
    X,
    AlertCircle,
    CheckCircle,
    Clock,
    Loader2,
} from 'lucide-react';
import type { ReactNode } from 'react';
import React, { useState, useMemo } from 'react';

export type Column<T> = {
    key: keyof T | string;
    header: string;
    render?: (value: any, row: T) => ReactNode;
    sortable?: boolean;
    filterable?: boolean;
    filterOptions?: { label: string; value: string }[];
    className?: string;
    width?: string;
};

export type TableProps<T> = {
    data: T[];
    columns: Column<T>[];
    title?: string;
    subtitle?: string;
    isLoading?: boolean;
    emptyMessage?: string;
    onRowClick?: (row: T) => void;
    actions?: (row: T) => ReactNode;
    pagination?: {
        currentPage: number;
        totalPages: number;
        onPageChange: (page: number) => void;
        totalItems?: number;
        itemsPerPage?: number;
    };
    searchable?: boolean;
    searchPlaceholder?: string;
    onSearch?: (query: string) => void;
    className?: string;
};

// StatusBadge component
interface StatusBadgeProps {
    status: string;
    size?: 'sm' | 'md' | 'lg';
    showIcon?: boolean;
    className?: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
    status,
    size = 'md',
    showIcon = true,
    className = '',
}) => {
    const statusConfig: Record<
        string,
        {
            color: string;
            bgColor: string;
            borderColor: string;
            icon: React.ElementType;
            label: string;
            animation?: string;
        }
    > = {
        completed: {
            color: 'text-emerald-700',
            bgColor: 'bg-emerald-100',
            borderColor: 'border-emerald-300',
            icon: CheckCircle,
            label: 'Completed',
        },
        pending: {
            color: 'text-amber-700',
            bgColor: 'bg-amber-100',
            borderColor: 'border-amber-300',
            icon: Clock,
            label: 'Pending',
        },
        'in-progress': {
            color: 'text-blue-700',
            bgColor: 'bg-blue-100',
            borderColor: 'border-blue-300',
            icon: Loader2,
            label: 'In Progress',
            animation: 'animate-spin',
        },
        cancelled: {
            color: 'text-red-700',
            bgColor: 'bg-red-100',
            borderColor: 'border-red-300',
            icon: AlertCircle,
            label: 'Cancelled',
        },
        draft: {
            color: 'text-slate-700',
            bgColor: 'bg-slate-100',
            borderColor: 'border-slate-300',
            icon: Clock,
            label: 'Draft',
        },
        unpaid: {
            color: 'text-orange-700',
            bgColor: 'bg-orange-100',
            borderColor: 'border-orange-300',
            icon: AlertCircle,
            label: 'Unpaid',
        },
        paid: {
            color: 'text-green-700',
            bgColor: 'bg-green-100',
            borderColor: 'border-green-300',
            icon: CheckCircle,
            label: 'Paid',
        },
    };

    const config = statusConfig[status?.toLowerCase()] || statusConfig.draft;
    const Icon = config.icon;

    const sizeClasses = {
        sm: 'px-2 py-0.5 text-xs gap-1',
        md: 'px-2.5 py-1 text-xs gap-1.5',
        lg: 'px-3 py-1.5 text-sm gap-2',
    };

    return (
        <span
            className={`inline-flex items-center rounded-full border ${config.bgColor} ${config.borderColor} ${config.color} ${sizeClasses[size]} ${className}`}
        >
            {showIcon && (
                <Icon className={`h-3 w-3 ${config.animation || ''}`} />
            )}
            {config.label}
        </span>
    );
};

export function Table<T extends Record<string, any>>({
    data,
    columns,
    title,
    subtitle,
    isLoading = false,
    emptyMessage = 'No data found',
    onRowClick,
    actions,
    pagination,
    searchable = true,
    searchPlaceholder = 'Search...',
    onSearch,
    className = '',
}: TableProps<T>) {
    const [searchQuery, setSearchQuery] = useState('');
    const [sortColumn, setSortColumn] = useState<string | null>(null);
    const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
    const [filters, setFilters] = useState<Record<string, string>>({});

    // Handle sorting
    const sortedData = useMemo(() => {
        if (!sortColumn) return data;

        return [...data].sort((a, b) => {
            const aVal = a[sortColumn] ?? '';
            const bVal = b[sortColumn] ?? '';
            const comparison = String(aVal).localeCompare(String(bVal));
            return sortDirection === 'asc' ? comparison : -comparison;
        });
    }, [data, sortColumn, sortDirection]);

    // Handle filtering
    const filteredData = useMemo(() => {
        let result = sortedData;

        // Apply column filters
        Object.entries(filters).forEach(([key, value]) => {
            if (value) {
                result = result.filter((row) => {
                    const rowValue = row[key] ?? '';
                    return String(rowValue)
                        .toLowerCase()
                        .includes(value.toLowerCase());
                });
            }
        });

        // Apply search
        if (searchQuery) {
            result = result.filter((row) => {
                return Object.values(row).some((val) =>
                    String(val)
                        .toLowerCase()
                        .includes(searchQuery.toLowerCase()),
                );
            });
        }

        return result;
    }, [sortedData, filters, searchQuery]);

    const handleSort = (key: string) => {
        if (sortColumn === key) {
            setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
        } else {
            setSortColumn(key);
            setSortDirection('asc');
        }
    };

    const clearFilters = () => {
        setFilters({});
        setSearchQuery('');
        if (onSearch) onSearch('');
    };

    // Get visible data based on pagination
    const visibleData = pagination
        ? filteredData.slice(
              (pagination.currentPage - 1) * (pagination.itemsPerPage || 10),
              pagination.currentPage * (pagination.itemsPerPage || 10),
          )
        : filteredData;

    return (
        <div
            className={`rounded-xl border border-slate-200 bg-white shadow-sm ${className}`}
        >
            {/* Header */}
            {(title || subtitle || searchable) && (
                <div className="flex flex-col gap-3 border-b border-slate-200 p-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        {title && (
                            <h3 className="text-lg font-semibold text-slate-900">
                                {title}
                            </h3>
                        )}
                        {subtitle && (
                            <p className="text-sm text-slate-500">{subtitle}</p>
                        )}
                    </div>
                    <div className="flex items-center gap-2">
                        {searchable && (
                            <div className="relative">
                                <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
                                <input
                                    type="text"
                                    placeholder={searchPlaceholder}
                                    value={searchQuery}
                                    onChange={(e) => {
                                        setSearchQuery(e.target.value);
                                        if (onSearch) onSearch(e.target.value);
                                    }}
                                    className="h-9 w-full rounded-lg border border-slate-200 bg-slate-50 pr-4 pl-9 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none sm:w-48"
                                />
                            </div>
                        )}
                        {(Object.keys(filters).length > 0 || searchQuery) && (
                            <button
                                onClick={clearFilters}
                                className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        )}
                    </div>
                </div>
            )}

            {/* Table */}
            <div className="overflow-x-auto">
                <table className="w-full">
                    <thead>
                        <tr className="border-b border-slate-200 bg-slate-50/50">
                            {columns.map((col) => (
                                <th
                                    key={String(col.key)}
                                    className={`px-4 py-3 text-left text-xs font-medium tracking-wider text-slate-500 uppercase ${col.className || ''}`}
                                    style={{ width: col.width }}
                                >
                                    <div className="flex items-center gap-1">
                                        <span>{col.header}</span>
                                        {col.sortable !== false && (
                                            <button
                                                onClick={() =>
                                                    handleSort(String(col.key))
                                                }
                                                className="rounded p-0.5 hover:bg-slate-200"
                                            >
                                                {sortColumn ===
                                                String(col.key) ? (
                                                    sortDirection === 'asc' ? (
                                                        <ChevronUp className="h-3 w-3" />
                                                    ) : (
                                                        <ChevronDown className="h-3 w-3" />
                                                    )
                                                ) : (
                                                    <ChevronUp className="h-3 w-3 text-slate-300" />
                                                )}
                                            </button>
                                        )}
                                    </div>
                                    {col.filterable && col.filterOptions && (
                                        <select
                                            className="mt-1 block w-full rounded border border-slate-200 bg-white px-2 py-0.5 text-xs focus:border-blue-500 focus:outline-none"
                                            onChange={(e) => {
                                                const value = e.target.value;
                                                setFilters((prev) => ({
                                                    ...prev,
                                                    [String(col.key)]: value,
                                                }));
                                            }}
                                            value={
                                                filters[String(col.key)] || ''
                                            }
                                        >
                                            <option value="">All</option>
                                            {col.filterOptions.map((opt) => (
                                                <option
                                                    key={opt.value}
                                                    value={opt.value}
                                                >
                                                    {opt.label}
                                                </option>
                                            ))}
                                        </select>
                                    )}
                                </th>
                            ))}
                            {actions && (
                                <th className="px-4 py-3 text-right text-xs font-medium tracking-wider text-slate-500 uppercase">
                                    Actions
                                </th>
                            )}
                        </tr>
                    </thead>
                    <tbody>
                        {isLoading ? (
                            <tr>
                                <td
                                    colSpan={columns.length + (actions ? 1 : 0)}
                                    className="py-12 text-center"
                                >
                                    <Loader2 className="mx-auto h-8 w-8 animate-spin text-blue-600" />
                                    <p className="mt-2 text-sm text-slate-500">
                                        Loading...
                                    </p>
                                </td>
                            </tr>
                        ) : visibleData.length === 0 ? (
                            <tr>
                                <td
                                    colSpan={columns.length + (actions ? 1 : 0)}
                                    className="py-12 text-center"
                                >
                                    <div className="flex flex-col items-center">
                                        <div className="rounded-full bg-slate-100 p-3">
                                            <Search className="h-8 w-8 text-slate-400" />
                                        </div>
                                        <p className="mt-3 text-sm text-slate-500">
                                            {emptyMessage}
                                        </p>
                                    </div>
                                </td>
                            </tr>
                        ) : (
                            visibleData.map((row, index) => (
                                <tr
                                    key={index}
                                    onClick={() => onRowClick?.(row)}
                                    className={`border-b border-slate-100 transition-colors ${
                                        onRowClick
                                            ? 'cursor-pointer hover:bg-blue-50/50'
                                            : 'hover:bg-slate-50/50'
                                    }`}
                                >
                                    {columns.map((col) => (
                                        <td
                                            key={String(col.key)}
                                            className={`px-4 py-3 text-sm text-slate-700 ${col.className || ''}`}
                                        >
                                            {col.render
                                                ? col.render(row[col.key], row)
                                                : (row[col.key] ?? '-')}
                                        </td>
                                    ))}
                                    {actions && (
                                        <td className="px-4 py-3 text-right">
                                            {actions(row)}
                                        </td>
                                    )}
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Pagination */}
            {pagination && filteredData.length > 0 && (
                <div className="flex flex-col gap-3 border-t border-slate-200 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="text-sm text-slate-500">
                        {pagination.totalItems !== undefined && (
                            <>
                                Showing{' '}
                                {(pagination.currentPage - 1) *
                                    (pagination.itemsPerPage || 10) +
                                    1}{' '}
                                to{' '}
                                {Math.min(
                                    pagination.currentPage *
                                        (pagination.itemsPerPage || 10),
                                    pagination.totalItems,
                                )}{' '}
                                of {pagination.totalItems}
                            </>
                        )}
                        {!pagination.totalItems && (
                            <>
                                Page {pagination.currentPage} of{' '}
                                {pagination.totalPages}
                            </>
                        )}
                    </div>
                    <div className="flex items-center gap-1">
                        <button
                            onClick={() =>
                                pagination.onPageChange(
                                    pagination.currentPage - 1,
                                )
                            }
                            disabled={pagination.currentPage === 1}
                            className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 disabled:opacity-50 disabled:hover:bg-transparent"
                        >
                            <ChevronLeft className="h-4 w-4" />
                        </button>
                        {/* Page numbers */}
                        <div className="flex items-center gap-1">
                            {Array.from(
                                { length: Math.min(5, pagination.totalPages) },
                                (_, i) => {
                                    let pageNum;
                                    if (pagination.totalPages <= 5) {
                                        pageNum = i + 1;
                                    } else if (pagination.currentPage <= 3) {
                                        pageNum = i + 1;
                                    } else if (
                                        pagination.currentPage >=
                                        pagination.totalPages - 2
                                    ) {
                                        pageNum = pagination.totalPages - 4 + i;
                                    } else {
                                        pageNum =
                                            pagination.currentPage - 2 + i;
                                    }
                                    return (
                                        <button
                                            key={pageNum}
                                            onClick={() =>
                                                pagination.onPageChange(pageNum)
                                            }
                                            className={`rounded-lg px-3 py-1 text-sm transition-colors ${
                                                pagination.currentPage ===
                                                pageNum
                                                    ? 'bg-blue-600 text-white'
                                                    : 'text-slate-600 hover:bg-slate-100'
                                            }`}
                                        >
                                            {pageNum}
                                        </button>
                                    );
                                },
                            )}
                            {pagination.totalPages > 5 &&
                                pagination.currentPage <
                                    pagination.totalPages - 2 && (
                                    <>
                                        <span className="text-slate-400">
                                            ...
                                        </span>
                                        <button
                                            onClick={() =>
                                                pagination.onPageChange(
                                                    pagination.totalPages,
                                                )
                                            }
                                            className={`rounded-lg px-3 py-1 text-sm transition-colors ${
                                                pagination.currentPage ===
                                                pagination.totalPages
                                                    ? 'bg-blue-600 text-white'
                                                    : 'text-slate-600 hover:bg-slate-100'
                                            }`}
                                        >
                                            {pagination.totalPages}
                                        </button>
                                    </>
                                )}
                        </div>
                        <button
                            onClick={() =>
                                pagination.onPageChange(
                                    pagination.currentPage + 1,
                                )
                            }
                            disabled={
                                pagination.currentPage === pagination.totalPages
                            }
                            className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 disabled:opacity-50 disabled:hover:bg-transparent"
                        >
                            <ChevronRight className="h-4 w-4" />
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
