// resources/js/pages/bulkstore/Issue.tsx

import { Dialog, Transition } from '@headlessui/react';
import { Head, usePage, router } from '@inertiajs/react';
import axios from 'axios';
import { format } from 'date-fns';
import {
    Eye,
    CheckCircle,
    XCircle,
    Clock,
    Package,
    AlertTriangle,
    Check,
    X,
    Loader2,
    FileText,
    Plus,
    Truck,
    AlertCircle,
    RefreshCw,
} from 'lucide-react';
import React, { useState, useEffect, useMemo } from 'react';
import { toast } from 'react-hot-toast';
import type { Column, Action } from '@/components/ReusableTable';
import ReusableTable from '@/components/ReusableTable';
import AppLayout from '@/layouts/app-layout';
import type { BreadcrumbItem } from '@/types';

// ============================================
// TYPES
// ============================================

interface RequisitionItem {
    id: number;
    department_id: number;
    product_id: number;
    product_name?: string | null;
    product_code?: string | null;
    quantity_requested: number | string | null;
    quantity_approved: number | string | null;
    quantity_fulfilled: number | string | null;
    quantity_rejected: number | string | null;
    unit?: string | null;
    estimated_unit_price: number | string | null;
    estimated_total: number | string | null;
    actual_unit_price?: number | string | null;
    actual_total?: number | string | null;
    batch_number?: string | null;
    expiry_date?: string | null;
    status?: string | null;
    notes?: string | null;
}

interface Requisition {
    id: number;
    requisition_number: string;
    requisition_uuid?: string;
    department_id: number | null;
    department?: { id: number; name: string; code?: string | null } | null;
    requested_by: number | null;
    requester?: { id: number; name: string; email?: string | null } | null;
    requested_at: string | null;
    required_by_date: string | null;
    delivery_location?: string | null;
    delivery_notes?: string | null;
    status:
        | 'draft'
        | 'pending'
        | 'approved'
        | 'rejected'
        | 'partially_fulfilled'
        | 'fulfilled'
        | 'cancelled'
        | null;
    priority: 'low' | 'medium' | 'high' | 'urgent' | null;
    justification: string | null;
    remarks?: string | null;
    budget_code: string | null;
    cost_center?: string | null;
    estimated_total: number | string | null;
    items?: RequisitionItem[];

    // ✅ flat, string-safe fields for the table (built in normalize())
    department_name: string;
    department_code: string;
    requester_name: string;
    requester_email: string;
    items_count: number;
    total_quantity: number;
}

interface IssueModalProps {
    isOpen: boolean;
    onClose: () => void;
    requisition: Requisition | null;
    onSuccess: () => void;
}

// ============================================
// SAFE HELPERS — avoid object-as-React-child & null crashes
// ============================================

const safeText = (v: unknown, fallback = '—'): string => {
    if (v === null || v === undefined || v === '') return fallback;
    if (typeof v === 'object') {
        const o = v as any;
        return o.name ?? o.label ?? o.code ?? JSON.stringify(o);
    }
    return String(v);
};

const toNumber = (v: unknown): number => {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
};

const asArray = <T,>(v: unknown): T[] => (Array.isArray(v) ? (v as T[]) : []);

// ============================================
// STATUS CONFIG
// ============================================

const STATUS_CONFIG: Record<
    string,
    { label: string; color: string; bgColor: string; icon: any }
> = {
    draft: {
        label: 'Draft',
        color: 'text-gray-600',
        bgColor: 'bg-gray-100',
        icon: FileText,
    },
    pending: {
        label: 'Pending',
        color: 'text-yellow-600',
        bgColor: 'bg-yellow-100',
        icon: Clock,
    },
    approved: {
        label: 'Approved',
        color: 'text-blue-600',
        bgColor: 'bg-blue-100',
        icon: CheckCircle,
    },
    rejected: {
        label: 'Rejected',
        color: 'text-red-600',
        bgColor: 'bg-red-100',
        icon: XCircle,
    },
    partially_fulfilled: {
        label: 'Partially Fulfilled',
        color: 'text-orange-600',
        bgColor: 'bg-orange-100',
        icon: AlertCircle,
    },
    fulfilled: {
        label: 'Fulfilled',
        color: 'text-green-600',
        bgColor: 'bg-green-100',
        icon: CheckCircle,
    },
    cancelled: {
        label: 'Cancelled',
        color: 'text-gray-500',
        bgColor: 'bg-gray-100',
        icon: XCircle,
    },
};

const PRIORITY_CONFIG: Record<
    string,
    { label: string; color: string; bgColor: string }
