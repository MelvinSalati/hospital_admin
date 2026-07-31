// components/GlobalTable/GlobalTable.tsx

import React, { useState, useEffect, useMemo } from 'react';
import {
    ChevronLeft,
    ChevronRight,
    ChevronsLeft,
    ChevronsRight,
    Search,
    Filter,
    X,
    Loader2,
    RefreshCw,
    FileText,
    ChevronDown,
    ChevronUp,
    Download,
    Printer,
} from 'lucide-react';

// ============================================
// TYPES
// ============================================

export interface Column<T = any> {
    key: string;
    header: string;
    accessor?: (row: T) => React.ReactNode;
    sortable?: boolean;
    filterable?: boolean;
    width?: string;
    align?: 'left' | 'center' | 'right';
    className?: string;
    hidden?: boolean | ((row: T) => boolean);
}

export interface Action<T = any> {
    label: string;
    icon?: React.ReactNode;
    onClick: (row: T) => void;
    condition?: (row: T) => boolean;
    color?: string;
    variant?: 'solid' | 'outline' | 'ghost';
    size?: 'sm' | 'md' | 'lg';
    disabled?: (row: T) => boolean;
    tooltip?: string;
}

export interface FilterOption {
    value: string;
    label: string;
}

export interface FilterConfig {
    key: string;
    label: string;
    type: 'text' | 'select' | 'date' | 'dateRange' | 'number' | 'boolean';
    options?: FilterOption[];
    placeholder?: string;
    defaultValue?: any;
}

export interface GlobalTableProps<T = any> {
    // Data
    data: T[];
    columns: Column<T>[];
    actions?: Action<T>[];
    loading?: boolean;
    totalItems?: number;
    currentPage?: number;
    pageSize?: number;

    // Pagination
    onPageChange?: (page: number) => void;
    onPageSizeChange?: (size: number) => void;
    pageSizeOptions?: number[];

    // Search
    searchable?: boolean;
    searchPlaceholder?: string;
    onSearch?: (search: string) => void;
    searchFields?: string[];

    // Filters
    filterable?: boolean;
    filters?: FilterConfig[];
    onFilterChange?: (filters: Record<string, any>) => void;

    // Selection
    selectable?: boolean;
    selectedKeys?: string[];
    onSelectionChange?: (selectedKeys: string[]) => void;
    rowKey?: string;

    // Sorting
    sortable?: boolean;
    defaultSort?: { key: string; direction: 'asc' | 'desc' };
    onSort?: (key: string, direction: 'asc' | 'desc') => void;

    // Actions
    onRefresh?: () => void;
    onExport?: () => void;
    onPrint?: () => void;

    // Styling
    className?: string;
    rowClassName?: string | ((row: T) => string);
    emptyMessage?: string;
    loadingMessage?: string;

    // Child components
    renderRow?: (row: T, index: number) => React.ReactNode;
    renderEmpty?: () => React.ReactNode;
    renderLoading?: () => React.ReactNode;

    // Additional
    stickyHeader?: boolean;
    compact?: boolean;
    bordered?: boolean;
    striped?: boolean;
    hoverable?: boolean;
}

// ============================================
// PAGINATION HELPER
// ============================================

function getPageNumbers(
    currentPage: number,
    totalPages: number,
    maxVisible: number = 7,
): (number | string)[] {
    const pages: (number | string)[] = [];

    if (totalPages <= maxVisible) {
        for (let i = 1; i <= totalPages; i++) {
            pages.push(i);
        }
        return pages;
    }

    pages.push(1);

    let startPage = Math.max(2, currentPage - 2);
    let endPage = Math.min(totalPages - 1, currentPage + 2);

    if (currentPage <= 3) {
        startPage = 2;
        endPage = Math.min(totalPages - 1, 6);
    }

    if (currentPage >= totalPages - 2) {
        startPage = Math.max(2, totalPages - 5);
        endPage = totalPages - 1;
    }

    if (startPage > 2) {
        pages.push('...');
    }

    for (let i = startPage; i <= endPage; i++) {
        pages.push(i);
    }

    if (endPage < totalPages - 1) {
        pages.push('...');
    }

    if (totalPages > 1) {
        pages.push(totalPages);
    }

    return pages;
}

