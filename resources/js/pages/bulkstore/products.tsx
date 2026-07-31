// pages/pharmacies/logistics.tsx

import React, { useState, useEffect, useRef, useCallback } from 'react';
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
    CirclePlus,
    LibraryBig,
    Scan,
    Camera,
    Zap,
    Settings,
    Activity,
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { Badge } from '@/components/ui/badge';

// ============================================================================
// Types - Updated to match your API response
// ============================================================================

interface Drug {
    id: number;
    product_uuid: string | null;
    description: string | null;
    product_name: string;
    product_code: string;
    category_id: number | null;
    strength: string | null;
    unit: string | null;
    form: string | null;
    quantity: string | number;
    expiry_date: string | null;
    transaction_type: string;
    from_deparment_id: number | null;
    to_department_id: number | null;
    supplier_id: number | null;
    created_by: string | null;
    created_by_department: number | null;
    created_at: string;
    updated_at: string;
    // Additional fields that might be returned
    current_stock?: number;
    drug_code?: string;
    drug_name?: string;
    generic_name?: string | null;
    brand_name?: string | null;
    barcode?: string | null;
    qr_code?: string | null;
    service_id?: number | null;
    therapeutic_class?: string | null;
    schedule_class?: string | null;
    dosage_form?: string | null;
    route_of_administration?: string | null;
    unit_of_measure?: string | null;
    pack_size?: number | null;
    minimum_stock_level?: number | null;
    maximum_stock_level?: number | null;
    reorder_level?: number | null;
    purchase_price?: number | null;
    selling_price?: number | null;
    insurance_price?: number | null;
    is_arv?: number;
    is_tb_drug?: number;
    is_emergency?: number;
    is_controlled?: number;
    track_batches?: number;
    track_expiry?: number;
    allow_negative_stock?: number;
    is_active?: number;
    discontinued?: number;
    transactions?: DrugTransaction[];
}

