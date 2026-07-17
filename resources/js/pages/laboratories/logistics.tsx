// pages/laboratory/logistics.tsx
import { useState, useEffect, useMemo } from 'react';
import { usePage, router } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import { Button } from '@/components/ui/button';
import {
    Plus,
    Search,
    Package,
    AlertTriangle,
    CheckCircle,
    X,
    Trash2,
    Edit2,
    Eye,
    RefreshCw,
    Filter,
    ChevronLeft,
    ChevronRight,
    ChevronsLeft,
    ChevronsRight,
    Download,
    Printer,
    Upload,
    Clock,
    TrendingUp,
    TrendingDown,
} from 'lucide-react';
import axios from 'axios';
import Notiflix from 'notiflix';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Product {
    id: number;
    item_name: string;
    item_code: string;
    category: string;
    unit_of_measure: string;
    current_stock: number;
    reorder_level: number;
    minimum_stock: number;
    maximum_stock: number;
    unit_cost: number;
    selling_price: number;
    supplier: string;
    expiry_date: string;
    batch_number: string;
    status: 'in_stock' | 'low_stock' | 'out_of_stock' | 'expired';
    created_at: string;
    updated_at: string;
}

interface StockMovement {
    id: number;
    product_id: number;
    type: 'receiving' | 'issuing' | 'adjustment' | 'return' | 'transfer';
    quantity: number;
    balance_after: number;
    reference_number: string;
    moved_at: string;
    created_by: string;
    remarks: string;
    product_name: string;
}

interface Supplier {
    id: number;
    name: string;
    code: string;
    contact_person: string;
    phone: string;
    email: string;
}

// ─── Components ──────────────────────────────────────────────────────────────

