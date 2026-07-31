import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Head, router, usePage } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import PageHeader from '@/components/PageHeader';
import Http from '@/utils/Http';
import{ PrintLabelModal} from './PrintLabelModal';
import AddDrugModal from './AddDrugModal';
// import ProductAdjustmentTable from '@/components/ProductAdjustmentTable';
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
    QrCode,
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

// ============================================================================
// Drug Details with QR Code Component
// ============================================================================

interface DrugDetailsWithQRProps {
    drug: Drug;
    onAdjustStock: () => void;
    onReceive: () => void;
    onIssue: () => void;
    onPhysicalCount: () => void;
    onPrintLabel: () => void;
}

const DrugDetailsWithQR: React.FC<DrugDetailsWithQRProps> = ({
    drug,
    onAdjustStock,
    onReceive,
    onIssue,
    onPhysicalCount,
    onPrintLabel,
}) => {
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

    const isLowStock = totalStock <= (drug.reorder_level || 0);
    const isCriticalStock = totalStock <= (drug.minimum_stock_level || 0);

    return (
        <div className="space-y-4">
            {/* QR Code & Basic Info */}
            <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center">
                {/* QR Code */}
                <div className="flex-shrink-0">
                    {drug.qr_code || drug.barcode ? (
                        <div className="flex h-24 w-24 items-center justify-center rounded-lg border-2 border-dashed border-slate-300 bg-white p-2 dark:border-slate-600 dark:bg-slate-800">
                            <div className="text-center">
                                <QrCode className="mx-auto h-12 w-12 text-slate-400" />
                                <span className="mt-1 block text-[8px] font-mono text-slate-400">
                                    {drug.qr_code || drug.barcode}
                                </span>
                            </div>
                        </div>
                    ) : (
                        <div className="flex h-24 w-24 items-center justify-center rounded-lg border-2 border-dashed border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800">
                            <QrCode className="h-12 w-12 text-slate-300" />
                        </div>
                    )}
                </div>

                {/* Drug Info */}
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100">
                            {drug.product_name || drug.drug_name || 'Unnamed Product'}
                        </h3>
                        {isCriticalStock && (
                            <Badge className="bg-red-500 text-white animate-pulse">
                                <AlertTriangle className="mr-1 h-3 w-3" />
                                Critical Stock
                            </Badge>
                        )}
                        {isLowStock && !isCriticalStock && (
                            <Badge className="bg-amber-500 text-white">
                                Low Stock
                            </Badge>
                        )}
                        {drug.is_arv === 1 && (
                            <Badge className="bg-purple-500 text-white">ARV</Badge>
                        )}
                        {drug.is_controlled === 1 && (
                            <Badge className="bg-red-600 text-white">Controlled</Badge>
                        )}
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-3 text-sm text-slate-500 dark:text-slate-400">
                        <span className="font-mono text-xs">
                            {drug.product_code || drug.drug_code || 'N/A'}
                        </span>
                        {drug.barcode && (
                            <>
                                <span className="text-slate-300">|</span>
                                <span className="font-mono text-xs flex items-center gap-1">
                                    <Barcode className="h-3 w-3" />
                                    {drug.barcode}
                                </span>
                            </>
                        )}
                        {drug.generic_name && (
                            <>
                                <span className="text-slate-300">|</span>
                                <span>Generic: {drug.generic_name}</span>
                            </>
                        )}
                    </div>
                </div>

                {/* Stock Info */}
                <div className="flex-shrink-0 text-right">
                    <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                        {totalStock}
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">
                        {drug.unit || drug.unit_of_measure || 'units'} in stock
                    </div>
                    {drug.reorder_level && (
                        <div className="text-xs text-slate-400 dark:text-slate-500">
                            Reorder at: {drug.reorder_level}
                        </div>
                    )}
                </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap gap-2 border-t border-slate-100 pt-4 dark:border-slate-700">
                <button
                    onClick={onReceive}
                    className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-emerald-700"
                >
                    <ArrowLeft className="h-3.5 w-3.5" />
                    Receive
                </button>
                <button
                    onClick={onIssue}
                    className="flex items-center gap-1.5 rounded-lg bg-orange-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-orange-700"
                >
                    <ArrowRight className="h-3.5 w-3.5" />
                    Issue
                </button>
                <button
                    onClick={onPhysicalCount}
                    className="flex items-center gap-1.5 rounded-lg bg-purple-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-purple-700"
                >
                    <Check className="h-3.5 w-3.5" />
                    Count
                </button>
                <button
                    onClick={onAdjustStock}
                    className="flex items-center gap-1.5 rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-amber-700"
                >
                    <Settings className="h-3.5 w-3.5" />
                    Adjust Stock
                </button>
                <button
                    onClick={onPrintLabel}
                    className="flex items-center gap-1.5 rounded-lg bg-slate-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-slate-700"
                >
                    <Printer className="h-3.5 w-3.5" />
                    Print Label
                </button>
            </div>

            {/* Additional Details Grid */}
            <div className="grid gap-3 rounded-lg bg-slate-50 p-4 dark:bg-slate-800/50 sm:grid-cols-2 lg:grid-cols-3">
                <div>
                    <span className="text-xs text-slate-500 dark:text-slate-400">Strength</span>
                    <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                        {drug.strength || 'N/A'}
                    </p>
                </div>
                <div>
                    <span className="text-xs text-slate-500 dark:text-slate-400">Form</span>
                    <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                        {drug.form || drug.dosage_form || 'N/A'}
                    </p>
                </div>
                <div>
                    <span className="text-xs text-slate-500 dark:text-slate-400">Category</span>
                    <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                        {drug.category_id || 'Uncategorized'}
                    </p>
                </div>
                <div>
                    <span className="text-xs text-slate-500 dark:text-slate-400">Expiry Date</span>
                    <p className={`text-sm font-medium ${drug.expiry_date ? 'text-amber-600 dark:text-amber-400' : 'text-slate-400'}`}>
                        {drug.expiry_date ? new Date(drug.expiry_date).toLocaleDateString() : 'No expiry'}
                    </p>
                </div>
                <div>
                    <span className="text-xs text-slate-500 dark:text-slate-400">Therapeutic Class</span>
                    <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                        {drug.therapeutic_class || 'N/A'}
                    </p>
                </div>
                <div>
                    <span className="text-xs text-slate-500 dark:text-slate-400">Schedule</span>
                    <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                        {drug.schedule_class || 'N/A'}
                    </p>
                </div>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-3 gap-2 rounded-lg border border-slate-200 p-3 dark:border-slate-700">
                <div className="text-center">
                    <div className="text-xs text-slate-500 dark:text-slate-400">Min Stock</div>
                    <div className="font-semibold text-slate-700 dark:text-slate-300">
                        {drug.minimum_stock_level || 'N/A'}
                    </div>
                </div>
                <div className="text-center border-x border-slate-200 dark:border-slate-700">
                    <div className="text-xs text-slate-500 dark:text-slate-400">Max Stock</div>
                    <div className="font-semibold text-slate-700 dark:text-slate-300">
                        {drug.maximum_stock_level || 'N/A'}
                    </div>
                </div>
                <div className="text-center">
                    <div className="text-xs text-slate-500 dark:text-slate-400">Reorder Level</div>
                    <div className="font-semibold text-slate-700 dark:text-slate-300">
                        {drug.reorder_level || 'N/A'}
                    </div>
                </div>
            </div>
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
// Adjustment Modal Trigger
// ============================================================================

interface AdjustmentModalTriggerProps {
    isOpen: boolean;
    onClose: () => void;
    drug: Drug | null;
    onAdjustmentComplete: () => void;
}

const AdjustmentModalTrigger: React.FC<AdjustmentModalTriggerProps> = ({
    isOpen,
    onClose,
    drug,
    onAdjustmentComplete,
}) => {
    if (!isOpen || !drug) return null;

    // Create adjustment data from drug
    const adjustmentItems = drug.transactions?.map((t) => ({
        id: `adj-${Date.now()}-${t.id}`,
        product_id: drug.id,
        product_name: drug.product_name || drug.drug_name || 'Unknown',
        barcode: drug.barcode || '',
        system_stock: drug.current_stock || 0,
        physical_count: 0,
        difference: 0,
        batch_number: undefined,
        expiry_date: drug.expiry_date || undefined,
        unit: drug.unit || drug.unit_of_measure || 'units',
    })) || [{
        id: `adj-${Date.now()}`,
        product_id: drug.id,
        product_name: drug.product_name || drug.drug_name || 'Unknown',
        barcode: drug.barcode || '',
        system_stock: drug.current_stock || 0,
        physical_count: 0,
        difference: 0,
        batch_number: undefined,
        expiry_date: drug.expiry_date || undefined,
        unit: drug.unit || drug.unit_of_measure || 'units',
    }];

    const adjustment = {
        id: `adj-${Date.now()}`,
        adjustment_number: `ADJ-${Date.now().toString().slice(-6)}`,
        date: new Date().toISOString(),
        type: 'decrease' as 'increase' | 'decrease',
        reason: '',
        store: 'Bulk Store',
        status: 'draft' as const,
        items: adjustmentItems,
        total_difference: 0,
        performed_by: 'Current User',
        priority: 'medium' as const,
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
            <div className="relative w-full max-w-5xl max-h-[95vh] overflow-y-auto rounded-lg bg-white p-6 dark:bg-slate-900">
                <div className="flex items-center justify-between mb-4">
                    <div>
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                            Adjust Stock
                        </h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                            {drug.product_name || drug.drug_name}
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
                    >
                        <X className="h-5 w-5 text-gray-500" />
                    </button>
                </div>

                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                Current Stock
                            </p>
                            <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                                {drug.current_stock || 0}
                            </p>
                        </div>
                        <div className="text-right">
                            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                Product Code
                            </p>
                            <p className="text-sm font-mono text-gray-600 dark:text-gray-400">
                                {drug.product_code || drug.drug_code || 'N/A'}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Use the ProductAdjustmentTable inside the modal */}
                <ProductAdjustmentTable
                    adjustments={[adjustment as any]}
                    loading={false}
                    store="Bulk Store"
                    module="bulk_store"
                    canCreate={false}
                    onRefresh={onAdjustmentComplete}
                />

                <div className="mt-4 flex justify-end gap-2">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-slate-700 rounded-lg transition"
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
};



    return (
       <div className="flex h-full min-h-screen flex-1 flex-col gap-3 bg-slate-50 p-4 dark:bg-slate-900">
        </div>
    );
}