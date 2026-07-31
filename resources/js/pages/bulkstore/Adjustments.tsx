// resources/js/pages/bulkstore/Adjustments.tsx

import React, { useState } from 'react';
import { Head } from '@inertiajs/react';
import { toast } from 'react-hot-toast';
import AppLayout from '@/layouts/app-layout';
import PageHeader from '@/components/PageHeader';
import Container from '@/components/container';
import AdjustStockModal from './components/AdjustStock';
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
} from 'lucide-react';
import ReusableTable, { Column, Action } from '@/components/ReusableTable';
import { sampleAdjustments } from './sampleData';

// Define the Adjustment type
export interface Adjustment {
    id: number;
    adjustment_number: string;
    product_name: string;
    product_code: string;
    quantity: number;
    type: 'damage' | 'expiry' | 'return' | 'correction' | 'other';
    status: 'draft' | 'pending' | 'approved' | 'rejected' | 'completed';
    reason: string;
    created_at: string;
    updated_at: string;
    product_id?: number;
    current_stock?: number;
}

interface Props {
    adjustments?: Adjustment[];
    filters?: any;
}

export default function Adjustments({ adjustments, filters }: Props) {
    // Use sample data if no props provided, otherwise use provided data
    const [data, setData] = useState<Adjustment[]>(
        adjustments || sampleAdjustments,
    );

    // Modal state
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingAdjustment, setEditingAdjustment] =
        useState<Adjustment | null>(null);
    const [formData, setFormData] = useState<Partial<Adjustment>>({});

    // AdjustStock Modal state
    const [isAdjustStockModalOpen, setIsAdjustStockModalOpen] = useState(false);
    const [selectedProductId, setSelectedProductId] = useState<
        number | undefined
    >();
    const [selectedProductName, setSelectedProductName] = useState<
        string | undefined
    >();
    const [selectedCurrentStock, setSelectedCurrentStock] = useState<
        number | undefined
    >();

    // CRUD Handlers
    const handleCreate = () => {
        setEditingAdjustment(null);
        setFormData({
            adjustment_number: `ADJ-${String(new Date().getFullYear())}-${String(data.length + 1).padStart(3, '0')}`,
            status: 'draft',
            type: 'correction',
            quantity: 0,
            reason: '',
        });
        setIsModalOpen(true);
    };

    const handleEdit = (adjustment: Adjustment) => {
        // Only allow editing if status is draft or pending
        if (
            adjustment.status === 'approved' ||
            adjustment.status === 'rejected' ||
            adjustment.status === 'completed'
        ) {
            toast.error(
                'Cannot edit approved, rejected, or completed adjustments',
            );
            return;
        }
        setEditingAdjustment(adjustment);
        setFormData(adjustment);
        setIsModalOpen(true);
    };

    const handleSave = async () => {
        try {
            if (editingAdjustment) {
                // Update existing adjustment
                const updatedData = data.map((item) =>
                    item.id === editingAdjustment.id
                        ? {
                              ...item,
                              ...formData,
                              updated_at: new Date().toISOString(),
                          }
                        : item,
                );
                setData(updatedData);
                toast.success(
                    `Adjustment ${formData.adjustment_number} updated successfully`,
                );
            } else {
                // Create new adjustment
                const newAdjustment: Adjustment = {
                    id: data.length + 1,
                    adjustment_number:
                        formData.adjustment_number ||
                        `ADJ-${String(new Date().getFullYear())}-${String(data.length + 1).padStart(3, '0')}`,
                    product_name: formData.product_name || '',
                    product_code: formData.product_code || '',
                    quantity: formData.quantity || 0,
                    type: (formData.type as Adjustment['type']) || 'correction',
                    status: 'draft',
                    reason: formData.reason || '',
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                };
                setData([newAdjustment, ...data]);
                toast.success('Adjustment created successfully');
            }
            setIsModalOpen(false);
            setEditingAdjustment(null);
            setFormData({});
        } catch (error) {
            toast.error('Failed to save adjustment');
            console.error(error);
        }
    };

    const handleDelete = async (adjustment: Adjustment) => {
        // Only allow deletion if status is draft or pending
        if (
            adjustment.status === 'approved' ||
            adjustment.status === 'rejected' ||
            adjustment.status === 'completed'
        ) {
            toast.error(
                'Cannot delete approved, rejected, or completed adjustments',
            );
            return;
        }

        if (
            window.confirm(
                `Are you sure you want to delete adjustment ${adjustment.adjustment_number}?`,
            )
        ) {
            setData(data.filter((item) => item.id !== adjustment.id));
            toast.success(`Adjustment ${adjustment.adjustment_number} deleted`);
        }
    };

    const handleBulkDelete = async (adjustments: Adjustment[]) => {
        const deletable = adjustments.filter(
            (item) => item.status === 'draft' || item.status === 'pending',
        );
        if (deletable.length === 0) {
            toast.error(
                'No deletable adjustments selected (only draft/pending can be deleted)',
            );
            return;
        }
        if (window.confirm(`Delete ${deletable.length} adjustments?`)) {
            const ids = new Set(deletable.map((item) => item.id));
            setData(data.filter((item) => !ids.has(item.id)));
            toast.success(`${deletable.length} adjustments deleted`);
        }
    };

    const handleDuplicate = async (adjustment: Adjustment) => {
        const newAdjustment: Adjustment = {
            ...adjustment,
            id: data.length + 1,
            adjustment_number: `${adjustment.adjustment_number}-copy`,
            status: 'draft',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
        };
        setData([newAdjustment, ...data]);
        toast.success(`Adjustment ${adjustment.adjustment_number} duplicated`);
        return newAdjustment;
    };

    const handleView = (adjustment: Adjustment) => {
        setEditingAdjustment(adjustment);
        setFormData(adjustment);
        setIsModalOpen(true);
        // In a real app, you might open a view-only modal
        toast.info(`Viewing ${adjustment.adjustment_number}`);
    };

    const handlePrint = (adjustment: Adjustment) => {
        toast.info(`Printing ${adjustment.adjustment_number}`);
        console.log('Print:', adjustment);
    };

    const handleExport = (data: Adjustment[]) => {
        toast.success(`Exporting ${data.length} adjustments`);
        console.log('Export:', data);
    };

    const handleStatusChange = async (
        adjustment: Adjustment,
        newStatus: Adjustment['status'],
    ) => {
        const updatedData = data.map((item) =>
            item.id === adjustment.id
                ? {
                      ...item,
                      status: newStatus,
                      updated_at: new Date().toISOString(),
                  }
                : item,
        );
        setData(updatedData);
        toast.success(`Status changed to ${newStatus}`);
    };

    const handleBulkAction = async (
        adjustments: Adjustment[],
        action: string,
    ) => {
        toast.success(`${action} action on ${adjustments.length} adjustments`);
        console.log('Bulk Action:', adjustments, action);
    };

    // Handle form input changes
    const handleInputChange = (
        e: React.ChangeEvent<
            HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
        >,
    ) => {
        const { name, value } = e.target;
        setFormData((prev) => ({
            ...prev,
            [name]: name === 'quantity' ? parseInt(value) || 0 : value,
        }));
    };

    // ============================================
    // ADJUST STOCK HANDLERS
    // ============================================

    const handleOpenAdjustStock = (adjustment?: Adjustment) => {
        if (adjustment) {
            setSelectedProductId(adjustment.product_id);
            setSelectedProductName(adjustment.product_name);
            setSelectedCurrentStock(adjustment.current_stock || 0);
        } else {
            // For new adjustment, open with no product selected
            setSelectedProductId(undefined);
            setSelectedProductName(undefined);
            setSelectedCurrentStock(undefined);
        }
        setIsAdjustStockModalOpen(true);
    };

    const handleAdjustStockSuccess = () => {
        toast.success('Stock adjusted successfully');
        // Refresh data or update the list
        // You could fetch updated adjustments here
        setIsAdjustStockModalOpen(false);
    };

    const handleAdjustStockCancel = () => {
        setIsAdjustStockModalOpen(false);
        setSelectedProductId(undefined);
        setSelectedProductName(undefined);
        setSelectedCurrentStock(undefined);
    };

    // Define columns for the table
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
            id: 'quantity',
            label: 'Quantity',
            minWidth: 80,
            align: 'right',
            format: (value) => {
                if (typeof value === 'number') {
                    return value < 0
                        ? `(${Math.abs(value)})`
                        : value.toString();
                }
                return value;
            },
        },
        {
            id: 'type',
            label: 'Type',
            minWidth: 120,
            filterType: 'select',
            filterOptions: [
                { value: 'damage', label: 'Damage' },
                { value: 'expiry', label: 'Expiry' },
                { value: 'return', label: 'Return' },
                { value: 'correction', label: 'Correction' },
                { value: 'other', label: 'Other' },
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
                approved: 'success',
                rejected: 'error',
                completed: 'info',
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

    // Define actions for the table with Lucide icons
    const actions: Action<Adjustment>[] = [
        {
            label: 'View',
            icon: <Eye className="h-4 w-4" />,
            color: 'info',
            variant: 'text',
            onClick: handleView,
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
            label: 'Duplicate',
            icon: <Copy className="h-4 w-4" />,
            color: 'secondary',
            variant: 'text',
            onClick: handleDuplicate,
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
            label: 'Print',
            icon: <Printer className="h-4 w-4" />,
            color: 'info',
            variant: 'text',
            onClick: handlePrint,
        },
        {
            label: 'Approve',
            icon: <Check className="h-4 w-4" />,
            color: 'success',
            variant: 'contained',
            onClick: (row) => handleStatusChange(row, 'approved'),
            show: (row) => row.status === 'pending',
        },
        {
            label: 'Reject',
            icon: <X className="h-4 w-4" />,
            color: 'error',
            variant: 'outlined',
            onClick: (row) => handleStatusChange(row, 'rejected'),
            show: (row) => row.status === 'pending',
        },
        {
            label: 'Adjust Stock',
            icon: <SlidersHorizontal className="h-4 w-4" />,
            color: 'warning',
            variant: 'outlined',
            onClick: (row) => handleOpenAdjustStock(row),
            show: (row) => row.status === 'approved' || row.status === 'draft',
        },
    ];

    // Status options for filtering
    const statusOptions = [
        { value: 'draft', label: 'Draft' },
        { value: 'pending', label: 'Pending' },
        { value: 'approved', label: 'Approved' },
        { value: 'rejected', label: 'Rejected' },
        { value: 'completed', label: 'Completed' },
    ];

    return (
        <AppLayout
            breadcrumbs={[
                { title: 'Bulk Store', href: '/pharmacy' },
                { title: 'Adjustment', href: '/pharmacy/logistics' },
            ]}
        >
            <Head title="Product Adjustments" />

            <div className="min-h-screen bg-slate-100">
                <Container>
                    <PageHeader
                        title="Product Adjustments"
                        subtitle="Manage stock corrections, damages, expiries, returns, and other inventory adjustments for healthcare products."
                        icon={<Barcode className="h-5 w-5 text-blue-600" />}
                        actions={[
                            {
                                label: 'New Adjustment',
                                icon: <Plus className="h-4 w-4" />,
                                variant: 'primary',
                                onClick: handleCreate,
                            },
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
                                statusFilterKey="status"
                                statusOptions={statusOptions}
                                onRowClick={(row) => handleView(row)}
                                rowsPerPageOptions={[5, 10, 25, 50]}
                                defaultRowsPerPage={10}
                                defaultOrderBy="created_at"
                                defaultOrder="desc"
                                emptyMessage="No adjustments found. Create a new adjustment to get started."
                                filterPlaceholder="Search adjustments..."
                            />
                        </div>
                    </div>
                </Container>
            </div>

            {/* Edit/Create Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-lg bg-white">
                        <div className="p-6">
                            <div className="mb-4 flex items-center justify-between">
                                <h3 className="text-xl font-semibold text-gray-800">
                                    {editingAdjustment
                                        ? 'Edit Adjustment'
                                        : 'Create New Adjustment'}
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

                                {/* Product Name */}
                                <div>
                                    <label className="mb-1 block text-sm font-medium text-gray-700">
                                        Product Name
                                    </label>
                                    <input
                                        type="text"
                                        name="product_name"
                                        value={formData.product_name || ''}
                                        onChange={handleInputChange}
                                        className="w-full rounded-md border border-gray-300 px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                        placeholder="Enter product name"
                                    />
                                </div>

                                {/* Product Code */}
                                <div>
                                    <label className="mb-1 block text-sm font-medium text-gray-700">
                                        Product Code
                                    </label>
                                    <input
                                        type="text"
                                        name="product_code"
                                        value={formData.product_code || ''}
                                        onChange={handleInputChange}
                                        className="w-full rounded-md border border-gray-300 px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                        placeholder="Enter product code"
                                    />
                                </div>

                                {/* Quantity */}
                                <div>
                                    <label className="mb-1 block text-sm font-medium text-gray-700">
                                        Quantity
                                    </label>
                                    <input
                                        type="number"
                                        name="quantity"
                                        value={formData.quantity || 0}
                                        onChange={handleInputChange}
                                        className="w-full rounded-md border border-gray-300 px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                        placeholder="Enter quantity (negative for reductions)"
                                    />
                                    <p className="mt-1 text-xs text-gray-500">
                                        Use negative values for stock reductions
                                    </p>
                                </div>

                                {/* Type */}
                                <div>
                                    <label className="mb-1 block text-sm font-medium text-gray-700">
                                        Adjustment Type
                                    </label>
                                    <select
                                        name="type"
                                        value={formData.type || 'correction'}
                                        onChange={handleInputChange}
                                        className="w-full rounded-md border border-gray-300 px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                    >
                                        <option value="damage">Damage</option>
                                        <option value="expiry">Expiry</option>
                                        <option value="return">Return</option>
                                        <option value="correction">
                                            Correction
                                        </option>
                                        <option value="other">Other</option>
                                    </select>
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
                                            <option value="pending">
                                                Pending
                                            </option>
                                            <option value="approved">
                                                Approved
                                            </option>
                                            <option value="rejected">
                                                Rejected
                                            </option>
                                            <option value="completed">
                                                Completed
                                            </option>
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
                                    className="rounded-lg bg-blue-600 px-4 py-2 text-white transition-colors hover:bg-blue-700"
                                >
                                    {editingAdjustment ? 'Update' : 'Create'}
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
