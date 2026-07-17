// pages/pharmacies/logistics.tsx

import React, { useState, useEffect, useRef } from 'react';
import { Head, router, usePage } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import PageHeader from '@/components/PageHeader';
import Http from '@/utils/Http';
import { PrintLabelModal } from './components/PrintLabelModal';
import AddDrugModal from './components/AddDrugModal';
import {
    Search,
    Barcode,
    Package,
    Plus,
    Minus,
    Eye,
    Printer,
    Download,
    X,
    Check,
    AlertCircle,
    Calendar,
    User,
    Building2,
    ArrowRight,
    ArrowLeft,
    Edit,
    Trash2,
    RefreshCw,
    Box,
    ClipboardList,
    Clock,
    TrendingUp,
    TrendingDown,
    FileText,
    DollarSign,
    Layers,
    AlertTriangle,
    ChevronDown,
    ChevronRight,
    History,
    Database,
    ShoppingCart,
    Truck,
    Home,
    Building,
    Shield,
    Upload,
    Download as DownloadIcon,
} from 'lucide-react';
import { toast } from 'react-hot-toast';

// ============================================================================
// Types
// ============================================================================

interface Drug {
    id: number;
    drug_code: string;
    drug_name: string;
    generic_name: string | null;
    brand_name: string | null;
    barcode: string | null;
    qr_code: string | null;
    category_id: number | null;
    service_id: number | null;
    therapeutic_class: string | null;
    schedule_class: string | null;
    strength: string | null;
    dosage_form: string | null;
    route_of_administration: string | null;
    unit_of_measure: string | null;
    pack_size: number | null;
    minimum_stock_level: number | null;
    maximum_stock_level: number | null;
    reorder_level: number | null;
    purchase_price: number | null;
    selling_price: number | null;
    insurance_price: number | null;
    is_arv: number;
    is_tb_drug: number;
    is_emergency: number;
    is_controlled: number;
    track_batches: number;
    track_expiry: number;
    allow_negative_stock: number;
    is_active: number;
    discontinued: number;
    current_stock?: number;
    transactions?: DrugTransaction[];
}

interface DrugTransaction {
    id: number;
    drug_id: number;
    transaction_type:
        | 'dispensed'
        | 'stock_refill'
        | 'physical_count'
        | 'issued'
        | 'received'
        | 'adjustment';
    quantity: number;
    balance_after: number;
    reference_number: string | null;
    transaction_date: string;
    created_by: string | null;
    notes: string | null;
    patient_name?: string | null;
    invoice_number?: string | null;
    source_department?: string | null;
    destination_department?: string | null;
}

interface DrugFormData {
    drug_code: string;
    drug_name: string;
    generic_name: string;
    brand_name: string;
    barcode: string;
    category_id: number | null;
    therapeutic_class: string;
    schedule_class: string;
    strength: string;
    dosage_form: string;
    route_of_administration: string;
    unit_of_measure: string;
    pack_size: number;
    minimum_stock_level: number;
    maximum_stock_level: number;
    reorder_level: number;
    purchase_price: number;
    selling_price: number;
    insurance_price: number;
    is_arv: boolean;
    is_tb_drug: boolean;
    is_emergency: boolean;
    is_controlled: boolean;
    track_batches: boolean;
    track_expiry: boolean;
    allow_negative_stock: boolean;
}

interface LogisticsProps {
    suppliers: {
        id: number;
        supplier_code: string;
        supplier_name: string;
        contact_person: string | null;
        phone: string | null;
        email: string | null;
        address: string | null;
        city: string | null;
        country: string | null;
        rating: number | null;
        is_active: boolean;
    }[];
}

// ============================================================================
// Accordion Component
// ============================================================================

interface AccordionProps {
    open: boolean;
    onToggle: () => void;
    title: string;
    icon: React.ReactNode;
    children: React.ReactNode;
    badge?: string | number;
}

const Accordion: React.FC<AccordionProps> = ({
    open,
    onToggle,
    title,
    icon,
    children,
    badge,
}) => {
    return (
        <div className="rounded-lg border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800/90">
            <button
                onClick={onToggle}
                className="flex w-full items-center justify-between px-4 py-3 text-left transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/50"
            >
                <div className="flex items-center gap-2.5">
                    <div className="text-slate-500 dark:text-slate-400">
                        {icon}
                    </div>
                    <h4 className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                        {title}
                    </h4>
                    {badge !== undefined && (
                        <span className="rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-600 dark:bg-slate-700 dark:text-slate-400">
                            {badge}
                        </span>
                    )}
                </div>
                <div className="text-slate-400 transition-transform duration-200">
                    {open ? (
                        <ChevronDown className="h-4 w-4" />
                    ) : (
                        <ChevronRight className="h-4 w-4" />
                    )}
                </div>
            </button>
            {open && (
                <div className="border-t border-slate-200 p-3 dark:border-slate-700">
                    {children}
                </div>
            )}
        </div>
    );
};

// ============================================================================
// Search Component
// ============================================================================

const DrugSearchBar: React.FC<{
    onSearch: (query: string) => void;
    isLoading: boolean;
}> = ({ onSearch, isLoading }) => {
    const [query, setQuery] = useState('');
    const inputRef = useRef<HTMLInputElement>(null);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (query.trim()) {
            onSearch(query.trim());
        }
    };

    const handleBarcodeScan = () => {
        inputRef.current?.focus();
    };

    return (
        <form onSubmit={handleSubmit} className="flex items-center gap-1.5">
            <div className="relative flex-1">
                <Search className="absolute top-1/2 left-2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                <input
                    ref={inputRef}
                    type="text"
                    placeholder="Search by drug name, barcode, or generic name..."
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    className="h-8 w-full rounded-lg border border-slate-200 pr-3 pl-7 text-xs focus:border-blue-400 focus:ring-1 focus:ring-blue-400 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                    autoFocus
                />
            </div>
            <button
                type="submit"
                disabled={isLoading || !query.trim()}
                className="flex h-8 items-center gap-1 rounded-lg bg-blue-600 px-3 text-xs font-medium text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
            >
                {isLoading ? (
                    <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                ) : (
                    <Search className="h-3.5 w-3.5" />
                )}
                Search
            </button>
            <button
                type="button"
                onClick={handleBarcodeScan}
                className="flex h-8 items-center gap-1 rounded-lg border border-slate-300 px-2.5 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-100 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-700"
            >
                <Barcode className="h-3.5 w-3.5" />
                Scan
            </button>
        </form>
    );
};

