// components/dispensed/DispensedDrugsTable.tsx

import React, { useState } from 'react';
import {
    Search,
    ChevronLeft,
    ChevronRight,
    Eye,
    CheckCircle,
    Clock,
    XCircle,
    Package,
    User,
    Calendar,
} from 'lucide-react';
import DispensationDetailModal from './DispensationModal';

// ============================================================================
// Types
// ============================================================================

interface DispensedDrug {
    id: string;
    invoiceNumber: string;
    patientName: string;
    products: {
        name: string;
        quantity: number;
    }[];
    totalQuantity: number;
    totalAmount: number;
    status: 'completed' | 'pending' | 'cancelled';
    date: string;
}

// Extended detail type for modal
interface DispensedDrugDetail extends DispensedDrug {
    patientId?: string;
    patientAge?: number;
    patientGender?: 'Male' | 'Female' | 'Other';
    patientPhone?: string;
    patientEmail?: string;
    patientAddress?: string;
    time?: string;
    prescribedBy?: string;
    dispensedBy?: string;
    paymentMethod?: 'Cash' | 'Card' | 'Insurance' | 'Mobile Money';
    subtotal: number;
    tax?: number;
    discount?: number;
    insuranceProvider?: string;
    insuranceNumber?: string;
    notes?: string;
    followUpDate?: string;
    products: {
        name: string;
        quantity: number;
        unitPrice?: number;
        totalPrice?: number;
        dosage?: string;
        frequency?: string;
        duration?: string;
        instructions?: string;
    }[];
}

interface DispensedDrugsTableProps {
    transactions?: DispensedDrug[];
    onViewDetails?: (transaction: DispensedDrug) => void;
    onStatusChange?: (id: string, status: DispensedDrug['status']) => void;
}

// ============================================================================
// Status Badge Component
// ============================================================================