interface DrugTransaction {
    id: number;
    product_uuid: string | null;
    description: string | null;
    product_name: string;
    product_code: string;
    category_id: number | null;
    strength: string | null;
    unit: string | null;
    form: string | null;
    quantity: string | number;
    expiry_date: string | null;
    transaction_type: string;
    from_deparment_id: number | null;
    to_department_id: number | null;
    supplier_id: number | null;
    created_by: string | null;
    created_by_department: number | null;
    created_at: string;
    updated_at: string;
    // Legacy fields for compatibility
    drug_id?: number;
    balance_after?: number;
    reference_number?: string | null;
    transaction_date?: string;
    notes?: string | null;
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

interface PrintLabelData {
    quantity: number;
    includeBarcode: boolean;
    includePrice: boolean;
    includeExpiry: boolean;
    notes: string;
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
// Helper Components
// ============================================================================

interface AccordionProps {
    open: boolean;
    onToggle: () => void;
    title: string;
    icon?: React.ReactNode;
    badge?: number;
    children: React.ReactNode;
}

const Accordion: React.FC<AccordionProps> = ({
    open,
    onToggle,
    title,
    icon,
    badge,
    children,
}) => (
    <div className="overflow-hidden rounded-lg border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800">
        <button
            onClick={onToggle}
            className="flex w-full items-center justify-between px-4 py-3 text-left transition-colors hover:bg-slate-50 dark:hover:bg-slate-700/50"
        >
            <div className="flex items-center gap-2">
                <span className="text-slate-500 dark:text-slate-400">
                    {icon}
                </span>
                <span className="font-medium text-slate-700 dark:text-slate-300">
                    {title}
                </span>
                {badge !== undefined && badge > 0 && (
                    <Badge variant="secondary" className="ml-2">
                        {badge}
                    </Badge>
                )}
            </div>
            {open ? (
                <ChevronDown className="h-4 w-4 text-slate-400" />
            ) : (
                <ChevronRight className="h-4 w-4 text-slate-400" />
            )}
        </button>
        {open && (
            <div className="border-t border-slate-200 px-4 py-3 dark:border-slate-700">
                {children}
            </div>
        )}
    </div>
);

interface DrugDetailsContentProps {
    drug: Drug;
}

const DrugDetailsContent: React.FC<DrugDetailsContentProps> = ({ drug }) => {
    // Calculate total stock from all transactions
    const totalStock =
        drug.transactions?.reduce((sum, t) => {
            const qty =
                typeof t.quantity === 'string'
                    ? parseFloat(t.quantity)
                    : t.quantity;
            return sum + qty;
        }, 0) ||
        parseFloat(drug.quantity as string) ||
        0;

    return (
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            <div className="space-y-1.5">
                <div className="flex items-center gap-2 text-sm">
                    <span className="font-medium text-slate-600 dark:text-slate-400">
                        Product Name:
                    </span>
                    <span className="text-slate-800 dark:text-slate-200">
                        {drug.product_name || drug.drug_name || 'N/A'}
                    </span>
                </div>
                {drug.description && (
                    <div className="flex items-center gap-2 text-sm">
                        <span className="font-medium text-slate-600 dark:text-slate-400">
                            Description:
                        </span>
                        <span className="text-slate-800 dark:text-slate-200">
                            {drug.description}
                        </span>
                    </div>
                )}
                {drug.generic_name && (
                    <div className="flex items-center gap-2 text-sm">
                        <span className="font-medium text-slate-600 dark:text-slate-400">
                            Generic:
                        </span>
                        <span className="text-slate-800 dark:text-slate-200">
                            {drug.generic_name}
                        </span>
                    </div>
                )}
            </div>
            <div className="space-y-1.5">
                <div className="flex items-center gap-2 text-sm">
                    <span className="font-medium text-slate-600 dark:text-slate-400">
                        Code:
                    </span>
                    <span className="font-mono text-xs text-slate-800 dark:text-slate-200">
                        {drug.product_code || drug.drug_code || 'N/A'}
                    </span>
                </div>
                {drug.barcode && (
                    <div className="flex items-center gap-2 text-sm">
                        <span className="font-medium text-slate-600 dark:text-slate-400">
                            Barcode:
                        </span>
                        <span className="font-mono text-xs text-slate-800 dark:text-slate-200">
                            {drug.barcode}
                        </span>
                    </div>
                )}
                <div className="flex items-center gap-2 text-sm">
                    <span className="font-medium text-slate-600 dark:text-slate-400">
                        Total Stock:
                    </span>
                    <span className="text-lg font-bold text-blue-600 dark:text-blue-400">
                        {totalStock}
                    </span>
                    <span className="text-xs text-slate-500">
                        {drug.unit || drug.unit_of_measure || 'units'}
                    </span>
                </div>
            </div>
            <div className="space-y-1.5">
                {drug.strength && (
                    <div className="flex items-center gap-2 text-sm">
                        <span className="font-medium text-slate-600 dark:text-slate-400">
                            Strength:
                        </span>
                        <span className="text-slate-800 dark:text-slate-200">
                            {drug.strength}
                        </span>
                    </div>
                )}
                <div className="flex items-center gap-2 text-sm">
                    <span className="font-medium text-slate-600 dark:text-slate-400">
                        Form:
                    </span>
                    <span className="text-slate-800 dark:text-slate-200">
                        {drug.form || drug.dosage_form || 'N/A'}
                    </span>
                </div>
                {drug.expiry_date && (
                    <div className="flex items-center gap-2 text-sm">
                        <span className="font-medium text-slate-600 dark:text-slate-400">
                            Expiry:
                        </span>
                        <span className="text-amber-600 dark:text-amber-400">
                            {new Date(drug.expiry_date).toLocaleDateString()}
                        </span>
                    </div>
                )}
            </div>
        </div>
    );
};

interface TransactionHistoryProps {
    transactions: DrugTransaction[];
}

const TransactionHistory: React.FC<TransactionHistoryProps> = ({
    transactions,
}) => {
    if (!transactions || transactions.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-8 text-center">
                <History className="h-8 w-8 text-slate-300 dark:text-slate-600" />
                <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                    No transactions recorded for this product
                </p>
            </div>
        );
    }

    const getTypeIcon = (type: string) => {
        const typeMap: Record<string, React.ReactNode> = {
            received: <ArrowLeft className="h-4 w-4 text-emerald-500" />,
            issuing: <ArrowRight className="h-4 w-4 text-orange-500" />,
            issued: <ArrowRight className="h-4 w-4 text-orange-500" />,
            physical_count: <Check className="h-4 w-4 text-purple-500" />,
            stock_refill: <Plus className="h-4 w-4 text-blue-500" />,
            dispensed: <Minus className="h-4 w-4 text-red-500" />,
            adjustment: <RefreshCw className="h-4 w-4 text-amber-500" />,
        };
        return typeMap[type] || <Package className="h-4 w-4 text-slate-500" />;
    };

    const getTypeLabel = (type: string) => {
        const labels: Record<string, string> = {
            received: 'Received',
            issuing: 'Issued',
            issued: 'Issued',
            physical_count: 'Physical Count',
            stock_refill: 'Stock Refill',
            dispensed: 'Dispensed',
            adjustment: 'Adjustment',
        };
        return labels[type] || type;
    };

