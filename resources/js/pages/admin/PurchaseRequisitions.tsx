// resources/js/pages/bulkstore/PurchaseRequisitions.tsx

import { Head, router, usePage } from '@inertiajs/react';
import JsBarcode from 'jsbarcode';
import {
    FileText,
    Eye,
    Trash2,
    CheckCircle,
    XCircle,
    Clock,
    AlertTriangle,
    TrendingUp,
    TrendingDown,
    Minus,
    Calendar,
    Building,
    ShoppingCart,
    Send,
    Wallet,
    Loader2,
    X,
    Key,
    Package,
    User as UserIcon,
    ClipboardList,
} from 'lucide-react';
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { toast } from 'react-hot-toast';
import Container from '@/components/container';
import ViewPurchaseOrderModal from '@/components/modals/ViewPurchaseOrderModal';
import PageHeader from '@/components/PageHeader';

import type { Column, Action } from '@/components/ReusableTable';
import { ReusableTable } from '@/components/ReusableTable';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import AppLayout from '@/layouts/app-layout';
import Http from '@/utils/Http';

// ============================================
// TYPES
// ============================================

interface Product {
    id: number;
    product_uuid: string;
    description: string;
    product_name: string;
    barcode: string | null;
    product_code: string;
    product_description: string | null;
    category_id: number;
    strength: string | null;
    unit: string | null;
    form: string | null;
    supplier_id: number | null;
    created_by: number | null;
    created_by_department: number | null;
    created_at: string;
    updated_at: string;
}

interface RequisitionItem {
    id: number;
    requisition_id: number;
    product_id: number;
    quantity: string;
    estimated_unit_price: string;
    estimated_total: number;
    required_by_date: string | null;
    notes: string | null;
    created_at: string;
    updated_at: string;
    product: Product;
}

interface BudgetCheck {
    has_sufficient_funds: boolean;
    budget_code: string;
    available_balance: number;
    requested_amount: number;
    budget_line: string;
    budget_holder: string;
    currency: string;
    message: string;
}

interface PurchaseRequisition {
    id: number;
    supplier_id: number | null;
    pr_number: string;
    pr_number_id: number | null;
    requisition_id: number | null;
    department_id: number | null;
    requested_by: number | null;
    request_date: string;
    required_date: string | null;
    priority: 'low' | 'medium' | 'high' | 'urgent';
    status:
        | 'draft'
        | 'pending'
        | 'approved'
        | 'rejected'
        | 'cancelled'
        | 'completed';
    justification: string | null;
    estimated_total: string;
    budget_code: string | null;
    cost_center: string | null;
    approved_by: number | null;
    approved_at: string | null;
    converted_to_po_id: number | null;
    funds_released: boolean;
    funds_released_at: string | null;
    funds_released_by: number | null;
    approval_code: string | null;
    approval_code_expires_at: string | null;
    created_at: string;
    updated_at: string;
    deleted_at: string | null;
    items: RequisitionItem[];
    po_number?: string;
    supplier_name?: string;
    supplier_code?: string;
    department_name?: string;
    total_amount?: number;
    paid_amount?: number;
    balance_amount?: number;
    payment_status?: string;
    shipping_address?: string;
    special_instructions?: string;
    budget_check?: BudgetCheck;
}

interface RequisitionStats {
    total: number;
    pending: number;
    approved: number;
    rejected: number;
    total_value: number;
    urgent_count: number;
    high_priority_count: number;
    funds_released: number;
}

interface Pagination {
    currentPage: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
}

interface Filters {
    search: string;
    status: string;
    priority: string;
    department: string;
}

interface PageProps {
    auth: {
        user?: { id: number; is_admin?: boolean; is_supervisor?: boolean };
    };
    orders: PurchaseRequisition[];
    pagination: Pagination;
    filters: Filters;
    stats: RequisitionStats;
    [key: string]: unknown;
}

type ActionDrawerMode = 'approve' | 'reject' | null;
type DetailDrawerMode = 'detail' | null;

// ============================================
// CONFIGURATION
// ============================================

const PRIORITY_CONFIG: Record<
    string,
    { label: string; color: string; icon: React.ReactNode }
> = {
    low: {
        label: 'Low',
        color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
        icon: <TrendingDown className="h-3 w-3" />,
    },
    medium: {
        label: 'Medium',
        color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
        icon: <Minus className="h-3 w-3" />,
    },
    high: {
        label: 'High',
        color: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
        icon: <TrendingUp className="h-3 w-3" />,
    },
    urgent: {
        label: 'Urgent',
        color: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
        icon: <AlertTriangle className="h-3 w-3" />,
    },
};

const STATUS_CONFIG: Record<
    string,
    { label: string; color: string; icon: React.ReactNode }
> = {
    draft: {
        label: 'Draft',
        color: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
        icon: <FileText className="h-3 w-3" />,
    },
    pending: {
        label: 'Pending',
        color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
        icon: <Clock className="h-3 w-3" />,
    },
    approved: {
        label: 'Approved',
        color: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
        icon: <CheckCircle className="h-3 w-3" />,
    },
    rejected: {
        label: 'Rejected',
        color: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
        icon: <XCircle className="h-3 w-3" />,
    },
    cancelled: {
        label: 'Cancelled',
        color: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
        icon: <XCircle className="h-3 w-3" />,
    },
    completed: {
        label: 'Completed',
        color: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400',
        icon: <CheckCircle className="h-3 w-3" />,
    },
};

// ============================================
// HELPERS (module-level)
// ============================================

const formatCurrency = (amount: string | number) => {
    const num = typeof amount === 'string' ? parseFloat(amount) : amount;
    if (isNaN(num)) return 'ZK0.00';
    return new Intl.NumberFormat('en-ZM', {
        style: 'currency',
        currency: 'ZMW',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    })
        .format(num)
        .replace('ZMW', 'ZK');
};

const formatDate = (date: string) => {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString('en-ZM', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
    });
};

