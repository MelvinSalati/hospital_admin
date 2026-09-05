// resources/js/pages/receptions/queues.tsx
import { usePage, router } from '@inertiajs/react';
import {
    Clock,
    Stethoscope,
    AlertCircle,
    CheckCircle,
    XCircle,
    Timer,
    FileText,
    Activity,
    User,
    Phone,
    Users,
    Receipt,
    X,
    Printer,
    Download,
    Mail,
    CreditCard,
    Building2,
    Package,
} from 'lucide-react';
import Notiflix from 'notiflix';
import React, { useState, useEffect, useRef } from 'react';
import PageHeader from '@/components/PageHeader';
import ReusableTable from '@/components/ReusableTable';
import type { Column, Action } from '@/components/ReusableTable';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import AppLayout from '@/layouts/app-layout';
import { cn } from '@/lib/utils';

// ============================================
// TYPES
// ============================================

interface InvoiceItem {
    id?: number;
    service_id?: number;
    name?: string;
    price: number | string;
    total: number;
    quantity?: number;
    type?: string;
    category?: string;
    service_name?: string;
    service_code?: string;
    description?: string;
    notes?: string;
    dosage?: string;
    route?: string;
    frequency?: string;
    duration?: string;
    drug_id?: number;
    test_id?: number;
}

interface Invoice {
    id: number;
    invoice_number: string;
    patient_id: number;
    customer_name: string;
    customer_phone: string;
    customer_email: string;
    customer_address: string;
    subtotal: number;
    tax: number;
    discount: number;
    total: number;
    paid_amount: number;
    balance: number;
    due_amount: number;
    status: 'paid' | 'unpaid' | 'partial' | 'draft' | 'cancelled';
    payment_scheme: string;
    issue_date: string;
    due_date: string;
    paid_date: string;
    items: InvoiceItem[];
    created_at: string;
    updated_at: string;
}

interface PatientVisit {
    id: number;
    queue_number: string;
    patient: {
        id: number;
        name: string;
        phone?: string;
        email?: string;
    };
    department: {
        id: number;
        name: string;
    };
    status: string;
    priority: string;
    arrived_at: string;
    started_at?: string;
    completed_at?: string;
    estimated_wait_time?: number;
    notes?: string;
    total_unpaid?: number;
    unpaid_invoices?: Invoice[];
    all_invoices_count?: number;
}

interface QueuesProps {
    active: PatientVisit[];
    completed: PatientVisit[];
}

// ============================================
// HELPERS
// ============================================

const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-ZM', {
        style: 'currency',
        currency: 'ZMW',
        minimumFractionDigits: 2,
    }).format(amount);
};

const formatDate = (date: string | null): string => {
    if (!date) return 'N/A';
    try {
        return new Date(date).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
        });
    } catch {
        return 'N/A';
    }
};

const formatTime = (date: string | null): string => {
    if (!date) return 'N/A';
    try {
        return new Date(date).toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
        });
    } catch {
        return 'N/A';
    }
};

const getStatusConfig = (status: any) => {
    const statusStr = String(status || '').toLowerCase();

    const configs: Record<
        string,
        {
            label: string;
            color: string;
            icon: React.ElementType;
        }
    > = {
        waiting: {
            label: 'Waiting',
            color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
            icon: Clock,
        },
        in_progress: {
            label: 'In Progress',
            color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
            icon: Activity,
        },
        completed: {
            label: 'Completed',
            color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
            icon: CheckCircle,
        },
        cancelled: {
            label: 'Cancelled',
            color: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400',
            icon: XCircle,
        },
        no_show: {
            label: 'No Show',
            color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
            icon: AlertCircle,
        },
        paid: {
            label: 'Paid',
            color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
            icon: CheckCircle,
        },
        unpaid: {
            label: 'Unpaid',
            color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
            icon: AlertCircle,
        },
        partial: {
            label: 'Partial',
            color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
            icon: Clock,
        },
        draft: {
            label: 'Draft',
            color: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400',
            icon: FileText,
        },
        cancelled_invoice: {
            label: 'Cancelled',
            color: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400',
            icon: XCircle,
        },
    };

    return (
        configs[statusStr] || {
            label:
                statusStr.charAt(0).toUpperCase() + statusStr.slice(1) ||
                'Unknown',
            color: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400',
            icon: AlertCircle,
        }
    );
};

const getPriorityConfig = (priority: any) => {
    const priorityStr = String(priority || '').toLowerCase();

    const configs: Record<string, { label: string; color: string }> = {
        emergency: { label: 'Emergency', color: 'bg-red-600 text-white' },
        high: { label: 'High', color: 'bg-orange-500 text-white' },
        medium: { label: 'Medium', color: 'bg-blue-500 text-white' },
        low: { label: 'Low', color: 'bg-gray-400 text-white' },
    };

    return (
        configs[priorityStr] || {
            label:
                priorityStr.charAt(0).toUpperCase() + priorityStr.slice(1) ||
                'Normal',
            color: 'bg-gray-400 text-white',
        }
    );
};