    const getTypeColor = (type: string) => {
        const colors: Record<string, string> = {
            received:
                'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
            issuing:
                'bg-orange-50 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
            issued: 'bg-orange-50 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
            physical_count:
                'bg-purple-50 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
            stock_refill:
                'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
            dispensed:
                'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400',
            adjustment:
                'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
        };
        return (
            colors[type] ||
            'bg-slate-50 text-slate-700 dark:bg-slate-800 dark:text-slate-400'
        );
    };

    return (
        <div className="space-y-2">
            {transactions.map((transaction) => {
                const qty =
                    typeof transaction.quantity === 'string'
                        ? parseFloat(transaction.quantity)
                        : transaction.quantity;
                const isIncoming = ['received', 'stock_refill'].includes(
                    transaction.transaction_type,
                );
                const isOutgoing = ['issuing', 'issued', 'dispensed'].includes(
                    transaction.transaction_type,
                );

                return (
                    <div
                        key={transaction.id}
                        className="flex items-center justify-between rounded-lg border border-slate-100 p-3 dark:border-slate-700"
                    >
                        <div className="flex items-center gap-3">
                            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-700">
                                {getTypeIcon(transaction.transaction_type)}
                            </div>
                            <div>
                                <div className="flex items-center gap-2">
                                    <span
                                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${getTypeColor(
                                            transaction.transaction_type,
                                        )}`}
                                    >
                                        {getTypeLabel(
                                            transaction.transaction_type,
                                        )}
                                    </span>
                                    {transaction.reference_number && (
                                        <span className="text-xs text-slate-500 dark:text-slate-400">
                                            #{transaction.reference_number}
                                        </span>
                                    )}
                                </div>
                                <div className="text-xs text-slate-500 dark:text-slate-400">
                                    {new Date(
                                        transaction.created_at ||
                                            transaction.transaction_date ||
                                            Date.now(),
                                    ).toLocaleString()}
                                    {transaction.created_by &&
                                        ` • ${transaction.created_by}`}
                                </div>
                                {transaction.notes && (
                                    <div className="mt-0.5 text-xs text-slate-400 dark:text-slate-500">
                                        {transaction.notes}
                                    </div>
                                )}
                            </div>
                        </div>
                        <div className="text-right">
                            <div
                                className={`font-bold ${
                                    isIncoming
                                        ? 'text-emerald-600 dark:text-emerald-400'
                                        : isOutgoing
                                          ? 'text-red-600 dark:text-red-400'
                                          : 'text-slate-600 dark:text-slate-400'
                                }`}
                            >
                                {isIncoming ? '+' : isOutgoing ? '-' : ''}
                                {qty}
                            </div>
                            <div className="text-xs text-slate-400 dark:text-slate-500">
                                {transaction.unit || 'units'}
                            </div>
                        </div>
                    </div>
                );
            })}
        </div>
    );
};

// ============================================================================
// Barcode Scanner Component
// ============================================================================

interface BarcodeScannerProps {
    onScan: (barcode: string) => void;
    isScanning: boolean;
    onToggleScan: () => void;
}

const BarcodeScanner: React.FC<BarcodeScannerProps> = ({
    onScan,
    isScanning,
    onToggleScan,
}) => {
    const [manualInput, setManualInput] = useState('');
    const inputRef = useRef<HTMLInputElement>(null);

    const handleManualSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (manualInput.trim()) {
            onScan(manualInput.trim());
            setManualInput('');
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter' && isScanning) {
            e.preventDefault();
            const input = (e.target as HTMLInputElement).value;
            if (input.trim()) {
                onScan(input.trim());
                if (inputRef.current) {
                    inputRef.current.value = '';
                }
            }
        }
    };

    useEffect(() => {
        if (isScanning && inputRef.current) {
            inputRef.current.focus();
        }
    }, [isScanning]);

    return (
        <div className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
            <div className="mb-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Scan className="h-5 w-5 text-blue-500" />
                    <h3 className="font-medium text-slate-700 dark:text-slate-300">
                        Barcode Scanner
                    </h3>
                    <Badge
                        variant={isScanning ? 'default' : 'secondary'}
                        className={
                            isScanning
                                ? 'animate-pulse bg-emerald-500'
                                : 'bg-slate-300'
                        }
                    >
                        {isScanning ? 'Scanning...' : 'Paused'}
                    </Badge>
                </div>
                <button
                    onClick={onToggleScan}
                    className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                        isScanning
                            ? 'bg-amber-500 text-white hover:bg-amber-600'
                            : 'bg-emerald-500 text-white hover:bg-emerald-600'
                    }`}
                >
                    {isScanning ? (
                        <>
                            <X className="h-3.5 w-3.5" />
                            Stop
                        </>
                    ) : (
                        <>
                            <Zap className="h-3.5 w-3.5" />
                            Start
                        </>
                    )}
                </button>
            </div>

            <div className="space-y-3">
                <div className="relative">
                    <Barcode className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                        ref={inputRef}
                        type="text"
                        placeholder={
                            isScanning
                                ? 'Scan barcode or type code...'
                                : 'Click "Start" to enable scanning'
                        }
                        disabled={!isScanning}
                        onKeyDown={handleKeyDown}
                        className={`h-10 w-full rounded-lg border pr-4 pl-10 text-sm focus:ring-1 focus:outline-none ${
                            isScanning
                                ? 'border-blue-300 bg-white focus:border-blue-400 focus:ring-blue-400 dark:border-blue-700 dark:bg-slate-900 dark:focus:border-blue-500'
                                : 'border-slate-200 bg-slate-50 text-slate-400 dark:border-slate-700 dark:bg-slate-800'
                        }`}
                        autoFocus={isScanning}
                    />
                    {isScanning && (
                        <div className="absolute top-1/2 right-3 -translate-y-1/2">
                            <span className="flex h-2 w-2">
                                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
                                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500"></span>
                            </span>
                        </div>
                    )}
                </div>

                <div className="flex flex-wrap gap-2">
                    <button
                        onClick={() => {
                            if (isScanning && inputRef.current) {
                                inputRef.current.focus();
                            }
                        }}
                        className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs text-slate-600 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-700"
                    >
                        <Camera className="h-3.5 w-3.5" />
                        Focus Scanner
                    </button>
                    <button
                        onClick={() => {
                            if (inputRef.current) {
                                inputRef.current.value = '';
                                inputRef.current.focus();
                            }
                        }}
                        className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs text-slate-600 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-700"
                    >
                        <RefreshCw className="h-3.5 w-3.5" />
                        Clear
                    </button>
                </div>

                <form onSubmit={handleManualSubmit} className="flex gap-2">
                    <input
                        type="text"
                        value={manualInput}
                        onChange={(e) => setManualInput(e.target.value)}
                        placeholder="Or type barcode manually..."
                        className="flex-1 rounded-lg border border-slate-200 px-3 py-1.5 text-sm focus:border-blue-400 focus:ring-1 focus:ring-blue-400 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                    />
                    <button
                        type="submit"
                        className="rounded-lg bg-blue-600 px-4 py-1.5 text-sm font-medium text-white transition-colors hover:bg-blue-700"
                    >
                        <Search className="h-4 w-4" />
                    </button>
                </form>
            </div>

            <div className="mt-3 rounded-lg bg-slate-50 p-2 dark:bg-slate-700/50">
                <p className="text-xs text-slate-500 dark:text-slate-400">
                    <span className="font-medium">How to use:</span> Click
                    "Start" then scan a barcode using your barcode scanner. The
                    scanner will automatically input the code and press Enter.
                    You can also type barcodes manually.
                </p>
            </div>
        </div>
    );
};

// ============================================================================
// Search Results Component
// ============================================================================

interface SearchResultsProps {
    results: Drug[];
    isLoading: boolean;
    searchQuery: string;
    onSelectDrug: (drug: Drug) => void;
    onAddProduct: () => void;
    onClear: () => void;
}

const SearchResults: React.FC<SearchResultsProps> = ({
    results,
    isLoading,
    searchQuery,
    onSelectDrug,
    onAddProduct,
    onClear,
}) => {
    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-8">
                <RefreshCw className="h-6 w-6 animate-spin text-blue-500" />
                <span className="ml-2 text-sm text-slate-500">
                    Searching...
                </span>
            </div>
        );
    }

    if (results.length === 0 && searchQuery) {
        return (
            <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-slate-200 py-10 dark:border-slate-700">
                <div className="rounded-full bg-blue-50 p-3 dark:bg-blue-900/20">
                    <Package className="h-8 w-8 text-blue-500" />
                </div>
                <h4 className="mt-3 text-sm font-medium text-slate-700 dark:text-slate-300">
                    No products found
                </h4>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                    We couldn't find "{searchQuery}" in your inventory
                </p>
                <button
                    onClick={onAddProduct}
                    className="mt-4 flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700"
                >
                    <CirclePlus className="h-4 w-4" />
                    Add New Product
                </button>
                <button
                    onClick={onClear}
                    className="mt-2 text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                >
                    Clear search
                </button>
            </div>
        );
    }

    if (results.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-8 text-center">
                <LibraryBig className="h-8 w-8 text-slate-300 dark:text-slate-600" />
                <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                    Search for a product by name, barcode, or generic name
                </p>
                <p className="text-xs text-slate-400 dark:text-slate-500">
                    Or use the barcode scanner above
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-1.5">
            {results.map((drug) => {
                // Calculate total stock for display
                const totalStock =
                    drug.transactions?.reduce((sum, t) => {
                        const qty =
                            typeof t.quantity === 'string'
                                ? parseFloat(t.quantity)
                                : t.quantity;
                        return sum + qty;
                    }, 0) ||
                    parseFloat(drug.quantity as string) ||
                    0;

                return (
                    <button
                        key={drug.id}
                        onClick={() => onSelectDrug(drug)}
                        className="w-full rounded-lg border border-slate-200 p-3 text-left transition-colors hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800"
                    >
                        <div className="flex items-center justify-between">
                            <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2">
                                    <span className="font-medium text-slate-800 dark:text-slate-100">
                                        {drug.product_name ||
                                            drug.drug_name ||
                                            'Unnamed Product'}
                                    </span>
                                    <Badge
                                        variant="outline"
                                        className="text-[10px]"
                                    >
                                        {drug.product_code ||
                                            drug.drug_code ||
                                            'N/A'}
                                    </Badge>
                                    {drug.barcode && (
                                        <Badge
                                            variant="outline"
                                            className="bg-blue-50 text-[10px] dark:bg-blue-900/20"
                                        >
                                            <Barcode className="mr-1 h-3 w-3" />
                                            {drug.barcode}
                                        </Badge>
                                    )}
                                </div>
                                <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                                    {drug.description && (
                                        <span>{drug.description}</span>
                                    )}
                                    {drug.strength && (
                                        <span className="flex items-center gap-0.5">
                                            <Package className="h-3 w-3" />
                                            {drug.strength}
                                        </span>
                                    )}
                                    {drug.form && <span>{drug.form}</span>}
                                    {drug.unit && (
                                        <span>Unit: {drug.unit}</span>
                                    )}
                                </div>
                            </div>
                            <div className="ml-4 flex flex-col items-end">
                                <div className="text-sm font-bold text-slate-800 dark:text-slate-100">
                                    {totalStock}
                                </div>
                                <div className="text-[10px] text-slate-500 dark:text-slate-400">
                                    {drug.unit ||
                                        drug.unit_of_measure ||
                                        'units'}
                                </div>
                            </div>
                        </div>
                    </button>
                );
            })}
        </div>
    );
};

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
    const [showResults, setShowResults] = useState(false);
    const [isScanning, setIsScanning] = useState(true);
    const [recentScans, setRecentScans] = useState<string[]>([]);

