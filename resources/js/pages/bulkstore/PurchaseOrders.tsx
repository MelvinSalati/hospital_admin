// resources/js/pages/bulkstore/PurchaseOrder.tsx

import React, { useState, useEffect, useCallback } from 'react';
import { usePage } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import PageHeader from '@/components/PageHeader';
import Container from '@/components/container';
import { Button } from '@/components/ui/button';
import { ReusableTable, Column, Action } from '@/components/ReusableTable';
import Http from '@/utils/Http';
import ApprovalModal from './components/modals/ApprovalModal';
import {
    Plus,
    RefreshCw,
    Eye,
    Edit,
    Trash2,
    CheckCircle,
    XCircle,
    Clock,
    AlertTriangle,
    FileText,
    Package,
    Truck,
    CreditCard,
    Filter,
    Download,
    Printer,
    MoreVertical,
    ChevronDown,
    Shield,
    User,
    DollarSign,
    Key,
} from 'lucide-react';
import { toast } from 'react-hot-toast';

// ============================================
// TYPES
// ============================================

interface PurchaseOrderItem {
    id: number;
    product_id: number;
    product_name: string;
    product_code: string;
    quantity: number;
    unit_price: number;
    total: number;
    received_quantity?: number;
    remaining_quantity?: number;
    status: 'pending' | 'received' | 'partial' | 'cancelled';
}

interface PurchaseOrder {
    id: number;
    po_number?: string;
    pr_number: string;
    requisition_id: number | null;
    supplier_id: number | null;
    supplier?: {
        id: number;
        supplier_name: string;
        supplier_code: string;
    } | null;
    supplier_name?: string;
    supplier_code?: string;
    department_id: number;
    department?: {
        id: number;
        name: string;
        code: string;
        description: string;
    } | null;
    department_name?: string;
    budget_code: string;
    budget_name?: string;
    order_date?: string;
    expected_delivery_date: string;
    required_date?: string;
    delivery_date?: string;
    status:
        | 'draft'
        | 'pending'
        | 'approved'
        | 'sent'
        | 'received'
        | 'partial'
        | 'cancelled'
        | 'completed';
    priority: 'low' | 'medium' | 'high' | 'urgent';
    total_amount: number;
    paid_amount?: number;
    balance_amount?: number;
    payment_status?: 'unpaid' | 'partial' | 'paid';
    shipping_address?: string;
    special_instructions?: string;
    items: PurchaseOrderItem[];
    created_by?: number;
    created_by_name?: string;
    approved_by?: number | null;
    approved_by_name?: string | null;
    approved_at?: string | null;
    created_at: string;
    updated_at: string;
    justification?: string;
    request_date?: string;
    items_count?: number;
    items_sum_estimated_total?: number;
    estimated_total?: string;
    converted_to_po_id?: number | null;
    cost_center?: string | null;
    requester?: any;
    pr_number_id?: number | null;
}

// ============================================
// STATUS CONFIG
// ============================================

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
        color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
        icon: <CheckCircle className="h-3 w-3" />,
    },
    sent: {
        label: 'Sent',
        color: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
        icon: <Truck className="h-3 w-3" />,
    },
    received: {
        label: 'Received',
        color: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
        icon: <Package className="h-3 w-3" />,
    },
    partial: {
        label: 'Partial',
        color: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
        icon: <AlertTriangle className="h-3 w-3" />,
    },
    cancelled: {
        label: 'Cancelled',
        color: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
        icon: <XCircle className="h-3 w-3" />,
    },
    completed: {
        label: 'Completed',
        color: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
        icon: <CheckCircle className="h-3 w-3" />,
    },
};

const PAYMENT_STATUS_CONFIG: Record<string, { label: string; color: string }> =
    {
        unpaid: {
            label: 'Unpaid',
            color: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
        },
        partial: {
            label: 'Partial',
            color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
        },
        paid: {
            label: 'Paid',
            color: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
        },
    };

