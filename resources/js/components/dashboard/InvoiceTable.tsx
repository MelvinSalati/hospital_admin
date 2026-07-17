// ============================================================
// InvoiceTable — Filterable, paginated invoice management table
// ============================================================
import { useState } from 'react';
import { Eye, FileText, ChevronLeft, ChevronRight } from 'lucide-react';
import { InvoiceDetailsModal } from './InvoiceDetailsModal';
import type { Invoice, PaginatedInvoices } from '../../types';

interface InvoiceTableProps {
    invoices: PaginatedInvoices;
    onPageChange?: (page: number) => void;
    loading?: boolean;
}

type FilterStatus = 'all' | 'paid' | 'unpaid' | 'partial';

const statusStyles: Record<string, string> = {
    paid: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400 dark:ring-emerald-800',
    unpaid: 'bg-red-50 text-red-700 ring-1 ring-red-200 dark:bg-red-900/20 dark:text-red-400 dark:ring-red-800',
    partial:
        'bg-amber-50 text-amber-700 ring-1 ring-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:ring-amber-800',
};

const FILTERS: { label: string; value: FilterStatus }[] = [
    { label: 'All', value: 'all' },
    { label: 'Paid', value: 'paid' },
    { label: 'Unpaid', value: 'unpaid' },
    { label: 'Partial', value: 'partial' },
];

function formatCurrency(v: number) {
    return `ZMW ${v.toLocaleString('en-ZM', { minimumFractionDigits: 2 })}`;
}

