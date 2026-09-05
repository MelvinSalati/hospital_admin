import {
    X,
    Printer,
    Download,
    Mail,
    CreditCard,
    FileText,
    User,
    Phone,
    Building2,
    Receipt,
    Clock,
    CheckCircle,
    AlertCircle,
} from 'lucide-react';
import React, { useEffect, useRef } from 'react';
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
import { cn } from '@/lib/utils';

interface InvoiceItem {
    id?: number;
    name?: string;
    price: number | string;
    total: number;
    quantity?: number;
    type?: string;
    category?: string;
    notes?: string;
    dosage?: string;
    route?: string;
    frequency?: string;
    duration?: string;
    drug_id?: number;
    test_id?: number;
    service_id?: number;
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

interface InvoiceModalProps {
    isOpen: boolean;
    onClose: () => void;
    invoice: Invoice | null;
    patientName: string;
}

// Helper to format currency
const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-ZM', {
        style: 'currency',
        currency: 'ZMW',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }).format(amount);
};

// Helper to format date
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

const getStatusConfig = (status: string) => {
    const configs: Record<
        string,
        { label: string; color: string; icon: React.ReactNode }
    > = {
        paid: {
            label: 'Paid',
            color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
            icon: <CheckCircle className="h-4 w-4" />,
        },
        unpaid: {
            label: 'Unpaid',
            color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
            icon: <AlertCircle className="h-4 w-4" />,
        },
        partial: {
            label: 'Partial',
            color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
            icon: <Clock className="h-4 w-4" />,
        },
        draft: {
            label: 'Draft',
            color: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400',
            icon: <FileText className="h-4 w-4" />,
        },
        cancelled: {
            label: 'Cancelled',
            color: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400',
            icon: <X className="h-4 w-4" />,
        },
    };
    return configs[status] || configs.draft;
};