const StatusBadge: React.FC<{ status: DispensedDrug['status'] }> = ({
    status,
}) => {
    const config = {
        completed: {
            icon: <CheckCircle className="h-3 w-3" />,
            text: 'Completed',
            bgClass:
                'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400',
            borderClass: 'border-emerald-200 dark:border-emerald-800',
        },
        pending: {
            icon: <Clock className="h-3 w-3" />,
            text: 'Pending',
            bgClass:
                'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400',
            borderClass: 'border-amber-200 dark:border-amber-800',
        },
        cancelled: {
            icon: <XCircle className="h-3 w-3" />,
            text: 'Cancelled',
            bgClass:
                'bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400',
            borderClass: 'border-red-200 dark:border-red-800',
        },
    };

    const { icon, text, bgClass, borderClass } = config[status];

    return (
        <span
            className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium ${bgClass} ${borderClass}`}
        >
            {icon}
            {text}
        </span>
    );
};

// ============================================================================
// Products Cell Component
// ============================================================================

const ProductsCell: React.FC<{ products: DispensedDrug['products'] }> = ({
    products,
}) => {
    const [expanded, setExpanded] = useState(false);
    const displayLimit = 2;
    const hasMore = products.length > displayLimit;
    const visibleProducts = expanded
        ? products
        : products.slice(0, displayLimit);

    return (
        <div className="min-w-[130px]">
            <div className="flex flex-wrap items-center gap-0.5">
                {visibleProducts.map((product, idx) => (
                    <span
                        key={idx}
                        className="inline-flex items-center gap-0.5 rounded bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-700 dark:bg-slate-700 dark:text-slate-300"
                    >
                        <Package className="h-2.5 w-2.5" />
                        {product.name}
                        <span className="font-mono text-[9px] text-slate-500">
                            x{product.quantity}
                        </span>
                    </span>
                ))}
                {hasMore && (
                    <button
                        onClick={() => setExpanded(!expanded)}
                        className="text-[9px] font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400"
                    >
                        {expanded
                            ? 'less'
                            : `+${products.length - displayLimit}`}
                    </button>
                )}
            </div>
        </div>
    );
};

// ============================================================================
// Main Component
// ============================================================================

export default function DispensedDrugsTable({
    transactions = defaultTransactions,
    onViewDetails,
    onStatusChange,
}: DispensedDrugsTableProps) {
    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [statusFilter, setStatusFilter] = useState<
        DispensedDrug['status'] | 'all'
    >('all');
    const [selectedTransaction, setSelectedTransaction] =
        useState<DispensedDrugDetail | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const itemsPerPage = 5;

    // Status counts
    const statusCounts = {
        completed: transactions.filter((t) => t.status === 'completed').length,
        pending: transactions.filter((t) => t.status === 'pending').length,
        cancelled: transactions.filter((t) => t.status === 'cancelled').length,
    };

    // Filter transactions
    const filteredTransactions = transactions.filter((transaction) => {
        const matchesSearch =
            searchTerm === '' ||
            transaction.invoiceNumber
                .toLowerCase()
                .includes(searchTerm.toLowerCase()) ||
            transaction.patientName
                .toLowerCase()
                .includes(searchTerm.toLowerCase());
        const matchesStatus =
            statusFilter === 'all' || transaction.status === statusFilter;
        return matchesSearch && matchesStatus;
    });

    const totalPages = Math.ceil(filteredTransactions.length / itemsPerPage);
    const paginatedTransactions = filteredTransactions.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage,
    );

    const formatDate = (dateStr: string) => {
        const date = new Date(dateStr);
        return date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
        });
    };

    const formatCurrency = (amount: number) => {
        return `ZMW ${amount.toLocaleString('en-ZM', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    };

    // Handle view details - convert to full detail
    const handleViewDetails = (transaction: DispensedDrug) => {
        const fullDetail: DispensedDrugDetail = {
            ...transaction,
            subtotal: transaction.totalAmount,
            products: transaction.products.map((p) => ({
                ...p,
                unitPrice: transaction.totalAmount / transaction.totalQuantity,
                totalPrice:
                    (transaction.totalAmount / transaction.totalQuantity) *
                    p.quantity,
            })),
            prescribedBy: 'Dr. Smith',
            dispensedBy: 'Pharm. Johnson',
            paymentMethod: 'Cash',
            patientId: 'P-1001',
            patientAge: 45,
            patientGender: 'Male',
            patientPhone: '+260 971 234 567',
            patientEmail: 'patient@email.com',
            notes: 'Patient advised to complete full course of medication',
        };
        setSelectedTransaction(fullDetail);
        setIsModalOpen(true);
        onViewDetails?.(transaction);
    };

    // Modal handlers
    const handlePrint = (transaction: DispensedDrugDetail) => {
        window.print();
    };

    const handleDownload = (transaction: DispensedDrugDetail) => {
        console.log('Downloading:', transaction.invoiceNumber);
    };

    const handleEmail = (transaction: DispensedDrugDetail) => {
        console.log('Emailing to:', transaction.patientEmail);
    };

    return (
        <>
            <div className="rounded-lg border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800/90">
                {/* Header */}
                <div className="border-b border-slate-200 px-4 py-2.5 dark:border-slate-700">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-3">
                            <div>
                                <h4 className="text-xs font-semibold text-slate-800 dark:text-slate-100">
                                    💊 Dispensed Drugs
                                </h4>
                                <p className="text-[10px] text-slate-500 dark:text-slate-400">
                                    {filteredTransactions.length} total
                                </p>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <span className="flex items-center gap-0.5 rounded-full bg-emerald-100 px-2 py-0.5 text-[9px] font-medium text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400">
                                    <CheckCircle className="h-2.5 w-2.5" />
                                    {statusCounts.completed}
                                </span>
                                <span className="flex items-center gap-0.5 rounded-full bg-amber-100 px-2 py-0.5 text-[9px] font-medium text-amber-700 dark:bg-amber-950/40 dark:text-amber-400">
                                    <Clock className="h-2.5 w-2.5" />
                                    {statusCounts.pending}
                                </span>
                                <span className="flex items-center gap-0.5 rounded-full bg-red-100 px-2 py-0.5 text-[9px] font-medium text-red-700 dark:bg-red-950/40 dark:text-red-400">
                                    <XCircle className="h-2.5 w-2.5" />
                                    {statusCounts.cancelled}
                                </span>
                            </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                            <div className="flex items-center gap-0.5 rounded border border-slate-200 bg-white p-0.5 dark:border-slate-700 dark:bg-slate-800">
                                <button
                                    onClick={() => setStatusFilter('all')}
                                    className={`rounded px-2 py-0.5 text-[9px] font-medium transition-colors ${
                                        statusFilter === 'all'
                                            ? 'bg-slate-800 text-white dark:bg-slate-600'
                                            : 'text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-700'
                                    }`}
                                >
                                    All
                                </button>
                                <button
                                    onClick={() => setStatusFilter('completed')}
                                    className={`rounded px-2 py-0.5 text-[9px] font-medium transition-colors ${
                                        statusFilter === 'completed'
                                            ? 'bg-emerald-600 text-white'
                                            : 'text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-700'
                                    }`}
                                >
                                    ✓ {statusCounts.completed}
                                </button>
                                <button
                                    onClick={() => setStatusFilter('pending')}
                                    className={`rounded px-2 py-0.5 text-[9px] font-medium transition-colors ${
                                        statusFilter === 'pending'
                                            ? 'bg-amber-500 text-white'
                                            : 'text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-700'
                                    }`}
                                >
                                    ⏳ {statusCounts.pending}
                                </button>
                                <button
                                    onClick={() => setStatusFilter('cancelled')}
                                    className={`rounded px-2 py-0.5 text-[9px] font-medium transition-colors ${
                                        statusFilter === 'cancelled'
                                            ? 'bg-red-500 text-white'
                                            : 'text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-700'
                                    }`}
                                >
                                    ✕ {statusCounts.cancelled}
                                </button>
                            </div>

                            <div className="relative">
                                <Search className="absolute top-1/2 left-2 h-3 w-3 -translate-y-1/2 text-slate-400" />
                                <input
                                    type="text"
                                    placeholder="Search..."
                                    value={searchTerm}
                                    onChange={(e) => {
                                        setSearchTerm(e.target.value);
                                        setCurrentPage(1);
                                    }}
                                    className="w-32 rounded border border-slate-200 py-0.5 pr-2 pl-7 text-[10px] placeholder:text-slate-400 focus:border-blue-400 focus:ring-1 focus:ring-blue-400 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Table */}
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="border-b border-slate-200 bg-slate-50 text-[9px] text-slate-600 uppercase dark:border-slate-700 dark:bg-slate-800/50 dark:text-slate-400">
                            <tr>
                                <th className="px-3 py-2 text-left">Invoice</th>
                                <th className="px-3 py-2 text-left">Patient</th>
                                <th className="px-3 py-2 text-left">
                                    Products
                                </th>
                                <th className="px-3 py-2 text-center">Qty</th>
                                <th className="px-3 py-2 text-right">Total</th>
                                <th className="px-3 py-2 text-center">
                                    Status
                                </th>
                                <th className="px-3 py-2 text-left">Date</th>
                                <th className="px-3 py-2 text-center">
                                    Action
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {paginatedTransactions.length === 0 ? (
                                <tr>
                                    <td
                                        colSpan={8}
                                        className="px-3 py-8 text-center text-xs text-slate-500 dark:text-slate-400"
                                    >
                                        <Package className="mx-auto h-8 w-8 text-slate-300 dark:text-slate-600" />
                                        <p className="mt-1">
                                            No dispensed drugs found
                                        </p>
                                        <button
                                            onClick={() => {
                                                setSearchTerm('');
                                                setStatusFilter('all');
                                            }}
                                            className="mt-1 text-[10px] text-blue-600 hover:text-blue-700 dark:text-blue-400"
                                        >
                                            Clear filters
                                        </button>
                                    </td>
                                </tr>
                            ) : (
                                paginatedTransactions.map((transaction) => (
                                    <tr
                                        key={transaction.id}
                                        className="border-b border-slate-100 text-[11px] hover:bg-slate-50 dark:border-slate-700/50 dark:hover:bg-slate-800/50"
                                    >
                                        <td className="px-3 py-2 font-mono text-[10px] font-medium text-slate-700 dark:text-slate-300">
                                            {transaction.invoiceNumber}
                                        </td>
                                        <td className="px-3 py-2">
                                            <div className="flex items-center gap-1.5">
                                                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/30">
                                                    <User className="h-3 w-3 text-blue-600 dark:text-blue-400" />
                                                </div>
                                                <span className="text-[11px] font-medium text-slate-700 dark:text-slate-300">
                                                    {transaction.patientName}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-3 py-2">
                                            <ProductsCell
                                                products={transaction.products}
                                            />
                                        </td>
                                        <td className="px-3 py-2 text-center">
                                            <span className="inline-flex items-center justify-center rounded bg-slate-100 px-1.5 py-0.5 text-[9px] font-medium text-slate-700 dark:bg-slate-700 dark:text-slate-300">
                                                {transaction.totalQuantity}
                                            </span>
                                        </td>
                                        <td className="px-3 py-2 text-right">
                                            <span className="text-[11px] font-semibold text-slate-800 dark:text-slate-200">
                                                {formatCurrency(
                                                    transaction.totalAmount,
                                                )}
                                            </span>
                                        </td>
                                        <td className="px-3 py-2 text-center">
                                            <StatusBadge
                                                status={transaction.status}
                                            />
                                        </td>
                                        <td className="px-3 py-2">
                                            <div className="flex items-center gap-1">
                                                <Calendar className="h-3 w-3 text-slate-400" />
                                                <span className="text-[10px] text-slate-600 dark:text-slate-400">
                                                    {formatDate(
                                                        transaction.date,
                                                    )}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-3 py-2 text-center">
                                            <button
                                                onClick={() =>
                                                    handleViewDetails(
                                                        transaction,
                                                    )
                                                }
                                                className="inline-flex items-center gap-1 rounded px-2 py-0.5 text-[10px] font-medium text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-950/30"
                                            >
                                                <Eye className="h-3 w-3" />
                                                Details
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                    <div className="border-t border-slate-200 px-4 py-2 dark:border-slate-700">
                        <div className="flex items-center justify-between">
                            <p className="text-[10px] text-slate-500 dark:text-slate-400">
                                {filteredTransactions.length > 0
                                    ? (currentPage - 1) * itemsPerPage + 1
                                    : 0}
                                –
                                {Math.min(
                                    currentPage * itemsPerPage,
                                    filteredTransactions.length,
                                )}{' '}
                                of {filteredTransactions.length}
                            </p>
                            <div className="flex gap-0.5">
                                <button
                                    onClick={() =>
                                        setCurrentPage((p) =>
                                            Math.max(1, p - 1),
                                        )
                                    }
                                    disabled={currentPage === 1}
                                    className="rounded border border-slate-200 p-1 transition-colors hover:bg-slate-100 disabled:opacity-50 dark:border-slate-700 dark:hover:bg-slate-700"
                                >
                                    <ChevronLeft className="h-3.5 w-3.5" />
                                </button>
                                <span className="px-2 py-0.5 text-[10px] text-slate-600 dark:text-slate-400">
                                    {currentPage}/{totalPages}
                                </span>
                                <button
                                    onClick={() =>
                                        setCurrentPage((p) =>
                                            Math.min(totalPages, p + 1),
                                        )
                                    }
                                    disabled={currentPage === totalPages}
                                    className="rounded border border-slate-200 p-1 transition-colors hover:bg-slate-100 disabled:opacity-50 dark:border-slate-700 dark:hover:bg-slate-700"
                                >
                                    <ChevronRight className="h-3.5 w-3.5" />
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Detail Modal */}
            <DispensationDetailModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                transaction={selectedTransaction}
                onPrint={handlePrint}
                onDownload={handleDownload}
                onEmail={handleEmail}
            />
        </>
    );
}

// ============================================================================
// Default Mock Data
// ============================================================================

const defaultTransactions: DispensedDrug[] = [
    {
        id: '1',
        invoiceNumber: 'INV-2024-001',
        patientName: 'John Doe',
        products: [
            { name: 'Amoxicillin', quantity: 2 },
            { name: 'Paracetamol', quantity: 1 },
        ],
        totalQuantity: 3,
        totalAmount: 245.5,
        status: 'completed',
        date: '2024-01-15',
    },
    {
        id: '2',
        invoiceNumber: 'INV-2024-002',
        patientName: 'Jane Smith',
        products: [{ name: 'Ibuprofen', quantity: 2 }],
        totalQuantity: 2,
        totalAmount: 89.99,
        status: 'pending',
        date: '2024-01-15',
    },
    {
        id: '3',
        invoiceNumber: 'INV-2024-003',
        patientName: 'Robert Johnson',
        products: [
            { name: 'Omeprazole', quantity: 2 },
            { name: 'Metformin', quantity: 2 },
        ],
        totalQuantity: 4,
        totalAmount: 367.25,
        status: 'completed',
        date: '2024-01-14',
    },
    {
        id: '4',
        invoiceNumber: 'INV-2024-004',
        patientName: 'Maria Garcia',
        products: [{ name: 'Lisinopril', quantity: 1 }],
        totalQuantity: 1,
        totalAmount: 56.75,
        status: 'cancelled',
        date: '2024-01-14',
    },
    {
        id: '5',
        invoiceNumber: 'INV-2024-005',
        patientName: 'David Wilson',
        products: [
            { name: 'Amoxicillin', quantity: 2 },
            { name: 'Aspirin', quantity: 1 },
        ],
        totalQuantity: 3,
        totalAmount: 478.3,
        status: 'completed',
        date: '2024-01-13',
    },
    {
        id: '6',
        invoiceNumber: 'INV-2024-006',
        patientName: 'Sarah Brown',
        products: [
            { name: 'Losartan', quantity: 1 },
            { name: 'Hydrochlorothiazide', quantity: 1 },
            { name: 'Atorvastatin', quantity: 1 },
        ],
        totalQuantity: 3,
        totalAmount: 523.45,
        status: 'pending',
        date: '2024-01-16',
    },
];