    const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const scanInputRef = useRef<HTMLInputElement>(null);

    // ============================================================================
    // Core Search Function - Updated to handle your API response
    // ============================================================================

    const performSearch = useCallback(async (query: string) => {
        if (!query.trim()) {
            setDrugs([]);
            setSelectedDrug(null);
            setShowResults(false);
            return;
        }

        setIsLoading(true);
        setShowResults(true);

        try {
            const response = await Http.get(
                `/bulk-store/product/search/${encodeURIComponent(query)}`,
            );

            console.log('API Response:', response.data); // Debug log

            // Check if we got an array of transactions (your current API response)
            if (Array.isArray(response.data)) {
                const transactions = response.data as DrugTransaction[];

                if (transactions.length > 0) {
                    // Group transactions by product
                    const firstTransaction = transactions[0];

                    // Create a drug object from the first transaction
                    const drug: Drug = {
                        id: firstTransaction.id,
                        product_uuid: firstTransaction.product_uuid,
                        description: firstTransaction.description,
                        product_name: firstTransaction.product_name,
                        product_code: firstTransaction.product_code,
                        category_id: firstTransaction.category_id,
                        strength: firstTransaction.strength,
                        unit: firstTransaction.unit,
                        form: firstTransaction.form,
                        quantity: firstTransaction.quantity,
                        expiry_date: firstTransaction.expiry_date,
                        transaction_type: firstTransaction.transaction_type,
                        from_deparment_id: firstTransaction.from_deparment_id,
                        to_department_id: firstTransaction.to_department_id,
                        supplier_id: firstTransaction.supplier_id,
                        created_by: firstTransaction.created_by,
                        created_by_department:
                            firstTransaction.created_by_department,
                        created_at: firstTransaction.created_at,
                        updated_at: firstTransaction.updated_at,
                        transactions: transactions, // Store all transactions
                        current_stock: transactions.reduce((sum, t) => {
                            const qty =
                                typeof t.quantity === 'string'
                                    ? parseFloat(t.quantity)
                                    : t.quantity;
                            return sum + qty;
                        }, 0),
                    };

                    setDrugs([drug]);
                    setSelectedDrug(drug);
                    setTransactions(transactions);
                    setDrugInfoOpen(true);
                    setTransactionsOpen(true);
                    setShowResults(false);

                    // Add to recent scans
                    setRecentScans((prev) => {
                        const newScans = [
                            query,
                            ...prev.filter((s) => s !== query),
                        ];
                        return newScans.slice(0, 10);
                    });
                } else {
                    setDrugs([]);
                    setSelectedDrug(null);
                    setTransactions([]);
                    toast.error('No products found with this barcode');
                }
            }
            // Handle the expected format with success flag
            else if (response.data.success) {
                const data = response.data.drug;
                if (data) {
                    setDrugs([data]);
                    setSelectedDrug(data);
                    setTransactions(data.transactions || []);
                    setDrugInfoOpen(true);
                    setTransactionsOpen(true);
                    setShowResults(false);

                    setRecentScans((prev) => {
                        const newScans = [
                            query,
                            ...prev.filter((s) => s !== query),
                        ];
                        return newScans.slice(0, 10);
                    });
                } else {
                    setDrugs([]);
                    setSelectedDrug(null);
                    setTransactions([]);
                    toast.error('Product not found');
                }
            }
            // Handle other response formats
            else {
                console.warn('Unexpected response format:', response.data);
                setDrugs([]);
                setSelectedDrug(null);
                setTransactions([]);
                toast.error('Unexpected response format');
            }
        } catch (error: any) {
            console.error('Search error:', error);
            setDrugs([]);
            setSelectedDrug(null);
            setTransactions([]);
            toast.error(
                error.response?.data?.message || 'Failed to search product',
            );
        } finally {
            setIsLoading(false);
        }
    }, []);

