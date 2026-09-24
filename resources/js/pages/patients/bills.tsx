// pages/patients/bills.tsx

import { usePage, router } from '@inertiajs/react';
import {
    FileText,
    AlertCircle,
    CheckCircle,
    Clock,
    XCircle,
    Eye,
    Printer,
    Receipt,
    RefreshCw,
} from 'lucide-react';
import { useState, useEffect, useMemo } from 'react';
import PageHeader from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import type { Column, Action } from '@/components/ReusableTable';
import ReusableTable from '@/components/ReusableTable';
import PatientLayout from '@/layouts/patients/PatientLayout';

// ============================================================================
// Types
// ============================================================================

interface InvoiceItem {
    drug_id?: number | null;
    name: string;
    description?: string | null;
    quantity: number;
    price: number;
    total: number;
}

interface Invoice {
    id: number;
    invoice_number: string;
    status: 'paid' | 'unpaid' | 'draft' | 'cancelled' | 'partial';
    payment_scheme: string;
    issue_date: string;
    due_date: string;
    items: InvoiceItem[];
    total: number;
    due_amount: number;
    items_count: number;
    prescription_id?: number | null;
    created_at: string;
    updated_at: string;
}

interface BillsPageProps {
    invoices: Invoice[];
    patient?: {
        id: number;
        name: string;
        first_name?: string;
        last_name?: string;
    };
    error?: string;
}

// ============================================================================
// Status Badge Component
// ============================================================================

