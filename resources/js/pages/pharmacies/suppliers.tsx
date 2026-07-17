// pages/pharmacy/suppliers.tsx

import React, { useState, useEffect } from 'react';
import { Head, router, usePage } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import PageHeader from '@/components/PageHeader';
import {
    Search,
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
} from 'lucide-react';

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

interface SuppliersProps {
    suppliers: Supplier[];
    flash?: {
        success?: string;
        error?: string;
    };
}

// ============================================================================
// Sub-Components
// ============================================================================

const StatusBadge: React.FC<{ isActive: boolean }> = ({ isActive }) => (
    <span
        className={`inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[9px] font-medium ${
            isActive
                ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400'
                : 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400'
        }`}
    >
        <span
            className={`h-1 w-1 rounded-full ${isActive ? 'bg-emerald-500' : 'bg-red-500'}`}
        />
        {isActive ? 'Active' : 'Inactive'}
    </span>
);

const RatingStars: React.FC<{ rating: number | null }> = ({ rating }) => {
    if (!rating) return <span className="text-[9px] text-slate-400">N/A</span>;
    return (
        <div className="flex items-center gap-0.5">
            {[...Array(5)].map((_, i) => (
                <Star
                    key={i}
                    className={`h-2.5 w-2.5 ${i < rating ? 'fill-amber-400 text-amber-400' : 'text-slate-300 dark:text-slate-600'}`}
                />
            ))}
        </div>
    );
};

// ============================================================================
// Supplier Modal (Compact)
// ============================================================================

const SupplierModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    onSave: (data: SupplierFormData) => void;
    supplier?: Supplier | null;
    isLoading: boolean;
}> = ({ isOpen, onClose, onSave, supplier, isLoading }) => {
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

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-2 backdrop-blur-sm">
            <div className="w-full max-w-3xl animate-in duration-200 fade-in zoom-in">
                <div className="rounded-xl bg-white shadow-2xl dark:bg-slate-800">
                    {/* Header */}
                    <div className="flex items-center justify-between border-b border-slate-200 px-4 py-2.5 dark:border-slate-700">
                        <div className="flex items-center gap-2">
                            <div className="rounded-lg bg-blue-100 p-1.5 dark:bg-blue-900/30">
                                {supplier ? (
                                    <Edit className="h-3.5 w-3.5 text-blue-600" />
                                ) : (
                                    <Plus className="h-3.5 w-3.5 text-blue-600" />
                                )}
                            </div>
                            <div>
                                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">
                                    {supplier
                                        ? 'Edit Supplier'
                                        : 'Add New Supplier'}
                                </h3>
                                <p className="text-[10px] text-slate-500 dark:text-slate-400">
                                    {supplier
                                        ? `Updating ${supplier.supplier_name}`
                                        : 'Create a new supplier record'}
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className="rounded-lg p-1 hover:bg-slate-100 dark:hover:bg-slate-700"
                        >
                            <X className="h-4 w-4 text-slate-500" />
                        </button>
                    </div>

                    <form onSubmit={handleSubmit}>
                        <div className="max-h-[calc(95vh-180px)] overflow-y-auto p-4">
                            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                                {/* Left Column */}
                                <div className="space-y-2">
                                    <div>
                                        <label className="flex items-center gap-1 text-[10px] font-medium text-slate-700 dark:text-slate-300">
                                            <Building2 className="h-3 w-3" />
                                            Supplier Name{' '}
                                            <span className="text-red-500">
                                                *
                                            </span>
                                        </label>
                                        <input
                                            type="text"
                                            name="supplier_name"
                                            value={formData.supplier_name}
                                            onChange={handleChange}
                                            className="mt-0.5 h-7 w-full rounded-lg border border-slate-200 px-2 text-xs focus:border-blue-400 focus:ring-1 focus:ring-blue-400 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="flex items-center gap-1 text-[10px] font-medium text-slate-700 dark:text-slate-300">
                                            <FileText className="h-3 w-3" />
                                            Supplier Code{' '}
                                            <span className="text-red-500">
                                                *
                                            </span>
                                        </label>
                                        <input
                                            type="text"
                                            name="supplier_code"
                                            value={formData.supplier_code}
                                            onChange={handleChange}
                                            className="mt-0.5 h-7 w-full rounded-lg border border-slate-200 px-2 text-xs focus:border-blue-400 focus:ring-1 focus:ring-blue-400 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="flex items-center gap-1 text-[10px] font-medium text-slate-700 dark:text-slate-300">
                                            <User className="h-3 w-3" />
                                            Contact Person
                                        </label>
                                        <input
                                            type="text"
                                            name="contact_person"
                                            value={formData.contact_person}
                                            onChange={handleChange}
                                            className="mt-0.5 h-7 w-full rounded-lg border border-slate-200 px-2 text-xs focus:border-blue-400 focus:ring-1 focus:ring-blue-400 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                                        />
                                    </div>
                                    <div>
                                        <label className="flex items-center gap-1 text-[10px] font-medium text-slate-700 dark:text-slate-300">
                                            <Phone className="h-3 w-3" />
                                            Phone
                                        </label>
                                        <input
                                            type="tel"
                                            name="phone"
                                            value={formData.phone}
                                            onChange={handleChange}
                                            className="mt-0.5 h-7 w-full rounded-lg border border-slate-200 px-2 text-xs focus:border-blue-400 focus:ring-1 focus:ring-blue-400 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                                        />
                                    </div>
                                    <div>
                                        <label className="flex items-center gap-1 text-[10px] font-medium text-slate-700 dark:text-slate-300">
                                            <Mail className="h-3 w-3" />
                                            Email
                                        </label>
                                        <input
                                            type="email"
                                            name="email"
                                            value={formData.email}
                                            onChange={handleChange}
                                            className="mt-0.5 h-7 w-full rounded-lg border border-slate-200 px-2 text-xs focus:border-blue-400 focus:ring-1 focus:ring-blue-400 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                                        />
                                    </div>
                                </div>

                                {/* Right Column */}
                                <div className="space-y-2">
                                    <div>
                                        <label className="flex items-center gap-1 text-[10px] font-medium text-slate-700 dark:text-slate-300">
                                            <MapPin className="h-3 w-3" />
                                            Address
                                        </label>
                                        <input
                                            type="text"
                                            name="address"
                                            value={formData.address}
                                            onChange={handleChange}
                                            className="mt-0.5 h-7 w-full rounded-lg border border-slate-200 px-2 text-xs focus:border-blue-400 focus:ring-1 focus:ring-blue-400 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                                        />
                                    </div>
                                    <div className="grid grid-cols-2 gap-2">
                                        <div>
                                            <label className="text-[10px] font-medium text-slate-700 dark:text-slate-300">
                                                City
                                            </label>
                                            <input
                                                type="text"
                                                name="city"
                                                value={formData.city}
                                                onChange={handleChange}
                                                className="mt-0.5 h-7 w-full rounded-lg border border-slate-200 px-2 text-xs focus:border-blue-400 focus:ring-1 focus:ring-blue-400 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                                            />
                                        </div>
                                        <div>
                                            <label className="text-[10px] font-medium text-slate-700 dark:text-slate-300">
                                                Country
                                            </label>
                                            <select
                                                name="country"
                                                value={formData.country}
                                                onChange={handleChange}
                                                className="mt-0.5 h-7 w-full rounded-lg border border-slate-200 px-2 text-xs focus:border-blue-400 focus:ring-1 focus:ring-blue-400 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
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
                                                <option value="DRC">DRC</option>
                                            </select>
                                        </div>
                                    </div>
                                    <div>
                                        <label className="flex items-center gap-1 text-[10px] font-medium text-slate-700 dark:text-slate-300">
                                            <CreditCard className="h-3 w-3" />
                                            Tax / VAT Number
                                        </label>
                                        <input
                                            type="text"
                                            name="tax_number"
                                            value={formData.tax_number}
                                            onChange={handleChange}
                                            className="mt-0.5 h-7 w-full rounded-lg border border-slate-200 px-2 text-xs focus:border-blue-400 focus:ring-1 focus:ring-blue-400 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                                        />
                                    </div>
                                    <div className="grid grid-cols-2 gap-2">
                                        <div>
                                            <label className="text-[10px] font-medium text-slate-700 dark:text-slate-300">
                                                Payment Terms
                                            </label>
                                            <select
                                                name="payment_terms"
                                                value={formData.payment_terms}
                                                onChange={handleChange}
                                                className="mt-0.5 h-7 w-full rounded-lg border border-slate-200 px-2 text-xs focus:border-blue-400 focus:ring-1 focus:ring-blue-400 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
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
                                            <label className="text-[10px] font-medium text-slate-700 dark:text-slate-300">
                                                Delivery Terms
                                            </label>
                                            <select
                                                name="delivery_terms"
                                                value={formData.delivery_terms}
                                                onChange={handleChange}
                                                className="mt-0.5 h-7 w-full rounded-lg border border-slate-200 px-2 text-xs focus:border-blue-400 focus:ring-1 focus:ring-blue-400 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                                            >
                                                <option value="FOB">FOB</option>
                                                <option value="CIF">CIF</option>
                                                <option value="EXW">EXW</option>
                                                <option value="DDP">DDP</option>
                                            </select>
                                        </div>
                                    </div>
                                </div>

                                {/* Full Width */}
                                <div className="col-span-1 space-y-2 md:col-span-2">
                                    <div>
                                        <label className="flex items-center gap-1 text-[10px] font-medium text-slate-700 dark:text-slate-300">
                                            <MessageSquare className="h-3 w-3" />
                                            Notes
                                        </label>
                                        <textarea
                                            name="notes"
                                            value={formData.notes}
                                            onChange={handleChange}
                                            rows={2}
                                            className="mt-0.5 w-full rounded-lg border border-slate-200 px-2 py-1 text-xs focus:border-blue-400 focus:ring-1 focus:ring-blue-400 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                                            placeholder="Additional notes..."
                                        />
                                    </div>
                                    <div className="flex flex-wrap items-center gap-3">
                                        <label className="flex cursor-pointer items-center gap-1.5">
                                            <input
                                                type="checkbox"
                                                name="is_active"
                                                checked={formData.is_active}
                                                onChange={handleChange}
                                                className="h-3 w-3 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                                            />
                                            <span className="text-[10px] text-slate-600 dark:text-slate-400">
                                                Active
                                            </span>
                                        </label>
                                        <div className="flex items-center gap-0.5">
                                            <span className="text-[10px] text-slate-600 dark:text-slate-400">
                                                Rating:
                                            </span>
                                            {[1, 2, 3, 4, 5].map((star) => (
                                                <button
                                                    key={star}
                                                    type="button"
                                                    onClick={() =>
                                                        setFormData((prev) => ({
                                                            ...prev,
                                                            rating: star,
                                                        }))
                                                    }
                                                    className="focus:outline-none"
                                                >
                                                    <Star
                                                        className={`h-3.5 w-3.5 ${
                                                            star <=
                                                            formData.rating
                                                                ? 'fill-amber-400 text-amber-400'
                                                                : 'text-slate-300 dark:text-slate-600'
                                                        }`}
                                                    />
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="flex justify-end gap-2 border-t border-slate-200 px-4 py-2.5 dark:border-slate-700">
                            <button
                                type="button"
                                onClick={onClose}
                                className="rounded-lg border border-slate-300 px-3 py-1 text-[10px] font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-700"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={isLoading}
                                className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1 text-[10px] font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                            >
                                {isLoading ? (
                                    <RefreshCw className="h-3 w-3 animate-spin" />
                                ) : (
                                    <Check className="h-3 w-3" />
                                )}
                                {supplier ? 'Update' : 'Add'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

// ============================================================================
// Main Suppliers Component
// ============================================================================

export default function Suppliers() {
    const { suppliers, flash } = usePage<SuppliersProps>().props;
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(
        null,
    );
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

    useEffect(() => {
        if (flash?.success) console.log('Success:', flash.success);
        if (flash?.error) console.error('Error:', flash.error);
    }, [flash]);

    const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
        setSearchTerm(e.target.value);
        setCurrentPage(1);
    };

    const handleAdd = () => {
        setSelectedSupplier(null);
        setIsModalOpen(true);
    };

    const handleEdit = (supplier: Supplier) => {
        setSelectedSupplier(supplier);
        setIsModalOpen(true);
    };

    const handleDelete = (supplier: Supplier) => {
        if (!confirm(`Delete ${supplier.supplier_name}?`)) return;

        router.delete(`/pharmacy/suppliers/${supplier.id}`, {
            preserveScroll: true,
            onError: () => alert('Failed to delete supplier'),
        });
    };

    const handleSave = (data: SupplierFormData) => {
        setIsSaving(true);

        const options = {
            preserveScroll: true,
            onSuccess: () => {
                setIsModalOpen(false);
                setIsSaving(false);
            },
            onError: (errors) => {
                alert('Failed to save supplier');
                setIsSaving(false);
            },
        };

        if (selectedSupplier) {
            router.put(
                `/pharmacy/suppliers/${selectedSupplier.id}`,
                data,
                options,
            );
        } else {
            router.post('/pharmacy/suppliers', data, options);
        }
    };

    const filteredSuppliers =
        suppliers?.filter(
            (s) =>
                s.supplier_name
                    .toLowerCase()
                    .includes(searchTerm.toLowerCase()) ||
                s.supplier_code
                    .toLowerCase()
                    .includes(searchTerm.toLowerCase()) ||
                (s.contact_person &&
                    s.contact_person
                        .toLowerCase()
                        .includes(searchTerm.toLowerCase())),
        ) || [];

    const totalPages = Math.ceil(filteredSuppliers.length / itemsPerPage);
    const paginatedSuppliers = filteredSuppliers.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage,
    );

    return (
        <AppLayout
            breadcrumbs={[
                { title: 'Pharmacy', href: '/pharmacy' },
                { title: 'Suppliers', href: '/pharmacy/suppliers' },
            ]}
        >
            <Head title="Suppliers | Pharmacy" />

            <div className="flex h-full min-h-screen flex-1 flex-col gap-3 bg-slate-50 p-3 dark:bg-slate-900">
                <div className="flex flex-wrap items-center justify-between gap-2">
                    <PageHeader
                        title="Suppliers"
                        subtitle="Manage pharmacy suppliers and vendors"
                    />
                    <div className="flex items-center gap-1.5">
                        <button
                            onClick={() => router.reload()}
                            className="rounded-lg border border-slate-200 p-1.5 text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-800"
                            title="Refresh"
                        >
                            <RefreshCw className="h-3.5 w-3.5" />
                        </button>
                        <button
                            onClick={handleAdd}
                            className="flex items-center gap-1 rounded-lg bg-blue-600 px-2.5 py-1.5 text-[10px] font-medium text-white hover:bg-blue-700"
                        >
                            <Plus className="h-3.5 w-3.5" />
                            Add Supplier
                        </button>
                    </div>
                </div>

                {/* Flash Messages */}
                {flash?.success && (
                    <div className="rounded-lg bg-emerald-50 p-2 text-xs text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400">
                        {flash.success}
                    </div>
                )}
                {flash?.error && (
                    <div className="rounded-lg bg-red-50 p-2 text-xs text-red-700 dark:bg-red-950/30 dark:text-red-400">
                        {flash.error}
                    </div>
                )}

                {/* Search and Stats */}
                <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-200 bg-white p-2 shadow-sm dark:border-slate-700 dark:bg-slate-800/90">
                    <div className="relative max-w-xs flex-1">
                        <Search className="absolute top-1/2 left-2 h-3 w-3 -translate-y-1/2 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Search suppliers..."
                            value={searchTerm}
                            onChange={handleSearch}
                            className="h-7 w-full rounded-lg border border-slate-200 pr-2 pl-7 text-[10px] focus:border-blue-400 focus:ring-1 focus:ring-blue-400 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                        />
                    </div>
                    <div className="flex items-center gap-3 text-[10px] text-slate-500 dark:text-slate-400">
                        <span>Total: {suppliers?.length || 0}</span>
                        <span>
                            Active:{' '}
                            {suppliers?.filter((s) => s.is_active).length || 0}
                        </span>
                    </div>
                </div>

                {/* Suppliers Table */}
                <div className="rounded-lg border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800/90">
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="border-b border-slate-200 bg-slate-50 text-[9px] text-slate-600 uppercase dark:border-slate-700 dark:bg-slate-800/50 dark:text-slate-400">
                                <tr>
                                    <th className="px-2 py-1.5 text-left">
                                        Code
                                    </th>
                                    <th className="px-2 py-1.5 text-left">
                                        Supplier
                                    </th>
                                    <th className="px-2 py-1.5 text-left">
                                        Contact
                                    </th>
                                    <th className="px-2 py-1.5 text-left">
                                        Phone
                                    </th>
                                    <th className="px-2 py-1.5 text-left">
                                        Email
                                    </th>
                                    <th className="px-2 py-1.5 text-center">
                                        Rating
                                    </th>
                                    <th className="px-2 py-1.5 text-center">
                                        Status
                                    </th>
                                    <th className="px-2 py-1.5 text-center">
                                        Actions
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {paginatedSuppliers.length === 0 ? (
                                    <tr>
                                        <td
                                            colSpan={8}
                                            className="px-2 py-6 text-center text-xs text-slate-500 dark:text-slate-400"
                                        >
                                            <Package className="mx-auto h-6 w-6 text-slate-300 dark:text-slate-600" />
                                            <p className="mt-1">
                                                No suppliers found
                                            </p>
                                        </td>
                                    </tr>
                                ) : (
                                    paginatedSuppliers.map((supplier) => (
                                        <tr
                                            key={supplier.id}
                                            className="border-b border-slate-100 text-[10px] hover:bg-slate-50 dark:border-slate-700/50 dark:hover:bg-slate-800/50"
                                        >
                                            <td className="px-2 py-1.5 font-mono text-[9px] font-medium text-slate-600 dark:text-slate-400">
                                                {supplier.supplier_code}
                                            </td>
                                            <td className="px-2 py-1.5">
                                                <div className="font-medium text-slate-800 dark:text-slate-200">
                                                    {supplier.supplier_name}
                                                </div>
                                                {supplier.city && (
                                                    <div className="text-[8px] text-slate-500 dark:text-slate-400">
                                                        {supplier.city}
                                                    </div>
                                                )}
                                            </td>
                                            <td className="px-2 py-1.5 text-slate-600 dark:text-slate-400">
                                                {supplier.contact_person || '—'}
                                            </td>
                                            <td className="px-2 py-1.5 text-slate-600 dark:text-slate-400">
                                                {supplier.phone || '—'}
                                            </td>
                                            <td className="px-2 py-1.5 text-slate-600 dark:text-slate-400">
                                                {supplier.email || '—'}
                                            </td>
                                            <td className="px-2 py-1.5 text-center">
                                                <RatingStars
                                                    rating={supplier.rating}
                                                />
                                            </td>
                                            <td className="px-2 py-1.5 text-center">
                                                <StatusBadge
                                                    isActive={
                                                        supplier.is_active
                                                    }
                                                />
                                            </td>
                                            <td className="px-2 py-1.5 text-center">
                                                <div className="flex items-center justify-center gap-0.5">
                                                    <button
                                                        onClick={() =>
                                                            handleEdit(supplier)
                                                        }
                                                        className="rounded p-0.5 text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-950/30"
                                                        title="Edit"
                                                    >
                                                        <Edit className="h-3 w-3" />
                                                    </button>
                                                    <button
                                                        onClick={() =>
                                                            handleDelete(
                                                                supplier,
                                                            )
                                                        }
                                                        className="rounded p-0.5 text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/30"
                                                        title="Delete"
                                                    >
                                                        <Trash2 className="h-3 w-3" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination */}
                    {totalPages > 1 && (
                        <div className="flex items-center justify-between border-t border-slate-200 px-2 py-1.5 dark:border-slate-700">
                            <p className="text-[9px] text-slate-500 dark:text-slate-400">
                                {(currentPage - 1) * itemsPerPage + 1}–
                                {Math.min(
                                    currentPage * itemsPerPage,
                                    filteredSuppliers.length,
                                )}{' '}
                                of {filteredSuppliers.length}
                            </p>
                            <div className="flex gap-0.5">
                                <button
                                    onClick={() =>
                                        setCurrentPage((p) =>
                                            Math.max(1, p - 1),
                                        )
                                    }
                                    disabled={currentPage === 1}
                                    className="rounded border border-slate-200 p-0.5 disabled:opacity-50 dark:border-slate-700"
                                >
                                    <ChevronLeft className="h-3 w-3" />
                                </button>
                                <span className="px-1.5 py-0.5 text-[9px] text-slate-600 dark:text-slate-400">
                                    {currentPage}/{totalPages}
                                </span>
                                <button
                                    onClick={() =>
                                        setCurrentPage((p) =>
                                            Math.min(totalPages, p + 1),
                                        )
                                    }
                                    disabled={currentPage === totalPages}
                                    className="rounded border border-slate-200 p-0.5 disabled:opacity-50 dark:border-slate-700"
                                >
                                    <ChevronRight className="h-3 w-3" />
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Supplier Modal */}
            <SupplierModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSave={handleSave}
                supplier={selectedSupplier}
                isLoading={isSaving}
            />
        </AppLayout>
    );
}