> = {
    low: { label: 'Low', color: 'text-blue-600', bgColor: 'bg-blue-50' },
    medium: {
        label: 'Medium',
        color: 'text-yellow-600',
        bgColor: 'bg-yellow-50',
    },
    high: { label: 'High', color: 'text-orange-600', bgColor: 'bg-orange-50' },
    urgent: { label: 'Urgent', color: 'text-red-600', bgColor: 'bg-red-50' },
};

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Bulk Store', href: '/bulkstore' },
    { title: 'Issue', href: '/bulkstore/issue' },
];

// ============================================
// NORMALIZER — flattens objects to strings for the table
// ============================================

function normalizeRequisitions(rows: any[]): Requisition[] {
    return asArray<any>(rows).map((r) => {
        const items = asArray<RequisitionItem>(r?.items);
        const totalQuantity = items.reduce(
            (sum, it) => sum + toNumber(it.quantity_requested),
            0,
        );

        return {
            ...r,
            department: r?.department ?? null,
            requester: r?.requester ?? r?.requested_by_user ?? null,
            items,
            // ✅ flat string fields used by the table
            department_name: safeText(r?.department?.name),
            department_code: safeText(r?.department?.code, ''),
            requester_name: safeText(
                r?.requester?.name ?? r?.requested_by_user?.name,
            ),
            requester_email: safeText(
                r?.requester?.email ?? r?.requested_by_user?.email,
                '',
            ),
            items_count: items.length,
            total_quantity: totalQuantity,
        } as Requisition;
    });
}

// ============================================
// ISSUE MODAL
// ============================================

