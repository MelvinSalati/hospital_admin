// resources/js/pages/bulkstore/Batches.tsx

import { Dialog, Transition } from '@headlessui/react';
import { Head, usePage } from '@inertiajs/react';
import axios from 'axios';
import { format } from 'date-fns';
import {
    Package,
    Plus,
    Eye,
    Edit,
    Trash2,
    Check,
    X,
    AlertCircle,
    Calendar,
    Hash,
    Tag,
    Box,
    Building2,
    User,
    Clock,
    Printer,
    Download,
    RefreshCw,
    Search,
    Filter,
    MoreHorizontal,
    CheckCircle,
    XCircle,
    AlertTriangle,
    Loader2,
} from 'lucide-react';
import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import type { Column, Action } from '@/components/ReusableTable';
import { ReusableTable } from '@/components/ReusableTable';
import AppLayout from '@/layouts/app-layout';
import type { BreadcrumbItem } from '@/types';

// ============================================
// TYPES
// ============================================

interface Batch {
    id: number;
    batch_number: string;
    product_id: number;
    product_name: string;
    product_code: string;
    supplier_id: number;
    supplier_name: string;
    quantity: number;
    remaining_quantity: number;
    unit_cost: number;
    selling_price: number;
    purchase_date: string;
    expiry_date: string;
    status: 'active' | 'expired' | 'near_expiry' | 'depleted';
    received_by: number;
    received_by_name: string;
    received_at: string;
    notes: string | null;
    created_at: string;
    updated_at: string;
}

interface BatchModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    batch?: Batch | null;
    mode?: 'create' | 'edit' | 'view';
}

// ============================================
// BREADCRUMBS
// ============================================

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Bulk Store',
        href: '/bulkstore',
    },
    {
        title: 'Batches',
        href: '/bulkstore/batches',
    },
];

// ============================================
// BATCH MODAL
// ============================================

