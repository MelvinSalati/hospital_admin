// pages/patients/bills.tsx

import PatientLayout from '@/layouts/patients/PatientLayout';
import { usePage, router } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { useState, useEffect } from 'react';
import {
    FileText,
    AlertCircle,
    CheckCircle,
    Clock,
    XCircle,
    Eye,
    Printer,
    Download,
    Search,
    ChevronLeft,
    ChevronRight,
    CreditCard,
    Calendar,
    User,
    DollarSign,
    Receipt,
    Plus,
    Filter,
    TrendingUp,
    TrendingDown,
    Wallet,
    Banknote,
    RefreshCw,
} from 'lucide-react';

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

    const formatCurrency = (amount: number) => {
        return `ZMW ${amount.toLocaleString('en-ZM', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    };

    const formatDate = (dateStr: string) => {
        try {
            const date = new Date(dateStr);
            return date.toLocaleDateString('en-US', {
                weekday: 'short',
                year: 'numeric',
                month: 'short',
                day: 'numeric',
            });
        } catch {
            return dateStr;
        }
    };

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
                                <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
                                    <DollarSign className="h-3 w-3" />
                                    <span className="text-[8px] uppercase">
                                        Total
                                    </span>
                                </div>
                                <p className="mt-0.5 text-sm font-bold text-slate-800 dark:text-slate-100">
                                    {formatCurrency(invoice.total)}
                                </p>
                            </div>
                            <div className="rounded-lg border border-slate-200 bg-slate-50 p-2 dark:border-slate-700 dark:bg-slate-800/50">
                                <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
                                    <Wallet className="h-3 w-3" />
                                    <span className="text-[8px] uppercase">
                                        Due
                                    </span>
                                </div>
                                <p className="mt-0.5 text-sm font-bold text-amber-600 dark:text-amber-400">
                                    {formatCurrency(invoice.due_amount)}
                                </p>
                            </div>
                            <div className="rounded-lg border border-slate-200 bg-slate-50 p-2 dark:border-slate-700 dark:bg-slate-800/50">
                                <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
                                    <CreditCard className="h-3 w-3" />
                                    <span className="text-[8px] uppercase">
                                        Payment
                                    </span>
                                </div>
                                <p className="mt-0.5 text-sm font-medium text-slate-800 capitalize dark:text-slate-100">
                                    {invoice.payment_scheme}
                                </p>
                            </div>
                            <div className="rounded-lg border border-slate-200 bg-slate-50 p-2 dark:border-slate-700 dark:bg-slate-800/50">
                                <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
                                    <Calendar className="h-3 w-3" />
                                    <span className="text-[8px] uppercase">
                                        Due Date
                                    </span>
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
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<string>('all');
    const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(
        null,
    );
    const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

    // Pagination
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 5;

    // Ensure invoices is an array
    const safeInvoices = Array.isArray(invoices) ? invoices : [];

    // Reset pagination when filters change
    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm, statusFilter]);

    // Format currency
    const formatCurrency = (amount: number) => {
        return `ZMW ${amount.toLocaleString('en-ZM', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    };

    // Format date
    const formatDate = (dateStr: string) => {
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

    // Get patient name
    const patientName =
        patient?.name ||
        `${patient?.first_name || ''} ${patient?.last_name || ''}`.trim() ||
        'Patient';

    // Filter invoices
    const filteredInvoices = safeInvoices.filter((invoice) => {
        const matchesSearch =
            searchTerm === '' ||
            invoice.invoice_number
                .toLowerCase()
                .includes(searchTerm.toLowerCase()) ||
            invoice.items.some((item) =>
                item.name.toLowerCase().includes(searchTerm.toLowerCase()),
            );

        const matchesStatus =
            statusFilter === 'all' || invoice.status === statusFilter;

        return matchesSearch && matchesStatus;
    });

    // Pagination calculations
    const totalPages = Math.max(
        1,
        Math.ceil(filteredInvoices.length / itemsPerPage),
    );
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const paginatedInvoices = filteredInvoices.slice(startIndex, endIndex);

    // Status counts
    const statusCounts = {
        all: safeInvoices.length,
        paid: safeInvoices.filter((i) => i.status === 'paid').length,
        unpaid: safeInvoices.filter((i) => i.status === 'unpaid').length,
        partial: safeInvoices.filter((i) => i.status === 'partial').length,
        draft: safeInvoices.filter((i) => i.status === 'draft').length,
        cancelled: safeInvoices.filter((i) => i.status === 'cancelled').length,
    };

    // Total amounts
    const totalAmount = safeInvoices.reduce((sum, i) => sum + i.total, 0);
    const totalDue = safeInvoices.reduce((sum, i) => sum + i.due_amount, 0);

    const goToPage = (page: number) => {
        if (page >= 1 && page <= totalPages) {
            setCurrentPage(page);
        }
    };

    const getPageNumbers = () => {
        const pageNumbers = [];
        const maxPagesToShow = 5;

        if (totalPages <= maxPagesToShow) {
            for (let i = 1; i <= totalPages; i++) {
                pageNumbers.push(i);
            }
        } else {
            if (currentPage <= 3) {
                for (let i = 1; i <= maxPagesToShow; i++) {
                    pageNumbers.push(i);
                }
            } else if (currentPage >= totalPages - 2) {
                for (
                    let i = totalPages - maxPagesToShow + 1;
                    i <= totalPages;
                    i++
                ) {
                    pageNumbers.push(i);
                }
            } else {
                for (let i = currentPage - 2; i <= currentPage + 2; i++) {
                    pageNumbers.push(i);
                }
            }
        }
        return pageNumbers;
    };

    const handleViewInvoice = (invoice: Invoice) => {
        setSelectedInvoice(invoice);
        setIsDetailModalOpen(true);
    };

    // Show error if exists
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

    return (
        <PatientLayout
            breadcrumbs={[
                { title: 'Patient', href: '/' },
                { title: 'Bills', href: '/' },
            ]}
        >
            <div className="flex h-full min-h-screen flex-1 flex-col gap-3 bg-slate-50 p-3 dark:bg-slate-900">
                {/* Header */}
                <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                        <h1 className="text-sm font-bold text-slate-800 dark:text-slate-100">
                            Patient Bills
                        </h1>
                        <p className="text-[10px] text-slate-500 dark:text-slate-400">
                            {patientName} • {safeInvoices.length} invoice
                            {safeInvoices.length !== 1 ? 's' : ''}
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1 text-[10px] text-slate-500 dark:text-slate-400">
                            <Wallet className="h-3 w-3" />
                            <span>Total: {formatCurrency(totalAmount)}</span>
                        </div>
                        <div className="flex items-center gap-1 text-[10px] text-amber-600 dark:text-amber-400">
                            <AlertCircle className="h-3 w-3" />
                            <span>Due: {formatCurrency(totalDue)}</span>
                        </div>
                    </div>
                </div>

                {/* Summary Stats */}
                <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3 lg:grid-cols-6">
                    <StatCard
                        label="Total"
                        value={safeInvoices.length}
                        color="blue"
                    />
                    <StatCard
                        label="Paid"
                        value={statusCounts.paid}
                        color="emerald"
                    />
                    <StatCard
                        label="Unpaid"
                        value={statusCounts.unpaid}
                        color="red"
                    />
                    <StatCard
                        label="Partial"
                        value={statusCounts.partial}
                        color="amber"
                    />
                    <StatCard
                        label="Draft"
                        value={statusCounts.draft}
                        color="slate"
                    />
                    <StatCard
                        label="Cancelled"
                        value={statusCounts.cancelled}
                        color="gray"
                    />
                </div>

                {/* Search and Filter */}
                <div className="flex flex-wrap items-center gap-2">
                    <div className="relative min-w-[180px] flex-1">
                        <Search className="absolute top-1/2 left-2 h-3 w-3 -translate-y-1/2 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Search invoices..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="h-7 w-full rounded-lg border border-slate-200 pr-2 pl-7 text-[10px] focus:border-blue-400 focus:ring-1 focus:ring-blue-400 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                        />
                    </div>

                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="h-7 rounded-lg border border-slate-200 px-2 pr-6 text-[10px] focus:border-blue-400 focus:ring-1 focus:ring-blue-400 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                    >
                        <option value="all">All Status</option>
                        <option value="paid">Paid</option>
                        <option value="unpaid">Unpaid</option>
                        <option value="partial">Partial</option>
                        <option value="draft">Draft</option>
                        <option value="cancelled">Cancelled</option>
                    </select>

                    <Button
                        onClick={() => router.reload()}
                        variant="outline"
                        size="sm"
                        className="h-7 px-2.5 text-[10px]"
                    >
                        <RefreshCw className="h-3 w-3" />
                    </Button>
                </div>

                {/* Table */}
                {paginatedInvoices.length === 0 ? (
                    <div className="rounded-lg border border-slate-200 bg-white p-8 text-center shadow-sm dark:border-slate-700 dark:bg-slate-800/90">
                        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-700">
                            <Receipt className="h-6 w-6 text-slate-400" />
                        </div>
                        <h3 className="mt-2 text-sm font-medium text-slate-800 dark:text-slate-200">
                            No invoices found
                        </h3>
                        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                            {searchTerm || statusFilter !== 'all'
                                ? 'Try adjusting your filters'
                                : 'No invoices available for this patient'}
                        </p>
                        {(searchTerm || statusFilter !== 'all') && (
                            <button
                                onClick={() => {
                                    setSearchTerm('');
                                    setStatusFilter('all');
                                }}
                                className="mt-2 text-[10px] text-blue-600 hover:text-blue-700 dark:text-blue-400"
                            >
                                Clear filters
                            </button>
                        )}
                    </div>
                ) : (
                    <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800/90">
                        <table className="w-full">
                            <thead className="border-b border-slate-200 bg-slate-50 text-[9px] text-slate-600 uppercase dark:border-slate-700 dark:bg-slate-800/50 dark:text-slate-400">
                                <tr>
                                    <th className="px-2 py-1.5 text-left">
                                        Invoice
                                    </th>
                                    <th className="px-2 py-1.5 text-left">
                                        Items
                                    </th>
                                    <th className="px-2 py-1.5 text-right">
                                        Total
                                    </th>
                                    <th className="px-2 py-1.5 text-right">
                                        Due
                                    </th>
                                    <th className="px-2 py-1.5 text-center">
                                        Status
                                    </th>
                                    <th className="px-2 py-1.5 text-left">
                                        Date
                                    </th>
                                    <th className="px-2 py-1.5 text-center">
                                        Action
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 text-[10px] dark:divide-slate-700/50">
                                {paginatedInvoices.map((invoice) => (
                                    <tr
                                        key={invoice.id}
                                        className="hover:bg-slate-50 dark:hover:bg-slate-800/50"
                                    >
                                        <td className="px-2 py-1.5">
                                            <div className="font-mono text-[9px] font-medium text-slate-700 dark:text-slate-300">
                                                {invoice.invoice_number}
                                            </div>
                                        </td>
                                        <td className="px-2 py-1.5">
                                            <span className="inline-flex items-center justify-center rounded bg-slate-100 px-1.5 py-0.5 text-[9px] font-medium dark:bg-slate-700">
                                                {invoice.items_count} items
                                            </span>
                                        </td>
                                        <td className="px-2 py-1.5 text-right font-medium text-slate-800 dark:text-slate-200">
                                            {formatCurrency(invoice.total)}
                                        </td>
                                        <td className="px-2 py-1.5 text-right font-medium text-amber-600 dark:text-amber-400">
                                            {formatCurrency(invoice.due_amount)}
                                        </td>
                                        <td className="px-2 py-1.5 text-center">
                                            <InvoiceStatusBadge
                                                status={invoice.status}
                                            />
                                        </td>
                                        <td className="px-2 py-1.5">
                                            <span className="text-[9px] text-slate-500 dark:text-slate-400">
                                                {formatDate(invoice.issue_date)}
                                            </span>
                                        </td>
                                        <td className="px-2 py-1.5 text-center">
                                            <button
                                                onClick={() =>
                                                    handleViewInvoice(invoice)
                                                }
                                                className="rounded p-1 text-blue-600 transition-colors hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-950/30"
                                                title="View details"
                                            >
                                                <Eye className="h-3 w-3" />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* Pagination */}
                {totalPages > 1 && (
                    <div className="flex items-center justify-between">
                        <span className="text-[9px] text-slate-500 dark:text-slate-400">
                            {filteredInvoices.length > 0 ? startIndex + 1 : 0}-
                            {Math.min(endIndex, filteredInvoices.length)} of{' '}
                            {filteredInvoices.length}
                        </span>
                        <div className="flex items-center gap-0.5">
                            <button
                                onClick={() => goToPage(currentPage - 1)}
                                disabled={currentPage === 1}
                                className="rounded border border-slate-200 p-0.5 disabled:opacity-50 dark:border-slate-700"
                            >
                                <ChevronLeft className="h-3 w-3" />
                            </button>
                            {getPageNumbers().map((page) => (
                                <button
                                    key={page}
                                    onClick={() => goToPage(page)}
                                    className={`min-w-[24px] rounded px-1.5 py-0.5 text-[9px] font-medium ${
                                        currentPage === page
                                            ? 'bg-blue-600 text-white'
                                            : 'text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-700'
                                    }`}
                                >
                                    {page}
                                </button>
                            ))}
                            <button
                                onClick={() => goToPage(currentPage + 1)}
                                disabled={currentPage === totalPages}
                                className="rounded border border-slate-200 p-0.5 disabled:opacity-50 dark:border-slate-700"
                            >
                                <ChevronRight className="h-3 w-3" />
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Invoice Detail Modal */}
            <InvoiceDetailModal
                isOpen={isDetailModalOpen}
                onClose={() => {
                    setIsDetailModalOpen(false);
                    setSelectedInvoice(null);
                }}
                invoice={selectedInvoice}
            />
        </PatientLayout>
    );
}

// ============================================================================
// Stat Card Component
// ============================================================================

const StatCard: React.FC<{
    label: string;
    value: number;
    color: 'blue' | 'emerald' | 'red' | 'amber' | 'slate' | 'gray';
}> = ({ label, value, color }) => {
    const colors = {
        blue: 'bg-blue-50 text-blue-700 dark:bg-blue-950/30 dark:text-blue-400',
        emerald:
            'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400',
        red: 'bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-400',
        amber: 'bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400',
        slate: 'bg-slate-50 text-slate-700 dark:bg-slate-800 dark:text-slate-400',
        gray: 'bg-gray-50 text-gray-700 dark:bg-gray-800 dark:text-gray-400',
    };

    return (
        <div className={`rounded-lg px-2 py-1.5 text-center ${colors[color]}`}>
            <div className="text-[10px] font-medium tracking-wider uppercase">
                {label}
            </div>
            <div className="text-sm font-bold">{value}</div>
        </div>
    );
};