    // ============================================================================
    // Navigation Handlers - Navigate to specific routes
    // ============================================================================

    const navigateToReceive = (drug: Drug) => {
        const uuid = drug.product_uuid || drug.id;
        router.visit(`/bulkstore/receive/product/${uuid}`);
    };

    const navigateToAdjustment = (drug: Drug) => {
        const uuid = drug.product_uuid || drug.id;
        router.visit(`/bulkstore/adjustment/${uuid}`);
    };

    const navigateToStockStatus = (drug: Drug) => {
        const uuid = drug.product_uuid || drug.id;
        router.visit(`/bulkstore/stock-status/${uuid}`);
    };

    const navigateToIssue = (drug: Drug) => {
        const uuid = drug.product_uuid || drug.id;
        router.visit(`/bulkstore/issue/${uuid}`);
    };

    const navigateToPhysicalCount = (drug: Drug) => {
        const uuid = drug.product_uuid || drug.id;
        router.visit(`/bulkstore/physical-count/${uuid}`);
    };

    const navigateToTransactionHistory = (drug: Drug) => {
        const uuid = drug.product_uuid || drug.id;
        router.visit(`/bulkstore/transactions/${uuid}`);
    };

    // ============================================================================
    // Barcode Scan Handler
    // ============================================================================

    const handleBarcodeScan = useCallback(
        (barcode: string) => {
            if (!barcode.trim()) return;

            if (scanInputRef.current) {
                scanInputRef.current.value = '';
            }

            performSearch(barcode.trim());
        },
        [performSearch],
    );