function BatchModal({
    isOpen,
    onClose,
    onSuccess,
    batch,
    mode = 'create',
}: BatchModalProps) {
    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [products, setProducts] = useState<
        { id: number; name: string; code: string }[]
    >([]);
    const [suppliers, setSuppliers] = useState<{ id: number; name: string }[]>(
        [],
    );
    const [formData, setFormData] = useState({
        product_id: '',
        batch_number: '',
        supplier_id: '',
        quantity: 0,
        unit_cost: 0,
        selling_price: 0,
        purchase_date: '',
        expiry_date: '',
        notes: '',
    });
    const [errors, setErrors] = useState<Record<string, string>>({});

    const isViewMode = mode === 'view';
    const isEditMode = mode === 'edit';

    // Load products and suppliers
    useEffect(() => {
        if (isOpen) {
            loadProducts();
            loadSuppliers();
            if (batch && (isEditMode || isViewMode)) {
                setFormData({
                    product_id: batch.product_id.toString(),
                    batch_number: batch.batch_number,
                    supplier_id: batch.supplier_id.toString(),
                    quantity: batch.quantity,
                    unit_cost: batch.unit_cost,
                    selling_price: batch.selling_price,
                    purchase_date: batch.purchase_date,
                    expiry_date: batch.expiry_date,
                    notes: batch.notes || '',
                });
            } else {
                resetForm();
            }
        }
    }, [isOpen, batch]);

    const loadProducts = async () => {
        try {
            const response = await axios.get('/api/products/list');
            if (response.data.success) {
                setProducts(response.data.data);
            }
        } catch (error) {
            console.error('Failed to load products:', error);
        }
    };

    const loadSuppliers = async () => {
        try {
            const response = await axios.get('/api/suppliers/list');
            if (response.data.success) {
                setSuppliers(response.data.data);
            }
        } catch (error) {
            console.error('Failed to load suppliers:', error);
        }
    };

    const resetForm = () => {
        setFormData({
            product_id: '',
            batch_number: '',
            supplier_id: '',
            quantity: 0,
            unit_cost: 0,
            selling_price: 0,
            purchase_date: '',
            expiry_date: '',
            notes: '',
        });
        setErrors({});
    };

    const handleChange = (
        e: React.ChangeEvent<
            HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
        >,
    ) => {
        const { name, value, type } = e.target;
        setFormData((prev) => ({
            ...prev,
            [name]: type === 'number' ? parseFloat(value) || 0 : value,
        }));
        if (errors[name]) {
            setErrors((prev) => ({ ...prev, [name]: '' }));
        }
    };

    const validateForm = (): boolean => {
        const newErrors: Record<string, string> = {};

        if (!formData.product_id) {
            newErrors.product_id = 'Product is required';
        }
        if (!formData.batch_number.trim()) {
            newErrors.batch_number = 'Batch number is required';
        }
        if (!formData.supplier_id) {
            newErrors.supplier_id = 'Supplier is required';
        }
        if (formData.quantity <= 0) {
            newErrors.quantity = 'Quantity must be greater than 0';
        }
        if (formData.unit_cost < 0) {
            newErrors.unit_cost = 'Unit cost cannot be negative';
        }
        if (!formData.purchase_date) {
            newErrors.purchase_date = 'Purchase date is required';
        }
        if (!formData.expiry_date) {
            newErrors.expiry_date = 'Expiry date is required';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!validateForm()) {
            return;
        }

        setSubmitting(true);

        try {
            const url = isEditMode
                ? `/api/batches/${batch?.id}`
                : '/api/batches';
            const method = isEditMode ? 'PUT' : 'POST';

            const response = await axios({
                method,
                url,
                data: formData,
            });

            if (response.data.success) {
                toast.success(
                    isEditMode
                        ? 'Batch updated successfully!'
                        : 'Batch created successfully!',
                );
                onSuccess();
                onClose();
            } else {
                if (response.data.errors) {
                    setErrors(response.data.errors);
                }
                toast.error(response.data.message || 'Failed to save batch');
            }
        } catch (error: any) {
            const message =
                error.response?.data?.message || 'Failed to save batch';
            toast.error(message);
            if (error.response?.data?.errors) {
                setErrors(error.response.data.errors);
            }
        } finally {
            setSubmitting(false);
        }
    };

    const formatDate = (date: string) => {
        try {
            return format(new Date(date), 'dd MMM yyyy');
        } catch {
            return date;
        }
    };

    return (
        <Transition show={isOpen} as={React.Fragment}>
            <Dialog as="div" className="relative z-50" onClose={onClose}>
                <Transition.Child
                    as={React.Fragment}
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
                            as={React.Fragment}
                            enter="ease-out duration-300"
                            enterFrom="opacity-0 scale-95"
                            enterTo="opacity-100 scale-100"
                            leave="ease-in duration-200"
                            leaveFrom="opacity-100 scale-100"
                            leaveTo="opacity-0 scale-95"
                        >
                            <Dialog.Panel className="relative w-full max-w-2xl transform overflow-hidden rounded-xl bg-white shadow-2xl transition-all">
                                {/* Header */}
                                <div className="rounded-t-xl border-b border-gray-200 bg-white px-6 py-4">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="rounded-lg bg-blue-50 p-2">
                                                <Package className="h-5 w-5 text-blue-600" />
                                            </div>
                                            <div>
                                                <Dialog.Title className="text-lg font-semibold text-gray-900">
                                                    {isViewMode
                                                        ? 'Batch Details'
                                                        : isEditMode
                                                          ? 'Edit Batch'
                                                          : 'Create New Batch'}
                                                </Dialog.Title>
                                                <p className="text-sm text-gray-500">
                                                    {isViewMode
                                                        ? `Batch #${batch?.batch_number}`
                                                        : isEditMode
                                                          ? 'Update batch information'
                                                          : 'Add a new batch to inventory'}
                                                </p>
                                            </div>
                                        </div>
                                        <button
                                            onClick={onClose}
                                            className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
                                            disabled={submitting}
                                        >
                                            <X className="h-5 w-5" />
                                        </button>
                                    </div>
                                </div>

                                {/* Body */}
                                <div className="max-h-[calc(90vh-180px)] overflow-y-auto p-6">
                                    <form onSubmit={handleSubmit}>
                                        <div className="space-y-4">
                                            {/* Product & Batch Info */}
                                            <div className="grid grid-cols-2 gap-4">
                                                <div>
                                                    <label className="mb-1 block text-xs font-medium text-gray-700">
                                                        Product *
                                                    </label>
                                                    <select
                                                        name="product_id"
                                                        value={
                                                            formData.product_id
                                                        }
                                                        onChange={handleChange}
                                                        disabled={
                                                            isViewMode ||
                                                            isEditMode
                                                        }
                                                        className={`w-full rounded-lg border px-3 py-2 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none ${
                                                            errors.product_id
                                                                ? 'border-red-500'
                                                                : 'border-gray-300'
                                                        } ${isViewMode || isEditMode ? 'cursor-not-allowed bg-gray-100' : ''}`}
                                                    >
                                                        <option value="">
                                                            Select Product
                                                        </option>
                                                        {products.map((p) => (
                                                            <option
                                                                key={p.id}
                                                                value={p.id}
                                                            >
                                                                {p.name} (
                                                                {p.code})
                                                            </option>
                                                        ))}
                                                    </select>
                                                    {errors.product_id && (
                                                        <p className="mt-1 text-xs text-red-500">
                                                            {errors.product_id}
                                                        </p>
                                                    )}
                                                </div>
                                                <div>
                                                    <label className="mb-1 block text-xs font-medium text-gray-700">
                                                        Batch Number *
                                                    </label>
                                                    <input
                                                        type="text"
                                                        name="batch_number"
                                                        value={
                                                            formData.batch_number
                                                        }
                                                        onChange={handleChange}
                                                        disabled={isViewMode}
                                                        className={`w-full rounded-lg border px-3 py-2 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none ${
                                                            errors.batch_number
                                                                ? 'border-red-500'
                                                                : 'border-gray-300'
                                                        } ${isViewMode ? 'cursor-not-allowed bg-gray-100' : ''}`}
                                                        placeholder="Enter batch number"
                                                    />
                                                    {errors.batch_number && (
                                                        <p className="mt-1 text-xs text-red-500">
                                                            {
                                                                errors.batch_number
                                                            }
                                                        </p>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Supplier */}
                                            <div>
                                                <label className="mb-1 block text-xs font-medium text-gray-700">
                                                    Supplier *
                                                </label>
                                                <select
                                                    name="supplier_id"
                                                    value={formData.supplier_id}
                                                    onChange={handleChange}
                                                    disabled={isViewMode}
                                                    className={`w-full rounded-lg border px-3 py-2 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none ${
                                                        errors.supplier_id
                                                            ? 'border-red-500'
                                                            : 'border-gray-300'
                                                    } ${isViewMode ? 'cursor-not-allowed bg-gray-100' : ''}`}
                                                >
                                                    <option value="">
                                                        Select Supplier
                                                    </option>
                                                    {suppliers.map((s) => (
                                                        <option
                                                            key={s.id}
                                                            value={s.id}
                                                        >
                                                            {s.name}
                                                        </option>
                                                    ))}
                                                </select>
                                                {errors.supplier_id && (
                                                    <p className="mt-1 text-xs text-red-500">
                                                        {errors.supplier_id}
                                                    </p>
                                                )}
                                            </div>

                                            {/* Quantity & Pricing */}
                                            <div className="grid grid-cols-3 gap-4">
                                                <div>
                                                    <label className="mb-1 block text-xs font-medium text-gray-700">
                                                        Quantity *
                                                    </label>
                                                    <input
                                                        type="number"
                                                        name="quantity"
                                                        value={
                                                            formData.quantity
                                                        }
                                                        onChange={handleChange}
                                                        disabled={isViewMode}
                                                        className={`w-full rounded-lg border px-3 py-2 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none ${
                                                            errors.quantity
                                                                ? 'border-red-500'
                                                                : 'border-gray-300'
                                                        } ${isViewMode ? 'cursor-not-allowed bg-gray-100' : ''}`}
                                                        min="1"
                                                    />
                                                    {errors.quantity && (
                                                        <p className="mt-1 text-xs text-red-500">
                                                            {errors.quantity}
                                                        </p>
                                                    )}
                                                </div>
                                                <div>
                                                    <label className="mb-1 block text-xs font-medium text-gray-700">
                                                        Unit Cost
                                                    </label>
                                                    <input
                                                        type="number"
                                                        name="unit_cost"
                                                        value={
                                                            formData.unit_cost
                                                        }
                                                        onChange={handleChange}
                                                        disabled={isViewMode}
                                                        className={`w-full rounded-lg border px-3 py-2 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none ${
                                                            errors.unit_cost
                                                                ? 'border-red-500'
                                                                : 'border-gray-300'
                                                        } ${isViewMode ? 'cursor-not-allowed bg-gray-100' : ''}`}
                                                        min="0"
                                                        step="0.01"
                                                    />
                                                    {errors.unit_cost && (
                                                        <p className="mt-1 text-xs text-red-500">
                                                            {errors.unit_cost}
                                                        </p>
                                                    )}
                                                </div>
                                                <div>
                                                    <label className="mb-1 block text-xs font-medium text-gray-700">
                                                        Selling Price
                                                    </label>
                                                    <input
                                                        type="number"
                                                        name="selling_price"
                                                        value={
                                                            formData.selling_price
                                                        }
                                                        onChange={handleChange}
                                                        disabled={isViewMode}
                                                        className={`w-full rounded-lg border px-3 py-2 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none ${
                                                            errors.selling_price
                                                                ? 'border-red-500'
                                                                : 'border-gray-300'
                                                        } ${isViewMode ? 'cursor-not-allowed bg-gray-100' : ''}`}
                                                        min="0"
                                                        step="0.01"
                                                    />
                                                </div>
                                            </div>

                                            {/* Dates */}
                                            <div className="grid grid-cols-2 gap-4">
                                                <div>
                                                    <label className="mb-1 block text-xs font-medium text-gray-700">
                                                        Purchase Date *
                                                    </label>
                                                    <input
                                                        type="date"
                                                        name="purchase_date"
                                                        value={
                                                            formData.purchase_date
                                                        }
                                                        onChange={handleChange}
                                                        disabled={isViewMode}
                                                        className={`w-full rounded-lg border px-3 py-2 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none ${
                                                            errors.purchase_date
                                                                ? 'border-red-500'
                                                                : 'border-gray-300'
                                                        } ${isViewMode ? 'cursor-not-allowed bg-gray-100' : ''}`}
                                                    />
                                                    {errors.purchase_date && (
                                                        <p className="mt-1 text-xs text-red-500">
                                                            {
                                                                errors.purchase_date
                                                            }
                                                        </p>
                                                    )}
                                                </div>
                                                <div>
                                                    <label className="mb-1 block text-xs font-medium text-gray-700">
                                                        Expiry Date *
                                                    </label>
                                                    <input
                                                        type="date"
                                                        name="expiry_date"
                                                        value={
                                                            formData.expiry_date
                                                        }
                                                        onChange={handleChange}
                                                        disabled={isViewMode}
                                                        className={`w-full rounded-lg border px-3 py-2 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none ${
                                                            errors.expiry_date
                                                                ? 'border-red-500'
                                                                : 'border-gray-300'
                                                        } ${isViewMode ? 'cursor-not-allowed bg-gray-100' : ''}`}
                                                    />
                                                    {errors.expiry_date && (
                                                        <p className="mt-1 text-xs text-red-500">
                                                            {errors.expiry_date}
                                                        </p>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Notes */}
                                            <div>
                                                <label className="mb-1 block text-xs font-medium text-gray-700">
                                                    Notes
                                                </label>
                                                <textarea
                                                    name="notes"
                                                    value={formData.notes}
                                                    onChange={handleChange}
                                                    disabled={isViewMode}
                                                    rows={3}
                                                    className={`w-full resize-none rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none ${
                                                        isViewMode
                                                            ? 'cursor-not-allowed bg-gray-100'
                                                            : ''
                                                    }`}
                                                    placeholder="Additional notes..."
                                                />
                                            </div>

                                            {/* Error Summary */}
                                            {Object.keys(errors).length > 0 && (
                                                <div className="rounded-lg border border-red-200 bg-red-50 p-3">
                                                    <p className="text-xs font-medium text-red-600">
                                                        Please fix the following
                                                        errors:
                                                    </p>
                                                    <ul className="mt-1 list-inside list-disc text-xs text-red-500">
                                                        {Object.values(
                                                            errors,
                                                        ).map((error, idx) => (
                                                            <li key={idx}>
                                                                {error}
                                                            </li>
                                                        ))}
                                                    </ul>
                                                </div>
                                            )}
                                        </div>
                                    </form>
                                </div>

                                {/* Footer */}
                                <div className="rounded-b-xl border-t border-gray-200 bg-gray-50 px-6 py-4">
                                    <div className="flex justify-end gap-3">
                                        {isViewMode ? (
                                            <button
                                                onClick={onClose}
                                                className="rounded-lg px-6 py-2 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-100"
                                            >
                                                Close
                                            </button>
                                        ) : (
                                            <>
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
                                                    disabled={submitting}
                                                    className={`flex items-center gap-2 rounded-lg px-6 py-2 text-sm font-medium text-white transition-colors ${
                                                        submitting
                                                            ? 'cursor-not-allowed bg-gray-400'
                                                            : 'bg-blue-600 hover:bg-blue-700'
                                                    }`}
                                                >
                                                    {submitting ? (
                                                        <>
                                                            <Loader2 className="h-4 w-4 animate-spin" />
                                                            Saving...
                                                        </>
                                                    ) : (
                                                        <>
                                                            <Check className="h-4 w-4" />
                                                            {isEditMode
                                                                ? 'Update Batch'
                                                                : 'Create Batch'}
                                                        </>
                                                    )}
                                                </button>
                                            </>
                                        )}
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

// ============================================
// MAIN COMPONENT
// ============================================

export default function Batches() {
    const [batches, setBatches] = useState<Batch[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedBatch, setSelectedBatch] = useState<Batch | null>(null);
    const [showModal, setShowModal] = useState(false);
    const [modalMode, setModalMode] = useState<'create' | 'edit' | 'view'>(
        'create',
    );

    // Fetch batches
    useEffect(() => {
        fetchBatches();
    }, []);

    const fetchBatches = async () => {
        setLoading(true);
        try {
            const response = await axios.get('/api/batches');
            if (response.data.success) {
                setBatches(response.data.data);
            }
        } catch (error) {
            console.error('Failed to fetch batches:', error);
            toast.error('Failed to load batches');
        } finally {
            setLoading(false);
        }
    };

    // Handlers
    const handleCreate = () => {
        setSelectedBatch(null);
        setModalMode('create');
        setShowModal(true);
    };

    const handleView = (batch: Batch) => {
        setSelectedBatch(batch);
        setModalMode('view');
        setShowModal(true);
    };

    const handleEdit = (batch: Batch) => {
        setSelectedBatch(batch);
        setModalMode('edit');
        setShowModal(true);
    };

    const handleDelete = async (batch: Batch) => {
        if (
            !window.confirm(
                `Are you sure you want to delete batch ${batch.batch_number}?`,
            )
        ) {
            return;
        }

        try {
            const response = await axios.delete(`/api/batches/${batch.id}`);
            if (response.data.success) {
                toast.success('Batch deleted successfully');
                fetchBatches();
            } else {
                toast.error(response.data.message || 'Failed to delete batch');
            }
        } catch (error: any) {
            const message =
                error.response?.data?.message || 'Failed to delete batch';
            toast.error(message);
        }
    };

    const handleSuccess = () => {
        fetchBatches();
    };

    // Format helpers
    const formatDate = (date: string) => {
        try {
            return format(new Date(date), 'dd MMM yyyy');
        } catch {
            return date;
        }
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-ZM', {
            style: 'currency',
            currency: 'ZMW',
            minimumFractionDigits: 2,
        }).format(amount || 0);
    };

    const getStatusBadge = (status: string) => {
        const config = {
            active: { label: 'Active', color: 'bg-green-100 text-green-700' },
            near_expiry: {
                label: 'Near Expiry',
                color: 'bg-yellow-100 text-yellow-700',
            },
            expired: { label: 'Expired', color: 'bg-red-100 text-red-700' },
            depleted: { label: 'Depleted', color: 'bg-gray-100 text-gray-700' },
        };
        const { label, color } =
            config[status as keyof typeof config] || config.active;
        return (
            <span
                className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${color}`}
            >
                {label}
            </span>
        );
    };

    // Columns
    const columns: Column<Batch>[] = [
        {
            id: 'batch_number',
            label: 'Batch #',
            minWidth: 120,
            format: (value) => (
                <span className="font-mono text-sm font-medium text-blue-600">
                    {value}
                </span>
            ),
        },
        {
            id: 'product_name',
            label: 'Product',
            minWidth: 150,
            format: (value, row) => (
                <div>
                    <p className="text-sm font-medium text-gray-900">{value}</p>
                    <p className="text-xs text-gray-500">{row.product_code}</p>
                </div>
            ),
        },
        {
            id: 'supplier_name',
            label: 'Supplier',
            minWidth: 120,
        },
        {
            id: 'quantity',
            label: 'Qty',
            minWidth: 80,
            align: 'center',
            format: (value, row) => (
                <div>
                    <span className="text-sm font-medium text-gray-900">
                        {value}
                    </span>
                    <span className="block text-xs text-gray-400">
                        Remaining: {row.remaining_quantity}
                    </span>
                </div>
            ),
        },
        {
            id: 'unit_cost',
            label: 'Cost',
            minWidth: 80,
            align: 'right',
            format: (value) => formatCurrency(value),
        },
        {
            id: 'expiry_date',
            label: 'Expiry',
            minWidth: 100,
            align: 'center',
            format: (value) => {
                const isExpired = new Date(value) < new Date();
                return (
                    <span
                        className={`text-sm ${isExpired ? 'font-medium text-red-600' : 'text-gray-500'}`}
                    >
                        {formatDate(value)}
                        {isExpired && (
                            <span className="block text-xs text-red-500">
                                Expired
                            </span>
                        )}
                    </span>
                );
            },
        },
        {
            id: 'status',
            label: 'Status',
            minWidth: 100,
            align: 'center',
            format: (value) => getStatusBadge(value),
        },
        {
            id: 'received_at',
            label: 'Received',
            minWidth: 100,
            align: 'center',
            format: (value) => formatDate(value),
        },
    ];

    // Actions
    const actions: Action<Batch>[] = [
        {
            label: 'View',
            icon: <Eye className="h-4 w-4" />,
            color: 'info',
            variant: 'text',
            onClick: handleView,
        },
        {
            label: 'Edit',
            icon: <Edit className="h-4 w-4" />,
            color: 'primary',
            variant: 'text',
            onClick: handleEdit,
            show: (row) =>
                row.status !== 'expired' && row.status !== 'depleted',
        },
        {
            label: 'Delete',
            icon: <Trash2 className="h-4 w-4" />,
            color: 'error',
            variant: 'text',
            onClick: handleDelete,
            show: (row) => row.remaining_quantity === row.quantity,
        },
    ];

    // Status options for filtering
    const statusOptions = [
        { value: 'active', label: 'Active' },
        { value: 'near_expiry', label: 'Near Expiry' },
        { value: 'expired', label: 'Expired' },
        { value: 'depleted', label: 'Depleted' },
    ];

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Batches" />

            <div className="min-h-screen bg-slate-100">
                <div className="p-6">
                    {/* Header */}
                    <div className="mb-6 flex items-center justify-between">
                        <div>
                            <h1 className="text-2xl font-semibold text-gray-900">
                                Batches Management
                            </h1>
                            <p className="text-sm text-gray-500">
                                Manage product batches, expiry dates, and
                                inventory tracking
                            </p>
                        </div>
                        <div className="flex items-center gap-3">
                            <button
                                onClick={fetchBatches}
                                className="flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-50"
                            >
                                <RefreshCw
                                    className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`}
                                />
                                Refresh
                            </button>
                            <button
                                onClick={handleCreate}
                                className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700"
                            >
                                <Plus className="h-4 w-4" />
                                New Batch
                            </button>
                        </div>
                    </div>

                    {/* Stats Cards */}
                    <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                        <div className="rounded-lg border border-gray-200 bg-white p-4">
                            <p className="text-xs text-gray-500">
                                Total Batches
                            </p>
                            <p className="text-2xl font-bold text-gray-900">
                                {batches.length}
                            </p>
                        </div>
                        <div className="rounded-lg border border-gray-200 bg-white p-4">
                            <p className="text-xs text-gray-500">Active</p>
                            <p className="text-2xl font-bold text-green-600">
                                {
                                    batches.filter((b) => b.status === 'active')
                                        .length
                                }
                            </p>
                        </div>
                        <div className="rounded-lg border border-gray-200 bg-white p-4">
                            <p className="text-xs text-gray-500">Near Expiry</p>
                            <p className="text-2xl font-bold text-yellow-600">
                                {
                                    batches.filter(
                                        (b) => b.status === 'near_expiry',
                                    ).length
                                }
                            </p>
                        </div>
                        <div className="rounded-lg border border-gray-200 bg-white p-4">
                            <p className="text-xs text-gray-500">Expired</p>
                            <p className="text-2xl font-bold text-red-600">
                                {
                                    batches.filter(
                                        (b) => b.status === 'expired',
                                    ).length
                                }
                            </p>
                        </div>
                    </div>

                    {/* Table */}
                    <div className="w-full">
                        <div className="overflow-hidden rounded-lg bg-white shadow-sm">
                            <ReusableTable
                                columns={columns}
                                data={batches}
                                actions={actions}
                                title="Batches List"
                                statusFilterKey="status"
                                statusOptions={statusOptions}
                                onRowClick={(row) => handleView(row)}
                                rowsPerPageOptions={[5, 10, 25, 50]}
                                defaultRowsPerPage={10}
                                defaultOrderBy="created_at"
                                defaultOrder="desc"
                                loading={loading}
                                emptyMessage="No batches found. Create a new batch to get started."
                                filterPlaceholder="Search by batch number, product, or supplier..."
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* Batch Modal */}
            <BatchModal
                isOpen={showModal}
                onClose={() => {
                    setShowModal(false);
                    setSelectedBatch(null);
                }}
                onSuccess={handleSuccess}
                batch={selectedBatch}
                mode={modalMode}
            />
        </AppLayout>
    );
}
