// pages/bulkstore/PurchaseRequisition.tsx

import React, { useState, useEffect, useMemo } from 'react';
import { usePage } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import Container from '@/components/Container';
import PageHeader from '@/components/PageHeader';
import Http from '@/utils/Http';
import { ReusableTable, Column, Action } from '@/components/ReusableTable';
import { FileBox } from 'lucide-react';

import RequisitionDetailsModal from './components/modals/RequisitionDetailsModal';

import PurchaseRequisitionModal from './components/modals/PurchaseRequisition';
import {
    Plus,
    RefreshCw,
    Eye,
    Edit,
    Trash2,
    CheckCircle,
    XCircle,
    FileText,
    Clock,
    Package,
} from 'lucide-react';

// ============================================
// TYPES
// ============================================

interface Department {
    id: number;
    name: string;
    code: string;
}

interface Budget {
    id: number;
    budget_code: string;
    budget_name: string;
    available: number;
    utilization: number;
}

interface Supplier {
    id: number;
    supplier_name: string;
    supplier_code: string;
    contact_person?: string;
}

interface Product {
    id: number;
    product_name: string;
    product_code: string;
    strength?: string;
    form?: string;
    quantity?: number;
}

interface RequisitionItem {
    id?: number;
    product_id: number;
    product_name: string;
    product_code: string;
    quantity: number;
    estimated_unit_price: number;
    total: number;
    required_by_date: string;
    status: 'pending' | 'approved' | 'rejected' | 'cancelled';
    notes?: string;
}

interface Requisition {
    id: number;
    pr_number: string;
    department_id: number;
    department: {
        name: string;
    };
    budget_code: string;
    budget_name: string;
    supplier_id?: number;
    supplier_name?: string;
    required_date: string;
    priority: 'low' | 'medium' | 'high' | 'urgent';
    justification: string;
    status:
        | 'draft'
        | 'pending'
        | 'approved'
        | 'rejected'
        | 'converted'
        | 'cancelled';
    total_amount: number;
    items: RequisitionItem[];
    created_by: number;
    created_by_name: string;
    created_at: string;
    updated_at: string;
}

// ============================================
// STATUS CONFIG
// ============================================

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
    draft: {
        label: 'Draft',
        color: 'default',
    },
    pending: {
        label: 'Pending',
        color: 'warning',
    },
    approved: {
        label: 'Approved',
        color: 'success',
    },
    rejected: {
        label: 'Rejected',
        color: 'error',
    },
    converted: {
        label: 'Converted',
        color: 'info',
    },
    cancelled: {
        label: 'Cancelled',
        color: 'secondary',
    },
};

const PRIORITY_CONFIG: Record<string, { label: string; color: string }> = {
    low: {
        label: 'Low',
        color: 'info',
    },
    medium: {
        label: 'Medium',
        color: 'warning',
    },
    high: {
        label: 'High',
        color: 'error',
    },
    urgent: {
        label: 'Urgent',
        color: 'error',
    },
};

// ============================================
// MAIN COMPONENT
// ============================================

export default function PurchaseRequisitionPage() {
    const { props } = usePage();
    const {
        departments = [],
        budgets = [],
        suppliers = [],
        products = [],
    } = props;

    // State
    const [showModal, setShowModal] = useState(false);
    const [loading, setLoading] = useState(false);
    const [requisitions, setRequisitions] = useState<Requisition[]>([]);
    const [editingRequisition, setEditingRequisition] =
        useState<Requisition | null>(null);

    // Pagination
    const [pagination, setPagination] = useState({
        currentPage: 1,
        pageSize: 10,
        totalItems: 0,
        totalPages: 1,
    });

    // Modal props preselected
    const [preselectedProduct, setPreselectedProduct] = useState<number | null>(
        null,
    );

    // ============================================
    // FETCH REQUISITIONS
    // ============================================

    const fetchRequisitions = async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams({
                page: String(pagination.currentPage),
                page_size: String(pagination.pageSize),
            });

            const response = await Http.get(
                `/bulk-store/requisitions?${params}`
            );
            const data = response.data;

            setRequisitions(data.data || []);
            setPagination({
                ...pagination,
                totalItems: data.total || 0,
                totalPages: data.last_page || 1,
            });
        } catch (error) {
            console.error('Failed to fetch requisitions:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchRequisitions();
    }, [pagination.currentPage, pagination.pageSize]);

    // ============================================
    // HANDLERS
    // ============================================

    const handleCheckBudget = async (budgetCode: string, amount: number) => {
        try {
            const response = await Http.get(
                `bulk-store/requisition/budget/check-balance/${budgetCode}/${amount}`,
            );
            return response.data;
        } catch (error) {
            console.error('Budget check failed:', error);
            return null;
        }
    };

    const [viewingRequisition, setViewingRequisition] = useState<Requisition | null>(null);