const StatusBadge = ({ status }: { status: string }) => {
    const config: Record<string, { color: string; icon: any; label: string }> =
        {
            in_stock: { color: 'green', icon: CheckCircle, label: 'In Stock' },
            low_stock: {
                color: 'yellow',
                icon: AlertTriangle,
                label: 'Low Stock',
            },
            out_of_stock: {
                color: 'red',
                icon: AlertTriangle,
                label: 'Out of Stock',
            },
            expired: { color: 'gray', icon: AlertTriangle, label: 'Expired' },
        };

    const { color, icon: Icon, label } = config[status] || config.out_of_stock;

    return (
        <span
            className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium bg-${color}-100 text-${color}-700`}
        >
            <Icon className="h-3 w-3" />
            {label}
        </span>
    );
};

const StockTrend = ({ value }: { value: number }) => {
    const isPositive = value > 0;
    const isNegative = value < 0;
    const Icon = isPositive ? TrendingUp : isNegative ? TrendingDown : null;

    if (!Icon) return <span className="text-xs text-gray-400">No change</span>;

    return (
        <span
            className={`inline-flex items-center gap-0.5 text-xs font-medium ${isPositive ? 'text-green-600' : 'text-red-600'}`}
        >
            <Icon className="h-3 w-3" />
            {isPositive ? '+' : ''}
            {value}%
        </span>
    );
};

// ─── Modals ──────────────────────────────────────────────────────────────────

const AddProductModal = ({
    isOpen,
    onClose,
    onSuccess,
    suppliers,
}: {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    suppliers: Supplier[];
}) => {
    const [formData, setFormData] = useState({
        item_name: '',
        item_code: '',
        category: '',
        unit_of_measure: '',
        unit_cost: '',
        selling_price: '',
        reorder_level: '',
        minimum_stock: '',
        maximum_stock: '',
        supplier_id: '',
        expiry_date: '',
        batch_number: '',
        notes: '',
    });
    const [errors, setErrors] = useState<any>({});
    const [isSubmitting, setIsSubmitting] = useState(false);

    if (!isOpen) return null;

    const handleChange = (
        e: React.ChangeEvent<
            HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
        >,
    ) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
        if (errors[name]) {
            setErrors((prev: any) => ({ ...prev, [name]: '' }));
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);

        router.post('/laboratory/logistics/products', formData, {
            onSuccess: () => {
                Notiflix.Notify.success('Product added successfully');
                onSuccess();
                onClose();
                setFormData({
                    item_name: '',
                    item_code: '',
                    category: '',
                    unit_of_measure: '',
                    unit_cost: '',
                    selling_price: '',
                    reorder_level: '',
                    minimum_stock: '',
                    maximum_stock: '',
                    supplier_id: '',
                    expiry_date: '',
                    batch_number: '',
                    notes: '',
                });
            },
            onError: (err) => {
                setErrors(err);
                Notiflix.Notify.failure('Failed to add product');
            },
            onFinish: () => setIsSubmitting(false),
        });
    };

    const categories = [
        'Reagents',
        'Test Kits',
        'Consumables',
        'Equipment',
        'Controls',
        'Calibrators',
        'Other',
    ];

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3">
            <div
                className="fixed inset-0 bg-black/50 backdrop-blur-sm"
                onClick={onClose}
            />
            <div className="relative max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-lg bg-white shadow-2xl">
                <div className="sticky top-0 flex items-center justify-between border-b bg-white px-5 py-3">
                    <h2 className="text-base font-semibold">
                        Add Laboratory Product
                    </h2>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-600"
                    >
                        <X className="h-4 w-4" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4 p-5">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="mb-1 block text-xs font-medium text-gray-700">
                                Product Name *
                            </label>
                            <input
                                type="text"
                                name="item_name"
                                value={formData.item_name}
                                onChange={handleChange}
                                className="w-full rounded border border-gray-300 px-3 py-1.5 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                placeholder="Enter product name"
                                required
                            />
                            {errors.item_name && (
                                <p className="mt-1 text-xs text-red-500">
                                    {errors.item_name}
                                </p>
                            )}
                        </div>
                        <div>
                            <label className="mb-1 block text-xs font-medium text-gray-700">
                                Product Code *
                            </label>
                            <input
                                type="text"
                                name="item_code"
                                value={formData.item_code}
                                onChange={handleChange}
                                className="w-full rounded border border-gray-300 px-3 py-1.5 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                placeholder="e.g., REAG-001"
                                required
                            />
                            {errors.item_code && (
                                <p className="mt-1 text-xs text-red-500">
                                    {errors.item_code}
                                </p>
                            )}
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="mb-1 block text-xs font-medium text-gray-700">
                                Category *
                            </label>
                            <select
                                name="category"
                                value={formData.category}
                                onChange={handleChange}
                                className="w-full rounded border border-gray-300 px-3 py-1.5 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                required
                            >
                                <option value="">Select Category</option>
                                {categories.map((cat) => (
                                    <option key={cat} value={cat}>
                                        {cat}
                                    </option>
                                ))}
                            </select>
                            {errors.category && (
                                <p className="mt-1 text-xs text-red-500">
                                    {errors.category}
                                </p>
                            )}
                        </div>
                        <div>
                            <label className="mb-1 block text-xs font-medium text-gray-700">
                                Unit of Measure *
                            </label>
                            <input
                                type="text"
                                name="unit_of_measure"
                                value={formData.unit_of_measure}
                                onChange={handleChange}
                                className="w-full rounded border border-gray-300 px-3 py-1.5 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                placeholder="e.g., ml, test, box"
                                required
                            />
                            {errors.unit_of_measure && (
                                <p className="mt-1 text-xs text-red-500">
                                    {errors.unit_of_measure}
                                </p>
                            )}
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="mb-1 block text-xs font-medium text-gray-700">
                                Unit Cost (ZMW)
                            </label>
                            <input
                                type="number"
                                name="unit_cost"
                                value={formData.unit_cost}
                                onChange={handleChange}
                                step="0.01"
                                className="w-full rounded border border-gray-300 px-3 py-1.5 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                placeholder="0.00"
                            />
                        </div>
                        <div>
                            <label className="mb-1 block text-xs font-medium text-gray-700">
                                Selling Price (ZMW)
                            </label>
                            <input
                                type="number"
                                name="selling_price"
                                value={formData.selling_price}
                                onChange={handleChange}
                                step="0.01"
                                className="w-full rounded border border-gray-300 px-3 py-1.5 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                placeholder="0.00"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                        <div>
                            <label className="mb-1 block text-xs font-medium text-gray-700">
                                Reorder Level
                            </label>
                            <input
                                type="number"
                                name="reorder_level"
                                value={formData.reorder_level}
                                onChange={handleChange}
                                className="w-full rounded border border-gray-300 px-3 py-1.5 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                placeholder="10"
                            />
                        </div>
                        <div>
                            <label className="mb-1 block text-xs font-medium text-gray-700">
                                Min Stock
                            </label>
                            <input
                                type="number"
                                name="minimum_stock"
                                value={formData.minimum_stock}
                                onChange={handleChange}
                                className="w-full rounded border border-gray-300 px-3 py-1.5 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                placeholder="5"
                            />
                        </div>
                        <div>
                            <label className="mb-1 block text-xs font-medium text-gray-700">
                                Max Stock
                            </label>
                            <input
                                type="number"
                                name="maximum_stock"
                                value={formData.maximum_stock}
                                onChange={handleChange}
                                className="w-full rounded border border-gray-300 px-3 py-1.5 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                placeholder="100"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="mb-1 block text-xs font-medium text-gray-700">
                                Supplier
                            </label>
                            <select
                                name="supplier_id"
                                value={formData.supplier_id}
                                onChange={handleChange}
                                className="w-full rounded border border-gray-300 px-3 py-1.5 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                            >
                                <option value="">Select Supplier</option>
                                {suppliers.map((supplier) => (
                                    <option
                                        key={supplier.id}
                                        value={supplier.id}
                                    >
                                        {supplier.name}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="mb-1 block text-xs font-medium text-gray-700">
                                Batch Number
                            </label>
                            <input
                                type="text"
                                name="batch_number"
                                value={formData.batch_number}
                                onChange={handleChange}
                                className="w-full rounded border border-gray-300 px-3 py-1.5 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                placeholder="Enter batch number"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="mb-1 block text-xs font-medium text-gray-700">
                            Expiry Date
                        </label>
                        <input
                            type="date"
                            name="expiry_date"
                            value={formData.expiry_date}
                            onChange={handleChange}
                            className="w-full rounded border border-gray-300 px-3 py-1.5 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                        />
                    </div>

                    <div>
                        <label className="mb-1 block text-xs font-medium text-gray-700">
                            Notes
                        </label>
                        <textarea
                            name="notes"
                            value={formData.notes}
                            onChange={handleChange}
                            rows={2}
                            className="w-full resize-none rounded border border-gray-300 px-3 py-1.5 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                            placeholder="Additional notes..."
                        />
                    </div>

                    <div className="flex gap-2 pt-2">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={onClose}
                            className="flex-1 text-sm"
                        >
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            disabled={isSubmitting}
                            className="flex-1 bg-blue-600 text-sm hover:bg-blue-700"
                        >
                            {isSubmitting ? 'Saving...' : 'Add Product'}
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
};

const StockAdjustmentModal = ({
    isOpen,
    onClose,
    onSuccess,
    product,
}: {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    product: Product | null;
}) => {
    const [formData, setFormData] = useState({
        quantity: '',
        type: 'receiving',
        remarks: '',
    });
    const [errors, setErrors] = useState<any>({});
    const [isSubmitting, setIsSubmitting] = useState(false);

    if (!isOpen || !product) return null;

    const handleChange = (
        e: React.ChangeEvent<
            HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
        >,
    ) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
        if (errors[name]) {
            setErrors((prev: any) => ({ ...prev, [name]: '' }));
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);

        const quantity = parseInt(formData.quantity);
        if (formData.type === 'issuing' && quantity > product.current_stock) {
            setErrors({ quantity: 'Insufficient stock' });
            setIsSubmitting(false);
            return;
        }

        router.post(
            `/laboratory/logistics/products/${product.id}/stock-adjust`,
            formData,
            {
                onSuccess: () => {
                    Notiflix.Notify.success('Stock adjusted successfully');
                    onSuccess();
                    onClose();
                },
                onError: (err) => {
                    setErrors(err);
                    Notiflix.Notify.failure('Failed to adjust stock');
                },
                onFinish: () => setIsSubmitting(false),
            },
        );
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3">
            <div
                className="fixed inset-0 bg-black/50 backdrop-blur-sm"
                onClick={onClose}
            />
            <div className="relative w-full max-w-md rounded-lg bg-white shadow-2xl">
                <div className="flex items-center justify-between border-b px-5 py-3">
                    <div>
                        <h2 className="text-base font-semibold">
                            Adjust Stock
                        </h2>
                        <p className="text-xs text-gray-500">
                            {product.item_name}
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-600"
                    >
                        <X className="h-4 w-4" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4 p-5">
                    <div>
                        <label className="mb-1 block text-xs font-medium text-gray-700">
                            Current Stock
                        </label>
                        <p className="text-lg font-bold">
                            {product.current_stock} {product.unit_of_measure}
                        </p>
                    </div>

                    <div>
                        <label className="mb-1 block text-xs font-medium text-gray-700">
                            Transaction Type *
                        </label>
                        <div className="grid grid-cols-3 gap-2">
                            {['receiving', 'issuing', 'adjustment'].map(
                                (type) => (
                                    <label
                                        key={type}
                                        className={`flex cursor-pointer items-center justify-center rounded-lg border p-2 text-xs transition-all ${
                                            formData.type === type
                                                ? 'border-blue-500 bg-blue-50'
                                                : 'border-gray-200 hover:border-gray-300'
                                        }`}
                                    >
                                        <input
                                            type="radio"
                                            name="type"
                                            value={type}
                                            checked={formData.type === type}
                                            onChange={handleChange}
                                            className="hidden"
                                        />
                                        {type.charAt(0).toUpperCase() +
                                            type.slice(1)}
                                    </label>
                                ),
                            )}
                        </div>
                        {errors.type && (
                            <p className="mt-1 text-xs text-red-500">
                                {errors.type}
                            </p>
                        )}
                    </div>

                    <div>
                        <label className="mb-1 block text-xs font-medium text-gray-700">
                            Quantity *
                        </label>
                        <input
                            type="number"
                            name="quantity"
                            value={formData.quantity}
                            onChange={handleChange}
                            className={`w-full rounded border ${errors.quantity ? 'border-red-500' : 'border-gray-300'} px-3 py-1.5 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none`}
                            placeholder="Enter quantity"
                            min="1"
                            required
                        />
                        {errors.quantity && (
                            <p className="mt-1 text-xs text-red-500">
                                {errors.quantity}
                            </p>
                        )}
                        {formData.type === 'issuing' && (
                            <p className="mt-1 text-xs text-amber-600">
                                Max available: {product.current_stock}
                            </p>
                        )}
                    </div>

                    <div>
                        <label className="mb-1 block text-xs font-medium text-gray-700">
                            Remarks
                        </label>
                        <textarea
                            name="remarks"
                            value={formData.remarks}
                            onChange={handleChange}
                            rows={2}
                            className="w-full resize-none rounded border border-gray-300 px-3 py-1.5 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                            placeholder="Reason for adjustment..."
                        />
                    </div>

                    <div className="flex gap-2 pt-2">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={onClose}
                            className="flex-1 text-sm"
                        >
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            disabled={isSubmitting}
                            className="flex-1 bg-blue-600 text-sm hover:bg-blue-700"
                        >
                            {isSubmitting ? 'Processing...' : 'Adjust Stock'}
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
};

const ProductDetailsModal = ({
    isOpen,
    onClose,
    product,
    movements,
}: {
    isOpen: boolean;
    onClose: () => void;
    product: Product | null;
    movements: StockMovement[];
}) => {
    if (!isOpen || !product) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3">
            <div
                className="fixed inset-0 bg-black/50 backdrop-blur-sm"
                onClick={onClose}
            />
            <div className="relative max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-lg bg-white shadow-2xl">
                <div className="sticky top-0 flex items-center justify-between border-b bg-white px-5 py-3">
                    <div>
                        <h2 className="text-base font-semibold">
                            {product.item_name}
                        </h2>
                        <p className="text-xs text-gray-500">
                            Code: {product.item_code}
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-600"
                    >
                        <X className="h-4 w-4" />
                    </button>
                </div>

                <div className="space-y-4 p-5">
                    {/* Product Info */}
                    <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                            <p className="text-xs text-gray-500">Category</p>
                            <p className="font-medium">{product.category}</p>
                        </div>
                        <div>
                            <p className="text-xs text-gray-500">Unit</p>
                            <p className="font-medium">
                                {product.unit_of_measure}
                            </p>
                        </div>
                        <div>
                            <p className="text-xs text-gray-500">
                                Current Stock
                            </p>
                            <p className="text-lg font-medium">
                                {product.current_stock}
                            </p>
                        </div>
                        <div>
                            <p className="text-xs text-gray-500">Status</p>
                            <StatusBadge status={product.status} />
                        </div>
                        <div>
                            <p className="text-xs text-gray-500">Unit Cost</p>
                            <p className="font-medium">
                                ZMW {product.unit_cost?.toLocaleString()}
                            </p>
                        </div>
                        <div>
                            <p className="text-xs text-gray-500">
                                Selling Price
                            </p>
                            <p className="font-medium">
                                ZMW {product.selling_price?.toLocaleString()}
                            </p>
                        </div>
                        <div>
                            <p className="text-xs text-gray-500">Supplier</p>
                            <p className="font-medium">
                                {product.supplier || 'N/A'}
                            </p>
                        </div>
                        <div>
                            <p className="text-xs text-gray-500">Expiry Date</p>
                            <p className="font-medium">
                                {product.expiry_date || 'N/A'}
                            </p>
                        </div>
                    </div>

                    {/* Stock Movements */}
                    {movements.length > 0 && (
                        <div>
                            <h3 className="mb-2 text-sm font-semibold">
                                Stock Movements
                            </h3>
                            <div className="overflow-hidden rounded-lg border">
                                <table className="w-full text-xs">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th className="px-3 py-1.5 text-left font-medium text-gray-500">
                                                Date
                                            </th>
                                            <th className="px-3 py-1.5 text-left font-medium text-gray-500">
                                                Type
                                            </th>
                                            <th className="px-3 py-1.5 text-right font-medium text-gray-500">
                                                Qty
                                            </th>
                                            <th className="px-3 py-1.5 text-right font-medium text-gray-500">
                                                Balance
                                            </th>
                                            <th className="px-3 py-1.5 text-left font-medium text-gray-500">
                                                Remarks
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {movements
                                            .slice(0, 10)
                                            .map((movement) => (
                                                <tr
                                                    key={movement.id}
                                                    className="hover:bg-gray-50"
                                                >
                                                    <td className="px-3 py-1.5 text-gray-500">
                                                        {new Date(
                                                            movement.moved_at,
                                                        ).toLocaleDateString()}
                                                    </td>
                                                    <td className="px-3 py-1.5">
                                                        <span
                                                            className={`inline-flex items-center rounded px-1.5 py-0.5 text-xs ${
                                                                movement.type ===
                                                                'receiving'
                                                                    ? 'bg-green-100 text-green-700'
                                                                    : movement.type ===
                                                                        'issuing'
                                                                      ? 'bg-red-100 text-red-700'
                                                                      : movement.type ===
                                                                          'adjustment'
                                                                        ? 'bg-blue-100 text-blue-700'
                                                                        : 'bg-gray-100 text-gray-700'
                                                            }`}
                                                        >
                                                            {movement.type}
                                                        </span>
                                                    </td>
                                                    <td className="px-3 py-1.5 text-right font-medium">
                                                        {movement.type ===
                                                        'issuing'
                                                            ? '-'
                                                            : '+'}
                                                        {Math.abs(
                                                            movement.quantity,
                                                        )}
                                                    </td>
                                                    <td className="px-3 py-1.5 text-right">
                                                        {movement.balance_after}
                                                    </td>
                                                    <td className="max-w-[100px] truncate px-3 py-1.5 text-gray-500">
                                                        {movement.remarks ||
                                                            '-'}
                                                    </td>
                                                </tr>
                                            ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

// ─── Main Component ──────────────────────────────────────────────────────────

export default function Logistics() {
    const { props } = usePage();
    const [loading, setLoading] = useState(false);
    const [products, setProducts] = useState<Product[]>([]);
    const [suppliers, setSuppliers] = useState<Supplier[]>([]);
    const [movements, setMovements] = useState<StockMovement[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterCategory, setFilterCategory] = useState('all');
    const [filterStatus, setFilterStatus] = useState('all');
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);
    const [selectedProduct, setSelectedProduct] = useState<Product | null>(
        null,
    );
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isAdjustModalOpen, setIsAdjustModalOpen] = useState(false);
    const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);

    const itemsPerPageOptions = [10, 20, 50];

    const fetchData = async () => {
        setLoading(true);
        try {
            const [productsRes, suppliersRes] = await Promise.all([
                axios.get('/api/laboratory/logistics/products'),
                axios.get('/api/laboratory/logistics/suppliers'),
            ]);
            setProducts(productsRes.data || []);
            setSuppliers(suppliersRes.data || []);
        } catch (error) {
            console.error('Error fetching data:', error);
            Notiflix.Notify.failure('Failed to load data');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const fetchProductMovements = async (productId: number) => {
        try {
            const response = await axios.get(
                `/api/laboratory/logistics/products/${productId}/movements`,
            );
            setMovements(response.data || []);
        } catch (error) {
            console.error('Error fetching movements:', error);
            setMovements([]);
        }
    };

    const handleViewDetails = async (product: Product) => {
        setSelectedProduct(product);
        await fetchProductMovements(product.id);
        setIsDetailsModalOpen(true);
    };

    const handleAdjustStock = (product: Product) => {
        setSelectedProduct(product);
        setIsAdjustModalOpen(true);
    };

    // Filter and paginate
    const filteredProducts = products.filter((product) => {
        const matchSearch =
            product.item_name
                .toLowerCase()
                .includes(searchTerm.toLowerCase()) ||
            product.item_code.toLowerCase().includes(searchTerm.toLowerCase());
        const matchCategory =
            filterCategory === 'all' || product.category === filterCategory;
        const matchStatus =
            filterStatus === 'all' || product.status === filterStatus;
        return matchSearch && matchCategory && matchStatus;
    });

    const categories = ['all', ...new Set(products.map((p) => p.category))];
    const statuses = [
        'all',
        'in_stock',
        'low_stock',
        'out_of_stock',
        'expired',
    ];

    const totalItems = filteredProducts.length;
    const totalPages = Math.ceil(totalItems / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const paginatedProducts = filteredProducts.slice(
        startIndex,
        startIndex + itemsPerPage,
    );

    const getStatusCount = (status: string) => {
        return products.filter((p) => p.status === status).length;
    };

    const getCategoryCount = (category: string) => {
        return products.filter((p) => p.category === category).length;
    };

    if (loading) {
        return (
            <AppLayout
                breadcrumbs={[
                    { title: 'Laboratory', href: 'laboratory/dashboard' },
                    { title: 'Logistics', href: 'laboratory/logistics' },
                ]}
            >
                <div className="flex items-center justify-center py-12">
                    <div className="text-center">
                        <div className="mx-auto mb-3 h-10 w-10 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
                        <p className="text-sm text-gray-500">
                            Loading laboratory products...
                        </p>
                    </div>
                </div>
            </AppLayout>
        );
    }

    return (
        <AppLayout
            breadcrumbs={[
                { title: 'Laboratory', href: 'laboratory/dashboard' },
                { title: 'Logistics', href: 'laboratory/logistics' },
            ]}
        >
            <div className="px-4 py-2">
                {/* Header */}
                <div className="mb-4 flex items-center justify-between">
                    <div>
                        <h1 className="text-lg font-semibold text-gray-900">
                            Laboratory Logistics
                        </h1>
                        <p className="text-sm text-gray-500">
                            Manage reagents, test kits, and laboratory supplies
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button
                            onClick={() => setIsAddModalOpen(true)}
                            className="h-8 gap-1.5 bg-blue-600 text-sm hover:bg-blue-700"
                        >
                            <Plus className="h-3.5 w-3.5" /> Add Product
                        </Button>
                        <Button
                            onClick={fetchData}
                            variant="outline"
                            className="h-8 gap-1.5 text-sm"
                        >
                            <RefreshCw className="h-3.5 w-3.5" />
                        </Button>
                    </div>
                </div>

                {/* Stats Cards */}
                <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-5">
                    <div className="rounded-lg border border-gray-200 bg-white p-3">
                        <p className="text-xs text-gray-500">Total Products</p>
                        <p className="text-xl font-bold">{products.length}</p>
                    </div>
                    <div className="rounded-lg border border-green-200 bg-white p-3">
                        <p className="text-xs text-green-600">In Stock</p>
                        <p className="text-xl font-bold text-green-600">
                            {getStatusCount('in_stock')}
                        </p>
                    </div>
                    <div className="rounded-lg border border-yellow-200 bg-white p-3">
                        <p className="text-xs text-yellow-600">Low Stock</p>
                        <p className="text-xl font-bold text-yellow-600">
                            {getStatusCount('low_stock')}
                        </p>
                    </div>
                    <div className="rounded-lg border border-red-200 bg-white p-3">
                        <p className="text-xs text-red-600">Out of Stock</p>
                        <p className="text-xl font-bold text-red-600">
                            {getStatusCount('out_of_stock')}
                        </p>
                    </div>
                    <div className="rounded-lg border border-gray-200 bg-white p-3">
                        <p className="text-xs text-gray-500">Expired</p>
                        <p className="text-xl font-bold text-gray-500">
                            {getStatusCount('expired')}
                        </p>
                    </div>
                </div>

                {/* Filters */}
                <div className="mb-4 flex flex-wrap gap-3">
                    <div className="min-w-[180px] flex-1">
                        <div className="relative">
                            <Search className="absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Search products..."
                                className="w-full rounded border border-gray-200 py-1.5 pr-3 pl-8 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                value={searchTerm}
                                onChange={(e) => {
                                    setSearchTerm(e.target.value);
                                    setCurrentPage(1);
                                }}
                            />
                        </div>
                    </div>
                    <select
                        value={filterCategory}
                        onChange={(e) => {
                            setFilterCategory(e.target.value);
                            setCurrentPage(1);
                        }}
                        className="rounded border border-gray-200 px-3 py-1.5 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    >
                        {categories.map((cat) => (
                            <option key={cat} value={cat}>
                                {cat === 'all'
                                    ? 'All Categories'
                                    : `${cat} (${getCategoryCount(cat)})`}
                            </option>
                        ))}
                    </select>
                    <select
                        value={filterStatus}
                        onChange={(e) => {
                            setFilterStatus(e.target.value);
                            setCurrentPage(1);
                        }}
                        className="rounded border border-gray-200 px-3 py-1.5 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    >
                        {statuses.map((status) => (
                            <option key={status} value={status}>
                                {status === 'all'
                                    ? 'All Status'
                                    : status.replace('_', ' ').toUpperCase()}
                            </option>
                        ))}
                    </select>
                </div>

                {/* Table */}
                <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="border-b bg-gray-50">
                                <tr>
                                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">
                                        Item
                                    </th>
                                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">
                                        Code
                                    </th>
                                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">
                                        Category
                                    </th>
                                    <th className="px-3 py-2 text-right text-xs font-medium text-gray-500">
                                        Stock
                                    </th>
                                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">
                                        Status
                                    </th>
                                    <th className="px-3 py-2 text-right text-xs font-medium text-gray-500">
                                        Actions
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {paginatedProducts.map((product) => (
                                    <tr
                                        key={product.id}
                                        className="transition-colors hover:bg-gray-50/60"
                                    >
                                        <td className="px-3 py-2">
                                            <div className="font-medium text-gray-900">
                                                {product.item_name}
                                            </div>
                                            <div className="text-xs text-gray-400">
                                                {product.unit_of_measure}
                                            </div>
                                        </td>
                                        <td className="px-3 py-2 font-mono text-xs text-gray-500">
                                            {product.item_code}
                                        </td>
                                        <td className="px-3 py-2">
                                            <span className="inline-flex rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
                                                {product.category}
                                            </span>
                                        </td>
                                        <td className="px-3 py-2 text-right">
                                            <span
                                                className={`font-semibold ${
                                                    product.current_stock <=
                                                    product.reorder_level
                                                        ? 'text-red-600'
                                                        : 'text-gray-900'
                                                }`}
                                            >
                                                {product.current_stock}
                                            </span>
                                            <div className="text-xs text-gray-400">
                                                Reorder: {product.reorder_level}
                                            </div>
                                        </td>
                                        <td className="px-3 py-2">
                                            <StatusBadge
                                                status={product.status}
                                            />
                                        </td>
                                        <td className="px-3 py-2 text-right">
                                            <div className="flex items-center justify-end gap-1">
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() =>
                                                        handleViewDetails(
                                                            product,
                                                        )
                                                    }
                                                    className="h-7 w-7 p-0 text-gray-400 hover:text-blue-600"
                                                >
                                                    <Eye className="h-3.5 w-3.5" />
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() =>
                                                        handleAdjustStock(
                                                            product,
                                                        )
                                                    }
                                                    className="h-7 w-7 p-0 text-gray-400 hover:text-green-600"
                                                >
                                                    <Package className="h-3.5 w-3.5" />
                                                </Button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {paginatedProducts.length === 0 && (
                        <div className="py-10 text-center">
                            <Package className="mx-auto h-10 w-10 text-gray-300" />
                            <p className="mt-2 text-sm text-gray-500">
                                No products found
                            </p>
                        </div>
                    )}

                    {/* Pagination */}
                    {totalItems > 0 && (
                        <div className="flex flex-col items-center justify-between gap-3 border-t bg-gray-50/50 px-3 py-2 sm:flex-row">
                            <div className="text-xs text-gray-500">
                                Showing {startIndex + 1}–
                                {Math.min(
                                    startIndex + itemsPerPage,
                                    totalItems,
                                )}{' '}
                                of {totalItems}
                            </div>
                            <div className="flex items-center gap-3">
                                <div className="flex items-center gap-1.5">
                                    <span className="text-xs text-gray-500">
                                        Show:
                                    </span>
                                    <select
                                        value={itemsPerPage}
                                        onChange={(e) => {
                                            setItemsPerPage(
                                                Number(e.target.value),
                                            );
                                            setCurrentPage(1);
                                        }}
                                        className="rounded border border-gray-200 px-1.5 py-0.5 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                    >
                                        {itemsPerPageOptions.map((option) => (
                                            <option key={option} value={option}>
                                                {option}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div className="flex items-center gap-0.5">
                                    <button
                                        onClick={() => setCurrentPage(1)}
                                        disabled={currentPage === 1}
                                        className="rounded border p-1 disabled:opacity-50"
                                    >
                                        <ChevronsLeft className="h-3.5 w-3.5" />
                                    </button>
                                    <button
                                        onClick={() =>
                                            setCurrentPage((p) =>
                                                Math.max(1, p - 1),
                                            )
                                        }
                                        disabled={currentPage === 1}
                                        className="rounded border p-1 disabled:opacity-50"
                                    >
                                        <ChevronLeft className="h-3.5 w-3.5" />
                                    </button>
                                    <span className="px-2 text-sm">
                                        {currentPage} / {totalPages}
                                    </span>
                                    <button
                                        onClick={() =>
                                            setCurrentPage((p) =>
                                                Math.min(totalPages, p + 1),
                                            )
                                        }
                                        disabled={currentPage === totalPages}
                                        className="rounded border p-1 disabled:opacity-50"
                                    >
                                        <ChevronRight className="h-3.5 w-3.5" />
                                    </button>
                                    <button
                                        onClick={() =>
                                            setCurrentPage(totalPages)
                                        }
                                        disabled={currentPage === totalPages}
                                        className="rounded border p-1 disabled:opacity-50"
                                    >
                                        <ChevronsRight className="h-3.5 w-3.5" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Modals */}
            <AddProductModal
                isOpen={isAddModalOpen}
                onClose={() => setIsAddModalOpen(false)}
                onSuccess={fetchData}
                suppliers={suppliers}
            />

            <StockAdjustmentModal
                isOpen={isAdjustModalOpen}
                onClose={() => {
                    setIsAdjustModalOpen(false);
                    setSelectedProduct(null);
                }}
                onSuccess={fetchData}
                product={selectedProduct}
            />

            <ProductDetailsModal
                isOpen={isDetailsModalOpen}
                onClose={() => {
                    setIsDetailsModalOpen(false);
                    setSelectedProduct(null);
                    setMovements([]);
                }}
                product={selectedProduct}
                movements={movements}
            />
        </AppLayout>
    );
}
