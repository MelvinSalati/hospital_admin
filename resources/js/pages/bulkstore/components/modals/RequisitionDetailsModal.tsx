// resources/js/pages/bulkstore/components/modals/RequisitionDetailsModal.tsx

import {
    Dialog,
    DialogPanel,
    DialogTitle,
    Transition,
    TransitionChild,
} from '@headlessui/react';
import { format } from 'date-fns';
import {
    X,
    FileText,
    Package,
    DollarSign,
    Calendar,
    User,
    Building2,
    Hash,
    CheckCircle,
    XCircle,
    Clock,
    AlertCircle,
    FileCheck,
    Printer,
    Download,
    Share2,
    Barcode,
    Copy,
    Mail,
    Phone,
    MapPin,
    CreditCard,
    Truck,
    Box,
    Layers,
    Calendar as CalendarIcon,
    UserCheck,
    FileSignature,
    Shield,
    Tag,
    Gift,
    ShoppingBag,
    Archive,
    Link,
    ExternalLink,
    ChevronDown,
    ChevronUp,
    Info,
    CheckSquare,
    ClipboardCheck,
    FlaskConical,
    Pill,
    Syringe,
    Thermometer,
} from 'lucide-react';
import React, { Fragment, useState } from 'react';

// ============================================
// TYPES - Updated to match actual API response
// ============================================

interface Product {
    id: number;
    product_name: string;
    product_code: string;
    description?: string;
    category_id?: number;
    supplier_id?: number;
    quantity?: string;
    unit?: string;
    strength?: string;
    form?: string;
    expiry_date?: string;
    transaction_type?: string;
    from_deparment_id?: number;
    to_department_id?: number;
    created_by?: number;
    created_by_department?: number;
    created_at?: string;
    updated_at?: string;
    product_uuid?: string;
}

interface RequisitionItem {
    id: number;
    requisition_id: number;
    product_id: number;
    quantity: string | number;
    estimated_unit_price: string | number;
    estimated_total: string | number;
    required_by_date: string;
    notes?: string | null;
    created_at?: string;
    updated_at?: string;
    product?: Product;  // Nested product data from eager loading
}

interface Department {
    id: number;
    name: string;
    code: string;
    description?: string;
    department_uuid?: string | null;
}

interface Requisition {
    id: number;
    pr_number: string;
    requisition_id?: string | null;
    pr_number_id?: string | null;
    department_id: number;
    department?: Department;
    requested_by?: number | null;
    request_date?: string;
    required_date?: string;
    priority: 'low' | 'medium' | 'high' | 'urgent';
    status: 'draft' | 'pending' | 'approved' | 'rejected' | 'converted' | 'cancelled';
    justification?: string;
    estimated_total: string | number;
    budget_code?: string;
    cost_center?: string;
    approved_by?: number | null;
    approved_at?: string | null;
    converted_to_po_id?: number | null;
    created_at: string;
    updated_at: string;
    deleted_at?: string | null;
    items: RequisitionItem[];
    items_count?: number;
    items_sum_estimated_total?: number;
    total_amount?: number;
}

interface RequisitionDetailsModalProps {
    isOpen: boolean;
    onClose: () => void;
    requisition: Requisition | null;
    onApprove?: (id: number) => void;
    onReject?: (id: number) => void;
    onConvertToPO?: (id: number) => void;
}

// ============================================
// STATUS & PRIORITY CONFIG
// ============================================

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: any; bgColor: string }> = {
    draft: {
        label: 'Draft',
        color: 'text-gray-600 dark:text-gray-400',
        icon: FileText,
        bgColor: 'bg-gray-50 dark:bg-gray-800/30',
    },
    pending: {
        label: 'Pending Approval',
        color: 'text-yellow-600 dark:text-yellow-400',
        icon: Clock,
        bgColor: 'bg-yellow-50 dark:bg-yellow-900/20',
    },
    approved: {
        label: 'Approved',
        color: 'text-green-600 dark:text-green-400',
        icon: CheckCircle,
        bgColor: 'bg-green-50 dark:bg-green-900/20',
    },
    rejected: {
        label: 'Rejected',
        color: 'text-red-600 dark:text-red-400',
        icon: XCircle,
        bgColor: 'bg-red-50 dark:bg-red-900/20',
    },
    converted: {
        label: 'Converted to PO',
        color: 'text-blue-600 dark:text-blue-400',
        icon: FileCheck,
        bgColor: 'bg-blue-50 dark:bg-blue-900/20',
    },
    cancelled: {
        label: 'Cancelled',
        color: 'text-gray-500 dark:text-gray-400',
        icon: AlertCircle,
        bgColor: 'bg-gray-50 dark:bg-gray-800/30',
    },
};