const [showViewModal, setShowViewModal] = useState(false);

// Update the handleView function
const handleView = (requisition: Requisition) => {
    setViewingRequisition(requisition);
    setShowViewModal(true);
};
    const handleSubmit = async (data: any) => {
        try {
            const response = await Http.post(
                '/bulk-store/purchase/requisition/create',
                data,
                {
                    headers: {
                        'Content-Type': 'application/json',
                        'X-CSRF-TOKEN':
                            document
                                .querySelector('meta[name="csrf-token"]')
                                ?.getAttribute('content') || '',
                    },
                },
            );
            await fetchRequisitions();
            return response.data;
        } catch (error) {
            throw error;
        }
    };

    

    const handleEdit = (requisition: Requisition) => {
        setEditingRequisition(requisition);
        setShowModal(true);
    };

    const handleDelete = async (id: number) => {
        if (!confirm('Are you sure you want to delete this requisition?'))
            return;
        try {
            await Http.delete(`/bulkstore/purchase/requisition/${id}`);
            await fetchRequisitions();
        } catch (error) {
            console.error('Failed to delete:', error);
            alert('Failed to delete requisition');
        }
    };

    const handleApprove = async (id: number) => {
        if (!confirm('Approve this requisition?')) return;
        try {
            await Http.post(`/bulkstore/purchase/requisition/${id}/approve`);
            await fetchRequisitions();
        } catch (error) {
            console.error('Failed to approve:', error);
            alert('Failed to approve requisition');
        }
    };

    const handleReject = async (id: number) => {
        const reason = prompt('Enter rejection reason:');
        if (reason === null) return;
        try {
            await Http.post(`/bulkstore/purchase/requisition/${id}/reject`, {
                reason,
            });
            await fetchRequisitions();
        } catch (error) {
            console.error('Failed to reject:', error);
            alert('Failed to reject requisition');
        }
    };

    const handleQuickAdd = (productId: number) => {
        setPreselectedProduct(productId);
        setEditingRequisition(null);
        setShowModal(true);
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-ZM', {
            style: 'currency',
            currency: 'ZMW',
        }).format(amount);
    };

    const formatDate = (date: string) => {
        return new Date(date).toLocaleDateString('en-ZM', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
        });
    };

    // ============================================
    // TABLE DEFINITIONS
    // ============================================

    const columns: Column<Requisition>[] = [
        {
            id: 'pr_number',
            label: 'PR Number',
            minWidth: 140,
            format: (value, row) => (
                <div className="flex items-center gap-2">
                    <span className="font-mono text-sm font-medium text-slate-800 dark:text-slate-200">
                        {value}
                    </span>
                    <span
                        className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${
                            PRIORITY_CONFIG[row.priority]?.color === 'info'
                                ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400'
                                : PRIORITY_CONFIG[row.priority]?.color === 'warning'
                                ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
                                : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                        }`}
                    >
                        <span className="h-1.5 w-1.5 rounded-full bg-current" />
                        {PRIORITY_CONFIG[row.priority]?.label || 'Medium'}
                    </span>
                </div>
            ),
            sortable: true,
        },
        {
            id: 'department',
            label: 'Department',
            minWidth: 130,
            format: (value) => value?.name || 'N/A',
            sortable: true,
        },
        {
            id: 'budget_code',
            label: 'Budget',
            minWidth: 120,
            format: (value, row) => (
                <div>
                    <span className="font-mono text-xs">{value}</span>
                    <div className="text-[10px] text-slate-400 dark:text-slate-500">
                        {row.budget_name}
                    </div>
                </div>
            ),
            sortable: true,
        },
        {
            id: 'status',
            label: 'Status',
            minWidth: 110,
            filterType: 'status',
            statusColors: {
                draft: 'default',
                pending: 'warning',
                approved: 'success',
                rejected: 'error',
                converted: 'info',
                cancelled: 'secondary',
            },
            format: (value) => {
                const config = STATUS_CONFIG[value] || STATUS_CONFIG.draft;
                const colorMap: Record<string, string> = {
                    default: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
                    warning: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
                    success: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
                    error: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
                    info: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
                    secondary: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
                };
                return (
                    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${colorMap[config.color]}`}>
                        {config.label}
                    </span>
                );
            },
            sortable: true,
        },
        {
            id: 'items',
            label: 'Items',
            minWidth: 80,
            format: (value) => (
                <div className="flex items-center gap-1">
                    <span className="font-medium">{value?.length || 0}</span>
                    <span className="text-xs text-slate-400 dark:text-slate-500">
                        items
                    </span>
                </div>
            ),
        },
        {
            id: 'total_amount',
            label: 'Total',
            minWidth: 100,
            align: 'right',
            format: (value) => (
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                    {formatCurrency(value || 0)}
                </span>
            ),
            sortable: true,
        },
        {
            id: 'created_at',
            label: 'Date',
            minWidth: 100,
            format: (value) => formatDate(value),
            sortable: true,
        },
    ];

    const actions: Action<Requisition>[] = [
        {
            label: 'View',
            icon: <Eye className="h-4 w-4" />,
            color: 'primary',
            onClick: handleView
        },
        {
            label: 'Edit',
            icon: <Edit className="h-4 w-4" />,
            color: 'warning',
            onClick: handleEdit,
            show: (row) => row.status === 'draft',
        },
        {
            label: 'Approve',
            icon: <CheckCircle className="h-4 w-4" />,
            color: 'success',
            onClick: (row) => handleApprove(row.id),
            show: (row) => row.status === 'pending',
        },
        {
            label: 'Reject',
            icon: <XCircle className="h-4 w-4" />,
            color: 'error',
            onClick: (row) => handleReject(row.id),
            show: (row) => row.status === 'pending',
        },
        {
            label: 'Delete',
            icon: <Trash2 className="h-4 w-4" />,
            color: 'error',
            onClick: (row) => handleDelete(row.id),
            show: (row) => row.status !== 'converted' && row.status !== 'cancelled',
        },
    ];

    // Status options for filtering
    const statusOptions = Object.entries(STATUS_CONFIG).map(([key, value]) => ({
        value: key,
        label: value.label,
    }));

    // ============================================
    // RENDER
    // ============================================

    console.log(requisitions)
    return (
        <AppLayout
            breadcrumbs={[
                {
                    title: 'Procurements',
                    href: '/',
                },
                {
                    title: 'Purchase Requisition',
                    href: '',
                },
            ]}
        >
            <div className="bg-slate-100 px-10">
                <PageHeader
                    title="Purchase Requisitions"
                    subtitle="Create and manage purchase requisitions with item status tracking"
                    actions={[
                        {
                            label: 'Create PR',
                            icon: <Plus className="h-4 w-4" />,
                            onClick: () => {
                                setPreselectedProduct(null);
                                setEditingRequisition(null);
                                setShowModal(true);
                            },
                            variant: 'primary',
                        },
                        {
                            label: 'Refresh',
                            icon: <RefreshCw className="h-4 w-4" />,
                            onClick: fetchRequisitions,
                            variant: 'outline',
                            size: 'sm',
                            loading: loading,
                        },
                    ]} 
                    icon={<FileBox />}
                />
                <Container>
                    {/* Reusable Table */}
                    <ReusableTable
                        columns={columns}
                        data={requisitions}
                        actions={actions}
                        loading={loading}
                        rowsPerPageOptions={[8]}
                        defaultRowsPerPage={8}
                        defaultOrderBy="created_at"
                        defaultOrder="desc"
                        filterPlaceholder="Search by PR number, department..."
                        statusFilterKey="status"
                        statusOptions={statusOptions}
                        emptyMessage="No requisitions found"
                    />

                    {/* ============================================ */}
                    {/* MODALS */}
                    {/* ============================================ */}

                    {/* Create/Edit Modal */}
                    <PurchaseRequisitionModal
                        isOpen={showModal}
                        onClose={() => {
                            setShowModal(false);
                            setPreselectedProduct(null);
                            setEditingRequisition(null);
                        }}
                        onSuccess={() => {
                            setShowModal(false);
                            setPreselectedProduct(null);
                            setEditingRequisition(null);
                            fetchRequisitions();
                        }}
                        departments={departments}
                        budgets={budgets}
                        suppliers={suppliers}
                        products={products}
                        onCheckBudget={handleCheckBudget}
                        onSubmit={handleSubmit}
                        preselectedProduct={preselectedProduct}
                        editData={editingRequisition}
                        mode={editingRequisition ? 'edit' : 'create'}
                    /> 
                       <RequisitionDetailsModal
            isOpen={showViewModal}
            onClose={() => {
                setShowViewModal(false);
                setViewingRequisition(null);
            }}
            requisition={viewingRequisition}
        />
                </Container>
            </div>
        </AppLayout>
    );
}