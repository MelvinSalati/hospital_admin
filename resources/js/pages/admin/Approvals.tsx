import { Head, usePage } from '@inertiajs/react';
import {
    CheckCircle,
    XCircle,
    Clock,
    AlertTriangle,
    FileText,
    User,
    Check,
    Minus,
    TrendingDown,
    TrendingUp,
    Shield,
    Wallet,
    Eye,
    Trash2,
} from 'lucide-react';
import React, { useState, useEffect, useCallback, useMemo } from 'react';

// UI Components
import { toast } from 'react-hot-toast';
import Container from '@/components/container';
import PageHeader from '@/components/PageHeader';
import { ReusableTable } from '@/components/ReusableTable';
import type { Column, Action } from '@/components/ReusableTable';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import AppLayout from '@/layouts/app-layout';
import Http from '@/utils/Http';

// ============================================
// TYPES
// ============================================

interface POItem {
    id?: number;
    description: string;
    quantity: number;
    unit_price: number;
    total_price: number;
    tax_rate?: number;
    tax_amount?: number;
    product_code?: string;
    category?: string;
}

interface PurchaseOrder {
    id: number;
    po_number: string;
    title: string;
    description: string;
    department: string;
    requester_id: number;
    requester_name: string;
    requester_department: string;
    supplier_name: string;
    supplier_contact?: string;
    total_amount: number;
    currency: string;
    items: POItem[];
    budget_code: string;
    budget_name?: string;
    budget_allocated: number;
    budget_utilized: number;
    budget_remaining: number;
    priority: 'low' | 'medium' | 'high' | 'urgent' | 'critical';
    status:
        | 'draft'
        | 'pending_supervisor'
        | 'pending_admin'
        | 'approved'
        | 'rejected'
        | 'cancelled'
        | 'completed';
    approval_level: 1 | 2;
    supervisor_approved_by?: number;
    supervisor_approved_by_name?: string;
    supervisor_approved_at?: string;
    supervisor_rejection_reason?: string;
    admin_approved_by?: number;
    admin_approved_by_name?: string;
    admin_approved_at?: string;
    admin_rejection_reason?: string;
    submitted_by: number;
    submitted_by_name: string;
    submitted_at: string;
    created_at: string;
    updated_at: string;
    attachments?: string[];
    notes?: string;
    delivery_date?: string;
    delivery_address?: string;
    is_urgent: boolean;
    requires_two_level_approval: boolean;
}

interface Budget {
    id: number;
    budget_code: string;
    budget_name?: string;
    department: string;
    year: number | string;
    allocated_amount: number;
    utilized_amount: number;
    remaining_amount: number;
    percentage_used: number;
    status: string;
    category: string;
    description?: string;
}

// ============================================
// ENDPOINTS (change here if your routes differ)
// ============================================

const ENDPOINTS = {
    list: '/admin/purchase-orders',
    budgets: '/admin/budgets',
    supervisorApprove: (id: number) =>
        `/admin/purchase-orders/${id}/supervisor-approve`,
    adminApprove: (id: number) => `/admin/purchase-orders/${id}/admin-approve`,
    supervisorReject: (id: number) =>
        `/admin/purchase-orders/${id}/supervisor-reject`,
    adminReject: (id: number) => `/admin/purchase-orders/${id}/admin-reject`,
    cancel: (id: number) => `/admin/purchase-orders/${id}/cancel`,
    remove: (id: number) => `/admin/purchase-orders/${id}`,
};

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
    critical: {
        label: 'Critical',
        color: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
        icon: <AlertTriangle className="h-3 w-3" />,
    },
};

const STATUS_CONFIG: Record<
    string,
    { label: string; color: string; icon: React.ReactNode; step: number }
> = {
    draft: {
        label: 'Draft',
        color: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
        icon: <FileText className="h-3 w-3" />,
        step: 0,
    },
    pending_supervisor: {
        label: 'Pending Supervisor',
        color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
        icon: <Clock className="h-3 w-3" />,
        step: 1,
    },
    pending_admin: {
        label: 'Pending Admin',
        color: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
        icon: <Clock className="h-3 w-3" />,
        step: 2,
    },
    approved: {
        label: 'Approved',
        color: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
        icon: <CheckCircle className="h-3 w-3" />,
        step: 3,
    },
    rejected: {
        label: 'Rejected',
        color: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
        icon: <XCircle className="h-3 w-3" />,
        step: -1,
    },
    cancelled: {
        label: 'Cancelled',
        color: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
        icon: <XCircle className="h-3 w-3" />,
        step: -1,
    },
    completed: {
        label: 'Completed',
        color: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400',
        icon: <Check className="h-3 w-3" />,
        step: 4,
    },
};

// ============================================
// API -> UI MAPPERS
// ============================================

const toNumber = (v: unknown): number => {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
};

const toArray = (payload: any, keys: string[] = []): any[] => {
    if (Array.isArray(payload)) return payload;
    for (const key of [...keys, 'data']) {
        if (Array.isArray(payload?.[key])) return payload[key];
    }
    return [];
};