export function InvoiceTable({
    invoices,
    onPageChange,
    loading = false,
}: InvoiceTableProps) {
    const [activeFilter, setActiveFilter] = useState<FilterStatus>('all');
    const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(
        null,
    );

    const filtered =
        activeFilter === 'all'
            ? invoices.data
            : invoices.data.filter((inv) => inv.status === activeFilter);

    const counts: Record<FilterStatus, number> = {
        all: invoices.data.length,
        paid: invoices.data.filter((i) => i.status === 'paid').length,
        unpaid: invoices.data.filter((i) => i.status === 'unpaid').length,
        partial: invoices.data.filter((i) => i.status === 'partial').length,
    };

    return (
        <>
            <div className="rounded-lg border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800">
                {/* Table header */}
                <div className="flex flex-col gap-3 border-b border-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between dark:border-slate-700">
                    <div className="flex items-center gap-3">
                        <div className="rounded-md bg-slate-100 p-1.5 dark:bg-slate-700">
                            <FileText className="h-4 w-4 text-slate-500 dark:text-slate-400" />
                        </div>
                        <div>
                            <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                                Invoice Management
                            </h3>
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                                {invoices.total.toLocaleString()} invoices total
                            </p>
                        </div>
                    </div>

                    {/* Filter tabs */}
                    <div className="flex divide-x divide-slate-200 self-start overflow-hidden rounded-md border border-slate-200 dark:divide-slate-600 dark:border-slate-600">
                        {FILTERS.map((f) => (
                            <button
                                key={f.value}
                                onClick={() => setActiveFilter(f.value)}
                                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium transition-colors ${
                                    activeFilter === f.value
                                        ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900'
                                        : 'bg-white text-slate-500 hover:bg-slate-50 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700'
                                }`}
                            >
                                {f.label}
                                {counts[f.value] > 0 && (
                                    <span
                                        className={`rounded-full px-1.5 py-0.5 text-[10px] tabular-nums ${
                                            activeFilter === f.value
                                                ? 'bg-white/20 text-white dark:bg-slate-900/20 dark:text-slate-900'
                                                : 'bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400'
                                        }`}
                                    >
                                        {counts[f.value]}
                                    </span>
                                )}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Table */}
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-slate-100 dark:border-slate-700">
                                {[
                                    'Invoice #',
                                    'Patient',
                                    'Date',
                                    'Total',
                                    'Paid',
                                    'Balance',
                                    'Status',
                                    'Actions',
                                ].map((h) => (
                                    <th
                                        key={h}
                                        className="px-4 py-3 text-left text-[10px] font-semibold tracking-wider whitespace-nowrap text-slate-400 uppercase dark:text-slate-500"
                                    >
                                        {h}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50 dark:divide-slate-700/50">
                            {loading ? (
                                Array.from({ length: 5 }).map((_, i) => (
                                    <tr key={i}>
                                        {Array.from({ length: 8 }).map(
                                            (_, j) => (
                                                <td
                                                    key={j}
                                                    className="px-4 py-3"
                                                >
                                                    <div className="h-4 animate-pulse rounded bg-slate-100 dark:bg-slate-700" />
                                                </td>
                                            ),
                                        )}
                                    </tr>
                                ))
                            ) : filtered.length === 0 ? (
                                <tr>
                                    <td
                                        colSpan={8}
                                        className="px-4 py-12 text-center"
                                    >
                                        <FileText className="mx-auto mb-2 h-8 w-8 text-slate-300 dark:text-slate-600" />
                                        <p className="text-sm text-slate-500 dark:text-slate-400">
                                            No invoices match the current
                                            filter.
                                        </p>
                                    </td>
                                </tr>
                            ) : (
                                filtered.map((invoice) => (
                                    <tr
                                        key={invoice.id}
                                        className="transition-colors hover:bg-slate-50/70 dark:hover:bg-slate-700/30"
                                    >
                                        <td className="px-4 py-3 font-mono text-xs whitespace-nowrap text-slate-600 dark:text-slate-300">
                                            {invoice.invoiceNumber}
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className="text-xs font-medium text-slate-800 dark:text-slate-100">
                                                {invoice.patientName}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-xs whitespace-nowrap text-slate-500 dark:text-slate-400">
                                            {invoice.billDate}
                                        </td>
                                        <td className="px-4 py-3 text-xs font-medium whitespace-nowrap text-slate-800 tabular-nums dark:text-slate-100">
                                            {formatCurrency(
                                                invoice.totalAmount,
                                            )}
                                        </td>
                                        <td className="px-4 py-3 text-xs whitespace-nowrap text-emerald-600 tabular-nums dark:text-emerald-400">
                                            {formatCurrency(invoice.amountPaid)}
                                        </td>
                                        <td
                                            className={`px-4 py-3 text-xs font-medium whitespace-nowrap tabular-nums ${invoice.balance > 0 ? 'text-red-600 dark:text-red-400' : 'text-slate-500 dark:text-slate-400'}`}
                                        >
                                            {formatCurrency(invoice.balance)}
                                        </td>
                                        <td className="px-4 py-3 whitespace-nowrap">
                                            <span
                                                className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium capitalize ${statusStyles[invoice.status]}`}
                                            >
                                                {invoice.status}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 whitespace-nowrap">
                                            <div className="flex items-center gap-1">
                                                <button
                                                    onClick={() =>
                                                        setSelectedInvoice(
                                                            invoice,
                                                        )
                                                    }
                                                    className="inline-flex items-center gap-1 rounded px-2 py-1 text-[10px] font-medium text-slate-600 transition-colors hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700"
                                                    title="View invoice details"
                                                >
                                                    <Eye className="h-3 w-3" />
                                                    Details
                                                </button>
                                                <a
                                                    href={`/patients/bills/${invoice.patientId}`}
                                                    className="inline-flex items-center gap-1 rounded px-2 py-1 text-[10px] font-medium text-blue-600 transition-colors hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-900/20"
                                                    title="View patient bill"
                                                >
                                                    View Bill
                                                </a>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                <Pagination
                    currentPage={invoices.current_page}
                    lastPage={invoices.last_page}
                    from={invoices.from}
                    to={invoices.to}
                    total={invoices.total}
                    onPageChange={onPageChange}
                />
            </div>

            {/* Modal */}
            <InvoiceDetailsModal
                invoice={selectedInvoice}
                onClose={() => setSelectedInvoice(null)}
            />
        </>
    );
}

// ── Pagination sub-component ──────────────────────────────────
interface PaginationProps {
    currentPage: number;
    lastPage: number;
    from: number;
    to: number;
    total: number;
    onPageChange?: (page: number) => void;
}

function Pagination({
    currentPage,
    lastPage,
    from,
    to,
    total,
    onPageChange,
}: PaginationProps) {
    const pages = buildPageNumbers(currentPage, lastPage);

    return (
        <div className="flex flex-col gap-2 border-t border-slate-100 px-5 py-3 sm:flex-row sm:items-center sm:justify-between dark:border-slate-700">
            <p className="text-xs text-slate-500 dark:text-slate-400">
                Showing{' '}
                <span className="font-medium text-slate-700 dark:text-slate-200">
                    {from}–{to}
                </span>{' '}
                of{' '}
                <span className="font-medium text-slate-700 dark:text-slate-200">
                    {total.toLocaleString()}
                </span>{' '}
                invoices
            </p>

            <div className="flex items-center gap-1">
                <button
                    disabled={currentPage <= 1}
                    onClick={() => onPageChange?.(currentPage - 1)}
                    className="rounded p-1.5 text-slate-500 transition-colors hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-30 dark:hover:bg-slate-700"
                    aria-label="Previous page"
                >
                    <ChevronLeft className="h-4 w-4" />
                </button>

                {pages.map((p, i) =>
                    p === '…' ? (
                        <span
                            key={`ellipsis-${i}`}
                            className="px-2 text-xs text-slate-400"
                        >
                            …
                        </span>
                    ) : (
                        <button
                            key={p}
                            onClick={() => onPageChange?.(p as number)}
                            className={`min-w-[28px] rounded px-2 py-1 text-xs font-medium transition-colors ${
                                p === currentPage
                                    ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900'
                                    : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700'
                            }`}
                        >
                            {p}
                        </button>
                    ),
                )}

                <button
                    disabled={currentPage >= lastPage}
                    onClick={() => onPageChange?.(currentPage + 1)}
                    className="rounded p-1.5 text-slate-500 transition-colors hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-30 dark:hover:bg-slate-700"
                    aria-label="Next page"
                >
                    <ChevronRight className="h-4 w-4" />
                </button>
            </div>
        </div>
    );
}

function buildPageNumbers(current: number, last: number): (number | '…')[] {
    if (last <= 7) return Array.from({ length: last }, (_, i) => i + 1);
    const pages: (number | '…')[] = [1];
    if (current > 3) pages.push('…');
    for (
        let p = Math.max(2, current - 1);
        p <= Math.min(last - 1, current + 1);
        p++
    ) {
        pages.push(p);
    }
    if (current < last - 2) pages.push('…');
    pages.push(last);
    return pages;
}