const PRIORITY_CONFIG: Record<string, { label: string; color: string; bgColor: string; borderColor: string }> = {
    low: {
        label: 'Low',
        color: 'text-blue-600 dark:text-blue-400',
        bgColor: 'bg-blue-50 dark:bg-blue-900/20',
        borderColor: 'border-blue-200 dark:border-blue-800',
    },
    medium: {
        label: 'Medium',
        color: 'text-yellow-600 dark:text-yellow-400',
        bgColor: 'bg-yellow-50 dark:bg-yellow-900/20',
        borderColor: 'border-yellow-200 dark:border-yellow-800',
    },
    high: {
        label: 'High',
        color: 'text-orange-600 dark:text-orange-400',
        bgColor: 'bg-orange-50 dark:bg-orange-900/20',
        borderColor: 'border-orange-200 dark:border-orange-800',
    },
    urgent: {
        label: 'Urgent',
        color: 'text-red-600 dark:text-red-400',
        bgColor: 'bg-red-50 dark:bg-red-900/20',
        borderColor: 'border-red-200 dark:border-red-800',
    },
};

// Product form icons
const getProductIcon = (form?: string) => {
    switch (form?.toLowerCase()) {
        case 'syrup':
        case 'suspension':
        case 'liquid':
            return FlaskConical;
        case 'tablet':
        case 'capsule':
            return Pill;
        case 'injection':
        case 'vial':
            return Syringe;
        default:
            return Package;
    }
};

// ============================================
// MAIN COMPONENT
// ============================================