export const InvoiceModal: React.FC<InvoiceModalProps> = ({
    isOpen,
    onClose,
    invoice,
    patientName,
}) => {
    const modalRef = useRef<HTMLDivElement>(null);

    // Handle escape key
    useEffect(() => {
        const handleEsc = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && isOpen) {
                onClose();
            }
        };
        window.addEventListener('keydown', handleEsc);
        return () => window.removeEventListener('keydown', handleEsc);
    }, [isOpen, onClose]);

    // Handle click outside
    const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
        if (e.target === e.currentTarget) {
            onClose();
        }
    };

    // Prevent body scroll when modal is open
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

    if (!isOpen || !invoice) return null;

    const statusConfig = getStatusConfig(invoice.status);
    const isPaid = invoice.status === 'paid';
    const isOverdue =
        invoice.due_date && new Date(invoice.due_date) < new Date() && !isPaid;

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm transition-opacity duration-300"
            onClick={handleOverlayClick}
        >
            <div
                ref={modalRef}
                className="relative flex h-[90vh] w-full max-w-5xl flex-col overflow-hidden rounded-xl bg-slate-50 shadow-2xl dark:bg-slate-900"
            >
                {/* Header - Fixed */}
                <div className="flex-shrink-0 border-b border-slate-200 bg-white p-6 dark:border-slate-700 dark:bg-slate-800">
                    <div className="flex items-start justify-between">
                        <div className="flex items-start gap-4">
                            <div className="rounded-lg bg-blue-50 p-3 dark:bg-blue-900/20">
                                <Receipt className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                            </div>
                            <div>
                                <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
                                    Invoice Details
                                </h2>
                                <div className="mt-1 flex flex-wrap items-center gap-3">
                                    <span className="font-mono text-sm text-slate-500 dark:text-slate-400">
                                        {invoice.invoice_number}
                                    </span>
                                    <Badge
                                        className={cn(
                                            'flex items-center gap-1.5',
                                            statusConfig.color,
                                        )}
                                    >
                                        {statusConfig.icon}
                                        {statusConfig.label}
                                    </Badge>
                                    {isOverdue && (
                                        <Badge
                                            variant="destructive"
                                            className="flex items-center gap-1"
                                        >
                                            <AlertCircle className="h-3 w-3" />
                                            Overdue
                                        </Badge>
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
                <ScrollArea className="flex-1 p-6">
                    <div className="space-y-6">
                        {/* Patient & Invoice Info */}
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                            <div className="rounded-lg bg-white p-4 shadow-sm dark:bg-slate-800">
                                <h4 className="mb-3 text-sm font-medium text-slate-500 dark:text-slate-400">
                                    Patient Information
                                </h4>
                                <div className="space-y-2">
                                    <div className="flex items-center gap-2">
                                        <User className="h-4 w-4 text-slate-400" />
                                        <span className="font-medium text-slate-900 dark:text-white">
                                            {patientName}
                                        </span>
                                    </div>
                                    {invoice.customer_phone && (
                                        <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
                                            <Phone className="h-4 w-4 text-slate-400" />
                                            {invoice.customer_phone}
                                        </div>
                                    )}
                                    {invoice.customer_email && (
                                        <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
                                            <Mail className="h-4 w-4 text-slate-400" />
                                            {invoice.customer_email}
                                        </div>
                                    )}
                                    {invoice.customer_address && (
                                        <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
                                            <Building2 className="h-4 w-4 text-slate-400" />
                                            {invoice.customer_address}
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="rounded-lg bg-white p-4 shadow-sm dark:bg-slate-800">
                                <h4 className="mb-3 text-sm font-medium text-slate-500 dark:text-slate-400">
                                    Invoice Information
                                </h4>
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between text-sm">
                                        <span className="text-slate-500 dark:text-slate-400">
                                            Payment Scheme
                                        </span>
                                        <span className="font-medium text-slate-900 capitalize dark:text-white">
                                            {invoice.payment_scheme || 'N/A'}
                                        </span>
                                    </div>
                                    <div className="flex items-center justify-between text-sm">
                                        <span className="text-slate-500 dark:text-slate-400">
                                            Issue Date
                                        </span>
                                        <span className="font-medium text-slate-900 dark:text-white">
                                            {formatDate(invoice.issue_date)}
                                        </span>
                                    </div>
                                    <div className="flex items-center justify-between text-sm">
                                        <span className="text-slate-500 dark:text-slate-400">
                                            Due Date
                                        </span>
                                        <span
                                            className={cn(
                                                'font-medium',
                                                isOverdue
                                                    ? 'text-red-600 dark:text-red-400'
                                                    : 'text-slate-900 dark:text-white',
                                            )}
                                        >
                                            {formatDate(invoice.due_date)}
                                        </span>
                                    </div>
                                    {invoice.paid_date && (
                                        <div className="flex items-center justify-between text-sm">
                                            <span className="text-slate-500 dark:text-slate-400">
                                                Paid Date
                                            </span>
                                            <span className="font-medium text-emerald-600 dark:text-emerald-400">
                                                {formatDate(invoice.paid_date)}
                                            </span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Invoice Items */}
                        <div className="overflow-hidden rounded-lg bg-white shadow-sm dark:bg-slate-800">
                            <div className="border-b border-slate-200 px-4 py-3 dark:border-slate-700">
                                <h4 className="text-sm font-medium text-slate-700 dark:text-slate-300">
                                    Invoice Items
                                </h4>
                            </div>
                            <div className="overflow-x-auto">
                                <Table>
                                    <TableHeader>
                                        <TableRow className="bg-slate-50 dark:bg-slate-900/50">
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
                                            invoice.items.map((item, index) => (
                                                <TableRow
                                                    key={index}
                                                    className="hover:bg-slate-50 dark:hover:bg-slate-900/50"
                                                >
                                                    <TableCell className="font-medium text-slate-900 dark:text-white">
                                                        {item.name ||
                                                            item.category ||
                                                            'Item'}
                                                        {item.notes && (
                                                            <div className="text-xs text-slate-500 dark:text-slate-400">
                                                                {item.notes}
                                                            </div>
                                                        )}
                                                        {item.dosage && (
                                                            <div className="text-xs text-slate-500 dark:text-slate-400">
                                                                {item.dosage}{' '}
                                                                {item.route &&
                                                                    `• ${item.route}`}
                                                                {item.frequency &&
                                                                    `• ${item.frequency}`}
                                                                {item.duration &&
                                                                    `• ${item.duration}`}
                                                            </div>
                                                        )}
                                                    </TableCell>
                                                    <TableCell className="text-slate-600 capitalize dark:text-slate-300">
                                                        {item.type ||
                                                            item.category ||
                                                            'Service'}
                                                    </TableCell>
                                                    <TableCell className="text-right text-slate-600 dark:text-slate-300">
                                                        {item.quantity || 1}
                                                    </TableCell>
                                                    <TableCell className="text-right text-slate-600 dark:text-slate-300">
                                                        {formatCurrency(
                                                            Number(item.price),
                                                        )}
                                                    </TableCell>
                                                    <TableCell className="text-right font-medium text-slate-900 dark:text-white">
                                                        {formatCurrency(
                                                            item.total,
                                                        )}
                                                    </TableCell>
                                                </TableRow>
                                            ))
                                        ) : (
                                            <TableRow>
                                                <TableCell
                                                    colSpan={5}
                                                    className="py-8 text-center text-slate-500 dark:text-slate-400"
                                                >
                                                    No items found
                                                </TableCell>
                                            </TableRow>
                                        )}
                                    </TableBody>
                                </Table>
                            </div>
                        </div>

                        {/* Summary */}
                        <div className="rounded-lg bg-white p-4 shadow-sm dark:bg-slate-800">
                            <div className="ml-auto max-w-xs space-y-2">
                                <div className="flex items-center justify-between text-sm">
                                    <span className="text-slate-500 dark:text-slate-400">
                                        Subtotal
                                    </span>
                                    <span className="font-medium text-slate-900 dark:text-white">
                                        {formatCurrency(invoice.subtotal)}
                                    </span>
                                </div>
                                {invoice.tax > 0 && (
                                    <div className="flex items-center justify-between text-sm">
                                        <span className="text-slate-500 dark:text-slate-400">
                                            Tax
                                        </span>
                                        <span className="font-medium text-slate-900 dark:text-white">
                                            {formatCurrency(invoice.tax)}
                                        </span>
                                    </div>
                                )}
                                {invoice.discount > 0 && (
                                    <div className="flex items-center justify-between text-sm">
                                        <span className="text-slate-500 dark:text-slate-400">
                                            Discount
                                        </span>
                                        <span className="font-medium text-red-600 dark:text-red-400">
                                            -{formatCurrency(invoice.discount)}
                                        </span>
                                    </div>
                                )}
                                <div className="border-t border-slate-200 pt-2 dark:border-slate-700">
                                    <div className="flex items-center justify-between">
                                        <span className="text-base font-bold text-slate-900 dark:text-white">
                                            Total
                                        </span>
                                        <span className="text-xl font-bold text-slate-900 dark:text-white">
                                            {formatCurrency(invoice.total)}
                                        </span>
                                    </div>
                                </div>
                                {invoice.paid_amount > 0 && (
                                    <div className="flex items-center justify-between text-sm">
                                        <span className="text-slate-500 dark:text-slate-400">
                                            Paid Amount
                                        </span>
                                        <span className="font-medium text-emerald-600 dark:text-emerald-400">
                                            {formatCurrency(
                                                invoice.paid_amount,
                                            )}
                                        </span>
                                    </div>
                                )}
                                {invoice.balance > 0 && (
                                    <div className="flex items-center justify-between rounded-lg bg-amber-50 p-2 dark:bg-amber-950/30">
                                        <span className="text-sm font-medium text-amber-700 dark:text-amber-400">
                                            Balance Due
                                        </span>
                                        <span className="text-lg font-bold text-amber-700 dark:text-amber-400">
                                            {formatCurrency(invoice.balance)}
                                        </span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </ScrollArea>

                {/* Footer - Fixed */}
                <div className="flex-shrink-0 border-t border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                            <span className="text-xs text-slate-500 dark:text-slate-400">
                                {invoice.items?.length || 0} items
                            </span>
                            <span className="h-4 w-px bg-slate-200 dark:bg-slate-700" />
                            <span className="text-xs text-slate-500 dark:text-slate-400">
                                Created: {formatDate(invoice.created_at)}
                            </span>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                className="gap-1.5"
                                onClick={() => window.print()}
                            >
                                <Printer className="h-4 w-4" />
                                Print
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                className="gap-1.5"
                            >
                                <Download className="h-4 w-4" />
                                PDF
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                className="gap-1.5"
                            >
                                <Mail className="h-4 w-4" />
                                Email
                            </Button>
                            {invoice.balance > 0 && (
                                <Button
                                    variant="default"
                                    size="sm"
                                    className="gap-1.5 bg-emerald-600 hover:bg-emerald-700"
                                >
                                    <CreditCard className="h-4 w-4" />
                                    Record Payment
                                </Button>
                            )}
                            <Button
                                variant="default"
                                size="sm"
                                className="gap-1.5"
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
