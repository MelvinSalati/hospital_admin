// components/modals/AdjustStockModal.tsx

import { useState, useEffect, useRef, Fragment } from 'react';
import {
    SlidersHorizontal,
    X,
    Search,
    Package,
    Barcode,
    Calendar,
    Clock,
    TrendingUp,
    TrendingDown,
    Plus,
    Minus as MinusIcon,
    Upload,
    File,
    Image,
    Loader2,
    AlertTriangle,
    Shield,
    Clock as ClockIcon,
} from 'lucide-react';
import { Dialog, Transition } from '@headlessui/react';
import Notiflix from 'notiflix';
import Http from '@/utils/Http';
import routes from '@/constants/routes';
import { format } from 'date-fns';
import {usePage} from '@inertiajs/react'
// ============================================
// TYPES
// ============================================

interface Product {
    id: number;
    product_name: string;
    product_code: string;
    barcode?: string;
    description?: string;
    current_stock: number;
    unit?: string;
    strength?: string;
    form?: string;
    category?: string;
    supplier?: string;
    last_updated?: string;
    created_at?: string;
    price?: number;
    reorder_level?: number;
    location?: string;
    batch_number?: string;
    expiry_date?: string;
}

interface UploadedFile {
    id?: string;
    name: string;
    size: number;
    type: string;
    url?: string;
    file?: File;
    uploading?: boolean;
    progress?: number;
}

interface AdjustStockModalProps {
    isOpen: boolean;
    onClose: () => void;
    productId?: number;
    currentStock?: number;
    onSuccess?: () => void;
    productName?: string;
}

// ============================================
// MAIN COMPONENT
// ============================================

