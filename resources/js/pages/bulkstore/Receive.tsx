// pages/bulkstore/Receive.tsx

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Head, router, usePage } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import Container from '@/components/Container';
import PageHeader from '@/components/PageHeader';
import Http from '@/utils/Http';
import Barcode from 'react-barcode';
import {
    Package,
    Plus,
    Minus,
    X,
    Check,
    AlertCircle,
    RefreshCw,
    History,
    ArrowLeft,
    ArrowRight,
    Printer,
    Download,
    Search,
    Calendar,
    User,
    Building2,
    Truck,
    FileText,
    DollarSign,
    Layers,
    AlertTriangle,
    ChevronDown,
    ChevronRight,
    Eye,
    Edit,
    Trash2,
    Filter,
    Clock,
    TrendingUp,
    TrendingDown,
    Info,
    Save,
    Upload,
    FileCheck,
    Receipt,
    ClipboardList,
    Scan,
    Camera,
    Zap,
    Loader2,
    BarcodeIcon,
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { Badge } from '@/components/ui/badge';
import BarcodeGenerator from '@/components/BarcodeGenerator';

// ============================================================================
// Types
// ============================================================================

interface Product {
    id: number;
    product_uuid: string;
    product_name: string;
    product_code: string;
    description: string | null;
    barcode: string | null;
    qr_code: string | null;
    category_id: number | null;
    strength: string | null;
    unit: string | null;
    form: string | null;
    quantity: string | number;
    expiry_date: string | null;
    minimum_stock_level: number | null;
    maximum_stock_level: number | null;
    reorder_level: number | null;
    purchase_price: number | null;
    selling_price: number | null;
    is_arv: number;
    is_tb_drug: number;
    is_controlled: number;
    track_batches: number;
    track_expiry: number;
    created_at: string;
    updated_at: string;
}

interface Transaction {
    id: number;
    product_uuid: string | null;
    product_name: string;
    product_code: string;
    description: string | null;
    quantity: string | number;
    unit: string | null;
    transaction_type: string;
    from_department_id: number | null;
    to_department_id: number | null;
    supplier_id: number | null;
    supplier_name: string | null;
    grn_number: string | null;
    delivery_note_number: string | null;
    batch_number: string | null;
    expiry_date: string | null;
    reference_number: string | null;
    notes: string | null;
    created_by: string | null;
    created_at: string;
    updated_at: string;
}

interface Supplier {
    id: number;
    supplier_code: string;
    supplier_name: string;
    contact_person: string | null;
    phone: string | null;
    email: string | null;
    address: string | null;
    city: string | null;
    country: string | null;
    is_active: boolean;
}

interface ReceiveFormData {
    product_uuid: string;
    quantity: number;
    supplier_id: number | null;
    supplier_name: string | null;
    grn_number: string;
    delivery_note_number: string;
    invoice_number: string;
    batch_number: string;
    expiry_date: string;
    purchase_price: number;
    selling_price: number;
    notes: string;
    reference_number: string;
}

interface PaginatedTransactions {
    data: Transaction[];
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
}

interface ReceiveProps {
    product: Product | null;
    suppliers: Supplier[];
    transactions: PaginatedTransactions;
    filters: {
        transaction_type: string;
        search: string;
    };
}

// ============================================================================
// Loading Component
// ============================================================================

const LoadingSpinner: React.FC<{ message?: string }> = ({
    message = 'Loading...',
}) => (
    <div className="flex flex-col items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
        <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">
            {message}
        </p>
    </div>
);

// ============================================================================
// Barcode Scanner Component
// ============================================================================

interface BarcodeScannerProps {
    onScan: (barcode: string) => void;
    isScanning: boolean;
    onToggleScan: () => void;
    placeholder?: string;
}

const BarcodeScanner: React.FC<BarcodeScannerProps> = ({
    onScan,
    isScanning,
    onToggleScan,
    placeholder = 'Scan barcode or type code...',
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
                        placeholder={placeholder}
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
                    <button
                        onClick={() => {
                            onScan('8907802001346');
                        }}
                        className="flex items-center gap-1.5 rounded-lg bg-blue-100 px-3 py-1.5 text-xs text-blue-700 transition-colors hover:bg-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:hover:bg-blue-900/50"
                    >
                        <Zap className="h-3.5 w-3.5" />
                        Test Barcode
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
                    You can also type barcodes manually or use the test button.
                </p>
            </div>
        </div>
    );
};

// ============================================================================
// Receive Stock Modal Component
// ============================================================================

interface ReceiveStockModalProps {
    isOpen: boolean;
    onClose: () => void;
    product: Product | null;
    suppliers: Supplier[];
    onConfirm: (data: ReceiveFormData) => void;
    isLoading?: boolean;
}

const ReceiveStockModal: React.FC<ReceiveStockModalProps> = ({
    isOpen,
    onClose,
    product,
    suppliers,
    onConfirm,
    isLoading = false,
}) => {
    const [formData, setFormData] = useState<ReceiveFormData>({
        product_uuid: product?.product_uuid || '',
        quantity: 1,
        supplier_id: null,
        supplier_name: null,
        grn_number: '',
        delivery_note_number: '',
        invoice_number: '',
        batch_number: '',
        expiry_date: '',
        purchase_price: 0,
        selling_price: 0,
        notes: '',
        reference_number: '',
    });

    const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(
        null,
    );

    useEffect(() => {
        if (product) {
            setFormData((prev) => ({
                ...prev,
                product_uuid: product.product_uuid,
                grn_number: `GRN-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 10000)).padStart(4, '0')}`,
            }));
        }
    }, [product]);

    const handleSupplierChange = (supplierId: number) => {
        const supplier = suppliers.find((s) => s.id === supplierId);
        setSelectedSupplier(supplier || null);
        setFormData((prev) => ({
            ...prev,
            supplier_id: supplierId,
            supplier_name: supplier?.supplier_name || null,
        }));
    };

    const handleChange = (
        e: React.ChangeEvent<
            HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
        >,
    ) => {
        const { name, value, type } = e.target;
        setFormData((prev) => ({
            ...prev,
            [name]: type === 'number' ? parseFloat(value) || 0 : value,
        }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        if (!formData.quantity || formData.quantity <= 0) {
            toast.error('Please enter a valid quantity');
            return;
        }

        if (!formData.grn_number.trim()) {
            toast.error('Please enter the GRN number');
            return;
        }

        if (!formData.delivery_note_number.trim()) {
            toast.error('Please enter the delivery note number');
            return;
        }

        onConfirm(formData);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-lg bg-white p-6 dark:bg-slate-800">
                <div className="mb-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="rounded-lg bg-emerald-100 p-2 dark:bg-emerald-900/30">
                            <ArrowLeft className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                        </div>
                        <div>
                            <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100">
                                Receive Stock
                            </h3>
                            <p className="text-sm text-slate-500 dark:text-slate-400">
                                Enter receiving details for{' '}
                                {product?.product_name}
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="rounded p-1 hover:bg-slate-100 dark:hover:bg-slate-700"
                    >
                        <X className="h-5 w-5 text-slate-500" />
                    </button>
                </div>

                {product && (
                    <div className="mb-4 rounded-lg bg-slate-50 p-3 dark:bg-slate-700/50">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="font-medium text-slate-700 dark:text-slate-300">
                                    {product.product_name}
                                </p>
                                <p className="text-xs text-slate-500 dark:text-slate-400">
                                    Code: {product.product_code} | Unit:{' '}
                                    {product.unit || 'N/A'}
                                </p>
                            </div>
                            {product.barcode && (
                                <Badge variant="outline" className="font-mono">
                                    <Barcode className="mr-1 h-3 w-3" />
                                    {product.barcode}
                                </Badge>
                            )}
                        </div>
                    </div>
                )}

                <form onSubmit={handleSubmit}>
                    <div className="space-y-4">
                        {/* Quantity and Supplier */}
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                            <div>
                                <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
                                    Quantity *
                                </label>
                                <input
                                    type="number"
                                    name="quantity"
                                    min="1"
                                    step="1"
                                    value={formData.quantity}
                                    onChange={handleChange}
                                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                                    required
                                />
                            </div>

                            <div>
                                <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
                                    Supplier
                                </label>
                                <select
                                    name="supplier_id"
                                    value={formData.supplier_id || ''}
                                    onChange={(e) =>
                                        handleSupplierChange(
                                            parseInt(e.target.value),
                                        )
                                    }
                                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                                >
                                    <option value="">Select supplier...</option>
                                    {suppliers.map((supplier) => (
                                        <option
                                            key={supplier.id}
                                            value={supplier.id}
                                        >
                                            {supplier.supplier_name}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        {/* Supplier Details */}
                        {selectedSupplier && (
                            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-700/30">
                                <div className="grid grid-cols-1 gap-2 text-sm md:grid-cols-2">
                                    <div>
                                        <span className="text-slate-500 dark:text-slate-400">
                                            Contact:
                                        </span>
                                        <span className="ml-2 text-slate-700 dark:text-slate-300">
                                            {selectedSupplier.contact_person ||
                                                'N/A'}
                                        </span>
                                    </div>
                                    <div>
                                        <span className="text-slate-500 dark:text-slate-400">
                                            Phone:
                                        </span>
                                        <span className="ml-2 text-slate-700 dark:text-slate-300">
                                            {selectedSupplier.phone || 'N/A'}
                                        </span>
                                    </div>
                                    <div>
                                        <span className="text-slate-500 dark:text-slate-400">
                                            Email:
                                        </span>
                                        <span className="ml-2 text-slate-700 dark:text-slate-300">
                                            {selectedSupplier.email || 'N/A'}
                                        </span>
                                    </div>
                                    <div>
                                        <span className="text-slate-500 dark:text-slate-400">
                                            Address:
                                        </span>
                                        <span className="ml-2 text-slate-700 dark:text-slate-300">
                                            {selectedSupplier.address || 'N/A'}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Supplier Name (Manual Entry) */}
                        {!formData.supplier_id && (
                            <div>
                                <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
                                    Supplier Name (if not in list)
                                </label>
                                <input
                                    type="text"
                                    name="supplier_name"
                                    value={formData.supplier_name || ''}
                                    onChange={handleChange}
                                    placeholder="Enter supplier name..."
                                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                                />
                            </div>
                        )}

                        {/* Document Numbers */}
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                            <div>
                                <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
                                    <Receipt className="mr-1 inline h-4 w-4" />
                                    GRN Number *
                                </label>
                                <input
                                    type="text"
                                    name="grn_number"
                                    value={formData.grn_number}
                                    onChange={handleChange}
                                    placeholder="e.g., GRN-2024-001"
                                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                                    required
                                />
                            </div>

                            <div>
                                <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
                                    <ClipboardList className="mr-1 inline h-4 w-4" />
                                    Delivery Note Number *
                                </label>
                                <input
                                    type="text"
                                    name="delivery_note_number"
                                    value={formData.delivery_note_number}
                                    onChange={handleChange}
                                    placeholder="e.g., DN-2024-001"
                                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                                    required
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                            <div>
                                <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
                                    <FileText className="mr-1 inline h-4 w-4" />
                                    Invoice Number
                                </label>
                                <input
                                    type="text"
                                    name="invoice_number"
                                    value={formData.invoice_number}
                                    onChange={handleChange}
                                    placeholder="e.g., INV-2024-001"
                                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                                />
                            </div>

                            <div>
                                <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
                                    Reference Number
                                </label>
                                <input
                                    type="text"
                                    name="reference_number"
                                    value={formData.reference_number}
                                    onChange={handleChange}
                                    placeholder="e.g., PO-2024-001"
                                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                                />
                            </div>
                        </div>

                        {/* Batch and Expiry */}
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                            <div>
                                <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
                                    <Layers className="mr-1 inline h-4 w-4" />
                                    Batch Number
                                </label>
                                <input
                                    type="text"
                                    name="batch_number"
                                    value={formData.batch_number}
                                    onChange={handleChange}
                                    placeholder="e.g., BATCH-2024-001"
                                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                                />
                            </div>

                            <div>
                                <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
                                    <Calendar className="mr-1 inline h-4 w-4" />
                                    Expiry Date
                                </label>
                                <input
                                    type="date"
                                    name="expiry_date"
                                    value={formData.expiry_date}
                                    onChange={handleChange}
                                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                                />
                            </div>
                        </div>

                        {/* Prices */}
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                            <div>
                                <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
                                    <DollarSign className="mr-1 inline h-4 w-4" />
                                    Purchase Price (ZMW)
                                </label>
                                <input
                                    type="number"
                                    name="purchase_price"
                                    min="0"
                                    step="0.01"
                                    value={formData.purchase_price}
                                    onChange={handleChange}
                                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                                />
                            </div>

                            <div>
                                <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
                                    <DollarSign className="mr-1 inline h-4 w-4" />
                                    Selling Price (ZMW)
                                </label>
                                <input
                                    type="number"
                                    name="selling_price"
                                    min="0"
                                    step="0.01"
                                    value={formData.selling_price}
                                    onChange={handleChange}
                                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                                />
                            </div>
                        </div>

                        {/* Notes */}
                        <div>
                            <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
                                Notes
                            </label>
                            <textarea
                                name="notes"
                                value={formData.notes}
                                onChange={handleChange}
                                rows={3}
                                placeholder="Additional details about the receipt..."
                                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                            />
                        </div>
                    </div>

                    <div className="mt-6 flex gap-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-700"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isLoading}
                            className="flex-1 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-emerald-700 disabled:opacity-50"
                        >
                            {isLoading ? (
                                <RefreshCw className="mx-auto h-4 w-4 animate-spin" />
                            ) : (
                                <>
                                    <Save className="mr-2 inline h-4 w-4" />
                                    Receive Stock
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

// ============================================================================
// Transaction History Component
// ============================================================================

interface TransactionHistoryProps {
    transactions: Transaction[];
    currentPage: number;
    lastPage: number;
    perPage: number;
    total: number;
    filters: {
        transaction_type: string;
        search: string;
    };
    onPageChange: (page: number) => void;
    onFilterChange: (key: string, value: string) => void;
}

const TransactionHistory: React.FC<TransactionHistoryProps> = ({
    transactions,
    currentPage,
    lastPage,
    perPage,
    total,
    filters,
    onPageChange,
    onFilterChange,
}) => {
    const getTypeBadge = (type: string) => {
        const styles: Record<string, string> = {
            received:
                'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
            issued: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
            adjustment:
                'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
            physical_count:
                'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
            dispensed:
                'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
        };
        return (
            styles[type] ||
            'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400'
        );
    };

    const getTypeIcon = (type: string) => {
        switch (type) {
            case 'received':
                return <ArrowLeft className="h-3.5 w-3.5" />;
            case 'issued':
                return <ArrowRight className="h-3.5 w-3.5" />;
            case 'adjustment':
                return <Edit className="h-3.5 w-3.5" />;
            case 'physical_count':
                return <Check className="h-3.5 w-3.5" />;
            case 'dispensed':
                return <Minus className="h-3.5 w-3.5" />;
            default:
                return <Package className="h-3.5 w-3.5" />;
        }
    };

    return (
        <div className="space-y-4">
            {/* Filters */}
            <div className="flex flex-wrap gap-3">
                <div className="min-w-[200px] flex-1">
                    <div className="relative">
                        <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Search transactions..."
                            value={filters.search}
                            onChange={(e) =>
                                onFilterChange('search', e.target.value)
                            }
                            className="w-full rounded-lg border border-slate-200 py-2 pr-4 pl-10 text-sm focus:border-blue-400 focus:ring-1 focus:ring-blue-400 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                        />
                    </div>
                </div>
                <div className="w-[200px]">
                    <select
                        value={filters.transaction_type}
                        onChange={(e) =>
                            onFilterChange('transaction_type', e.target.value)
                        }
                        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-blue-400 focus:ring-1 focus:ring-blue-400 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                    >
                        <option value="">All Types</option>
                        <option value="received">Received</option>
                        <option value="issued">Issued</option>
                        <option value="adjustment">Adjustment</option>
                        <option value="physical_count">Physical Count</option>
                        <option value="dispensed">Dispensed</option>
                    </select>
                </div>
                <button
                    onClick={() => {
                        onFilterChange('transaction_type', '');
                        onFilterChange('search', '');
                    }}
                    className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-600 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-700"
                >
                    <X className="h-4 w-4" />
                    Clear Filters
                </button>
            </div>

            {/* Table */}
            <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-700">
                <table className="w-full text-sm">
                    <thead className="bg-slate-50 dark:bg-slate-800">
                        <tr>
                            <th className="px-4 py-3 text-left text-xs font-medium tracking-wider text-slate-500 uppercase dark:text-slate-400">
                                Type
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium tracking-wider text-slate-500 uppercase dark:text-slate-400">
                                Qty
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium tracking-wider text-slate-500 uppercase dark:text-slate-400">
                                GRN / Reference
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium tracking-wider text-slate-500 uppercase dark:text-slate-400">
                                Supplier / Destination
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium tracking-wider text-slate-500 uppercase dark:text-slate-400">
                                Batch
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium tracking-wider text-slate-500 uppercase dark:text-slate-400">
                                Date
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium tracking-wider text-slate-500 uppercase dark:text-slate-400">
                                Notes
                            </th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                        {transactions.length === 0 ? (
                            <tr>
                                <td
                                    colSpan={7}
                                    className="px-4 py-8 text-center text-slate-500 dark:text-slate-400"
                                >
                                    <History className="mx-auto h-8 w-8 text-slate-300 dark:text-slate-600" />
                                    <p className="mt-2">
                                        No transactions found
                                    </p>
                                </td>
                            </tr>
                        ) : (
                            transactions.map((transaction) => {
                                const qty =
                                    typeof transaction.quantity === 'string'
                                        ? parseFloat(transaction.quantity)
                                        : transaction.quantity;

                                return (
                                    <tr
                                        key={transaction.id}
                                        className="hover:bg-slate-50 dark:hover:bg-slate-800/50"
                                    >
                                        <td className="px-4 py-3">
                                            <span
                                                className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${getTypeBadge(transaction.transaction_type)}`}
                                            >
                                                {getTypeIcon(
                                                    transaction.transaction_type,
                                                )}
                                                {transaction.transaction_type
                                                    .charAt(0)
                                                    .toUpperCase() +
                                                    transaction.transaction_type.slice(
                                                        1,
                                                    )}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 font-medium">
                                            {qty} {transaction.unit || 'units'}
                                        </td>
                                        <td className="px-4 py-3 text-xs text-slate-600 dark:text-slate-400">
                                            {transaction.grn_number && (
                                                <div className="font-mono">
                                                    GRN:{' '}
                                                    {transaction.grn_number}
                                                </div>
                                            )}
                                            {transaction.reference_number && (
                                                <div className="text-slate-400">
                                                    Ref:{' '}
                                                    {
                                                        transaction.reference_number
                                                    }
                                                </div>
                                            )}
                                        </td>
                                        <td className="px-4 py-3 text-xs text-slate-600 dark:text-slate-400">
                                            {transaction.supplier_name ||
                                                transaction.from_department_id ||
                                                transaction.to_department_id ||
                                                'N/A'}
                                        </td>
                                        <td className="px-4 py-3 text-xs text-slate-600 dark:text-slate-400">
                                            {transaction.batch_number || 'N/A'}
                                            {transaction.expiry_date && (
                                                <div className="text-[10px] text-slate-400">
                                                    Exp:{' '}
                                                    {new Date(
                                                        transaction.expiry_date,
                                                    ).toLocaleDateString()}
                                                </div>
                                            )}
                                        </td>
                                        <td className="px-4 py-3 text-xs text-slate-600 dark:text-slate-400">
                                            {new Date(
                                                transaction.created_at,
                                            ).toLocaleString()}
                                        </td>
                                        <td className="max-w-[150px] truncate px-4 py-3 text-xs text-slate-500 dark:text-slate-400">
                                            {transaction.notes || '-'}
                                        </td>
                                    </tr>
                                );
                            })
                        )}
                    </tbody>
                </table>
            </div>

            {/* Pagination */}
            {total > 0 && (
                <div className="flex items-center justify-between">
                    <div className="text-sm text-slate-500 dark:text-slate-400">
                        Showing {(currentPage - 1) * perPage + 1} to{' '}
                        {Math.min(currentPage * perPage, total)} of {total}{' '}
                        entries
                    </div>
                    <div className="flex gap-1">
                        <button
                            onClick={() => onPageChange(currentPage - 1)}
                            disabled={currentPage <= 1}
                            className="rounded-lg border border-slate-200 px-3 py-1 text-sm transition-colors hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:hover:bg-slate-700"
                        >
                            Previous
                        </button>
                        {Array.from(
                            { length: Math.min(5, lastPage) },
                            (_, i) => {
                                let pageNum = currentPage;
                                if (lastPage <= 5) {
                                    pageNum = i + 1;
                                } else if (currentPage <= 3) {
                                    pageNum = i + 1;
                                } else if (currentPage >= lastPage - 2) {
                                    pageNum = lastPage - 4 + i;
                                } else {
                                    pageNum = currentPage - 2 + i;
                                }
                                return (
                                    <button
                                        key={pageNum}
                                        onClick={() => onPageChange(pageNum)}
                                        className={`rounded-lg px-3 py-1 text-sm transition-colors ${
                                            currentPage === pageNum
                                                ? 'bg-blue-600 text-white'
                                                : 'border border-slate-200 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-700'
                                        }`}
                                    >
                                        {pageNum}
                                    </button>
                                );
                            },
                        )}
                        <button
                            onClick={() => onPageChange(currentPage + 1)}
                            disabled={currentPage >= lastPage}
                            className="rounded-lg border border-slate-200 px-3 py-1 text-sm transition-colors hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:hover:bg-slate-700"
                        >
                            Next
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

// ============================================================================
// Main Receive Component
// ============================================================================

export default function Receive() {
    const { props } = usePage();
    const [isReceiveModalOpen, setIsReceiveModalOpen] = useState(false);
    const [isBarcodeModalOpen, setIsBarcodeModalOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [isScanning, setIsScanning] = useState(true);
    const [searchError, setSearchError] = useState<string | null>(null);
    const [isPageLoading, setIsPageLoading] = useState(true);
    const [product, setProduct] = useState([]);

    // Extract props with defaults
    const product = (props as any)?.product || null;
    const suppliers = (props as any)?.suppliers || [];
    const transactions = (props as any)?.transactions || {
        data: [],
        current_page: 1,
        last_page: 1,
        per_page: 15,
        total: 0,
    };
    const filters = (props as any)?.filters || {
        transaction_type: '',
        search: '',
    };

    // Handle barcode scan
    const handleBarcodeScan = useCallback(async (barcode: string) => {
        if (!barcode.trim()) return;

        setSearchError(null);

        try {
            const response = await Http.get(
                `/bulk-store/product/search/${encodeURIComponent(barcode.trim())}`,
            );
            
            if (response.data.product) {
                // router.visit(
                //     `/bulk-store/receive/${response.data.product.product_uuid}`,
                // );
                toast.success(
                    `Found product: ${response.data.product.product_name}`,
                );

                setProduct(reaponse.data.product)
            } else {
                setSearchError(`No product found with barcode: ${barcode}`);
                toast.error(`No product found with barcode: ${barcode}`);
            }
        } catch (error: any) {
            console.error('Barcode search error:', error);
            setSearchError(
                error.response?.data?.message || 'Failed to search product',
            );
            toast.error(
                error.response?.data?.message || 'Failed to search product',
            );
        }
    }, []);

    // Handle page change
    const handlePageChange = (page: number) => {
        if (product?.product_uuid) {
            router.get(
                `/bulk-store/receive/${product.product_uuid}`,
                {
                    page,
                    transaction_type: filters.transaction_type,
                    search: filters.search,
                },
                {
                    preserveState: true,
                    preserveScroll: true,
                },
            );
        }
    };

    // Handle filter change
    const handleFilterChange = (key: string, value: string) => {
        if (product?.product_uuid) {
            router.get(
                `/bulk-store/receive/${product.product_uuid}`,
                {
                    page: 1,
                    transaction_type:
                        key === 'transaction_type'
                            ? value
                            : filters.transaction_type,
                    search: key === 'search' ? value : filters.search,
                },
                {
                    preserveState: true,
                    preserveScroll: true,
                },
            );
        }
    };

    // Handle receive stock confirmation
    const handleReceiveConfirm = async (data: ReceiveFormData) => {
        try {
            setIsLoading(true);
            const response = await Http.post('/bulk-store/receive', data);

            if (response.data.success) {
                toast.success(`Successfully received ${data.quantity} units`);
                setIsReceiveModalOpen(false);

                router.reload({
                    preserveState: true,
                    preserveScroll: true,
                });
            } else {
                toast.error(response.data.message || 'Failed to receive stock');
            }
        } catch (error: any) {
            console.error('Receive error:', error);
            toast.error(
                error.response?.data?.message || 'Failed to receive stock',
            );
        } finally {
            setIsLoading(false);
        }
    };

    // Set loading state
    useEffect(() => {
        setIsPageLoading(false);
    }, []);

    // Show loading state
    if (isPageLoading) {
        return (
            <AppLayout
                breadcrumbs={[
                    { title: 'Bulk Store', href: '/bulk-store' },
                    { title: 'Receive Stock', href: '/bulk-store/receive' },
                ]}
            >
                <Head title="Loading..." />
                <div className="min-h-screen bg-slate-100 p-6 dark:bg-slate-900">
                    <Container>
                        <LoadingSpinner message="Loading receive page..." />
                    </Container>
                </div>
            </AppLayout>
        );
    }

    // If no product is found, show search interface
    if (!product) {
        return (
            <AppLayout
                breadcrumbs={[
                    { title: 'Bulk Store', href: '/bulk-store' },
                    { title: 'Receive Stock', href: '/bulk-store/receive' },
                ]}
            >
                <Head title="Receive Stock - Search Product" />

                <div className="min-h-screen bg-slate-100 p-2 dark:bg-slate-900">
                    <Container>
                        <PageHeader
                            title="Receive Stock"
                            subtitle="Scan or search for a product to receive stock"
                            // actions={
                            //     <button
                            //         onClick={() =>
                            //             router.visit(
                            //                 '/bulk-store/barcode-generator',
                            //             )
                            //         }
                            //         className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-700"
                            //     >
                            //         <Barcode className="h-4 w-4" />
                            //         Generate Barcode
                            //     </button>
                            // }
                        />

                        <div className="rounded-lg border border-slate-200 bg-white p-6 dark:border-slate-700 dark:bg-slate-800">
                            <BarcodeScanner
                                onScan={handleBarcodeScan}
                                isScanning={isScanning}
                                onToggleScan={() =>
                                    setIsScanning((prev) => !prev)
                                }
                                placeholder="Scan barcode to find product..."
                            />

                            {searchError && (
                                <div className="mt-4 rounded-lg bg-red-50 p-4 text-sm text-red-700 dark:bg-red-900/20 dark:text-red-400">
                                    <AlertCircle className="mr-2 inline h-4 w-4" />
                                    {searchError}
                                </div>
                            )}

                            <div className="mt-4 text-center text-sm text-slate-500 dark:text-slate-400">
                                <p>
                                    Enter a barcode above or use the search bar
                                    to find a product
                                </p>
                                <p className="mt-1 text-xs">
                                    <kbd className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[10px] dark:bg-slate-700">
                                        Ctrl+Shift+S
                                    </kbd>{' '}
                                    Toggle scanner
                                </p>
                            </div>
                        </div>
                    </Container>
                </div>
            </AppLayout>
        );
    }

    // Calculate total stock from transactions
    const transactionData = transactions?.data || [];
    const totalStock = transactionData.reduce((sum: number, t: Transaction) => {
        const qty =
            typeof t.quantity === 'string'
                ? parseFloat(t.quantity)
                : t.quantity || 0;
        return sum + qty;
    }, 0);

    return (
        <AppLayout
            breadcrumbs={[
                { title: 'Bulk Store', href: '/bulk-store' },
                {
                    title: 'Receive Stock',
                    href: `/bulk-store/receive/${product.product_uuid}`,
                },
            ]}
        >
            <Head title={`Receive: ${product.product_name}`} />

            <div className="min-h-screen bg-slate-100 p-6 dark:bg-slate-900">
                <Container>
                    <PageHeader
                        title="Receive Stock"
                        subtitle="Manage stock receipt, for akl the drugs received"
                        // actions={
                        //     <div className="flex gap-2">
                        //         <button
                        //             onClick={() => setIsReceiveModalOpen(true)}
                        //             className="flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-emerald-700"
                        //         >
                        //             <Plus className="h-4 w-4" />
                        //             Receive Stock
                        //         </button>
                        //         <button
                        //             onClick={() => setIsBarcodeModalOpen(true)}
                        //             className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-700"
                        //         >
                        //             <Barcode className="h-4 w-4" />
                        //             Generate Barcode
                        //         </button>
                        //     </div>
                        // }
                    />

                    {/* Barcode Scanner - Compact */}
                    <div className="mb-6">
                        {/* <BarcodeScanner
                            onScan={handleBarcodeScan}
                            isScanning={isScanning}
                            onToggleScan={() => setIsScanning(prev => !prev)}
                            placeholder="Scan another product..."
                        /> */}
                    </div>

                    {/* Product Details Card */}
                    <div className="mb-6 rounded-lg border border-slate-200 bg-white p-6 dark:border-slate-700 dark:bg-slate-800">
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
                            <div>
                                {/* <Barcode value={product.product_code} /> */}
                                <div className="text-xs font-medium tracking-wider text-slate-500 uppercase dark:text-slate-400">
                                    Product Name
                                </div>
                                <div className="mt-1 font-medium text-slate-800 dark:text-slate-100">
                                    {product.product_name}
                                </div>
                            </div>
                            <div>
                                <div className="text-xs font-medium tracking-wider text-slate-500 uppercase dark:text-slate-400">
                                    Code
                                </div>
                                <div className="mt-1 font-mono text-sm text-slate-600 dark:text-slate-400">
                                    {product.product_code}
                                </div>
                            </div>
                            <div>
                                <div className="text-xs font-medium tracking-wider text-slate-500 uppercase dark:text-slate-400">
                                    Barcode
                                </div>
                                <div className="mt-1 font-mono text-sm text-slate-600 dark:text-slate-400">
                                    {product.barcode || 'N/A'}
                                    {product.barcode && (
                                        <div className="mt-1">
                                            <BarcodeIcon className="h-8 w-24 text-slate-400" />
                                        </div>
                                    )}
                                </div>
                            </div>
                            <div>
                                <div className="text-xs font-medium tracking-wider text-slate-500 uppercase dark:text-slate-400">
                                    Current Stock
                                </div>
                                <div className="mt-1 text-2xl font-bold text-blue-600 dark:text-blue-400">
                                    {totalStock}
                                    <span className="ml-1 text-sm font-normal text-slate-500 dark:text-slate-400">
                                        {product.unit || 'units'}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Additional details */}
                        <div className="mt-4 grid grid-cols-1 gap-4 border-t border-slate-200 pt-4 md:grid-cols-3 dark:border-slate-700">
                            <div>
                                <span className="text-xs text-slate-500 dark:text-slate-400">
                                    Description:
                                </span>
                                <span className="ml-2 text-sm text-slate-700 dark:text-slate-300">
                                    {product.description || 'N/A'}
                                </span>
                            </div>
                            <div>
                                <span className="text-xs text-slate-500 dark:text-slate-400">
                                    Form:
                                </span>
                                <span className="ml-2 text-sm text-slate-700 dark:text-slate-300">
                                    {product.form || 'N/A'}
                                </span>
                            </div>
                            <div>
                                <span className="text-xs text-slate-500 dark:text-slate-400">
                                    Strength:
                                </span>
                                <span className="ml-2 text-sm text-slate-700 dark:text-slate-300">
                                    {product.strength || 'N/A'}
                                </span>
                            </div>
                        </div>

                        {/* Product tags */}
                        <div className="mt-4 flex flex-wrap gap-2 border-t border-slate-200 pt-4 dark:border-slate-700">
                            {product.is_arv === 1 && (
                                <Badge variant="default" className="bg-red-500">
                                    ARV
                                </Badge>
                            )}
                            {product.is_tb_drug === 1 && (
                                <Badge
                                    variant="default"
                                    className="bg-orange-500"
                                >
                                    TB Drug
                                </Badge>
                            )}
                            {product.is_controlled === 1 && (
                                <Badge
                                    variant="default"
                                    className="bg-purple-500"
                                >
                                    Controlled
                                </Badge>
                            )}
                            {product.track_batches === 1 && (
                                <Badge variant="outline">Track Batches</Badge>
                            )}
                            {product.track_expiry === 1 && (
                                <Badge variant="outline">Track Expiry</Badge>
                            )}
                        </div>
                    </div>

                    {/* Transaction History */}
                    <div className="rounded-lg border border-slate-200 bg-white p-6 dark:border-slate-700 dark:bg-slate-800">
                        <div className="mb-4 flex items-center justify-between">
                            <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100">
                                <History className="mr-2 inline h-5 w-5" />
                                Transaction History
                            </h3>
                            <Badge variant="secondary">
                                {transactions?.total || 0} Total
                            </Badge>
                        </div>

                        <TransactionHistory
                            transactions={transactionData}
                            currentPage={transactions?.current_page || 1}
                            lastPage={transactions?.last_page || 1}
                            perPage={transactions?.per_page || 15}
                            total={transactions?.total || 0}
                            filters={filters}
                            onPageChange={handlePageChange}
                            onFilterChange={handleFilterChange}
                        />
                    </div>
                </Container>
            </div>

            {/* Receive Stock Modal */}
            <ReceiveStockModal
                isOpen={isReceiveModalOpen}
                onClose={() => setIsReceiveModalOpen(false)}
                product={product}
                suppliers={suppliers}
                onConfirm={handleReceiveConfirm}
                isLoading={isLoading}
            />

            {/* Barcode Generator Modal */}
            {isBarcodeModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-lg bg-white p-6 dark:bg-slate-800">
                        <BarcodeGenerator
                            product={product}
                            onClose={() => setIsBarcodeModalOpen(false)}
                        />
                        <div className="mt-4 flex justify-end">
                            <button
                                onClick={() => setIsBarcodeModalOpen(false)}
                                className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-700"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </AppLayout>
    );
}
