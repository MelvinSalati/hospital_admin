// resources/js/pages/bulkstore/components/AdjustStock.tsx

import {usePage} from '@inertiajs/react'
import {
    X,
    Search,
    Plus,
    Minus,
    Package,
    AlertCircle,
    Check,
    FileText,
    Upload,
    Image,
    File,
    Trash2,
    Calendar,
    Hash,
    DollarSign,
} from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { toast } from 'react-hot-toast';
import Http from '@/utils/Http';
interface Product {
    product_id: number;
    product_uuid: string;
    product_code: string;
    product_name: string;
    description: string;
    strength: string;
    form: string;
    unit: string;
    category_id: number;
    category_name: string;
    barcode: string | null;
    total_stock: number;
    active_batches: number;
    nearest_expiry: string | null;
    days_remaining: number | null;
    stock_status: string;
    expiry_status: string;
    generic_name?: string;
    brand_name?: string;
    reorder_level?: number;
}

interface AdjustStockModalProps {
    isOpen: boolean;
    onClose: () => void;
    productId?: number;
    initialStock?: number;
    productName?: string;
    onSuccess?: () => void;
}

export default function AdjustStockModal({
    isOpen,
    onClose,
    productId,
    initialStock,
    productName,
    onSuccess,
}: AdjustStockModalProps) {
    const [searchTerm, setSearchTerm] = useState('');
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(false);
    const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
    const [adjustmentType, setAdjustmentType] = useState<'addition' | 'reduction'>('addition');
    const [newQuantity, setNewQuantity] = useState<number>(0);
    const [adjustmentCategory, setAdjustmentCategory] = useState<string>('correction');
    const [reason, setReason] = useState('');
    const [batchNumber, setBatchNumber] = useState('');
    const [expiryDate, setExpiryDate] = useState('');
    const [unitCost, setUnitCost] = useState<number>(0);
    const [files, setFiles] = useState<File[]>([]);
    const [submitting, setSubmitting] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const {auth}  = usePage().props;
    // Reset state when modal closes
    useEffect(() => {
        if (!isOpen) {
            setSelectedProduct(null);
            setProducts([]);
            setSearchTerm('');
            setNewQuantity(0);
            setReason('');
            setBatchNumber('');
            setExpiryDate('');
            setUnitCost(0);
            setFiles([]);
        }
    }, [isOpen]);

    // Fetch products when search term changes
    useEffect(() => {
        if (searchTerm.trim().length >= 2 && isOpen) {
            const delayDebounce = setTimeout(() => {
                searchProducts(searchTerm);
            }, 300);
            return () => clearTimeout(delayDebounce);
        } else if (searchTerm.length === 0) {
            setProducts([]);
        }
    }, [searchTerm, isOpen]);

    // If productId is provided, fetch that product
    useEffect(() => {
        if (productId && isOpen) {
            fetchProductById(productId);
        }
    }, [productId, isOpen]);

    // If product is passed via props (from Adjustments page)
    useEffect(() => {
        if (productId && initialStock !== undefined && productName && isOpen) {
            const stock = parseFloat(String(initialStock)) || 0;
            const product: Product = {
                product_id: productId,
                product_uuid: '',
                product_code: '',
                product_name: productName,
                description: '',
                strength: '',
                form: '',
                unit: 'Unit',
                category_id: 0,
                category_name: '',
                barcode: null,
                total_stock: stock,
                active_batches: 0,
                nearest_expiry: null,
                days_remaining: null,
                stock_status: '',
                expiry_status: '',
                reorder_level: 0,
            };
            setSelectedProduct(product);
            setNewQuantity(stock);
        }
    }, [productId, initialStock, productName, isOpen]);

    const searchProducts = async (query: string) => {
        setLoading(true);
        try {
            const response = await Http.get(`bulk-store/product/${query}`);
            console.log('Search response:', response.data);
            
            if (response.data) {
                let productData = response.data.data || response.data;
                if (!Array.isArray(productData)) {
                    productData = [productData];
                }
                
                const mappedProducts = productData.map((p: any) => {
                    const stock = parseFloat(p.total_stock) || 0;
                    
                    return {
                        product_id: p.product_id || p.id,
                        product_uuid: p.product_uuid || '',
                        product_code: p.product_code || '',
                        product_name: p.product_name || p.name || '',
                        description: p.description || '',
                        strength: p.strength || '',
                        form: p.form || p.dosage_form || '',
                        unit: p.unit || p.unit_of_measure || 'Unit',
                        category_id: p.category_id || 0,
                        category_name: p.category_name || '',
                        barcode: p.barcode || null,
                        total_stock: stock,
                        active_batches: parseInt(p.active_batches) || 0,
                        nearest_expiry: p.nearest_expiry || null,
                        days_remaining: p.days_remaining ? parseInt(p.days_remaining) : null,
                        stock_status: p.stock_status || '',
                        expiry_status: p.expiry_status || '',
                        generic_name: p.generic_name || '',
                        brand_name: p.brand_name || '',
                        reorder_level: p.reorder_level || 0,
                    };
                });
                
                setProducts(mappedProducts);
            }
        } catch (error) {
            console.error('Error searching products:', error);
            toast.error('Failed to search products');
        } finally {
            setLoading(false);
        }
    };

    const fetchProductById = async (id: number) => {
        setLoading(true);
        try {
            const response = await Http.get(`bulk-store/products/${id}`);
            console.log('Product by ID response:', response.data);
            
            if (response.data) {
                const p = response.data;
                const stock = parseFloat(p.total_stock) || 0;
                
                const mappedProduct: Product = {
                    product_id: p.product_id || p.id,
                    product_uuid: p.product_uuid || '',
                    product_code: p.product_code || '',
                    product_name: p.product_name || p.name || '',
                    description: p.description || '',
                    strength: p.strength || '',
                    form: p.form || p.dosage_form || '',
                    unit: p.unit || p.unit_of_measure || 'Unit',
                    category_id: p.category_id || 0,
                    category_name: p.category_name || '',
                    barcode: p.barcode || null,
                    total_stock: stock,
                    active_batches: parseInt(p.active_batches) || 0,
                    nearest_expiry: p.nearest_expiry || null,
                    days_remaining: p.days_remaining ? parseInt(p.days_remaining) : null,
                    stock_status: p.stock_status || '',
                    expiry_status: p.expiry_status || '',
                    generic_name: p.generic_name || '',
                    brand_name: p.brand_name || '',
                    reorder_level: p.reorder_level || 0,
                };
                
                setSelectedProduct(mappedProduct);
                setNewQuantity(stock);
            }
        } catch (error) {
            console.error('Error fetching product:', error);
            toast.error('Failed to fetch product details');
        } finally {
            setLoading(false);
        }
    };

    const handleSelectProduct = (product: Product) => {
        setSelectedProduct(product);
        setNewQuantity(product.total_stock || 0);
        setSearchTerm('');
        setProducts([]);
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            const newFiles = Array.from(e.target.files);
            const validFiles = newFiles.filter(
                (file) => file.size <= 5 * 1024 * 1024
            );
            if (validFiles.length !== newFiles.length) {
                toast.error('Some files exceed the 5MB limit');
            }
            setFiles((prev) => [...prev, ...validFiles]);
        }
    };

    const handleRemoveFile = (index: number) => {
        setFiles((prev) => prev.filter((_, i) => i !== index));
    };

    const handleSubmit = async () => {
        if (!selectedProduct) {
            toast.error('Please select a product');
            return;
        }

        if (!reason || reason.trim().length < 10) {
            toast.error('Please provide a reason (minimum 10 characters)');
            return;
        }

        const previousQuantity = selectedProduct.total_stock || 0;
        const difference = newQuantity - previousQuantity;

        if (difference === 0) {
            toast.error('Quantity must be different from current stock');
            return;
        }

        setSubmitting(true);
        try {
            const payload = {
                product_id: selectedProduct.product_id,
                quantity: newQuantity,
                reason: reason.trim(),
                previous_quantity: previousQuantity,
                adjustment_type: adjustmentType,
                difference: difference,
                adjustment_category: adjustmentCategory,
                evidence: files.map(file => file.name),
                batch_number: batchNumber || null,
                expiry_date: expiryDate || null,
                unit_cost: unitCost || null,
                created_by: auth.user.id
            };
console.log(payload)
            const response = await Http.post('/bulk-store/adjust-stock', payload);
         
            
            if (response.status === 200) {
                toast.success('Stock adjusted successfully');
                if (onSuccess) onSuccess();
                onClose();
            }
        } catch (error: any) {
            console.error('Error adjusting stock:', error);
            toast.error(error.response?.data?.message || 'Failed to adjust stock');
        } finally {
            setSubmitting(false);
        }
    };

    if (!isOpen) return null;

    const currentStock = selectedProduct?.total_stock ?? 0;
    const displayUnit = selectedProduct?.unit || 'Unit';
    const difference = newQuantity - currentStock;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
            <div className="flex w-full max-w-4xl flex-col rounded-xl bg-white shadow-2xl dark:bg-slate-800">
                {/* Header - Fixed */}
                <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 dark:border-slate-700">
                    <div className="flex items-center gap-3">
                        <div className="rounded-lg bg-blue-100 p-2 dark:bg-blue-900/30">
                            <Package className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">
                                Adjust Stock
                            </h3>
                            <p className="text-sm text-slate-500 dark:text-slate-400">
                                Manage inventory levels for products
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="rounded-lg p-1.5 transition-colors hover:bg-slate-100 dark:hover:bg-slate-700"
                    >
                        <X className="h-5 w-5 text-slate-500" />
                    </button>
                </div>

                {/* Body - Scrollable */}
                <div className="flex-1 overflow-y-auto p-6">
                    {!selectedProduct ? (
                        <div className="space-y-4">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                                <input
                                    type="text"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    placeholder="Search product by name or code..."
                                    className="h-10 w-full rounded-lg border border-slate-200 pl-10 pr-4 text-sm focus:border-blue-400 focus:ring-2 focus:ring-blue-400/20 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                                />
                            </div>

                            {loading && (
                                <div className="flex items-center justify-center py-8">
                                    <div className="h-6 w-6 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
                                    <span className="ml-2 text-sm text-slate-500">Searching...</span>
                                </div>
                            )}

                            {products.length > 0 && (
                                <div className="max-h-60 overflow-y-auto rounded-lg border border-slate-200 dark:border-slate-700">
                                    {products.map((product) => (
                                        <button
                                            key={product.product_id}
                                            onClick={() => handleSelectProduct(product)}
                                            className="flex w-full items-center justify-between border-b border-slate-100 px-4 py-2.5 text-left transition-colors hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-700/50"
                                        >
                                            <div>
                                                <p className="font-medium text-slate-800 dark:text-slate-100">
                                                    {product.product_name}
                                                </p>
                                                <p className="text-xs text-slate-500 dark:text-slate-400">
                                                    Code: {product.product_code}
                                                    {product.strength && ` • ${product.strength}`}
                                                    {product.form && ` • ${product.form}`}
                                                </p>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-sm font-bold text-green-600 dark:text-green-400">
                                                    {product.total_stock} {product.unit}
                                                </p>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            )}

                            {!loading && products.length === 0 && searchTerm.length >= 2 && (
                                <div className="text-center py-8 text-slate-500">
                                    <p>No products found. Try a different search.</p>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="space-y-5">
                            {/* Selected Product Info */}
                            <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-700/30">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <h4 className="font-medium text-slate-800 dark:text-slate-100">
                                            {selectedProduct.product_name}
                                        </h4>
                                        <p className="text-sm text-slate-500 dark:text-slate-400">
                                            Code: {selectedProduct.product_code}
                                            {selectedProduct.strength && ` • ${selectedProduct.strength}`}
                                            {selectedProduct.form && ` • ${selectedProduct.form}`}
                                        </p>
                                    </div>
                                    <button
                                        onClick={() => {
                                            setSelectedProduct(null);
                                            setNewQuantity(0);
                                            setProducts([]);
                                        }}
                                        className="rounded-lg border border-slate-300 px-3 py-1 text-sm transition-colors hover:bg-slate-100 dark:border-slate-600 dark:hover:bg-slate-700"
                                    >
                                        Change
                                    </button>
                                </div>
                            </div>

                            {/* Stock Stats */}
                            <div className="grid grid-cols-3 gap-3">
                                <div className="rounded-lg bg-green-50 p-3 dark:bg-green-950/30">
                                    <p className="text-xs text-green-600 dark:text-green-400">Previous Stock</p>
                                    <p className="text-xl font-bold text-green-700 dark:text-green-300">
                                        {currentStock} {displayUnit}
                                    </p>
                                </div>
                                <div className="rounded-lg bg-blue-50 p-3 dark:bg-blue-950/30">
                                    <p className="text-xs text-blue-600 dark:text-blue-400">New Stock</p>
                                    <p className="text-xl font-bold text-blue-700 dark:text-blue-300">
                                        {newQuantity} {displayUnit}
                                    </p>
                                </div>
                                <div className="rounded-lg bg-purple-50 p-3 dark:bg-purple-950/30">
                                    <p className="text-xs text-purple-600 dark:text-purple-400">Difference</p>
                                    <p className={`text-xl font-bold ${difference > 0 ? 'text-green-600' : difference < 0 ? 'text-red-600' : 'text-slate-600'}`}>
                                        {difference > 0 ? `+${difference}` : difference}
                                    </p>
                                </div>
                            </div>

                            {/* Adjustment Type & Quantity */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
                                        Adjustment Type
                                    </label>
                                    <div className="flex gap-1.5">
                                        <button
                                            onClick={() => setAdjustmentType('addition')}
                                            className={`flex-1 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                                                adjustmentType === 'addition'
                                                    ? 'bg-green-600 text-white'
                                                    : 'border border-slate-300 text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-300'
                                            }`}
                                        >
                                            <Plus className="inline h-3.5 w-3.5" /> Addition
                                        </button>
                                        <button
                                            onClick={() => setAdjustmentType('reduction')}
                                            className={`flex-1 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                                                adjustmentType === 'reduction'
                                                    ? 'bg-red-600 text-white'
                                                    : 'border border-slate-300 text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-300'
                                            }`}
                                        >
                                            <Minus className="inline h-3.5 w-3.5" /> Reduction
                                        </button>
                                    </div>
                                </div>
                                <div>
                                    <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
                                        New Quantity
                                    </label>
                                    <input
                                        type="number"
                                        value={newQuantity}
                                        onChange={(e) => setNewQuantity(parseFloat(e.target.value) || 0)}
                                        min="0"
                                        className="h-9 w-full rounded-lg border border-slate-200 px-3 text-sm focus:border-blue-400 focus:ring-2 focus:ring-blue-400/20 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                                    />
                                </div>
                            </div>

                            {/* Category & Reason */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
                                        Adjustment Category
                                    </label>
                                    <select
                                        value={adjustmentCategory}
                                        onChange={(e) => setAdjustmentCategory(e.target.value)}
                                        className="h-9 w-full rounded-lg border border-slate-200 px-3 text-sm focus:border-blue-400 focus:ring-2 focus:ring-blue-400/20 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                                    >
                                        <option value="correction">Correction</option>
                                        <option value="damage">Damage</option>
                                        <option value="expiry">Expiry</option>
                                        <option value="shortage">Shortage</option>
                                        <option value="surplus">Surplus</option>
                                        <option value="quality_issue">Quality Issue</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
                                        Reason <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        value={reason}
                                        onChange={(e) => setReason(e.target.value)}
                                        placeholder="Minimum 10 characters..."
                                        className="h-9 w-full rounded-lg border border-slate-200 px-3 text-sm focus:border-blue-400 focus:ring-2 focus:ring-blue-400/20 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                                    />
                                </div>
                            </div>

                            {/* Batch, Expiry, Unit Cost */}
                            <div className="grid grid-cols-3 gap-4">
                                <div>
                                    <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
                                        <Hash className="inline h-3.5 w-3.5 mr-1" />
                                        Batch Number
                                    </label>
                                    <input
                                        type="text"
                                        value={batchNumber}
                                        onChange={(e) => setBatchNumber(e.target.value)}
                                        placeholder="Optional"
                                        className="h-9 w-full rounded-lg border border-slate-200 px-3 text-sm focus:border-blue-400 focus:ring-2 focus:ring-blue-400/20 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                                    />
                                </div>
                                <div>
                                    <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
                                        <Calendar className="inline h-3.5 w-3.5 mr-1" />
                                        Expiry Date
                                    </label>
                                    <input
                                        type="date"
                                        value={expiryDate}
                                        onChange={(e) => setExpiryDate(e.target.value)}
                                        className="h-9 w-full rounded-lg border border-slate-200 px-3 text-sm focus:border-blue-400 focus:ring-2 focus:ring-blue-400/20 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                                    />
                                </div>
                                <div>
                                    <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
                                        <DollarSign className="inline h-3.5 w-3.5 mr-1" />
                                        Unit Cost
                                    </label>
                                    <input
                                        type="number"
                                        value={unitCost}
                                        onChange={(e) => setUnitCost(parseFloat(e.target.value) || 0)}
                                        min="0"
                                        step="0.01"
                                        placeholder="0.00"
                                        className="h-9 w-full rounded-lg border border-slate-200 px-3 text-sm focus:border-blue-400 focus:ring-2 focus:ring-blue-400/20 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                                    />
                                </div>
                            </div>

                            {/* File Upload - Compact */}
                            <div>
                                <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
                                    Upload Evidence
                                </label>
                                <div
                                    onClick={() => fileInputRef.current?.click()}
                                    className="cursor-pointer rounded-lg border-2 border-dashed border-slate-300 p-4 text-center transition-colors hover:border-blue-400 dark:border-slate-600"
                                >
                                    <Upload className="mx-auto h-6 w-6 text-slate-400" />
                                    <p className="mt-1 text-sm text-slate-500">
                                        Click to upload or drag & drop
                                    </p>
                                    <p className="text-xs text-slate-400">
                                        Images & PDF (Max 5MB each)
                                    </p>
                                    <input
                                        ref={fileInputRef}
                                        type="file"
                                        multiple
                                        accept="image/*,.pdf"
                                        onChange={handleFileChange}
                                        className="hidden"
                                    />
                                </div>
                                {files.length > 0 && (
                                    <div className="mt-2 space-y-1">
                                        {files.map((file, index) => (
                                            <div
                                                key={index}
                                                className="flex items-center justify-between rounded-lg border border-slate-200 p-2 dark:border-slate-700"
                                            >
                                                <div className="flex items-center gap-2">
                                                    {file.type.startsWith('image/') ? (
                                                        <Image className="h-4 w-4 text-slate-500" />
                                                    ) : (
                                                        <File className="h-4 w-4 text-slate-500" />
                                                    )}
                                                    <span className="text-sm text-slate-700 dark:text-slate-300">
                                                        {file.name}
                                                    </span>
                                                    <span className="text-xs text-slate-500">
                                                        ({(file.size / 1024).toFixed(1)} KB)
                                                    </span>
                                                </div>
                                                <button
                                                    onClick={() => handleRemoveFile(index)}
                                                    className="rounded p-1 hover:bg-slate-100 dark:hover:bg-slate-700"
                                                >
                                                    <Trash2 className="h-4 w-4 text-red-500" />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer - Fixed with buttons */}
                <div className="flex items-center justify-end gap-3 border-t border-slate-200 px-6 py-4 dark:border-slate-700">
                    <button
                        onClick={onClose}
                        className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-700"
                    >
                        Cancel
                    </button>
                    {selectedProduct && (
                        <button
                            onClick={handleSubmit}
                            disabled={submitting}
                            className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {submitting ? (
                                <>
                                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                                    Processing...
                                </>
                            ) : (
                                <>
                                    <Check className="h-4 w-4" />
                                    Confirm Adjustment
                                </>
                            )}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}