// resources/js/pages/bulkstore/Issue.tsx

import { Dialog, Transition } from '@headlessui/react';
import { Head, usePage } from '@inertiajs/react';
import axios from 'axios';
import { format } from 'date-fns';
import {
    Eye,
    CheckCircle,
    XCircle,
    Clock,
    Package,
    User,
    Building2,
    Calendar,
    DollarSign,
    AlertTriangle,
    Check,
    X,
    Loader2,
    Search,
    FileText,
    TrendingUp,
    TrendingDown,
    Plus,
    Minus,
    Truck,
    Box,
    Hash,
    AlertCircle,
} from 'lucide-react';
import React, { useState, useEffect } from 'react';
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
    product_id: number;
    product_name: string;
    product_code: string;
    quantity_requested: number;
    quantity_fulfilled: number;
    quantity_approved: number;
    unit: string;
    estimated_unit_price: number;
    estimated_total: number;
    batch_number: string | null;
    expiry_date: string | null;
    status: string;
    notes: string | null;
    available_stock?: number; // From bulk store
    is_available?: boolean;
}

interface Requisition {
    id: number;
    requisition_number: string;
    requisition_uuid: string;
    department_id: number;
    department: {
        id: number;
        name: string;
        code: string;
    };
    requested_by: number;
    requester: {
        id: number;
        name: string;
        email: string;
    };
    requested_at: string;
    required_by_date: string;
    delivery_location: string | null;
    delivery_notes: string | null;
    status: 'draft' | 'pending' | 'approved' | 'rejected' | 'partially_fulfilled' | 'fulfilled' | 'cancelled';
    priority: 'low' | 'medium' | 'high' | 'urgent';
    justification: string;
    remarks: string | null;
    budget_code: string | null;
    cost_center: string | null;
    estimated_total: number;
    items: RequisitionItem[];
    items_count?: number;
    created_at: string;
    updated_at: string;
}

interface IssueModalProps {
    isOpen: boolean;
    onClose: () => void;
    requisition: Requisition | null;
    onSuccess: () => void;
}

// ============================================
// STATUS CONFIG
// ============================================

const STATUS_CONFIG: Record<string, { label: string; color: string; bgColor: string; icon: any }> = {
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

const PRIORITY_CONFIG: Record<string, { label: string; color: string; bgColor: string }> = {
    low: {
        label: 'Low',
        color: 'text-blue-600',
        bgColor: 'bg-blue-50',
    },
    medium: {
        label: 'Medium',
        color: 'text-yellow-600',
        bgColor: 'bg-yellow-50',
    },
    high: {
        label: 'High',
        color: 'text-orange-600',
        bgColor: 'bg-orange-50',
    },
    urgent: {
        label: 'Urgent',
        color: 'text-red-600',
        bgColor: 'bg-red-50',
    },
};

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Bulk Store',
        href: '/bulkstore',
    },
    {
        title: 'Issue',
        href: '/bulkstore/issue',
    },
];

// ============================================
// ISSUE MODAL COMPONENT
// ============================================