const InvoiceStatusBadge: React.FC<{ status: Invoice['status'] }> = ({
    status,
}) => {
    const config = {
        paid: {
            icon: <CheckCircle className="h-3 w-3" />,
            label: 'Paid',
            bg: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400',
            border: 'border-emerald-200 dark:border-emerald-800',
        },
        unpaid: {
            icon: <AlertCircle className="h-3 w-3" />,
            label: 'Unpaid',
            bg: 'bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400',
            border: 'border-red-200 dark:border-red-800',
        },
        partial: {
            icon: <Clock className="h-3 w-3" />,
            label: 'Partial',
            bg: 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400',
            border: 'border-amber-200 dark:border-amber-800',
        },
        draft: {
            icon: <FileText className="h-3 w-3" />,
            label: 'Draft',
            bg: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400',
            border: 'border-slate-200 dark:border-slate-700',
        },
        cancelled: {
            icon: <XCircle className="h-3 w-3" />,
            label: 'Cancelled',
            bg: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400',
            border: 'border-gray-200 dark:border-gray-700',
        },
    };

    const { icon, label, bg, border } = config[status] || config.draft;

    return (
        <span
            className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium ${bg} ${border}`}
        >
            {icon}
            {label}
        </span>
    );
};

// ============================================================================
// Currency & Date Helpers
// ============================================================================

const formatCurrency = (amount: number) => {
    return `ZMW ${amount.toLocaleString('en-ZM', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    })}`;
};

const formatDate = (dateStr: string, long = false) => {
    try {
        const date = new Date(dateStr);
        return date.toLocaleDateString(
            'en-US',
            long
                ? {
                      weekday: 'short',
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                  }
                : {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                  },
        );
    } catch {
        return dateStr;
    }
};

// ============================================================================
// Invoice Detail Modal
// ============================================================================

const InvoiceDetailModal = ({
    isOpen,
    onClose,
    invoice,
}: {
    isOpen: boolean;
    onClose: () => void;
    invoice: Invoice | null;
}) => {
    if (!isOpen || !invoice) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/50 p-4 backdrop-blur-sm">
            <div className="w-full max-w-3xl animate-in duration-200 fade-in zoom-in">
                <div className="rounded-xl bg-white shadow-2xl dark:bg-slate-800">
                    {/* Header */}
                    <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3 dark:border-slate-700">
                        <div className="flex items-center gap-3">
                            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900/30">
                                <Receipt className="h-4.5 w-4.5 text-blue-600 dark:text-blue-400" />
                            </div>
                            <div>
                                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">
                                    Invoice Details
                                </h3>
                                <p className="text-[10px] text-slate-500 dark:text-slate-400">
                                    {invoice.invoice_number}
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <button
                                onClick={() => window.print()}
                                className="rounded-lg p-1.5 text-slate-500 transition-colors hover:bg-slate-100 dark:hover:bg-slate-700"
                                title="Print"
                            >
                                <Printer className="h-4 w-4" />
                            </button>
                            <button
                                onClick={onClose}
                                className="rounded-lg p-1.5 text-slate-500 transition-colors hover:bg-slate-100 dark:hover:bg-slate-700"
                            >
                                <XCircle className="h-4 w-4" />
                            </button>
                        </div>
                    </div>

                    {/* Content */}
                    <div className="max-h-[calc(100vh-200px)] overflow-y-auto p-5">
                        {/* Summary Cards */}
                        <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
                            <div className="rounded-lg border border-slate-200 bg-slate-50 p-2 dark:border-slate-700 dark:bg-slate-800/50">
                                <div className="text-[8px] text-slate-500 uppercase dark:text-slate-400">
                                    Total
                                </div>
                                <p className="mt-0.5 text-sm font-bold text-slate-800 dark:text-slate-100">
                                    {formatCurrency(invoice.total)}
                                </p>
                            </div>
                            <div className="rounded-lg border border-slate-200 bg-slate-50 p-2 dark:border-slate-700 dark:bg-slate-800/50">
                                <div className="text-[8px] text-slate-500 uppercase dark:text-slate-400">
                                    Due
                                </div>
                                <p className="mt-0.5 text-sm font-bold text-amber-600 dark:text-amber-400">
                                    {formatCurrency(invoice.due_amount)}
                                </p>
                            </div>
                            <div className="rounded-lg border border-slate-200 bg-slate-50 p-2 dark:border-slate-700 dark:bg-slate-800/50">
                                <div className="text-[8px] text-slate-500 uppercase dark:text-slate-400">
                                    Payment
                                </div>
                                <p className="mt-0.5 text-sm font-medium text-slate-800 capitalize dark:text-slate-100">
                                    {invoice.payment_scheme}
                                </p>
                            </div>
                            <div className="rounded-lg border border-slate-200 bg-slate-50 p-2 dark:border-slate-700 dark:bg-slate-800/50">
                                <div className="text-[8px] text-slate-500 uppercase dark:text-slate-400">
                                    Due Date
                                </div>
                                <p className="mt-0.5 text-sm font-medium text-slate-800 dark:text-slate-100">
                                    {formatDate(invoice.due_date)}
                                </p>
                            </div>
                        </div>

                        {/* Items Table */}
                        <div className="rounded-lg border border-slate-200 dark:border-slate-700">
                            <div className="border-b border-slate-200 px-3 py-2 dark:border-slate-700">
                                <div className="flex items-center gap-1.5">
                                    <FileText className="h-3.5 w-3.5 text-slate-500" />
                                    <h4 className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                                        Invoice Items
                                    </h4>
                                    <span className="rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-600 dark:bg-slate-700 dark:text-slate-400">
                                        {invoice.items_count}
                                    </span>
                                </div>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead className="bg-slate-50 text-[8px] text-slate-600 uppercase dark:bg-slate-800/50 dark:text-slate-400">
                                        <tr>
                                            <th className="px-3 py-1.5 text-left">
                                                Item
                                            </th>
                                            <th className="px-3 py-1.5 text-center">
                                                Qty
                                            </th>
                                            <th className="px-3 py-1.5 text-right">
                                                Price
                                            </th>
                                            <th className="px-3 py-1.5 text-right">
                                                Total
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {invoice.items.map((item, idx) => (
                                            <tr
                                                key={idx}
                                                className="border-b border-slate-100 last:border-0 dark:border-slate-700/50"
                                            >
                                                <td className="px-3 py-1.5">
                                                    <div className="text-xs font-medium text-slate-800 dark:text-slate-200">
                                                        {item.name}
                                                    </div>
                                                    {item.description && (
                                                        <div className="text-[8px] text-slate-500 dark:text-slate-400">
                                                            {item.description}
                                                        </div>
                                                    )}
                                                </td>
                                                <td className="px-3 py-1.5 text-center">
                                                    <span className="inline-flex items-center justify-center rounded bg-slate-100 px-1.5 py-0.5 text-[9px] font-medium dark:bg-slate-700">
                                                        x{item.quantity}
                                                    </span>
                                                </td>
                                                <td className="px-3 py-1.5 text-right text-xs text-slate-600 dark:text-slate-400">
                                                    {formatCurrency(item.price)}
                                                </td>
                                                <td className="px-3 py-1.5 text-right text-xs font-medium text-slate-800 dark:text-slate-200">
                                                    {formatCurrency(item.total)}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                    <tfoot className="border-t border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800/50">
                                        <tr>
                                            <td
                                                colSpan={3}
                                                className="px-3 py-1.5 text-right text-xs font-medium text-slate-600 dark:text-slate-400"
                                            >
                                                Total
                                            </td>
                                            <td className="px-3 py-1.5 text-right text-sm font-bold text-slate-800 dark:text-slate-200">
                                                {formatCurrency(invoice.total)}
                                            </td>
                                        </tr>
                                    </tfoot>
                                </table>
                            </div>
                        </div>

                        {/* Status */}
                        <div className="mt-3 flex items-center gap-2">
                            <span className="text-xs text-slate-500 dark:text-slate-400">
                                Status:
                            </span>
                            <InvoiceStatusBadge status={invoice.status} />
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="flex justify-end gap-2 border-t border-slate-200 px-5 py-3 dark:border-slate-700">
                        <Button
                            variant="outline"
                            onClick={onClose}
                            className="text-xs"
                        >
                            Close
                        </Button>
                        <Button className="bg-blue-600 text-xs text-white hover:bg-blue-700">
                            <Printer className="mr-1 h-3.5 w-3.5" />
                            Print
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
};

// ============================================================================
// Main Bills Component
// ============================================================================

export default function Bills() {
    const { invoices, patient, error } = usePage<BillsPageProps>().props;

    const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(
        null,
    );
    const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

    const safeInvoices = useMemo(
        () => (Array.isArray(invoices) ? invoices : []),
        [invoices],
    );

    // Get patient name
    const patientName =
        patient?.name ||
        `${patient?.first_name || ''} ${patient?.last_name || ''}`.trim() ||
        'Patient';

    // ─── Table Columns ───────────────────────────────────────────────────────

    const columns: Column<Invoice>[] = [
        {
            id: 'invoice_number',
            label: 'Invoice',
            sortable: true,
            format: (value) => (
                <span className="font-mono text-[11px] font-medium text-slate-700 dark:text-slate-300">
                    {value}
                </span>
            ),
        },
        {
            id: 'items',
            label: 'Items',
            sortable: false,
            format: (_, row) => {
                const names = (row.items || []).map((it) => it.name);
                const total = row.items_count || names.length;
                return (
                    <div className="space-y-0.5">
                        {names.slice(0, 2).map((name, idx) => (
                            <div
                                key={idx}
                                className="text-[11px] text-slate-700 dark:text-slate-300"
                            >
                                {name}
                            </div>
                        ))}
                        {total > 2 && (
                            <div className="text-[10px] text-slate-400">
                                +{total - 2} more
                            </div>
                        )}
                        <div className="pt-0.5">
                            <span className="inline-flex items-center rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-600 dark:bg-slate-700 dark:text-slate-400">
                                {total} {total === 1 ? 'item' : 'items'}
                            </span>
                        </div>
                    </div>
                );
            },
        },
        {
            id: 'total',
            label: 'Total',
            sortable: true,
            format: (value) => (
                <span className="text-[11px] font-semibold text-slate-800 tabular-nums dark:text-slate-200">
                    {formatCurrency(value)}
                </span>
            ),
        },
        {
            id: 'due_amount',
            label: 'Due',
            sortable: true,
            format: (value) => (
                <span
                    className={`text-[11px] font-semibold tabular-nums ${
                        value > 0
                            ? 'text-amber-600 dark:text-amber-400'
                            : 'text-slate-400 dark:text-slate-500'
                    }`}
                >
                    {formatCurrency(value)}
                </span>
            ),
        },
        {
            id: 'payment_scheme',
            label: 'Scheme',
            sortable: true,
            format: (value) => (
                <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-600 capitalize dark:bg-slate-700 dark:text-slate-400">
                    {value || '—'}
                </span>
            ),
        },
        {
            id: 'status',
            label: 'Status',
            sortable: true,
            filterable: true,
            filterType: 'status',
            format: (value) => <InvoiceStatusBadge status={value} />,
        },
        {
            id: 'issue_date',
            label: 'Date',
            sortable: true,
            format: (value) => (
                <span className="text-[11px] text-slate-500 dark:text-slate-400">
                    {formatDate(value)}
                </span>
            ),
        },
    ];

    // ─── Table Actions ───────────────────────────────────────────────────────

    const actions: Action<Invoice>[] = [
        {
            label: 'View',
            icon: <Eye size={16} />,
            color: 'info',
            onClick: (row) => {
                setSelectedInvoice(row);
                setIsDetailModalOpen(true);
            },
        },
    ];

    // ─── Error state ─────────────────────────────────────────────────────────

    if (error) {
        return (
            <PatientLayout
                breadcrumbs={[
                    { title: 'Patient', href: '/' },
                    { title: 'Bills', href: '/' },
                ]}
            >
                <div className="space-y-6 p-6">
                    <div className="rounded-md bg-red-50 p-4 dark:bg-red-950/30">
                        <div className="flex">
                            <AlertCircle className="h-5 w-5 text-red-400" />
                            <div className="ml-3">
                                <h3 className="text-sm font-medium text-red-800 dark:text-red-400">
                                    Error loading bills
                                </h3>
                                <div className="mt-2 text-sm text-red-700 dark:text-red-300">
                                    <p>{error}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </PatientLayout>
        );
    }

    // ─── Render ──────────────────────────────────────────────────────────────

    return (
        <PatientLayout
            breadcrumbs={[
                { title: 'Patient', href: '/' },
                { title: 'Bills', href: '/' },
            ]}
        >
            <div className="h-full space-y-6 bg-blue-50 p-2">
                <PageHeader
                    icon={<Receipt className="h-6 w-6" />}
                    title="Patient Bills"
                    subtitle={`${patientName} • ${safeInvoices.length} invoice${
                        safeInvoices.length !== 1 ? 's' : ''
                    }`}
                    actions={[
                        {
                            label: 'Refresh',
                            onClick: () => router.reload(),
                        },
                    ]}
                />

                <ReusableTable
                    title="Invoices"
                    columns={columns}
                    data={safeInvoices}
                    actions={actions}
                    loading={false}
                    filterPlaceholder="Search by invoice # or item name..."
                    statusFilterKey="status"
                    statusOptions={[
                        { value: 'paid', label: 'Paid' },
                        { value: 'unpaid', label: 'Unpaid' },
                        { value: 'partial', label: 'Partial' },
                        { value: 'draft', label: 'Draft' },
                        { value: 'cancelled', label: 'Cancelled' },
                    ]}
                    rowsPerPageOptions={[8, 15, 25, 50]}
                    defaultRowsPerPage={8}
                    defaultOrderBy="issue_date"
                    emptyMessage="No invoices available for this patient"
                />

                <InvoiceDetailModal
                    isOpen={isDetailModalOpen}
                    onClose={() => {
                        setIsDetailModalOpen(false);
                        setSelectedInvoice(null);
                    }}
                    invoice={selectedInvoice}
                />
            </div>
        </PatientLayout>
    );
}