/** Maps a purchase requisition from the API into the shape the page uses. */
const mapRequisition = (r: any): PurchaseOrder => {
    const status = r.status === 'pending' ? 'pending_supervisor' : r.status;
    const requesterName =
        r.requester?.name ?? r.requester?.full_name ?? r.requested_by_name;

    return {
        id: r.id,
        po_number: r.pr_number ?? r.po_number ?? `#${r.id}`,
        title: r.justification || r.pr_number || `Requisition #${r.id}`,
        description: r.justification ?? '',
        department: r.department?.name ?? '',
        requester_id: r.requested_by ?? 0,
        requester_name: requesterName ?? 'N/A',
        requester_department: r.department?.name ?? '',
        supplier_name: r.supplier?.supplier_name ?? '',
        supplier_contact: r.supplier?.contact_person ?? undefined,
        total_amount: toNumber(r.estimated_total),
        currency: r.supplier?.currency || 'ZMW',
        items: (r.items ?? []).map(
            (i: any): POItem => ({
                id: i.id,
                description: i.product?.service_name ?? 'Item',
                quantity: toNumber(i.quantity),
                unit_price: toNumber(i.estimated_unit_price),
                total_price: toNumber(i.estimated_total),
                product_code: i.product?.service_code,
                category: i.product?.service_category,
            }),
        ),
        budget_code: r.budget_code ?? '',
        budget_name: r.budget_allocation?.budget_name,
        budget_allocated: toNumber(r.budget_allocation?.allocated_amount),
        budget_utilized: toNumber(r.budget_allocation?.actual_spent),
        budget_remaining: toNumber(r.budget_allocation?.available_amount),
        priority: r.priority ?? 'medium',
        status,
        approval_level: 1,
        supervisor_approved_by: r.approved_by ?? undefined,
        supervisor_approved_by_name: r.approver?.name ?? undefined,
        supervisor_approved_at: r.approved_at ?? undefined,
        submitted_by: r.requested_by ?? 0,
        submitted_by_name: requesterName ?? 'N/A',
        submitted_at: r.request_date ?? r.created_at,
        created_at: r.created_at,
        updated_at: r.updated_at,
        notes: r.justification ?? '',
        delivery_date: r.required_date,
        is_urgent: r.priority === 'urgent' || r.priority === 'critical',
        requires_two_level_approval: false,
    };
};

/** Maps a budget row (either /admin/budgets shape or an embedded budget_allocation). */
const mapBudget = (b: any): Budget => {
    const allocated = toNumber(b.allocated_amount ?? b.original_amount);
    const remaining = toNumber(
        b.remaining_amount ?? b.available_amount ?? allocated,
    );
    const utilized = toNumber(b.utilized_amount ?? b.actual_spent);
    return {
        id: b.id,
        budget_code: b.budget_code,
        budget_name: b.budget_name,
        department: b.department?.name ?? b.department ?? '',
        year: b.year ?? b.fiscal_year ?? '',
        allocated_amount: allocated,
        utilized_amount: utilized,
        remaining_amount: remaining,
        percentage_used: toNumber(
            b.percentage_used ?? b.utilization_percentage,
        ),
        status: b.status ?? 'active',
        category: b.category ?? '',
        description: b.description ?? undefined,
    };
};

// ============================================
// HELPERS
// ============================================

const formatDate = (date?: string) => {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString('en-ZM', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
    });
};

const formatTime = (date?: string) => {
    if (!date) return '';
    return new Date(date).toLocaleTimeString('en-ZM', {
        hour: '2-digit',
        minute: '2-digit',
    });
};

