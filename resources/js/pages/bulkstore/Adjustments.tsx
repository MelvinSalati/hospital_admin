// resources/js/pages/bulkstore/Adjustments.tsx

import { Head, router, usePage } from '@inertiajs/react';
import {
    Barcode,
    Eye,
    Pencil,
    Copy,
    Trash2,
    Printer,
    Check,
    X,
    Plus,
    SlidersHorizontal,
    Package,
    Calendar,
    User,
    Hash,
    DollarSign,
    AlertCircle,
    Info,
} from 'lucide-react';
import React, { useState, useEffect, useMemo } from 'react';
import { toast } from 'react-hot-toast';
import Container from '@/components/container';
import PageHeader from '@/components/PageHeader';
import type { Column, Action } from '@/components/ReusableTable';
import ReusableTable from '@/components/ReusableTable';
import AppLayout from '@/layouts/app-layout';
import AdjustStockModal from './components/AdjustStock';

// Define the Adjustment type
export interface Adjustment {
    id: number;
    adjustment_uuid: string;
    adjustment_number: string;
    product_id: number;
    product?: {
        id: number;
        product_name: string;
        product_code: string;
        barcode: string | null;
        brand_name: string | null;
        category_id: number;
        description: string;
        form: string | null;
        generic_name: string | null;
        strength: string | null;
        unit: string;
        pack_size: string | null;
        reorder_level: string;
        is_active: boolean;
        track_batches: boolean;
        track_expiry: boolean;
        allow_negative_stock: boolean;
        created_at: string;
        updated_at: string;
    };
    current_stock: number;
    proposed_quantity: number;
    adjustment_difference: number;
    adjustment_type: 'addition' | 'reduction';
    category: 'correction' | 'damage' | 'expiry' | 'shortage' | 'surplus' | 'quality_issue';
    status: 'draft' | 'pending' | 'applied' | 'rejected' | 'approved';
    reason: string;
    evidence?: string[] | null;
    batch_number?: string | null;
    expiry_date?: string | null;
    unit_cost?: number | null;
    department_id?: number | null;
    bulk_store_id?: number | null;
    created_by: number;
    requested_by?: number | null;
    requested_at?: string | null;
    applied_by?: number | null;
    applied_at?: string | null;
    approved_by?: number | null;
    approved_at?: string | null;
    rejected_by?: number | null;
    rejected_at?: string | null;
    rejection_reason?: string | null;
    approval_required: boolean;
    created_at: string;
    updated_at: string;
    // Transformed fields
    product_name?: string;
    product_code?: string;
}