// ============================================
// MAIN COMPONENT
// ============================================

export function GlobalTable<T extends Record<string, any>>({
    data = [],
    columns = [],
    actions = [],
    loading = false,
    totalItems = 0,
    currentPage = 1,
    pageSize = 10,
    onPageChange,
    onPageSizeChange,
    pageSizeOptions = [10, 25, 50, 100],

    searchable = true,
    searchPlaceholder = 'Search...',
    onSearch,
    searchFields = [],

    filterable = true,
    filters = [],
    onFilterChange,

    selectable = false,
    selectedKeys = [],
    onSelectionChange,
    rowKey = 'id',

    sortable = true,
    defaultSort,
    onSort,

    onRefresh,
    onExport,
    onPrint,

    className = '',
    rowClassName,
    emptyMessage = 'No data available',
    loadingMessage = 'Loading...',

    renderRow,
    renderEmpty,
    renderLoading,

    stickyHeader = false,
    compact = false,
    bordered = true,
    striped = true,
    hoverable = true,
}: GlobalTableProps<T>) {
    // ============================================
    // STATE
    // ============================================

    const [searchTerm, setSearchTerm] = useState('');
    const [showFilters, setShowFilters] = useState(false);
    const [filterValues, setFilterValues] = useState<Record<string, any>>({});
    const [sortKey, setSortKey] = useState<string>(defaultSort?.key || '');
    const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>(
        defaultSort?.direction || 'asc',
    );
    const [selected, setSelected] = useState<string[]>(selectedKeys || []);

    // ============================================
    // EFFECTS
    // ============================================

    // Sync external selected keys
    useEffect(() => {
        if (selectedKeys) {
            setSelected(selectedKeys);
        }
    }, [selectedKeys]);

    // ============================================
    // HANDLERS
    // ============================================

    const handlePageChange = (page: number) => {
        if (page < 1 || page > totalPages || page === currentPage) return;
        if (onPageChange) onPageChange(page);
    };

    const handlePageSizeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const size = parseInt(e.target.value);
        if (onPageSizeChange) onPageSizeChange(size);
    };

    const handleSearch = (value: string) => {
        setSearchTerm(value);
        if (onSearch) onSearch(value);
    };

    const handleFilterChange = (key: string, value: any) => {
        const newFilters = { ...filterValues, [key]: value };
        if (!value || value === '') {
            delete newFilters[key];
        }
        setFilterValues(newFilters);
        if (onFilterChange) onFilterChange(newFilters);
    };

    const handleSort = (key: string) => {
        if (!sortable) return;

        let direction: 'asc' | 'desc' = 'asc';
        if (sortKey === key) {
            direction = sortDirection === 'asc' ? 'desc' : 'asc';
        }

        setSortKey(key);
        setSortDirection(direction);
        if (onSort) onSort(key, direction);
    };

    const handleSelectAll = (checked: boolean) => {
        const keys = checked ? data.map((row) => String(row[rowKey])) : [];
        setSelected(keys);
        if (onSelectionChange) onSelectionChange(keys);
    };

    const handleSelectRow = (key: string, checked: boolean) => {
        const newSelected = checked
            ? [...selected, key]
            : selected.filter((k) => k !== key);
        setSelected(newSelected);
        if (onSelectionChange) onSelectionChange(newSelected);
    };

    const clearFilters = () => {
        setFilterValues({});
        setShowFilters(false);
        if (onFilterChange) onFilterChange({});
    };

    // ============================================
    // COMPUTED VALUES
    // ============================================

    const totalPages = Math.ceil(totalItems / pageSize) || 1;
    const pageNumbers = getPageNumbers(currentPage, totalPages);
    const hasActiveFilters = Object.keys(filterValues).length > 0 || searchTerm;

    // Get sort indicator
    const getSortIndicator = (key: string) => {
        if (!sortable || sortKey !== key) return null;
        return sortDirection === 'asc' ? (
            <ChevronUp className="h-3 w-3" />
        ) : (
            <ChevronDown className="h-3 w-3" />
        );
    };

    // Check if all rows are selected
    const allSelected =
        data.length > 0 &&
        data.every((row) => selected.includes(String(row[rowKey])));
    const someSelected = data.some((row) =>
        selected.includes(String(row[rowKey])),
    );

    // Format currency helper
    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-ZM', {
            style: 'currency',
            currency: 'ZMW',
            minimumFractionDigits: 2,
        }).format(amount);
    };

    // Format date helper
    const formatDate = (date: string) => {
        return new Date(date).toLocaleDateString('en-ZM', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
        });
    };

    // ============================================
    // RENDER FUNCTIONS
    // ============================================

    const renderHeader = () => (
        <thead
            className={`bg-slate-50 dark:bg-slate-800/50 ${stickyHeader ? 'sticky top-0 z-10' : ''}`}
        >
            <tr>
                {selectable && (
                    <th className="w-10 px-4 py-3">
                        <input
                            type="checkbox"
                            checked={allSelected}
                            ref={(input) => {
                                if (input) {
                                    input.indeterminate =
                                        someSelected && !allSelected;
                                }
                            }}
                            onChange={(e) => handleSelectAll(e.target.checked)}
                            className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                        />
                    </th>
                )}
                {columns.map((col) => (
                    <th
                        key={col.key}
                        className={`px-4 py-3 text-left text-xs font-medium tracking-wider text-slate-500 uppercase dark:text-slate-400 ${
                            col.align === 'right'
                                ? 'text-right'
                                : col.align === 'center'
                                  ? 'text-center'
                                  : 'text-left'
                        } ${col.className || ''}`}
                        style={{ width: col.width }}
                    >
                        <div className="flex items-center gap-1">
                            <span>{col.header}</span>
                            {col.sortable && sortable && (
                                <button
                                    onClick={() => handleSort(col.key)}
                                    className="ml-1 rounded p-0.5 hover:bg-slate-200 dark:hover:bg-slate-700"
                                >
                                    {getSortIndicator(col.key) || (
                                        <ChevronDown className="h-3 w-3 opacity-30" />
                                    )}
                                </button>
                            )}
                        </div>
                    </th>
                ))}
                {actions.length > 0 && (
                    <th className="px-4 py-3 text-center text-xs font-medium tracking-wider text-slate-500 uppercase dark:text-slate-400">
                        Actions
                    </th>
                )}
            </tr>
        </thead>
    );

    const renderRow = (row: T, index: number) => {
        const rowKeyValue = String(row[rowKey]);
        const isSelected = selected.includes(rowKeyValue);

        return (
            <tr
                key={rowKeyValue}
                className={` ${striped && index % 2 === 0 ? 'bg-white dark:bg-slate-800' : 'bg-slate-50/50 dark:bg-slate-800/50'} ${hoverable ? 'hover:bg-slate-100 dark:hover:bg-slate-700/50' : ''} ${typeof rowClassName === 'function' ? rowClassName(row) : rowClassName || ''} transition-colors`}
            >
                {selectable && (
                    <td className="w-10 px-4 py-3">
                        <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={(e) =>
                                handleSelectRow(rowKeyValue, e.target.checked)
                            }
                            className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                        />
                    </td>
                )}
                {columns.map((col) => {
                    let content: React.ReactNode;

                    if (col.accessor) {
                        content = col.accessor(row);
                    } else {
                        const value = row[col.key];
                        content =
                            value !== undefined && value !== null
                                ? String(value)
                                : '—';
                    }

                    return (
                        <td
                            key={col.key}
                            className={`px-4 py-3 text-sm ${
                                col.align === 'right'
                                    ? 'text-right'
                                    : col.align === 'center'
                                      ? 'text-center'
                                      : 'text-left'
                            } ${compact ? 'py-2' : 'py-3'} ${col.className || ''}`}
                        >
                            {content}
                        </td>
                    );
                })}
                {actions.length > 0 && (
                    <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-1">
                            {actions.map((action, idx) => {
                                if (
                                    action.condition &&
                                    !action.condition(row)
                                ) {
                                    return null;
                                }
                                const isDisabled = action.disabled
                                    ? action.disabled(row)
                                    : false;

                                return (
                                    <button
                                        key={idx}
                                        onClick={() =>
                                            !isDisabled && action.onClick(row)
                                        }
                                        disabled={isDisabled}
                                        className={`rounded p-1.5 transition-colors ${
                                            isDisabled
                                                ? 'cursor-not-allowed opacity-50'
                                                : action.color
                                                  ? action.color
                                                  : 'text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-700'
                                        }`}
                                        title={action.tooltip || action.label}
                                    >
                                        {action.icon || action.label}
                                    </button>
                                );
                            })}
                        </div>
                    </td>
                )}
            </tr>
        );
    };

    const renderPagination = () => (
        <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="text-sm text-slate-500 dark:text-slate-400">
                Showing {data.length > 0 ? (currentPage - 1) * pageSize + 1 : 0}{' '}
                to {Math.min(currentPage * pageSize, totalItems)} of{' '}
                {totalItems} entries
            </div>

            <div className="flex items-center gap-2">
                <button
                    onClick={() => handlePageChange(1)}
                    disabled={currentPage === 1}
                    className="rounded-lg border border-slate-300 p-2 text-slate-600 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-600 dark:text-slate-400 dark:hover:bg-slate-700"
                >
                    <ChevronsLeft className="h-4 w-4" />
                </button>
                <button
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="rounded-lg border border-slate-300 p-2 text-slate-600 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-600 dark:text-slate-400 dark:hover:bg-slate-700"
                >
                    <ChevronLeft className="h-4 w-4" />
                </button>

                {pageNumbers.map((page, index) =>
                    typeof page === 'number' ? (
                        <button
                            key={index}
                            onClick={() => handlePageChange(page)}
                            className={`min-w-[36px] rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                                page === currentPage
                                    ? 'bg-blue-600 text-white'
                                    : 'text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700'
                            }`}
                        >
                            {page}
                        </button>
                    ) : (
                        <span
                            key={index}
                            className="px-2 text-slate-400 dark:text-slate-600"
                        >
                            {page}
                        </span>
                    ),
                )}

                <button
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className="rounded-lg border border-slate-300 p-2 text-slate-600 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-600 dark:text-slate-400 dark:hover:bg-slate-700"
                >
                    <ChevronRight className="h-4 w-4" />
                </button>
                <button
                    onClick={() => handlePageChange(totalPages)}
                    disabled={currentPage === totalPages}
                    className="rounded-lg border border-slate-300 p-2 text-slate-600 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-600 dark:text-slate-400 dark:hover:bg-slate-700"
                >
                    <ChevronsRight className="h-4 w-4" />
                </button>
            </div>
        </div>
    );

    // ============================================
    // MAIN RENDER
    // ============================================

    return (
        <div className={`space-y-4 ${className}`}>
            {/* ============================================ */}
            {/* TOOLBAR */}
            {/* ============================================ */}

            <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex min-w-[200px] flex-1 items-center gap-2">
                    {searchable && (
                        <div className="relative max-w-md flex-1">
                            <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
                            <input
                                type="text"
                                placeholder={searchPlaceholder}
                                value={searchTerm}
                                onChange={(e) => handleSearch(e.target.value)}
                                className="w-full rounded-lg border border-slate-300 py-2 pr-4 pl-9 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none dark:border-slate-600 dark:bg-slate-700 dark:focus:ring-blue-500/20"
                            />
                            {searchTerm && (
                                <button
                                    onClick={() => handleSearch('')}
                                    className="absolute top-1/2 right-3 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                                >
                                    <X className="h-4 w-4" />
                                </button>
                            )}
                        </div>
                    )}

                    {filterable && filters.length > 0 && (
                        <button
                            onClick={() => setShowFilters(!showFilters)}
                            className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors ${
                                hasActiveFilters
                                    ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                                    : 'border border-slate-300 text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-700'
                            }`}
                        >
                            <Filter className="h-4 w-4" />
                            Filters
                            {hasActiveFilters && (
                                <span className="ml-1 flex h-5 w-5 items-center justify-center rounded-full bg-blue-600 text-xs text-white">
                                    {Object.keys(filterValues).length +
                                        (searchTerm ? 1 : 0)}
                                </span>
                            )}
                        </button>
                    )}

                    {onRefresh && (
                        <button
                            onClick={onRefresh}
                            className="rounded-lg border border-slate-300 p-2 text-slate-600 transition-colors hover:bg-slate-50 dark:border-slate-600 dark:text-slate-400 dark:hover:bg-slate-700"
                            disabled={loading}
                        >
                            <RefreshCw
                                className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`}
                            />
                        </button>
                    )}
                </div>

                <div className="flex items-center gap-2">
                    {onExport && (
                        <button
                            onClick={onExport}
                            className="flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700 transition-colors hover:bg-slate-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-700"
                        >
                            <Download className="h-4 w-4" />
                            Export
                        </button>
                    )}
                    {onPrint && (
                        <button
                            onClick={onPrint}
                            className="flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700 transition-colors hover:bg-slate-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-700"
                        >
                            <Printer className="h-4 w-4" />
                            Print
                        </button>
                    )}

                    <select
                        value={pageSize}
                        onChange={handlePageSizeChange}
                        className="rounded-lg border border-slate-300 px-2 py-2 text-sm dark:border-slate-600 dark:bg-slate-700"
                    >
                        {pageSizeOptions.map((size) => (
                            <option key={size} value={size}>
                                {size} rows
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            {/* ============================================ */}
            {/* FILTER PANEL */}
            {/* ============================================ */}

            {showFilters && filterable && filters.length > 0 && (
                <div className="rounded-lg border border-slate-200 p-4 dark:border-slate-700">
                    <div
                        className={`grid gap-4 ${
                            filters.length <= 2
                                ? 'grid-cols-1 sm:grid-cols-2'
                                : filters.length <= 3
                                  ? 'grid-cols-1 sm:grid-cols-3'
                                  : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4'
                        }`}
                    >
                        {filters.map((filter) => (
                            <div key={filter.key}>
                                <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
                                    {filter.label}
                                </label>
                                {filter.type === 'text' && (
                                    <input
                                        type="text"
                                        value={filterValues[filter.key] || ''}
                                        onChange={(e) =>
                                            handleFilterChange(
                                                filter.key,
                                                e.target.value,
                                            )
                                        }
                                        placeholder={filter.placeholder}
                                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-700"
                                    />
                                )}
                                {filter.type === 'select' && filter.options && (
                                    <select
                                        value={filterValues[filter.key] || ''}
                                        onChange={(e) =>
                                            handleFilterChange(
                                                filter.key,
                                                e.target.value,
                                            )
                                        }
                                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-700"
                                    >
                                        <option value="">All</option>
                                        {filter.options.map((opt) => (
                                            <option
                                                key={opt.value}
                                                value={opt.value}
                                            >
                                                {opt.label}
                                            </option>
                                        ))}
                                    </select>
                                )}
                                {filter.type === 'date' && (
                                    <input
                                        type="date"
                                        value={filterValues[filter.key] || ''}
                                        onChange={(e) =>
                                            handleFilterChange(
                                                filter.key,
                                                e.target.value,
                                            )
                                        }
                                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-700"
                                    />
                                )}
                                {filter.type === 'dateRange' && (
                                    <div className="flex gap-2">
                                        <input
                                            type="date"
                                            value={
                                                filterValues[
                                                    `${filter.key}_from`
                                                ] || ''
                                            }
                                            onChange={(e) =>
                                                handleFilterChange(
                                                    `${filter.key}_from`,
                                                    e.target.value,
                                                )
                                            }
                                            className="w-1/2 rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-700"
                                        />
                                        <input
                                            type="date"
                                            value={
                                                filterValues[
                                                    `${filter.key}_to`
                                                ] || ''
                                            }
                                            onChange={(e) =>
                                                handleFilterChange(
                                                    `${filter.key}_to`,
                                                    e.target.value,
                                                )
                                            }
                                            className="w-1/2 rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-700"
                                        />
                                    </div>
                                )}
                                {filter.type === 'boolean' && (
                                    <select
                                        value={filterValues[filter.key] || ''}
                                        onChange={(e) =>
                                            handleFilterChange(
                                                filter.key,
                                                e.target.value,
                                            )
                                        }
                                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-700"
                                    >
                                        <option value="">All</option>
                                        <option value="true">Yes</option>
                                        <option value="false">No</option>
                                    </select>
                                )}
                            </div>
                        ))}
                    </div>
                    <div className="mt-4 flex gap-2">
                        <button
                            onClick={clearFilters}
                            className="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-700 transition-colors hover:bg-slate-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-700"
                        >
                            Clear All
                        </button>
                        <button
                            onClick={() => setShowFilters(false)}
                            className="rounded-lg bg-blue-600 px-4 py-2 text-sm text-white transition-colors hover:bg-blue-700"
                        >
                            Apply Filters
                        </button>
                    </div>
                </div>
            )}

            {/* ============================================ */}
            {/* TABLE */}
            {/* ============================================ */}

            <div
                className={`overflow-hidden rounded-xl border ${
                    bordered
                        ? 'border-slate-200 dark:border-slate-700'
                        : 'border-0'
                }`}
            >
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
                        {renderHeader()}
                        <tbody className="divide-y divide-slate-200 bg-white dark:divide-slate-700 dark:bg-slate-800">
                            {loading ? (
                                <tr>
                                    <td
                                        colSpan={
                                            columns.length +
                                            (selectable ? 1 : 0) +
                                            (actions.length > 0 ? 1 : 0)
                                        }
                                        className="px-4 py-8 text-center"
                                    >
                                        {renderLoading ? (
                                            renderLoading()
                                        ) : (
                                            <div className="flex flex-col items-center gap-2">
                                                <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
                                                <p className="text-sm text-slate-500 dark:text-slate-400">
                                                    {loadingMessage}
                                                </p>
                                            </div>
                                        )}
                                    </td>
                                </tr>
                            ) : data.length === 0 ? (
                                <tr>
                                    <td
                                        colSpan={
                                            columns.length +
                                            (selectable ? 1 : 0) +
                                            (actions.length > 0 ? 1 : 0)
                                        }
                                        className="px-4 py-8 text-center"
                                    >
                                        {renderEmpty ? (
                                            renderEmpty()
                                        ) : (
                                            <div className="flex flex-col items-center gap-2">
                                                <FileText className="h-12 w-12 text-slate-300 dark:text-slate-600" />
                                                <p className="text-sm text-slate-500 dark:text-slate-400">
                                                    {emptyMessage}
                                                </p>
                                            </div>
                                        )}
                                    </td>
                                </tr>
                            ) : (
                                data.map((row, index) => renderRow(row, index))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* ============================================ */}
            {/* PAGINATION */}
            {/* ============================================ */}

            {totalItems > 0 && renderPagination()}
        </div>
    );
}
