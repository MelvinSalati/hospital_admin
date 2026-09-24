// pages/patients/RadiologyOrdersTable.tsx
import { usePage } from '@inertiajs/react';
import {
    Plus,
    X,
    Search,
    Trash2,
    ShoppingCart,
    Eye,
    ChevronLeft,
    ChevronRight,
    Save,
    RadiationIcon,
    FileText,
    Calendar,
    Filter,
    ClipboardList,
} from 'lucide-react';
import Notiflix from 'notiflix';
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import PageHeader from '@/components/PageHeader';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import PatientLayout from '@/layouts/patients/PatientLayout';
import Http from '@/utils/Http';
import type { Column } from './components/Table';
import { Table as ReusableTable } from './components/Table';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface RadiologyCartItem {
    id: number;
    service_name: string;
    category?: string;
    price: number;
    quantity: number;
    modality?: string;
    body_part?: string;
    priority?: string;
    notes?: string;
    [key: string]: any;
}

export interface RadiologyOrder {
    id: string;
    order_number: string;
    service_name: string;
    service_category: string;
    quantity: number;
    unit_price: number;
    total_price: number;
    status: string;
    priority?: string;
    created_at: string;
    items?: any[];
}

interface RadiologyOrdersTableProps {
    patientId: string;
    services: any[];
    previousOrders: RadiologyOrder[] | null;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const PRIORITY_OPTIONS = [
    { value: 'routine', label: 'Routine' },
    { value: 'urgent', label: 'Urgent' },
    { value: 'emergency', label: 'Emergency' },
];

const MODALITY_OPTIONS = [
    { value: 'X-Ray', label: 'X-Ray' },
    { value: 'MRI', label: 'MRI' },
    { value: 'CT Scan', label: 'CT Scan' },
    { value: 'Ultrasound', label: 'Ultrasound' },
    { value: 'PET Scan', label: 'PET Scan' },
    { value: 'Mammogram', label: 'Mammogram' },
    { value: 'Fluoroscopy', label: 'Fluoroscopy' },
    { value: 'DEXA Scan', label: 'DEXA Scan' },
];

const BODY_PARTS = [
    { value: 'Head', label: 'Head' },
    { value: 'Chest', label: 'Chest' },
    { value: 'Abdomen', label: 'Abdomen' },
    { value: 'Pelvis', label: 'Pelvis' },
    { value: 'Knee', label: 'Knee' },
    { value: 'Shoulder', label: 'Shoulder' },
    { value: 'Spine', label: 'Spine' },
    { value: 'Hip', label: 'Hip' },
    { value: 'Ankle', label: 'Ankle' },
    { value: 'Wrist', label: 'Wrist' },
    { value: 'Elbow', label: 'Elbow' },
    { value: 'Hand', label: 'Hand' },
    { value: 'Foot', label: 'Foot' },
    { value: 'Neck', label: 'Neck' },
    { value: 'Full Body', label: 'Full Body' },
];

const STATUS_COLORS: Record<string, string> = {
    active: 'bg-green-100 text-green-700',
    completed: 'bg-gray-100 text-gray-600',
    cancelled: 'bg-red-100 text-red-700',
    pending: 'bg-yellow-100 text-yellow-700',
    scheduled: 'bg-blue-100 text-blue-700',
    in_progress: 'bg-purple-100 text-purple-700',
};

// ─── Utility Functions ──────────────────────────────────────────────────────

const getPrice = (service: any): number => {
    if (!service) return 0;
    const price = service.price;
    if (typeof price === 'number') return price;
    if (typeof price === 'string') {
        const parsed = parseFloat(price);
        return isNaN(parsed) ? 0 : parsed;
    }
    return 0;
};

const getStatusColor = (status: string): string => {
    const colors: Record<string, string> = {
        completed: 'bg-green-100 text-green-800',
        cancelled: 'bg-red-100 text-red-800',
        active: 'bg-blue-100 text-blue-800',
        pending: 'bg-yellow-100 text-yellow-800',
        scheduled: 'bg-purple-100 text-purple-800',
        in_progress: 'bg-indigo-100 text-indigo-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
};

const safeToLowerCase = (value: any): string => {
    if (!value) return '';
    return String(value).toLowerCase();
};

const formatDate = (date: string): string => {
    if (!date) return '—';
    try {
        return new Date(date).toLocaleDateString('en-ZM', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
        });
    } catch {
        return '—';
    }
};

const formatCurrency = (amount: number | string): string => {
    const num = typeof amount === 'string' ? parseFloat(amount) : amount;
    if (isNaN(num)) return 'ZMW 0.00';
    return `ZMW ${num.toFixed(2)}`;
};

// ─── Custom Hooks ────────────────────────────────────────────────────────────

const usePagination = <T,>(items: T[], itemsPerPage: number) => {
    const [currentPage, setCurrentPage] = useState(1);
    const totalPages = Math.ceil(items.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const paginatedItems = items.slice(startIndex, startIndex + itemsPerPage);

    const goToPage = (page: number) => {
        setCurrentPage(Math.max(1, Math.min(totalPages, page)));
    };

    return {
        currentPage,
        totalPages,
        startIndex,
        paginatedItems,
        goToPage,
        setCurrentPage,
    };
};

// ─── Form Field Components ──────────────────────────────────────────────────

interface FormFieldProps {
    label: string;
    type?: 'text' | 'number';
    value: string | number;
    onChange: (value: string) => void;
    placeholder?: string;
    min?: number;
}

const FormField: React.FC<FormFieldProps> = ({
    label,
    type = 'text',
    value,
    onChange,
    placeholder,
    min,
}) => (
    <div>
        <label className="block text-sm font-medium">{label}</label>
        <input
            type={type}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            min={min}
            className="w-full rounded-md border px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
        />
    </div>
);

interface SelectFieldProps {
    label: string;
    value: string;
    onChange: (value: string) => void;
    options: Array<{ value: string; label: string }>;
    placeholder?: string;
}

const SelectField: React.FC<SelectFieldProps> = ({
    label,
    value,
    onChange,
    options,
    placeholder,
}) => (
    <div>
        <label className="block text-sm font-medium">{label}</label>
        <select
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="w-full rounded-md border px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
        >
            {placeholder && <option value="">{placeholder}</option>}
            {options.map((opt) => (
                <option key={opt.value} value={opt.value}>
                    {opt.label}
                </option>
            ))}
        </select>
    </div>
);

interface TextAreaFieldProps {
    label: string;
    value: string;
    onChange: (value: string) => void;
    rows?: number;
    placeholder?: string;
}

const TextAreaField: React.FC<TextAreaFieldProps> = ({
    label,
    value,
    onChange,
    rows = 2,
    placeholder,
}) => (
    <div>
        <label className="block text-sm font-medium">{label}</label>
        <textarea
            value={value}
            onChange={(e) => onChange(e.target.value)}
            rows={rows}
            placeholder={placeholder}
            className="w-full rounded-md border px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
        />
    </div>
);

// ─── Radiology Service Modal Component ──────────────────────────────────────

const RadiologyServiceModal = ({
    isOpen,
    onClose,
    onSave,
    services = [],
    patientId,
}: {
    isOpen: boolean;
    onClose: () => void;
    onSave: (items: RadiologyCartItem[], patientId: string) => Promise<void>;
    services: any[];
    patientId: string;
}) => {
    const [cart, setCart] = useState<RadiologyCartItem[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [selectedService, setSelectedService] = useState<any | null>(null);
    const [showDetailForm, setShowDetailForm] = useState(false);
    const [serviceDetails, setServiceDetails] = useState({
        modality: '',
        body_part: '',
        priority: 'routine',
        notes: '',
        quantity: 1,
    });

    const safeServices = useMemo(
        () => (Array.isArray(services) ? services : []),
        [services],
    );

    const filteredServices = useMemo(() => {
        if (!searchTerm.trim()) return safeServices;
        const term = safeToLowerCase(searchTerm);
        return safeServices.filter((s) => {
            if (!s || !s.service_name) return false;
            return safeToLowerCase(String(s.service_name)).includes(term);
        });
    }, [safeServices, searchTerm]);

    const totalAmount = useMemo(() => {
        return cart.reduce(
            (sum, item) => sum + (item.price || 0) * (item.quantity || 1),
            0,
        );
    }, [cart]);

    const handleSelectService = useCallback((service: any) => {
        if (!service) {
            Notiflix.Notify.warning('Invalid service selected');
            return;
        }
        const price = getPrice(service);
        if (price <= 0) {
            Notiflix.Notify.warning(
                `No price set for ${service.service_name || 'this service'}`,
            );
            return;
        }
        setSelectedService({ ...service, price });
        setServiceDetails({
            modality: service.modality || '',
            body_part: service.body_part || '',
            priority: 'routine',
            notes: '',
            quantity: 1,
        });
        setShowDetailForm(true);
        setSearchTerm('');
    }, []);

    const addToCart = useCallback(() => {
        if (!selectedService) return;

        const cartItem: RadiologyCartItem = {
            id: selectedService.id,
            service_name: selectedService.service_name || 'Unknown Service',
            category: selectedService.service_category || 'Imaging',
            price: selectedService.price || 0,
            quantity: serviceDetails.quantity || 1,
            notes: serviceDetails.notes || '',
            priority: serviceDetails.priority || 'routine',
            modality: serviceDetails.modality || '',
            body_part: serviceDetails.body_part || '',
        };

        setCart((prev) => [...prev, cartItem]);
        setShowDetailForm(false);
        setSelectedService(null);
        Notiflix.Notify.success(
            `${selectedService.service_name || 'Service'} added to cart`,
        );
    }, [selectedService, serviceDetails]);

    const removeFromCart = useCallback((id: number) => {
        setCart((prev) => prev.filter((item) => item.id !== id));
    }, []);

    const updateQuantity = useCallback((id: number, quantity: number) => {
        if (quantity < 1) return;
        setCart((prev) =>
            prev.map((item) => (item.id === id ? { ...item, quantity } : item)),
        );
    }, []);

    const handleSubmit = useCallback(async () => {
        if (cart.length === 0) {
            Notiflix.Notify.warning(
                'Please add at least one radiology service to order',
            );
            return;
        }

        setIsSubmitting(true);
        try {
            await onSave(cart, patientId);
            setCart([]);
            onClose();
        } catch (error) {
            console.error('Failed to save radiology order:', error);
            Notiflix.Notify.failure('Failed to save order. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    }, [cart, onSave, patientId, onClose]);

    useEffect(() => {
        if (!isOpen) {
            setCart([]);
            setSearchTerm('');
            setSelectedService(null);
            setShowDetailForm(false);
            setIsSubmitting(false);
        }
    }, [isOpen]);

    if (!isOpen) return null;

    const renderServiceDetailForm = () => {
        if (!selectedService) return null;

        return (
            <div className="space-y-4">
                <div className="rounded-lg bg-blue-50 p-3">
                    <p className="font-medium text-blue-700">
                        {selectedService.service_name || 'Unknown'}
                    </p>
                    <p className="text-sm text-blue-600">
                        ZMW {getPrice(selectedService).toFixed(2)}
                    </p>
                </div>

                <SelectField
                    label="Modality"
                    value={serviceDetails.modality}
                    onChange={(val) =>
                        setServiceDetails({ ...serviceDetails, modality: val })
                    }
                    options={MODALITY_OPTIONS}
                    placeholder="Select modality"
                />

                <SelectField
                    label="Body Part"
                    value={serviceDetails.body_part}
                    onChange={(val) =>
                        setServiceDetails({ ...serviceDetails, body_part: val })
                    }
                    options={BODY_PARTS}
                    placeholder="Select body part"
                />

                <SelectField
                    label="Priority"
                    value={serviceDetails.priority}
                    onChange={(val) =>
                        setServiceDetails({ ...serviceDetails, priority: val })
                    }
                    options={PRIORITY_OPTIONS}
                />

                <FormField
                    label="Quantity"
                    type="number"
                    value={serviceDetails.quantity}
                    onChange={(val) =>
                        setServiceDetails({
                            ...serviceDetails,
                            quantity: parseInt(val) || 1,
                        })
                    }
                    min={1}
                />

                <TextAreaField
                    label="Notes"
                    value={serviceDetails.notes}
                    onChange={(val) =>
                        setServiceDetails({ ...serviceDetails, notes: val })
                    }
                    rows={2}
                    placeholder="Add clinical notes or special instructions..."
                />

                <Button
                    onClick={addToCart}
                    className="w-full bg-blue-600 hover:bg-blue-700"
                >
                    <Plus className="mr-2 h-4 w-4" /> Add to Cart
                </Button>
            </div>
        );
    };

    return (
        <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="flex min-h-screen items-center justify-center p-4">
                <div className="fixed inset-0 bg-black/50" onClick={onClose} />

                <div className="relative w-full max-w-5xl rounded-xl bg-white shadow-2xl">
                    <div className="flex items-center justify-between border-b px-6 py-4">
                        <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-600 shadow-lg shadow-blue-600/25">
                                <RadiationIcon className="h-5 w-5 text-white" />
                            </div>
                            <div>
                                <h2 className="text-lg font-semibold text-slate-900">
                                    Order Radiology Services
                                </h2>
                                <p className="text-xs text-slate-500">
                                    Select imaging services and add details to
                                    complete the order
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className="text-gray-400 hover:text-gray-500"
                            aria-label="Close"
                        >
                            <X className="h-5 w-5" />
                        </button>
                    </div>

                    <div className="flex min-h-[500px] flex-col md:flex-row">
                        {/* Left - Available Services */}
                        <div className="w-full border-b p-4 md:w-1/2 md:border-r md:border-b-0">
                            <div className="relative mb-4">
                                <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-gray-400" />
                                <input
                                    type="text"
                                    placeholder="Search radiology services..."
                                    value={searchTerm}
                                    onChange={(e) =>
                                        setSearchTerm(e.target.value)
                                    }
                                    className="w-full rounded-md border py-2 pr-4 pl-9 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                />
                            </div>

                            {!showDetailForm ? (
                                <div className="max-h-[400px] space-y-2 overflow-y-auto">
                                    {filteredServices.length === 0 ? (
                                        <div className="py-8 text-center text-gray-400">
                                            {searchTerm
                                                ? 'No radiology services found matching your search'
                                                : 'No radiology services available'}
                                        </div>
                                    ) : (
                                        filteredServices.map((service) => {
                                            const price = getPrice(service);
                                            const hasPrice = price > 0;
                                            return (
                                                <div
                                                    key={service.id}
                                                    className="flex items-center justify-between rounded-lg border p-3 hover:bg-gray-50"
                                                >
                                                    <div>
                                                        <div className="font-medium">
                                                            {service.service_name ||
                                                                'Unknown Service'}
                                                        </div>
                                                        <div
                                                            className={`text-sm ${
                                                                hasPrice
                                                                    ? 'text-gray-500'
                                                                    : 'text-red-500'
                                                            }`}
                                                        >
                                                            {hasPrice
                                                                ? `ZMW ${price.toFixed(2)}`
                                                                : 'No price'}
                                                        </div>
                                                        {service.stock !==
                                                            undefined && (
                                                            <div className="text-xs text-gray-400">
                                                                Stock:{' '}
                                                                {service.stock}
                                                            </div>
                                                        )}
                                                    </div>
                                                    <Button
                                                        size="sm"
                                                        onClick={() =>
                                                            handleSelectService(
                                                                service,
                                                            )
                                                        }
                                                        disabled={!hasPrice}
                                                        className={
                                                            hasPrice
                                                                ? 'bg-blue-600 hover:bg-blue-700'
                                                                : ''
                                                        }
                                                    >
                                                        {hasPrice
                                                            ? 'Select'
                                                            : 'No Price'}
                                                    </Button>
                                                </div>
                                            );
                                        })
                                    )}
                                </div>
                            ) : (
                                <div className="max-h-[400px] overflow-y-auto">
                                    <button
                                        onClick={() => {
                                            setShowDetailForm(false);
                                            setSelectedService(null);
                                        }}
                                        className="mb-3 text-sm text-blue-600 hover:underline"
                                    >
                                        ← Back to services
                                    </button>
                                    {renderServiceDetailForm()}
                                </div>
                            )}
                        </div>

                        {/* Right - Cart */}
                        <div className="w-full bg-gray-50 p-4 md:w-1/2">
                            <h3 className="mb-3 font-semibold">
                                Order Cart ({cart.length} items)
                            </h3>

                            <div className="max-h-[400px] space-y-2 overflow-y-auto">
                                {cart.map((item) => (
                                    <div
                                        key={item.id}
                                        className="rounded-lg bg-white p-3 shadow-sm"
                                    >
                                        <div className="flex justify-between">
                                            <div>
                                                <div className="font-medium">
                                                    {item.service_name}
                                                </div>
                                                <div className="text-sm text-gray-500">
                                                    ZMW {item.price.toFixed(2)}{' '}
                                                    each
                                                </div>
                                                {item.modality && (
                                                    <div className="text-xs text-gray-400">
                                                        {item.modality}{' '}
                                                        {item.body_part &&
                                                            `• ${item.body_part}`}
                                                        {item.priority &&
                                                            item.priority !==
                                                                'routine' && (
                                                                <Badge className="ml-1 bg-yellow-100 text-xs text-yellow-800">
                                                                    {
                                                                        item.priority
                                                                    }
                                                                </Badge>
                                                            )}
                                                    </div>
                                                )}
                                            </div>
                                            <button
                                                onClick={() =>
                                                    removeFromCart(item.id)
                                                }
                                                className="text-red-500 hover:text-red-700"
                                                aria-label="Remove item"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </button>
                                        </div>
                                        <div className="mt-2 flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <button
                                                    onClick={() =>
                                                        updateQuantity(
                                                            item.id,
                                                            item.quantity - 1,
                                                        )
                                                    }
                                                    className="h-6 w-6 rounded border hover:bg-gray-100"
                                                    aria-label="Decrease quantity"
                                                >
                                                    -
                                                </button>
                                                <span className="w-8 text-center">
                                                    {item.quantity}
                                                </span>
                                                <button
                                                    onClick={() =>
                                                        updateQuantity(
                                                            item.id,
                                                            item.quantity + 1,
                                                        )
                                                    }
                                                    className="h-6 w-6 rounded border hover:bg-gray-100"
                                                    aria-label="Increase quantity"
                                                >
                                                    +
                                                </button>
                                            </div>
                                            <div className="font-semibold">
                                                ZMW{' '}
                                                {(
                                                    item.price * item.quantity
                                                ).toFixed(2)}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                                {cart.length === 0 && (
                                    <div className="py-8 text-center text-gray-400">
                                        <ShoppingCart className="mx-auto mb-2 h-12 w-12 opacity-30" />
                                        Cart is empty
                                    </div>
                                )}
                            </div>

                            {cart.length > 0 && (
                                <div className="mt-4 border-t pt-3">
                                    <div className="mb-3 flex justify-between">
                                        <span className="font-semibold">
                                            Total:
                                        </span>
                                        <span className="text-xl font-bold text-blue-600">
                                            ZMW {totalAmount.toFixed(2)}
                                        </span>
                                    </div>
                                    <Button
                                        onClick={handleSubmit}
                                        disabled={isSubmitting}
                                        className="w-full bg-blue-600 hover:bg-blue-700"
                                    >
                                        <Save className="mr-2 h-4 w-4" />
                                        {isSubmitting
                                            ? 'Saving...'
                                            : `Save Order (ZMW ${totalAmount.toFixed(2)})`}
                                    </Button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

// ─── Bundle Modal ──────────────────────────────────────────────────────────

const RadiologyBundleModal = ({
    isOpen,
    onClose,
    order,
}: {
    isOpen: boolean;
    onClose: () => void;
    order: RadiologyOrder | null;
}) => {
    const [expandedItem, setExpandedItem] = useState<string | null>(null);

    if (!isOpen || !order) return null;

    const items = order.items || [];

    return (
        <div className="fixed inset-0 z-50 overflow-hidden">
            <div className="flex min-h-screen items-center justify-center p-4">
                <div
                    className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm"
                    onClick={onClose}
                />
                <div className="relative flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-slate-900/5">
                    {/* Header — non-scrollable */}
                    <div className="flex shrink-0 items-center justify-between border-b border-slate-200 bg-gradient-to-r from-slate-50 via-white to-slate-50 px-6 py-5">
                        <div className="flex items-center gap-4">
                            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 shadow-lg shadow-blue-500/30">
                                <RadiationIcon className="h-6 w-6 text-white" />
                            </div>
                            <div>
                                <h2 className="text-lg font-bold tracking-tight text-slate-900">
                                    Radiology Bundle
                                </h2>
                                <p className="mt-0.5 font-mono text-xs text-slate-500">
                                    #{order.order_number} • {items.length} item
                                    {items.length !== 1 ? 's' : ''}
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className="flex h-9 w-9 items-center justify-center rounded-full text-slate-400 transition-all hover:bg-slate-100 hover:text-slate-700"
                            aria-label="Close"
                        >
                            <X className="h-5 w-5" />
                        </button>
                    </div>

                    {/* Body — scrollable */}
                    <div className="flex-1 overflow-y-auto bg-slate-50/40">
                        <div className="space-y-5 px-6 py-6">
                            <div>
                                <Badge
                                    className={
                                        STATUS_COLORS[order.status] ||
                                        'bg-gray-100 text-gray-600'
                                    }
                                >
                                    Status:{' '}
                                    {order.status
                                        ? order.status.charAt(0).toUpperCase() +
                                          order.status.slice(1)
                                        : 'Unknown'}
                                </Badge>
                            </div>

                            {items.length > 0 ? (
                                <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                                    <table className="w-full text-sm">
                                        <thead className="border-b border-slate-200 bg-slate-50">
                                            <tr>
                                                <th className="px-4 py-3 text-left text-[11px] font-semibold tracking-wider text-slate-500 uppercase">
                                                    Service
                                                </th>
                                                <th className="px-4 py-3 text-left text-[11px] font-semibold tracking-wider text-slate-500 uppercase">
                                                    Details
                                                </th>
                                                <th className="px-4 py-3 text-left text-[11px] font-semibold tracking-wider text-slate-500 uppercase">
                                                    Qty
                                                </th>
                                                <th className="px-4 py-3"></th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {items.map(
                                                (item: any, idx: number) => {
                                                    const itemId =
                                                        item.id?.toString() ||
                                                        String(idx);
                                                    const isExpanded =
                                                        expandedItem === itemId;
                                                    return (
                                                        <React.Fragment
                                                            key={itemId}
                                                        >
                                                            <tr className="transition-colors hover:bg-blue-50/40">
                                                                <td className="px-4 py-3.5 font-medium text-slate-800">
                                                                    {item.service_name ||
                                                                        'Unknown'}
                                                                </td>
                                                                <td className="px-4 py-3.5 text-slate-600">
                                                                    {item.modality && (
                                                                        <div>
                                                                            {
                                                                                item.modality
                                                                            }
                                                                            {item.body_part &&
                                                                                ` • ${item.body_part}`}
                                                                        </div>
                                                                    )}
                                                                    {item.priority &&
                                                                        item.priority !==
                                                                            'routine' && (
                                                                            <Badge className="bg-yellow-100 text-xs text-yellow-800">
                                                                                {
                                                                                    item.priority
                                                                                }
                                                                            </Badge>
                                                                        )}
                                                                    {!item.modality &&
                                                                        '—'}
                                                                </td>
                                                                <td className="px-4 py-3.5 text-slate-600 tabular-nums">
                                                                    {item.quantity ||
                                                                        1}
                                                                </td>
                                                                <td className="px-4 py-3.5">
                                                                    {item.notes && (
                                                                        <Button
                                                                            variant="ghost"
                                                                            size="sm"
                                                                            className="h-7 text-xs"
                                                                            onClick={() =>
                                                                                setExpandedItem(
                                                                                    isExpanded
                                                                                        ? null
                                                                                        : itemId,
                                                                                )
                                                                            }
                                                                        >
                                                                            <ChevronLeft
                                                                                className={`h-3 w-3 transition-transform ${
                                                                                    isExpanded
                                                                                        ? 'rotate-90'
                                                                                        : ''
                                                                                }`}
                                                                            />
                                                                        </Button>
                                                                    )}
                                                                </td>
                                                            </tr>
                                                            {isExpanded &&
                                                                item.notes && (
                                                                    <tr className="bg-slate-50">
                                                                        <td
                                                                            colSpan={
                                                                                4
                                                                            }
                                                                            className="px-4 py-3"
                                                                        >
                                                                            <div className="text-xs text-slate-600">
                                                                                <span className="font-medium text-slate-700">
                                                                                    Notes:
                                                                                </span>
                                                                                <p className="mt-1 whitespace-pre-wrap">
                                                                                    {
                                                                                        item.notes
                                                                                    }
                                                                                </p>
                                                                            </div>
                                                                        </td>
                                                                    </tr>
                                                                )}
                                                        </React.Fragment>
                                                    );
                                                },
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            ) : (
                                <div className="rounded-xl border border-slate-200 bg-white py-16 text-center">
                                    <ClipboardList className="mx-auto h-12 w-12 text-slate-300" />
                                    <p className="mt-2 text-sm text-slate-500">
                                        No items found
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Footer — non-scrollable */}
                    <div className="flex shrink-0 items-center justify-end gap-3 border-t border-slate-200 bg-gradient-to-r from-slate-50 via-white to-slate-50 px-6 py-4">
                        <Button
                            onClick={onClose}
                            variant="outline"
                            className="border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                        >
                            Close
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
};

// ─── Main Component ──────────────────────────────────────────────────────────

export default function RadiologyOrdersTable({
    patientId,
    services = [],
}: RadiologyOrdersTableProps) {
    const [isOrderModalOpen, setIsOrderModalOpen] = useState(false);
    const [selectedOrder, setSelectedOrder] = useState<RadiologyOrder | null>(
        null,
    );
    const [isBundleModalOpen, setIsBundleModalOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const itemsPerPage = 5;
    const { previousOrders } = usePage().props;

    const safeOrders = useMemo(
        () => (Array.isArray(previousOrders) ? previousOrders : []),
        [previousOrders],
    );

    const enhancedOrders = useMemo(
        () =>
            safeOrders.map((order) => ({
                ...order,
                service_name: order.service_name || 'Unknown Service',
                order_number: order.order_number || 'N/A',
                status: order.status || 'pending',
                quantity: order.quantity ?? 1,
                unit_price: order.unit_price ?? 0,
                total_price: order.total_price ?? 0,
                created_at: order.created_at || new Date().toISOString(),
            })),
        [safeOrders],
    );

    // Client-side filtering
    const filteredOrders = useMemo(() => {
        return enhancedOrders.filter((order) => {
            const matchesSearch =
                searchTerm === '' ||
                safeToLowerCase(order.order_number).includes(
                    safeToLowerCase(searchTerm),
                ) ||
                safeToLowerCase(order.service_name).includes(
                    safeToLowerCase(searchTerm),
                );

            const matchesStatus =
                statusFilter === 'all' || order.status === statusFilter;

            return matchesSearch && matchesStatus;
        });
    }, [enhancedOrders, searchTerm, statusFilter]);

    const { currentPage, totalPages, paginatedItems, setCurrentPage } =
        usePagination(filteredOrders, itemsPerPage);

    // Reset page when filters change
    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm, statusFilter, setCurrentPage]);

    const handleViewBundle = useCallback((order: RadiologyOrder) => {
        setSelectedOrder(order);
        setIsBundleModalOpen(true);
    }, []);

    const handleNewOrder = useCallback(() => {
        setIsOrderModalOpen(true);
    }, []);

    // ─── Save Order Handler (business logic unchanged) ──────────────────────
    const handleSaveOrder = useCallback(
        async (items: RadiologyCartItem[], patientId: string) => {
            try {
                const totalAmount = items.reduce(
                    (sum, item) =>
                        sum + (item.price || 0) * (item.quantity || 1),
                    0,
                );

                const orderData = {
                    patient_id: patientId,
                    items: items.map((item) => ({
                        id: item.id,
                        service_name: item.service_name,
                        category: item.category || 'Imaging',
                        price: item.price,
                        quantity: item.quantity || 1,
                        notes: item.notes || null,
                        priority: item.priority || 'routine',
                        modality: item.modality || null,
                        body_part: item.body_part || null,
                    })),
                    total_amount: totalAmount,
                };

                console.log(
                    '📤 Sending radiology order:',
                    JSON.stringify(orderData, null, 2),
                );

                const response = await Http.post(
                    `/patients/${patientId}/radiology/orders`,
                    orderData,
                );

                if (response.data.success) {
                    Notiflix.Notify.success(
                        response.data.message ||
                            'Radiology order created successfully',
                    );
                }

                return response.data;
            } catch (error: any) {
                console.error('❌ Error saving radiology order:', error);

                if (error?.response?.status === 422) {
                    const errors = error.response.data.errors;

                    console.log(
                        '🔍 Validation Errors:',
                        JSON.stringify(errors, null, 2),
                    );

                    if (typeof errors === 'object') {
                        Object.entries(errors).forEach(([field, messages]) => {
                            let fieldName = field;

                            if (field.includes('.')) {
                                const parts = field.split('.');
                                if (!isNaN(Number(parts[1]))) {
                                    fieldName = `Item #${parseInt(parts[1]) + 1} → ${parts[2] || parts[0]}`;
                                } else {
                                    fieldName = parts.join(' → ');
                                }
                            }

                            if (Array.isArray(messages)) {
                                messages.forEach((message) => {
                                    Notiflix.Notify.failure(
                                        `❌ ${fieldName}: ${message}`,
                                        {
                                            timeout: 8000,
                                            showOnlyTheLastOne: true,
                                            cssAnimationStyle: 'zoom',
                                        },
                                    );
                                });
                            } else {
                                Notiflix.Notify.failure(
                                    `❌ ${fieldName}: ${messages}`,
                                    {
                                        timeout: 8000,
                                        showOnlyTheLastOne: true,
                                        cssAnimationStyle: 'zoom',
                                    },
                                );
                            }
                        });

                        console.error('📋 Validation errors summary:');
                        Object.entries(errors).forEach(([field, messages]) => {
                            console.error(`  • ${field}:`, messages);
                        });
                    }
                } else {
                    const errorMessage =
                        error?.response?.data?.message ||
                        error?.message ||
                        'Failed to save radiology order';

                    Notiflix.Notify.failure(errorMessage);
                }

                throw error;
            }
        },
        [],
    );

    // ─── Table Columns ─────────────────────────────────────────────────────
    const columns: Column<any>[] = [
        {
            key: 'order_number',
            header: 'Order #',
            render: (value) => (
                <span className="font-mono text-sm font-medium text-slate-700">
                    {value}
                </span>
            ),
            sortable: true,
        },
        {
            key: 'service_name',
            header: 'Service',
            render: (value, row) => (
                <div>
                    <div className="font-medium text-slate-800">{value}</div>
                    {row.items && row.items.length > 1 && (
                        <div className="text-xs text-slate-400">
                            +{row.items.length - 1} more
                        </div>
                    )}
                </div>
            ),
            sortable: true,
        },
        {
            key: 'quantity',
            header: 'Qty',
            render: (value) => <span className="text-slate-600">{value}</span>,
        },
        {
            key: 'unit_price',
            header: 'Unit Price',
            render: (value) => (
                <span className="text-slate-600">{formatCurrency(value)}</span>
            ),
        },
        {
            key: 'total_price',
            header: 'Total',
            render: (value) => (
                <span className="font-semibold text-blue-600">
                    {formatCurrency(value)}
                </span>
            ),
        },
        {
            key: 'status',
            header: 'Status',
            render: (value) => (
                <Badge className={`capitalize ${getStatusColor(value)}`}>
                    {value}
                </Badge>
            ),
            sortable: true,
        },
        {
            key: 'created_at',
            header: 'Date',
            render: (value) => (
                <span className="text-sm text-slate-500">
                    {formatDate(value)}
                </span>
            ),
            sortable: true,
        },
    ];

    const renderActions = (order: RadiologyOrder) => (
        <Button
            size="sm"
            onClick={(e) => {
                e.stopPropagation();
                handleViewBundle(order);
            }}
            variant="outline"
            className="border-slate-200 text-slate-600 hover:bg-slate-50"
        >
            <Eye className="mr-1 h-3 w-3" />
            View
        </Button>
    );

    const hasActiveFilters = searchTerm !== '' || statusFilter !== 'all';

    const clearFilters = () => {
        setSearchTerm('');
        setStatusFilter('all');
    };

    return (
        <PatientLayout
            breadcrumbs={[
                { title: 'Patient', href: '/' },
                { title: 'Radiology', href: '/' },
            ]}
        >
            <div className="h-full space-y-4 bg-blue-50 p-4">
                <PageHeader
                    icon={<RadiationIcon />}
                    title="Imaging / Radiology"
                    subtitle="Manage radiology orders"
                    actions={[
                        {
                            label: 'Order Imaging',
                            onClick: handleNewOrder,
                        },
                    ]}
                />
                {enhancedOrders.length > 0 ? (
                    <div className="rounded-sm bg-white p-4">
                        {/* Filter Toolbar */}
                        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                            <div className="relative max-w-md flex-1">
                                <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
                                <Input
                                    type="text"
                                    placeholder="Search by order # or service..."
                                    value={searchTerm}
                                    onChange={(e) =>
                                        setSearchTerm(e.target.value)
                                    }
                                    className="h-10 pr-4 pl-9 text-sm focus:border-blue-400 focus:ring-blue-400"
                                />
                                {searchTerm && (
                                    <button
                                        onClick={() => setSearchTerm('')}
                                        className="absolute top-1/2 right-3 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                                    >
                                        <X className="h-4 w-4" />
                                    </button>
                                )}
                            </div>

                            <div className="flex flex-wrap items-center gap-2">
                                <Select
                                    value={statusFilter}
                                    onValueChange={setStatusFilter}
                                >
                                    <SelectTrigger className="h-10 w-[150px] border-slate-200 text-sm">
                                        <Filter className="mr-2 h-3.5 w-3.5 text-slate-400" />
                                        <SelectValue placeholder="All Status" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">
                                            All Status
                                        </SelectItem>
                                        <SelectItem value="pending">
                                            Pending
                                        </SelectItem>
                                        <SelectItem value="scheduled">
                                            Scheduled
                                        </SelectItem>
                                        <SelectItem value="in_progress">
                                            In Progress
                                        </SelectItem>
                                        <SelectItem value="completed">
                                            Completed
                                        </SelectItem>
                                        <SelectItem value="cancelled">
                                            Cancelled
                                        </SelectItem>
                                    </SelectContent>
                                </Select>

                                {hasActiveFilters && (
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={clearFilters}
                                        className="h-10 text-sm text-slate-500 hover:text-slate-700"
                                    >
                                        <X className="mr-1 h-3.5 w-3.5" />
                                        Clear
                                    </Button>
                                )}
                            </div>
                        </div>

                        {/* Filter Chips */}
                        {hasActiveFilters && (
                            <div className="mb-3 flex flex-wrap items-center gap-2">
                                <span className="text-xs font-medium text-slate-500">
                                    Active filters:
                                </span>
                                {searchTerm && (
                                    <Badge
                                        variant="secondary"
                                        className="gap-1 text-xs"
                                    >
                                        Search: {searchTerm}
                                        <button
                                            onClick={() => setSearchTerm('')}
                                            className="ml-1 text-slate-400 hover:text-slate-600"
                                        >
                                            <X className="h-3 w-3" />
                                        </button>
                                    </Badge>
                                )}
                                {statusFilter !== 'all' && (
                                    <Badge
                                        variant="secondary"
                                        className="gap-1 text-xs"
                                    >
                                        Status: {statusFilter}
                                        <button
                                            onClick={() =>
                                                setStatusFilter('all')
                                            }
                                            className="ml-1 text-slate-400 hover:text-slate-600"
                                        >
                                            <X className="h-3 w-3" />
                                        </button>
                                    </Badge>
                                )}
                            </div>
                        )}

                        {/* Reusable Table */}
                        <ReusableTable
                            data={paginatedItems}
                            columns={columns}
                            subtitle={`${filteredOrders.length} order${filteredOrders.length !== 1 ? 's' : ''} found`}
                            emptyMessage={
                                hasActiveFilters
                                    ? 'No orders match your filters'
                                    : 'No radiology orders available'
                            }
                            onRowClick={handleViewBundle}
                            actions={renderActions}
                            searchable={false}
                            pagination={{
                                currentPage,
                                totalPages,
                                onPageChange: setCurrentPage,
                                totalItems: filteredOrders.length,
                                itemsPerPage,
                            }}
                            className="border-0 shadow-none"
                        />
                    </div>
                ) : (
                    <div className="rounded-xl border border-slate-200 bg-white py-16 text-center shadow-sm">
                        <RadiationIcon className="mx-auto h-16 w-16 text-slate-300" />
                        <h3 className="mt-4 text-lg font-medium text-slate-700">
                            No radiology orders found
                        </h3>
                        <p className="mt-1 text-sm text-slate-400">
                            Create your first radiology order to get started
                        </p>
                        <Button
                            onClick={handleNewOrder}
                            className="mt-4 bg-blue-600 text-white hover:bg-blue-700"
                        >
                            <Plus className="mr-2 h-4 w-4" />
                            Create your first radiology order
                        </Button>
                    </div>
                )}

                <RadiologyServiceModal
                    isOpen={isOrderModalOpen}
                    onClose={() => setIsOrderModalOpen(false)}
                    onSave={handleSaveOrder}
                    services={services}
                    patientId={patientId}
                />

                {isBundleModalOpen && (
                    <RadiologyBundleModal
                        isOpen={isBundleModalOpen}
                        onClose={() => {
                            setIsBundleModalOpen(false);
                            setSelectedOrder(null);
                        }}
                        order={selectedOrder}
                    />
                )}
            </div>
        </PatientLayout>
    );
}