// View Modal Component
// View Modal Component - Fixed version
const ViewAdjustmentModal = ({
    isOpen,
    onClose,
    adjustment,
    onEdit,
    onApply,
    onReject,
    onAdjustStock,
}: {
    isOpen: boolean;
    onClose: () => void;
    adjustment: Adjustment | null;
    onEdit?: (adjustment: Adjustment) => void;
    onApply?: (adjustment: Adjustment) => void;
    onReject?: (adjustment: Adjustment) => void;
    onAdjustStock?: (adjustment: Adjustment) => void;
}) => {
    if (!isOpen || !adjustment) return null;

    const getStatusColor = (status: string) => {
        const colors = {
            draft: 'bg-gray-100 text-gray-800',
            pending: 'bg-yellow-100 text-yellow-800',
            approved: 'bg-blue-100 text-blue-800',
            applied: 'bg-green-100 text-green-800',
            rejected: 'bg-red-100 text-red-800',
        };
        return colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800';
    };

    const getCategoryLabel = (category: string) => {
        const labels = {
            correction: 'Correction',
            damage: 'Damage',
            expiry: 'Expiry',
            shortage: 'Shortage',
            surplus: 'Surplus',
            quality_issue: 'Quality Issue',
        };
        return labels[category as keyof typeof labels] || category;
    };

    const formatDate = (date: string | null) => {
        if (!date) return 'N/A';
        return new Date(date).toLocaleString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    // Handle modal close with escape key
    useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                onClose();
            }
        };
        if (isOpen) {
            document.addEventListener('keydown', handleEscape);
            document.body.style.overflow = 'hidden';
        }
        return () => {
            document.removeEventListener('keydown', handleEscape);
            document.body.style.overflow = 'unset';
        };
    }, [isOpen, onClose]);

    // Close on backdrop click
    const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
        if (e.target === e.currentTarget) {
            onClose();
        }
    };

    return (
        <div 
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
            onClick={handleBackdropClick}
        >
            <div className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-lg bg-white shadow-xl">
                {/* Header */}
                <div className="sticky top-0 z-10 border-b bg-white px-4 py-3">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="rounded-lg bg-blue-50 p-2">
                                <Package className="h-5 w-5 text-blue-600" />
                            </div>
                            <div>
                                <h3 className="text-base font-semibold text-gray-900">
                                    Adjustment Details
                                </h3>
                                <p className="text-xs text-gray-500">
                                    {adjustment.adjustment_number}
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className="rounded-lg p-1 transition-colors hover:bg-gray-100"
                        >
                            <X className="h-4 w-4 text-gray-500" />
                        </button>
                    </div>
                </div>

                <div className="p-6">
                    <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                        {/* Product Information */}
                        <div className="rounded-lg border border-gray-200 p-4">
                            <div className="mb-3 flex items-center gap-2">
                                <Package className="h-5 w-5 text-blue-600" />
                                <h4 className="font-medium text-gray-900">Product Information</h4>
                            </div>
                            <div className="space-y-2 text-sm">
                                <div className="flex justify-between">
                                    <span className="text-gray-500">Product Name</span>
                                    <span className="font-medium text-gray-900">
                                        {adjustment.product?.product_name || adjustment.product_name || 'N/A'}
                                    </span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-500">Product Code</span>
                                    <span className="font-medium text-gray-900">
                                        {adjustment.product?.product_code || adjustment.product_code || 'N/A'}
                                    </span>
                                </div>
                                {adjustment.product?.barcode && (
                                    <div className="flex justify-between">
                                        <span className="text-gray-500">Barcode</span>
                                        <span className="font-medium text-gray-900">
                                            {adjustment.product.barcode}
                                        </span>
                                    </div>
                                )}
                                {adjustment.product?.strength && (
                                    <div className="flex justify-between">
                                        <span className="text-gray-500">Strength</span>
                                        <span className="font-medium text-gray-900">
                                            {adjustment.product.strength}
                                        </span>
                                    </div>
                                )}
                                {adjustment.product?.form && (
                                    <div className="flex justify-between">
                                        <span className="text-gray-500">Form</span>
                                        <span className="font-medium text-gray-900">
                                            {adjustment.product.form}
                                        </span>
                                    </div>
                                )}
                                {adjustment.product?.unit && (
                                    <div className="flex justify-between">
                                        <span className="text-gray-500">Unit</span>
                                        <span className="font-medium text-gray-900">
                                            {adjustment.product.unit}
                                        </span>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Stock Adjustment Details */}
                        <div className="rounded-lg border border-gray-200 p-4">
                            <div className="mb-3 flex items-center gap-2">
                                <SlidersHorizontal className="h-5 w-5 text-orange-600" />
                                <h4 className="font-medium text-gray-900">Stock Adjustment Details</h4>
                            </div>
                            <div className="space-y-2 text-sm">
                                <div className="flex justify-between">
                                    <span className="text-gray-500">Current Stock</span>
                                    <span className="font-medium text-gray-900">
                                        {adjustment.current_stock}
                                    </span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-500">Proposed Quantity</span>
                                    <span className="font-medium text-gray-900">
                                        {adjustment.proposed_quantity}
                                    </span>
                                </div>
                                <div className="flex justify-between border-t pt-2">
                                    <span className="text-gray-500">Adjustment Difference</span>
                                    <span
                                        className={`font-bold ${
                                            adjustment.adjustment_difference > 0
                                                ? 'text-green-600'
                                                : 'text-red-600'
                                        }`}
                                    >
                                        {adjustment.adjustment_difference > 0 ? '+' : ''}
                                        {adjustment.adjustment_difference}
                                    </span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-500">Adjustment Type</span>
                                    <span className="font-medium text-gray-900">
                                        {adjustment.adjustment_type === 'addition' ? 'Addition' : 'Reduction'}
                                    </span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-500">Category</span>
                                    <span className="font-medium text-gray-900">
                                        {getCategoryLabel(adjustment.category)}
                                    </span>
                                </div>
                                {adjustment.batch_number && (
                                    <div className="flex justify-between">
                                        <span className="text-gray-500">Batch Number</span>
                                        <span className="font-medium text-gray-900">
                                            {adjustment.batch_number}
                                        </span>
                                    </div>
                                )}
                                {adjustment.expiry_date && (
                                    <div className="flex justify-between">
                                        <span className="text-gray-500">Expiry Date</span>
                                        <span className="font-medium text-gray-900">
                                            {formatDate(adjustment.expiry_date)}
                                        </span>
                                    </div>
                                )}
                                {adjustment.unit_cost && (
                                    <div className="flex justify-between">
                                        <span className="text-gray-500">Unit Cost</span>
                                        <span className="font-medium text-gray-900">
                                            ${adjustment.unit_cost.toFixed(2)}
                                        </span>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Status & Reason */}
                        <div className="rounded-lg border border-gray-200 p-4 md:col-span-2">
                            <div className="mb-3 flex items-center gap-2">
                                <Info className="h-5 w-5 text-purple-600" />
                                <h4 className="font-medium text-gray-900">Status & Reason</h4>
                            </div>
                            <div className="space-y-2 text-sm">
                                <div className="flex items-center gap-2">
                                    <span className="text-gray-500">Status:</span>
                                    <span
                                        className={`rounded-full px-3 py-1 text-xs font-medium ${getStatusColor(
                                            adjustment.status
                                        )}`}
                                    >
                                        {adjustment.status.charAt(0).toUpperCase() + adjustment.status.slice(1)}
                                    </span>
                                </div>
                                <div>
                                    <span className="text-gray-500">Reason:</span>
                                    <p className="mt-1 text-gray-900">{adjustment.reason}</p>
                                </div>
                                {adjustment.rejection_reason && (
                                    <div>
                                        <span className="text-gray-500">Rejection Reason:</span>
                                        <p className="mt-1 text-red-600">{adjustment.rejection_reason}</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Audit Information */}
                        <div className="rounded-lg border border-gray-200 p-4 md:col-span-2">
                            <div className="mb-3 flex items-center gap-2">
                                <Calendar className="h-5 w-5 text-gray-600" />
                                <h4 className="font-medium text-gray-900">Audit Information</h4>
                            </div>
                            <div className="grid grid-cols-1 gap-2 text-sm md:grid-cols-2">
                                <div className="flex justify-between">
                                    <span className="text-gray-500">Created At</span>
                                    <span className="font-medium text-gray-900">
                                        {formatDate(adjustment.created_at)}
                                    </span>
                                </div>
                                {adjustment.requested_at && (
                                    <div className="flex justify-between">
                                        <span className="text-gray-500">Requested At</span>
                                        <span className="font-medium text-gray-900">
                                            {formatDate(adjustment.requested_at)}
                                        </span>
                                    </div>
                                )}
                                {adjustment.applied_at && (
                                    <div className="flex justify-between">
                                        <span className="text-gray-500">Applied At</span>
                                        <span className="font-medium text-gray-900">
                                            {formatDate(adjustment.applied_at)}
                                        </span>
                                    </div>
                                )}
                                {adjustment.approved_at && (
                                    <div className="flex justify-between">
                                        <span className="text-gray-500">Approved At</span>
                                        <span className="font-medium text-gray-900">
                                            {formatDate(adjustment.approved_at)}
                                        </span>
                                    </div>
                                )}
                                {adjustment.rejected_at && (
                                    <div className="flex justify-between">
                                        <span className="text-gray-500">Rejected At</span>
                                        <span className="font-medium text-gray-900">
                                            {formatDate(adjustment.rejected_at)}
                                        </span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Footer Actions */}
                    <div className="mt-6 flex justify-end gap-2 border-t pt-4">
                        <button
                            onClick={onClose}
                            className="rounded-lg border border-gray-300 px-4 py-2 text-sm transition-colors hover:bg-gray-50"
                        >
                            Close
                        </button>
                        {(adjustment.status === 'draft' || adjustment.status === 'pending') && onEdit && (
                            <button
                                onClick={() => {
                                    onEdit(adjustment);
                                }}
                                className="rounded-lg bg-blue-600 px-4 py-2 text-sm text-white transition-colors hover:bg-blue-700"
                            >
                                <Pencil className="mr-2 inline h-4 w-4" />
                                Edit
                            </button>
                        )}
                        {(adjustment.status === 'pending' || adjustment.status === 'approved') && onApply && (
                            <button
                                onClick={() => {
                                    onApply(adjustment);
                                }}
                                className="rounded-lg bg-green-600 px-4 py-2 text-sm text-white transition-colors hover:bg-green-700"
                            >
                                <Check className="mr-2 inline h-4 w-4" />
                                Apply
                            </button>
                        )}
                        {adjustment.status === 'pending' && onReject && (
                            <button
                                onClick={() => {
                                    onReject(adjustment);
                                }}
                                className="rounded-lg bg-red-600 px-4 py-2 text-sm text-white transition-colors hover:bg-red-700"
                            >
                                <X className="mr-2 inline h-4 w-4" />
                                Reject
                            </button>
                        )}
                        {(adjustment.status === 'applied' || adjustment.status === 'draft' || adjustment.status === 'approved') && onAdjustStock && (
                            <button
                                onClick={() => {
                                    onAdjustStock(adjustment);
                                }}
                                className="rounded-lg bg-orange-600 px-4 py-2 text-sm text-white transition-colors hover:bg-orange-700"
                            >
                                <SlidersHorizontal className="mr-2 inline h-4 w-4" />
                                Adjust Stock
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default function Adjustments() {
    // Get props using usePage
    const { auth, adjustments, filters, pagination } = usePage().props as any;
    
    const [loading, setLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState(filters?.search || '');
    const [statusFilter, setStatusFilter] = useState(filters?.status || '');
    const [typeFilter, setTypeFilter] = useState(filters?.type || '');
    const [paginationState, setPaginationState] = useState({
        currentPage: pagination?.currentPage || 1,
        pageSize: pagination?.pageSize || 15,
        totalItems: pagination?.totalItems || 0,
        totalPages: pagination?.totalPages || 1,
    });

    // Modal states
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingAdjustment, setEditingAdjustment] = useState<Adjustment | null>(null);
    const [formData, setFormData] = useState<Partial<Adjustment>>({});
    const [isViewModalOpen, setIsViewModalOpen] = useState(false);
    const [viewingAdjustment, setViewingAdjustment] = useState<Adjustment | null>(null);

    // AdjustStock Modal state
    const [isAdjustStockModalOpen, setIsAdjustStockModalOpen] = useState(false);
    const [selectedProductId, setSelectedProductId] = useState<number | undefined>();
    const [selectedProductName, setSelectedProductName] = useState<string | undefined>();
    const [selectedCurrentStock, setSelectedCurrentStock] = useState<number | undefined>();

    // Get the data from adjustments prop
    const rawAdjustments = useMemo(() => {
        if (!adjustments) return [];
        
        if (Array.isArray(adjustments)) {
            return adjustments;
        } else if (adjustments.data) {
            if (adjustments.pagination) {
                setPaginationState(adjustments.pagination);
            }
            return adjustments.data;
        }
        
        return [];
    }, [adjustments]);

    // Transform data to include product_name and product_code
    const data = useMemo(() => {
        return rawAdjustments.map((item: any) => ({
            ...item,
            product_name: item.product?.product_name || `Product #${item.product_id}`,
            product_code: item.product?.product_code || 'N/A',
        }));
    }, [rawAdjustments]);

    // CRUD Handlers
    const handleCreate = () => {
        setEditingAdjustment(null);
        setFormData({
            adjustment_number: `ADJ-${String(new Date().getFullYear())}-${String(data.length + 1).padStart(3, '0')}`,
            status: 'draft',
            category: 'correction',
            adjustment_difference: 0,
            proposed_quantity: 0,
            current_stock: 0,
            reason: '',
        });
        setIsModalOpen(true);
    };

    const handleEdit = (adjustment: Adjustment) => {
        if (
            adjustment.status === 'applied' ||
            adjustment.status === 'rejected' ||
            adjustment.status === 'approved'
        ) {
            toast.error('Cannot edit applied, approved, or rejected adjustments');
            return;
        }
        setIsViewModalOpen(false);
        setEditingAdjustment(adjustment);
        setFormData(adjustment);
        setIsModalOpen(true);
    };

    const handleSave = async () => {
        setLoading(true);
        try {
            if (editingAdjustment) {
                router.put(`/bulkstore/adjustments/${editingAdjustment.id}`, formData, {
                    onSuccess: () => {
                        toast.success(`Adjustment ${formData.adjustment_number} updated successfully`);
                        setIsModalOpen(false);
                        setEditingAdjustment(null);
                        setFormData({});
                        router.reload({ only: ['adjustments'] });
                    },
                    onError: (errors) => {
                        toast.error(errors.message || 'Failed to update adjustment');
                    },
                    onFinish: () => setLoading(false),
                });
            } else {
                router.post('/bulkstore/adjustments', formData, {
                    onSuccess: () => {
                        toast.success('Adjustment created successfully');
                        setIsModalOpen(false);
                        setEditingAdjustment(null);
                        setFormData({});
                        router.reload({ only: ['adjustments'] });
                    },
                    onError: (errors) => {
                        toast.error(errors.message || 'Failed to create adjustment');
                    },
                    onFinish: () => setLoading(false),
                });
            }
        } catch (error) {
            toast.error('Failed to save adjustment');
            setLoading(false);
        }
    };

    const handleDelete = (adjustment: Adjustment) => {
        if (
            adjustment.status === 'applied' ||
            adjustment.status === 'approved' ||
            adjustment.status === 'rejected'
        ) {
            toast.error('Cannot delete applied, approved, or rejected adjustments');
            return;
        }

        if (window.confirm(`Are you sure you want to delete adjustment ${adjustment.adjustment_number}?`)) {
            router.delete(`/bulkstore/adjustments/${adjustment.id}`, {
                onSuccess: () => {
                    toast.success(`Adjustment ${adjustment.adjustment_number} deleted`);
                    router.reload({ only: ['adjustments'] });
                },
                onError: (errors) => {
                    toast.error(errors.message || 'Failed to delete adjustment');
                },
            });
        }
    };

    const handleView = (adjustment: Adjustment) => {
        setViewingAdjustment(adjustment);
        setIsViewModalOpen(true);
    };

    const handleStatusChange = (adjustment: Adjustment, newStatus: Adjustment['status']) => {
        router.put(`/bulkstore/adjustments/${adjustment.id}/status`, { status: newStatus }, {
            onSuccess: () => {
                toast.success(`Status changed to ${newStatus}`);
                setIsViewModalOpen(false);
                router.reload({ only: ['adjustments'] });
            },
            onError: (errors) => {
                toast.error(errors.message || 'Failed to update status');
            },
        });
    };

    const handleInputChange = (
        e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
    ) => {
        const { name, value } = e.target;
        setFormData((prev) => ({
            ...prev,
            [name]: name === 'adjustment_difference' || name === 'proposed_quantity' || name === 'current_stock'
                ? parseInt(value) || 0 
                : value,
        }));
    };

    // Adjust Stock Handlers
    const handleOpenAdjustStock = (adjustment?: Adjustment) => {
        if (adjustment) {
            setSelectedProductId(adjustment.product_id);
            setSelectedProductName(
                adjustment.product?.product_name || 
                `Product #${adjustment.product_id}`
            );
            setSelectedCurrentStock(adjustment.current_stock || 0);
        } else {
            setSelectedProductId(undefined);
            setSelectedProductName(undefined);
            setSelectedCurrentStock(undefined);
        }
        setIsAdjustStockModalOpen(true);
        setIsViewModalOpen(false);
    };

    const handleAdjustStockSuccess = () => {
        toast.success('Stock adjusted successfully');
        setIsAdjustStockModalOpen(false);
        router.reload({ only: ['adjustments'] });
    };

    const handleAdjustStockCancel = () => {
        setIsAdjustStockModalOpen(false);
        setSelectedProductId(undefined);
        setSelectedProductName(undefined);
        setSelectedCurrentStock(undefined);
    };

    // Handle search and filters
    const handleSearch = (value: string) => {
        setSearchTerm(value);
        router.get('/bulkstore/adjustments', 
            { search: value, status: statusFilter, type: typeFilter },
            { preserveState: true, replace: true, only: ['adjustments'] }
        );
    };

    const handleStatusFilter = (value: string) => {
        setStatusFilter(value);
        router.get('/bulkstore/adjustments',
            { search: searchTerm, status: value, type: typeFilter },
            { preserveState: true, replace: true, only: ['adjustments'] }
        );
    };

    const handleTypeFilter = (value: string) => {
        setTypeFilter(value);
        router.get('/bulkstore/adjustments',
            { search: searchTerm, status: statusFilter, type: value },
            { preserveState: true, replace: true, only: ['adjustments'] }
        );
    };

    const handlePageChange = (page: number) => {
        router.get('/bulkstore/adjustments',
            { 
                page, 
                search: searchTerm, 
                status: statusFilter, 
                type: typeFilter 
            },
            { preserveState: true, replace: true, only: ['adjustments'] }
        );
    };

    const handlePageSizeChange = (size: number) => {
        router.get('/bulkstore/adjustments',
            { 
                per_page: size, 
                search: searchTerm, 
                status: statusFilter, 
                type: typeFilter 
            },
            { preserveState: true, replace: true, only: ['adjustments'] }
        );
    };

    // Define columns
    const columns: Column<Adjustment>[] = [
        {
            id: 'adjustment_number',
            label: 'Adjustment #',
            minWidth: 120,
            sortable: true,
        },
        {
            id: 'product_name',
            label: 'Product',
            minWidth: 200,
            sortable: true,
        },
        {
            id: 'product_code',
            label: 'Code',
            minWidth: 100,
        },
        {
            id: 'adjustment_difference',
            label: 'Quantity',
            minWidth: 80,
            align: 'right',
            format: (value) => {
                if (typeof value === 'number') {
                    return value < 0 ? `(${Math.abs(value)})` : value.toString();
                }
                return value;
            },
        },
        {
            id: 'category',
            label: 'Type',
            minWidth: 120,
            filterType: 'select',
            filterOptions: [
                { value: 'correction', label: 'Correction' },
                { value: 'damage', label: 'Damage' },
                { value: 'expiry', label: 'Expiry' },
                { value: 'shortage', label: 'Shortage' },
                { value: 'surplus', label: 'Surplus' },
                { value: 'quality_issue', label: 'Quality Issue' },
            ],
        },
        {
            id: 'status',
            label: 'Status',
            minWidth: 120,
            filterType: 'status',
            statusColors: {
                draft: 'default',
                pending: 'warning',
                approved: 'info',
                applied: 'success',
                rejected: 'error',
            },
        },
        {
            id: 'reason',
            label: 'Reason',
            minWidth: 200,
            format: (value) => value || '-',
        },
        {
            id: 'created_at',
            label: 'Created',
            minWidth: 130,
            format: (value) => {
                if (typeof value === 'string') {
                    return new Date(value).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                    });
                }
                return value;
            },
        },
    ];

    // Simplified actions - Only View with full details modal
    const actions: Action<Adjustment>[] = [
        {
            label: 'View',
            icon: <Eye className="h-4 w-4" />,
            color: 'info',
            variant: 'text',
            onClick: handleView,
            show: (row) => true, // Always show
        },
        {
            label: 'Edit',
            icon: <Pencil className="h-4 w-4" />,
            color: 'primary',
            variant: 'text',
            onClick: handleEdit,
            show: (row) => row.status === 'draft' || row.status === 'pending',
        },
        {
            label: 'Delete',
            icon: <Trash2 className="h-4 w-4" />,
            color: 'error',
            variant: 'text',
            onClick: handleDelete,
            show: (row) => row.status === 'draft' || row.status === 'pending',
        },
        {
            label: 'Apply',
            icon: <Check className="h-4 w-4" />,
            color: 'success',
            variant: 'contained',
            onClick: (row) => handleStatusChange(row, 'applied'),
            show: (row) => row.status === 'pending' || row.status === 'approved',
        },
        {
            label: 'Reject',
            icon: <X className="h-4 w-4" />,
            color: 'error',
            variant: 'outlined',
            onClick: (row) => handleStatusChange(row, 'rejected'),
            show: (row) => row.status === 'pending',
        },
    ];

    // Status and type options
    const statusOptions = [
        { value: 'all', label: 'All Status' },
        { value: 'draft', label: 'Draft' },
        { value: 'pending', label: 'Pending' },
        { value: 'approved', label: 'Approved' },
        { value: 'applied', label: 'Applied' },
        { value: 'rejected', label: 'Rejected' },
    ];

    const typeOptions = [
        { value: 'all', label: 'All Types' },
        { value: 'correction', label: 'Correction' },
        { value: 'damage', label: 'Damage' },
        { value: 'expiry', label: 'Expiry' },
        { value: 'shortage', label: 'Shortage' },
        { value: 'surplus', label: 'Surplus' },
        { value: 'quality_issue', label: 'Quality Issue' },
    ];

    return (
        <AppLayout
            breadcrumbs={[
                { title: 'Bulk Store', href: '/bulkstore' },
                { title: 'Adjustments', href: '/bulkstore/adjustments' },
            ]}
        >
            <Head title="Product Adjustments" />

            <div className="min-h-screen bg-blue-50">
                <Container>
                    <PageHeader
                        title="Product Adjustments"
                        subtitle="Manage stock corrections, damages, expiries, returns, and other inventory adjustments for healthcare products."
                        icon={<Barcode className="h-5 w-5 text-blue-600" />}
                        actions={[
                        
                            {
                                label: 'Adjust Stock',
                                icon: <SlidersHorizontal className="h-4 w-4" />,
                                variant: 'warning',
                                onClick: () => handleOpenAdjustStock(),
                            },
                        ]}
                    />
                    <div className="w-full">
                        <div className="overflow-hidden rounded-lg bg-white shadow-sm">
                            <ReusableTable
                                columns={columns}
                                data={data}
                                actions={actions}
                                title="Adjustments List"
                                loading={loading}
                                statusFilterKey="status"
                                statusOptions={statusOptions}
                                onRowClick={(row) => handleView(row)}
                                onSearchChange={handleSearch}
                                onStatusChange={handleStatusFilter}
                                rowsPerPageOptions={[5, 10, 25, 50]}
                                defaultRowsPerPage={paginationState.pageSize || 10}
                                defaultOrderBy="created_at"
                                defaultOrder="desc"
                                emptyMessage="No adjustments found. Create a new adjustment to get started."
                                filterPlaceholder="Search adjustments..."
                                pagination={paginationState}
                                onPageChange={handlePageChange}
                                onPageSizeChange={handlePageSizeChange}
                                additionalFilters={[
                                    {
                                        key: 'type',
                                        label: 'Type',
                                        options: typeOptions,
                                        value: typeFilter,
                                        onChange: handleTypeFilter,
                                    },
                                ]}
                            />
                        </div>
                    </div>
                </Container>
            </div>

            {/* View Adjustment Modal */}
            <ViewAdjustmentModal
                isOpen={isViewModalOpen}
                onClose={() => setIsViewModalOpen(false)}
                adjustment={viewingAdjustment}
            />

            {/* Edit/Create Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-lg bg-white">
                        <div className="p-6">
                            <div className="mb-4 flex items-center justify-between">
                                <h3 className="text-xl font-semibold text-gray-800">
                                    {editingAdjustment ? 'Edit Adjustment' : 'Create New Adjustment'}
                                </h3>
                                <button
                                    onClick={() => {
                                        setIsModalOpen(false);
                                        setEditingAdjustment(null);
                                        setFormData({});
                                    }}
                                    className="rounded-lg p-1 transition-colors hover:bg-gray-100"
                                >
                                    <X className="h-5 w-5 text-gray-500" />
                                </button>
                            </div>

                            <div className="space-y-4">
                                {/* Adjustment Number */}
                                <div>
                                    <label className="mb-1 block text-sm font-medium text-gray-700">
                                        Adjustment Number
                                    </label>
                                    <input
                                        type="text"
                                        name="adjustment_number"
                                        value={formData.adjustment_number || ''}
                                        onChange={handleInputChange}
                                        disabled={!!editingAdjustment}
                                        className="w-full rounded-md border border-gray-300 px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none disabled:cursor-not-allowed disabled:bg-gray-100"
                                    />
                                </div>

                                {/* Product ID */}
                                <div>
                                    <label className="mb-1 block text-sm font-medium text-gray-700">
                                        Product ID
                                    </label>
                                    <input
                                        type="number"
                                        name="product_id"
                                        value={formData.product_id || ''}
                                        onChange={handleInputChange}
                                        className="w-full rounded-md border border-gray-300 px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                        placeholder="Enter product ID"
                                    />
                                </div>

                                {/* Current Stock */}
                                <div>
                                    <label className="mb-1 block text-sm font-medium text-gray-700">
                                        Current Stock
                                    </label>
                                    <input
                                        type="number"
                                        name="current_stock"
                                        value={formData.current_stock || 0}
                                        onChange={handleInputChange}
                                        className="w-full rounded-md border border-gray-300 px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                        placeholder="Current stock quantity"
                                    />
                                </div>

                                {/* Proposed Quantity */}
                                <div>
                                    <label className="mb-1 block text-sm font-medium text-gray-700">
                                        Proposed Quantity
                                    </label>
                                    <input
                                        type="number"
                                        name="proposed_quantity"
                                        value={formData.proposed_quantity || 0}
                                        onChange={handleInputChange}
                                        className="w-full rounded-md border border-gray-300 px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                        placeholder="Proposed new quantity"
                                    />
                                </div>

                                {/* Adjustment Difference */}
                                <div>
                                    <label className="mb-1 block text-sm font-medium text-gray-700">
                                        Adjustment Difference
                                    </label>
                                    <input
                                        type="number"
                                        name="adjustment_difference"
                                        value={formData.adjustment_difference || 0}
                                        onChange={handleInputChange}
                                        className="w-full rounded-md border border-gray-300 px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                        placeholder="Difference (positive or negative)"
                                    />
                                    <p className="mt-1 text-xs text-gray-500">
                                        Positive for addition, negative for reduction
                                    </p>
                                </div>

                                {/* Category */}
                                <div>
                                    <label className="mb-1 block text-sm font-medium text-gray-700">
                                        Adjustment Category
                                    </label>
                                    <select
                                        name="category"
                                        value={formData.category || 'correction'}
                                        onChange={handleInputChange}
                                        className="w-full rounded-md border border-gray-300 px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                    >
                                        <option value="correction">Correction</option>
                                        <option value="damage">Damage</option>
                                        <option value="expiry">Expiry</option>
                                        <option value="shortage">Shortage</option>
                                        <option value="surplus">Surplus</option>
                                        <option value="quality_issue">Quality Issue</option>
                                    </select>
                                </div>

                                {/* Batch Number */}
                                <div>
                                    <label className="mb-1 block text-sm font-medium text-gray-700">
                                        Batch Number
                                    </label>
                                    <input
                                        type="text"
                                        name="batch_number"
                                        value={formData.batch_number || ''}
                                        onChange={handleInputChange}
                                        className="w-full rounded-md border border-gray-300 px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                        placeholder="Enter batch number"
                                    />
                                </div>

                                {/* Expiry Date */}
                                <div>
                                    <label className="mb-1 block text-sm font-medium text-gray-700">
                                        Expiry Date
                                    </label>
                                    <input
                                        type="date"
                                        name="expiry_date"
                                        value={formData.expiry_date || ''}
                                        onChange={handleInputChange}
                                        className="w-full rounded-md border border-gray-300 px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                    />
                                </div>

                                {/* Unit Cost */}
                                <div>
                                    <label className="mb-1 block text-sm font-medium text-gray-700">
                                        Unit Cost
                                    </label>
                                    <input
                                        type="number"
                                        name="unit_cost"
                                        value={formData.unit_cost || ''}
                                        onChange={handleInputChange}
                                        step="0.01"
                                        className="w-full rounded-md border border-gray-300 px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                        placeholder="Enter unit cost"
                                    />
                                </div>

                                {/* Status (only for editing) */}
                                {editingAdjustment && (
                                    <div>
                                        <label className="mb-1 block text-sm font-medium text-gray-700">
                                            Status
                                        </label>
                                        <select
                                            name="status"
                                            value={formData.status || 'draft'}
                                            onChange={handleInputChange}
                                            className="w-full rounded-md border border-gray-300 px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                        >
                                            <option value="draft">Draft</option>
                                            <option value="pending">Pending</option>
                                            <option value="approved">Approved</option>
                                            <option value="applied">Applied</option>
                                            <option value="rejected">Rejected</option>
                                        </select>
                                    </div>
                                )}

                                {/* Reason */}
                                <div>
                                    <label className="mb-1 block text-sm font-medium text-gray-700">
                                        Reason
                                    </label>
                                    <textarea
                                        name="reason"
                                        value={formData.reason || ''}
                                        onChange={handleInputChange}
                                        rows={3}
                                        className="w-full rounded-md border border-gray-300 px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                        placeholder="Enter reason for adjustment"
                                    />
                                </div>
                            </div>

                            {/* Modal Actions */}
                            <div className="mt-6 flex justify-end gap-2 border-t pt-4">
                                <button
                                    onClick={() => {
                                        setIsModalOpen(false);
                                        setEditingAdjustment(null);
                                        setFormData({});
                                    }}
                                    className="rounded-lg border border-gray-300 px-4 py-2 transition-colors hover:bg-gray-50"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleSave}
                                    disabled={loading}
                                    className="rounded-lg bg-blue-600 px-4 py-2 text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
                                >
                                    {loading ? 'Saving...' : (editingAdjustment ? 'Update' : 'Create')}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* AdjustStock Modal */}
            <AdjustStockModal
                isOpen={isAdjustStockModalOpen}
                onClose={handleAdjustStockCancel}
                productId={selectedProductId}
                currentStock={selectedCurrentStock}
                productName={selectedProductName}
                onSuccess={handleAdjustStockSuccess}
            />
        </AppLayout>
    );
}