// ============================================================================
// Drug Details Content
// ============================================================================

const DrugDetailsContent: React.FC<{ drug: Drug | null }> = ({ drug }) => {
    if (!drug) return null;

    const formatCurrency = (amount: number | null) => {
        if (amount === null) return 'N/A';
        return `ZMW ${amount.toLocaleString('en-ZM', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    };

    const getStockStatus = (
        stock: number = 0,
        min: number = 0,
        max: number = 0,
    ) => {
        if (stock <= min)
            return {
                label: 'Critical',
                color: 'text-red-600 bg-red-100 dark:bg-red-950/40 dark:text-red-400',
            };
        if (stock <= min + 10)
            return {
                label: 'Low',
                color: 'text-amber-600 bg-amber-100 dark:bg-amber-950/40 dark:text-amber-400',
            };
        if (stock >= max)
            return {
                label: 'Overstocked',
                color: 'text-orange-600 bg-orange-100 dark:bg-orange-950/40 dark:text-orange-400',
            };
        return {
            label: 'Adequate',
            color: 'text-emerald-600 bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-400',
        };
    };

    const status = getStockStatus(
        drug.current_stock,
        drug.minimum_stock_level || 0,
        drug.maximum_stock_level || 0,
    );

    return (
        <div className="space-y-3">
            <div className="flex flex-wrap items-start justify-between gap-2 rounded-lg bg-slate-50 p-3 dark:bg-slate-700/30">
                <div>
                    <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">
                        {drug.drug_name}
                    </h3>
                    <div className="mt-0.5 flex flex-wrap items-center gap-2">
                        {drug.generic_name && (
                            <span className="text-xs text-slate-500 dark:text-slate-400">
                                Generic: {drug.generic_name}
                            </span>
                        )}
                        {drug.brand_name && (
                            <span className="text-xs text-slate-500 dark:text-slate-400">
                                Brand: {drug.brand_name}
                            </span>
                        )}
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-1.5">
                        <span className="inline-flex items-center gap-0.5 rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium dark:bg-slate-700">
                            <Package className="h-2.5 w-2.5" />
                            {drug.dosage_form || 'N/A'}
                        </span>
                        {drug.strength && (
                            <span className="inline-flex items-center gap-0.5 rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium dark:bg-slate-700">
                                {drug.strength}
                            </span>
                        )}
                        <span
                            className={`inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[10px] font-medium ${status.color}`}
                        >
                            {status.label}
                        </span>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <div className="text-right">
                        <div className="text-xs text-slate-500 dark:text-slate-400">
                            Current Stock
                        </div>
                        <div className="text-xl font-bold text-slate-800 dark:text-slate-100">
                            {drug.current_stock ?? 'N/A'}
                        </div>
                        <div className="text-[10px] text-slate-500 dark:text-slate-400">
                            {drug.unit_of_measure || 'units'}
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 md:grid-cols-3 lg:grid-cols-4">
                <InfoItem label="Drug Code" value={drug.drug_code} />
                <InfoItem label="Barcode" value={drug.barcode || 'N/A'} />
                <InfoItem
                    label="Therapeutic Class"
                    value={drug.therapeutic_class || 'N/A'}
                />
                <InfoItem
                    label="Schedule Class"
                    value={drug.schedule_class || 'N/A'}
                />
                <InfoItem
                    label="Pack Size"
                    value={drug.pack_size ? `${drug.pack_size} units` : 'N/A'}
                />
                <InfoItem
                    label="Unit of Measure"
                    value={drug.unit_of_measure || 'N/A'}
                />
                <InfoItem
                    label="Purchase Price"
                    value={formatCurrency(drug.purchase_price)}
                />
                <InfoItem
                    label="Selling Price"
                    value={formatCurrency(drug.selling_price)}
                />
                <InfoItem
                    label="Minimum Stock"
                    value={drug.minimum_stock_level || 'N/A'}
                />
                <InfoItem
                    label="Maximum Stock"
                    value={drug.maximum_stock_level || 'N/A'}
                />
                <InfoItem
                    label="Reorder Level"
                    value={drug.reorder_level || 'N/A'}
                />
                <InfoItem
                    label="Status"
                    value={
                        <span
                            className={`text-xs font-medium ${drug.is_active ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}
                        >
                            {drug.is_active ? 'Active' : 'Discontinued'}
                        </span>
                    }
                />
            </div>
        </div>
    );
};

const InfoItem: React.FC<{ label: string; value: React.ReactNode }> = ({
    label,
    value,
}) => (
    <div>
        <div className="text-[10px] font-medium text-slate-500 uppercase dark:text-slate-400">
            {label}
        </div>
        <div className="text-xs text-slate-700 dark:text-slate-300">
            {value}
        </div>
    </div>
);

// ============================================================================
// Transaction History Table
// ============================================================================

