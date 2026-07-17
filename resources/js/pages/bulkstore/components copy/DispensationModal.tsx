import React, { useEffect, useRef } from 'react';
import {
    X,
    Package,
    User,
    Calendar,
    FileText,
    Receipt,
    CheckCircle,
    Clock,
    XCircle,
    Printer,
    Download,
    Mail,
    Phone,
    MapPin,
    Hash,
    CreditCard,
    Pill,
    ClipboardList,
    UserCircle,
    Building2,
    Stethoscope,
    AlertCircle,
    ArrowRight,
} from 'lucide-react';

// ============================================================================
// Types
// ============================================================================

interface ProductDetail {
    name: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
    dosage?: string;
    frequency?: string;
    duration?: string;
    instructions?: string;
}

interface DispensedDrugDetail {
    id: string;
    invoiceNumber: string;
    patientName: string;
    patientId?: string;
    patientAge?: number;
    patientGender?: 'Male' | 'Female' | 'Other';
    patientPhone?: string;
    patientEmail?: string;
    patientAddress?: string;
    products: ProductDetail[];
    totalQuantity: number;
    subtotal: number;
    tax?: number;
    discount?: number;
    totalAmount: number;
    status: 'completed' | 'pending' | 'cancelled';
    date: string;
    time?: string;
    prescribedBy?: string;
    dispensedBy?: string;
    paymentMethod?: 'Cash' | 'Card' | 'Insurance' | 'Mobile Money';
    insuranceProvider?: string;
    insuranceNumber?: string;
    notes?: string;
    followUpDate?: string;
}

interface DispensationModalProps {
    isOpen: boolean;
    onClose: () => void;
    transaction: DispensedDrugDetail | null;
    onPrint?: (transaction: DispensedDrugDetail) => void;
    onDownload?: (transaction: DispensedDrugDetail) => void;
    onEmail?: (transaction: DispensedDrugDetail) => void;
}

// ============================================================================
// Status Badge
// ============================================================================