export default function AdjustStockModal({
    isOpen,
    onClose,
    productId: initialProductId,
    currentStock: initialStock,
    onSuccess,
    productName: initialProductName,
}: AdjustStockModalProps) {
    // ============================================
    // STATE
    // ============================================
    const {auth} = usePage().props;
    const [loading, setLoading] = useState(false);
    const [searching, setSearching] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    
    // Product search
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<Product[]>([]);
    const [showSearchResults, setShowSearchResults] = useState(false);
    const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
    const searchInputRef = useRef<HTMLInputElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    
    // Form state
    const [newQuantity, setNewQuantity] = useState<number>(0);
    const [reason, setReason] = useState('');
    const [adjustmentType, setAdjustmentType] = useState<'add' | 'subtract' | 'set'>('set');
    const [adjustmentValue, setAdjustmentValue] = useState<number>(0);
    const [adjustmentCategory, setAdjustmentCategory] = useState<string>('correction');
    const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
    const [isDragging, setIsDragging] = useState(false);
    const [showApprovalInfo, setShowApprovalInfo] = useState(false);

    // ============================================
    // COMPUTED VALUES (DECLARED BEFORE useEffect)
    // ============================================
    
    const currentStock = selectedProduct?.current_stock || 0;
    const difference = newQuantity - currentStock;
    const isChanged = difference !== 0;
    const isNegativeAdjustment = difference < 0;

    // ============================================
    // EFFECTS
    // ============================================

    // Auto-load product if ID is provided
    useEffect(() => {
        if (isOpen && initialProductId) {
            loadProduct(initialProductId);
        }
    }, [isOpen, initialProductId]);

    // Reset form when modal closes
    useEffect(() => {
        if (!isOpen) {
            resetForm();
        }
    }, [isOpen]);

    // Search products
    useEffect(() => {
        if (searchQuery.length >= 2) {
            const delay = setTimeout(() => searchProducts(searchQuery), 300);
            return () => clearTimeout(delay);
        } else {
            setSearchResults([]);
            setShowSearchResults(false);
        }
    }, [searchQuery]);

    // Check if adjustment requires approval
    useEffect(() => {
        if (selectedProduct && difference < 0) {
            setShowApprovalInfo(true);
        } else {
            setShowApprovalInfo(false);
        }
    }, [selectedProduct, difference]);

    // ============================================
    // HELPERS
    // ============================================

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-ZM', {
            style: 'currency',
            currency: 'ZMW',
            minimumFractionDigits: 2,
        }).format(amount);
    };

    const formatDate = (date: string | undefined) => {
        if (!date) return 'N/A';
        try {
            return format(new Date(date), 'dd MMM yyyy, hh:mm a');
        } catch {
            return 'N/A';
        }
    };

    const formatFileSize = (bytes: number): string => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    const resetForm = () => {
        setSearchQuery('');
        setSearchResults([]);
        setSelectedProduct(null);
        setNewQuantity(0);
        setReason('');
        setAdjustmentType('set');
        setAdjustmentValue(0);
        setAdjustmentCategory('correction');
        setUploadedFiles([]);
        setSubmitting(false);
        setSearching(false);
        setShowApprovalInfo(false);
    };

    // ============================================
    // API CALLS
    // ============================================

    const loadProduct = async (id: number) => {
        setLoading(true);
        try {
            const response = await Http.get(`/api/products/${id}`);
            if (response.data.success) {
                setSelectedProduct(response.data.data);
                setNewQuantity(response.data.data.current_stock || 0);
            }
        } catch (error) {
            Notiflix.Notify.failure('Failed to load product details');
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const searchProducts = async (query: string) => {
        setSearching(true);
        try {
            const response = await Http.get(`/bulk-store/product/search/${query}`);
            if (response.data.status === 'success') {
                setSearchResults(response.data.product);
                setShowSearchResults(true);
            }
        } catch (error) {
            console.error('Search error:', error);
            setSearchResults([]);
        } finally {
            setSearching(false);
        }
    };

    const uploadFile = async (file: File): Promise<UploadedFile> => {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('type', 'adjustment_evidence');

        try {
            const response = await Http.post('/bulk-store/upload/evidence', formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
                onUploadProgress: (progressEvent) => {
                    const progress = Math.round(
                        (progressEvent.loaded * 100) / (progressEvent.total || 1)
                    );
                    setUploadedFiles(prev =>
                        prev.map(f =>
                            f.name === file.name ? { ...f, progress, uploading: true } : f
                        )
                    );
                },
            });

            return {
                id: response.data.id,
                name: file.name,
                size: file.size,
                type: file.type,
                url: response.data.url,
                uploading: false,
                progress: 100,
            };
        } catch (error) {
            throw new Error('Failed to upload file');
        }
    };

    // ============================================
    // HANDLERS
    // ============================================

    const handleProductSelect = (product: Product) => {
        setSelectedProduct(product);
        setNewQuantity(product.current_stock || 0);
        setSearchQuery(product.product_name);
        setShowSearchResults(false);
        if (searchInputRef.current) {
            searchInputRef.current.blur();
        }
    };

    const handleAdjustmentTypeChange = (type: 'add' | 'subtract' | 'set') => {
        setAdjustmentType(type);
        if (type === 'set') {
            setNewQuantity(selectedProduct?.current_stock || 0);
        } else {
            setAdjustmentValue(0);
        }
    };

    const applyAdjustment = () => {
        if (!selectedProduct) return;
        
        const current = selectedProduct.current_stock || 0;
        let newValue = current;

        switch (adjustmentType) {
            case 'add':
                newValue = current + adjustmentValue;
                break;
            case 'subtract':
                newValue = Math.max(0, current - adjustmentValue);
                break;
            case 'set':
                newValue = newQuantity;
                break;
        }

        setNewQuantity(Math.max(0, newValue));
    };

    const handleFileUpload = (files: FileList | null) => {
        if (!files) return;

        const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf', 'image/gif'];
        const maxSize = 5 * 1024 * 1024; // 5MB

        const validFiles = Array.from(files).filter(file => {
            if (!allowedTypes.includes(file.type)) {
                Notiflix.Notify.warning(`Invalid file type: ${file.name}`);
                return false;
            }
            if (file.size > maxSize) {
                Notiflix.Notify.warning(`File too large: ${file.name} (max 5MB)`);
                return false;
            }
            return true;
        });

        const newFiles = validFiles.map(file => ({
            id: `temp-${Date.now()}-${Math.random()}`,
            name: file.name,
            size: file.size,
            type: file.type,
            file: file,
            uploading: true,
            progress: 0,
        }));

        setUploadedFiles(prev => [...prev, ...newFiles]);

        // Upload each file
        newFiles.forEach(async (uploadFile) => {
            try {
                const result = await uploadFile(uploadFile.file!);
                setUploadedFiles(prev =>
                    prev.map(f =>
                        f.id === uploadFile.id ? result : f
                    )
                );
                Notiflix.Notify.success(`Uploaded: ${uploadFile.name}`);
            } catch (error) {
                setUploadedFiles(prev =>
                    prev.filter(f => f.id !== uploadFile.id)
                );
                Notiflix.Notify.failure(`Failed to upload: ${uploadFile.name}`);
            }
        });
    };

    const removeFile = (fileId: string) => {
        setUploadedFiles(prev => prev.filter(f => f.id !== fileId));
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        handleFileUpload(e.dataTransfer.files);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!selectedProduct) {
            Notiflix.Notify.warning('Please select a product');
            return;
        }

        if (newQuantity < 0) {
            Notiflix.Notify.warning('Quantity cannot be negative');
            return;
        }

        const current = selectedProduct.current_stock || 0;
        if (newQuantity === current) {
            Notiflix.Notify.warning('No change in quantity');
            return;
        }

        if (!reason || reason.trim().length < 10) {
            Notiflix.Notify.warning('Please provide a detailed reason (minimum 10 characters)');
            return;
        }

        // For negative adjustments, require evidence if category is damage/expiry
        if (isNegativeAdjustment && 
            (adjustmentCategory === 'damage' || adjustmentCategory === 'expiry') && 
            uploadedFiles.length === 0) {
            Notiflix.Notify.warning('Please upload evidence for damage or expiry adjustments');
            return;
        }

        setSubmitting(true);
        try {
            const payload = {
                product_id: selectedProduct.id,
                quantity: newQuantity,
                reason: reason.trim(),
                previous_quantity: current,
                adjustment_type: newQuantity > current ? 'addition' : 'reduction',
                difference: newQuantity - current,
                adjustment_category: adjustmentCategory,
                created_by: auth.user.id,
                evidence: uploadedFiles.map(f => f.url || f.name),
            };
console.log(payload)
            const response = await Http.post('/bulk-store/adjust-stock', payload);

            if (response.data.success) {
                // Check if adjustment requires approval
                if (response.data.requires_approval) {
                    Notiflix.Notify.info(
                        'Stock adjustment submitted for approval. You will be notified once approved.',
                        { timeout: 5000 }
                    );
                } else {
                    Notiflix.Notify.success(
                        `Stock adjusted from ${current} to ${newQuantity} units`
                    );
                }

                setSelectedProduct({
                    ...selectedProduct,
                    current_stock: newQuantity,
                    last_updated: new Date().toISOString(),
                });

                if (onSuccess) onSuccess();

                // Close after brief delay
                setTimeout(() => onClose(), 2000);
            } else {
                throw new Error(response.data.message || 'Failed to adjust stock');
            }
        } catch (error: any) {
            const message = error.response?.data?.message || 'Failed to adjust stock';
            Notiflix.Notify.failure(message);
            console.error(error);
        } finally {
            setSubmitting(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && selectedProduct) {
            e.preventDefault();
            handleSubmit(e);
        }
    };

    // ============================================
    // RENDER
    // ============================================

    return (
        <Transition show={isOpen} as={Fragment}>
            <Dialog as="div" className="relative z-50" onClose={onClose}>
                <Transition.Child
                    as={Fragment}
                    enter="ease-out duration-300"
                    enterFrom="opacity-0"
                    enterTo="opacity-100"
                    leave="ease-in duration-200"
                    leaveFrom="opacity-100"
                    leaveTo="opacity-0"
                >
                    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" />
                </Transition.Child>

                <div className="fixed inset-0 overflow-y-auto">
                    <div className="flex min-h-full items-center justify-center p-4">
                        <Transition.Child
                            as={Fragment}
                            enter="ease-out duration-300"
                            enterFrom="opacity-0 scale-95"
                            enterTo="opacity-100 scale-100"
                            leave="ease-in duration-200"
                            leaveFrom="opacity-100 scale-100"
                            leaveTo="opacity-0 scale-95"
                        >
                            <Dialog.Panel className="relative w-full max-w-6xl transform overflow-hidden rounded-xl bg-white shadow-2xl transition-all max-h-[95vh] flex flex-col">
                                {/* ========================================== */}
                                {/* HEADER - Fixed */}
                                {/* ========================================== */}
                                <div className="flex-shrink-0 px-6 py-4  bg-white rounded-t-xl">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="rounded-lg bg-blue-50 p-2.5">
                                                <SlidersHorizontal className="h-5 w-5 text-blue-600 bg-blue-100" />
                                            </div>
                                            <div>
                                                <Dialog.Title className="text-lg font-semibold text-blue-900">
                                                    Adjust Stock
                                                </Dialog.Title>
                                                <p className="text-sm text-gray-500">
                                                    Manage inventory levels for products
                                                </p>
                                            </div>
                                        </div>
                                        <button
                                            onClick={onClose}
                                            className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
                                        >
                                            <X className="h-5 w-5" />
                                        </button>
                                    </div>
                                </div>

                                {/* ========================================== */}
                                {/* BODY - Scrollable with two columns */}
                                {/* ========================================== */}
                                <div className="flex-1 overflow-y-auto bg-blue-50 p-6">
                                    {/* Approval Warning Banner */}
                                    {showApprovalInfo && isNegativeAdjustment && (
                                        <div className="mb-4 rounded-lg bg-yellow-50 border border-yellow-200 p-4">
                                            <div className="flex items-start gap-3">
                                                <AlertTriangle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                                                <div className="flex-1">
                                                    <h5 className="text-sm font-semibold text-yellow-800">
                                                        Approval Required
                                                    </h5>
                                                    <p className="text-sm text-yellow-700">
                                                        This is a <strong>negative adjustment</strong> that will reduce stock by{' '}
                                                        <strong>{Math.abs(difference)}</strong> units.
                                                        It requires manager approval before the changes take effect.
                                                        You will be notified once approved or rejected.
                                                    </p>
                                                    <div className="mt-2 flex items-center gap-2 text-xs text-yellow-600">
                                                        <ClockIcon className="h-3 w-3" />
                                                        <span>Estimated approval time: 1-2 hours</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                                        {/* ================================== */}
                                        {/* LEFT COLUMN - Product Search & Details */}
                                        {/* ================================== */}
                                        <div className="space-y-4">
                                            {/* Product Search */}
                                            <div className="rounded-lg border bg-white p-4 shadow-sm">
                                                <label className="mb-2 block text-sm font-medium text-gray-700">
                                                    Search Product
                                                </label>
                                                <div className="relative">
                                                    <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-gray-400" />
                                                    <input
                                                        ref={searchInputRef}
                                                        type="text"
                                                        placeholder="Search by name, code, or barcode..."
                                                        value={searchQuery}
                                                        onChange={(e) => setSearchQuery(e.target.value)}
                                                        onFocus={() => searchQuery.length >= 2 && setShowSearchResults(true)}
                                                        onBlur={() => setTimeout(() => setShowSearchResults(false), 200)}
                                                        disabled={!!initialProductId}
                                                        className="w-full rounded-lg border border-gray-300 py-2 pl-10 pr-4 text-sm focus:border-yellow-500 focus:ring-2 focus:ring-yellow-500/20 focus:outline-none disabled:bg-gray-100 disabled:cursor-not-allowed"
                                                    />
                                                    {searching && (
                                                        <Loader2 className="absolute top-1/2 right-3 h-4 w-4 -translate-y-1/2 animate-spin text-gray-400" />
                                                    )}
                                                    {showSearchResults && searchResults.length > 0 && (
                                                        <div className="absolute top-full left-0 z-10 mt-1 max-h-60 w-full overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-lg">
                                                            {searchResults.map((product) => (
                                                                <div
                                                                    key={product.id}
                                                                    className="cursor-pointer px-4 py-2 hover:bg-yellow-50 transition-colors"
                                                                    onMouseDown={() => handleProductSelect(product)}
                                                                >
                                                                    <div className="flex items-center justify-between">
                                                                        <div>
                                                                            <div className="font-medium text-gray-900">
                                                                                {product.product_name}
                                                                            </div>
                                                                            <div className="text-xs text-gray-500">
                                                                                Code: {product.product_code}
                                                                                {product.barcode && ` • Barcode: ${product.barcode}`}
                                                                            </div>
                                                                        </div>
                                                                        <div className="text-sm font-medium">
                                                                            <span className={`px-2 py-1 rounded-full text-xs ${
                                                                                (product.current_stock || 0) > (product.reorder_level || 0)
                                                                                    ? 'bg-green-100 text-green-700'
                                                                                    : 'bg-red-100 text-red-700'
                                                                            }`}>
                                                                                Stock: {product.current_stock || 0}
                                                                            </span>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                                {initialProductId && initialProductName && (
                                                    <p className="mt-1 text-xs text-gray-500">
                                                        Editing: <span className="font-medium">{initialProductName}</span>
                                                    </p>
                                                )}
                                            </div>

                                            {/* Product Details */}
                                            {selectedProduct ? (
                                                <div className="rounded-lg border bg-white p-4 shadow-sm">
                                                    <div className="flex items-start justify-between">
                                                        <div>
                                                            <h4 className="font-semibold text-gray-900">
                                                                {selectedProduct.product_name}
                                                            </h4>
                                                            <p className="text-xs text-gray-500">
                                                                Code: {selectedProduct.product_code}
                                                            </p>
                                                        </div>
                                                        {selectedProduct.barcode && (
                                                            <div className="flex items-center gap-1 text-xs text-gray-500">
                                                                <Barcode className="h-3 w-3" />
                                                                {selectedProduct.barcode}
                                                            </div>
                                                        )}
                                                    </div>

                                                    <div className="mt-3 grid grid-cols-2 gap-3">
                                                        <div className="rounded-lg bg-gray-50 p-2">
                                                            <p className="text-xs text-gray-500">Current Stock</p>
                                                            <p className="text-lg font-bold text-gray-900">
                                                                {selectedProduct.current_stock || 0}
                                                                {selectedProduct.unit && (
                                                                    <span className="text-sm font-normal text-gray-500">
                                                                        {' '}{selectedProduct.unit}
                                                                    </span>
                                                                )}
                                                            </p>
                                                        </div>
                                                        <div className="rounded-lg bg-gray-50 p-2">
                                                            <p className="text-xs text-gray-500">Reorder Level</p>
                                                            <p className="text-lg font-bold text-gray-900">
                                                                {selectedProduct.reorder_level || 0}
                                                                {selectedProduct.unit && (
                                                                    <span className="text-sm font-normal text-gray-500">
                                                                        {' '}{selectedProduct.unit}
                                                                    </span>
                                                                )}
                                                            </p>
                                                        </div>
                                                        {selectedProduct.strength && (
                                                            <div className="rounded-lg bg-gray-50 p-2">
                                                                <p className="text-xs text-gray-500">Strength</p>
                                                                <p className="text-sm font-medium text-gray-900">
                                                                    {selectedProduct.strength}
                                                                </p>
                                                            </div>
                                                        )}
                                                        {selectedProduct.form && (
                                                            <div className="rounded-lg bg-gray-50 p-2">
                                                                <p className="text-xs text-gray-500">Form</p>
                                                                <p className="text-sm font-medium text-gray-900 capitalize">
                                                                    {selectedProduct.form}
                                                                </p>
                                                            </div>
                                                        )}
                                                        {selectedProduct.category && (
                                                            <div className="rounded-lg bg-gray-50 p-2">
                                                                <p className="text-xs text-gray-500">Category</p>
                                                                <p className="text-sm font-medium text-gray-900">
                                                                    {selectedProduct.category}
                                                                </p>
                                                            </div>
                                                        )}
                                                        {selectedProduct.location && (
                                                            <div className="rounded-lg bg-gray-50 p-2">
                                                                <p className="text-xs text-gray-500">Location</p>
                                                                <p className="text-sm font-medium text-gray-900">
                                                                    {selectedProduct.location}
                                                                </p>
                                                            </div>
                                                        )}
                                                        {selectedProduct.supplier && (
                                                            <div className="col-span-2 rounded-lg bg-gray-50 p-2">
                                                                <p className="text-xs text-gray-500">Supplier</p>
                                                                <p className="text-sm font-medium text-gray-900">
                                                                    {selectedProduct.supplier}
                                                                </p>
                                                            </div>
                                                        )}
                                                    </div>

                                                    <div className="mt-2 flex items-center gap-4 text-xs text-gray-400">
                                                        {selectedProduct.last_updated && (
                                                            <span className="flex items-center gap-1">
                                                                <Clock className="h-3 w-3" />
                                                                Updated: {formatDate(selectedProduct.last_updated)}
                                                            </span>
                                                        )}
                                                        {selectedProduct.expiry_date && (
                                                            <span className={`flex items-center gap-1 ${
                                                                new Date(selectedProduct.expiry_date) < new Date()
                                                                    ? 'text-red-500'
                                                                    : ''
                                                            }`}>
                                                                <Calendar className="h-3 w-3" />
                                                                Expires: {formatDate(selectedProduct.expiry_date)}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="rounded-lg border-2 border-dashed border-gray-200 bg-white p-8 text-center">
                                                    <Package className="mx-auto h-12 w-12 text-gray-300" />
                                                    <p className="mt-2 text-sm text-gray-500">
                                                        Search and select a product to adjust
                                                    </p>
                                                </div>
                                            )}
                                        </div>

                                        {/* ================================== */}
                                        {/* RIGHT COLUMN - Adjustment Form */}
                                        {/* ================================== */}
                                        <div className="space-y-4">
                                            <div className="rounded-lg border bg-white p-4 shadow-sm">
                                                <h4 className="mb-3 text-sm font-medium text-gray-700">
                                                    Adjustment Details
                                                </h4>

                                                {/* Stock Summary */}
                                                <div className="mb-4 grid grid-cols-3 gap-2 rounded-lg bg-gray-50 p-3">
                                                    <div className="text-center">
                                                        <p className="text-xs text-gray-500">Current</p>
                                                        <p className="text-base font-bold text-gray-900">
                                                            {currentStock}
                                                        </p>
                                                    </div>
                                                    <div className="text-center">
                                                        <p className="text-xs text-gray-500">New</p>
                                                        <p className="text-base font-bold text-gray-900">
                                                            {newQuantity}
                                                        </p>
                                                    </div>
                                                    <div className="text-center">
                                                        <p className="text-xs text-gray-500">Change</p>
                                                        <p className={`text-base font-bold ${
                                                            difference > 0 ? 'text-green-600' :
                                                            difference < 0 ? 'text-red-600' :
                                                            'text-gray-500'
                                                        }`}>
                                                            {difference > 0 ? '+' : ''}{difference}
                                                        </p>
                                                    </div>
                                                </div>

                                                {/* Adjustment Type Selector */}
                                                <div className="mb-4">
                                                    <label className="mb-1 block text-xs font-medium text-gray-700">
                                                        Adjustment Type
                                                    </label>
                                                    <div className="grid grid-cols-3 gap-2">
                                                        <button
                                                            type="button"
                                                            onClick={() => handleAdjustmentTypeChange('add')}
                                                            className={`flex items-center justify-center gap-1 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                                                                adjustmentType === 'add'
                                                                    ? 'bg-green-100 text-green-700 ring-2 ring-green-500'
                                                                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                                            }`}
                                                            disabled={!selectedProduct}
                                                        >
                                                            <Plus className="h-3 w-3" />
                                                            Add
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => handleAdjustmentTypeChange('subtract')}
                                                            className={`flex items-center justify-center gap-1 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                                                                adjustmentType === 'subtract'
                                                                    ? 'bg-red-100 text-red-700 ring-2 ring-red-500'
                                                                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                                            }`}
                                                            disabled={!selectedProduct}
                                                        >
                                                            <MinusIcon className="h-3 w-3" />
                                                            Subtract
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => handleAdjustmentTypeChange('set')}
                                                            className={`flex items-center justify-center gap-1 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                                                                adjustmentType === 'set'
                                                                    ? 'bg-blue-100 text-blue-700 ring-2 ring-blue-500'
                                                                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                                            }`}
                                                            disabled={!selectedProduct}
                                                        >
                                                            Set
                                                        </button>
                                                    </div>
                                                </div>

                                                {/* Adjustment Value Input */}
                                                {adjustmentType !== 'set' ? (
                                                    <div className="mb-4">
                                                        <label className="mb-1 block text-xs font-medium text-gray-700">
                                                            {adjustmentType === 'add' ? 'Amount to Add' : 'Amount to Subtract'}
                                                        </label>
                                                        <div className="flex gap-2">
                                                            <input
                                                                type="number"
                                                                value={adjustmentValue}
                                                                onChange={(e) => setAdjustmentValue(Math.max(0, Number(e.target.value)))}
                                                                min="0"
                                                                step="1"
                                                                className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-yellow-500 focus:ring-2 focus:ring-yellow-500/20 focus:outline-none"
                                                                disabled={!selectedProduct}
                                                                placeholder="Enter amount..."
                                                            />
                                                            <button
                                                                type="button"
                                                                onClick={applyAdjustment}
                                                                className="rounded-lg bg-yellow-600 px-4 py-2 text-sm font-medium text-white hover:bg-yellow-700 disabled:opacity-50"
                                                                disabled={!selectedProduct || adjustmentValue === 0}
                                                            >
                                                                Apply
                                                            </button>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <div className="mb-4">
                                                        <label className="mb-1 block text-xs font-medium text-gray-700">
                                                            New Quantity
                                                        </label>
                                                        <input
                                                            type="number"
                                                            value={newQuantity}
                                                            onChange={(e) => setNewQuantity(Math.max(0, Number(e.target.value)))}
                                                            min="0"
                                                            step="1"
                                                            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-yellow-500 focus:ring-2 focus:ring-yellow-500/20 focus:outline-none"
                                                            disabled={!selectedProduct}
                                                            placeholder="Enter new quantity..."
                                                            onKeyDown={handleKeyDown}
                                                        />
                                                    </div>
                                                )}

                                                {/* Adjustment Category */}
                                                <div className="mb-4">
                                                    <label className="mb-1 block text-xs font-medium text-gray-700">
                                                        Adjustment Category
                                                    </label>
                                                    <select
                                                        value={adjustmentCategory}
                                                        onChange={(e) => setAdjustmentCategory(e.target.value)}
                                                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-yellow-500 focus:ring-2 focus:ring-yellow-500/20 focus:outline-none"
                                                        disabled={!selectedProduct}
                                                    >
                                                        <option value="correction">Correction</option>
                                                        <option value="damage">Damage</option>
                                                        <option value="expiry">Expiry</option>
                                                        <option value="shortage">Shortage</option>
                                                        <option value="surplus">Surplus</option>
                                                        <option value="quality_issue">Quality Issue</option>
                                                    </select>
                                                </div>

                                                {/* Reason */}
                                                <div className="mb-4">
                                                    <label className="mb-1 block text-xs font-medium text-gray-700">
                                                        Reason for Adjustment *
                                                    </label>
                                                    <textarea
                                                        value={reason}
                                                        onChange={(e) => setReason(e.target.value)}
                                                        rows={3}
                                                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-yellow-500 focus:ring-2 focus:ring-yellow-500/20 focus:outline-none resize-none"
                                                        placeholder="Explain why this adjustment is needed..."
                                                        disabled={!selectedProduct}
                                                        onKeyDown={(e) => {
                                                            if (e.key === 'Enter' && e.ctrlKey) {
                                                                handleSubmit(e);
                                                            }
                                                        }}
                                                    />
                                                    <p className="mt-1 text-xs text-gray-400">
                                                        Minimum 10 characters. Press Ctrl+Enter to submit.
                                                    </p>
                                                </div>

                                                {/* File Upload - Evidence */}
                                                <div className="mb-4">
                                                    <label className="mb-1 block text-xs font-medium text-gray-700">
                                                        Upload Evidence
                                                        {isNegativeAdjustment && (adjustmentCategory === 'damage' || adjustmentCategory === 'expiry') && (
                                                            <span className="text-red-500 ml-1">*</span>
                                                        )}
                                                    </label>
                                                    <div
                                                        className={`relative rounded-lg border-2 border-dashed p-4 transition-colors ${
                                                            isDragging
                                                                ? 'border-yellow-500 bg-yellow-50'
                                                                : 'border-gray-300 hover:border-gray-400'
                                                        }`}
                                                        onDragOver={handleDragOver}
                                                        onDragLeave={handleDragLeave}
                                                        onDrop={handleDrop}
                                                        onClick={() => fileInputRef.current?.click()}
                                                    >
                                                        <input
                                                            ref={fileInputRef}
                                                            type="file"
                                                            multiple
                                                            accept="image/*,.pdf"
                                                            className="hidden"
                                                            onChange={(e) => handleFileUpload(e.target.files)}
                                                            disabled={!selectedProduct}
                                                        />
                                                        <div className="text-center">
                                                            <Upload className="mx-auto h-8 w-8 text-gray-400" />
                                                            <p className="mt-1 text-sm text-gray-500">
                                                                Drag & drop files here, or click to browse
                                                            </p>
                                                            <p className="text-xs text-gray-400">
                                                                Supports images and PDF (Max 5MB each)
                                                            </p>
                                                            {isNegativeAdjustment && (adjustmentCategory === 'damage' || adjustmentCategory === 'expiry') && (
                                                                <p className="text-xs text-red-500 mt-1">
                                                                    Evidence required for damage/expiry adjustments
                                                                </p>
                                                            )}
                                                        </div>
                                                    </div>

                                                    {/* Uploaded Files */}
                                                    {uploadedFiles.length > 0 && (
                                                        <div className="mt-2 space-y-1">
                                                            {uploadedFiles.map((file) => (
                                                                <div
                                                                    key={file.id}
                                                                    className="flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50 px-3 py-2"
                                                                >
                                                                    <div className="flex items-center gap-2">
                                                                        {file.type.startsWith('image/') ? (
                                                                            <Image className="h-4 w-4 text-gray-500" />
                                                                        ) : (
                                                                            <File className="h-4 w-4 text-gray-500" />
                                                                        )}
                                                                        <span className="text-sm text-gray-700 truncate max-w-[150px]">
                                                                            {file.name}
                                                                        </span>
                                                                        <span className="text-xs text-gray-400">
                                                                            {formatFileSize(file.size)}
                                                                        </span>
                                                                        {file.uploading && (
                                                                            <div className="flex items-center gap-2">
                                                                                <Loader2 className="h-3 w-3 animate-spin text-yellow-500" />
                                                                                <span className="text-xs text-yellow-500">
                                                                                    {file.progress}%
                                                                                </span>
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => removeFile(file.id!)}
                                                                        className="text-gray-400 hover:text-red-500 transition-colors"
                                                                        disabled={file.uploading}
                                                                    >
                                                                        <X className="h-4 w-4" />
                                                                    </button>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Status Indicator */}
                                                {selectedProduct && isChanged && (
                                                    <div className={`mt-3 rounded-lg p-2 text-sm ${
                                                        difference > 0
                                                            ? 'bg-green-50 text-green-700'
                                                            : 'bg-red-50 text-red-700'
                                                    }`}>
                                                        <div className="flex items-center gap-2">
                                                            {difference > 0 ? (
                                                                <TrendingUp className="h-4 w-4" />
                                                            ) : (
                                                                <TrendingDown className="h-4 w-4" />
                                                            )}
                                                            <span>
                                                                {difference > 0 ? 'Increasing' : 'Decreasing'} stock by{' '}
                                                                <strong>{Math.abs(difference)}</strong> units
                                                                {difference > 0 ? ' (+)' : ' (-)'}
                                                                from {currentStock} to {newQuantity}
                                                            </span>
                                                        </div>
                                                        {isNegativeAdjustment && (
                                                            <div className="mt-1 flex items-center gap-1 text-xs text-yellow-600">
                                                                <Shield className="h-3 w-3" />
                                                                <span>This change requires approval</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* ========================================== */}
                                {/* FOOTER - Fixed */}
                                {/* ========================================== */}
                                <div className="flex-shrink-0 px-6 py-4 border-t border-gray-200 bg-white rounded-b-xl">
                                    <div className="flex items-center justify-between">
                                        <div className="text-sm text-gray-500">
                                            {selectedProduct && (
                                                <span>
                                                    Adjusting <strong>{selectedProduct.product_name}</strong>
                                                    {selectedProduct.unit && ` (${selectedProduct.unit})`}
                                                    {isNegativeAdjustment && (
                                                        <span className="ml-2 inline-flex items-center gap-1 text-yellow-600">
                                                            <Shield className="h-3 w-3" />
                                                            Requires Approval
                                                        </span>
                                                    )}
                                                </span>
                                            )}
                                            {!selectedProduct && 'Select a product to begin'}
                                        </div>
                                        <div className="flex items-center gap-3 border-none">
                                            <button
                                                type="button"
                                                onClick={onClose}
                                                className="rounded-lg px-4 py-2 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-100"
                                                disabled={submitting}
                                            >
                                                Cancel
                                            </button>
                                            <button
                                                type="submit"
                                                onClick={handleSubmit}
                                                disabled={
                                                    !selectedProduct ||
                                                    submitting ||
                                                    !isChanged ||
                                                    !reason.trim() ||
                                                    reason.trim().length < 10 ||
                                                    (isNegativeAdjustment && 
                                                     (adjustmentCategory === 'damage' || adjustmentCategory === 'expiry') && 
                                                     uploadedFiles.length === 0)
                                                }
                                                className={`flex items-center gap-2 rounded-lg px-6 py-2 text-sm font-medium text-white transition-colors ${
                                                    !selectedProduct || submitting || !isChanged || !reason.trim() || reason.trim().length < 10 ||
                                                    (isNegativeAdjustment && (adjustmentCategory === 'damage' || adjustmentCategory === 'expiry') && uploadedFiles.length === 0)
                                                        ? 'bg-blue-600 cursor-not-allowed'
                                                        : isNegativeAdjustment
                                                        ? 'bg-yellow-600 hover:bg-yellow-700'
                                                        : 'bg-green-600 hover:bg-green-700'
                                                }`}
                                                title={
                                                    isNegativeAdjustment && (adjustmentCategory === 'damage' || adjustmentCategory === 'expiry') && uploadedFiles.length === 0
                                                        ? 'Evidence required for damage/expiry adjustments'
                                                        : ''
                                                }
                                            >
                                                {submitting ? (
                                                    <>
                                                        <Loader2 className="h-4 w-4 animate-spin" />
                                                        Processing...
                                                    </>
                                                ) : (
                                                    <>
                                                        {isNegativeAdjustment ? (
                                                            <Shield className="h-4 w-4" />
                                                        ) : (
                                                            <SlidersHorizontal className="h-4 w-4" />
                                                        )}
                                                        {isNegativeAdjustment ? 'Request Adjustment' : 'Confirm Adjustment'}
                                                    </>
                                                )}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </Dialog.Panel>
                        </Transition.Child>
                    </div>
                </div>
            </Dialog>
        </Transition>
    );
}