const PRIORITY_CONFIG: Record<string, { label: string; color: string }> = {
    low: {
        label: 'Low',
        color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
    },
    medium: {
        label: 'Medium',
        color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
    },
    high: {
        label: 'High',
        color: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
    },
    urgent: {
        label: 'Urgent',
        color: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
    },
};

// ============================================
// MAIN COMPONENT
// ============================================

export default function PurchaseOrder() {
    const { props } = usePage();
    const [loading, setLoading] = useState(false);
    const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
    const [activeTab, setActiveTab] = useState<string>('all');
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<string>('');
    const [pagination, setPagination] = useState({
        currentPage: 1,
        pageSize: 10,
        totalItems: 0,
        totalPages: 1,
    });

    // Approval Modal State
    const [showApprovalModal, setShowApprovalModal] = useState(false);
    const [selectedOrder, setSelectedOrder] = useState<PurchaseOrder | null>(
        null,
    );
    const [isApproving, setIsApproving] = useState(false);

    const { auth } = props;
    const userRole = auth?.user?.is_admin
        ? 'admin'
        : auth?.user?.is_supervisor
          ? 'supervisor'
          : 'staff';

    // Stats for dashboard
    const [stats, setStats] = useState({
        total: 0,
        pending: 0,
        approved: 0,
        received: 0,
        completed: 0,
        cancelled: 0,
        totalAmount: 0,
        paidAmount: 0,
        balanceAmount: 0,
    });

    // ============================================
    // HELPER FUNCTIONS
    // ============================================

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-ZM', {
            style: 'currency',
            currency: 'ZMW',
        }).format(amount);
    };

    const formatDate = (date: string) => {
        if (!date) return 'N/A';
        return new Date(date).toLocaleDateString('en-ZM', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
        });
    };

    // ============================================
    // FETCH PURCHASE ORDERS
    // ============================================

    const fetchPurchaseOrders = useCallback(async () => {
        setLoading(true);
        try {
            const params = {
                page: pagination.currentPage,
                page_size: pagination.pageSize,
                search: searchTerm,
                status: statusFilter || (activeTab !== 'all' ? activeTab : ''),
            };

            // Remove empty params
            Object.keys(params).forEach((key) => {
                if (params[key as keyof typeof params] === '') {
                    delete params[key as keyof typeof params];
                }
            });

            const response = await Http.get('/bulk-store/purchase-orders');
            const data = response.data;

            // Transform the data to handle nested structures
            const transformedData = (data.data || []).map((order: any) => ({
                ...order,
                po_number:
                    order.po_number ||
                    `PO-${new Date().getFullYear()}-${String(order.id).padStart(5, '0')}`,
                supplier_name:
                    order.supplier?.supplier_name ||
                    order.supplier_name ||
                    'N/A',
                supplier_code:
                    order.supplier?.supplier_code || order.supplier_code || '',
                department_name:
                    order.department?.name || order.department_name || 'N/A',
                expected_delivery_date:
                    order.expected_delivery_date || order.required_date,
                items: order.items || [],
                payment_status: order.payment_status || 'unpaid',
                paid_amount: order.paid_amount || 0,
                balance_amount: order.balance_amount || order.total_amount || 0,
                items_count: order.items_count || order.items?.length || 0,
            }));

            setPurchaseOrders(transformedData);

            // Update stats
            if (data.stats) {
                setStats(data.stats);
            } else {
                // Calculate stats from transformed data
                const allOrders = transformedData;
                setStats({
                    total: allOrders.length,
                    pending: allOrders.filter(
                        (o: any) => o.status === 'pending',
                    ).length,
                    approved: allOrders.filter(
                        (o: any) => o.status === 'approved',
                    ).length,
                    received: allOrders.filter(
                        (o: any) => o.status === 'received',
                    ).length,
                    completed: allOrders.filter(
                        (o: any) => o.status === 'completed',
                    ).length,
                    cancelled: allOrders.filter(
                        (o: any) => o.status === 'cancelled',
                    ).length,
                    totalAmount: allOrders.reduce(
                        (sum: number, o: any) => sum + (o.total_amount || 0),
                        0,
                    ),
                    paidAmount: allOrders.reduce(
                        (sum: number, o: any) => sum + (o.paid_amount || 0),
                        0,
                    ),
                    balanceAmount: allOrders.reduce(
                        (sum: number, o: any) =>
                            sum +
                            ((o.total_amount || 0) - (o.paid_amount || 0)),
                        0,
                    ),
                });
            }

            setPagination((prev) => ({
                ...prev,
                totalItems: data.total || transformedData.length,
                totalPages: data.last_page || 1,
            }));
        } catch (error) {
            console.error('Failed to fetch purchase orders:', error);
            toast.error('Failed to load purchase orders');
        } finally {
            setLoading(false);
        }
    }, [
        pagination.currentPage,
        pagination.pageSize,
        searchTerm,
        statusFilter,
        activeTab,
    ]);

    useEffect(() => {
        fetchPurchaseOrders();
    }, [fetchPurchaseOrders]);

    // ============================================
    // HANDLERS
    // ============================================

    const handleTabChange = (tab: string) => {
        setActiveTab(tab);
        setStatusFilter('');
        setPagination((prev) => ({ ...prev, currentPage: 1 }));
    };

    const handleView = (order: PurchaseOrder) => {
        // Navigate to view page or open modal
        window.location.href = `/bulk-store/purchase-orders/${order.id}`;
    };

    const handleEdit = (order: PurchaseOrder) => {
        // Navigate to edit page or open modal
        window.location.href = `/bulk-store/purchase-orders/${order.id}/edit`;
    };

    const handleOpenApproval = (order: PurchaseOrder) => {
        setSelectedOrder(order);
        setShowApprovalModal(true);
    };

    const handleConfirmApproval = async (
        approvalCode: string,
        releaseFunds?: boolean,
    ) => {
        if (!selectedOrder) throw new Error('No order selected');

        setIsApproving(true);

        try {
            const endpoint =
                userRole === 'admin'
                    ? `/bulk-store/purchase-orders/${selectedOrder.id}/authorize`
                    : `/bulk-store/purchase-orders/${selectedOrder.id}/approve`;

            const payload = {
                approval_code: approvalCode,
                release_funds: releaseFunds || false,
                approved_by: auth.user.id,
                approved_by_name: auth.user.name,
            };

            const response = await Http.post(endpoint, payload);

            if (response.data.success) {
                toast.success(
                    response.data.message ||
                        'Purchase order approved successfully',
                );
                await fetchPurchaseOrders();
                setShowApprovalModal(false);
                setSelectedOrder(null);
            } else {
                throw new Error(response.data.message || 'Approval failed');
            }
        } catch (error: any) {
            console.error('Approval failed:', error);
            throw new Error(
                error.response?.data?.message ||
                    'Invalid approval code or you do not have permission',
            );
        } finally {
            setIsApproving(false);
        }
    };

    const handleCancel = async (id: number) => {
        const reason = prompt('Enter cancellation reason:');
        if (reason === null) return;
        try {
            await Http.post(`/bulk-store/purchase-orders/${id}/cancel`, {
                reason,
            });
            await fetchPurchaseOrders();
            toast.success('Purchase order cancelled');
        } catch (error) {
            console.error('Failed to cancel:', error);
            toast.error('Failed to cancel purchase order');
        }
    };

    const handleMarkAsReceived = async (id: number) => {
        if (!confirm('Mark this purchase order as received?')) return;
        try {
            await Http.post(`/bulk-store/purchase-orders/${id}/receive`);
            await fetchPurchaseOrders();
            toast.success('Purchase order marked as received');
        } catch (error) {
            console.error('Failed to mark as received:', error);
            toast.error('Failed to mark as received');
        }
    };

    const handleDelete = async (id: number) => {
        if (!confirm('Are you sure you want to delete this purchase order?'))
            return;
        try {
            await Http.delete(`/bulk-store/purchase-orders/${id}`);
            await fetchPurchaseOrders();
            toast.success('Purchase order deleted');
        } catch (error) {
            console.error('Failed to delete:', error);
            toast.error('Failed to delete purchase order');
        }
    };

    const handleExport = () => {
        toast.success('Exporting purchase orders...');
        // Implement export logic
    };

    const handlePrint = () => {
        window.print();
    };

    const handleCreatePO = () => {
        window.location.href = '/bulk-store/purchase-orders/create';
    };

    // ============================================
    // STATS CARDS
    // ============================================

    const StatCard = ({ title, value, color, icon, subtitle }: any) => (
        <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800">
            <div className="flex items-center justify-between">
                <div>
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                        {title}
                    </p>
                    <p className="text-2xl font-bold text-slate-800 dark:text-slate-200">
                        {value}
                    </p>
                    {subtitle && (
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                            {subtitle}
                        </p>
                    )}
                </div>
                <div className={`rounded-full p-2 ${color}`}>{icon}</div>
            </div>
        </div>
    );

    // ============================================
    // TABLE DEFINITIONS
    // ============================================

    const columns: Column<PurchaseOrder>[] = [
        {
            id: 'po_number',
            label: 'PO Number',
            minWidth: 130,
            format: (value, row) => (
                <div>
                    <span className="font-mono text-sm font-medium text-slate-800 dark:text-slate-200">
                        {row.po_number || row.pr_number}
                    </span>
                    <div className="text-xs text-slate-500 dark:text-slate-400">
                        PR: {row.pr_number}
                    </div>
                </div>
            ),
            sortable: true,
        },
        {
            id: 'supplier_name',
            label: 'Supplier',
            minWidth: 150,
            format: (value, row) => {
                const supplierName =
                    row.supplier?.supplier_name || row.supplier_name || 'N/A';
                const supplierCode =
                    row.supplier?.supplier_code || row.supplier_code || '';
                return (
                    <div>
                        <div className="text-sm text-slate-800 dark:text-slate-200">
                            {supplierName}
                        </div>
                        {supplierCode && (
                            <div className="text-xs text-slate-500 dark:text-slate-400">
                                {supplierCode}
                            </div>
                        )}
                    </div>
                );
            },
            sortable: true,
        },
        {
            id: 'department_name',
            label: 'Department',
            minWidth: 120,
            format: (value, row) => {
                const deptName =
                    row.department?.name ||
                    row.department_name ||
                    value ||
                    'N/A';
                const deptCode = row.department?.code || '';
                return (
                    <div>
                        <div className="text-sm text-slate-800 dark:text-slate-200">
                            {deptName}
                        </div>
                        {deptCode && (
                            <div className="text-xs text-slate-500 dark:text-slate-400">
                                {deptCode}
                            </div>
                        )}
                    </div>
                );
            },
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
                approved: 'info',
                sent: 'secondary',
                received: 'success',
                partial: 'warning',
                cancelled: 'error',
                completed: 'success',
            },
            format: (value) => {
                const config = STATUS_CONFIG[value] || STATUS_CONFIG.draft;
                return (
                    <span
                        className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${config.color}`}
                    >
                        {config.icon}
                        {config.label}
                    </span>
                );
            },
            sortable: true,
        },
        {
            id: 'payment_status',
            label: 'Payment',
            minWidth: 90,
            format: (value) => {
                const config =
                    PAYMENT_STATUS_CONFIG[value || 'unpaid'] ||
                    PAYMENT_STATUS_CONFIG.unpaid;
                return (
                    <span
                        className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${config.color}`}
                    >
                        {config.label}
                    </span>
                );
            },
        },
        {
            id: 'total_amount',
            label: 'Total',
            minWidth: 110,
            align: 'right',
            format: (value, row) => (
                <div className="text-right">
                    <div className="font-semibold text-slate-800 dark:text-slate-200">
                        {formatCurrency(value || 0)}
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">
                        Items: {row.items_count || 0}
                    </div>
                </div>
            ),
            sortable: true,
        },
        {
            id: 'expected_delivery_date',
            label: 'Delivery',
            minWidth: 100,
            format: (value, row) => {
                const deliveryDate =
                    row.expected_delivery_date || row.required_date || value;
                return (
                    <div>
                        <div className="text-sm text-slate-800 dark:text-slate-200">
                            {deliveryDate ? formatDate(deliveryDate) : 'N/A'}
                        </div>
                        <div className="text-xs text-slate-500 dark:text-slate-400">
                            Expected
                        </div>
                    </div>
                );
            },
            sortable: true,
        },
        {
            id: 'created_at',
            label: 'Created',
            minWidth: 100,
            format: (value) => formatDate(value),
            sortable: true,
        },
    ];

    const actions: Action<PurchaseOrder>[] = [
        {
            label: 'View',
            icon: <Eye className="h-4 w-4" />,
            color: 'primary',
            onClick: handleView,
        },
        {
            label: 'Edit',
            icon: <Edit className="h-4 w-4" />,
            color: 'warning',
            onClick: handleEdit,
            show: (row) => row.status === 'draft' || row.status === 'pending',
        },
        {
            label: 'Approve',
            icon: <CheckCircle className="h-4 w-4" />,
            color: 'success',
            onClick: (row) => handleOpenApproval(row),
            show: (row) =>
                row.status === 'pending' &&
                (userRole === 'admin' || userRole === 'supervisor'),
        },
        {
            label: 'Receive',
            icon: <Package className="h-4 w-4" />,
            color: 'info',
            onClick: (row) => handleMarkAsReceived(row.id),
            show: (row) => row.status === 'approved' || row.status === 'sent',
        },
        {
            label: 'Cancel',
            icon: <XCircle className="h-4 w-4" />,
            color: 'error',
            onClick: (row) => handleCancel(row.id),
            show: (row) =>
                row.status !== 'cancelled' && row.status !== 'completed',
        },
        {
            label: 'Delete',
            icon: <Trash2 className="h-4 w-4" />,
            color: 'error',
            onClick: (row) => handleDelete(row.id),
            show: (row) => row.status === 'draft' || row.status === 'cancelled',
        },
    ];

    // Status options for filtering
    const statusOptions = Object.entries(STATUS_CONFIG).map(([key, value]) => ({
        value: key,
        label: value.label,
    }));

    // Tabs configuration
    const tabs = [
        {
            key: 'all',
            label: 'All Orders',
            count: stats.total,
            icon: <FileText className="h-4 w-4" />,
        },
        {
            key: 'pending',
            label: 'Pending',
            count: stats.pending,
            icon: <Clock className="h-4 w-4" />,
        },
        {
            key: 'approved',
            label: 'Approved',
            count: stats.approved,
            icon: <CheckCircle className="h-4 w-4" />,
        },
        {
            key: 'received',
            label: 'Received',
            count: stats.received,
            icon: <Package className="h-4 w-4" />,
        },
        {
            key: 'completed',
            label: 'Completed',
            count: stats.completed,
            icon: <CheckCircle className="h-4 w-4" />,
        },
        {
            key: 'cancelled',
            label: 'Cancelled',
            count: stats.cancelled,
            icon: <XCircle className="h-4 w-4" />,
        },
    ];

    // ============================================
    // RENDER
    // ============================================

    return (
        <AppLayout
            breadcrumbs={[
                {
                    title: 'Bulk Store',
                    href: '/',
                },
                {
                    title: 'Purchase Orders',
                    href: '',
                },
            ]}
        >
            <div className="min-h-screen bg-slate-100 px-4 py-6 dark:bg-slate-900">
                <Container>
                    {/* Header */}
                    <PageHeader
                        title="Purchase Orders"
                        subtitle="Manage all purchase orders from requisitions to delivery"
                        actions={[
                            {
                                label: 'Create PO',
                                icon: <Plus className="h-4 w-4" />,
                                onClick: handleCreatePO,
                                variant: 'primary',
                            },
                            {
                                label: 'Export',
                                icon: <Download className="h-4 w-4" />,
                                onClick: handleExport,
                                variant: 'outline',
                            },
                            {
                                label: 'Print',
                                icon: <Printer className="h-4 w-4" />,
                                onClick: handlePrint,
                                variant: 'outline',
                            },
                            {
                                label: 'Refresh',
                                icon: <RefreshCw className="h-4 w-4" />,
                                onClick: fetchPurchaseOrders,
                                variant: 'outline',
                                loading: loading,
                            },
                        ]}
                    />

                    {/* Tabs */}
                    <div className="mt-6 flex flex-wrap gap-2 border-b border-slate-200 pb-2 dark:border-slate-700">
                        {tabs.map((tab) => (
                            <button
                                key={tab.key}
                                onClick={() => handleTabChange(tab.key)}
                                className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                                    activeTab === tab.key
                                        ? 'bg-blue-600 text-white shadow-sm'
                                        : 'text-slate-600 hover:bg-slate-200 dark:text-slate-300 dark:hover:bg-slate-700'
                                }`}
                            >
                                {tab.icon}
                                {tab.label}
                                {tab.count > 0 && (
                                    <span
                                        className={`ml-1 rounded-full px-2 py-0.5 text-xs ${
                                            activeTab === tab.key
                                                ? 'bg-white/20 text-white'
                                                : 'bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-300'
                                        }`}
                                    >
                                        {tab.count}
                                    </span>
                                )}
                            </button>
                        ))}
                    </div>

                    {/* Table */}
                    <div className="mt-6">
                        <ReusableTable
                            columns={columns}
                            data={purchaseOrders}
                            actions={actions}
                            loading={loading}
                            title={'Purchase  Orders'}
                            rowsPerPageOptions={[10, 25, 50, 100]}
                            defaultRowsPerPage={10}
                            defaultOrderBy="created_at"
                            defaultOrder="desc"
                            filterPlaceholder="Search by PO number, supplier, department..."
                            statusFilterKey="status"
                            statusOptions={statusOptions}
                            emptyMessage="No purchase orders found"
                            onSearchChange={(value) => {
                                setSearchTerm(value);
                                setPagination((prev) => ({
                                    ...prev,
                                    currentPage: 1,
                                }));
                            }}
                            onPageChange={(page) => {
                                setPagination((prev) => ({
                                    ...prev,
                                    currentPage: page,
                                }));
                            }}
                            onPageSizeChange={(size) => {
                                setPagination((prev) => ({
                                    ...prev,
                                    pageSize: size,
                                    currentPage: 1,
                                }));
                            }}
                            pagination={{
                                currentPage: pagination.currentPage,
                                pageSize: pagination.pageSize,
                                totalItems: pagination.totalItems,
                                totalPages: pagination.totalPages,
                            }}
                        />
                    </div>
                </Container>
            </div>

            {/* ========================================== */}
            {/* ✅ APPROVAL MODAL */}
            {/* ========================================== */}
            <ApprovalModal
                isOpen={showApprovalModal}
                onClose={() => {
                    setShowApprovalModal(false);
                    setSelectedOrder(null);
                }}
                onConfirm={handleConfirmApproval}
                purchaseOrder={
                    selectedOrder
                        ? {
                              id: selectedOrder.id,
                              po_number:
                                  selectedOrder.po_number ||
                                  selectedOrder.pr_number,
                              pr_number: selectedOrder.pr_number,
                              supplier_name:
                                  selectedOrder.supplier_name || 'N/A',
                              total_amount: selectedOrder.total_amount,
                              department_name:
                                  selectedOrder.department_name || 'N/A',
                              status: selectedOrder.status,
                              priority: selectedOrder.priority,
                              created_at: selectedOrder.created_at,
                          }
                        : {
                              id: 0,
                              po_number: '',
                              pr_number: '',
                              supplier_name: '',
                              total_amount: 0,
                              department_name: '',
                              status: '',
                              priority: '',
                              created_at: '',
                          }
                }
                userRole={userRole}
                isLoading={isApproving}
            />
        </AppLayout>
    );
}