function IssueModal({
    isOpen,
    onClose,
    requisition,
    onSuccess,
}: IssueModalProps) {
    const [submitting, setSubmitting] = useState(false);
    const [selectedItems, setSelectedItems] = useState<
        Record<
            number,
            { quantity: number; batch_number: string; expiry_date: string }
        >
    >({});
    const [stockAvailability, setStockAvailability] = useState<
        Record<number, { available: number; is_sufficient: boolean }>
    >({});
    const [checkingStock, setCheckingStock] = useState(false);

    useEffect(() => {
        if (isOpen && requisition) {
            checkStockAvailability();
        } else {
            setSelectedItems({});
            setStockAvailability({});
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOpen, requisition?.id]);

    const checkStockAvailability = async () => {
        if (!requisition) return;
        const items = asArray<RequisitionItem>(requisition.items);
        if (items.length === 0) return;

        setCheckingStock(true);
        try {
            const productIds = items.map((item) => item.product_id);
            const response = await axios.post('/api/bulkstore/check-stock', {
                product_ids: productIds,
                department_id: requisition.department_id,
            });

            if (response.data?.success) {
                const availability: Record<
                    number,
                    { available: number; is_sufficient: boolean }
                > = {};

                asArray<any>(response.data.data).forEach((stock) => {
                    availability[stock.product_id] = {
                        available: toNumber(stock.available_stock),
                        is_sufficient:
                            toNumber(stock.available_stock) >=
                            toNumber(stock.requested_quantity),
                    };
                });

                setStockAvailability(availability);

                // Auto-select items that have enough stock
                const initialSelection: Record<
                    number,
                    {
                        quantity: number;
                        batch_number: string;
                        expiry_date: string;
                    }
                > = {};

                items.forEach((item) => {
                    const stock = availability[item.product_id];
                    if (stock && stock.is_sufficient) {
                        initialSelection[item.id] = {
                            quantity: toNumber(item.quantity_requested),
                            batch_number: '',
                            expiry_date: '',
                        };
                    }
                });

                setSelectedItems(initialSelection);
            }
        } catch (error) {
            console.error('Failed to check stock:', error);
            toast.error('Failed to check stock availability');
        } finally {
            setCheckingStock(false);
        }
    };

    const handleQuantityChange = (itemId: number, value: number) => {
        setSelectedItems((prev) => ({
            ...prev,
            [itemId]: {
                ...prev[itemId],
                quantity: Math.max(0, value),
            },
        }));
    };

    const handleBatchChange = (itemId: number, value: string) => {
        setSelectedItems((prev) => ({
            ...prev,
            [itemId]: { ...prev[itemId], batch_number: value },
        }));
    };

    const handleExpiryChange = (itemId: number, value: string) => {
        setSelectedItems((prev) => ({
            ...prev,
            [itemId]: { ...prev[itemId], expiry_date: value },
        }));
    };

    const toggleItemSelection = (itemId: number, item: RequisitionItem) => {
        if (selectedItems[itemId]) {
            const next = { ...selectedItems };
            delete next[itemId];
            setSelectedItems(next);
        } else {
            const stock = stockAvailability[item.product_id];
            if (stock && stock.available > 0) {
                setSelectedItems((prev) => ({
                    ...prev,
                    [itemId]: {
                        quantity: Math.min(
                            toNumber(item.quantity_requested),
                            stock.available,
                        ),
                        batch_number: '',
                        expiry_date: '',
                    },
                }));
            } else {
                toast.error('No stock available for this item');
            }
        }
    };

    const handleSubmit = async () => {
        if (!requisition) return;

        const itemsToIssue = Object.keys(selectedItems).map((itemId) => {
            const sel = selectedItems[parseInt(itemId, 10)];
            return {
                requisition_item_id: parseInt(itemId, 10),
                quantity: sel.quantity,
                batch_number: sel.batch_number || null,
                expiry_date: sel.expiry_date || null,
            };
        });

        if (itemsToIssue.length === 0) {
            toast.error('Please select at least one item to issue');
            return;
        }

        setSubmitting(true);
        try {
            const response = await axios.post(
                `/api/bulkstore/requisitions/${requisition.id}/fulfill`,
                { items: itemsToIssue },
            );

            if (response.data?.success) {
                toast.success('Requisition fulfilled successfully');
                onSuccess();
                onClose();
            } else {
                toast.error(
                    response.data?.message || 'Failed to fulfill requisition',
                );
            }
        } catch (error: any) {
            const message =
                error?.response?.data?.message ||
                'Failed to fulfill requisition';
            toast.error(message);
        } finally {
            setSubmitting(false);
        }
    };

    const formatCurrency = (amount: unknown) => {
        const n = toNumber(amount);
        return new Intl.NumberFormat('en-ZM', {
            style: 'currency',
            currency: 'ZMW',
            minimumFractionDigits: 2,
        }).format(n);
    };

    const formatDate = (date: string | null | undefined) => {
        if (!date) return 'N/A';
        try {
            return format(new Date(date), 'dd MMM yyyy');
        } catch {
            return 'N/A';
        }
    };

    if (!requisition) return null;

    const items = asArray<RequisitionItem>(requisition.items);
    const totalRequested = items.reduce(
        (sum, item) => sum + toNumber(item.quantity_requested),
        0,
    );
    const totalSelected = Object.values(selectedItems).reduce(
        (sum, sel) => sum + toNumber(sel.quantity),
        0,
    );
    const totalFulfilled = items.reduce(
        (sum, item) => sum + toNumber(item.quantity_fulfilled),
        0,
    );

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
                            <Dialog.Panel className="relative flex max-h-[95vh] w-full max-w-5xl transform flex-col overflow-hidden rounded-xl bg-white shadow-2xl transition-all">
                                {/* Header */}
                                <div className="flex-shrink-0 rounded-t-xl border-b border-gray-200 bg-white px-6 py-4">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="rounded-lg bg-green-50 p-2.5">
                                                <Truck className="h-5 w-5 text-green-600" />
                                            </div>
                                            <div>
                                                <Dialog.Title className="text-lg font-semibold text-gray-900">
                                                    Issue Products
                                                </Dialog.Title>
                                                <p className="text-sm text-gray-500">
                                                    {safeText(
                                                        requisition.requisition_number,
                                                    )}{' '}
                                                    •{' '}
                                                    {safeText(
                                                        requisition.department
                                                            ?.name,
                                                    )}
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

                                {/* Body */}
                                <div className="flex-1 overflow-y-auto bg-slate-50 p-6">
                                    {/* Summary */}
                                    <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-6">
                                        <div className="rounded-lg border border-gray-200 bg-white p-3">
                                            <p className="text-xs text-gray-500">
                                                Requested By
                                            </p>
                                            <p className="text-sm font-medium text-gray-900">
                                                {safeText(
                                                    requisition.requester?.name,
                                                )}
                                            </p>
                                        </div>
                                        <div className="rounded-lg border border-gray-200 bg-white p-3">
                                            <p className="text-xs text-gray-500">
                                                Department
                                            </p>
                                            <p className="text-sm font-medium text-gray-900">
                                                {safeText(
                                                    requisition.department
                                                        ?.name,
                                                )}
                                            </p>
                                        </div>
                                        <div className="rounded-lg border border-gray-200 bg-white p-3">
                                            <p className="text-xs text-gray-500">
                                                Required By
                                            </p>
                                            <p className="text-sm font-medium text-gray-900">
                                                {formatDate(
                                                    requisition.required_by_date,
                                                )}
                                            </p>
                                        </div>
                                        <div className="rounded-lg border border-gray-200 bg-white p-3">
                                            <p className="text-xs text-gray-500">
                                                Priority
                                            </p>
                                            <span
                                                className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                                                    PRIORITY_CONFIG[
                                                        requisition.priority ??
                                                            ''
                                                    ]?.bgColor ?? 'bg-gray-100'
                                                } ${
                                                    PRIORITY_CONFIG[
                                                        requisition.priority ??
                                                            ''
                                                    ]?.color ?? 'text-gray-600'
                                                }`}
                                            >
                                                {PRIORITY_CONFIG[
                                                    requisition.priority ?? ''
                                                ]?.label ??
                                                    safeText(
                                                        requisition.priority,
                                                    )}
                                            </span>
                                        </div>
                                        <div className="rounded-lg border border-gray-200 bg-white p-3">
                                            <p className="text-xs text-gray-500">
                                                Budget Code
                                            </p>
                                            <p className="text-sm font-medium text-gray-900">
                                                {safeText(
                                                    requisition.budget_code,
                                                    'N/A',
                                                )}
                                            </p>
                                        </div>
                                        <div className="rounded-lg border border-gray-200 bg-white p-3">
                                            <p className="text-xs text-gray-500">
                                                Status
                                            </p>
                                            <span
                                                className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                                                    STATUS_CONFIG[
                                                        requisition.status ?? ''
                                                    ]?.bgColor ?? 'bg-gray-100'
                                                } ${
                                                    STATUS_CONFIG[
                                                        requisition.status ?? ''
                                                    ]?.color ?? 'text-gray-600'
                                                }`}
                                            >
                                                {STATUS_CONFIG[
                                                    requisition.status ?? ''
                                                ]?.label ??
                                                    safeText(
                                                        requisition.status,
                                                    )}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Items */}
                                    <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
                                        <div className="flex items-center justify-between border-b border-gray-200 bg-gray-50 px-4 py-3">
                                            <div className="flex items-center gap-2">
                                                <Package className="h-4 w-4 text-gray-500" />
                                                <span className="text-sm font-medium text-gray-700">
                                                    Items to Issue
                                                </span>
                                                <span className="text-xs text-gray-400">
                                                    (
                                                    {
                                                        Object.keys(
                                                            selectedItems,
                                                        ).length
                                                    }{' '}
                                                    selected of {items.length})
                                                </span>
                                            </div>
                                            {checkingStock && (
                                                <div className="flex items-center gap-2 text-sm text-gray-500">
                                                    <Loader2 className="h-4 w-4 animate-spin" />
                                                    Checking stock...
                                                </div>
                                            )}
                                        </div>
                                        <div className="overflow-x-auto">
                                            <table className="min-w-full divide-y divide-gray-200">
                                                <thead className="bg-gray-50/50">
                                                    <tr>
                                                        <th className="w-10 px-4 py-2 text-left text-xs font-medium text-gray-500">
                                                            #
                                                        </th>
                                                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">
                                                            Product
                                                        </th>
                                                        <th className="px-4 py-2 text-center text-xs font-medium text-gray-500">
                                                            Requested
                                                        </th>
                                                        <th className="px-4 py-2 text-center text-xs font-medium text-gray-500">
                                                            Available
                                                        </th>
                                                        <th className="px-4 py-2 text-center text-xs font-medium text-gray-500">
                                                            To Issue
                                                        </th>
                                                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">
                                                            Batch
                                                        </th>
                                                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">
                                                            Expiry
                                                        </th>
                                                        <th className="px-4 py-2 text-center text-xs font-medium text-gray-500">
                                                            Status
                                                        </th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-gray-200 bg-white">
                                                    {items.length === 0 ? (
                                                        <tr>
                                                            <td
                                                                colSpan={8}
                                                                className="px-4 py-8 text-center text-sm text-gray-500"
                                                            >
                                                                No items on this
                                                                requisition.
                                                            </td>
                                                        </tr>
                                                    ) : (
                                                        items.map(
                                                            (item, index) => {
                                                                const stock =
                                                                    stockAvailability[
                                                                        item
                                                                            .product_id
                                                                    ];
                                                                const isSelected =
                                                                    !!selectedItems[
                                                                        item.id
                                                                    ];
                                                                const isAvailable =
                                                                    stock?.is_sufficient ||
                                                                    false;
                                                                const availableStock =
                                                                    stock?.available ||
                                                                    0;

                                                                return (
                                                                    <tr
                                                                        key={
                                                                            item.id
                                                                        }
                                                                        className="transition-colors hover:bg-gray-50"
                                                                    >
                                                                        <td className="px-4 py-3 text-center text-sm text-gray-500">
                                                                            {index +
                                                                                1}
                                                                        </td>
                                                                        <td className="px-4 py-3">
                                                                            <p className="text-sm font-medium text-gray-900">
                                                                                {safeText(
                                                                                    item.product_name,
                                                                                    `Product #${item.product_id}`,
                                                                                )}
                                                                            </p>
                                                                            <p className="text-xs text-gray-500">
                                                                                Code:{' '}
                                                                                {safeText(
                                                                                    item.product_code,
                                                                                    'N/A',
                                                                                )}
                                                                            </p>
                                                                        </td>
                                                                        <td className="px-4 py-3 text-center text-sm text-gray-900">
                                                                            {toNumber(
                                                                                item.quantity_requested,
                                                                            )}{' '}
                                                                            {safeText(
                                                                                item.unit,
                                                                                '',
                                                                            )}
                                                                        </td>
                                                                        <td className="px-4 py-3 text-center">
                                                                            <span
                                                                                className={`text-sm font-medium ${
                                                                                    availableStock >
                                                                                    0
                                                                                        ? 'text-green-600'
                                                                                        : 'text-red-600'
                                                                                }`}
                                                                            >
                                                                                {
                                                                                    availableStock
                                                                                }{' '}
                                                                                {safeText(
                                                                                    item.unit,
                                                                                    '',
                                                                                )}
                                                                            </span>
                                                                            {!isAvailable &&
                                                                                availableStock ===
                                                                                    0 && (
                                                                                    <span className="ml-1 text-xs text-red-500">
                                                                                        (Out
                                                                                        of
                                                                                        stock)
                                                                                    </span>
                                                                                )}
                                                                            {!isAvailable &&
                                                                                availableStock >
                                                                                    0 && (
                                                                                    <span className="ml-1 text-xs text-orange-500">
                                                                                        (Short)
                                                                                    </span>
                                                                                )}
                                                                        </td>
                                                                        <td className="px-4 py-3 text-center">
                                                                            {isSelected ? (
                                                                                <input
                                                                                    type="number"
                                                                                    value={
                                                                                        selectedItems[
                                                                                            item
                                                                                                .id
                                                                                        ]
                                                                                            ?.quantity ||
                                                                                        0
                                                                                    }
                                                                                    onChange={(
                                                                                        e,
                                                                                    ) =>
                                                                                        handleQuantityChange(
                                                                                            item.id,
                                                                                            parseInt(
                                                                                                e
                                                                                                    .target
                                                                                                    .value,
                                                                                                10,
                                                                                            ) ||
                                                                                                0,
                                                                                        )
                                                                                    }
                                                                                    min="0"
                                                                                    max={Math.min(
                                                                                        toNumber(
                                                                                            item.quantity_requested,
                                                                                        ),
                                                                                        availableStock,
                                                                                    )}
                                                                                    className="w-20 rounded border border-gray-300 px-2 py-1 text-center text-sm focus:border-green-500 focus:ring-1 focus:ring-green-500 focus:outline-none"
                                                                                    disabled={
                                                                                        !isAvailable
                                                                                    }
                                                                                />
                                                                            ) : (
                                                                                <span className="text-sm text-gray-400">
                                                                                    -
                                                                                </span>
                                                                            )}
                                                                        </td>
                                                                        <td className="px-4 py-3">
                                                                            {isSelected && (
                                                                                <input
                                                                                    type="text"
                                                                                    value={
                                                                                        selectedItems[
                                                                                            item
                                                                                                .id
                                                                                        ]
                                                                                            ?.batch_number ||
                                                                                        ''
                                                                                    }
                                                                                    onChange={(
                                                                                        e,
                                                                                    ) =>
                                                                                        handleBatchChange(
                                                                                            item.id,
                                                                                            e
                                                                                                .target
                                                                                                .value,
                                                                                        )
                                                                                    }
                                                                                    placeholder="Batch #"
                                                                                    className="w-28 rounded border border-gray-300 px-2 py-1 text-sm focus:border-green-500 focus:ring-1 focus:ring-green-500 focus:outline-none"
                                                                                />
                                                                            )}
                                                                        </td>
                                                                        <td className="px-4 py-3">
                                                                            {isSelected && (
                                                                                <input
                                                                                    type="date"
                                                                                    value={
                                                                                        selectedItems[
                                                                                            item
                                                                                                .id
                                                                                        ]
                                                                                            ?.expiry_date ||
                                                                                        ''
                                                                                    }
                                                                                    onChange={(
                                                                                        e,
                                                                                    ) =>
                                                                                        handleExpiryChange(
                                                                                            item.id,
                                                                                            e
                                                                                                .target
                                                                                                .value,
                                                                                        )
                                                                                    }
                                                                                    className="w-32 rounded border border-gray-300 px-2 py-1 text-sm focus:border-green-500 focus:ring-1 focus:ring-green-500 focus:outline-none"
                                                                                />
                                                                            )}
                                                                        </td>
                                                                        <td className="px-4 py-3 text-center">
                                                                            <button
                                                                                onClick={() =>
                                                                                    toggleItemSelection(
                                                                                        item.id,
                                                                                        item,
                                                                                    )
                                                                                }
                                                                                disabled={
                                                                                    !isAvailable &&
                                                                                    !isSelected
                                                                                }
                                                                                className={`rounded-lg px-2 py-1 text-xs font-medium transition-colors ${
                                                                                    isSelected
                                                                                        ? 'bg-green-100 text-green-700 hover:bg-green-200'
                                                                                        : isAvailable
                                                                                          ? 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                                                                          : 'cursor-not-allowed bg-gray-100 text-gray-400'
                                                                                }`}
                                                                            >
                                                                                {isSelected ? (
                                                                                    <span className="flex items-center gap-1">
                                                                                        <Check className="h-3 w-3" />{' '}
                                                                                        Selected
                                                                                    </span>
                                                                                ) : (
                                                                                    <span className="flex items-center gap-1">
                                                                                        <Plus className="h-3 w-3" />{' '}
                                                                                        Select
                                                                                    </span>
                                                                                )}
                                                                            </button>
                                                                        </td>
                                                                    </tr>
                                                                );
                                                            },
                                                        )
                                                    )}
                                                </tbody>
                                                <tfoot className="bg-gray-50/50">
                                                    <tr>
                                                        <td
                                                            colSpan={2}
                                                            className="px-4 py-3 text-sm font-medium text-gray-700"
                                                        >
                                                            Summary
                                                        </td>
                                                        <td className="px-4 py-3 text-center text-sm font-medium text-gray-900">
                                                            {totalRequested}
                                                        </td>
                                                        <td className="px-4 py-3 text-center text-sm font-medium text-gray-900">
                                                            {
                                                                Object.keys(
                                                                    stockAvailability,
                                                                ).length
                                                            }{' '}
                                                            items checked
                                                        </td>
                                                        <td className="px-4 py-3 text-center text-sm font-medium text-green-600">
                                                            {totalSelected}
                                                        </td>
                                                        <td
                                                            colSpan={3}
                                                            className="px-4 py-3 text-right"
                                                        >
                                                            <span className="text-sm text-gray-500">
                                                                Previously
                                                                fulfilled:{' '}
                                                                {totalFulfilled}{' '}
                                                                units
                                                            </span>
                                                        </td>
                                                    </tr>
                                                </tfoot>
                                            </table>
                                        </div>
                                    </div>

                                    {requisition.justification && (
                                        <div className="mt-4 rounded-lg border border-gray-200 bg-white p-4">
                                            <p className="mb-1 text-xs text-gray-500">
                                                Justification
                                            </p>
                                            <p className="text-sm text-gray-700">
                                                {requisition.justification}
                                            </p>
                                        </div>
                                    )}
                                </div>

                                {/* Footer */}
                                <div className="flex-shrink-0 rounded-b-xl border-t border-gray-200 bg-white px-6 py-4">
                                    <div className="flex items-center justify-between">
                                        <div className="text-sm text-gray-500">
                                            {Object.keys(selectedItems).length}{' '}
                                            items selected • {totalSelected}{' '}
                                            units to issue
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <button
                                                onClick={onClose}
                                                className="rounded-lg px-4 py-2 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-100"
                                                disabled={submitting}
                                            >
                                                Cancel
                                            </button>
                                            <button
                                                onClick={handleSubmit}
                                                disabled={
                                                    submitting ||
                                                    Object.keys(selectedItems)
                                                        .length === 0
                                                }
                                                className={`flex items-center gap-2 rounded-lg px-6 py-2 text-sm font-medium text-white transition-colors ${
                                                    submitting ||
                                                    Object.keys(selectedItems)
                                                        .length === 0
                                                        ? 'cursor-not-allowed bg-gray-400'
                                                        : 'bg-green-600 hover:bg-green-700'
                                                }`}
                                            >
                                                {submitting ? (
                                                    <>
                                                        <Loader2 className="h-4 w-4 animate-spin" />
                                                        Processing...
                                                    </>
                                                ) : (
                                                    <>
                                                        <Truck className="h-4 w-4" />
                                                        Issue Products
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

// ============================================
// MAIN PAGE
// ============================================

export default function Issue() {
    const { props } = usePage<any>();
    const issues = props?.issues;
    console.log("deaprtments re",props);
    // ✅ Initialize from Inertia prop; never hit the 404ing API
    const [requisitions, setRequisitions] = useState<Requisition[]>(() =>
        normalizeRequisitions(
            Array.isArray(issues?.data) ? issues.data : asArray(issues),
        ),
    );
    const [loading, setLoading] = useState(false);
    const [selectedRequisition, setSelectedRequisition] =
        useState<Requisition | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);

    // Keep in sync when Inertia reloads the page (after fulfill)
    useEffect(() => {
        const rows = Array.isArray(issues?.data)
            ? issues.data
            : asArray(issues);
        setRequisitions(normalizeRequisitions(rows));
    }, [issues]);

    const fetchRequisitions = () => {
        setLoading(true);
        router.reload({
            only: ['issues'],
            onFinish: () => setLoading(false),
        });
    };

    const handleView = (requisition: Requisition) => {
        setSelectedRequisition(requisition);
        setIsModalOpen(true);
    };

    const handleFulfill = (requisition: Requisition) => {
        setSelectedRequisition(requisition);
        setIsModalOpen(true);
    };

    const handleSuccess = () => {
        fetchRequisitions();
    };

    const formatDate = (date: string | null | undefined) => {
        if (!date) return '—';
        try {
            return format(new Date(date), 'dd MMM yyyy HH:mm');
        } catch {
            return '—';
        }
    };

    const formatCurrency = (amount: unknown) => {
        const n = toNumber(amount);
        return new Intl.NumberFormat('en-ZM', {
            style: 'currency',
            currency: 'ZMW',
            minimumFractionDigits: 2,
        }).format(n);
    };

    // ✅ All columns reference only primitive/string fields — no object children
    const columns: Column<Requisition>[] = useMemo(
        () => [
            {
                id: 'requisition_number',
                label: 'Requisition #',
                minWidth: 120,
                sortable: true,
                format: (value) => (
                    <span className="font-mono text-sm font-medium text-blue-600">
                        {safeText(value)}
                    </span>
                ),
            },
            {
                id: 'department_name',
                label: 'Department',
                minWidth: 150,
                sortable: true,
                format: (_v, row) => (
                    <div>
                        <p className="text-sm font-medium text-gray-900">
                            {row.department_name}
                        </p>
                        {row.department_code && (
                            <p className="text-xs text-gray-500">
                                {row.department_code}
                            </p>
                        )}
                    </div>
                ),
            },
            {
                id: 'requester_name',
                label: 'Requested By',
                minWidth: 150,
                sortable: true,
                format: (_v, row) => (
                    <div>
                        <p className="text-sm font-medium text-gray-900">
                            {row.requester_name}
                        </p>
                        {row.requester_email && (
                            <p className="text-xs text-gray-500">
                                {row.requester_email}
                            </p>
                        )}
                    </div>
                ),
            },
            {
                id: 'items_count',
                label: 'Items',
                minWidth: 80,
                align: 'center',
                format: (value) => (
                    <span className="text-sm font-medium text-gray-900">
                        {toNumber(value)}
                    </span>
                ),
            },
            {
                id: 'total_quantity',
                label: 'Total Qty',
                minWidth: 90,
                align: 'right',
                format: (value) => (
                    <span className="text-sm font-medium text-gray-900">
                        {toNumber(value)}
                    </span>
                ),
            },
            {
                id: 'estimated_total',
                label: 'Estimated Total',
                minWidth: 120,
                align: 'right',
                format: (value) => (
                    <span className="text-sm font-medium text-gray-900">
                        {formatCurrency(value)}
                    </span>
                ),
            },
            {
                id: 'priority',
                label: 'Priority',
                minWidth: 100,
                format: (value) => {
                    const key = (value ?? '').toString();
                    const cfg = PRIORITY_CONFIG[key];
                    return (
                        <span
                            className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${cfg?.bgColor ?? 'bg-gray-100'} ${cfg?.color ?? 'text-gray-600'}`}
                        >
                            {cfg?.label ?? safeText(value)}
                        </span>
                    );
                },
            },
            {
                id: 'status',
                label: 'Status',
                minWidth: 130,
                filterType: 'status',
                statusColors: {
                    draft: 'default',
                    pending: 'warning',
                    approved: 'info',
                    rejected: 'error',
                    partially_fulfilled: 'warning',
                    fulfilled: 'success',
                    cancelled: 'default',
                },
                format: (value) => {
                    const key = (value ?? '').toString();
                    const config = STATUS_CONFIG[key];
                    if (!config) {
                        return (
                            <span className="text-sm text-gray-500">
                                {safeText(value)}
                            </span>
                        );
                    }
                    const Icon = config.icon;
                    return (
                        <span
                            className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${config.bgColor} ${config.color}`}
                        >
                            <Icon className="h-3 w-3" />
                            {config.label}
                        </span>
                    );
                },
            },
            {
                id: 'requested_at',
                label: 'Requested',
                minWidth: 150,
                sortable: true,
                format: (value) => (
                    <span className="text-sm text-gray-500">
                        {formatDate(value)}
                    </span>
                ),
            },
            {
                id: 'required_by_date',
                label: 'Required By',
                minWidth: 130,
                sortable: true,
                format: (value) => {
                    if (!value) {
                        return <span className="text-sm text-gray-500">—</span>;
                    }
                    const d = new Date(value as any);
                    const isUrgent =
                        !isNaN(d.getTime()) &&
                        d < new Date(Date.now() + 2 * 24 * 60 * 60 * 1000);
                    return (
                        <span
                            className={`text-sm ${isUrgent ? 'font-medium text-red-600' : 'text-gray-500'}`}
                        >
                            {formatDate(value as any)}
                            {isUrgent && (
                                <span className="ml-1 text-xs text-red-500">
                                    (Urgent)
                                </span>
                            )}
                        </span>
                    );
                },
            },
        ],
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [],
    );

    const actions: Action<Requisition>[] = [
        {
            label: 'View',
            icon: <Eye className="h-4 w-4" />,
            color: 'info',
            variant: 'text',
            onClick: handleView,
        },
        {
            label: 'Issue',
            icon: <Truck className="h-4 w-4" />,
            color: 'success',
            variant: 'contained',
            onClick: handleFulfill,
            show: (row) =>
                row.status === 'approved' || row.status === 'pending',
        },
    ];

    const statusOptions = [
        { value: 'pending', label: 'Pending' },
        { value: 'approved', label: 'Approved' },
        { value: 'partially_fulfilled', label: 'Partially Fulfilled' },
        { value: 'fulfilled', label: 'Fulfilled' },
        { value: 'rejected', label: 'Rejected' },
        { value: 'cancelled', label: 'Cancelled' },
    ];

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Issue Products" />

            <div className="min-h-screen bg-slate-100">
                <div className="p-6">
                    <div className="mb-6 flex items-center justify-between">
                        <div>
                            <h1 className="text-2xl font-semibold text-gray-900">
                                Issue Products
                            </h1>
                            <p className="text-sm text-gray-500">
                                Fulfill department requisitions from bulk store
                                inventory
                            </p>
                        </div>
                        <button
                            onClick={fetchRequisitions}
                            className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700"
                        >
                            <RefreshCw
                                className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`}
                            />
                            Refresh
                        </button>
                    </div>

                    <div className="w-full">
                        <div className="overflow-hidden rounded-lg bg-white shadow-sm">
                            <ReusableTable
                                columns={columns}
                                data={requisitions}
                                actions={actions}
                                title="Department Requisitions"
                                statusFilterKey="status"
                                statusOptions={statusOptions}
                                onRowClick={(row) => handleView(row)}
                                rowsPerPageOptions={[5, 10, 25, 50]}
                                defaultRowsPerPage={10}
                                defaultOrderBy="requested_at"
                                defaultOrder="desc"
                                emptyMessage={
                                    loading
                                        ? 'Loading requisitions...'
                                        : 'No pending requisitions found. All requisitions have been fulfilled.'
                                }
                                filterPlaceholder="Search requisitions..."
                                loading={loading}
                            />
                        </div>
                    </div>
                </div>
            </div>

            <IssueModal
                isOpen={isModalOpen}
                onClose={() => {
                    setIsModalOpen(false);
                    setSelectedRequisition(null);
                }}
                requisition={selectedRequisition}
                onSuccess={handleSuccess}
            />
        </AppLayout>
    );
}
