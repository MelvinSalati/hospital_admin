// components/payments/InvoicesTable.tsx

import { Eye, DollarSign } from 'lucide-react';
import { useMemo } from 'react';
import type { Column, Action } from '@/components/ReusableTable';
import ReusableTable from '@/components/ReusableTable';
import StatusBadge from './StatusBadge';

interface Invoice {
    id: number;
    invoice_number: string;
    created_at: string;
    due_date: string;
    total: number;
    amount?: number;
    status: string;
    paid_amount?: number;
    due_amount?: number;
    items?: any[];
    [key: string]: any;
}

interface InvoicesTableProps {
    invoices: Invoice[];
    onPay: (invoice: Invoice) => void;
    onView: (invoice: Invoice) => void;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const formatCurrency = (amount: any): string => {
    if (amount === null || amount === undefined) return 'ZMW 0.00';
    const num = typeof amount === 'string' ? parseFloat(amount) : amount;
    if (isNaN(num)) return 'ZMW 0.00';
    return `ZMW ${num.toLocaleString('en-ZM', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    })}`;
};

const formatDate = (dateStr?: string): string => {
    if (!dateStr) return '—';
    try {
        return new Date(dateStr).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
        });
    } catch {
        return dateStr;
    }
};

const getInvoiceTotal = (invoice: Invoice): number => {
    if (invoice.total !== undefined && invoice.total !== null)
        return invoice.total;
    if (invoice.amount !== undefined && invoice.amount !== null)
        return invoice.amount;
    return 0;
};

const getInvoiceDue = (invoice: Invoice): number => {
    if (invoice.due_amount !== undefined && invoice.due_amount !== null)
        return invoice.due_amount;
    const total = getInvoiceTotal(invoice);
    const paid = invoice.paid_amount || 0;
    return total - paid;
};

const isOverdue = (invoice: Invoice): boolean => {
    if (!invoice.due_date) return false;
    if (invoice.status === 'paid' || invoice.status === 'cancelled')
        return false;
    return new Date(invoice.due_date) < new Date();
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function InvoicesTable({
    invoices,
    onPay,
    onView,
}: InvoicesTableProps) {
    const safeInvoices = useMemo(
        () => (Array.isArray(invoices) ? invoices : []),
        [invoices],
    );

    // ─── Columns ─────────────────────────────────────────────────────────────

    const columns: Column<Invoice>[] = useMemo(
        () => [
            {
                id: 'invoice_number',
                label: 'Invoice',
                sortable: true,
                format: (value) => (
                    <span className="font-mono text-[9px] font-medium text-slate-700 dark:text-slate-300">
                        {value || 'N/A'}
                    </span>
                ),
            },
            {
                id: 'created_at',
                label: 'Date',
                sortable: true,
                format: (value) => (
                    <span className="text-[9px] text-slate-500 dark:text-slate-400">
                        {formatDate(value)}
                    </span>
                ),
            },
            {
                id: 'due_date',
                label: 'Due',
                sortable: true,
                format: (value, row) => {
                    const overdue = isOverdue(row);
                    return (
                        <span
                            className={`text-[9px] ${
                                overdue
                                    ? 'font-medium text-red-600 dark:text-red-400'
                                    : 'text-slate-500 dark:text-slate-400'
                            }`}
                        >
                            {formatDate(value)}
                        </span>
                    );
                },
            },
            {
                id: 'total',
                label: 'Amount',
                sortable: true,
                format: (_value, row) => (
                    <span className="text-[10px] font-semibold text-slate-800 tabular-nums dark:text-slate-200">
                        {formatCurrency(getInvoiceTotal(row))}
                    </span>
                ),
            },
            {
                id: 'due_amount',
                label: 'Due',
                sortable: true,
                format: (_value, row) => (
                    <span className="text-[10px] font-medium text-amber-600 tabular-nums dark:text-amber-400">
                        {formatCurrency(getInvoiceDue(row))}
                    </span>
                ),
            },
            {
                id: 'status',
                label: 'Status',
                sortable: true,
                filterable: true,
                filterType: 'status',
                format: (value) => <StatusBadge status={value} />,
            },
        ],
        [],
    );

    // ─── Actions ─────────────────────────────────────────────────────────────

    const actions: Action<Invoice>[] = useMemo(
        () => [
            {
                label: 'View',
                icon: <Eye size={14} />,
                color: 'info',
                onClick: (row) => onView(row),
            },
            {
                label: 'Pay',
                icon: <DollarSign size={14} />,
                color: 'success',
                show: (row) => {
                    const due = getInvoiceDue(row);
                    return (
                        row.status !== 'paid' &&
                        row.status !== 'cancelled' &&
                        due > 0
                    );
                },
                onClick: (row) => onPay(row),
            },
        ],
        [onPay, onView],
    );

    // ─── Render ──────────────────────────────────────────────────────────────

    return (
        <ReusableTable
            title="Invoices"
            columns={columns}
            data={safeInvoices}
            actions={actions}
            loading={false}
            filterPlaceholder="Search invoices..."
            statusFilterKey="status"
            statusOptions={[
                { value: 'draft', label: 'Draft' },
                { value: 'sent', label: 'Sent' },
                { value: 'pending', label: 'Pending' },
                { value: 'partial', label: 'Partial' },
                { value: 'paid', label: 'Paid' },
                { value: 'cancelled', label: 'Cancelled' },
            ]}
            rowsPerPageOptions={[5, 10, 25, 50]}
            defaultRowsPerPage={5}
            defaultOrderBy="created_at"
            emptyMessage="No invoices found"
            onRowClick={(row) => onView(row)}
            className="border-0 shadow-none"
        />
    );
}