    // ============================================================================
    // Search Handlers
    // ============================================================================

    const handleSearch = (query: string) => {
        setSearchQuery(query);
        setShowResults(true);

        if (searchTimeoutRef.current) {
            clearTimeout(searchTimeoutRef.current);
        }

        searchTimeoutRef.current = setTimeout(() => {
            performSearch(query);
        }, 300);
    };

    const handleSelectDrug = (drug: Drug) => {
        setSelectedDrug(drug);
        setTransactions(drug.transactions || []);
        setDrugs([drug]);
        setShowResults(false);
        setDrugInfoOpen(true);
        setTransactionsOpen(true);
    };

    const handleAddProduct = () => {
        setIsAddDrugModalOpen(true);
        setShowResults(false);
    };

    const handleClearSearch = () => {
        setSearchQuery('');
        setDrugs([]);
        setSelectedDrug(null);
        setShowResults(false);
    };

    // ============================================================================
    // Drug Management Handlers
    // ============================================================================

    const handleAddDrug = async (drugData: DrugFormData) => {
        try {
            const response = await Http.post('/pharmacy/drugs', drugData);

            if (response.status === 201 || response.data.success) {
                toast.success('Drug added successfully!');
                setIsAddDrugModalOpen(false);
                await performSearch(drugData.drug_name);
            } else {
                toast.error(response.data.message || 'Failed to add drug');
            }
        } catch (error) {
            console.error('Error adding drug:', error);
            toast.error('Failed to add drug');
        }
    };