const getInvoiceStatusConfig = (status: string) => {
    const configs: Record<
        string,
        { label: string; color: string; icon: React.ReactNode }
    > = {
        paid: {
            label: 'Paid',
            color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
            icon: <CheckCircle className="h-3.5 w-3.5" />,
        },
        unpaid: {
            label: 'Unpaid',
            color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
            icon: <AlertCircle className="h-3.5 w-3.5" />,
        },
        partial: {
            label: 'Partial',
            color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
            icon: <Clock className="h-3.5 w-3.5" />,
        },
        draft: {
            label: 'Draft',
            color: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400',
            icon: <FileText className="h-3.5 w-3.5" />,
        },
        cancelled: {
            label: 'Cancelled',
            color: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400',
            icon: <X className="h-3.5 w-3.5" />,
        },
    };
    return configs[status] || configs.draft;
};

// ============================================
// INVOICE MODAL COMPONENT (Shows all invoices with totals)
// ============================================

interface InvoiceModalProps {
    isOpen: boolean;
    onClose: () => void;
    invoices: Invoice[];
    patientName: string;
}

const InvoiceModal: React.FC<InvoiceModalProps> = ({
    isOpen,
    onClose,
    invoices,
    patientName,
}) => {
    const modalRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleEsc = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && isOpen) {
                onClose();
            }
        };
        window.addEventListener('keydown', handleEsc);
        return () => window.removeEventListener('keydown', handleEsc);
    }, [isOpen, onClose]);

    const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
        if (e.target === e.currentTarget) {
            onClose();
        }
    };

    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [isOpen]);

    if (!isOpen || !invoices || invoices.length === 0) return null;

    // Calculate totals across all invoices
    const totalSubtotal = invoices.reduce(
        (sum, inv) => sum + (inv.subtotal || 0),
        0,
    );
    const totalTax = invoices.reduce((sum, inv) => sum + (inv.tax || 0), 0);
    const totalDiscount = invoices.reduce(
        (sum, inv) => sum + (inv.discount || 0),
        0,
    );
    const totalAmount = invoices.reduce(
        (sum, inv) => sum + (inv.total || 0),
        0,
    );
    const totalPaid = invoices.reduce(
        (sum, inv) => sum + (inv.paid_amount || 0),
        0,
    );
    const totalBalance = invoices.reduce(
        (sum, inv) => sum + (inv.balance || 0),
        0,
    );

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm transition-opacity duration-300"
            onClick={handleOverlayClick}
        >
            <div
                ref={modalRef}
                className="relative flex h-[85vh] w-full max-w-5xl flex-col overflow-hidden rounded-xl bg-white shadow-2xl dark:bg-slate-900"
            >
                {/* Header - Fixed */}
                <div className="flex-shrink-0 border-b border-slate-200 bg-white px-6 py-4 dark:border-slate-700 dark:bg-slate-800">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="rounded-lg bg-blue-50 p-2 dark:bg-blue-900/20">
                                <Receipt className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                            </div>
                            <div>
                                <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                                    {patientName}
                                </h2>
                                <div className="flex items-center gap-2">
                                    <span className="text-sm text-slate-500 dark:text-slate-400">
                                        {invoices.length} invoice
                                        {invoices.length > 1 ? 's' : ''}
                                    </span>
                                    <span className="h-3 w-px bg-slate-300 dark:bg-slate-600" />
                                    <span className="text-sm font-medium text-red-600">
                                        Total: {formatCurrency(totalAmount)}
                                    </span>
                                    {totalBalance > 0 && (
                                        <>
                                            <span className="h-3 w-px bg-slate-300 dark:bg-slate-600" />
                                            <span className="text-sm font-medium text-amber-600">
                                                Balance:{' '}
                                                {formatCurrency(totalBalance)}
                                            </span>
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={onClose}
                            className="h-8 w-8 p-0"
                        >
                            <X className="h-4 w-4" />
                        </Button>
                    </div>
                </div>

                {/* Body - Scrollable */}
                <ScrollArea className="flex-1 p-4">
                    <div className="space-y-6">
                        {/* Patient Details */}
                        <div className="grid grid-cols-2 gap-3 rounded-lg bg-slate-50 p-3 dark:bg-slate-800/50">
                            <div>
                                <p className="text-xs text-slate-500 dark:text-slate-400">
                                    Patient
                                </p>
                                <p className="text-sm font-medium text-slate-900 dark:text-white">
                                    {patientName}
                                </p>
                                {invoices[0]?.customer_phone && (
                                    <p className="text-xs text-slate-600 dark:text-slate-300">
                                        <Phone className="mr-1 inline h-3 w-3" />
                                        {invoices[0].customer_phone}
                                    </p>
                                )}
                                {invoices[0]?.customer_email && (
                                    <p className="text-xs text-slate-600 dark:text-slate-300">
                                        <Mail className="mr-1 inline h-3 w-3" />
                                        {invoices[0].customer_email}
                                    </p>
                                )}
                            </div>
                            <div>
                                <p className="text-xs text-slate-500 dark:text-slate-400">
                                    Summary
                                </p>
                                <div className="space-y-0.5">
                                    <div className="flex justify-between text-xs">
                                        <span className="text-slate-500">
                                            Total Invoices:
                                        </span>
                                        <span className="font-medium text-slate-900 dark:text-white">
                                            {invoices.length}
                                        </span>
                                    </div>
                                    <div className="flex justify-between text-xs">
                                        <span className="text-slate-500">
                                            Total Amount:
                                        </span>
                                        <span className="font-medium text-slate-900 dark:text-white">
                                            {formatCurrency(totalAmount)}
                                        </span>
                                    </div>
                                    <div className="flex justify-between text-xs">
                                        <span className="text-slate-500">
                                            Total Paid:
                                        </span>
                                        <span className="font-medium text-emerald-600">
                                            {formatCurrency(totalPaid)}
                                        </span>
                                    </div>
                                    <div className="flex justify-between text-xs">
                                        <span className="text-slate-500">
                                            Total Balance:
                                        </span>
                                        <span
                                            className={cn(
                                                'font-medium',
                                                totalBalance > 0
                                                    ? 'text-red-600'
                                                    : 'text-emerald-600',
                                            )}
                                        >
                                            {formatCurrency(totalBalance)}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Invoices List */}
                        {invoices.map((invoice, invoiceIndex) => {
                            const statusConfig = getInvoiceStatusConfig(
                                invoice.status,
                            );
                            const isOverdue =
                                invoice.due_date &&
                                new Date(invoice.due_date) < new Date() &&
                                invoice.status !== 'paid';

                            return (
                                <div
                                    key={invoice.id}
                                    className="overflow-hidden rounded-lg border border-slate-200 dark:border-slate-700"
                                >
                                    {/* Invoice Header */}
                                    <div className="bg-slate-50 px-4 py-2 dark:bg-slate-800/50">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <span className="font-mono text-sm font-bold text-slate-900 dark:text-white">
                                                    {invoice.invoice_number}
                                                </span>
                                                <Badge
                                                    className={cn(
                                                        'flex items-center gap-1 text-xs',
                                                        statusConfig.color,
                                                    )}
                                                >
                                                    {statusConfig.icon}
                                                    {statusConfig.label}
                                                </Badge>
                                                {isOverdue && (
                                                    <Badge
                                                        variant="destructive"
                                                        className="flex items-center gap-1 text-xs"
                                                    >
                                                        <AlertCircle className="h-3 w-3" />
                                                        Overdue
                                                    </Badge>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-4 text-sm">
                                                <span className="text-slate-500">
                                                    Total:{' '}
                                                    <span className="font-bold text-slate-900">
                                                        {formatCurrency(
                                                            invoice.total || 0,
                                                        )}
                                                    </span>
                                                </span>
                                                {invoice.balance > 0 && (
                                                    <span className="text-red-600">
                                                        Balance:{' '}
                                                        <span className="font-bold">
                                                            {formatCurrency(
                                                                invoice.balance,
                                                            )}
                                                        </span>
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                        <div className="mt-1 flex gap-4 text-xs text-slate-500">
                                            <span>
                                                Issued:{' '}
                                                {formatDate(invoice.issue_date)}
                                            </span>
                                            <span>
                                                Due:{' '}
                                                {formatDate(invoice.due_date)}
                                            </span>
                                            {invoice.payment_scheme && (
                                                <span>
                                                    Scheme:{' '}
                                                    {invoice.payment_scheme}
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    {/* Invoice Items */}
                                    <Table>
                                        <TableHeader>
                                            <TableRow className="bg-white dark:bg-slate-900">
                                                <TableHead className="text-xs font-medium text-slate-500 dark:text-slate-400">
                                                    Item
                                                </TableHead>
                                                <TableHead className="text-xs font-medium text-slate-500 dark:text-slate-400">
                                                    Type
                                                </TableHead>
                                                <TableHead className="text-right text-xs font-medium text-slate-500 dark:text-slate-400">
                                                    Qty
                                                </TableHead>
                                                <TableHead className="text-right text-xs font-medium text-slate-500 dark:text-slate-400">
                                                    Price
                                                </TableHead>
                                                <TableHead className="text-right text-xs font-medium text-slate-500 dark:text-slate-400">
                                                    Total
                                                </TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {invoice.items &&
                                            invoice.items.length > 0 ? (
                                                invoice.items.map(
                                                    (item, index) => (
                                                        <TableRow
                                                            key={index}
                                                            className="hover:bg-slate-50 dark:hover:bg-slate-800/50"
                                                        >
                                                            <TableCell className="py-2 text-sm font-medium text-slate-900 dark:text-white">
                                                                {item.name ||
                                                                    item.category ||
                                                                    'Item'}
                                                                {item.service_code && (
                                                                    <div className="text-xs text-slate-400">
                                                                        Code:{' '}
                                                                        {
                                                                            item.service_code
                                                                        }
                                                                    </div>
                                                                )}
                                                                {item.description && (
                                                                    <div className="text-xs text-slate-500 dark:text-slate-400">
                                                                        {
                                                                            item.description
                                                                        }
                                                                    </div>
                                                                )}
                                                                {item.dosage && (
                                                                    <div className="text-xs text-slate-500 dark:text-slate-400">
                                                                        {
                                                                            item.dosage
                                                                        }{' '}
                                                                        {item.route &&
                                                                            `• ${item.route}`}
                                                                        {item.frequency &&
                                                                            `• ${item.frequency}`}
                                                                        {item.duration &&
                                                                            `• ${item.duration}`}
                                                                    </div>
                                                                )}
                                                            </TableCell>
                                                            <TableCell className="py-2 text-sm text-slate-600 capitalize dark:text-slate-300">
                                                                {item.type ||
                                                                    item.category ||
                                                                    'Service'}
                                                                {item.service_name && (
                                                                    <div className="text-xs text-slate-400">
                                                                        {
                                                                            item.service_name
                                                                        }
                                                                    </div>
                                                                )}
                                                            </TableCell>
                                                            <TableCell className="py-2 text-right text-sm text-slate-600 dark:text-slate-300">
                                                                {item.quantity ||
                                                                    1}
                                                            </TableCell>
                                                            <TableCell className="py-2 text-right text-sm text-slate-600 dark:text-slate-300">
                                                                {formatCurrency(
                                                                    Number(
                                                                        item.price,
                                                                    ) || 0,
                                                                )}
                                                            </TableCell>
                                                            <TableCell className="py-2 text-right text-sm font-medium text-slate-900 dark:text-white">
                                                                {formatCurrency(
                                                                    item.total ||
                                                                        Number(
                                                                            item.price,
                                                                        ) ||
                                                                        0,
                                                                )}
                                                            </TableCell>
                                                        </TableRow>
                                                    ),
                                                )
                                            ) : (
                                                <TableRow>
                                                    <TableCell
                                                        colSpan={5}
                                                        className="py-4 text-center text-sm text-slate-500 dark:text-slate-400"
                                                    >
                                                        No items found
                                                    </TableCell>
                                                </TableRow>
                                            )}
                                        </TableBody>
                                    </Table>

                                    {/* Invoice Summary */}
                                    <div className="border-t border-slate-200 bg-slate-50 px-4 py-2 dark:border-slate-700 dark:bg-slate-800/50">
                                        <div className="flex justify-end gap-6 text-sm">
                                            <span className="text-slate-500">
                                                Subtotal:{' '}
                                                <span className="font-medium text-slate-900">
                                                    {formatCurrency(
                                                        invoice.subtotal || 0,
                                                    )}
                                                </span>
                                            </span>
                                            {invoice.tax > 0 && (
                                                <span className="text-slate-500">
                                                    Tax:{' '}
                                                    <span className="font-medium text-slate-900">
                                                        {formatCurrency(
                                                            invoice.tax,
                                                        )}
                                                    </span>
                                                </span>
                                            )}
                                            {invoice.discount > 0 && (
                                                <span className="text-slate-500">
                                                    Discount:{' '}
                                                    <span className="font-medium text-red-600">
                                                        -
                                                        {formatCurrency(
                                                            invoice.discount,
                                                        )}
                                                    </span>
                                                </span>
                                            )}
                                            <span className="font-bold text-slate-900">
                                                Total:{' '}
                                                {formatCurrency(
                                                    invoice.total || 0,
                                                )}
                                            </span>
                                            {invoice.balance > 0 && (
                                                <span className="font-bold text-red-600">
                                                    Balance:{' '}
                                                    {formatCurrency(
                                                        invoice.balance,
                                                    )}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}

                        {/* Grand Total Summary */}
                        {invoices.length > 1 && (
                            <div className="rounded-lg bg-blue-50 p-4 dark:bg-blue-900/20">
                                <h4 className="mb-2 text-sm font-bold text-slate-900 dark:text-white">
                                    Grand Total Summary
                                </h4>
                                <div className="grid grid-cols-3 gap-4">
                                    <div>
                                        <p className="text-xs text-slate-500">
                                            Total Amount
                                        </p>
                                        <p className="text-lg font-bold text-slate-900">
                                            {formatCurrency(totalAmount)}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-slate-500">
                                            Total Paid
                                        </p>
                                        <p className="text-lg font-bold text-emerald-600">
                                            {formatCurrency(totalPaid)}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-slate-500">
                                            Total Balance
                                        </p>
                                        <p
                                            className={cn(
                                                'text-lg font-bold',
                                                totalBalance > 0
                                                    ? 'text-red-600'
                                                    : 'text-emerald-600',
                                            )}
                                        >
                                            {formatCurrency(totalBalance)}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </ScrollArea>

                {/* Footer - Fixed with Close Button */}
                <div className="flex-shrink-0 border-t border-slate-200 bg-white px-6 py-3 dark:border-slate-700 dark:bg-slate-800">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
                            <span>
                                {invoices.length} invoice
                                {invoices.length > 1 ? 's' : ''}
                            </span>
                            <span className="h-3 w-px bg-slate-300 dark:bg-slate-600" />
                            <span>
                                Total Items:{' '}
                                {invoices.reduce(
                                    (sum, inv) =>
                                        sum + (inv.items?.length || 0),
                                    0,
                                )}
                            </span>
                            <span className="h-3 w-px bg-slate-300 dark:bg-slate-600" />
                            <span className="font-medium text-slate-700">
                                Total: {formatCurrency(totalAmount)}
                            </span>
                            {totalBalance > 0 && (
                                <>
                                    <span className="h-3 w-px bg-slate-300 dark:bg-slate-600" />
                                    <span className="font-medium text-red-600">
                                        Balance: {formatCurrency(totalBalance)}
                                    </span>
                                </>
                            )}
                        </div>
                        <div className="flex gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                className="gap-1.5 text-xs"
                                onClick={() => window.print()}
                            >
                                <Printer className="h-3.5 w-3.5" />
                                Print All
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                className="gap-1.5 text-xs"
                            >
                                <Download className="h-3.5 w-3.5" />
                                PDF
                            </Button>
                            {totalBalance > 0 && (
                                <Button
                                    variant="default"
                                    size="sm"
                                    className="gap-1.5 bg-emerald-600 text-xs hover:bg-emerald-700"
                                >
                                    <CreditCard className="h-3.5 w-3.5" />
                                    Pay All
                                </Button>
                            )}
                            <Button
                                variant="default"
                                size="sm"
                                className="gap-1.5 text-xs"
                                onClick={onClose}
                            >
                                Close
                            </Button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

// ============================================
// MAIN QUEUES COMPONENT
// ============================================

export default function Queues() {
    const { active, completed } = usePage<QueuesProps>().props;
    const [activeTab, setActiveTab] = useState<'active' | 'completed'>(
        'active',
    );
    const [loading, setLoading] = useState(false);
    const [selectedInvoices, setSelectedInvoices] = useState<Invoice[]>([]);
    const [selectedPatient, setSelectedPatient] = useState<string>('');
    const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);

    // Debug: Log the data
    console.log('Active Queue Data:', active);
    console.log('Completed Queue Data:', completed);

    // Action handlers
    const handleViewPatient = async (visitId: number) => {
        try {
            Notiflix.Report.info(
                'Patient Details',
                `Viewing patient record #${visitId}`,
                'Close',
            );
        } catch {
            Notiflix.Notify.failure('Failed to load patient details');
        }
    };

    const handleStartConsultation = async (visitId: number) => {
        Notiflix.Confirm.show(
            'Start Consultation',
            'Are you sure you want to start this consultation?',
            async () => {
                setLoading(true);
                try {
                    await router.put(`/visits/${visitId}/start`);
                    Notiflix.Notify.success(
                        'Consultation started successfully',
                    );
                    router.reload();
                } catch {
                    Notiflix.Notify.failure('Failed to start consultation');
                } finally {
                    setLoading(false);
                }
            },
            'Yes, Start',
            'Cancel',
        );
    };

    const handleCompleteVisit = async (visitId: number) => {
        Notiflix.Confirm.show(
            'Complete Visit',
            'Are you sure you want to mark this visit as completed?',
            async () => {
                setLoading(true);
                try {
                    await router.put(`/visits/${visitId}/complete`);
                    Notiflix.Notify.success('Visit completed successfully');
                    router.reload();
                } catch {
                    Notiflix.Notify.failure('Failed to complete visit');
                } finally {
                    setLoading(false);
                }
            },
            'Yes, Complete',
            'Cancel',
        );
    };

    // Handle viewing invoice - shows ALL invoices for the patient
    const handleViewInvoice = (patientId: number, patientName: string) => {
        const allPatients = [...(active || []), ...(completed || [])];
        const patient = allPatients.find((p) => p.patient.id === patientId);

        console.log('=== VIEW INVOICE ===');
        console.log('Patient ID:', patientId);
        console.log('Patient Name:', patientName);
        console.log('Patient Data:', patient);
        console.log('Unpaid Invoices:', patient?.unpaid_invoices);

        if (!patient) {
            Notiflix.Notify.warning('Patient not found');
            return;
        }

        if (!patient.unpaid_invoices || patient.unpaid_invoices.length === 0) {
            Notiflix.Report.warning(
                'No Invoices Found',
                `
                <div style="text-align: left;">
                    <p><strong>Patient:</strong> ${patientName}</p>
                    <p><strong>Total Unpaid:</strong> ${patient.total_unpaid || 0}</p>
                    <p><strong>All Invoices Count:</strong> ${patient.all_invoices_count || 0}</p>
                    <hr/>
                    <p style="color:#666;font-size:13px;">
                        This patient has no unpaid invoices.
                    </p>
                </div>
                `,
                'OK',
            );
            return;
        }

        console.log('Opening modal with invoices:', patient.unpaid_invoices);

        // Open modal with ALL invoices
        setSelectedInvoices(patient.unpaid_invoices);
        setSelectedPatient(patientName);
        setIsInvoiceModalOpen(true);
    };

    // Define columns for active queues - REMOVED Unpaid Balance column
    const activeColumns: Column<PatientVisit>[] = [
        {
            id: 'queue_number',
            label: 'Queue #',
            sortable: true,
            format: (value) => (
                <div className="font-mono text-sm font-medium">
                    #{value || 'N/A'}
                </div>
            ),
        },
        {
            id: 'patient',
            label: 'Patient',
            sortable: true,
            filterable: true,
            format: (value, row) => (
                <div className="flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-blue-400 to-blue-500 text-white shadow-sm">
                        <User size={14} />
                    </div>
                    <div>
                        <span className="font-medium text-slate-800 dark:text-slate-200">
                            {row.patient?.name || 'Unknown Patient'}
                        </span>
                        <div className="flex items-center gap-2 text-xs text-slate-400">
                            <span>ID: {row.patient?.id || 'N/A'}</span>
                            {row.patient?.phone && (
                                <>
                                    <span>•</span>
                                    <Phone size={10} />
                                    <span>{row.patient.phone}</span>
                                </>
                            )}
                            {row.all_invoices_count !== undefined &&
                                row.all_invoices_count > 0 && (
                                    <>
                                        <span>•</span>
                                        <span className="text-blue-500">
                                            Invoices: {row.all_invoices_count}
                                        </span>
                                    </>
                                )}
                        </div>
                    </div>
                </div>
            ),
        },
        {
            id: 'department',
            label: 'Department',
            sortable: true,
            format: (value, row) => (
                <div className="flex items-center gap-2">
                    <Stethoscope className="h-4 w-4 text-slate-400" />
                    <span className="text-sm text-slate-700 dark:text-slate-300">
                        {row.department?.name || 'N/A'}
                    </span>
                </div>
            ),
        },
        {
            id: 'priority',
            label: 'Priority',
            sortable: true,
            format: (value, row) => {
                const config = getPriorityConfig(row.priority);
                return (
                    <Badge className={cn('text-xs font-medium', config.color)}>
                        {config.label}
                    </Badge>
                );
            },
        },
        {
            id: 'status',
            label: 'Status',
            sortable: true,
            filterable: true,
            filterType: 'status',
            statusColors: {
                waiting: 'warning',
                in_progress: 'info',
                completed: 'success',
                cancelled: 'error',
                no_show: 'error',
            },
            format: (value, row) => {
                const config = getStatusConfig(row.status);
                const Icon = config.icon;
                return (
                    <span
                        className={cn(
                            'inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium shadow-sm',
                            config.color,
                        )}
                    >
                        <Icon className="h-3 w-3" />
                        {config.label}
                    </span>
                );
            },
        },
        {
            id: 'arrived_at',
            label: 'Arrived',
            sortable: true,
            format: (value) => (
                <div className="flex items-center gap-2">
                    <Clock size={14} className="text-slate-400" />
                    <div>
                        <span className="text-sm text-slate-700 dark:text-slate-300">
                            {formatTime(value)}
                        </span>
                        <span className="ml-1 text-xs text-slate-400">
                            ({formatDate(value)})
                        </span>
                    </div>
                </div>
            ),
        },
        {
            id: 'estimated_wait_time',
            label: 'Wait Time',
            sortable: true,
            format: (value) => {
                if (!value)
                    return <span className="text-sm text-slate-400">—</span>;
                return (
                    <div className="flex items-center gap-1">
                        <Timer className="h-3.5 w-3.5 text-slate-400" />
                        <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                            {value} min
                        </span>
                    </div>
                );
            },
        },
    ];

    // Define columns for completed queues - REMOVED Unpaid Balance column
    const completedColumns: Column<PatientVisit>[] = [
        {
            id: 'queue_number',
            label: 'Queue #',
            sortable: true,
            format: (value) => (
                <div className="font-mono text-sm font-medium">
                    #{value || 'N/A'}
                </div>
            ),
        },
        {
            id: 'patient',
            label: 'Patient',
            sortable: true,
            filterable: true,
            format: (value, row) => (
                <div className="flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-emerald-400 to-emerald-500 text-white shadow-sm">
                        <User size={14} />
                    </div>
                    <div>
                        <span className="font-medium text-slate-800 dark:text-slate-200">
                            {row.patient?.name || 'Unknown Patient'}
                        </span>
                        <div className="flex items-center gap-2 text-xs text-slate-400">
                            <span>ID: {row.patient?.id || 'N/A'}</span>
                            {row.patient?.phone && (
                                <>
                                    <span>•</span>
                                    <Phone size={10} />
                                    <span>{row.patient.phone}</span>
                                </>
                            )}
                            {row.all_invoices_count !== undefined &&
                                row.all_invoices_count > 0 && (
                                    <>
                                        <span>•</span>
                                        <span className="text-blue-500">
                                            Invoices: {row.all_invoices_count}
                                        </span>
                                    </>
                                )}
                        </div>
                    </div>
                </div>
            ),
        },
        {
            id: 'department',
            label: 'Department',
            sortable: true,
            format: (value, row) => (
                <div className="flex items-center gap-2">
                    <Stethoscope className="h-4 w-4 text-slate-400" />
                    <span className="text-sm text-slate-700 dark:text-slate-300">
                        {row.department?.name || 'N/A'}
                    </span>
                </div>
            ),
        },
        {
            id: 'status',
            label: 'Status',
            sortable: true,
            filterable: true,
            filterType: 'status',
            statusColors: {
                waiting: 'warning',
                in_progress: 'info',
                completed: 'success',
                cancelled: 'error',
                no_show: 'error',
            },
            format: (value, row) => {
                const config = getStatusConfig(row.status);
                const Icon = config.icon;
                return (
                    <span
                        className={cn(
                            'inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium shadow-sm',
                            config.color,
                        )}
                    >
                        <Icon className="h-3 w-3" />
                        {config.label}
                    </span>
                );
            },
        },
        {
            id: 'completed_at',
            label: 'Completed',
            sortable: true,
            format: (value) => {
                if (!value)
                    return <span className="text-sm text-slate-400">—</span>;
                return (
                    <div className="flex items-center gap-2">
                        <Clock size={14} className="text-slate-400" />
                        <div>
                            <span className="text-sm text-slate-700 dark:text-slate-300">
                                {formatTime(value)}
                            </span>
                            <span className="ml-1 text-xs text-slate-400">
                                ({formatDate(value)})
                            </span>
                        </div>
                    </div>
                );
            },
        },
    ];

    // Define actions for active queues
    const activeActions: Action<PatientVisit>[] = [
        {
            label: 'View',
            icon: <FileText size={16} />,
            color: 'info',
            onClick: (row) => handleViewPatient(row.id),
        },
        {
            label: 'Invoices',
            icon: <Receipt size={16} />,
            color: 'warning',
            show: (row) =>
                row.unpaid_invoices && row.unpaid_invoices.length > 0,
            onClick: (row) =>
                handleViewInvoice(row.patient.id, row.patient.name),
        },
        {
            label: 'Start',
            icon: <Activity size={16} />,
            color: 'success',
            show: (row) => getStatusConfig(row.status).label === 'Waiting',
            onClick: (row) => handleStartConsultation(row.id),
        },
        {
            label: 'Complete',
            icon: <CheckCircle size={16} />,
            color: 'success',
            show: (row) => getStatusConfig(row.status).label === 'In Progress',
            onClick: (row) => handleCompleteVisit(row.id),
        },
    ];

    // Define actions for completed queues
    const completedActions: Action<PatientVisit>[] = [
        {
            label: 'View',
            icon: <FileText size={16} />,
            color: 'info',
            onClick: (row) => handleViewPatient(row.id),
        },
        {
            label: 'Invoices',
            icon: <Receipt size={16} />,
            color: 'warning',
            show: (row) =>
                row.unpaid_invoices && row.unpaid_invoices.length > 0,
            onClick: (row) =>
                handleViewInvoice(row.patient.id, row.patient.name),
        },
    ];

    // Status options for filter dropdown
    const statusOptions = [
        { value: 'waiting', label: 'Waiting' },
        { value: 'in_progress', label: 'In Progress' },
        { value: 'completed', label: 'Completed' },
        { value: 'cancelled', label: 'Cancelled' },
        { value: 'no_show', label: 'No Show' },
    ];

    return (
        <AppLayout
            breadcrumbs={[
                { title: 'Reception', href: '/reception' },
                { title: 'Queues', href: '/reception/queues' },
            ]}
        >
            <div className="h-full bg-blue-50 p-4 ">
                <PageHeader
                    icon={<Users className="h-6 w-6" />}
                    title="Patient Queues"
                    subtitle="View and manage patients in the queue with invoice tracking"
                />

                {/* Tabs as Button Group */}
                <div className="mt-6 flex items-center justify-between">
                    <div className="text-sm text-slate-500 dark:text-slate-400">
                        {activeTab === 'active' ? (
                            <span className="flex items-center gap-2">
                                <span className="inline-block h-2 w-2 rounded-full bg-amber-500"></span>
                                Showing active patients
                            </span>
                        ) : (
                            <span className="flex items-center gap-2">
                                <span className="inline-block h-2 w-2 rounded-full bg-emerald-500"></span>
                                Showing completed visits
                            </span>
                        )}
                    </div>

                    <div className="flex items-center gap-1 rounded-lg bg-slate-200/50 p-1 dark:bg-slate-800/50">
                        <button
                            onClick={() => setActiveTab('active')}
                            className={cn(
                                'flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-all duration-200',
                                activeTab === 'active'
                                    ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-700 dark:text-white'
                                    : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200',
                            )}
                        >
                            <Clock className="h-3.5 w-3.5" />
                            Active
                            <Badge
                                variant={
                                    activeTab === 'active'
                                        ? 'default'
                                        : 'secondary'
                                }
                                className={cn(
                                    'ml-0.5 px-1.5 py-0 text-[10px]',
                                    activeTab === 'active'
                                        ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300'
                                        : 'bg-slate-300/50 text-slate-600 dark:bg-slate-600/50 dark:text-slate-400',
                                )}
                            >
                                {active?.length || 0}
                            </Badge>
                        </button>

                        <button
                            onClick={() => setActiveTab('completed')}
                            className={cn(
                                'flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-all duration-200',
                                activeTab === 'completed'
                                    ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-700 dark:text-white'
                                    : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200',
                            )}
                        >
                            <CheckCircle className="h-3.5 w-3.5" />
                            Completed
                            <Badge
                                variant={
                                    activeTab === 'completed'
                                        ? 'default'
                                        : 'secondary'
                                }
                                className={cn(
                                    'ml-0.5 px-1.5 py-0 text-[10px]',
                                    activeTab === 'completed'
                                        ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300'
                                        : 'bg-slate-300/50 text-slate-600 dark:bg-slate-600/50 dark:text-slate-400',
                                )}
                            >
                                {completed?.length || 0}
                            </Badge>
                        </button>
                    </div>
                </div>

                {/* Active Queue Table */}
                {activeTab === 'active' && (
                    <div className="mt-6">
                        <ReusableTable
                            title="Active Queue"
                            columns={activeColumns}
                            data={active || []}
                            actions={activeActions}
                            loading={loading}
                            filterPlaceholder="Search by patient name..."
                            statusFilterKey="status"
                            statusOptions={statusOptions}
                            rowsPerPageOptions={[8, 15, 25, 50]}
                            defaultRowsPerPage={8}
                            defaultOrderBy="arrived_at"
                            emptyMessage="No patients in the queue"
                            className="shadow-sm"
                        />
                    </div>
                )}

                {/* Completed Queue Table */}
                {activeTab === 'completed' && (
                    <div className="mt-6">
                        <ReusableTable
                            title="Completed Visits"
                            columns={completedColumns}
                            data={completed || []}
                            actions={completedActions}
                            loading={loading}
                            filterPlaceholder="Search by patient name..."
                            statusFilterKey="status"
                            statusOptions={statusOptions}
                            rowsPerPageOptions={[8, 15, 25, 50]}
                            defaultRowsPerPage={8}
                            defaultOrderBy="completed_at"
                            emptyMessage="No completed visits"
                            className="shadow-sm"
                        />
                    </div>
                )}

                {/* Invoice Modal - Shows all invoices with totals */}
                <InvoiceModal
                    isOpen={isInvoiceModalOpen}
                    onClose={() => {
                        setIsInvoiceModalOpen(false);
                        setSelectedInvoices([]);
                        setSelectedPatient('');
                    }}
                    invoices={selectedInvoices}
                    patientName={selectedPatient}
                />
            </div>
        </AppLayout>
    );
}
