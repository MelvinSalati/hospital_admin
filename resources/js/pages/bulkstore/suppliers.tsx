// resources/js/pages/bulkstore/Suppliers.tsx

import { Dialog, Transition } from '@headlessui/react';
import { Head, router, usePage } from '@inertiajs/react';
import axios from 'axios';
import { format } from 'date-fns';
import {
    Plus,
    Edit,
    Trash2,
    X,
    Check,
    RefreshCw,
    Package,
    Phone,
    Mail,
    MapPin,
    Building2,
    User,
    Star,
    ChevronLeft,
    ChevronRight,
    MessageSquare,
    CreditCard,
    FileText,
    AlertCircle,
    UserX,
    UserCheck,
    Eye,
} from 'lucide-react';
import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import PageHeader from '@/components/PageHeader';
import { ReusableTable } from '@/components/ReusableTable';
import type { Column, Action } from '@/components/ReusableTable';
import AppLayout from '@/layouts/app-layout';

// ============================================================================
// Types
// ============================================================================

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
    tax_number: string | null;
    payment_terms: string | null;
    delivery_terms: string | null;
    notes: string | null;
    is_active: boolean;
    is_blacklisted: boolean;
    blacklist_reason: string | null;
    blacklisted_at: string | null;
    rating: number | null;
    created_at: string;
    updated_at: string;
}

interface SupplierFormData {
    supplier_code: string;
    supplier_name: string;
    contact_person: string;
    phone: string;
    email: string;
    address: string;
    city: string;
    country: string;
    tax_number: string;
    payment_terms: string;
    delivery_terms: string;
    notes: string;
    is_active: boolean;
    rating: number;
}

// ============================================================================
// Supplier Modal
// ============================================================================

const SupplierModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    onSave: (data: SupplierFormData) => void;
    supplier?: Supplier | null;
    isLoading: boolean;
    mode: 'create' | 'edit' | 'view';
}> = ({ isOpen, onClose, onSave, supplier, isLoading, mode }) => {
    const [formData, setFormData] = useState<SupplierFormData>({
        supplier_code: '',
        supplier_name: '',
        contact_person: '',
        phone: '',
        email: '',
        address: '',
        city: '',
        country: 'Zambia',
        tax_number: '',
        payment_terms: 'Net 30',
        delivery_terms: 'FOB',
        notes: '',
        is_active: true,
        rating: 3,
    });

    useEffect(() => {
        if (supplier) {
            setFormData({
                supplier_code: supplier.supplier_code || '',
                supplier_name: supplier.supplier_name || '',
                contact_person: supplier.contact_person || '',
                phone: supplier.phone || '',
                email: supplier.email || '',
                address: supplier.address || '',
                city: supplier.city || '',
                country: supplier.country || 'Zambia',
                tax_number: supplier.tax_number || '',
                payment_terms: supplier.payment_terms || 'Net 30',
                delivery_terms: supplier.delivery_terms || 'FOB',
                notes: supplier.notes || '',
                is_active: supplier.is_active ?? true,
                rating: supplier.rating || 3,
            });
        } else {
            const defaultCode = `SUP-${Date.now().toString().slice(-6)}`;
            setFormData((prev) => ({ ...prev, supplier_code: defaultCode }));
        }
    }, [supplier]);

    const isViewMode = mode === 'view';
    const isEditMode = mode === 'edit';

    if (!isOpen) return null;

    const handleChange = (
        e: React.ChangeEvent<
            HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
        >,
    ) => {
        const { name, value, type } = e.target;
        setFormData((prev) => ({
            ...prev,
            [name]:
                type === 'checkbox'
                    ? (e.target as HTMLInputElement).checked
                    : value,
        }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave(formData);
    };

    const formatDate = (date: string) => {
        if (!date) return 'N/A';
        try {
            return format(new Date(date), 'dd MMM yyyy HH:mm');
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
                            <Dialog.Panel className="relative w-full max-w-3xl transform overflow-hidden rounded-xl bg-white shadow-2xl transition-all">
                                {/* Header */}
                                <div className="rounded-t-xl border-b border-gray-200 bg-white px-6 py-4">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="rounded-lg bg-blue-50 p-2">
                                                {isViewMode ? (
                                                    <Eye className="h-5 w-5 text-blue-600" />
                                                ) : isEditMode ? (
                                                    <Edit className="h-5 w-5 text-blue-600" />
                                                ) : (
                                                    <Plus className="h-5 w-5 text-blue-600" />
                                                )}
                                            </div>
                                            <div>
                                                <Dialog.Title className="text-lg font-semibold text-gray-900">
                                                    {isViewMode
                                                        ? 'Supplier Details'
                                                        : isEditMode
                                                          ? 'Edit Supplier'
                                                          : 'Add New Supplier'}
                                                </Dialog.Title>
                                                <p className="text-sm text-gray-500">
                                                    {isViewMode
                                                        ? supplier?.supplier_name
                                                        : isEditMode
                                                          ? 'Update supplier information'
                                                          : 'Create a new supplier record'}
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

                                <form onSubmit={handleSubmit}>
                                    <div className="max-h-[calc(90vh-180px)] overflow-y-auto p-6">
                                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                            {/* Left Column */}
                                            <div className="space-y-3">
                                                <div>
                                                    <label className="mb-1 block text-xs font-medium text-gray-700">
                                                        Supplier Name{' '}
                                                        <span className="text-red-500">
                                                            *
                                                        </span>
                                                    </label>
                                                    <input
                                                        type="text"
                                                        name="supplier_name"
                                                        value={
                                                            formData.supplier_name
                                                        }
                                                        onChange={handleChange}
                                                        disabled={isViewMode}
                                                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none disabled:bg-gray-100"
                                                        required
                                                    />
                                                </div>
                                                <div>
                                                    <label className="mb-1 block text-xs font-medium text-gray-700">
                                                        Supplier Code{' '}
                                                        <span className="text-red-500">
                                                            *
                                                        </span>
                                                    </label>
                                                    <input
                                                        type="text"
                                                        name="supplier_code"
                                                        value={
                                                            formData.supplier_code
                                                        }
                                                        onChange={handleChange}
                                                        disabled={isViewMode}
                                                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none disabled:bg-gray-100"
                                                        required
                                                    />
                                                </div>
                                                <div>
                                                    <label className="mb-1 block text-xs font-medium text-gray-700">
                                                        Contact Person
                                                    </label>
                                                    <input
                                                        type="text"
                                                        name="contact_person"
                                                        value={
                                                            formData.contact_person
                                                        }
                                                        onChange={handleChange}
                                                        disabled={isViewMode}
                                                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none disabled:bg-gray-100"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="mb-1 block text-xs font-medium text-gray-700">
                                                        Phone
                                                    </label>
                                                    <input
                                                        type="tel"
                                                        name="phone"
                                                        value={formData.phone}
                                                        onChange={handleChange}
                                                        disabled={isViewMode}
                                                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none disabled:bg-gray-100"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="mb-1 block text-xs font-medium text-gray-700">
                                                        Email
                                                    </label>
                                                    <input
                                                        type="email"
                                                        name="email"
                                                        value={formData.email}
                                                        onChange={handleChange}
                                                        disabled={isViewMode}
                                                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none disabled:bg-gray-100"
                                                    />
                                                </div>
                                            </div>

                                            {/* Right Column */}
                                            <div className="space-y-3">
                                                <div>
                                                    <label className="mb-1 block text-xs font-medium text-gray-700">
                                                        Address
                                                    </label>
                                                    <input
                                                        type="text"
                                                        name="address"
                                                        value={formData.address}
                                                        onChange={handleChange}
                                                        disabled={isViewMode}
                                                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none disabled:bg-gray-100"
                                                    />
                                                </div>
                                                <div className="grid grid-cols-2 gap-3">
                                                    <div>
                                                        <label className="mb-1 block text-xs font-medium text-gray-700">
                                                            City
                                                        </label>
                                                        <input
                                                            type="text"
                                                            name="city"
                                                            value={
                                                                formData.city
                                                            }
                                                            onChange={
                                                                handleChange
                                                            }
                                                            disabled={
                                                                isViewMode
                                                            }
                                                            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none disabled:bg-gray-100"
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="mb-1 block text-xs font-medium text-gray-700">
                                                            Country
                                                        </label>
                                                        <select
                                                            name="country"
                                                            value={
                                                                formData.country
                                                            }
                                                            onChange={
                                                                handleChange
                                                            }
                                                            disabled={
                                                                isViewMode
                                                            }
                                                            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none disabled:bg-gray-100"
                                                        >
                                                            <option value="Zambia">
                                                                Zambia
                                                            </option>
                                                            <option value="Malawi">
                                                                Malawi
                                                            </option>
                                                            <option value="Tanzania">
                                                                Tanzania
                                                            </option>
                                                            <option value="South Africa">
                                                                South Africa
                                                            </option>
                                                            <option value="Kenya">
                                                                Kenya
                                                            </option>
                                                            <option value="DRC">
                                                                DRC
                                                            </option>
                                                        </select>
                                                    </div>
                                                </div>
                                                <div>
                                                    <label className="mb-1 block text-xs font-medium text-gray-700">
                                                        Tax / VAT Number
                                                    </label>
                                                    <input
                                                        type="text"
                                                        name="tax_number"
                                                        value={
                                                            formData.tax_number
                                                        }
                                                        onChange={handleChange}
                                                        disabled={isViewMode}
                                                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none disabled:bg-gray-100"
                                                    />
                                                </div>
                                                <div className="grid grid-cols-2 gap-3">
                                                    <div>
                                                        <label className="mb-1 block text-xs font-medium text-gray-700">
                                                            Payment Terms
                                                        </label>
                                                        <select
                                                            name="payment_terms"
                                                            value={
                                                                formData.payment_terms
                                                            }
                                                            onChange={
                                                                handleChange
                                                            }
                                                            disabled={
                                                                isViewMode
                                                            }
                                                            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none disabled:bg-gray-100"
                                                        >
                                                            <option value="Cash">
                                                                Cash
                                                            </option>
                                                            <option value="Net 15">
                                                                Net 15
                                                            </option>
                                                            <option value="Net 30">
                                                                Net 30
                                                            </option>
                                                            <option value="Net 45">
                                                                Net 45
                                                            </option>
                                                            <option value="Net 60">
                                                                Net 60
                                                            </option>
                                                        </select>
                                                    </div>
                                                    <div>
                                                        <label className="mb-1 block text-xs font-medium text-gray-700">
                                                            Delivery Terms
                                                        </label>
                                                        <select
                                                            name="delivery_terms"
                                                            value={
                                                                formData.delivery_terms
                                                            }
                                                            onChange={
                                                                handleChange
                                                            }
                                                            disabled={
                                                                isViewMode
                                                            }
                                                            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none disabled:bg-gray-100"
                                                        >
                                                            <option value="FOB">
                                                                FOB
                                                            </option>
                                                            <option value="CIF">
                                                                CIF
                                                            </option>
                                                            <option value="EXW">
                                                                EXW
                                                            </option>
                                                            <option value="DDP">
                                                                DDP
                                                            </option>
                                                        </select>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Full Width */}
                                            <div className="space-y-3 md:col-span-2">
                                                <div>
                                                    <label className="mb-1 block text-xs font-medium text-gray-700">
                                                        Notes
                                                    </label>
                                                    <textarea
                                                        name="notes"
                                                        value={formData.notes}
                                                        onChange={handleChange}
                                                        disabled={isViewMode}
                                                        rows={2}
                                                        className="w-full resize-none rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none disabled:bg-gray-100"
                                                        placeholder="Additional notes..."
                                                    />
                                                </div>
                                                <div className="flex items-center gap-4">
                                                    <label className="flex items-center gap-2 text-sm text-gray-700">
                                                        <input
                                                            type="checkbox"
                                                            name="is_active"
                                                            checked={
                                                                formData.is_active
                                                            }
                                                            onChange={
                                                                handleChange
                                                            }
                                                            disabled={
                                                                isViewMode
                                                            }
                                                            className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                                        />
                                                        Active
                                                    </label>
                                                    <div className="flex items-center gap-1">
                                                        <span className="text-sm text-gray-600">
                                                            Rating:
                                                        </span>
                                                        {[1, 2, 3, 4, 5].map(
                                                            (star) => (
                                                                <button
                                                                    key={star}
                                                                    type="button"
                                                                    onClick={() =>
                                                                        !isViewMode &&
                                                                        setFormData(
                                                                            (
                                                                                prev,
                                                                            ) => ({
                                                                                ...prev,
                                                                                rating: star,
                                                                            }),
                                                                        )
                                                                    }
                                                                    disabled={
                                                                        isViewMode
                                                                    }
                                                                    className="focus:outline-none disabled:cursor-not-allowed"
                                                                >
                                                                    <Star
                                                                        className={`h-4 w-4 ${
                                                                            star <=
                                                                            formData.rating
                                                                                ? 'fill-amber-400 text-amber-400'
                                                                                : 'text-gray-300'
                                                                        }`}
                                                                    />
                                                                </button>
                                                            ),
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Footer */}
                                    <div className="rounded-b-xl border-t border-gray-200 bg-gray-50 px-6 py-4">
                                        <div className="flex justify-end gap-3">
                                            {isViewMode ? (
                                                <button
                                                    type="button"
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
                                                        disabled={isLoading}
                                                    >
                                                        Cancel
                                                    </button>
                                                    <button
                                                        type="submit"
                                                        disabled={isLoading}
                                                        className={`flex items-center gap-2 rounded-lg px-6 py-2 text-sm font-medium text-white transition-colors ${
                                                            isLoading
                                                                ? 'cursor-not-allowed bg-gray-400'
                                                                : 'bg-blue-600 hover:bg-blue-700'
                                                        }`}
                                                    >
                                                        {isLoading ? (
                                                            <RefreshCw className="h-4 w-4 animate-spin" />
                                                        ) : (
                                                            <Check className="h-4 w-4" />
                                                        )}
                                                        {isEditMode
                                                            ? 'Update Supplier'
                                                            : 'Add Supplier'}
                                                    </button>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                </form>
                            </Dialog.Panel>
                        </Transition.Child>
                    </div>
                </div>
            </Dialog>
        </Transition>
    );
};

// ============================================================================
// Blacklist Modal
// ============================================================================

const BlacklistModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    supplier: Supplier | null;
    onConfirm: (supplierId: number, reason: string) => void;
    isLoading: boolean;
}> = ({ isOpen, onClose, supplier, onConfirm, isLoading }) => {
    const [reason, setReason] = useState('');

    if (!isOpen || !supplier) return null;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!reason.trim()) {
            toast.error('Please provide a reason for blacklisting');
            return;
        }
        onConfirm(supplier.id, reason);
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
                            <Dialog.Panel className="relative w-full max-w-md transform overflow-hidden rounded-xl bg-white shadow-2xl transition-all">
                                {/* Header */}
                                <div className="rounded-t-xl border-b border-gray-200 bg-white px-6 py-4">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="rounded-lg bg-red-50 p-2">
                                                <UserX className="h-5 w-5 text-red-600" />
                                            </div>
                                            <div>
                                                <Dialog.Title className="text-lg font-semibold text-gray-900">
                                                    Blacklist Supplier
                                                </Dialog.Title>
                                                <p className="text-sm text-gray-500">
                                                    {supplier.supplier_name}
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

                                <form onSubmit={handleSubmit}>
                                    <div className="p-6">
                                        <div className="rounded-lg bg-red-50 p-4 text-sm text-red-700">
                                            <div className="flex items-start gap-3">
                                                <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0" />
                                                <div>
                                                    <p className="font-medium">
                                                        Warning: Blacklisting a
                                                        supplier
                                                    </p>
                                                    <p className="mt-1 text-sm">
                                                        Blacklisting will
                                                        prevent this supplier
                                                        from being used in
                                                        future purchase orders
                                                        and requisitions. This
                                                        action can be reversed
                                                        later.
                                                    </p>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="mt-4">
                                            <label className="mb-1 block text-sm font-medium text-gray-700">
                                                Reason for Blacklisting{' '}
                                                <span className="text-red-500">
                                                    *
                                                </span>
                                            </label>
                                            <textarea
                                                value={reason}
                                                onChange={(e) =>
                                                    setReason(e.target.value)
                                                }
                                                rows={3}
                                                className="w-full resize-none rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none"
                                                placeholder="e.g., Poor quality products, late deliveries, etc."
                                                required
                                            />
                                        </div>
                                    </div>

                                    {/* Footer */}
                                    <div className="rounded-b-xl border-t border-gray-200 bg-gray-50 px-6 py-4">
                                        <div className="flex justify-end gap-3">
                                            <button
                                                type="button"
                                                onClick={onClose}
                                                className="rounded-lg px-4 py-2 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-100"
                                                disabled={isLoading}
                                            >
                                                Cancel
                                            </button>
                                            <button
                                                type="submit"
                                                disabled={isLoading}
                                                className={`flex items-center gap-2 rounded-lg px-6 py-2 text-sm font-medium text-white transition-colors ${
                                                    isLoading
                                                        ? 'cursor-not-allowed bg-gray-400'
                                                        : 'bg-red-600 hover:bg-red-700'
                                                }`}
                                            >
                                                {isLoading ? (
                                                    <RefreshCw className="h-4 w-4 animate-spin" />
                                                ) : (
                                                    <UserX className="h-4 w-4" />
                                                )}
                                                Blacklist Supplier
                                            </button>
                                        </div>
                                    </div>
                                </form>
                            </Dialog.Panel>
                        </Transition.Child>
                    </div>
                </div>
            </Dialog>
        </Transition>
    );
};

// ============================================================================
// Main Suppliers Component
// ============================================================================

export default function Suppliers() {
    const { suppliers, flash } = usePage<SuppliersProps>().props;
    const [loading, setLoading] = useState(false);
    const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(
        null,
    );
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isBlacklistModalOpen, setIsBlacklistModalOpen] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [modalMode, setModalMode] = useState<'create' | 'edit' | 'view'>(
        'create',
    );

    useEffect(() => {
        if (flash?.success) toast.success(flash.success);
        if (flash?.error) toast.error(flash.error);
    }, [flash]);

    const handleView = (supplier: Supplier) => {
        setSelectedSupplier(supplier);
        setModalMode('view');
        setIsModalOpen(true);
    };

    const handleEdit = (supplier: Supplier) => {
        if (supplier.is_blacklisted) {
            toast.error('Cannot edit a blacklisted supplier');
            return;
        }
        setSelectedSupplier(supplier);
        setModalMode('edit');
        setIsModalOpen(true);
    };

    const handleDelete = (supplier: Supplier) => {
        if (!confirm(`Delete ${supplier.supplier_name}?`)) return;

        axios
            .delete(`/api/suppliers/${supplier.id}`)
            .then(() => {
                toast.success('Supplier deleted successfully');
                router.reload();
            })
            .catch(() => toast.error('Failed to delete supplier'));
    };

    const handleBlacklist = (supplier: Supplier) => {
        setSelectedSupplier(supplier);
        setIsBlacklistModalOpen(true);
    };

    const handleRemoveBlacklist = (supplier: Supplier) => {
        if (!confirm(`Remove ${supplier.supplier_name} from blacklist?`))
            return;

        axios
            .post(`/api/suppliers/${supplier.id}/unblacklist`)
            .then(() => {
                toast.success('Supplier removed from blacklist');
                router.reload();
            })
            .catch(() => toast.error('Failed to remove from blacklist'));
    };

    const handleBlacklistConfirm = (supplierId: number, reason: string) => {
        setIsSaving(true);
        axios
            .post(`/api/suppliers/${supplierId}/blacklist`, { reason })
            .then(() => {
                toast.success('Supplier blacklisted successfully');
                setIsBlacklistModalOpen(false);
                router.reload();
            })
            .catch(() => toast.error('Failed to blacklist supplier'))
            .finally(() => setIsSaving(false));
    };

    const handleSave = (data: SupplierFormData) => {
        setIsSaving(true);
        const url = selectedSupplier
            ? `/api/suppliers/${selectedSupplier.id}`
            : '/api/suppliers';
        const method = selectedSupplier ? 'PUT' : 'POST';

        axios({ method, url, data })
            .then(() => {
                toast.success(
                    selectedSupplier
                        ? 'Supplier updated!'
                        : 'Supplier created!',
                );
                setIsModalOpen(false);
                router.reload();
            })
            .catch((err) => {
                toast.error(
                    err.response?.data?.message || 'Failed to save supplier',
                );
            })
            .finally(() => setIsSaving(false));
    };

    const handleAdd = () => {
        setSelectedSupplier(null);
        setModalMode('create');
        setIsModalOpen(true);
    };

    const formatDate = (date: string) => {
        if (!date) return 'N/A';
        try {
            return format(new Date(date), 'dd MMM yyyy');
        } catch {
            return date;
        }
    };

    // ============================================================================
    // Table Columns
    // ============================================================================

    const columns: Column<Supplier>[] = [
        {
            id: 'supplier_code',
            label: 'Code',
            minWidth: 100,
            format: (value) => (
                <span className="font-mono text-sm font-medium text-blue-600">
                    {value}
                </span>
            ),
        },
        {
            id: 'supplier_name',
            label: 'Supplier',
            minWidth: 180,
            format: (value, row) => (
                <div>
                    <div className="flex items-center gap-2">
                        <span className="font-medium text-gray-900">
                            {value}
                        </span>
                        {row.is_blacklisted && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">
                                <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
                                Blacklisted
                            </span>
                        )}
                    </div>
                    {row.city && row.country && (
                        <div className="text-xs text-gray-500">
                            {row.city}, {row.country}
                        </div>
                    )}
                </div>
            ),
        },
        {
            id: 'contact_person',
            label: 'Contact',
            minWidth: 130,
            format: (value) =>
                value || <span className="text-gray-400">—</span>,
        },
        {
            id: 'phone',
            label: 'Phone',
            minWidth: 120,
            format: (value) =>
                value || <span className="text-gray-400">—</span>,
        },
        {
            id: 'email',
            label: 'Email',
            minWidth: 150,
            format: (value) =>
                value || <span className="text-gray-400">—</span>,
        },
        {
            id: 'rating',
            label: 'Rating',
            minWidth: 100,
            align: 'center',
            format: (value) => {
                if (!value) return <span className="text-gray-400">N/A</span>;
                return (
                    <div className="flex items-center justify-center gap-0.5">
                        {[...Array(5)].map((_, i) => (
                            <Star
                                key={i}
                                className={`h-3.5 w-3.5 ${
                                    i < value
                                        ? 'fill-amber-400 text-amber-400'
                                        : 'text-gray-300'
                                }`}
                            />
                        ))}
                    </div>
                );
            },
        },
        {
            id: 'is_active',
            label: 'Status',
            minWidth: 100,
            align: 'center',
            filterType: 'status',
            statusColors: {
                true: 'success',
                false: 'default',
            },
            format: (value, row) => {
                if (row.is_blacklisted) {
                    return (
                        <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">
                            <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
                            Blacklisted
                        </span>
                    );
                }
                return (
                    <span
                        className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${
                            value
                                ? 'bg-green-100 text-green-700'
                                : 'bg-gray-100 text-gray-700'
                        }`}
                    >
                        <span
                            className={`h-1.5 w-1.5 rounded-full ${value ? 'bg-green-500' : 'bg-gray-500'}`}
                        />
                        {value ? 'Active' : 'Inactive'}
                    </span>
                );
            },
        },
    ];

    // ============================================================================
    // Table Actions
    // ============================================================================

    const actions: Action<Supplier>[] = [
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
            show: (row) => !row.is_blacklisted,
        },
        {
            label: 'Blacklist',
            icon: <UserX className="h-4 w-4" />,
            color: 'error',
            variant: 'text',
            onClick: handleBlacklist,
            show: (row) => !row.is_blacklisted && row.is_active,
        },
        {
            label: 'Remove Blacklist',
            icon: <UserCheck className="h-4 w-4" />,
            color: 'success',
            variant: 'text',
            onClick: handleRemoveBlacklist,
            show: (row) => row.is_blacklisted,
        },
        {
            label: 'Delete',
            icon: <Trash2 className="h-4 w-4" />,
            color: 'error',
            variant: 'text',
            onClick: handleDelete,
        },
    ];

    // ============================================================================
    // Status Options
    // ============================================================================

    const statusOptions = [
        { value: 'active', label: 'Active' },
        { value: 'inactive', label: 'Inactive' },
        { value: 'blacklisted', label: 'Blacklisted' },
    ];

    // ============================================================================
    // Stats
    // ============================================================================

    const stats = {
        total: suppliers?.length || 0,
        active:
            suppliers?.filter((s) => s.is_active && !s.is_blacklisted).length ||
            0,
        inactive:
            suppliers?.filter((s) => !s.is_active && !s.is_blacklisted)
                .length || 0,
        blacklisted: suppliers?.filter((s) => s.is_blacklisted).length || 0,
    };

    // ============================================================================
    // Render
    // ============================================================================

    return (
        <AppLayout
            breadcrumbs={[
                { title: 'Bulk Store', href: '/bulkstore' },
                { title: 'Suppliers', href: '/bulkstore/suppliers' },
            ]}
        >
            <Head title="Suppliers | Bulk Store" />

            <div className="min-h-screen bg-slate-100">
                <div className="p-6">
                    {/* Page Header */}
                    <PageHeader
                        title="Suppliers"
                        subtitle="Manage suppliers and vendors"
                        icon={<Building2 className="h-6 w-6 text-blue-600" />}
                        actions={[
                            {
                                label: 'Refresh',
                                icon: <RefreshCw className="h-4 w-4" />,
                                onClick: () => router.reload(),
                                variant: 'outline',
                            },
                            {
                                label: 'Add Supplier',
                                icon: <Plus className="h-4 w-4" />,
                                onClick: handleAdd,
                                variant: 'primary',
                            },
                        ]}
                    />

                    {/* Stats Cards */}
                    <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                        <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
                            <p className="text-xs text-gray-500">
                                Total Suppliers
                            </p>
                            <p className="text-2xl font-bold text-gray-900">
                                {stats.total}
                            </p>
                        </div>
                        <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
                            <p className="text-xs text-gray-500">Active</p>
                            <p className="text-2xl font-bold text-green-600">
                                {stats.active}
                            </p>
                        </div>
                        <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
                            <p className="text-xs text-gray-500">Inactive</p>
                            <p className="text-2xl font-bold text-gray-600">
                                {stats.inactive}
                            </p>
                        </div>
                        <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
                            <p className="text-xs text-gray-500">Blacklisted</p>
                            <p className="text-2xl font-bold text-red-600">
                                {stats.blacklisted}
                            </p>
                        </div>
                    </div>

                    {/* Table */}
                    <div className="mt-6">
                        <ReusableTable
                            columns={columns}
                            data={suppliers || []}
                            actions={actions}
                            title="Supplier List"
                            statusFilterKey="status"
                            statusOptions={statusOptions}
                            onRowClick={(row) => handleView(row)}
                            rowsPerPageOptions={[10, 25, 50, 100]}
                            defaultRowsPerPage={10}
                            defaultOrderBy="supplier_name"
                            defaultOrder="asc"
                            loading={loading}
                            emptyMessage="No suppliers found. Click 'Add Supplier' to create one."
                            filterPlaceholder="Search by name, code, or contact..."
                        />
                    </div>
                </div>
            </div>

            {/* Supplier Modal */}
            <SupplierModal
                isOpen={isModalOpen}
                onClose={() => {
                    setIsModalOpen(false);
                    setSelectedSupplier(null);
                }}
                onSave={handleSave}
                supplier={selectedSupplier}
                isLoading={isSaving}
                mode={modalMode}
            />

            {/* Blacklist Modal */}
            <BlacklistModal
                isOpen={isBlacklistModalOpen}
                onClose={() => {
                    setIsBlacklistModalOpen(false);
                    setSelectedSupplier(null);
                }}
                supplier={selectedSupplier}
                onConfirm={handleBlacklistConfirm}
                isLoading={isSaving}
            />
        </AppLayout>
    );
}