    // ============================================================================
    // Print Label Handler
    // ============================================================================

    const handlePrintLabel = (data: PrintLabelData) => {
        const printWindow = window.open('', '_blank');
        if (printWindow) {
            const drugName =
                selectedDrug?.product_name ||
                selectedDrug?.drug_name ||
                'Unknown Product';
            const drugCode =
                selectedDrug?.product_code || selectedDrug?.drug_code || 'N/A';
            const barcode = selectedDrug?.barcode || drugCode;

            printWindow.document.write(`
                <!DOCTYPE html>
                <html>
                <head>
                    <title>Pharmacy Label - ${drugName}</title>
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
                                <div class="drug-name">${drugName}</div>
                                <div class="drug-code">${drugCode}</div>
                                ${data.includeBarcode ? `<div class="barcode">${barcode}</div>` : ''}
                                <div class="info">Strength: ${selectedDrug?.strength || 'N/A'}</div>
                                <div class="info">Form: ${selectedDrug?.form || selectedDrug?.dosage_form || 'N/A'}</div>
                                <div class="info">Pack: ${selectedDrug?.unit || selectedDrug?.unit_of_measure || 'N/A'}</div>
                                ${data.includePrice && selectedDrug?.selling_price ? `<div class="info">Price: ZMW ${selectedDrug.selling_price.toFixed(2)}</div>` : ''}
                                ${data.includeExpiry && selectedDrug?.expiry_date ? `<div class="info" style="color:#dc2626;">Expiry: ${new Date(selectedDrug.expiry_date).toLocaleDateString()}</div>` : ''}
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

    // ============================================================================
    // Keyboard Shortcuts
    // ============================================================================

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.ctrlKey && e.shiftKey && e.key === 'S') {
                e.preventDefault();
                setIsScanning((prev) => !prev);
                if (!isScanning && scanInputRef.current) {
                    setTimeout(() => scanInputRef.current?.focus(), 100);
                }
            }
            if (e.ctrlKey && e.shiftKey && e.key === 'N') {
                e.preventDefault();
                setIsAddDrugModalOpen(true);
            }
            if (e.key === 'Escape') {
                handleClearSearch();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isScanning]);

    // ============================================================================
    // Auto-focus scanner on load
    // ============================================================================

    useEffect(() => {
        if (isScanning && scanInputRef.current) {
            setTimeout(() => scanInputRef.current?.focus(), 500);
        }
    }, [isScanning]);

    // Accordion states
    const [drugInfoOpen, setDrugInfoOpen] = useState(false);
    const [transactionsOpen, setTransactionsOpen] = useState(true);

    return (
        <AppLayout
            breadcrumbs={[
                { title: 'BulkStore', href: '/pharmacy' },
                { title: 'Product Management', href: '/pharmacy/logistics' },
            ]}
        >
            <Head title="Product Management - Barcode Scanner" />

            <div className="flex h-full min-h-screen flex-1 flex-col gap-3 bg-slate-50 p-4 dark:bg-slate-900">
                <PageHeader
                    title="Product Management"
                    subtitle="Scan barcodes to quickly find and manage products"
                    actions={
                        [<div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-xs">
                                <kbd className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[10px] dark:bg-slate-700">
                                    Ctrl+Shift+S
                                </kbd>{' '}
                                Toggle Scanner
                            </Badge>
                            <Badge variant="outline" className="text-xs">
                                <kbd className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[10px] dark:bg-slate-700">
                                    Ctrl+Shift+N
                                </kbd>{' '}
                                New Product
                            </Badge>
                        </div>]
                    }
                />

                {/* Barcode Scanner Section */}
                <BarcodeScanner
                    onScan={handleBarcodeScan}
                    isScanning={isScanning}
                    onToggleScan={() => setIsScanning((prev) => !prev)}
                />

                {/* Recent Scans */}
                {recentScans.length > 0 && (
                    <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                            Recent:
                        </span>
                        {recentScans.map((scan, index) => (
                            <button
                                key={index}
                                onClick={() => performSearch(scan)}
                                className="rounded-lg bg-slate-100 px-2.5 py-1 text-xs text-slate-600 transition-colors hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600"
                            >
                                {scan}
                            </button>
                        ))}
                    </div>
                )}

                {/* Search Bar (fallback) */}
                <div className="relative">
                    <div className="flex items-center gap-2">
                        <div className="relative flex-1">
                            <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
                            <input
                                type="text"
                                placeholder="Search by drug name, barcode, or generic name..."
                                value={searchQuery}
                                onChange={(e) => handleSearch(e.target.value)}
                                className="h-10 w-full rounded-lg border border-slate-200 bg-white pr-4 pl-10 text-sm focus:border-blue-400 focus:ring-1 focus:ring-blue-400 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                            />
                            {searchQuery && (
                                <button
                                    onClick={handleClearSearch}
                                    className="absolute top-1/2 right-3 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                                >
                                    <X className="h-4 w-4" />
                                </button>
                            )}
                        </div>
                        <button
                            onClick={() => handleAddProduct()}
                            className="flex h-10 items-center gap-2 rounded-lg bg-blue-600 px-4 text-sm font-medium text-white transition-colors hover:bg-blue-700"
                        >
                            <CirclePlus className="h-4 w-4" />
                            Add Product
                        </button>
                    </div>

                    {/* Search Results Dropdown */}
                    {showResults && (
                        <div className="absolute top-full right-0 left-0 z-20 mt-1 max-h-[400px] overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-lg dark:border-slate-700 dark:bg-slate-800">
                            <div className="p-3">
                                <SearchResults
                                    results={drugs}
                                    isLoading={isLoading}
                                    searchQuery={searchQuery}
                                    onSelectDrug={handleSelectDrug}
                                    onAddProduct={handleAddProduct}
                                    onClear={handleClearSearch}
                                />
                            </div>
                        </div>
                    )}
                </div>

                {/* Selected Drug Details */}
                {selectedDrug && !showResults && (
                    <div className="space-y-3">
                        {/* Drug Info Accordion */}
                        <Accordion
                            open={drugInfoOpen}
                            onToggle={() => setDrugInfoOpen(!drugInfoOpen)}
                            title="Drug Information"
                            icon={<Package className="h-4 w-4" />}
                        >
                            <DrugDetailsContent drug={selectedDrug} />
                        </Accordion>

                        {/* Action Buttons - Navigation to routes */}
                        <div className="flex flex-wrap gap-2">
                            <button
                                onClick={() => navigateToReceive(selectedDrug)}
                                className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-emerald-700"
                            >
                                <ArrowLeft className="h-3.5 w-3.5" />
                                Receive
                            </button>
                            <button
                                onClick={() => navigateToIssue(selectedDrug)}
                                className="flex items-center gap-1.5 rounded-lg bg-orange-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-orange-700"
                            >
                                <ArrowRight className="h-3.5 w-3.5" />
                                Issue
                            </button>
                            <button
                                onClick={() =>
                                    navigateToPhysicalCount(selectedDrug)
                                }
                                className="flex items-center gap-1.5 rounded-lg bg-purple-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-purple-700"
                            >
                                <Check className="h-3.5 w-3.5" />
                                Physical Count
                            </button>
                            <button
                                onClick={() =>
                                    navigateToAdjustment(selectedDrug)
                                }
                                className="flex items-center gap-1.5 rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-amber-700"
                            >
                                <Settings className="h-3.5 w-3.5" />
                                Adjust Stock
                            </button>
                            <button
                                onClick={() =>
                                    navigateToStockStatus(selectedDrug)
                                }
                                className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-blue-700"
                            >
                                <Activity className="h-3.5 w-3.5" />
                                Stock Status
                            </button>
                            <button
                                onClick={() =>
                                    navigateToTransactionHistory(selectedDrug)
                                }
                                className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-indigo-700"
                            >
                                <History className="h-3.5 w-3.5" />
                                Transactions
                            </button>
                            <button
                                onClick={() => setPrintLabelModalOpen(true)}
                                className="flex items-center gap-1.5 rounded-lg bg-slate-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-slate-700"
                            >
                                <Printer className="h-3.5 w-3.5" />
                                Print Label
                            </button>
                        </div>

                        {/* Transactions Accordion */}
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
            </div>

            {/* Modals */}
            <AddDrugModal
                isOpen={isAddDrugModalOpen}
                onClose={() => setIsAddDrugModalOpen(false)}
                onSave={handleAddDrug}
                suppliers={suppliers}
            />

            <PrintLabelModal
                isOpen={printLabelModalOpen}
                onClose={() => setPrintLabelModalOpen(false)}
                drug={selectedDrug}
                onPrint={handlePrintLabel}
            />
        </AppLayout>
    );
}