const formatDateTime = (date?: string) => {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString('en-ZM', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
};

const formatCurrency = (amount: number, currency: string = 'ZMW') => {
    try {
        return new Intl.NumberFormat('en-ZM', {
            style: 'currency',
            currency: currency || 'ZMW',
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        }).format(amount || 0);
    } catch {
        return `${currency} ${(amount || 0).toFixed(2)}`;
    }
};

const StatCard = ({
    title,
    value,
    color,
    icon,
    subtitle,
}: {
    title: string;
    value: React.ReactNode;
    color: string;
    icon: React.ReactNode;
    subtitle?: string;
}) => (
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
// MAIN COMPONENT
// ============================================

export default function Approval() {
    const { auth } = usePage().props as any;

    const [loading, setLoading] = useState(false);
    const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
    const [budgets, setBudgets] = useState<Budget[]>([]);
    const [selectedOrder, setSelectedOrder] = useState<PurchaseOrder | null>(
        null,
    );
    const [departmentFilter, setDepartmentFilter] = useState<string>('');
    const [priorityFilter, setPriorityFilter] = useState<string>('');
    const [activeTab, setActiveTab] = useState<string>('all');

    // Modal states
    const [showDetailModal, setShowDetailModal] = useState(false);
    const [showApprovalModal, setShowApprovalModal] = useState(false);
    const [showRejectionModal, setShowRejectionModal] = useState(false);
    const [rejectionReason, setRejectionReason] = useState('');
    const [approvalComments, setApprovalComments] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);
    const [approvalLevel, setApprovalLevel] = useState<1 | 2>(1);

    const userRole = auth?.user?.is_admin
        ? 'admin'
        : auth?.user?.is_supervisor
          ? 'supervisor'
          : 'staff';
    const isAdmin = userRole === 'admin';
    const isSupervisor = userRole === 'supervisor';

    // ============================================
    // FETCH DATA
    // ============================================

    const fetchPurchaseOrders = useCallback(async () => {
        setLoading(true);
        try {
            const response = await Http.get(ENDPOINTS.list);
            const list = toArray(response.data, ['orders']);
            setPurchaseOrders(list.map(mapRequisition));
        } catch (error) {
            console.error('Failed to fetch purchase orders:', error);
            toast.error('Failed to load purchase orders');
            setPurchaseOrders([]);
        } finally {
            setLoading(false);
        }
    }, []);

    const fetchBudgets = useCallback(async () => {
        try {
            const response = await Http.get(ENDPOINTS.budgets);
            const list = toArray(response.data, ['budgets']);
            setBudgets(list.map(mapBudget));
        } catch (error) {
            console.error('Failed to fetch budgets:', error);
            setBudgets([]); // never leave this as a non-array
        }
    }, []);

    useEffect(() => {
        fetchPurchaseOrders();
        fetchBudgets();
    }, [fetchPurchaseOrders, fetchBudgets]);

    // ============================================
    // DERIVED DATA
    // ============================================

    const stats = useMemo(
        () => ({
            total_orders: purchaseOrders.length,
            pending_supervisor: purchaseOrders.filter(
                (o) => o.status === 'pending_supervisor',
            ).length,
            pending_admin: purchaseOrders.filter(
                (o) => o.status === 'pending_admin',
            ).length,
            approved: purchaseOrders.filter((o) => o.status === 'approved')
                .length,
            rejected: purchaseOrders.filter((o) => o.status === 'rejected')
                .length,
            urgent_orders: purchaseOrders.filter((o) => o.is_urgent).length,
            total_value: purchaseOrders.reduce(
                (sum, o) => sum + o.total_amount,
                0,
            ),
        }),
        [purchaseOrders],
    );

    const visibleOrders = useMemo(
        () =>
            purchaseOrders.filter(
                (o) =>
                    (activeTab === 'all' || o.status === activeTab) &&
                    (!priorityFilter || o.priority === priorityFilter) &&
                    (!departmentFilter || o.department === departmentFilter),
            ),
        [purchaseOrders, activeTab, priorityFilter, departmentFilter],
    );

    // Budgets from the API, falling back to the ones embedded in the orders
    const budgetOptions = useMemo(() => {
        const safe = Array.isArray(budgets) ? budgets : [];
        if (safe.length > 0) {
            return safe.map((b) => ({
                value: b.budget_code,
                label: `${b.budget_code} - ${b.budget_name ?? b.department} (${formatCurrency(b.remaining_amount)})`,
            }));
        }
        const seen = new Map<string, { value: string; label: string }>();
        purchaseOrders.forEach((o) => {
            if (o.budget_code && !seen.has(o.budget_code)) {
                seen.set(o.budget_code, {
                    value: o.budget_code,
                    label: `${o.budget_code} - ${o.budget_name ?? ''} (${formatCurrency(o.budget_remaining)})`,
                });
            }
        });
        return Array.from(seen.values());
    }, [budgets, purchaseOrders]);

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

    const departmentOptions = Array.from(
        new Set(purchaseOrders.map((o) => o.department)),
    )
        .filter(Boolean)
        .map((dept) => ({ value: dept, label: dept }));

    const tabs = [
        {
            key: 'all',
            label: 'All',
            count: stats.total_orders,
            icon: <FileText className="h-4 w-4" />,
        },
        {
            key: 'pending_supervisor',
            label: 'Pending Supervisor',
            count: stats.pending_supervisor,
            icon: <Clock className="h-4 w-4" />,
        },
        {
            key: 'pending_admin',
            label: 'Pending Admin',
            count: stats.pending_admin,
            icon: <Shield className="h-4 w-4" />,
        },
        {
            key: 'approved',
            label: 'Approved',
            count: stats.approved,
            icon: <CheckCircle className="h-4 w-4" />,
        },
        {
            key: 'rejected',
            label: 'Rejected',
            count: stats.rejected,
            icon: <XCircle className="h-4 w-4" />,
        },
    ];

    // ============================================
    // HANDLERS
    // ============================================

    const canAct = (order: PurchaseOrder) =>
        (order.status === 'pending_supervisor' && (isSupervisor || isAdmin)) ||
        (order.status === 'pending_admin' && isAdmin);

    const handleView = (order: PurchaseOrder) => {
        setSelectedOrder(order);
        setShowDetailModal(true);
    };

    const handleApprove = (order: PurchaseOrder) => {
        setSelectedOrder(order);
        setApprovalLevel(order.status === 'pending_supervisor' ? 1 : 2);
        setApprovalComments('');
        setShowApprovalModal(true);
    };

    const handleReject = (order: PurchaseOrder) => {
        setSelectedOrder(order);
        setRejectionReason('');
        setShowRejectionModal(true);
    };

    const handleConfirmApproval = async () => {
        if (!selectedOrder) return;
        setIsProcessing(true);
        try {
            const endpoint =
                selectedOrder.status === 'pending_supervisor'
                    ? ENDPOINTS.supervisorApprove(selectedOrder.id)
                    : ENDPOINTS.adminApprove(selectedOrder.id);

            const response = await Http.post(endpoint, {
                comments: approvalComments,
                approver_id: auth?.user?.id,
                approver_name: auth?.user?.name,
            });

            if (response.data?.success) {
                toast.success(
                    `Order ${selectedOrder.po_number} approved successfully`,
                );
                await fetchPurchaseOrders();
                setShowApprovalModal(false);
                setSelectedOrder(null);
                setApprovalComments('');
            } else {
                throw new Error(response.data?.message || 'Approval failed');
            }
        } catch (error: any) {
            console.error('Approval failed:', error);
            toast.error(
                error.response?.data?.message ||
                    error.message ||
                    'Failed to approve order',
            );
        } finally {
            setIsProcessing(false);
        }
    };

    const handleConfirmRejection = async () => {
        if (!selectedOrder) return;
        if (!rejectionReason.trim()) {
            toast.error('Please provide a reason for rejection');
            return;
        }
        setIsProcessing(true);
        try {
            const endpoint =
                selectedOrder.status === 'pending_supervisor'
                    ? ENDPOINTS.supervisorReject(selectedOrder.id)
                    : ENDPOINTS.adminReject(selectedOrder.id);

            const response = await Http.post(endpoint, {
                rejection_reason: rejectionReason,
                rejected_by: auth?.user?.id,
                rejected_by_name: auth?.user?.name,
            });

            if (response.data?.success) {
                toast.success(`Order ${selectedOrder.po_number} rejected`);
                await fetchPurchaseOrders();
                setShowRejectionModal(false);
                setSelectedOrder(null);
                setRejectionReason('');
            } else {
                throw new Error(response.data?.message || 'Rejection failed');
            }
        } catch (error: any) {
            console.error('Rejection failed:', error);
            toast.error(
                error.response?.data?.message ||
                    error.message ||
                    'Failed to reject order',
            );
        } finally {
            setIsProcessing(false);
        }
    };

    const handleCancel = async (id: number) => {
        if (!confirm('Are you sure you want to cancel this purchase order?'))
            return;
        try {
            const response = await Http.post(ENDPOINTS.cancel(id));
            if (response.data?.success) {
                toast.success('Purchase order cancelled');
                await fetchPurchaseOrders();
            }
        } catch (error) {
            console.error('Cancel failed:', error);
            toast.error('Failed to cancel order');
        }
    };

    const handleDelete = async (id: number) => {
        if (
            !confirm(
                'Are you sure you want to delete this purchase order? This action cannot be undone.',
            )
        )
            return;
        try {
            const response = await Http.delete(ENDPOINTS.remove(id));
            if (response.data?.success) {
                toast.success('Purchase order deleted');
                await fetchPurchaseOrders();
            }
        } catch (error) {
            console.error('Delete failed:', error);
            toast.error('Failed to delete order');
        }
    };

    // ============================================
    // TABLE DEFINITIONS
    // ============================================

    const columns: Column<PurchaseOrder>[] = [
        {
            id: 'po_number',
            label: 'PR #',
            minWidth: 110,
            format: (value) => (
                <span className="font-mono text-sm font-medium text-blue-600 dark:text-blue-400">
                    {value || 'N/A'}
                </span>
            ),
            sortable: true,
        },
        {
            id: 'title',
            label: 'Justification',
            minWidth: 160,
            format: (value, row) => (
                <div className="max-w-[240px]">
                    <div className="truncate text-sm font-medium text-slate-800 dark:text-slate-200">
                        {value}
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">
                        {row.department || 'No department'}
                    </div>
                </div>
            ),
            sortable: true,
        },
        {
            id: 'requester_name',
            label: 'Requester',
            minWidth: 120,
            format: (value, row) => (
                <div>
                    <div className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
                        <User className="h-3 w-3 text-slate-400" />
                        {value}
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">
                        {row.requester_department}
                    </div>
                </div>
            ),
        },
        {
            id: 'supplier_name',
            label: 'Supplier',
            minWidth: 140,
            format: (value) => (
                <span className="text-sm text-slate-700 dark:text-slate-300">
                    {value || 'N/A'}
                </span>
            ),
        },
        {
            id: 'total_amount',
            label: 'Amount',
            minWidth: 120,
            format: (value, row) => (
                <div className="font-semibold text-slate-800 dark:text-slate-200">
                    {formatCurrency(value, row.currency)}
                    <div className="text-xs font-normal text-slate-500 dark:text-slate-400">
                        {row.items?.length || 0} items
                    </div>
                </div>
            ),
            sortable: true,
        },
        {
            id: 'priority',
            label: 'Priority',
            minWidth: 90,
            format: (value) => {
                const config = PRIORITY_CONFIG[value] || PRIORITY_CONFIG.medium;
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
            id: 'status',
            label: 'Status',
            minWidth: 130,
            filterType: 'status',
            statusColors: {
                draft: 'default',
                pending_supervisor: 'warning',
                pending_admin: 'info',
                approved: 'success',
                rejected: 'error',
                cancelled: 'default',
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
            id: 'submitted_at',
            label: 'Submitted',
            minWidth: 110,
            format: (value) => (
                <div>
                    <div className="text-sm text-slate-700 dark:text-slate-300">
                        {formatDate(value)}
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">
                        {formatTime(value)}
                    </div>
                </div>
            ),
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
            label: 'Approve',
            icon: <CheckCircle className="h-4 w-4" />,
            color: 'success',
            onClick: (row) => handleApprove(row),
            show: (row) => canAct(row),
        },
        {
            label: 'Reject',
            icon: <XCircle className="h-4 w-4" />,
            color: 'error',
            onClick: (row) => handleReject(row),
            show: (row) => canAct(row),
        },
        {
            label: 'Cancel',
            icon: <XCircle className="h-4 w-4" />,
            color: 'warning',
            onClick: (row) => handleCancel(row.id),
            show: (row) =>
                row.status === 'draft' ||
                row.status === 'pending_supervisor' ||
                row.status === 'pending_admin',
        },
        {
            label: 'Delete',
            icon: <Trash2 className="h-4 w-4" />,
            color: 'error',
            onClick: (row) => handleDelete(row.id),
            show: (row) => row.status === 'draft' || row.status === 'cancelled',
        },
    ];

    // ============================================
    // RENDER
    // ============================================

    return (
        <AppLayout
            breadcrumbs={[
                { title: 'Home', href: '/' },
                { title: 'Administration', href: '' },
            ]}
        >
            <Head title="Administration" />

            <div className="min-h-screen bg-slate-100 px-4 py-6 dark:bg-slate-900">
                <Container>
                    {/* Header */}
                    <PageHeader
                        icon={<FileText />}
                        title="Purchase Requisition"
                        subtitle="Manage purchase requisitions"
                    />

                    {/* Stats */}
                    <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                        <StatCard
                            title="Total Requisitions"
                            value={stats.total_orders}
                            color="bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400"
                            icon={<FileText className="h-5 w-5" />}
                        />
                        <StatCard
                            title="Pending Approval"
                            value={
                                stats.pending_supervisor + stats.pending_admin
                            }
                            subtitle={`${stats.urgent_orders} urgent`}
                            color="bg-yellow-100 text-yellow-600 dark:bg-yellow-900/30 dark:text-yellow-400"
                            icon={<Clock className="h-5 w-5" />}
                        />
                        <StatCard
                            title="Approved"
                            value={stats.approved}
                            color="bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400"
                            icon={<CheckCircle className="h-5 w-5" />}
                        />
                        <StatCard
                            title="Total Value"
                            value={formatCurrency(stats.total_value)}
                            subtitle={`${budgetOptions.length} budgets tracked`}
                            color="bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400"
                            icon={<Wallet className="h-5 w-5" />}
                        />
                    </div>

                    {/* Tabs */}
                    <div className="mt-6 flex flex-wrap gap-2 border-b border-slate-200 pb-2 dark:border-slate-700">
                        {tabs.map((tab) => (
                            <button
                                key={tab.key}
                                onClick={() => setActiveTab(tab.key)}
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
                            data={visibleOrders}
                            actions={actions}
                            loading={loading}
                            title="Purchase Requisitions"
                            rowsPerPageOptions={[10, 25, 50, 100]}
                            defaultRowsPerPage={10}
                            defaultOrderBy="submitted_at"
                            defaultOrder="desc"
                            filterPlaceholder="Search by PR #, justification, supplier..."
                            statusFilterKey="status"
                            statusOptions={statusOptions}
                            additionalFilters={[
                                {
                                    key: 'priority',
                                    label: 'Priority',
                                    options: priorityOptions,
                                    value: priorityFilter,
                                    onChange: setPriorityFilter,
                                },
                                {
                                    key: 'department',
                                    label: 'Department',
                                    options: departmentOptions,
                                    value: departmentFilter,
                                    onChange: setDepartmentFilter,
                                },
                            ]}
                            emptyMessage="No purchase requisitions found"
                        />
                    </div>
                </Container>
            </div>

            {/* ========================================== */}
            {/* VIEW DETAIL MODAL */}
            {/* ========================================== */}
            <Dialog open={showDetailModal} onOpenChange={setShowDetailModal}>
                <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <FileText className="h-5 w-5 text-blue-600" />
                            Purchase Requisition Details
                        </DialogTitle>
                        <DialogDescription>
                            View complete details of the requisition
                        </DialogDescription>
                    </DialogHeader>
                    {selectedOrder && (
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-2xl font-bold text-slate-800 dark:text-slate-200">
                                        {selectedOrder.po_number}
                                    </p>
                                    <p className="text-sm text-slate-500 dark:text-slate-400">
                                        {selectedOrder.title}
                                    </p>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Badge
                                        variant={
                                            selectedOrder.is_urgent
                                                ? 'destructive'
                                                : 'default'
                                        }
                                    >
                                        {selectedOrder.is_urgent
                                            ? '🚨 Urgent'
                                            : 'Standard'}
                                    </Badge>
                                    <span
                                        className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${STATUS_CONFIG[selectedOrder.status]?.color || ''}`}
                                    >
                                        {
                                            STATUS_CONFIG[selectedOrder.status]
                                                ?.icon
                                        }
                                        {STATUS_CONFIG[selectedOrder.status]
                                            ?.label ?? selectedOrder.status}
                                    </span>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <Label className="text-xs text-slate-500">
                                        Requester
                                    </Label>
                                    <p className="font-medium text-slate-800 dark:text-slate-200">
                                        {selectedOrder.requester_name}
                                    </p>
                                    <p className="text-sm text-slate-500">
                                        {selectedOrder.requester_department}
                                    </p>
                                </div>
                                <div>
                                    <Label className="text-xs text-slate-500">
                                        Supplier
                                    </Label>
                                    <p className="font-medium text-slate-800 dark:text-slate-200">
                                        {selectedOrder.supplier_name || 'N/A'}
                                    </p>
                                    {selectedOrder.supplier_contact && (
                                        <p className="text-sm text-slate-500">
                                            {selectedOrder.supplier_contact}
                                        </p>
                                    )}
                                </div>
                                <div>
                                    <Label className="text-xs text-slate-500">
                                        Total Amount
                                    </Label>
                                    <p className="text-lg font-bold text-blue-600 dark:text-blue-400">
                                        {formatCurrency(
                                            selectedOrder.total_amount,
                                            selectedOrder.currency,
                                        )}
                                    </p>
                                </div>
                                <div>
                                    <Label className="text-xs text-slate-500">
                                        Budget
                                    </Label>
                                    <p className="font-medium text-slate-800 dark:text-slate-200">
                                        {selectedOrder.budget_code}
                                        {selectedOrder.budget_name
                                            ? ` - ${selectedOrder.budget_name}`
                                            : ''}
                                    </p>
                                    {selectedOrder.budget_allocated > 0 && (
                                        <p className="text-sm text-slate-500">
                                            Allocated:{' '}
                                            {formatCurrency(
                                                selectedOrder.budget_allocated,
                                                selectedOrder.currency,
                                            )}{' '}
                                            · Available:{' '}
                                            {formatCurrency(
                                                selectedOrder.budget_remaining,
                                                selectedOrder.currency,
                                            )}
                                        </p>
                                    )}
                                </div>
                                <div>
                                    <Label className="text-xs text-slate-500">
                                        Required By
                                    </Label>
                                    <p className="text-sm text-slate-700 dark:text-slate-300">
                                        {formatDate(
                                            selectedOrder.delivery_date,
                                        )}
                                    </p>
                                </div>
                                <div>
                                    <Label className="text-xs text-slate-500">
                                        Priority
                                    </Label>
                                    <p className="text-sm text-slate-700 capitalize dark:text-slate-300">
                                        {selectedOrder.priority}
                                    </p>
                                </div>
                            </div>

                            {/* Approval Flow */}
                            <div>
                                <Label className="text-xs text-slate-500">
                                    Approval Workflow
                                </Label>
                                <div className="mt-2 flex items-center gap-4">
                                    <div className="flex items-center gap-2">
                                        <div
                                            className={`rounded-full p-1 ${selectedOrder.status !== 'draft' ? 'bg-green-500' : 'bg-gray-300'}`}
                                        >
                                            <Check className="h-4 w-4 text-white" />
                                        </div>
                                        <span className="text-sm">
                                            Submitted
                                        </span>
                                    </div>
                                    <div className="h-0.5 w-12 bg-gray-300 dark:bg-gray-700" />
                                    <div className="flex items-center gap-2">
                                        <div
                                            className={`rounded-full p-1 ${selectedOrder.status === 'pending_supervisor' ? 'animate-pulse bg-yellow-500' : selectedOrder.supervisor_approved_at ? 'bg-green-500' : 'bg-gray-300'}`}
                                        >
                                            {selectedOrder.supervisor_approved_at ? (
                                                <Check className="h-4 w-4 text-white" />
                                            ) : (
                                                <Clock className="h-4 w-4 text-white" />
                                            )}
                                        </div>
                                        <span className="text-sm">
                                            Supervisor
                                        </span>
                                    </div>
                                    {selectedOrder.requires_two_level_approval && (
                                        <>
                                            <div className="h-0.5 w-12 bg-gray-300 dark:bg-gray-700" />
                                            <div className="flex items-center gap-2">
                                                <div
                                                    className={`rounded-full p-1 ${selectedOrder.status === 'pending_admin' ? 'animate-pulse bg-purple-500' : selectedOrder.admin_approved_at ? 'bg-green-500' : 'bg-gray-300'}`}
                                                >
                                                    {selectedOrder.admin_approved_at ? (
                                                        <Check className="h-4 w-4 text-white" />
                                                    ) : (
                                                        <Clock className="h-4 w-4 text-white" />
                                                    )}
                                                </div>
                                                <span className="text-sm">
                                                    Admin
                                                </span>
                                            </div>
                                        </>
                                    )}
                                </div>
                            </div>

                            {/* Items */}
                            <div>
                                <Label className="text-xs text-slate-500">
                                    Items
                                </Label>
                                <div className="mt-2 overflow-x-auto">
                                    <table className="w-full text-sm">
                                        <thead className="bg-slate-50 dark:bg-slate-800">
                                            <tr>
                                                <th className="px-3 py-2 text-left">
                                                    Description
                                                </th>
                                                <th className="px-3 py-2 text-right">
                                                    Qty
                                                </th>
                                                <th className="px-3 py-2 text-right">
                                                    Unit Price
                                                </th>
                                                <th className="px-3 py-2 text-right">
                                                    Total
                                                </th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {selectedOrder.items?.map(
                                                (item, index) => (
                                                    <tr
                                                        key={item.id ?? index}
                                                        className="border-t border-slate-200 dark:border-slate-700"
                                                    >
                                                        <td className="px-3 py-2">
                                                            {item.description}
                                                            {item.product_code && (
                                                                <div className="text-xs text-slate-500">
                                                                    {
                                                                        item.product_code
                                                                    }
                                                                </div>
                                                            )}
                                                        </td>
                                                        <td className="px-3 py-2 text-right">
                                                            {item.quantity}
                                                        </td>
                                                        <td className="px-3 py-2 text-right">
                                                            {formatCurrency(
                                                                item.unit_price,
                                                                selectedOrder.currency,
                                                            )}
                                                        </td>
                                                        <td className="px-3 py-2 text-right font-semibold">
                                                            {formatCurrency(
                                                                item.total_price,
                                                                selectedOrder.currency,
                                                            )}
                                                        </td>
                                                    </tr>
                                                ),
                                            )}
                                        </tbody>
                                        <tfoot className="border-t-2 border-slate-300 dark:border-slate-600">
                                            <tr>
                                                <td
                                                    colSpan={3}
                                                    className="px-3 py-2 text-right font-bold"
                                                >
                                                    Total:
                                                </td>
                                                <td className="px-3 py-2 text-right font-bold text-blue-600 dark:text-blue-400">
                                                    {formatCurrency(
                                                        selectedOrder.total_amount,
                                                        selectedOrder.currency,
                                                    )}
                                                </td>
                                            </tr>
                                        </tfoot>
                                    </table>
                                </div>
                            </div>

                            {selectedOrder.notes && (
                                <div>
                                    <Label className="text-xs text-slate-500">
                                        Justification
                                    </Label>
                                    <p className="text-sm text-slate-700 dark:text-slate-300">
                                        {selectedOrder.notes}
                                    </p>
                                </div>
                            )}

                            {/* Approval History */}
                            <div>
                                <Label className="text-xs text-slate-500">
                                    Approval History
                                </Label>
                                <div className="mt-2 space-y-2">
                                    {selectedOrder.supervisor_approved_at && (
                                        <div className="flex items-center gap-2 text-sm">
                                            <CheckCircle className="h-4 w-4 text-green-500" />
                                            <span>
                                                Approved
                                                {selectedOrder.supervisor_approved_by_name
                                                    ? ` by ${selectedOrder.supervisor_approved_by_name}`
                                                    : ''}
                                                {` on ${formatDateTime(selectedOrder.supervisor_approved_at)}`}
                                            </span>
                                        </div>
                                    )}
                                    {selectedOrder.supervisor_rejection_reason && (
                                        <div className="flex items-center gap-2 text-sm text-red-600">
                                            <XCircle className="h-4 w-4" />
                                            <span>
                                                Rejected:{' '}
                                                {
                                                    selectedOrder.supervisor_rejection_reason
                                                }
                                            </span>
                                        </div>
                                    )}
                                    {selectedOrder.admin_approved_by_name && (
                                        <div className="flex items-center gap-2 text-sm">
                                            <CheckCircle className="h-4 w-4 text-green-500" />
                                            <span>
                                                Admin approved by{' '}
                                                {
                                                    selectedOrder.admin_approved_by_name
                                                }
                                                {selectedOrder.admin_approved_at &&
                                                    ` on ${formatDateTime(selectedOrder.admin_approved_at)}`}
                                            </span>
                                        </div>
                                    )}
                                    {selectedOrder.admin_rejection_reason && (
                                        <div className="flex items-center gap-2 text-sm text-red-600">
                                            <XCircle className="h-4 w-4" />
                                            <span>
                                                Admin rejected:{' '}
                                                {
                                                    selectedOrder.admin_rejection_reason
                                                }
                                            </span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div>
                                <Label className="text-xs text-slate-500">
                                    Submitted On
                                </Label>
                                <p className="text-sm text-slate-600 dark:text-slate-400">
                                    {formatDateTime(selectedOrder.submitted_at)}
                                </p>
                            </div>
                        </div>
                    )}
                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => setShowDetailModal(false)}
                        >
                            Close
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* ========================================== */}
            {/* APPROVAL MODAL */}
            {/* ========================================== */}
            <Dialog
                open={showApprovalModal}
                onOpenChange={setShowApprovalModal}
            >
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <CheckCircle className="h-5 w-5 text-green-600" />
                            Approve Requisition
                        </DialogTitle>
                        <DialogDescription>
                            {approvalLevel === 1
                                ? 'Are you sure you want to approve this requisition at the supervisor level?'
                                : 'Are you sure you want to approve this requisition at the admin level?'}
                        </DialogDescription>
                    </DialogHeader>
                    {selectedOrder && (
                        <div className="space-y-4">
                            <div className="rounded-lg bg-green-50 p-4 dark:bg-green-900/20">
                                <p className="text-sm text-green-800 dark:text-green-300">
                                    <strong>PR #:</strong>{' '}
                                    {selectedOrder.po_number}
                                </p>
                                <p className="text-sm text-green-800 dark:text-green-300">
                                    <strong>Justification:</strong>{' '}
                                    {selectedOrder.title}
                                </p>
                                <p className="text-sm text-green-800 dark:text-green-300">
                                    <strong>Amount:</strong>{' '}
                                    {formatCurrency(
                                        selectedOrder.total_amount,
                                        selectedOrder.currency,
                                    )}
                                </p>
                                <p className="text-sm text-green-800 dark:text-green-300">
                                    <strong>Supplier:</strong>{' '}
                                    {selectedOrder.supplier_name}
                                </p>
                                <p className="text-sm text-green-800 dark:text-green-300">
                                    <strong>Level:</strong>{' '}
                                    {approvalLevel === 1
                                        ? 'Supervisor'
                                        : 'Admin'}{' '}
                                    Approval
                                </p>
                            </div>
                            <div>
                                <Label
                                    htmlFor="approvalComments"
                                    className="text-sm font-medium"
                                >
                                    Comments (Optional)
                                </Label>
                                <Textarea
                                    id="approvalComments"
                                    placeholder="Add any comments about this approval..."
                                    value={approvalComments}
                                    onChange={(e) =>
                                        setApprovalComments(e.target.value)
                                    }
                                    rows={3}
                                    className="mt-1"
                                />
                            </div>
                        </div>
                    )}
                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => setShowApprovalModal(false)}
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={handleConfirmApproval}
                            disabled={isProcessing}
                            className="bg-green-600 hover:bg-green-700"
                        >
                            {isProcessing
                                ? 'Approving...'
                                : `Approve as ${approvalLevel === 1 ? 'Supervisor' : 'Admin'}`}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* ========================================== */}
            {/* REJECTION MODAL */}
            {/* ========================================== */}
            <Dialog
                open={showRejectionModal}
                onOpenChange={setShowRejectionModal}
            >
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <XCircle className="h-5 w-5 text-red-600" />
                            Reject Requisition
                        </DialogTitle>
                        <DialogDescription>
                            Please provide a reason for rejecting this
                            requisition.
                        </DialogDescription>
                    </DialogHeader>
                    {selectedOrder && (
                        <div className="space-y-4">
                            <div className="rounded-lg bg-red-50 p-4 dark:bg-red-900/20">
                                <p className="text-sm text-red-800 dark:text-red-300">
                                    <strong>PR #:</strong>{' '}
                                    {selectedOrder.po_number}
                                </p>
                                <p className="text-sm text-red-800 dark:text-red-300">
                                    <strong>Justification:</strong>{' '}
                                    {selectedOrder.title}
                                </p>
                                <p className="text-sm text-red-800 dark:text-red-300">
                                    <strong>Amount:</strong>{' '}
                                    {formatCurrency(
                                        selectedOrder.total_amount,
                                        selectedOrder.currency,
                                    )}
                                </p>
                            </div>
                            <div>
                                <Label
                                    htmlFor="rejectionReason"
                                    className="text-sm font-medium"
                                >
                                    Rejection Reason *
                                </Label>
                                <Textarea
                                    id="rejectionReason"
                                    placeholder="Please explain why this requisition is being rejected..."
                                    value={rejectionReason}
                                    onChange={(e) =>
                                        setRejectionReason(e.target.value)
                                    }
                                    rows={4}
                                    className="mt-1"
                                />
                            </div>
                        </div>
                    )}
                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => setShowRejectionModal(false)}
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={handleConfirmRejection}
                            disabled={isProcessing || !rejectionReason.trim()}
                            className="bg-red-600 hover:bg-red-700"
                        >
                            {isProcessing ? 'Rejecting...' : 'Reject'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </AppLayout>
    );
}