const formatDateTime = (date: string) => {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString('en-ZM', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
};

const getDepartmentName = (departmentId: number | null) => {
    const departments: Record<number, string> = {
        1: 'Pharmacy',
        2: 'Nursing',
        3: 'Laboratory',
        4: 'Administration',
        5: 'Finance',
        6: 'Ward 2',
    };
    return departmentId
        ? departments[departmentId] || `Dept ${departmentId}`
        : 'N/A';
};

const transformToPurchaseOrder = (requisition: PurchaseRequisition) => {
    return {
        id: requisition.id,
        po_number: requisition.po_number || `PO-${requisition.pr_number}`,
        pr_number: requisition.pr_number,
        requisition_id: requisition.id,
        supplier_id: requisition.supplier_id || 0,
        supplier_name: requisition.supplier_name || 'N/A',
        supplier_code: requisition.supplier_code || '',
        department_id: requisition.department_id || 0,
        department_name:
            requisition.department_name ||
            getDepartmentName(requisition.department_id),
        budget_code: requisition.budget_code || 'N/A',
        order_date: requisition.request_date,
        expected_delivery_date:
            requisition.required_date || requisition.request_date,
        required_date: requisition.required_date,
        status:
            requisition.status === 'approved' ? 'approved' : requisition.status,
        priority: requisition.priority,
        total_amount: parseFloat(requisition.estimated_total || '0'),
        paid_amount: 0,
        balance_amount: parseFloat(requisition.estimated_total || '0'),
        payment_status: 'unpaid',
        shipping_address: requisition.shipping_address || '',
        special_instructions: requisition.justification || '',
        funds_released: requisition.funds_released || false,
        approval_code: requisition.approval_code || '',
        items:
            requisition.items?.map((item) => ({
                id: item.id,
                product_id: item.product_id,
                product_name:
                    item.product?.product_name || `Product #${item.product_id}`,
                product_code: item.product?.product_code || '',
                quantity: parseFloat(item.quantity),
                unit_price: parseFloat(item.estimated_unit_price || '0'),
                total: parseFloat(item.estimated_total?.toString() || '0'),
                received_quantity: 0,
                remaining_quantity: parseFloat(item.quantity),
                status: 'pending',
            })) || [],
        created_by: requisition.requested_by || 0,
        created_by_name: 'N/A',
        approved_by: requisition.approved_by || undefined,
        approved_by_name: 'N/A',
        approved_at: requisition.approved_at,
        created_at: requisition.created_at,
        updated_at: requisition.updated_at,
        justification: requisition.justification || '',
        request_date: requisition.request_date,
        items_count: requisition.items?.length || 0,
        items_sum_estimated_total: parseFloat(
            requisition.estimated_total || '0',
        ),
        supplier: {
            id: requisition.supplier_id || 0,
            supplier_name: requisition.supplier_name || 'N/A',
            supplier_code: requisition.supplier_code || '',
            address: requisition.shipping_address || '',
            phone: '',
            email: '',
            contact_person: '',
        },
        department: {
            id: requisition.department_id || 0,
            name:
                requisition.department_name ||
                getDepartmentName(requisition.department_id),
            code: '',
            description: '',
        },
    };
};

// ============================================
// REUSABLE: DRAWER SHELL
// ============================================

interface DrawerShellProps {
    isOpen: boolean;
    onClose: () => void;
    widthClass?: string;
    headerClassName?: string;
    headerIcon: React.ReactNode;
    title: string;
    subtitle?: string;
    footer: React.ReactNode;
    children: React.ReactNode;
    ariaLabel: string;
}

const DrawerShell: React.FC<DrawerShellProps> = ({
    isOpen,
    onClose,
    widthClass = 'max-w-xl',
    headerClassName = '',
    headerIcon,
    title,
    subtitle,
    footer,
    children,
    ariaLabel,
}) => {
    useEffect(() => {
        if (!isOpen) return;
        const prev = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        return () => {
            document.body.style.overflow = prev;
        };
    }, [isOpen]);

    useEffect(() => {
        if (!isOpen) return;
        const handler = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[10000]">
            <div
                className="absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity"
                onClick={onClose}
            />
            <div
                role="dialog"
                aria-modal="true"
                aria-label={ariaLabel}
                className={`absolute inset-y-0 right-0 flex w-full ${widthClass} flex-col bg-white shadow-2xl dark:bg-slate-900`}
            >
                <div
                    className={`flex-shrink-0 border-b px-5 py-4 ${headerClassName}`}
                >
                    <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                            <div className="mb-1 flex items-center gap-2">
                                {headerIcon}
                                <h2 className="truncate text-base font-semibold text-slate-900 dark:text-slate-100">
                                    {title}
                                </h2>
                            </div>
                            {subtitle && (
                                <p className="text-xs text-slate-600 dark:text-slate-400">
                                    {subtitle}
                                </p>
                            )}
                        </div>
                        <button
                            onClick={onClose}
                            className="flex-shrink-0 rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-white/70 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                            aria-label="Close"
                        >
                            <X className="h-5 w-5" />
                        </button>
                    </div>
                </div>

                <div className="flex-1 space-y-5 overflow-y-auto px-5 py-5">
                    {children}
                </div>

                <div className="flex-shrink-0 border-t border-slate-200 bg-white px-5 py-3 dark:border-slate-700 dark:bg-slate-900">
                    {footer}
                </div>
            </div>
        </div>
    );
};

// ============================================
// DRAWER 1: REQUISITION DETAILS (right-side)
// ============================================

interface DetailDrawerProps {
    mode: DetailDrawerMode;
    onClose: () => void;
    requisition: PurchaseRequisition | null;
    barcodeRef: React.RefObject<SVGSVGElement | null>;
    onApprove: (r: PurchaseRequisition) => void;
    onReject: (r: PurchaseRequisition) => void;
}

const DetailDrawer: React.FC<DetailDrawerProps> = ({
    mode,
    onClose,
    requisition,
    barcodeRef,
    onApprove,
    onReject,
}) => {
    const isOpen = mode === 'detail' && !!requisition;
    if (!isOpen || !requisition) return null;

    const items = requisition.items ?? [];
    const previewItems = items.slice(0, 8);
    const remaining = items.length - previewItems.length;

    return (
        <DrawerShell
            isOpen={isOpen}
            onClose={onClose}
            widthClass="max-w-2xl"
            ariaLabel="Requisition details"
            headerClassName="border-slate-200 bg-slate-50/70 dark:border-slate-700 dark:bg-slate-800/40"
            headerIcon={<ClipboardList className="h-5 w-5 text-blue-600" />}
            title="Requisition Details"
            subtitle={requisition.pr_number}
            footer={
                <div className="flex items-center justify-between gap-3">
                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-lg px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                    >
                        Close
                    </button>
                    {requisition.status === 'pending' && (
                        <div className="flex items-center gap-2">
                            <button
                                type="button"
                                onClick={() => onReject(requisition)}
                                className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-900/20"
                            >
                                <XCircle className="h-3.5 w-3.5" />
                                Reject
                            </button>
                            <button
                                type="button"
                                onClick={() => onApprove(requisition)}
                                disabled={!requisition.approval_code}
                                className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white shadow-sm hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                <CheckCircle className="h-3.5 w-3.5" />
                                Approve
                            </button>
                        </div>
                    )}
                </div>
            }
        >
            {/* Header card */}
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800/50">
                <div className="flex items-start justify-between gap-3">
                    <div>
                        <div className="mb-1 flex flex-wrap items-center gap-2">
                            <span className="font-mono text-sm font-semibold text-blue-600 dark:text-blue-400">
                                {requisition.pr_number}
                            </span>
                            <span
                                className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${
                                    STATUS_CONFIG[requisition.status]?.color ??
                                    ''
                                }`}
                            >
                                {STATUS_CONFIG[requisition.status]?.icon}
                                {STATUS_CONFIG[requisition.status]?.label}
                            </span>
                            <span
                                className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${
                                    PRIORITY_CONFIG[requisition.priority]
                                        ?.color ?? ''
                                }`}
                            >
                                {PRIORITY_CONFIG[requisition.priority]?.icon}
                                {PRIORITY_CONFIG[requisition.priority]?.label}
                            </span>
                        </div>
                        <div className="mt-0.5 flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400">
                            <Building className="h-3 w-3" />
                            <span>
                                {requisition.department_name ||
                                    getDepartmentName(
                                        requisition.department_id,
                                    )}
                            </span>
                        </div>
                    </div>
                    <div className="text-right">
                        <p className="text-[10px] tracking-wide text-slate-500 uppercase dark:text-slate-400">
                            Total
                        </p>
                        <p className="text-lg font-bold text-blue-600 dark:text-blue-400">
                            {formatCurrency(requisition.estimated_total)}
                        </p>
                    </div>
                </div>
            </div>

            {/* Barcode */}
            <div className="rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-800">
                <div className="flex flex-col items-center">
                    <svg ref={barcodeRef} />
                    <p className="mt-1 font-mono text-[10px] text-slate-500 dark:text-slate-400">
                        {requisition.pr_number}
                    </p>
                </div>
            </div>

            {/* Key facts */}
            <div className="grid grid-cols-2 gap-3">
                <FactCard
                    icon={<Calendar className="h-4 w-4 text-blue-600" />}
                    label="Request Date"
                    value={formatDate(requisition.request_date)}
                />
                <FactCard
                    icon={<Calendar className="h-4 w-4 text-blue-600" />}
                    label="Required By"
                    value={
                        requisition.required_date
                            ? formatDate(requisition.required_date)
                            : 'N/A'
                    }
                />
                <FactCard
                    icon={<Wallet className="h-4 w-4 text-emerald-600" />}
                    label="Budget Code"
                    value={requisition.budget_code || 'N/A'}
                    mono
                />
                <FactCard
                    icon={<Wallet className="h-4 w-4 text-emerald-600" />}
                    label="Cost Center"
                    value={requisition.cost_center || 'N/A'}
                    mono
                />
                <FactCard
                    icon={<UserIcon className="h-4 w-4 text-slate-500" />}
                    label="Requested By"
                    value={
                        requisition.requested_by
                            ? `User #${requisition.requested_by}`
                            : 'N/A'
                    }
                />
                <FactCard
                    icon={<Package className="h-4 w-4 text-amber-600" />}
                    label="Items"
                    value={String(items.length)}
                />
            </div>

            {/* Approval code hint (read-only info block, doesn't expose secret) */}
            {requisition.approval_code && requisition.status === 'pending' && (
                <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 dark:border-blue-900/50 dark:bg-blue-900/10">
                    <div className="flex items-start gap-2">
                        <Key className="mt-0.5 h-4 w-4 text-blue-600" />
                        <div className="text-xs">
                            <p className="font-semibold text-blue-800 dark:text-blue-300">
                                Approval required
                            </p>
                            <p className="mt-0.5 text-blue-700 dark:text-blue-400">
                                An approval code has been generated for this
                                requisition
                                {requisition.approval_code_expires_at && (
                                    <>
                                        , expiring{' '}
                                        <strong>
                                            {formatDateTime(
                                                requisition.approval_code_expires_at,
                                            )}
                                        </strong>
                                    </>
                                )}
                                . Use the Approve button to enter your personal
                                approval code.
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* Justification */}
            {requisition.justification && (
                <div>
                    <h3 className="mb-1.5 text-xs font-semibold tracking-wide text-slate-600 uppercase dark:text-slate-400">
                        Justification
                    </h3>
                    <div className="rounded-lg border border-slate-200 p-3 text-sm text-slate-700 dark:border-slate-700 dark:text-slate-300">
                        {requisition.justification}
                    </div>
                </div>
            )}

            {/* Items */}
            {items.length > 0 && (
                <div>
                    <div className="mb-1.5 flex items-center justify-between">
                        <h3 className="text-xs font-semibold tracking-wide text-slate-600 uppercase dark:text-slate-400">
                            Items
                        </h3>
                        <Badge variant="outline" className="text-[10px]">
                            {items.length}
                        </Badge>
                    </div>
                    <div className="overflow-hidden rounded-lg border border-slate-200 dark:border-slate-700">
                        <div className="overflow-x-auto">
                            <table className="w-full text-xs">
                                <thead className="bg-slate-50 dark:bg-slate-800">
                                    <tr>
                                        <th className="px-3 py-2 text-left text-[10px] font-medium tracking-wide text-slate-500 uppercase dark:text-slate-400">
                                            Product
                                        </th>
                                        <th className="px-3 py-2 text-center text-[10px] font-medium tracking-wide text-slate-500 uppercase dark:text-slate-400">
                                            Qty
                                        </th>
                                        <th className="px-3 py-2 text-right text-[10px] font-medium tracking-wide text-slate-500 uppercase dark:text-slate-400">
                                            Unit
                                        </th>
                                        <th className="px-3 py-2 text-right text-[10px] font-medium tracking-wide text-slate-500 uppercase dark:text-slate-400">
                                            Total
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                                    {previewItems.map((item) => (
                                        <tr
                                            key={item.id}
                                            className="hover:bg-slate-50 dark:hover:bg-slate-800/40"
                                        >
                                            <td className="px-3 py-2">
                                                <div className="text-xs font-medium text-slate-800 dark:text-slate-200">
                                                    {item.product
                                                        ?.product_name ||
                                                        `Product #${item.product_id}`}
                                                </div>
                                                {item.product?.product_code && (
                                                    <div className="font-mono text-[10px] text-slate-500 dark:text-slate-400">
                                                        {
                                                            item.product
                                                                .product_code
                                                        }
                                                    </div>
                                                )}
                                            </td>
                                            <td className="px-3 py-2 text-center text-slate-700 dark:text-slate-300">
                                                {parseFloat(
                                                    item.quantity,
                                                ).toLocaleString()}
                                            </td>
                                            <td className="px-3 py-2 text-right text-slate-700 dark:text-slate-300">
                                                {formatCurrency(
                                                    item.estimated_unit_price,
                                                )}
                                            </td>
                                            <td className="px-3 py-2 text-right font-semibold text-blue-600 dark:text-blue-400">
                                                {formatCurrency(
                                                    item.estimated_total,
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                    {remaining > 0 && (
                                        <tr>
                                            <td
                                                colSpan={4}
                                                className="px-3 py-2 text-center text-[10px] text-slate-400"
                                            >
                                                + {remaining} more items
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                                <tfoot className="border-t-2 border-slate-300 bg-slate-50 dark:border-slate-600 dark:bg-slate-800">
                                    <tr>
                                        <td
                                            colSpan={3}
                                            className="px-3 py-2 text-right text-xs font-semibold text-slate-700 dark:text-slate-300"
                                        >
                                            Total
                                        </td>
                                        <td className="px-3 py-2 text-right text-xs font-bold text-blue-600 dark:text-blue-400">
                                            {formatCurrency(
                                                requisition.estimated_total,
                                            )}
                                        </td>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {/* Timeline */}
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-[11px] text-slate-600 dark:border-slate-700 dark:bg-slate-800/40 dark:text-slate-400">
                <div className="flex items-center justify-between">
                    <span>Created</span>
                    <span className="font-mono">
                        {formatDateTime(requisition.created_at)}
                    </span>
                </div>
                {requisition.approved_at && (
                    <div className="mt-1 flex items-center justify-between text-emerald-600 dark:text-emerald-400">
                        <span>Approved</span>
                        <span className="font-mono">
                            {formatDateTime(requisition.approved_at)}
                        </span>
                    </div>
                )}
                {requisition.funds_released_at && (
                    <div className="mt-1 flex items-center justify-between text-emerald-600 dark:text-emerald-400">
                        <span>Funds released</span>
                        <span className="font-mono">
                            {formatDateTime(requisition.funds_released_at)}
                        </span>
                    </div>
                )}
            </div>
        </DrawerShell>
    );
};

// Small helper for the detail drawer
const FactCard: React.FC<{
    icon: React.ReactNode;
    label: string;
    value: string;
    mono?: boolean;
}> = ({ icon, label, value, mono }) => (
    <div className="rounded-lg border border-slate-200 p-3 dark:border-slate-700">
        <div className="mb-1 flex items-center gap-1.5">
            {icon}
            <span className="text-[10px] font-medium tracking-wide text-slate-500 uppercase dark:text-slate-400">
                {label}
            </span>
        </div>
        <p
            className={`truncate text-sm font-semibold text-slate-800 dark:text-slate-200 ${
                mono ? 'font-mono text-xs' : ''
            }`}
        >
            {value}
        </p>
    </div>
);

// ============================================
// DRAWER 2: APPROVE / REJECT (right-side)
// ============================================

interface ActionDrawerProps {
    mode: ActionDrawerMode;
    onClose: () => void;
    requisition: PurchaseRequisition | null;
    approvalCode: string;
    onApprovalCodeChange: (v: string) => void;
    approvalComments: string;
    onApprovalCommentsChange: (v: string) => void;
    rejectCode: string;
    onRejectCodeChange: (v: string) => void;
    rejectionReason: string;
    onRejectionReasonChange: (v: string) => void;
    onApprove: () => void;
    onReject: () => void;
    isProcessing: boolean;
}

const ActionDrawer: React.FC<ActionDrawerProps> = ({
    mode,
    onClose,
    requisition,
    approvalCode,
    onApprovalCodeChange,
    approvalComments,
    onApprovalCommentsChange,
    rejectCode,
    onRejectCodeChange,
    rejectionReason,
    onRejectionReasonChange,
    onApprove,
    onReject,
    isProcessing,
}) => {
    const isOpen = mode !== null && requisition !== null;
    if (!isOpen || !requisition) return null;

    const isApprove = mode === 'approve';
    const codeValue = isApprove ? approvalCode : rejectCode;
    const codeValid = codeValue.trim().length > 0;
    const reasonValid = !isApprove ? rejectionReason.trim().length > 0 : true;
    const canSubmit = codeValid && reasonValid && !isProcessing;

    const budget = requisition.budget_check;
    const estimatedTotal = parseFloat(requisition.estimated_total || '0');

    return (
        <DrawerShell
            isOpen={isOpen}
            onClose={onClose}
            widthClass="max-w-xl"
            ariaLabel={isApprove ? 'Approve requisition' : 'Reject requisition'}
            headerClassName={
                isApprove
                    ? 'border-emerald-200 bg-emerald-50/60 dark:border-emerald-900/50 dark:bg-emerald-900/10'
                    : 'border-red-200 bg-red-50/60 dark:border-red-900/50 dark:bg-red-900/10'
            }
            headerIcon={
                isApprove ? (
                    <CheckCircle className="h-5 w-5 text-emerald-600" />
                ) : (
                    <XCircle className="h-5 w-5 text-red-600" />
                )
            }
            title={isApprove ? 'Approve Requisition' : 'Reject Requisition'}
            subtitle={
                isApprove
                    ? 'Authorize this requisition using your personal approval code. Funds will be committed to the budget on approval.'
                    : 'Provide a rejection reason and your personal approval code. Reserved funds will be released back to the budget.'
            }
            footer={
                <div className="flex items-center justify-between gap-3">
                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-lg px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        onClick={isApprove ? onApprove : onReject}
                        disabled={!canSubmit}
                        className={`inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-xs font-semibold text-white shadow-sm transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
                            isApprove
                                ? 'bg-emerald-600 hover:bg-emerald-700'
                                : 'bg-red-600 hover:bg-red-700'
                        }`}
                    >
                        {isProcessing ? (
                            <>
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                {isApprove ? 'Approving…' : 'Rejecting…'}
                            </>
                        ) : (
                            <>
                                {isApprove ? (
                                    <CheckCircle className="h-3.5 w-3.5" />
                                ) : (
                                    <XCircle className="h-3.5 w-3.5" />
                                )}
                                {isApprove ? 'Approve' : 'Reject'}
                            </>
                        )}
                    </button>
                </div>
            }
        >
            {/* Summary */}
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800/50">
                <div className="mb-3 flex flex-wrap items-center gap-2">
                    <span className="font-mono text-sm font-semibold text-blue-600 dark:text-blue-400">
                        {requisition.pr_number}
                    </span>
                    <span
                        className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${
                            STATUS_CONFIG[requisition.status]?.color ?? ''
                        }`}
                    >
                        {STATUS_CONFIG[requisition.status]?.icon}
                        {STATUS_CONFIG[requisition.status]?.label}
                    </span>
                    <span
                        className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${
                            PRIORITY_CONFIG[requisition.priority]?.color ?? ''
                        }`}
                    >
                        {PRIORITY_CONFIG[requisition.priority]?.icon}
                        {PRIORITY_CONFIG[requisition.priority]?.label}
                    </span>
                </div>
                <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
                    <div>
                        <dt className="text-[10px] tracking-wide text-slate-500 uppercase dark:text-slate-400">
                            Department
                        </dt>
                        <dd className="font-medium text-slate-800 dark:text-slate-200">
                            {requisition.department_name ||
                                getDepartmentName(requisition.department_id)}
                        </dd>
                    </div>
                    <div>
                        <dt className="text-[10px] tracking-wide text-slate-500 uppercase dark:text-slate-400">
                            Items
                        </dt>
                        <dd className="font-medium text-slate-800 dark:text-slate-200">
                            {requisition.items?.length ?? 0}
                        </dd>
                    </div>
                    <div>
                        <dt className="text-[10px] tracking-wide text-slate-500 uppercase dark:text-slate-400">
                            Budget Code
                        </dt>
                        <dd className="font-mono text-slate-800 dark:text-slate-200">
                            {requisition.budget_code || 'N/A'}
                        </dd>
                    </div>
                    <div>
                        <dt className="text-[10px] tracking-wide text-slate-500 uppercase dark:text-slate-400">
                            Required By
                        </dt>
                        <dd className="text-slate-800 dark:text-slate-200">
                            {requisition.required_date
                                ? formatDate(requisition.required_date)
                                : 'N/A'}
                        </dd>
                    </div>
                </dl>
                <div className="mt-3 flex items-end justify-between border-t border-slate-200 pt-3 dark:border-slate-700">
                    <span className="text-[10px] tracking-wide text-slate-500 uppercase dark:text-slate-400">
                        Estimated Total
                    </span>
                    <span className="text-lg font-bold text-slate-900 dark:text-slate-100">
                        {formatCurrency(estimatedTotal)}
                    </span>
                </div>
            </div>

            {/* Budget preview */}
            {isApprove && budget && (
                <div
                    className={`rounded-xl border p-4 ${
                        budget.has_sufficient_funds
                            ? 'border-emerald-200 bg-emerald-50 dark:border-emerald-900/50 dark:bg-emerald-900/10'
                            : 'border-amber-200 bg-amber-50 dark:border-amber-900/50 dark:bg-amber-900/10'
                    }`}
                >
                    <div className="mb-2 flex items-center gap-2">
                        {budget.has_sufficient_funds ? (
                            <CheckCircle className="h-4 w-4 text-emerald-600" />
                        ) : (
                            <AlertTriangle className="h-4 w-4 text-amber-600" />
                        )}
                        <h3 className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                            Budget Preview
                        </h3>
                    </div>
                    <dl className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-[11px]">
                        <div className="flex justify-between">
                            <dt className="text-slate-500 dark:text-slate-400">
                                Available
                            </dt>
                            <dd className="font-mono text-slate-800 dark:text-slate-200">
                                {formatCurrency(budget.available_balance)}
                            </dd>
                        </div>
                        <div className="flex justify-between">
                            <dt className="text-slate-500 dark:text-slate-400">
                                Requested
                            </dt>
                            <dd className="font-mono text-slate-800 dark:text-slate-200">
                                {formatCurrency(budget.requested_amount)}
                            </dd>
                        </div>
                    </dl>
                    <p className="mt-2 text-[11px] text-slate-600 dark:text-slate-400">
                        {budget.message}
                    </p>
                </div>
            )}

            {/* Approval code */}
            <div className="space-y-1.5">
                <Label
                    htmlFor="action-drawer-code"
                    className="text-xs font-medium"
                >
                    Approval Code <span className="text-red-500">*</span>
                </Label>
                <div className="relative">
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                        <Key className="h-4 w-4 text-slate-400" />
                    </div>
                    <input
                        id="action-drawer-code"
                        type="password"
                        autoFocus
                        value={codeValue}
                        onChange={(e) =>
                            isApprove
                                ? onApprovalCodeChange(
                                      e.target.value.toUpperCase(),
                                  )
                                : onRejectCodeChange(
                                      e.target.value.toUpperCase(),
                                  )
                        }
                        placeholder="Enter your approval code"
                        autoComplete="new-password"
                        className={`w-full rounded-lg border py-2 pr-3 pl-10 font-mono text-sm tracking-wider uppercase focus:ring-2 focus:outline-none ${
                            isApprove
                                ? 'border-slate-300 focus:border-emerald-500 focus:ring-emerald-500/20 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100'
                                : 'border-slate-300 focus:border-red-500 focus:ring-red-500/20 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100'
                        }`}
                    />
                </div>
                <p className="text-[10px] text-slate-500 dark:text-slate-400">
                    This is the personal approval code on your user account. It
                    is never shown on the requisition.
                </p>
            </div>

            {/* Comments / Reason */}
            <div className="space-y-1.5">
                <Label
                    htmlFor="action-drawer-notes"
                    className="text-xs font-medium"
                >
                    {isApprove ? 'Comments (Optional)' : 'Rejection Reason'}{' '}
                    {!isApprove && <span className="text-red-500">*</span>}
                </Label>
                <textarea
                    id="action-drawer-notes"
                    rows={3}
                    value={isApprove ? approvalComments : rejectionReason}
                    onChange={(e) =>
                        isApprove
                            ? onApprovalCommentsChange(e.target.value)
                            : onRejectionReasonChange(e.target.value)
                    }
                    placeholder={
                        isApprove
                            ? 'Add any notes for the record…'
                            : 'Explain why this requisition is being rejected…'
                    }
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs focus:border-slate-500 focus:ring-2 focus:ring-slate-500/10 focus:outline-none dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100"
                />
            </div>

            {/* Confirmation */}
            <Alert
                className={`py-2 ${
                    isApprove
                        ? 'border-emerald-200 bg-emerald-50 dark:border-emerald-900/50 dark:bg-emerald-900/10'
                        : 'border-red-200 bg-red-50 dark:border-red-900/50 dark:bg-red-900/10'
                }`}
            >
                {isApprove ? (
                    <CheckCircle className="h-3.5 w-3.5 text-emerald-600" />
                ) : (
                    <AlertTriangle className="h-3.5 w-3.5 text-red-600" />
                )}
                <AlertTitle className="text-[11px] font-medium text-slate-800 dark:text-slate-200">
                    {isApprove
                        ? 'This will approve the requisition'
                        : 'This will reject the requisition'}
                </AlertTitle>
                <AlertDescription className="text-[11px] text-slate-600 dark:text-slate-400">
                    {isApprove
                        ? 'Reserved funds will be committed. You can release them afterwards.'
                        : 'Any reserved funds will be released back to the budget. This cannot be undone.'}
                </AlertDescription>
            </Alert>
        </DrawerShell>
    );
};

// ============================================
// MAIN COMPONENT
// ============================================

export default function PurchaseRequisition() {
    const { props } = usePage<PageProps>();
    const {
        auth,
        orders = [],
        pagination: propPagination = {
            currentPage: 1,
            pageSize: 10,
            totalItems: 0,
            totalPages: 1,
        },
        filters: propFilters = {
            search: '',
            status: '',
            priority: '',
            department: '',
        },
        stats: _propStats = {
            total: 0,
            pending: 0,
            approved: 0,
            rejected: 0,
            total_value: 0,
            urgent_count: 0,
            high_priority_count: 0,
            funds_released: 0,
        },
    } = props;

    const barcodeRef = useRef<SVGSVGElement>(null);

    // ---- UI state ----
    const [loading, setLoading] = useState(false);
    const [selectedRequisition, setSelectedRequisition] =
        useState<PurchaseRequisition | null>(null);

    // ---- Filters (mirror props) ----
    const [searchTerm, setSearchTerm] = useState(propFilters.search);
    const [statusFilter, setStatusFilter] = useState(propFilters.status);
    const [priorityFilter, setPriorityFilter] = useState(propFilters.priority);
    const [departmentFilter, setDepartmentFilter] = useState(
        propFilters.department,
    );

    // ---- Drawers ----
    const [detailDrawerMode, setDetailDrawerMode] =
        useState<DetailDrawerMode>(null);
    const [actionDrawerMode, setActionDrawerMode] =
        useState<ActionDrawerMode>(null);

    // ---- Modals ----
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [showConvertModal, setShowConvertModal] = useState(false);
    const [showReleaseFundsModal, setShowReleaseFundsModal] = useState(false);
    const [showFundsReleasedModal, setShowFundsReleasedModal] = useState(false);
    const [showViewPOModal, setShowViewPOModal] = useState(false);

    // ---- Form state ----
    const [rejectionReason, setRejectionReason] = useState('');
    const [approvalComments, setApprovalComments] = useState('');
    const [fundReleaseComments, setFundReleaseComments] = useState('');
    const [approvalCode, setApprovalCode] = useState('');
    const [rejectCode, setRejectCode] = useState('');
    const [fundReleaseCode, setFundReleaseCode] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);

    // ============================================
    // EFFECTS
    // ============================================

    useEffect(() => {
        setSearchTerm(propFilters.search);
    }, [propFilters.search]);

    useEffect(() => {
        setStatusFilter(propFilters.status);
    }, [propFilters.status]);

    useEffect(() => {
        setPriorityFilter(propFilters.priority);
    }, [propFilters.priority]);

    useEffect(() => {
        setDepartmentFilter(propFilters.department);
    }, [propFilters.department]);

    useEffect(() => {
        const offStart = router.on('start', () => setLoading(true));
        const offFinish = router.on('finish', () => setLoading(false));
        return () => {
            offStart();
            offFinish();
        };
    }, []);

    // Barcode — inlined (no useCallback → no TDZ risk)
    useEffect(() => {
        const isOpen = detailDrawerMode === 'detail';
        if (!isOpen) return;
        if (!selectedRequisition) return;
        if (!barcodeRef.current) return;

        try {
            JsBarcode(barcodeRef.current, selectedRequisition.pr_number, {
                format: 'CODE128',
                width: 1.6,
                height: 44,
                displayValue: false,
                margin: 4,
                background: '#ffffff',
                lineColor: '#000000',
            });
        } catch (error) {
            console.error('Barcode generation failed:', error);
        }
    }, [detailDrawerMode, selectedRequisition]);

    // ============================================
    // SERVER VISITS
    // ============================================

    const visit = (overrides: Record<string, unknown> = {}) => {
        router.get(
            '/admin/purchase-requisitions',
            {
                search: searchTerm,
                status: statusFilter,
                priority: priorityFilter,
                department: departmentFilter,
                page: propPagination.currentPage,
                page_size: propPagination.pageSize,
                ...overrides,
            },
            {
                preserveState: true,
                preserveScroll: true,
                only: ['orders', 'pagination', 'filters', 'stats'],
            },
        );
    };

    const reloadTable = () => {
        router.reload({
            only: ['orders', 'pagination', 'filters', 'stats'],
        });
    };

    // ============================================
    // HANDLERS
    // ============================================

    const openDetailDrawer = (requisition: PurchaseRequisition) => {
        setSelectedRequisition(requisition);
        setDetailDrawerMode('detail');
    };

    const closeDetailDrawer = () => {
        setDetailDrawerMode(null);
        // Keep selectedRequisition — action drawer may want it.
    };

    const handleView = (requisition: PurchaseRequisition) => {
        if (
            requisition.status === 'approved' ||
            requisition.status === 'completed'
        ) {
            setSelectedRequisition(requisition);
            setShowViewPOModal(true);
        } else {
            openDetailDrawer(requisition);
        }
    };

    const handleApprove = (requisition: PurchaseRequisition) => {
        setSelectedRequisition(requisition);
        setApprovalComments('');
        setApprovalCode('');
        setDetailDrawerMode(null);
        setActionDrawerMode('approve');
    };

    const handleReject = (requisition: PurchaseRequisition) => {
        setSelectedRequisition(requisition);
        setRejectionReason('');
        setRejectCode('');
        setDetailDrawerMode(null);
        setActionDrawerMode('reject');
    };

    const closeActionDrawer = () => {
        setActionDrawerMode(null);
        setApprovalCode('');
        setRejectCode('');
        setApprovalComments('');
        setRejectionReason('');
    };

    const handleDelete = (requisition: PurchaseRequisition) => {
        setSelectedRequisition(requisition);
        setShowDeleteModal(true);
    };

    const handleConvertToPO = (requisition: PurchaseRequisition) => {
        setSelectedRequisition(requisition);
        setShowConvertModal(true);
    };

    const handleViewPO = (requisition: PurchaseRequisition) => {
        setSelectedRequisition(requisition);
        setShowViewPOModal(true);
    };

    const handleReleaseFunds = (requisition: PurchaseRequisition) => {
        setSelectedRequisition(requisition);
        setFundReleaseComments('');
        setFundReleaseCode('');
        setShowReleaseFundsModal(true);
    };

    const handleConfirmApprove = async () => {
        if (!selectedRequisition) return;
        if (!approvalCode.trim()) {
            toast.error('Please enter the approval code');
            return;
        }
        setIsProcessing(true);
        try {
            const response = await Http.post(
                `/admin/purchase-requisition/${selectedRequisition.id}/approve`,
                {
                    approval_code: approvalCode,
                    comments: approvalComments,
                    approved_by: auth?.user?.id,
                },
            );
            if (response.data) {
                toast.success(
                    `Requisition ${selectedRequisition.pr_number} approved successfully`,
                );
                reloadTable();
                closeActionDrawer();
                setSelectedRequisition(null);
            } else {
                toast.error(response.message || 'Approval failed');
            }
        } catch (error) {
            console.error('Approval failed:', error);
            toast.error(
                'Failed to approve requisition. Invalid approval code?',
            );
        } finally {
            setIsProcessing(false);
        }
    };

    const handleConfirmReject = async () => {
        if (!selectedRequisition) return;
        if (!rejectionReason.trim()) {
            toast.error('Please provide a reason for rejection');
            return;
        }
        if (!rejectCode.trim()) {
            toast.error('Please enter the approval code');
            return;
        }
        setIsProcessing(true);
        try {
            const response = await Http.post(
                `/admin/purchase-requisition/${selectedRequisition.id}/reject`,
                {
                    approval_code: rejectCode,
                    rejection_reason: rejectionReason,
                    rejected_by: auth?.user?.id || 1,
                },
            );
            if (response.data) {
                toast.success(
                    `Requisition ${selectedRequisition.pr_number} rejected`,
                );
                reloadTable();
                closeActionDrawer();
                setSelectedRequisition(null);
            } else {
                toast.error(response.message || 'Rejection failed');
            }
        } catch (error) {
            console.error('Rejection failed:', error);
            toast.error('Failed to reject requisition. Invalid approval code?');
        } finally {
            setIsProcessing(false);
        }
    };

    const handleConfirmDelete = async () => {
        if (!selectedRequisition) return;
        setIsProcessing(true);
        try {
            const response = await Http.delete(
                `/admin/purchase-orders/${selectedRequisition.id}`,
            );
            if (response.data) {
                toast.success(
                    `Requisition ${selectedRequisition.pr_number} deleted`,
                );
                reloadTable();
                setShowDeleteModal(false);
                setSelectedRequisition(null);
            } else {
                toast.error(response.message || 'Delete failed');
            }
        } catch (error) {
            console.error('Delete failed:', error);
            toast.error('Failed to delete requisition');
        } finally {
            setIsProcessing(false);
        }
    };

    const handleConfirmConvert = async () => {
        if (!selectedRequisition) return;
        setIsProcessing(true);
        try {
            const response = await Http.post(
                `/admin/purchase-orders/${selectedRequisition.id}/convert-to-po`,
            );
            if (response.data) {
                toast.success(
                    `Requisition ${selectedRequisition.pr_number} converted to PO successfully`,
                );
                reloadTable();
                setShowConvertModal(false);
                setSelectedRequisition(null);
            } else {
                toast.error(response.message || 'Conversion failed');
            }
        } catch (error) {
            console.error('Conversion failed:', error);
            toast.error('Failed to convert to PO');
        } finally {
            setIsProcessing(false);
        }
    };

    const handleConfirmReleaseFunds = async () => {
        if (!selectedRequisition) return;
        if (!fundReleaseCode.trim()) {
            toast.error('Please enter the approval code');
            return;
        }
        setIsProcessing(true);
        try {
            const response = await Http.post(
                `/admin/purchase-order/${selectedRequisition.id}/release-funds`,
                {
                    approval_code: fundReleaseCode,
                    comments: fundReleaseComments,
                    released_by: auth?.user?.id || 1,
                },
            );
            if (response.data) {
                toast.success(
                    `Funds released for requisition ${selectedRequisition.pr_number}`,
                );
                reloadTable();
                setShowReleaseFundsModal(false);
                setShowFundsReleasedModal(true);
                setSelectedRequisition(null);
                setFundReleaseComments('');
                setFundReleaseCode('');
            } else {
                toast.error(response.message || 'Fund release failed');
            }
        } catch (error) {
            console.error('Fund release failed:', error);
            toast.error('Failed to release funds. Invalid approval code?');
        } finally {
            setIsProcessing(false);
        }
    };

    const handleConvertedToPO = () => {
        reloadTable();
        setShowViewPOModal(false);
        toast.success('Purchase Order created successfully!');
    };

    // ============================================
    // TABLE DEFINITIONS
    // ============================================

    const columns: Column<PurchaseRequisition>[] = [
        {
            id: 'pr_number',
            label: 'PR #',
            minWidth: 100,
            format: (value) => (
                <span className="font-mono text-sm font-medium text-blue-600 dark:text-blue-400">
                    {value || 'N/A'}
                </span>
            ),
            sortable: true,
        },
        {
            id: 'department_id',
            label: 'Department',
            minWidth: 100,
            format: (value) => (
                <div className="flex items-center gap-1.5">
                    <Building className="h-3 w-3 text-slate-400" />
                    <span className="text-sm text-slate-700 dark:text-slate-300">
                        {getDepartmentName(value)}
                    </span>
                </div>
            ),
        },
        {
            id: 'priority',
            label: 'Priority',
            minWidth: 80,
            format: (value) => {
                const config = PRIORITY_CONFIG[value] || PRIORITY_CONFIG.medium;
                return (
                    <span
                        className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${config.color}`}
                    >
                        {config.icon}
                        {config.label}
                    </span>
                );
            },
            sortable: true,
        },
        {
            id: 'estimated_total',
            label: 'Total',
            minWidth: 100,
            format: (value) => (
                <div className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                    {formatCurrency(value)}
                </div>
            ),
            sortable: true,
        },
        {
            id: 'status',
            label: 'Status',
            minWidth: 90,
            format: (value) => {
                const config = STATUS_CONFIG[value] || STATUS_CONFIG.draft;
                return (
                    <span
                        className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${config.color}`}
                    >
                        {config.icon}
                        {config.label}
                    </span>
                );
            },
            sortable: true,
        },
        {
            id: 'funds_released',
            label: 'Funds',
            minWidth: 80,
            format: (value) => (
                <span
                    className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${
                        value
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400'
                            : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
                    }`}
                >
                    <Wallet className="h-3 w-3" />
                    {value ? 'Released' : 'Pending'}
                </span>
            ),
            sortable: true,
        },
        {
            id: 'request_date',
            label: 'Request Date',
            minWidth: 90,
            format: (value) => (
                <div className="text-xs text-slate-600 dark:text-slate-400">
                    {formatDate(value)}
                </div>
            ),
            sortable: true,
        },
    ];

    const actions: Action<PurchaseRequisition>[] = [
        {
            label: 'View',
            icon: <Eye className="h-4 w-4" />,
            color: 'primary',
            onClick: handleView,
        },
        {
            label: 'Approve',
            icon: <CheckCircle className="h-4 w-4" />,
            color: 'success',
            onClick: handleApprove,
            show: (row) =>
                row.status === 'pending' && row.approval_code !== null,
        },
        {
            label: 'Reject',
            icon: <XCircle className="h-4 w-4" />,
            color: 'error',
            onClick: handleReject,
            show: (row) => row.status === 'pending',
        },
        {
            label: 'Release Funds',
            icon: <Wallet className="h-4 w-4" />,
            color: 'success',
            onClick: handleReleaseFunds,
            show: (row) => row.status === 'approved' && !row.funds_released,
        },
        {
            label: 'Convert to PO',
            icon: <Send className="h-4 w-4" />,
            color: 'warning',
            onClick: handleConvertToPO,
            show: (row) => row.status === 'approved' && !row.converted_to_po_id,
        },
        {
            label: 'View PO',
            icon: <FileText className="h-4 w-4" />,
            color: 'info',
            onClick: handleViewPO,
            show: (row) =>
                row.status === 'approved' && row.converted_to_po_id !== null,
        },
        {
            label: 'Delete',
            icon: <Trash2 className="h-4 w-4" />,
            color: 'error',
            onClick: handleDelete,
            show: (row) => row.status === 'draft' || row.status === 'rejected',
        },
    ];

    const statusOptions = Object.entries(STATUS_CONFIG).map(([key, value]) => ({
        value: key,
        label: value.label,
    }));

    const priorityOptions = Object.entries(PRIORITY_CONFIG).map(
        ([key, value]) => ({
            value: key,
            label: value.label,
        }),
    );

    const departmentOptions = useMemo(() => {
        return Array.from(new Set(orders.map((r) => r.department_id)))
            .filter(Boolean)
            .map((deptId) => ({
                value: String(deptId),
                label: getDepartmentName(deptId),
            }));
    }, [orders]);

    // ============================================
    // RENDER
    // ============================================

    return (
        <AppLayout
            breadcrumbs={[
                { title: 'Altaf Memorial Hospital', href: '/' },
                { title: 'Administration', href: '' },
                { title: 'Purchase Requisitions', href: '' },
            ]}
        >
            <div className="min-h-screen bg-blue-50">
                <PageHeader
                    icon={<ShoppingCart className="h-6 w-6" />}
                    title="Purchase Requisitions"
                    subtitle="Manage purchase requisitions and approvals"
                />

                <div className="p-4">
                    <ReusableTable
                        columns={columns}
                        data={orders}
                        actions={actions}
                        loading={loading}
                        title="Purchase Requisitions"
                        rowsPerPageOptions={[10, 25, 50, 100]}
                        defaultRowsPerPage={propPagination.pageSize}
                        defaultOrderBy="created_at"
                        defaultOrder="desc"
                        filterPlaceholder="Search by PR #, department..."
                        statusFilterKey="status"
                        statusOptions={statusOptions}
                        additionalFilters={[
                            {
                                key: 'priority',
                                label: 'Priority',
                                options: priorityOptions,
                                value: priorityFilter,
                                onChange: (v: string) => {
                                    setPriorityFilter(v);
                                    visit({ priority: v, page: 1 });
                                },
                            },
                            {
                                key: 'department',
                                label: 'Department',
                                options: departmentOptions,
                                value: departmentFilter,
                                onChange: (v: string) => {
                                    setDepartmentFilter(v);
                                    visit({ department: v, page: 1 });
                                },
                            },
                        ]}
                        emptyMessage="No purchase requisitions found"
                        onSearchChange={(value) => {
                            setSearchTerm(value);
                            visit({ search: value, page: 1 });
                        }}
                        onPageChange={(page) => {
                            visit({ page });
                        }}
                        onPageSizeChange={(size) => {
                            visit({ page_size: size, page: 1 });
                        }}
                        pagination={propPagination}
                    />
                </div>
            </div>

            {/* ================= DRAWER 1: DETAILS ================= */}
            <DetailDrawer
                mode={detailDrawerMode}
                onClose={closeDetailDrawer}
                requisition={selectedRequisition}
                barcodeRef={barcodeRef}
                onApprove={handleApprove}
                onReject={handleReject}
            />

            {/* ================= DRAWER 2: APPROVE / REJECT ================= */}
            <ActionDrawer
                mode={actionDrawerMode}
                onClose={closeActionDrawer}
                requisition={selectedRequisition}
                approvalCode={approvalCode}
                onApprovalCodeChange={setApprovalCode}
                approvalComments={approvalComments}
                onApprovalCommentsChange={setApprovalComments}
                rejectCode={rejectCode}
                onRejectCodeChange={setRejectCode}
                rejectionReason={rejectionReason}
                onRejectionReasonChange={setRejectionReason}
                onApprove={handleConfirmApprove}
                onReject={handleConfirmReject}
                isProcessing={isProcessing}
            />

            {/* ================= VIEW PO MODAL ================= */}
            {selectedRequisition && (
                <ViewPurchaseOrderModal
                    isOpen={showViewPOModal}
                    onClose={() => {
                        setShowViewPOModal(false);
                        setSelectedRequisition(null);
                    }}
                    purchaseOrder={transformToPurchaseOrder(
                        selectedRequisition,
                    )}
                    onConvertToPO={
                        selectedRequisition.status === 'approved' &&
                        !selectedRequisition.converted_to_po_id
                            ? handleConvertedToPO
                            : undefined
                    }
                    onReleaseFunds={
                        selectedRequisition.status === 'approved' &&
                        !selectedRequisition.funds_released
                            ? () => handleReleaseFunds(selectedRequisition)
                            : undefined
                    }
                    userRole={
                        auth?.user?.is_admin
                            ? 'admin'
                            : auth?.user?.is_supervisor
                              ? 'supervisor'
                              : 'staff'
                    }
                />
            )}
        </AppLayout>
    );
}
