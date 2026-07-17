// components/payments/InvoicesTable.tsx

import { useState } from 'react';
import {
    Search,
    Eye,
    DollarSign,
    FileText,
    AlertCircle,
    Clock,
    CheckCircle,
    XCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
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

export default function InvoicesTable({
    invoices,
    onPay,
    onView,
}: InvoicesTableProps) {
    const [searchTerm, setSearchTerm] = useState('');
    const [filterStatus, setFilterStatus] = useState('all');

    const safeInvoices = Array.isArray(invoices) ? invoices : [];

    const filtered = safeInvoices.filter((inv) => {
        const matchSearch =
            inv.invoice_number
                ?.toLowerCase()
                .includes(searchTerm.toLowerCase()) || false;
        const matchStatus =
            filterStatus === 'all' || inv.status === filterStatus;
        return matchSearch && matchStatus;
    });

    const formatCurrency = (amount: any) => {
        if (amount === null || amount === undefined || isNaN(amount))
            return 'ZMW 0.00';
        const numAmount =
            typeof amount === 'string' ? parseFloat(amount) : amount;
        if (isNaN(numAmount)) return 'ZMW 0.00';
        return `ZMW ${numAmount.toLocaleString('en-ZM', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    };

    const formatDate = (dateStr: string) => {
        if (!dateStr) return '—';
        try {
            const date = new Date(dateStr);
            return date.toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
            });
        } catch {
            return dateStr;
        }
    };

    const getInvoiceTotal = (invoice: Invoice) => {
        if (invoice.total !== undefined && invoice.total !== null)
            return invoice.total;
        if (invoice.amount !== undefined && invoice.amount !== null)
            return invoice.amount;
        return 0;
    };

    const getInvoiceDue = (invoice: Invoice) => {
        if (invoice.due_amount !== undefined && invoice.due_amount !== null)
            return invoice.due_amount;
        const total = getInvoiceTotal(invoice);
        const paid = invoice.paid_amount || 0;
        return total - paid;
    };

    const isOverdue = (invoice: Invoice) => {
        if (!invoice.due_date) return false;
        if (invoice.status === 'paid' || invoice.status === 'cancelled')
            return false;
        return new Date(invoice.due_date) < new Date();
    };

    return (
        <div className="rounded-lg border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800/90">
            {/* Compact Header */}
            <div className="flex flex-wrap items-center justify-between gap-1.5 border-b border-slate-200 px-3 py-1.5 dark:border-slate-700">
                <div className="flex items-center gap-2">
                    <div className="relative">
                        <Search className="absolute top-1/2 left-2 h-3 w-3 -translate-y-1/2 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Search..."
                            className="h-7 w-36 rounded-lg border border-slate-200 pr-2 pl-7 text-[10px] focus:border-blue-400 focus:ring-1 focus:ring-blue-400 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <select
                        value={filterStatus}
                        onChange={(e) => setFilterStatus(e.target.value)}
                        className="h-7 rounded-lg border border-slate-200 px-1.5 text-[9px] focus:border-blue-400 focus:ring-1 focus:ring-blue-400 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                    >
                        <option value="all">All</option>
                        <option value="draft">Draft</option>
                        <option value="sent">Sent</option>
                        <option value="pending">Pending</option>
                        <option value="overdue">Overdue</option>
                        <option value="partial">Partial</option>
                        <option value="paid">Paid</option>
                        <option value="cancelled">Cancelled</option>
                    </select>
                </div>
                <div className="flex items-center gap-2 text-[9px] text-slate-500 dark:text-slate-400">
                    <span>
                        {filtered.length} of {safeInvoices.length}
                    </span>
                </div>
            </div>

            {/* Compact Table */}
            <div className="overflow-x-auto">
                <table className="w-full">
                    <thead className="border-b border-slate-200 bg-slate-50 text-[8px] text-slate-600 uppercase dark:border-slate-700 dark:bg-slate-800/50 dark:text-slate-400">
                        <tr>
                            <th className="px-2 py-1 text-left">Invoice</th>
                            <th className="px-2 py-1 text-left">Date</th>
                            <th className="px-2 py-1 text-left">Due</th>
                            <th className="px-2 py-1 text-right">Amount</th>
                            <th className="px-2 py-1 text-right">Due</th>
                            <th className="px-2 py-1 text-center">Status</th>
                            <th className="px-2 py-1 text-center">Action</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-[10px] dark:divide-slate-700/50">
                        {filtered.length === 0 ? (
                            <tr>
                                <td colSpan={7} className="py-6 text-center">
                                    <FileText className="mx-auto h-6 w-6 text-slate-300 dark:text-slate-600" />
                                    <p className="mt-1 text-[10px] text-slate-500 dark:text-slate-400">
                                        No invoices found
                                    </p>
                                </td>
                            </tr>
                        ) : (
                            filtered.map((invoice) => {
                                const total = getInvoiceTotal(invoice);
                                const due = getInvoiceDue(invoice);
                                const overdue = isOverdue(invoice);

                                return (
                                    <tr
                                        key={invoice.id}
                                        className="hover:bg-slate-50 dark:hover:bg-slate-800/50"
                                    >
                                        <td className="px-2 py-1.5 font-mono text-[9px] font-medium text-slate-700 dark:text-slate-300">
                                            {invoice.invoice_number || 'N/A'}
                                        </td>
                                        <td className="px-2 py-1.5 text-[9px] text-slate-500 dark:text-slate-400">
                                            {formatDate(invoice.created_at)}
                                        </td>
                                        <td
                                            className={`px-2 py-1.5 text-[9px] ${overdue ? 'font-medium text-red-600 dark:text-red-400' : 'text-slate-500 dark:text-slate-400'}`}
                                        >
                                            {formatDate(invoice.due_date)}
                                        </td>
                                        <td className="px-2 py-1.5 text-right text-[10px] font-semibold text-slate-800 dark:text-slate-200">
                                            {formatCurrency(total)}
                                        </td>
                                        <td className="px-2 py-1.5 text-right text-[10px] font-medium text-amber-600 dark:text-amber-400">
                                            {formatCurrency(due)}
                                        </td>
                                        <td className="px-2 py-1.5 text-center">
                                            <StatusBadge
                                                status={invoice.status}
                                            />
                                        </td>
                                        <td className="px-2 py-1.5 text-center">
                                            <div className="flex items-center justify-center gap-0.5">
                                                <button
                                                    onClick={() =>
                                                        onView(invoice)
                                                    }
                                                    className="rounded p-0.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-blue-600 dark:hover:bg-slate-700 dark:hover:text-blue-400"
                                                    title="View"
                                                >
                                                    <Eye className="h-3 w-3" />
                                                </button>
                                                {invoice.status !== 'paid' &&
                                                    invoice.status !==
                                                        'cancelled' &&
                                                    due > 0 && (
                                                        <button
                                                            onClick={() =>
                                                                onPay(invoice)
                                                            }
                                                            className="flex items-center gap-0.5 rounded bg-emerald-600 px-1.5 py-0.5 text-[9px] font-medium text-white transition-colors hover:bg-emerald-700"
                                                            title="Pay"
                                                        >
                                                            <DollarSign className="h-2.5 w-2.5" />
                                                            Pay
                                                        </button>
                                                    )}
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
