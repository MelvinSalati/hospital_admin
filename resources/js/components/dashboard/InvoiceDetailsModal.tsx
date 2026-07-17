// ============================================================
// InvoiceDetailsModal — Scrollable invoice detail overlay
// ============================================================
import { useEffect } from 'react';
import { X, FileText, User, Calendar, CreditCard } from 'lucide-react';
import type { Invoice } from '../../types';

interface InvoiceDetailsModalProps {
    invoice: Invoice | null;
    onClose: () => void;
}

const statusStyles = {
    paid: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400 dark:ring-emerald-800',
    unpaid: 'bg-red-50 text-red-700 ring-1 ring-red-200 dark:bg-red-900/20 dark:text-red-400 dark:ring-red-800',
    partial: 'bg-amber-50 text-amber-700 ring-1 ring-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:ring-amber-800',
};

export function InvoiceDetailsModal({ invoice, onClose }: InvoiceDetailsModalProps) {
    // Close on Escape
    useEffect(() => {
        const handler = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
        document.addEventListener('keydown', handler);
        return () => document.removeEventListener('keydown', handler);
    }, [onClose]);

    if (!invoice) return null;

    const formatCurrency = (v: number) => `ZMW ${v.toLocaleString('en-ZM', { minimumFractionDigits: 2 })}`;

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-title"
        >
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* Panel */}
            <div className="relative z-10 w-full max-w-2xl rounded-xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-800 max-h-[90vh] flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700 px-6 py-4 flex-shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="rounded-md bg-slate-100 dark:bg-slate-700 p-1.5">
                            <FileText className="h-4 w-4 text-slate-500 dark:text-slate-400" />
                        </div>
                        <div>
                            <h2 id="modal-title" className="text-sm font-semibold text-slate-900 dark:text-white">
                                {invoice.invoiceNumber}
                            </h2>
                            <p className="text-xs text-slate-500 dark:text-slate-400">Invoice Details</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${statusStyles[invoice.status]}`}>
                            {invoice.status}
                        </span>
                        <button
                            onClick={onClose}
                            className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-700 transition-colors"
                            aria-label="Close"
                        >
                            <X className="h-4 w-4" />
                        </button>
                    </div>
                </div>

                {/* Scrollable body */}
                <div className="overflow-y-auto flex-1 px-6 py-5 space-y-5">
                    {/* Patient & date info */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="rounded-lg bg-slate-50 dark:bg-slate-700/40 p-3">
                            <div className="flex items-center gap-2 mb-1">
                                <User className="h-3.5 w-3.5 text-slate-400" />
                                <span className="text-[10px] uppercase tracking-wide font-medium text-slate-400">Patient</span>
                            </div>
                            <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">{invoice.patientName}</p>
                            <p className="text-xs text-slate-500 dark:text-slate-400">ID: {invoice.patientId}</p>
                        </div>
                        <div className="rounded-lg bg-slate-50 dark:bg-slate-700/40 p-3">
                            <div className="flex items-center gap-2 mb-1">
                                <Calendar className="h-3.5 w-3.5 text-slate-400" />
                                <span className="text-[10px] uppercase tracking-wide font-medium text-slate-400">Bill Date</span>
                            </div>
                            <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">{invoice.billDate}</p>
                        </div>
                    </div>

                    {/* Line items table */}
                    {invoice.items && invoice.items.length > 0 ? (
                        <div>
                            <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-2">
                                Invoice Items
                            </h4>
                            <div className="rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="bg-slate-50 dark:bg-slate-700/50">
                                            <th className="px-3 py-2 text-left text-xs font-medium text-slate-500 dark:text-slate-400">Description</th>
                                            <th className="px-3 py-2 text-right text-xs font-medium text-slate-500 dark:text-slate-400 w-16">Qty</th>
                                            <th className="px-3 py-2 text-right text-xs font-medium text-slate-500 dark:text-slate-400 w-28">Unit Price</th>
                                            <th className="px-3 py-2 text-right text-xs font-medium text-slate-500 dark:text-slate-400 w-28">Total</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                                        {invoice.items.map((item, idx) => (
                                            <tr key={idx} className="bg-white dark:bg-slate-800">
                                                <td className="px-3 py-2.5 text-slate-700 dark:text-slate-200">{item.description}</td>
                                                <td className="px-3 py-2.5 text-right text-slate-600 dark:text-slate-300 tabular-nums">{item.quantity}</td>
                                                <td className="px-3 py-2.5 text-right text-slate-600 dark:text-slate-300 tabular-nums">{formatCurrency(item.unitPrice)}</td>
                                                <td className="px-3 py-2.5 text-right font-medium text-slate-800 dark:text-slate-100 tabular-nums">{formatCurrency(item.lineTotal)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    ) : (
                        <div className="rounded-lg border border-dashed border-slate-200 dark:border-slate-700 py-8 text-center">
                            <p className="text-sm text-slate-400">No itemised details available for this invoice.</p>
                        </div>
                    )}

                    {/* Payment summary */}
                    <div className="rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
                        <div className="bg-slate-50 dark:bg-slate-700/40 px-4 py-2">
                            <div className="flex items-center gap-2">
                                <CreditCard className="h-3.5 w-3.5 text-slate-400" />
                                <span className="text-[10px] uppercase tracking-wide font-medium text-slate-400">Payment Summary</span>
                            </div>
                        </div>
                        <div className="divide-y divide-slate-100 dark:divide-slate-700">
                            <div className="flex justify-between px-4 py-2.5">
                                <span className="text-sm text-slate-500 dark:text-slate-400">Grand Total</span>
                                <span className="text-sm font-semibold text-slate-800 dark:text-slate-100 tabular-nums">{formatCurrency(invoice.totalAmount)}</span>
                            </div>
                            <div className="flex justify-between px-4 py-2.5">
                                <span className="text-sm text-slate-500 dark:text-slate-400">Amount Paid</span>
                                <span className="text-sm font-semibold text-emerald-600 dark:text-emerald-400 tabular-nums">{formatCurrency(invoice.amountPaid)}</span>
                            </div>
                            <div className="flex justify-between px-4 py-2.5 bg-slate-50 dark:bg-slate-700/40">
                                <span className="text-sm font-medium text-slate-700 dark:text-slate-200">Balance Due</span>
                                <span className={`text-sm font-bold tabular-nums ${invoice.balance > 0 ? 'text-red-600 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                                    {formatCurrency(invoice.balance)}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="border-t border-slate-100 dark:border-slate-700 px-6 py-3 flex-shrink-0 flex justify-end gap-2">
                    <button
                        onClick={onClose}
                        className="rounded-md px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                    >
                        Close
                    </button>
                    <a
                        href={`/patients/bills/${invoice.patientId}`}
                        className="rounded-md px-4 py-2 text-sm font-medium bg-slate-900 text-white hover:bg-slate-700 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-200 transition-colors"
                    >
                        View Full Bill
                    </a>
                </div>
            </div>
        </div>
    );
}