export default function RequisitionDetailsModal({
    isOpen,
    onClose,
    requisition,
    onApprove,
    onReject,
    onConvertToPO,
}: RequisitionDetailsModalProps) {
    const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['items']));
    const [isLoading, setIsLoading] = useState(false);

    if (!requisition) return null;

    const statusConfig = STATUS_CONFIG[requisition.status] || STATUS_CONFIG.draft;
    const StatusIcon = statusConfig.icon;
    const priorityConfig = PRIORITY_CONFIG[requisition.priority] || PRIORITY_CONFIG.medium;

    const formatCurrency = (amount: number | string) => {
        const num = typeof amount === 'string' ? parseFloat(amount) : amount;
        return new Intl.NumberFormat('en-ZM', {
            style: 'currency',
            currency: 'ZMW',
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        }).format(num || 0);
    };

    const formatDate = (date: string | null | undefined) => {
        if (!date) return 'N/A';
        try {
            return format(new Date(date), 'dd MMM yyyy');
        } catch {
            return 'N/A';
        }
    };

    const formatDateTime = (date: string | null | undefined) => {
        if (!date) return 'N/A';
        try {
            return format(new Date(date), 'dd MMM yyyy, hh:mm a');
        } catch {
            return 'N/A';
        }
    };

    const formatNumber = (num: number | string) => {
        const n = typeof num === 'string' ? parseFloat(num) : num;
        return new Intl.NumberFormat('en-ZM').format(n || 0);
    };

    const toggleSection = (section: string) => {
        const newSet = new Set(expandedSections);
        if (newSet.has(section)) {
            newSet.delete(section);
        } else {
            newSet.add(section);
        }
        setExpandedSections(newSet);
    };

    // Calculate totals
    const totalItems = requisition.items?.length || 0;
    const totalAmount = requisition.total_amount || 
                       requisition.items_sum_estimated_total ||
                       requisition.items?.reduce((sum, item) => sum + parseFloat(String(item.estimated_total || 0)), 0) || 0;

    // Get product display name
    const getProductName = (item: RequisitionItem) => {
        return item.product?.product_name || `Product #${item.product_id}`;
    };

    const getProductCode = (item: RequisitionItem) => {
        return item.product?.product_code || 'N/A';
    };

    const getProductDescription = (item: RequisitionItem) => {
        return item.product?.description || '';
    };

    const getProductStrength = (item: RequisitionItem) => {
        return item.product?.strength || '';
    };

    const getProductForm = (item: RequisitionItem) => {
        return item.product?.form || '';
    };

    const getProductUnit = (item: RequisitionItem) => {
        return item.product?.unit || '';
    };

    const getProductExpiry = (item: RequisitionItem) => {
        return item.product?.expiry_date || '';
    };

    // Copy to clipboard
    const copyToClipboard = (text: string) => {
        navigator.clipboard?.writeText(text);
    };

    // Get item status (if available, otherwise default)
    const getItemStatus = (item: RequisitionItem) => {
        // You can add logic here if items have individual status
        return requisition.status;
    };

    return (
        <Transition show={isOpen} as={Fragment}>
            <Dialog as="div" className="relative z-50" onClose={onClose}>
                <TransitionChild
                    as={Fragment}
                    enter="ease-out duration-300"
                    enterFrom="opacity-0"
                    enterTo="opacity-100"
                    leave="ease-in duration-200"
                    leaveFrom="opacity-100"
                    leaveTo="opacity-0"
                >
                    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" />
                </TransitionChild>

                <div className="fixed inset-0 overflow-y-auto">
                    <div className="flex min-h-full items-center justify-center p-4">
                        <TransitionChild
                            as={Fragment}
                            enter="ease-out duration-300"
                            enterFrom="opacity-0 scale-95"
                            enterTo="opacity-100 scale-100"
                            leave="ease-in duration-200"
                            leaveFrom="opacity-100 scale-100"
                            leaveTo="opacity-0 scale-95"
                        >
                            <DialogPanel className="relative w-full max-w-6xl transform overflow-hidden rounded-xl bg-white dark:bg-gray-900 shadow-2xl transition-all max-h-[95vh] flex flex-col">
                                {/* ========================================== */}
                                {/* HEADER */}
                                {/* ========================================== */}
                                <div className="relative flex-shrink-0 px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                                    <div className="flex items-start justify-between">
                                        <div className="flex items-center gap-4">
                                            <div className="rounded-lg bg-blue-50 dark:bg-blue-900/30 p-2.5">
                                                <FileText className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                                            </div>
                                            <div>
                                                <DialogTitle className="text-lg font-semibold text-gray-900 dark:text-white">
                                                    Purchase Requisition
                                                </DialogTitle>
                                                <div className="flex items-center gap-3 mt-0.5">
                                                    <span className="font-mono text-base font-bold text-blue-600 dark:text-blue-400">
                                                        {requisition.pr_number}
                                                    </span>
                                                    <span className="text-gray-300 dark:text-gray-600">|</span>
                                                    <span className="text-sm text-gray-500 dark:text-gray-400">
                                                        {formatDateTime(requisition.created_at)}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            {/* Status Badge */}
                                            <div className={`flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-medium ${statusConfig.bgColor} ${statusConfig.color}`}>
                                                <StatusIcon className="h-4 w-4" />
                                                {statusConfig.label}
                                            </div>
                                            <button
                                                onClick={onClose}
                                                className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800 dark:hover:text-gray-300"
                                            >
                                                <X className="h-5 w-5" />
                                            </button>
                                        </div>
                                    </div>
                                    {/* Quick Action Buttons */}
                                    <div className="flex flex-wrap items-center gap-2 mt-3">
                                        {requisition.status === 'pending' && (
                                            <>
                                                <button
                                                    onClick={() => onApprove?.(requisition.id)}
                                                    className="inline-flex items-center gap-1.5 rounded-lg bg-green-600 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-green-700"
                                                >
                                                    <CheckCircle className="h-4 w-4" />
                                                    Approve
                                                </button>
                                                <button
                                                    onClick={() => onReject?.(requisition.id)}
                                                    className="inline-flex items-center gap-1.5 rounded-lg bg-red-600 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-red-700"
                                                >
                                                    <XCircle className="h-4 w-4" />
                                                    Reject
                                                </button>
                                            </>
                                        )}
                                        {requisition.status === 'approved' && (
                                            <button
                                                onClick={() => onConvertToPO?.(requisition.id)}
                                                className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-blue-700"
                                            >
                                                <FileCheck className="h-4 w-4" />
                                                Convert to PO
                                            </button>
                                        )}
                                        <button
                                            onClick={() => window.print()}
                                            className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800"
                                        >
                                            <Printer className="h-4 w-4" />
                                            Print
                                        </button>
                                        <button
                                            className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800"
                                        >
                                            <Download className="h-4 w-4" />
                                            Export
                                        </button>
                                    </div>
                                </div>

                                {/* ========================================== */}
                                {/* SCROLLABLE CONTENT */}
                                {/* ========================================== */}
                                <div className="flex-1 overflow-y-auto p-6">
                                    {/* ===== Top Summary Cards ===== */}
                                    <div className="grid grid-cols-2 gap-3 md:grid-cols-6 mb-6">
                                        <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-3">
                                            <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                                                <Package className="h-4 w-4" />
                                                Items
                                            </div>
                                            <p className="text-lg font-semibold text-gray-900 dark:text-white">
                                                {totalItems}
                                            </p>
                                        </div>
                                        <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-3">
                                            <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                                                <DollarSign className="h-4 w-4" />
                                                Total
                                            </div>
                                            <p className="text-lg font-semibold text-green-600 dark:text-green-400">
                                                {formatCurrency(totalAmount)}
                                            </p>
                                        </div>
                                        <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-3">
                                            <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                                                <Building2 className="h-4 w-4" />
                                                Department
                                            </div>
                                            <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                                                {requisition.department?.name || 'N/A'}
                                            </p>
                                            <p className="text-[10px] text-gray-400 dark:text-gray-500">
                                                {requisition.department?.code || ''}
                                            </p>
                                        </div>
                                        <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-3">
                                            <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                                                <User className="h-4 w-4" />
                                                Requestor
                                            </div>
                                            <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                                                {requisition.requested_by || 'System'}
                                            </p>
                                        </div>
                                        <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-3">
                                            <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                                                <Tag className="h-4 w-4" />
                                                Priority
                                            </div>
                                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${priorityConfig.bgColor} ${priorityConfig.color} ${priorityConfig.borderColor}`}>
                                                {priorityConfig.label}
                                            </span>
                                        </div>
                                        <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-3">
                                            <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                                                <CreditCard className="h-4 w-4" />
                                                Budget
                                            </div>
                                            <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                                                {requisition.budget_code || 'N/A'}
                                            </p>
                                        </div>
                                    </div>

                                    {/* ===== Document Info Grid ===== */}
                                    <div className="grid grid-cols-2 gap-4 md:grid-cols-4 mb-6">
                                        <div className="space-y-0.5">
                                            <p className="text-xs font-medium text-gray-500 dark:text-gray-400">PR Number</p>
                                            <div className="flex items-center gap-2">
                                                <p className="font-mono text-sm text-gray-900 dark:text-white">
                                                    {requisition.pr_number}
                                                </p>
                                                <button
                                                    onClick={() => copyToClipboard(requisition.pr_number)}
                                                    className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                                                >
                                                    <Copy className="h-3.5 w-3.5" />
                                                </button>
                                            </div>
                                        </div>
                                        <div className="space-y-0.5">
                                            <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Request Date</p>
                                            <p className="text-sm text-gray-900 dark:text-white">
                                                {formatDate(requisition.request_date)}
                                            </p>
                                        </div>
                                        <div className="space-y-0.5">
                                            <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Required Date</p>
                                            <p className="text-sm text-gray-900 dark:text-white">
                                                {formatDate(requisition.required_date)}
                                            </p>
                                        </div>
                                        <div className="space-y-0.5">
                                            <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Cost Center</p>
                                            <p className="text-sm text-gray-900 dark:text-white">
                                                {requisition.cost_center || 'N/A'}
                                            </p>
                                        </div>
                                    </div>

                                    {/* ===== Approval Info ===== */}
                                    {requisition.approved_by && (
                                        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 mb-6">
                                            <div className="space-y-0.5">
                                                <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Approved By</p>
                                                <p className="text-sm text-gray-900 dark:text-white">User #{requisition.approved_by}</p>
                                            </div>
                                            <div className="space-y-0.5">
                                                <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Approved At</p>
                                                <p className="text-sm text-gray-900 dark:text-white">{formatDateTime(requisition.approved_at)}</p>
                                            </div>
                                        </div>
                                    )}

                                    {/* ===== Justification ===== */}
                                    {requisition.justification && (
                                        <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-4 mb-6">
                                            <div className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                                                <Info className="h-4 w-4" />
                                                Justification / Purpose
                                            </div>
                                            <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                                                {requisition.justification}
                                            </p>
                                        </div>
                                    )}

                                    {/* ===== Items Section ===== */}
                                    <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                                        <button
                                            onClick={() => toggleSection('items')}
                                            className="flex items-center justify-between w-full px-4 py-3 bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                                        >
                                            <div className="flex items-center gap-3">
                                                <Box className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                                                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                                    Items ({totalItems})
                                                </span>
                                                <span className="text-xs text-gray-500 dark:text-gray-400">
                                                    Total: {formatCurrency(totalAmount)}
                                                </span>
                                            </div>
                                            {expandedSections.has('items') ? (
                                                <ChevronUp className="h-4 w-4 text-gray-400" />
                                            ) : (
                                                <ChevronDown className="h-4 w-4 text-gray-400" />
                                            )}
                                        </button>

                                        {expandedSections.has('items') && (
                                            <div className="overflow-x-auto">
                                                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                                                    <thead className="bg-gray-50 dark:bg-gray-800/30">
                                                        <tr>
                                                            <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 dark:text-gray-400 w-12">#</th>
                                                            <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 dark:text-gray-400">Product Details</th>
                                                            <th className="px-4 py-2.5 text-right text-xs font-medium text-gray-500 dark:text-gray-400">Qty</th>
                                                            <th className="px-4 py-2.5 text-right text-xs font-medium text-gray-500 dark:text-gray-400">Unit Price</th>
                                                            <th className="px-4 py-2.5 text-right text-xs font-medium text-gray-500 dark:text-gray-400">Total</th>
                                                            <th className="px-4 py-2.5 text-center text-xs font-medium text-gray-500 dark:text-gray-400">Expiry</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-gray-200 dark:divide-gray-700 bg-white dark:bg-gray-900/50">
                                                        {requisition.items?.map((item, index) => {
                                                            const ProductIcon = getProductIcon(getProductForm(item));
                                                            return (
                                                                <tr key={item.id || index} className="hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors">
                                                                    <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400 text-center">
                                                                        {index + 1}
                                                                    </td>
                                                                    <td className="px-4 py-3">
                                                                        <div className="flex items-start gap-3">
                                                                            <div className="flex-shrink-0 mt-0.5">
                                                                                <ProductIcon className="h-5 w-5 text-blue-500 dark:text-blue-400" />
                                                                            </div>
                                                                            <div>
                                                                                <p className="text-sm font-medium text-gray-900 dark:text-white">
                                                                                    {getProductName(item)}
                                                                                </p>
                                                                                <div className="flex flex-wrap items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                                                                                    <span className="font-mono">{getProductCode(item)}</span>
                                                                                    {getProductStrength(item) && (
                                                                                        <>
                                                                                            <span className="text-gray-300 dark:text-gray-600">•</span>
                                                                                            <span>{getProductStrength(item)}</span>
                                                                                        </>
                                                                                    )}
                                                                                    {getProductForm(item) && (
                                                                                        <>
                                                                                            <span className="text-gray-300 dark:text-gray-600">•</span>
                                                                                            <span className="capitalize">{getProductForm(item)}</span>
                                                                                        </>
                                                                                    )}
                                                                                    {getProductUnit(item) && (
                                                                                        <>
                                                                                            <span className="text-gray-300 dark:text-gray-600">•</span>
                                                                                            <span>{getProductUnit(item)}</span>
                                                                                        </>
                                                                                    )}
                                                                                </div>
                                                                                {getProductDescription(item) && (
                                                                                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                                                                                        {getProductDescription(item)}
                                                                                    </p>
                                                                                )}
                                                                                {item.notes && (
                                                                                    <p className="text-xs text-yellow-600 dark:text-yellow-400 mt-0.5">
                                                                                        Note: {item.notes}
                                                                                    </p>
                                                                                )}
                                                                            </div>
                                                                        </div>
                                                                    </td>
                                                                    <td className="px-4 py-3 text-right text-sm text-gray-900 dark:text-white">
                                                                        {formatNumber(item.quantity)}
                                                                    </td>
                                                                    <td className="px-4 py-3 text-right text-sm text-gray-900 dark:text-white">
                                                                        {formatCurrency(item.estimated_unit_price)}
                                                                    </td>
                                                                    <td className="px-4 py-3 text-right text-sm font-medium text-gray-900 dark:text-white">
                                                                        {formatCurrency(item.estimated_total)}
                                                                    </td>
                                                                    <td className="px-4 py-3 text-center">
                                                                        {getProductExpiry(item) ? (
                                                                            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                                                                                new Date(getProductExpiry(item)) < new Date()
                                                                                    ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                                                                                    : 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                                                                            }`}>
                                                                                {formatDate(getProductExpiry(item))}
                                                                            </span>
                                                                        ) : (
                                                                            <span className="text-xs text-gray-400">N/A</span>
                                                                        )}
                                                                    </td>
                                                                </tr>
                                                            );
                                                        })}
                                                        {(!requisition.items || requisition.items.length === 0) && (
                                                            <tr>
                                                                <td colSpan={6} className="px-4 py-8 text-center text-sm text-gray-500 dark:text-gray-400">
                                                                    No items found
                                                                </td>
                                                            </tr>
                                                        )}
                                                    </tbody>
                                                    <tfoot className="bg-gray-50 dark:bg-gray-800/30">
                                                        <tr>
                                                            <td colSpan={3} className="px-4 py-3 text-right text-sm font-medium text-gray-700 dark:text-gray-300">
                                                                Grand Total
                                                            </td>
                                                            <td colSpan={3} className="px-4 py-3 text-right text-base font-bold text-gray-900 dark:text-white">
                                                                {formatCurrency(totalAmount)}
                                                            </td>
                                                        </tr>
                                                    </tfoot>
                                                </table>
                                            </div>
                                        )}
                                    </div>

                                    {/* ===== PR Status Timeline ===== */}
                                    <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 mt-6">
                                        <div className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                                            <Clock className="h-4 w-4" />
                                            Status Timeline
                                        </div>
                                        <div className="flex flex-col gap-2">
                                            <div className="flex items-center gap-3 text-sm">
                                                <div className="flex-shrink-0 w-8 text-center">
                                                    <span className="inline-block h-2 w-2 rounded-full bg-blue-500"></span>
                                                </div>
                                                <span className="text-gray-500 dark:text-gray-400">
                                                    Created: {formatDateTime(requisition.created_at)}
                                                </span>
                                            </div>
                                            {requisition.status === 'approved' && requisition.approved_at && (
                                                <div className="flex items-center gap-3 text-sm">
                                                    <div className="flex-shrink-0 w-8 text-center">
                                                        <CheckCircle className="h-4 w-4 text-green-500 mx-auto" />
                                                    </div>
                                                    <span className="text-gray-500 dark:text-gray-400">
                                                        Approved: {formatDateTime(requisition.approved_at)}
                                                        {requisition.approved_by && ` by User #${requisition.approved_by}`}
                                                    </span>
                                                </div>
                                            )}
                                            {requisition.status === 'converted' && requisition.converted_to_po_id && (
                                                <div className="flex items-center gap-3 text-sm">
                                                    <div className="flex-shrink-0 w-8 text-center">
                                                        <FileCheck className="h-4 w-4 text-blue-500 mx-auto" />
                                                    </div>
                                                    <span className="text-gray-500 dark:text-gray-400">
                                                        Converted to PO #{requisition.converted_to_po_id}
                                                    </span>
                                                </div>
                                            )}
                                            <div className="flex items-center gap-3 text-sm">
                                                <div className="flex-shrink-0 w-8 text-center">
                                                    <span className={`inline-block h-2 w-2 rounded-full ${
                                                        requisition.status === 'approved' || requisition.status === 'converted'
                                                            ? 'bg-green-500'
                                                            : requisition.status === 'rejected'
                                                            ? 'bg-red-500'
                                                            : 'bg-gray-300'
                                                    }`}></span>
                                                </div>
                                                <span className="text-gray-500 dark:text-gray-400">
                                                    Current Status: <span className={`font-medium ${statusConfig.color}`}>
                                                        {statusConfig.label}
                                                    </span>
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* ========================================== */}
                                {/* FOOTER */}
                                {/* ========================================== */}
                                <div className="flex-shrink-0 border-t border-gray-200 dark:border-gray-700 px-6 py-3 flex justify-between items-center">
                                    <div className="text-xs text-gray-400 dark:text-gray-500">
                                        <span>Generated on {formatDateTime(new Date().toISOString())}</span>
                                        <span className="mx-2">|</span>
                                        <span>PR#{requisition.pr_number}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={onClose}
                                            className="px-4 py-1.5 text-sm font-medium text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
                                        >
                                            Close
                                        </button>
                                    </div>
                                </div>
                            </DialogPanel>
                        </TransitionChild>
                    </div>
                </div>
            </Dialog>
        </Transition>
    );
}