const TransactionHistory: React.FC<{ transactions: DrugTransaction[] }> = ({
    transactions,
}) => {
    const [expanded, setExpanded] = useState(false);
    const displayLimit = 5;
    const hasMore = transactions.length > displayLimit;
    const displayTransactions = expanded
        ? transactions
        : transactions.slice(0, displayLimit);

    const getTransactionIcon = (type: string) => {
        switch (type) {
            case 'dispensed':
                return <ClipboardList className="h-3 w-3 text-blue-500" />;
            case 'stock_refill':
                return <Database className="h-3 w-3 text-emerald-500" />;
            case 'physical_count':
                return <Check className="h-3 w-3 text-purple-500" />;
            case 'issued':
                return <ArrowRight className="h-3 w-3 text-orange-500" />;
            case 'received':
                return <ArrowLeft className="h-3 w-3 text-blue-500" />;
            case 'adjustment':
                return <Edit className="h-3 w-3 text-amber-500" />;
            default:
                return <Clock className="h-3 w-3 text-slate-500" />;
        }
    };

    const getTransactionColor = (type: string) => {
        switch (type) {
            case 'dispensed':
                return 'text-blue-600 dark:text-blue-400';
            case 'stock_refill':
                return 'text-emerald-600 dark:text-emerald-400';
            case 'physical_count':
                return 'text-purple-600 dark:text-purple-400';
            case 'issued':
                return 'text-orange-600 dark:text-orange-400';
            case 'received':
                return 'text-blue-600 dark:text-blue-400';
            case 'adjustment':
                return 'text-amber-600 dark:text-amber-400';
            default:
                return 'text-slate-600 dark:text-slate-400';
        }
    };

    const formatDate = (dateStr: string) => {
        const date = new Date(dateStr);
        return date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    if (transactions.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-6 text-center">
                <History className="h-8 w-8 text-slate-300 dark:text-slate-600" />
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                    No transaction history found
                </p>
            </div>
        );
    }

    return (
        <div>
            <div className="overflow-x-auto">
                <table className="w-full">
                    <thead className="border-b border-slate-200 bg-slate-50 text-[10px] text-slate-600 uppercase dark:border-slate-700 dark:bg-slate-800/50 dark:text-slate-400">
                        <tr>
                            <th className="px-2 py-1.5 text-left">Type</th>
                            <th className="px-2 py-1.5 text-left">Reference</th>
                            <th className="px-2 py-1.5 text-right">Qty</th>
                            <th className="px-2 py-1.5 text-right">Balance</th>
                            <th className="px-2 py-1.5 text-left">Date</th>
                            <th className="px-2 py-1.5 text-left">Notes</th>
                        </tr>
                    </thead>
                    <tbody>
                        {displayTransactions.map((t) => (
                            <tr
                                key={t.id}
                                className="border-b border-slate-100 text-xs dark:border-slate-700/50"
                            >
                                <td className="px-2 py-1.5">
                                    <div className="flex items-center gap-1">
                                        {getTransactionIcon(t.transaction_type)}
                                        <span
                                            className={`capitalize ${getTransactionColor(t.transaction_type)}`}
                                        >
                                            {t.transaction_type.replace(
                                                '_',
                                                ' ',
                                            )}
                                        </span>
                                    </div>
                                </td>
                                <td className="px-2 py-1.5 text-slate-600 dark:text-slate-400">
                                    {t.reference_number ||
                                        t.invoice_number ||
                                        t.patient_name ||
                                        '—'}
                                </td>
                                <td className="px-2 py-1.5 text-right font-mono font-medium">
                                    <span
                                        className={
                                            t.quantity < 0
                                                ? 'text-red-600'
                                                : 'text-emerald-600'
                                        }
                                    >
                                        {t.quantity > 0 ? '+' : ''}
                                        {t.quantity}
                                    </span>
                                </td>
                                <td className="px-2 py-1.5 text-right font-mono text-slate-700 dark:text-slate-300">
                                    {t.balance_after}
                                </td>
                                <td className="px-2 py-1.5 text-[10px] text-slate-500 dark:text-slate-400">
                                    {formatDate(t.transaction_date)}
                                </td>
                                <td className="max-w-[120px] truncate px-2 py-1.5 text-[10px] text-slate-500 dark:text-slate-400">
                                    {t.notes || '—'}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {hasMore && (
                <button
                    onClick={() => setExpanded(!expanded)}
                    className="mt-1.5 flex w-full items-center justify-center gap-1 rounded border border-slate-200 py-0.5 text-[10px] font-medium text-slate-600 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-800"
                >
                    {expanded
                        ? 'Show less'
                        : `Show ${transactions.length - displayLimit} more transactions`}
                </button>
            )}
        </div>
    );
};

// ============================================================================
// Modal Overlay Component
// ============================================================================

const ModalOverlay: React.FC<{
    children: React.ReactNode;
    onClose: () => void;
}> = ({ children, onClose }) => {
    const modalRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        document.addEventListener('keydown', handleEscape);
        return () => document.removeEventListener('keydown', handleEscape);
    }, [onClose]);

    useEffect(() => {
        document.body.style.overflow = 'hidden';
        return () => {
            document.body.style.overflow = '';
        };
    }, []);

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
            onClick={(e) => e.target === e.currentTarget && onClose()}
        >
            <div
                ref={modalRef}
                className="mx-2 animate-in duration-200 fade-in zoom-in"
            >
                {children}
            </div>
        </div>
    );
};

// ============================================================================
// Physical Count Modal
// ============================================================================

const PhysicalCountModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    drug: Drug | null;
    onConfirm: (data: { newQuantity: number; notes: string }) => void;
}> = ({ isOpen, onClose, drug, onConfirm }) => {
    const [quantity, setQuantity] = useState<number>(drug?.current_stock || 0);
    const [notes, setNotes] = useState('');

    if (!isOpen || !drug) return null;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onConfirm({ newQuantity: quantity, notes });
        onClose();
    };

    return (
        <ModalOverlay onClose={onClose}>
            <div className="w-full max-w-2xl rounded-xl bg-white shadow-2xl dark:bg-slate-800">
                <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3 dark:border-slate-700">
                    <div className="flex items-center gap-2.5">
                        <div className="rounded-lg bg-purple-100 p-1.5 dark:bg-purple-900/30">
                            <Check className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                        </div>
                        <div>
                            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">
                                Physical Count
                            </h3>
                            <p className="text-[10px] text-slate-500 dark:text-slate-400">
                                {drug.drug_name} • {drug.drug_code}
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="rounded-lg p-1 transition-colors hover:bg-slate-100 dark:hover:bg-slate-700"
                    >
                        <X className="h-4 w-4 text-slate-500" />
                    </button>
                </div>

                <form onSubmit={handleSubmit}>
                    <div className="p-5">
                        <div className="mb-4 rounded-lg bg-slate-50 p-3 dark:bg-slate-700/30">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <span className="text-xs text-slate-500 dark:text-slate-400">
                                        System Stock
                                    </span>
                                    <div className="text-lg font-bold text-slate-800 dark:text-slate-100">
                                        {drug.current_stock || 0}{' '}
                                        <span className="text-xs font-normal text-slate-500">
                                            {drug.unit_of_measure || 'units'}
                                        </span>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <span className="text-xs text-slate-500 dark:text-slate-400">
                                        Last Count
                                    </span>
                                    <div className="text-sm text-slate-600 dark:text-slate-400">
                                        {new Date().toLocaleDateString()}
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                            <div>
                                <label className="flex items-center gap-1 text-xs font-medium text-slate-700 dark:text-slate-300">
                                    <Package className="h-3 w-3" />
                                    Physical Count{' '}
                                    <span className="text-red-500">*</span>
                                </label>
                                <div className="relative mt-0.5">
                                    <span className="absolute top-1/2 left-2 -translate-y-1/2 text-xs text-slate-400">
                                        Units:
                                    </span>
                                    <input
                                        type="number"
                                        value={quantity}
                                        onChange={(e) =>
                                            setQuantity(
                                                parseInt(e.target.value) || 0,
                                            )
                                        }
                                        className="h-8 w-full rounded-lg border border-slate-200 pr-3 pl-12 text-sm focus:border-purple-400 focus:ring-1 focus:ring-purple-400 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                                        min="0"
                                        placeholder="Enter count"
                                        required
                                    />
                                </div>
                                <div className="mt-1 text-[10px] text-slate-500">
                                    Variance:{' '}
                                    {quantity - (drug.current_stock || 0) > 0
                                        ? '+'
                                        : ''}
                                    {quantity - (drug.current_stock || 0)} units
                                </div>
                            </div>

                            <div>
                                <label className="flex items-center gap-1 text-xs font-medium text-slate-700 dark:text-slate-300">
                                    <Calendar className="h-3 w-3" />
                                    Count Date
                                </label>
                                <input
                                    type="date"
                                    defaultValue={
                                        new Date().toISOString().split('T')[0]
                                    }
                                    className="mt-0.5 h-8 w-full rounded-lg border border-slate-200 px-3 text-sm focus:border-purple-400 focus:ring-1 focus:ring-purple-400 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                                />
                            </div>

                            <div className="col-span-1 md:col-span-2">
                                <label className="flex items-center gap-1 text-xs font-medium text-slate-700 dark:text-slate-300">
                                    <ClipboardList className="h-3 w-3" />
                                    Count Notes
                                </label>
                                <textarea
                                    value={notes}
                                    onChange={(e) => setNotes(e.target.value)}
                                    className="mt-0.5 w-full rounded-lg border border-slate-200 px-3 py-1.5 text-sm focus:border-purple-400 focus:ring-1 focus:ring-purple-400 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                                    rows={2}
                                    placeholder="Enter count notes..."
                                />
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center justify-between border-t border-slate-200 px-5 py-3 dark:border-slate-700">
                        <div className="flex items-center gap-2">
                            <div
                                className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                                    quantity === (drug.current_stock || 0)
                                        ? 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300'
                                        : 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400'
                                }`}
                            >
                                {quantity === (drug.current_stock || 0)
                                    ? 'Stock verified'
                                    : 'Stock adjustment needed'}
                            </div>
                        </div>
                        <div className="flex gap-2">
                            <button
                                type="button"
                                onClick={onClose}
                                className="rounded-lg border border-slate-300 px-4 py-1.5 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-700"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                className="flex items-center gap-1.5 rounded-lg bg-purple-600 px-4 py-1.5 text-xs font-medium text-white transition-colors hover:bg-purple-700"
                            >
                                <Check className="h-3.5 w-3.5" />
                                Save Count
                            </button>
                        </div>
                    </div>
                </form>
            </div>
        </ModalOverlay>
    );
};

// ============================================================================
// Receive Drug Modal
// ============================================================================

const ReceiveDrugModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    drug: Drug | null;
    isLoading: boolean;
    onConfirm: (data: {
        quantity: number;
        supplier: string;
        supplier_id?: number;
        notes: string;
    }) => void;
}> = ({ isOpen, onClose, drug, isLoading, onConfirm }) => {
    const [quantity, setQuantity] = useState(0);
    const [supplierId, setSupplierId] = useState<number | undefined>(undefined);
    const [notes, setNotes] = useState('');
    const [referenceNumber, setReferenceNumber] = useState('');

    const { suppliers = [] } = usePage<LogisticsProps>().props;
    const selectedSupplier = suppliers?.find((s: any) => s.id === supplierId);

    useEffect(() => {
        if (isOpen) {
            setQuantity(0);
            setSupplierId(undefined);
            setNotes('');
            setReferenceNumber('');
        }
    }, [isOpen]);

    if (!isOpen || !drug) return null;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (quantity > 0 && supplierId) {
            onConfirm({
                quantity,
                supplier: selectedSupplier?.supplier_name || '',
                supplier_id: supplierId,
                notes,
            });
        }
    };

    return (
        <ModalOverlay onClose={onClose}>
            <div className="w-full max-w-2xl rounded-xl bg-white shadow-2xl dark:bg-slate-800">
                <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3 dark:border-slate-700">
                    <div className="flex items-center gap-2.5">
                        <div className="rounded-lg bg-emerald-100 p-1.5 dark:bg-emerald-900/30">
                            <ArrowLeft className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                        </div>
                        <div>
                            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">
                                Receive Stock
                            </h3>
                            <p className="text-[10px] text-slate-500 dark:text-slate-400">
                                {drug.drug_name} • {drug.drug_code}
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="rounded-lg p-1 transition-colors hover:bg-slate-100 dark:hover:bg-slate-700"
                    >
                        <X className="h-4 w-4 text-slate-500" />
                    </button>
                </div>

                <form onSubmit={handleSubmit}>
                    <div className="p-5">
                        <div className="mb-4 rounded-lg bg-slate-50 p-3 dark:bg-slate-700/30">
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-medium text-slate-600 dark:text-slate-400">
                                    Current Stock Balance
                                </span>
                                <div className="text-right">
                                    <span className="text-lg font-bold text-slate-800 dark:text-slate-100">
                                        {drug.current_stock || 0}
                                    </span>
                                    <span className="ml-1 text-xs text-slate-500 dark:text-slate-400">
                                        {drug.unit_of_measure || 'units'}
                                    </span>
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                            <div className="space-y-3">
                                <div>
                                    <label className="flex items-center gap-1 text-xs font-medium text-slate-700 dark:text-slate-300">
                                        <Package className="h-3 w-3" />
                                        Quantity Received{' '}
                                        <span className="text-red-500">*</span>
                                    </label>
                                    <div className="relative mt-0.5">
                                        <Package className="absolute top-1/2 left-2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                                        <input
                                            type="number"
                                            value={quantity}
                                            onChange={(e) =>
                                                setQuantity(
                                                    parseInt(e.target.value) ||
                                                        0,
                                                )
                                            }
                                            className="h-8 w-full rounded-lg border border-slate-200 pr-3 pl-7 text-sm focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                                            min="1"
                                            placeholder="Enter quantity"
                                            required
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="flex items-center gap-1 text-xs font-medium text-slate-700 dark:text-slate-300">
                                        <Building2 className="h-3 w-3" />
                                        Supplier{' '}
                                        <span className="text-red-500">*</span>
                                    </label>
                                    <select
                                        value={supplierId || ''}
                                        onChange={(e) =>
                                            setSupplierId(
                                                e.target.value
                                                    ? parseInt(e.target.value)
                                                    : undefined,
                                            )
                                        }
                                        className="mt-0.5 h-8 w-full rounded-lg border border-slate-200 px-3 text-sm focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                                        required
                                    >
                                        <option value="">
                                            Select Supplier...
                                        </option>
                                        {suppliers?.map((s: any) => (
                                            <option key={s.id} value={s.id}>
                                                {s.supplier_name} (
                                                {s.supplier_code})
                                            </option>
                                        ))}
                                    </select>
                                    {suppliers?.length === 0 && (
                                        <p className="mt-1 text-[10px] text-amber-600 dark:text-amber-400">
                                            ⚠️ No suppliers found. Please add
                                            suppliers first.
                                        </p>
                                    )}
                                </div>

                                <div>
                                    <label className="flex items-center gap-1 text-xs font-medium text-slate-700 dark:text-slate-300">
                                        <FileText className="h-3 w-3" />
                                        Reference Number
                                    </label>
                                    <input
                                        type="text"
                                        value={referenceNumber}
                                        onChange={(e) =>
                                            setReferenceNumber(e.target.value)
                                        }
                                        placeholder="e.g., PO-2024-001"
                                        className="mt-0.5 h-8 w-full rounded-lg border border-slate-200 px-3 text-sm focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                                    />
                                </div>
                            </div>

                            <div className="space-y-3">
                                <div>
                                    <label className="flex items-center gap-1 text-xs font-medium text-slate-700 dark:text-slate-300">
                                        <Calendar className="h-3 w-3" />
                                        Received Date
                                    </label>
                                    <input
                                        type="date"
                                        defaultValue={
                                            new Date()
                                                .toISOString()
                                                .split('T')[0]
                                        }
                                        className="mt-0.5 h-8 w-full rounded-lg border border-slate-200 px-3 text-sm focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                                    />
                                </div>

                                <div>
                                    <label className="flex items-center gap-1 text-xs font-medium text-slate-700 dark:text-slate-300">
                                        <User className="h-3 w-3" />
                                        Received By
                                    </label>
                                    <input
                                        type="text"
                                        placeholder="Your name"
                                        className="mt-0.5 h-8 w-full rounded-lg border border-slate-200 px-3 text-sm focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                                    />
                                </div>

                                <div>
                                    <label className="flex items-center gap-1 text-xs font-medium text-slate-700 dark:text-slate-300">
                                        <AlertCircle className="h-3 w-3" />
                                        Batch Number
                                    </label>
                                    <input
                                        type="text"
                                        placeholder="e.g., BATCH-2024-001"
                                        className="mt-0.5 h-8 w-full rounded-lg border border-slate-200 px-3 text-sm focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                                    />
                                </div>
                            </div>

                            <div className="col-span-1 md:col-span-2">
                                <label className="flex items-center gap-1 text-xs font-medium text-slate-700 dark:text-slate-300">
                                    <ClipboardList className="h-3 w-3" />
                                    Notes / Remarks
                                </label>
                                <textarea
                                    value={notes}
                                    onChange={(e) => setNotes(e.target.value)}
                                    className="mt-0.5 w-full rounded-lg border border-slate-200 px-3 py-1.5 text-sm focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                                    rows={2}
                                    placeholder="Additional notes about this stock receipt..."
                                />
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center justify-between border-t border-slate-200 px-5 py-3 dark:border-slate-700">
                        <div className="flex items-center gap-2">
                            <div className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-medium text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400">
                                New Balance:{' '}
                                {(drug.current_stock || 0) + quantity}{' '}
                                {drug.unit_of_measure || 'units'}
                            </div>
                            {supplierId && selectedSupplier && (
                                <div className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-medium text-blue-700 dark:bg-blue-900/40 dark:text-blue-400">
                                    {selectedSupplier.supplier_name}
                                </div>
                            )}
                        </div>
                        <div className="flex gap-2">
                            <button
                                type="button"
                                onClick={onClose}
                                className="rounded-lg border border-slate-300 px-4 py-1.5 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-700"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={
                                    quantity <= 0 || !supplierId || isLoading
                                }
                                className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-1.5 text-xs font-medium text-white transition-colors hover:bg-emerald-700 disabled:opacity-50"
                            >
                                {isLoading ? (
                                    <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                                ) : (
                                    <Check className="h-3.5 w-3.5" />
                                )}
                                Receive Stock
                            </button>
                        </div>
                    </div>
                </form>
            </div>
        </ModalOverlay>
    );
};

// ============================================================================
// Issue Drug Modal
// ============================================================================

const IssueDrugModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    drug: Drug | null;
    onConfirm: (data: {
        quantity: number;
        destination: string;
        notes: string;
    }) => void;
}> = ({ isOpen, onClose, drug, onConfirm }) => {
    const [quantity, setQuantity] = useState(0);
    const [destination, setDestination] = useState('');
    const [notes, setNotes] = useState('');

    if (!isOpen || !drug) return null;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (quantity > 0 && quantity <= (drug.current_stock || 0)) {
            onConfirm({ quantity, destination, notes });
            onClose();
        }
    };

    const maxStock = drug.current_stock || 0;

    return (
        <ModalOverlay onClose={onClose}>
            <div className="w-full max-w-2xl rounded-xl bg-white shadow-2xl dark:bg-slate-800">
                <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3 dark:border-slate-700">
                    <div className="flex items-center gap-2.5">
                        <div className="rounded-lg bg-orange-100 p-1.5 dark:bg-orange-900/30">
                            <ArrowRight className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                        </div>
                        <div>
                            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">
                                Issue Stock
                            </h3>
                            <p className="text-[10px] text-slate-500 dark:text-slate-400">
                                {drug.drug_name} • {drug.drug_code}
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="rounded-lg p-1 transition-colors hover:bg-slate-100 dark:hover:bg-slate-700"
                    >
                        <X className="h-4 w-4 text-slate-500" />
                    </button>
                </div>

                <form onSubmit={handleSubmit}>
                    <div className="p-5">
                        <div className="mb-4 rounded-lg border border-orange-200 bg-orange-50 p-3 dark:border-orange-800/30 dark:bg-orange-950/20">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <Package className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                                    <span className="text-xs font-medium text-orange-700 dark:text-orange-400">
                                        Available Stock
                                    </span>
                                </div>
                                <div className="text-right">
                                    <span className="text-lg font-bold text-orange-700 dark:text-orange-400">
                                        {maxStock}
                                    </span>
                                    <span className="ml-1 text-xs text-orange-600 dark:text-orange-500">
                                        {drug.unit_of_measure || 'units'}
                                    </span>
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                            <div className="space-y-3">
                                <div>
                                    <label className="flex items-center gap-1 text-xs font-medium text-slate-700 dark:text-slate-300">
                                        <Package className="h-3 w-3" />
                                        Quantity to Issue{' '}
                                        <span className="text-red-500">*</span>
                                    </label>
                                    <div className="relative mt-0.5">
                                        <input
                                            type="number"
                                            value={quantity}
                                            onChange={(e) =>
                                                setQuantity(
                                                    parseInt(e.target.value) ||
                                                        0,
                                                )
                                            }
                                            className={`h-8 w-full rounded-lg border px-3 pr-16 text-sm focus:ring-1 focus:outline-none ${
                                                quantity > maxStock
                                                    ? 'border-red-400 focus:border-red-400 focus:ring-red-400'
                                                    : 'border-slate-200 focus:border-orange-400 focus:ring-orange-400 dark:border-slate-700'
                                            } dark:bg-slate-800 dark:text-slate-100`}
                                            min="1"
                                            max={maxStock}
                                            placeholder="Enter quantity"
                                            required
                                        />
                                        <span className="absolute top-1/2 right-2 -translate-y-1/2 text-[10px] text-slate-400">
                                            max {maxStock}
                                        </span>
                                    </div>
                                    {quantity > maxStock && (
                                        <p className="mt-1 text-[10px] text-red-500">
                                            ⚠️ Quantity exceeds available stock
                                        </p>
                                    )}
                                    {quantity > 0 && quantity <= maxStock && (
                                        <p className="mt-1 text-[10px] text-emerald-600 dark:text-emerald-400">
                                            ✓ Will issue {quantity}{' '}
                                            {drug.unit_of_measure || 'units'}
                                        </p>
                                    )}
                                </div>

                                <div>
                                    <label className="flex items-center gap-1 text-xs font-medium text-slate-700 dark:text-slate-300">
                                        <Building2 className="h-3 w-3" />
                                        Destination Department{' '}
                                        <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        value={destination}
                                        onChange={(e) =>
                                            setDestination(e.target.value)
                                        }
                                        className="mt-0.5 h-8 w-full rounded-lg border border-slate-200 px-3 text-sm focus:border-orange-400 focus:ring-1 focus:ring-orange-400 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                                        placeholder="e.g., Ward 3, Lab, Outpatient"
                                        required
                                    />
                                </div>
                            </div>

                            <div className="space-y-3">
                                <div>
                                    <label className="flex items-center gap-1 text-xs font-medium text-slate-700 dark:text-slate-300">
                                        <User className="h-3 w-3" />
                                        Issued By
                                    </label>
                                    <input
                                        type="text"
                                        placeholder="Your name"
                                        className="mt-0.5 h-8 w-full rounded-lg border border-slate-200 px-3 text-sm focus:border-orange-400 focus:ring-1 focus:ring-orange-400 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                                    />
                                </div>

                                <div>
                                    <label className="flex items-center gap-1 text-xs font-medium text-slate-700 dark:text-slate-300">
                                        <FileText className="h-3 w-3" />
                                        Reference Number
                                    </label>
                                    <input
                                        type="text"
                                        placeholder="e.g., ISS-2024-001"
                                        className="mt-0.5 h-8 w-full rounded-lg border border-slate-200 px-3 text-sm focus:border-orange-400 focus:ring-1 focus:ring-orange-400 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                                    />
                                </div>

                                <div>
                                    <label className="flex items-center gap-1 text-xs font-medium text-slate-700 dark:text-slate-300">
                                        <Calendar className="h-3 w-3" />
                                        Issue Date
                                    </label>
                                    <input
                                        type="date"
                                        defaultValue={
                                            new Date()
                                                .toISOString()
                                                .split('T')[0]
                                        }
                                        className="mt-0.5 h-8 w-full rounded-lg border border-slate-200 px-3 text-sm focus:border-orange-400 focus:ring-1 focus:ring-orange-400 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                                    />
                                </div>
                            </div>

                            <div className="col-span-1 md:col-span-2">
                                <label className="flex items-center gap-1 text-xs font-medium text-slate-700 dark:text-slate-300">
                                    <ClipboardList className="h-3 w-3" />
                                    Reason / Notes
                                </label>
                                <textarea
                                    value={notes}
                                    onChange={(e) => setNotes(e.target.value)}
                                    className="mt-0.5 w-full rounded-lg border border-slate-200 px-3 py-1.5 text-sm focus:border-orange-400 focus:ring-1 focus:ring-orange-400 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                                    rows={2}
                                    placeholder="Reason for issue, department request details..."
                                />
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center justify-between border-t border-slate-200 px-5 py-3 dark:border-slate-700">
                        <div className="flex flex-wrap items-center gap-2">
                            <div className="rounded-full bg-orange-100 px-2 py-0.5 text-[10px] font-medium text-orange-700 dark:bg-orange-900/40 dark:text-orange-400">
                                Current: {maxStock}{' '}
                                {drug.unit_of_measure || 'units'}
                            </div>
                            {quantity > 0 && quantity <= maxStock && (
                                <div className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-medium text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400">
                                    New Balance: {maxStock - quantity}{' '}
                                    {drug.unit_of_measure || 'units'}
                                </div>
                            )}
                        </div>
                        <div className="flex gap-2">
                            <button
                                type="button"
                                onClick={onClose}
                                className="rounded-lg border border-slate-300 px-4 py-1.5 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-700"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={quantity <= 0 || quantity > maxStock}
                                className="flex items-center gap-1.5 rounded-lg bg-orange-600 px-4 py-1.5 text-xs font-medium text-white transition-colors hover:bg-orange-700 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                <ArrowRight className="h-3.5 w-3.5" />
                                Issue Stock
                            </button>
                        </div>
                    </div>
                </form>
            </div>
        </ModalOverlay>
    );
};

// ============================================================================
// PrintLabelData Interface
// ============================================================================

interface PrintLabelData {
    quantity: number;
    includeBarcode: boolean;
    includePrice: boolean;
    includeExpiry: boolean;
    notes: string;
}

// ============================================================================
// Main Logistics Component
// ============================================================================

export default function Logistics() {
    const { suppliers = [] } = usePage<LogisticsProps>().props;
    const [searchQuery, setSearchQuery] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [selectedDrug, setSelectedDrug] = useState<Drug | null>(null);
    const [drugs, setDrugs] = useState<Drug[]>([]);
    const [transactions, setTransactions] = useState<DrugTransaction[]>([]);
    const [isAddDrugModalOpen, setIsAddDrugModalOpen] = useState(false);
    const [countModalOpen, setCountModalOpen] = useState(false);
    const [receiveModalOpen, setReceiveModalOpen] = useState(false);
    const [issueModalOpen, setIssueModalOpen] = useState(false);
    const [printLabelModalOpen, setPrintLabelModalOpen] = useState(false);

    // Accordion states
    const [drugInfoOpen, setDrugInfoOpen] = useState(false);
    const [transactionsOpen, setTransactionsOpen] = useState(true);

    console.log('Suppliers in Logistics:', suppliers);

    // Search handler
    const handleSearch = async (query: string) => {
        setSearchQuery(query);
        setIsLoading(true);

        try {
            const response = await Http.get(
                `/pharmacy/drugs/search?q=${encodeURIComponent(query)}`,
            );
            const data = response.data.drug;

            if (response.data.success && response.data.drug) {
                setSelectedDrug(data);
                setTransactions(data.transactions || []);
                setDrugs([data]);
                setDrugInfoOpen(true);
                setTransactionsOpen(true);
            } else {
                setSelectedDrug(null);
                setTransactions([]);
                setDrugs([]);
                setIsAddDrugModalOpen(true);
            }
        } catch (error) {
            console.error('Search error:', error);
            setSelectedDrug(null);
            setTransactions([]);
            setIsAddDrugModalOpen(true);
        } finally {
            setIsLoading(false);
        }
    };

    // Handle adding a new drug
    const handleAddDrug = async (drugData: DrugFormData) => {
        try {
            const response = await Http.post('/pharmacy/drugs', drugData);

            if (response.status === 201 || response.data.success) {
                await handleSearch(drugData.drug_name);
                toast.success('Drug added successfully!');
                setIsAddDrugModalOpen(false);
            } else {
                toast.error(response.data.message || 'Failed to add drug');
            }
        } catch (error) {
            console.error('Error adding drug:', error);
            toast.error('Failed to add drug');
        }
    };

    // Handle Physical Count
    const handlePhysicalCount = async (data: {
        newQuantity: number;
        notes: string;
    }) => {
        try {
            setIsLoading(true);
            const response = await Http.post(
                `/pharmacy/drugs/${selectedDrug?.id}/physical-count`,
                {
                    new_quantity: data.newQuantity,
                    notes: data.notes,
                },
            );

            if (response.data.success) {
                toast.success(`Stock updated to ${data.newQuantity} units`);
                if (selectedDrug) {
                    await handleSearch(selectedDrug.drug_name);
                }
                setCountModalOpen(false);
            } else {
                toast.error(response.data.message || 'Failed to update stock');
            }
        } catch (error: any) {
            console.error('Error updating stock:', error);
            toast.error(
                error.response?.data?.message || 'Failed to update stock',
            );
        } finally {
            setIsLoading(false);
        }
    };

    // Handle Receive Stock
    const handleReceiveStock = async (data: {
        quantity: number;
        supplier: string;
        supplier_id?: number;
        notes: string;
    }) => {
        try {
            setIsLoading(true);

            const payload = {
                drug_id: selectedDrug?.id,
                quantity: data.quantity,
                supplier_id: data.supplier_id,
                supplier_name: data.supplier,
                notes: data.notes,
                transaction_type: 'received',
                received_date: new Date().toISOString().split('T')[0],
            };

            const response = await Http.post(
                '/pharmacy/receive-stock',
                payload,
            );

            if (response.data.success) {
                toast.success(
                    `Successfully received ${data.quantity} units from ${data.supplier}`,
                );
                if (selectedDrug) {
                    await handleSearch(selectedDrug.drug_name);
                }
                setReceiveModalOpen(false);
            } else {
                toast.error(response.data.message || 'Failed to receive stock');
            }
        } catch (error: any) {
            console.error('Error receiving stock:', error);
            toast.error(
                error.response?.data?.message ||
                    'Failed to receive stock. Please try again.',
            );
        } finally {
            setIsLoading(false);
        }
    };

    // Handle Issue Stock
    const handleIssueStock = async (data: {
        quantity: number;
        destination: string;
        notes: string;
    }) => {
        try {
            setIsLoading(true);
            const response = await Http.post(
                `/pharmacy/drugs/${selectedDrug?.id}/issue`,
                {
                    quantity: data.quantity,
                    destination: data.destination,
                    notes: data.notes,
                },
            );

            if (response.data.success) {
                toast.success(
                    `Issued ${data.quantity} units to ${data.destination}`,
                );
                if (selectedDrug) {
                    await handleSearch(selectedDrug.drug_name);
                }
                setIssueModalOpen(false);
            } else {
                toast.error(response.data.message || 'Failed to issue stock');
            }
        } catch (error: any) {
            console.error('Error issuing stock:', error);
            toast.error(
                error.response?.data?.message || 'Failed to issue stock',
            );
        } finally {
            setIsLoading(false);
        }
    };

    // Handle Print Label
    const handlePrintLabel = (data: PrintLabelData) => {
        const printWindow = window.open('', '_blank');
        if (printWindow) {
            printWindow.document.write(`
                <!DOCTYPE html>
                <html>
                <head>
                    <title>Pharmacy Label - ${selectedDrug?.drug_name}</title>
                    <style>
                        body { font-family: Arial, sans-serif; padding: 40px; }
                        .label { border: 2px solid #333; padding: 20px; width: 300px; margin: 0 auto; text-align: center; }
                        .drug-name { font-size: 18px; font-weight: bold; margin-bottom: 5px; }
                        .drug-code { font-size: 12px; color: #666; margin-bottom: 10px; }
                        .barcode { font-family: monospace; font-size: 24px; letter-spacing: 2px; margin: 10px 0; }
                        .info { font-size: 12px; margin: 3px 0; }
                        .quantity { font-size: 16px; font-weight: bold; color: #2563eb; margin: 10px 0; }
                        .footer { font-size: 10px; color: #999; margin-top: 15px; border-top: 1px solid #ddd; padding-top: 10px; }
                        .label-container {
                            display: grid;
                            grid-template-columns: repeat(${data.quantity > 3 ? 3 : data.quantity}, 1fr);
                            gap: 20px;
                            margin: 0 auto;
                            max-width: ${data.quantity > 3 ? '960px' : '320px'};
                        }
                        @media print { body { padding: 20px; } .no-print { display: none; } }
                    </style>
                </head>
                <body>
                    <div class="no-print" style="margin-bottom:20px;text-align:center;">
                        <button onclick="window.print()" style="padding:10px 20px;font-size:16px;cursor:pointer;">🖨️ Print Labels</button>
                        <button onclick="window.close()" style="padding:10px 20px;font-size:16px;cursor:pointer;margin-left:10px;">✖ Close</button>
                    </div>
                    <div class="label-container">
                        ${Array(data.quantity)
                            .fill(0)
                            .map(
                                () => `
                            <div class="label">
                                <div class="drug-name">${selectedDrug?.drug_name}</div>
                                <div class="drug-code">${selectedDrug?.drug_code}</div>
                                ${data.includeBarcode && selectedDrug?.barcode ? `<div class="barcode">${selectedDrug.barcode}</div>` : ''}
                                <div class="info">Strength: ${selectedDrug?.strength || 'N/A'}</div>
                                <div class="info">Form: ${selectedDrug?.dosage_form || 'N/A'}</div>
                                <div class="info">Pack: ${selectedDrug?.pack_size || 'N/A'} ${selectedDrug?.unit_of_measure || 'units'}</div>
                                ${data.includePrice && selectedDrug?.selling_price ? `<div class="info">Price: ZMW ${selectedDrug.selling_price.toFixed(2)}</div>` : ''}
                                ${data.includeExpiry ? `<div class="info" style="color:#dc2626;">Expiry: Check package</div>` : ''}
                                <div class="quantity">Qty: ${data.quantity}</div>
                                ${data.notes ? `<div class="info" style="font-style:italic;">${data.notes}</div>` : ''}
                                <div class="footer">Printed: ${new Date().toLocaleString()}</div>
                            </div>
                        `,
                            )
                            .join('')}
                    </div>
                    <script>
                        setTimeout(() => { window.print(); }, 500);
                    <\/script>
                </body>
                </html>
            `);
            printWindow.document.close();
        } else {
            toast.error('Please allow popups to print labels');
        }
    };

    return (
        <AppLayout
            breadcrumbs={[
                { title: 'Pharmacy', href: '/pharmacy' },
                { title: 'Logistics', href: '/pharmacy/logistics' },
            ]}
        >
            <Head title="Pharmacy Logistics" />

            <div className="flex h-full min-h-screen flex-1 flex-col gap-3 bg-slate-50 p-4 dark:bg-slate-900">
                <PageHeader
                    title="Manage Products"
                    subtitle="Manage drug inventory, stock movements, and transactions"
                />

                {/* Search Section */}
                <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-700 dark:bg-slate-800/90">
                    <DrugSearchBar
                        onSearch={handleSearch}
                        isLoading={isLoading}
                    />
                </div>

                {/* Drug Details with Accordions */}
                {selectedDrug && (
                    <div className="space-y-3">
                        {/* Action Buttons */}
                        <div className="flex flex-wrap gap-1.5">
                            <button
                                onClick={() => setCountModalOpen(true)}
                                className="flex items-center gap-1 rounded-lg bg-purple-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-purple-700"
                            >
                                <Check className="h-3.5 w-3.5" />
                                Physical Count
                            </button>
                            <button
                                onClick={() => setReceiveModalOpen(true)}
                                className="flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-emerald-700"
                            >
                                <DownloadIcon className="h-3.5 w-3.5" />
                                Receive Stock
                            </button>
                            <button
                                onClick={() => setIssueModalOpen(true)}
                                className="flex items-center gap-1 rounded-lg bg-orange-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-orange-700"
                            >
                                <Upload className="h-3.5 w-3.5" />
                                Issue to Department
                            </button>
                            <button
                                onClick={() => setPrintLabelModalOpen(true)}
                                className="flex items-center gap-1 rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-100 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-700"
                            >
                                <Printer className="h-3.5 w-3.5" />
                                Print Commodity Label
                            </button>
                        </div>

                        {/* Accordion: Drug Info */}
                        <Accordion
                            open={drugInfoOpen}
                            onToggle={() => setDrugInfoOpen(!drugInfoOpen)}
                            title="Drug Information"
                            icon={<Package className="h-4 w-4" />}
                        >
                            <DrugDetailsContent drug={selectedDrug} />
                        </Accordion>

                        {/* Accordion: Transactions */}
                        <Accordion
                            open={transactionsOpen}
                            onToggle={() =>
                                setTransactionsOpen(!transactionsOpen)
                            }
                            title="Transaction History"
                            icon={<History className="h-4 w-4" />}
                            badge={transactions.length}
                        >
                            <TransactionHistory transactions={transactions} />
                        </Accordion>
                    </div>
                )}

                {/* No Drug Selected State */}
                {!selectedDrug && !isLoading && (
                    <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-slate-200 bg-white py-12 dark:border-slate-700 dark:bg-slate-800/50">
                        <Package className="h-12 w-12 text-slate-300 dark:text-slate-600" />
                        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                            Search for a drug by name, barcode, or generic name
                        </p>
                        <p className="text-xs text-slate-400 dark:text-slate-500">
                            Use the search bar above to find and manage drugs
                        </p>
                    </div>
                )}

                {/* Loading State */}
                {isLoading && (
                    <div className="flex items-center justify-center py-8">
                        <RefreshCw className="h-6 w-6 animate-spin text-blue-500" />
                        <span className="ml-2 text-sm text-slate-500 dark:text-slate-400">
                            Searching...
                        </span>
                    </div>
                )}
            </div>

            {/* Add Drug Modal */}
            <AddDrugModal
                isOpen={isAddDrugModalOpen}
                onClose={() => setIsAddDrugModalOpen(false)}
                onAddDrug={handleAddDrug}
                searchQuery={searchQuery}
            />

            {/* Physical Count Modal */}
            <PhysicalCountModal
                isOpen={countModalOpen}
                onClose={() => setCountModalOpen(false)}
                drug={selectedDrug}
                onConfirm={handlePhysicalCount}
            />

            {/* Receive Stock Modal */}
            <ReceiveDrugModal
                isOpen={receiveModalOpen}
                onClose={() => setReceiveModalOpen(false)}
                drug={selectedDrug}
                isLoading={isLoading}
                onConfirm={handleReceiveStock}
            />

            {/* Issue Stock Modal */}
            <IssueDrugModal
                isOpen={issueModalOpen}
                onClose={() => setIssueModalOpen(false)}
                drug={selectedDrug}
                onConfirm={handleIssueStock}
            />

            {/* Print Label Modal */}
            <PrintLabelModal
                isOpen={printLabelModalOpen}
                onClose={() => setPrintLabelModalOpen(false)}
                drug={selectedDrug}
                onPrint={handlePrintLabel}
            />
        </AppLayout>
    );
}