const DetailStatusBadge: React.FC<{
    status: DispensedDrugDetail['status'];
}> = ({ status }) => {
    const config = {
        completed: {
            icon: <CheckCircle className="h-3 w-3" />,
            text: 'Completed',
            bgClass:
                'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400',
        },
        pending: {
            icon: <Clock className="h-3 w-3" />,
            text: 'Pending',
            bgClass:
                'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400',
        },
        cancelled: {
            icon: <XCircle className="h-3 w-3" />,
            text: 'Cancelled',
            bgClass:
                'bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400',
        },
    };

    const { icon, text, bgClass } = config[status];

    return (
        <span
            className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${bgClass}`}
        >
            {icon}
            {text}
        </span>
    );
};

// ============================================================================
// Info Row Component
// ============================================================================

const InfoRow: React.FC<{
    icon: React.ReactNode;
    label: string;
    value: string | React.ReactNode;
    className?: string;
}> = ({ icon, label, value, className = '' }) => (
    <div className={`flex items-start gap-2 ${className}`}>
        <div className="mt-0.5 text-slate-400 dark:text-slate-500">{icon}</div>
        <div className="flex-1">
            <p className="text-[9px] font-medium tracking-wide text-slate-500 uppercase dark:text-slate-400">
                {label}
            </p>
            <p className="text-xs font-medium text-slate-800 dark:text-slate-200">
                {value}
            </p>
        </div>
    </div>
);

// ============================================================================
// Main Modal Component
// ============================================================================

export default function DispensationModal({
    isOpen,
    onClose,
    transaction,
    onPrint,
    onDownload,
    onEmail,
}: DispensationModalProps) {
    const modalRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && isOpen) onClose();
        };
        document.addEventListener('keydown', handleEscape);
        return () => document.removeEventListener('keydown', handleEscape);
    }, [isOpen, onClose]);

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (
                modalRef.current &&
                !modalRef.current.contains(e.target as Node) &&
                isOpen
            ) {
                onClose();
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () =>
            document.removeEventListener('mousedown', handleClickOutside);
    }, [isOpen, onClose]);

    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
        return () => {
            document.body.style.overflow = '';
        };
    }, [isOpen]);

    if (!isOpen || !transaction) return null;

    const formatCurrency = (amount: number) => {
        return `ZMW ${amount.toLocaleString('en-ZM', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    };

    const formatDate = (dateStr: string) => {
        const date = new Date(dateStr);
        return date.toLocaleDateString('en-US', {
            weekday: 'short',
            year: 'numeric',
            month: 'short',
            day: 'numeric',
        });
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/50 p-4 backdrop-blur-sm">
            <div
                ref={modalRef}
                className="relative w-full max-w-4xl animate-in duration-200 fade-in zoom-in"
            >
                <div className="relative rounded-xl bg-white shadow-2xl dark:bg-slate-800">
                    {/* Compact Header */}
                    <div className="flex items-center justify-between border-b border-slate-200 px-4 py-2.5 dark:border-slate-700">
                        <div className="flex items-center gap-2.5">
                            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900/30">
                                <FileText className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                            </div>
                            <div>
                                <h2 className="text-sm font-bold text-slate-800 dark:text-slate-100">
                                    Dispensation Details
                                </h2>
                                <p className="text-[10px] text-slate-500 dark:text-slate-400">
                                    {transaction.invoiceNumber} •{' '}
                                    {transaction.patientName}
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-1.5">
                            {onPrint && (
                                <button
                                    onClick={() => onPrint(transaction)}
                                    className="rounded-lg p-1.5 text-slate-500 transition-colors hover:bg-slate-100 dark:hover:bg-slate-700"
                                    title="Print"
                                >
                                    <Printer className="h-3.5 w-3.5" />
                                </button>
                            )}
                            {onDownload && (
                                <button
                                    onClick={() => onDownload(transaction)}
                                    className="rounded-lg p-1.5 text-slate-500 transition-colors hover:bg-slate-100 dark:hover:bg-slate-700"
                                    title="Download"
                                >
                                    <Download className="h-3.5 w-3.5" />
                                </button>
                            )}
                            {onEmail && (
                                <button
                                    onClick={() => onEmail(transaction)}
                                    className="rounded-lg p-1.5 text-slate-500 transition-colors hover:bg-slate-100 dark:hover:bg-slate-700"
                                    title="Email"
                                >
                                    <Mail className="h-3.5 w-3.5" />
                                </button>
                            )}
                            <button
                                onClick={onClose}
                                className="rounded-lg p-1.5 text-slate-500 transition-colors hover:bg-slate-100 dark:hover:bg-slate-700"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        </div>
                    </div>

                    {/* Scrollable Content */}
                    <div className="max-h-[calc(100vh-180px)] overflow-y-auto p-4">
                        {/* Quick Stats Row */}
                        <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
                            <div className="rounded-lg border border-slate-200 bg-slate-50 p-2 dark:border-slate-700 dark:bg-slate-800/50">
                                <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
                                    <Hash className="h-3 w-3" />
                                    <span className="text-[8px] uppercase">
                                        Invoice
                                    </span>
                                </div>
                                <p className="mt-0.5 font-mono text-xs font-bold text-slate-800 dark:text-slate-100">
                                    {transaction.invoiceNumber}
                                </p>
                            </div>
                            <div className="rounded-lg border border-slate-200 bg-slate-50 p-2 dark:border-slate-700 dark:bg-slate-800/50">
                                <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
                                    <Calendar className="h-3 w-3" />
                                    <span className="text-[8px] uppercase">
                                        Date
                                    </span>
                                </div>
                                <p className="mt-0.5 text-xs font-medium text-slate-800 dark:text-slate-200">
                                    {formatDate(transaction.date)}
                                </p>
                            </div>
                            <div className="rounded-lg border border-slate-200 bg-slate-50 p-2 dark:border-slate-700 dark:bg-slate-800/50">
                                <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
                                    <Package className="h-3 w-3" />
                                    <span className="text-[8px] uppercase">
                                        Items
                                    </span>
                                </div>
                                <p className="mt-0.5 text-xs font-bold text-slate-800 dark:text-slate-100">
                                    {transaction.totalQuantity}
                                </p>
                            </div>
                            <div className="rounded-lg border border-slate-200 bg-slate-50 p-2 dark:border-slate-700 dark:bg-slate-800/50">
                                <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
                                    <CreditCard className="h-3 w-3" />
                                    <span className="text-[8px] uppercase">
                                        Total
                                    </span>
                                </div>
                                <p className="mt-0.5 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                                    {formatCurrency(transaction.totalAmount)}
                                </p>
                            </div>
                        </div>

                        {/* Two-Column Layout */}
                        <div className="mb-4 grid grid-cols-1 gap-3 lg:grid-cols-2">
                            {/* Patient Information */}
                            <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-700 dark:bg-slate-800/50">
                                <div className="mb-2 flex items-center gap-1.5 border-b border-slate-200 pb-1.5 dark:border-slate-700">
                                    <UserCircle className="h-3.5 w-3.5 text-blue-500" />
                                    <h3 className="text-[10px] font-semibold text-slate-700 uppercase dark:text-slate-300">
                                        Patient
                                    </h3>
                                </div>
                                <div className="space-y-1.5">
                                    <InfoRow
                                        icon={<User className="h-3 w-3" />}
                                        label="Name"
                                        value={transaction.patientName}
                                    />
                                    {transaction.patientId && (
                                        <InfoRow
                                            icon={<Hash className="h-3 w-3" />}
                                            label="ID"
                                            value={transaction.patientId}
                                        />
                                    )}
                                    <div className="flex gap-2">
                                        {transaction.patientAge && (
                                            <InfoRow
                                                icon={
                                                    <Calendar className="h-3 w-3" />
                                                }
                                                label="Age"
                                                value={`${transaction.patientAge}y`}
                                                className="flex-1"
                                            />
                                        )}
                                        {transaction.patientGender && (
                                            <InfoRow
                                                icon={
                                                    <UserCircle className="h-3 w-3" />
                                                }
                                                label="Gender"
                                                value={
                                                    transaction.patientGender
                                                }
                                                className="flex-1"
                                            />
                                        )}
                                    </div>
                                    {transaction.patientPhone && (
                                        <InfoRow
                                            icon={<Phone className="h-3 w-3" />}
                                            label="Phone"
                                            value={transaction.patientPhone}
                                        />
                                    )}
                                </div>
                            </div>

                            {/* Prescription Info */}
                            <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-700 dark:bg-slate-800/50">
                                <div className="mb-2 flex items-center gap-1.5 border-b border-slate-200 pb-1.5 dark:border-slate-700">
                                    <ClipboardList className="h-3.5 w-3.5 text-purple-500" />
                                    <h3 className="text-[10px] font-semibold text-slate-700 uppercase dark:text-slate-300">
                                        Prescription
                                    </h3>
                                </div>
                                <div className="space-y-1.5">
                                    {transaction.prescribedBy && (
                                        <InfoRow
                                            icon={
                                                <Stethoscope className="h-3 w-3" />
                                            }
                                            label="Prescribed By"
                                            value={transaction.prescribedBy}
                                        />
                                    )}
                                    {transaction.dispensedBy && (
                                        <InfoRow
                                            icon={
                                                <Building2 className="h-3 w-3" />
                                            }
                                            label="Dispensed By"
                                            value={transaction.dispensedBy}
                                        />
                                    )}
                                    {transaction.paymentMethod && (
                                        <InfoRow
                                            icon={
                                                <CreditCard className="h-3 w-3" />
                                            }
                                            label="Payment"
                                            value={
                                                <span className="inline-flex items-center gap-1">
                                                    {transaction.paymentMethod}
                                                    {transaction.paymentMethod ===
                                                        'Insurance' &&
                                                        transaction.insuranceProvider && (
                                                            <span className="text-[9px] text-slate-500">
                                                                (
                                                                {
                                                                    transaction.insuranceProvider
                                                                }
                                                                )
                                                            </span>
                                                        )}
                                                </span>
                                            }
                                        />
                                    )}
                                    <InfoRow
                                        icon={<FileText className="h-3 w-3" />}
                                        label="Status"
                                        value={
                                            <DetailStatusBadge
                                                status={transaction.status}
                                            />
                                        }
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Products Table */}
                        <div className="mb-3 rounded-lg border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800/50">
                            <div className="border-b border-slate-200 px-3 py-1.5 dark:border-slate-700">
                                <div className="flex items-center gap-1.5">
                                    <Pill className="h-3.5 w-3.5 text-emerald-500" />
                                    <h3 className="text-[10px] font-semibold text-slate-700 uppercase dark:text-slate-300">
                                        Medications
                                    </h3>
                                </div>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead className="bg-slate-50 text-[8px] text-slate-600 uppercase dark:bg-slate-800/80 dark:text-slate-400">
                                        <tr>
                                            <th className="px-2 py-1 text-left">
                                                Medication
                                            </th>
                                            <th className="px-2 py-1 text-center">
                                                Qty
                                            </th>
                                            <th className="px-2 py-1 text-right">
                                                Unit
                                            </th>
                                            <th className="px-2 py-1 text-right">
                                                Total
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {transaction.products.map(
                                            (product, idx) => (
                                                <tr
                                                    key={idx}
                                                    className="border-b border-slate-100 last:border-0 dark:border-slate-700/50"
                                                >
                                                    <td className="px-2 py-1.5">
                                                        <div className="text-xs font-medium text-slate-800 dark:text-slate-200">
                                                            {product.name}
                                                        </div>
                                                        {product.dosage && (
                                                            <div className="text-[8px] text-slate-500">
                                                                {product.dosage}
                                                            </div>
                                                        )}
                                                        {product.instructions && (
                                                            <div className="mt-0.5 flex items-start gap-0.5 text-[8px] text-amber-600 dark:text-amber-400">
                                                                <AlertCircle className="mt-0.5 h-2 w-2" />
                                                                <span>
                                                                    {
                                                                        product.instructions
                                                                    }
                                                                </span>
                                                            </div>
                                                        )}
                                                    </td>
                                                    <td className="px-2 py-1.5 text-center">
                                                        <span className="inline-flex items-center justify-center rounded bg-slate-100 px-1.5 py-0.5 text-[8px] font-medium dark:bg-slate-700">
                                                            x{product.quantity}
                                                        </span>
                                                    </td>
                                                    <td className="px-2 py-1.5 text-right text-[10px] text-slate-600 dark:text-slate-400">
                                                        {formatCurrency(
                                                            product.unitPrice,
                                                        )}
                                                    </td>
                                                    <td className="px-2 py-1.5 text-right text-xs font-medium text-slate-800 dark:text-slate-200">
                                                        {formatCurrency(
                                                            product.totalPrice,
                                                        )}
                                                    </td>
                                                </tr>
                                            ),
                                        )}
                                    </tbody>
                                    <tfoot className="border-t border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800/80">
                                        <tr>
                                            <td
                                                colSpan={3}
                                                className="px-2 py-1 text-right text-[10px] font-medium text-slate-600 dark:text-slate-400"
                                            >
                                                Subtotal:
                                            </td>
                                            <td className="px-2 py-1 text-right text-xs font-medium text-slate-800 dark:text-slate-200">
                                                {formatCurrency(
                                                    transaction.subtotal,
                                                )}
                                            </td>
                                        </tr>
                                        {transaction.discount &&
                                            transaction.discount > 0 && (
                                                <tr>
                                                    <td
                                                        colSpan={3}
                                                        className="px-2 py-1 text-right text-[10px] text-emerald-600 dark:text-emerald-400"
                                                    >
                                                        Discount:
                                                    </td>
                                                    <td className="px-2 py-1 text-right text-[10px] text-emerald-600 dark:text-emerald-400">
                                                        -
                                                        {formatCurrency(
                                                            transaction.discount,
                                                        )}
                                                    </td>
                                                </tr>
                                            )}
                                        {transaction.tax &&
                                            transaction.tax > 0 && (
                                                <tr>
                                                    <td
                                                        colSpan={3}
                                                        className="px-2 py-1 text-right text-[10px] text-slate-600 dark:text-slate-400"
                                                    >
                                                        Tax:
                                                    </td>
                                                    <td className="px-2 py-1 text-right text-xs text-slate-800 dark:text-slate-200">
                                                        {formatCurrency(
                                                            transaction.tax,
                                                        )}
                                                    </td>
                                                </tr>
                                            )}
                                        <tr className="border-t border-slate-200 dark:border-slate-700">
                                            <td
                                                colSpan={3}
                                                className="px-2 py-1 text-right text-xs font-bold text-slate-800 dark:text-slate-200"
                                            >
                                                Total:
                                            </td>
                                            <td className="px-2 py-1 text-right text-sm font-bold text-emerald-600 dark:text-emerald-400">
                                                {formatCurrency(
                                                    transaction.totalAmount,
                                                )}
                                            </td>
                                        </tr>
                                    </tfoot>
                                </table>
                            </div>
                        </div>

                        {/* Notes */}
                        {transaction.notes && (
                            <div className="rounded-lg border border-slate-200 bg-white p-2 shadow-sm dark:border-slate-700 dark:bg-slate-800/50">
                                <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
                                    <ClipboardList className="h-3 w-3" />
                                    <span className="text-[8px] font-medium uppercase">
                                        Notes
                                    </span>
                                </div>
                                <p className="mt-0.5 text-[10px] text-slate-600 dark:text-slate-400">
                                    {transaction.notes}
                                </p>
                            </div>
                        )}
                    </div>

                    {/* Footer */}
                    <div className="flex justify-end gap-2 border-t border-slate-200 px-4 py-2.5 dark:border-slate-700">
                        <button
                            onClick={onClose}
                            className="rounded-lg border border-slate-300 px-3 py-1 text-[10px] font-medium text-slate-700 transition-colors hover:bg-slate-100 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-700"
                        >
                            Close
                        </button>
                        {onPrint && (
                            <button
                                onClick={() => onPrint(transaction)}
                                className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1 text-[10px] font-medium text-white transition-colors hover:bg-blue-700"
                            >
                                <Printer className="h-3 w-3" />
                                Print
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