function IssueModal({ isOpen, onClose, requisition, onSuccess }: IssueModalProps) {
    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [selectedItems, setSelectedItems] = useState<Record<number, { quantity: number; batch_number: string; expiry_date: string }>>({});
    const [stockAvailability, setStockAvailability] = useState<Record<number, { available: number; is_sufficient: boolean }>>({});
    const [checkingStock, setCheckingStock] = useState(false);

    // Check stock availability when modal opens
    useEffect(() => {
        if (isOpen && requisition) {
            checkStockAvailability();
        }
    }, [isOpen, requisition]);

    const checkStockAvailability = async () => {
        if (!requisition) return;

        setCheckingStock(true);
        try {
            const productIds = requisition.items.map(item => item.product_id);
            const response = await axios.post('/api/bulkstore/check-stock', {
                product_ids: productIds,
                department_id: requisition.department_id,
            });

            if (response.data.success) {
                const availability: Record<number, { available: number; is_sufficient: boolean }> = {};
                response.data.data.forEach((stock: any) => {
                    availability[stock.product_id] = {
                        available: stock.available_stock,
                        is_sufficient: stock.available_stock >= stock.requested_quantity,
                    };
                });
                setStockAvailability(availability);

                // Auto-select items that are available
                const initialSelection: Record<number, { quantity: number; batch_number: string; expiry_date: string }> = {};
                requisition.items.forEach(item => {
                    const stock = availability[item.product_id];
                    if (stock && stock.is_sufficient) {
                        initialSelection[item.id] = {
                            quantity: item.quantity_requested,
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
        setSelectedItems(prev => ({
            ...prev,
            [itemId]: {
                ...prev[itemId],
                quantity: Math.max(0, value),
            },
        }));
    };

    const handleBatchChange = (itemId: number, value: string) => {
        setSelectedItems(prev => ({
            ...prev,
            [itemId]: {
                ...prev[itemId],
                batch_number: value,
            },
        }));
    };

    const handleExpiryChange = (itemId: number, value: string) => {
        setSelectedItems(prev => ({
            ...prev,
            [itemId]: {
                ...prev[itemId],
                expiry_date: value,
            },
        }));
    };

    const toggleItemSelection = (itemId: number, item: RequisitionItem) => {
        if (selectedItems[itemId]) {
            const newSelection = { ...selectedItems };
            delete newSelection[itemId];
            setSelectedItems(newSelection);
        } else {
            const stock = stockAvailability[item.product_id];
            if (stock && stock.available > 0) {
                setSelectedItems(prev => ({
                    ...prev,
                    [itemId]: {
                        quantity: Math.min(item.quantity_requested, stock.available),
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

        const itemsToIssue = Object.keys(selectedItems).map(itemId => ({
            requisition_item_id: parseInt(itemId),
            quantity: selectedItems[parseInt(itemId)].quantity,
            batch_number: selectedItems[parseInt(itemId)].batch_number || null,
            expiry_date: selectedItems[parseInt(itemId)].expiry_date || null,
        }));

        if (itemsToIssue.length === 0) {
            toast.error('Please select at least one item to issue');
            return;
        }

        setSubmitting(true);
        try {
            const response = await axios.post(`/api/bulkstore/requisitions/${requisition.id}/fulfill`, {
                items: itemsToIssue,
            });

            if (response.data.success) {
                toast.success('Requisition fulfilled successfully');
                onSuccess();
                onClose();
            } else {
                toast.error(response.data.message || 'Failed to fulfill requisition');
            }
        } catch (error: any) {
            const message = error.response?.data?.message || 'Failed to fulfill requisition';
            toast.error(message);
        } finally {
            setSubmitting(false);
        }
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-ZM', {
            style: 'currency',
            currency: 'ZMW',
            minimumFractionDigits: 2,
        }).format(amount || 0);
    };

    const formatDate = (date: string | null) => {
        if (!date) return 'N/A';
        try {
            return format(new Date(date), 'dd MMM yyyy');
        } catch {
            return 'N/A';
        }
    };

    if (!requisition) return null;

    const totalRequested = requisition.items.reduce((sum, item) => sum + item.quantity_requested, 0);
    const totalSelected = Object.values(selectedItems).reduce((sum, sel) => sum + sel.quantity, 0);
    const totalFulfilled = requisition.items.reduce((sum, item) => sum + (item.quantity_fulfilled || 0), 0);

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
                            <Dialog.Panel className="relative w-full max-w-5xl transform overflow-hidden rounded-xl bg-white shadow-2xl transition-all max-h-[95vh] flex flex-col">
                                {/* Header */}
                                <div className="flex-shrink-0 px-6 py-4 border-b border-gray-200 bg-white rounded-t-xl">
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
                                                    {requisition.requisition_number} • {requisition.department?.name}
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
                                <div className="flex-1 overflow-y-auto p-6 bg-slate-50">
                                    {/* Requisition Summary */}
                                    <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-6">
                                        <div className="rounded-lg bg-white p-3 border border-gray-200">
                                            <p className="text-xs text-gray-500">Requested By</p>
                                            <p className="text-sm font-medium text-gray-900">{requisition.requester?.name}</p>
                                        </div>
                                        <div className="rounded-lg bg-white p-3 border border-gray-200">
                                            <p className="text-xs text-gray-500">Department</p>
                                            <p className="text-sm font-medium text-gray-900">{requisition.department?.name}</p>
                                        </div>
                                        <div className="rounded-lg bg-white p-3 border border-gray-200">
                                            <p className="text-xs text-gray-500">Required By</p>
                                            <p className="text-sm font-medium text-gray-900">{formatDate(requisition.required_by_date)}</p>
                                        </div>
                                        <div className="rounded-lg bg-white p-3 border border-gray-200">
                                            <p className="text-xs text-gray-500">Priority</p>
                                            <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${PRIORITY_CONFIG[requisition.priority]?.bgColor} ${PRIORITY_CONFIG[requisition.priority]?.color}`}>
                                                {PRIORITY_CONFIG[requisition.priority]?.label || requisition.priority}
                                            </span>
                                        </div>
                                        <div className="rounded-lg bg-white p-3 border border-gray-200">
                                            <p className="text-xs text-gray-500">Budget Code</p>
                                            <p className="text-sm font-medium text-gray-900">{requisition.budget_code || 'N/A'}</p>
                                        </div>
                                        <div className="rounded-lg bg-white p-3 border border-gray-200">
                                            <p className="text-xs text-gray-500">Status</p>
                                            <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_CONFIG[requisition.status]?.bgColor} ${STATUS_CONFIG[requisition.status]?.color}`}>
                                                {STATUS_CONFIG[requisition.status]?.label || requisition.status}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Items Table */}
                                    <div className="rounded-lg border border-gray-200 bg-white overflow-hidden">
                                        <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <Package className="h-4 w-4 text-gray-500" />
                                                <span className="text-sm font-medium text-gray-700">
                                                    Items to Issue
                                                </span>
                                                <span className="text-xs text-gray-400">
                                                    ({Object.keys(selectedItems).length} selected of {requisition.items.length})
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
                                                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 w-10">#</th>
                                                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Product</th>
                                                        <th className="px-4 py-2 text-center text-xs font-medium text-gray-500">Requested</th>
                                                        <th className="px-4 py-2 text-center text-xs font-medium text-gray-500">Available</th>
                                                        <th className="px-4 py-2 text-center text-xs font-medium text-gray-500">To Issue</th>
                                                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Batch</th>
                                                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Expiry</th>
                                                        <th className="px-4 py-2 text-center text-xs font-medium text-gray-500">Status</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-gray-200 bg-white">
                                                    {requisition.items.map((item, index) => {
                                                        const stock = stockAvailability[item.product_id];
                                                        const isSelected = !!selectedItems[item.id];
                                                        const isAvailable = stock?.is_sufficient || false;
                                                        const availableStock = stock?.available || 0;

                                                        return (
                                                            <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                                                                <td className="px-4 py-3 text-sm text-gray-500 text-center">
                                                                    {index + 1}
                                                                </td>
                                                                <td className="px-4 py-3">
                                                                    <p className="text-sm font-medium text-gray-900">{item.product_name}</p>
                                                                    <p className="text-xs text-gray-500">Code: {item.product_code}</p>
                                                                </td>
                                                                <td className="px-4 py-3 text-center text-sm text-gray-900">
                                                                    {item.quantity_requested} {item.unit}
                                                                </td>
                                                                <td className="px-4 py-3 text-center">
                                                                    <span className={`text-sm font-medium ${availableStock > 0 ? 'text-green-600' : 'text-red-600'}`}>
                                                                        {availableStock} {item.unit}
                                                                    </span>
                                                                    {!isAvailable && availableStock === 0 && (
                                                                        <span className="ml-1 text-xs text-red-500">(Out of stock)</span>
                                                                    )}
                                                                    {!isAvailable && availableStock > 0 && (
                                                                        <span className="ml-1 text-xs text-orange-500">(Short)</span>
                                                                    )}
                                                                </td>
                                                                <td className="px-4 py-3 text-center">
                                                                    {isSelected ? (
                                                                        <input
                                                                            type="number"
                                                                            value={selectedItems[item.id]?.quantity || 0}
                                                                            onChange={(e) => handleQuantityChange(item.id, parseInt(e.target.value) || 0)}
                                                                            min="0"
                                                                            max={Math.min(item.quantity_requested, availableStock)}
                                                                            className="w-20 rounded border border-gray-300 px-2 py-1 text-center text-sm focus:border-green-500 focus:ring-1 focus:ring-green-500 focus:outline-none"
                                                                            disabled={!isAvailable}
                                                                        />
                                                                    ) : (
                                                                        <span className="text-sm text-gray-400">-</span>
                                                                    )}
                                                                </td>
                                                                <td className="px-4 py-3">
                                                                    {isSelected && (
                                                                        <input
                                                                            type="text"
                                                                            value={selectedItems[item.id]?.batch_number || ''}
                                                                            onChange={(e) => handleBatchChange(item.id, e.target.value)}
                                                                            placeholder="Batch #"
                                                                            className="w-28 rounded border border-gray-300 px-2 py-1 text-sm focus:border-green-500 focus:ring-1 focus:ring-green-500 focus:outline-none"
                                                                        />
                                                                    )}
                                                                </td>
                                                                <td className="px-4 py-3">
                                                                    {isSelected && (
                                                                        <input
                                                                            type="date"
                                                                            value={selectedItems[item.id]?.expiry_date || ''}
                                                                            onChange={(e) => handleExpiryChange(item.id, e.target.value)}
                                                                            className="w-32 rounded border border-gray-300 px-2 py-1 text-sm focus:border-green-500 focus:ring-1 focus:ring-green-500 focus:outline-none"
                                                                        />
                                                                    )}
                                                                </td>
                                                                <td className="px-4 py-3 text-center">
                                                                    <button
                                                                        onClick={() => toggleItemSelection(item.id, item)}
                                                                        disabled={!isAvailable && !isSelected}
                                                                        className={`rounded-lg px-2 py-1 text-xs font-medium transition-colors ${
                                                                            isSelected
                                                                                ? 'bg-green-100 text-green-700 hover:bg-green-200'
                                                                                : isAvailable
                                                                                ? 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                                                                : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                                                        }`}
                                                                    >
                                                                        {isSelected ? (
                                                                            <span className="flex items-center gap-1">
                                                                                <Check className="h-3 w-3" /> Selected
                                                                            </span>
                                                                        ) : (
                                                                            <span className="flex items-center gap-1">
                                                                                <Plus className="h-3 w-3" /> Select
                                                                            </span>
                                                                        )}
                                                                    </button>
                                                                </td>
                                                            </tr>
                                                        );
                                                    })}
                                                </tbody>
                                                <tfoot className="bg-gray-50/50">
                                                    <tr>
                                                        <td colSpan={2} className="px-4 py-3 text-sm font-medium text-gray-700">
                                                            Summary
                                                        </td>
                                                        <td className="px-4 py-3 text-center text-sm font-medium text-gray-900">
                                                            {totalRequested}
                                                        </td>
                                                        <td className="px-4 py-3 text-center text-sm font-medium text-gray-900">
                                                            {Object.keys(stockAvailability).length} items checked
                                                        </td>
                                                        <td className="px-4 py-3 text-center text-sm font-medium text-green-600">
                                                            {totalSelected}
                                                        </td>
                                                        <td colSpan={3} className="px-4 py-3 text-right">
                                                            <span className="text-sm text-gray-500">
                                                                Previously fulfilled: {totalFulfilled} units
                                                            </span>
                                                        </td>
                                                    </tr>
                                                </tfoot>
                                            </table>
                                        </div>
                                    </div>

                                    {/* Justification */}
                                    {requisition.justification && (
                                        <div className="mt-4 rounded-lg border border-gray-200 bg-white p-4">
                                            <p className="text-xs text-gray-500 mb-1">Justification</p>
                                            <p className="text-sm text-gray-700">{requisition.justification}</p>
                                        </div>
                                    )}
                                </div>

                                {/* Footer */}
                                <div className="flex-shrink-0 px-6 py-4 border-t border-gray-200 bg-white rounded-b-xl">
                                    <div className="flex items-center justify-between">
                                        <div className="text-sm text-gray-500">
                                            {Object.keys(selectedItems).length} items selected • {totalSelected} units to issue
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
                                                disabled={submitting || Object.keys(selectedItems).length === 0}
                                                className={`flex items-center gap-2 rounded-lg px-6 py-2 text-sm font-medium text-white transition-colors ${
                                                    submitting || Object.keys(selectedItems).length === 0
                                                        ? 'bg-gray-400 cursor-not-allowed'
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
// MAIN PAGE COMPONENT
// ============================================

export default function Issue() {
    const { props } = usePage();
    const [requisitions, setRequisitions] = useState<Requisition[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedRequisition, setSelectedRequisition] = useState<Requisition | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);

    // Fetch requisitions on mount
    useEffect(() => {
        fetchRequisitions();
    }, []);

    const fetchRequisitions = async () => {
        setLoading(true);
        try {
            const response = await axios.get('/api/bulkstore/requisitions/pending');
            if (response.data.success) {
                setRequisitions(response.data.data);
            }
        } catch (error) {
            console.error('Failed to fetch requisitions:', error);
            toast.error('Failed to load requisitions');
        } finally {
            setLoading(false);
        }
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

    const formatDate = (date: string) => {
        try {
            return format(new Date(date), 'dd MMM yyyy HH:mm');
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

    // Define columns
    const columns: Column<Requisition>[] = [
        {
            id: 'requisition_number',
            label: 'Requisition #',
            minWidth: 120,
            sortable: true,
            format: (value) => (
                <span className="font-mono text-sm font-medium text-blue-600">{value}</span>
            ),
        },
        {
            id: 'department',
            label: 'Department',
            minWidth: 150,
            sortable: true,
            format: (value: any) => (
                <div>
                    <p className="text-sm font-medium text-gray-900">{value?.name}</p>
                    <p className="text-xs text-gray-500">{value?.code}</p>
                </div>
            ),
        },
        {
            id: 'requester',
            label: 'Requested By',
            minWidth: 150,
            sortable: true,
            format: (value: any) => (
                <div>
                    <p className="text-sm font-medium text-gray-900">{value?.name}</p>
                    <p className="text-xs text-gray-500">{value?.email}</p>
                </div>
            ),
        },
        {
            id: 'items',
            label: 'Items',
            minWidth: 100,
            align: 'center',
            format: (value: RequisitionItem[]) => (
                <span className="text-sm font-medium text-gray-900">{value?.length || 0}</span>
            ),
        },
        {
            id: 'total_items',
            label: 'Total Qty',
            minWidth: 80,
            align: 'right',
            format: (value: any, row: Requisition) => {
                const total = row.items.reduce((sum, item) => sum + item.quantity_requested, 0);
                return <span className="text-sm font-medium text-gray-900">{total}</span>;
            },
        },
        {
            id: 'estimated_total',
            label: 'Estimated Total',
            minWidth: 120,
            align: 'right',
            format: (value) => (
                <span className="text-sm font-medium text-gray-900">{formatCurrency(value || 0)}</span>
            ),
        },
        {
            id: 'priority',
            label: 'Priority',
            minWidth: 100,
            format: (value) => (
                <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${PRIORITY_CONFIG[value]?.bgColor} ${PRIORITY_CONFIG[value]?.color}`}>
                    {PRIORITY_CONFIG[value]?.label || value}
                </span>
            ),
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
                const config = STATUS_CONFIG[value];
                if (!config) return <span className="text-sm text-gray-500">{value}</span>;
                const Icon = config.icon;
                return (
                    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${config.bgColor} ${config.color}`}>
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
                <span className="text-sm text-gray-500">{formatDate(value)}</span>
            ),
        },
        {
            id: 'required_by_date',
            label: 'Required By',
            minWidth: 120,
            sortable: true,
            format: (value) => {
                const date = new Date(value);
                const isUrgent = date < new Date(Date.now() + 2 * 24 * 60 * 60 * 1000);
                return (
                    <span className={`text-sm ${isUrgent ? 'text-red-600 font-medium' : 'text-gray-500'}`}>
                        {formatDate(value)}
                        {isUrgent && <span className="ml-1 text-xs text-red-500">(Urgent)</span>}
                    </span>
                );
            },
        },
    ];

    // Define actions
    const actions: Action<Requisition>[] = [
        {
            label: 'View',
            icon: <Eye className="w-4 h-4" />,
            color: 'info',
            variant: 'text',
            onClick: handleView,
        },
        {
            label: 'Issue',
            icon: <Truck className="w-4 h-4" />,
            color: 'success',
            variant: 'contained',
            onClick: handleFulfill,
            show: (row) => row.status === 'approved' || row.status === 'pending',
        },
    ];

    // Status options for filtering
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

            <div className="bg-slate-100 min-h-screen">
                <div className="p-6">
                    <div className="mb-6 flex items-center justify-between">
                        <div>
                            <h1 className="text-2xl font-semibold text-gray-900">Issue Products</h1>
                            <p className="text-sm text-gray-500">
                                Fulfill department requisitions from bulk store inventory
                            </p>
                        </div>
                        <button
                            onClick={fetchRequisitions}
                            className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
                        >
                            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                            Refresh
                        </button>
                    </div>

                    <div className="w-full">
                        <div className="overflow-hidden bg-white rounded-lg shadow-sm">
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

            {/* Issue Modal */}
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