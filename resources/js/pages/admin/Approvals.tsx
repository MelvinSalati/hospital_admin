import React, { useState, useEffect, useCallback } from 'react';
import { Head, usePage } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import Container from '@/components/container';
import PageHeader from '@/components/PageHeader';
import {
    // PageHeader actions
    Plus,
    Download,
    RefreshCw,
    // Status & Priority configs
    CheckCircle,
    XCircle,
    Clock,
    AlertTriangle,
    FileText,
    User,
    Check,
    X,
    Minus,
    TrendingDown,
    TrendingUp,
    ShoppingCart,
    Shield,
    Wallet,
    Eye,
    Trash2,
} from 'lucide-react';

// UI Components
import { Button } from '@/components/ui/button';
import { ReusableTable, Column, Action } from '@/components/ReusableTable';
import { toast } from 'react-hot-toast';
import Http from '@/utils/Http';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from '@/components/ui/tooltip';
import { Progress } from '@/components/ui/progress';
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from '@/components/ui/accordion';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

// ============================================
// TYPES
// ============================================

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
    budget_allocated: number;
    budget_utilized: number;
    budget_remaining: number;
    priority: 'low' | 'medium' | 'high' | 'critical';
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

interface Budget {
    id: number;
    budget_code: string;
    department: string;
    year: number;
    allocated_amount: number;
    utilized_amount: number;
    remaining_amount: number;
    percentage_used: number;
    status: 'active' | 'exceeded' | 'closed';
    category: string;
    description?: string;
}

interface AdminStats {
    total_orders: number;
    pending_supervisor: number;
    pending_admin: number;
    approved: number;
    rejected: number;
    total_value: number;
    average_processing_time: number;
    urgent_orders: number;
    budgets_tracked: number;
    budgets_used_percentage: number;
}

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
// MAIN COMPONENT
// ============================================

export default function Approval() {
    const { props } = usePage();
    const [loading, setLoading] = useState(false);
    const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
    const [budgets, setBudgets] = useState<Budget[]>([]);
    const [selectedOrder, setSelectedOrder] = useState<PurchaseOrder | null>(
        null,
    );
    const [selectedBudget, setSelectedBudget] = useState<Budget | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<string>('');
    const [departmentFilter, setDepartmentFilter] = useState<string>('');
    const [priorityFilter, setPriorityFilter] = useState<string>('');
    const [pagination, setPagination] = useState({
        currentPage: 1,
        pageSize: 10,
        totalItems: 0,
        totalPages: 1,
    });

    // Modal states
    const [showDetailModal, setShowDetailModal] = useState(false);
    const [showApprovalModal, setShowApprovalModal] = useState(false);
    const [showRejectionModal, setShowRejectionModal] = useState(false);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showBudgetModal, setShowBudgetModal] = useState(false);
    const [rejectionReason, setRejectionReason] = useState('');
    const [approvalComments, setApprovalComments] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);
    const [activeTab, setActiveTab] = useState<string>('all');
    const [approvalLevel, setApprovalLevel] = useState<1 | 2>(1);

    // Create form state
    const [createForm, setCreateForm] = useState({
        title: '',
        description: '',
        department: '',
        supplier_name: '',
        supplier_contact: '',
        total_amount: 0,
        currency: 'USD',
        budget_code: '',
        priority: 'medium' as 'low' | 'medium' | 'high' | 'critical',
        is_urgent: false,
        requires_two_level_approval: false,
        delivery_date: '',
        delivery_address: '',
        notes: '',
        items: [] as POItem[],
    });

    // New item form
    const [itemForm, setItemForm] = useState<POItem>({
        description: '',
        quantity: 1,
        unit_price: 0,
        total_price: 0,
        tax_rate: 0,
        tax_amount: 0,
        category: '',
    });

    const { auth } = usePage().props;
    const userRole = auth?.user?.is_admin
        ? 'admin'
        : auth?.user?.is_supervisor
          ? 'supervisor'
          : 'staff';
    const isAdmin = userRole === 'admin';
    const isSupervisor = userRole === 'supervisor';
    const isManager = isAdmin || isSupervisor;

    // Stats
    const [stats, setStats] = useState<AdminStats>({
        total_orders: 0,
        pending_supervisor: 0,
        pending_admin: 0,
        approved: 0,
        rejected: 0,
        total_value: 0,
        average_processing_time: 0,
        urgent_orders: 0,
        budgets_tracked: 0,
        budgets_used_percentage: 0,
    });

    // ============================================
    // HELPER FUNCTIONS
    // ============================================

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

    const formatCurrency = (amount: number, currency: string = 'USD') => {
        return new Intl.NumberFormat('en-ZM', {
            style: 'currency',
            currency: currency || 'USD',
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        }).format(amount);
    };

    const calculateTotal = (items: POItem[]) => {
        return items.reduce((sum, item) => sum + (item.total_price || 0), 0);
    };

    // ============================================
    // FETCH DATA
    // ============================================

    const fetchPurchaseOrders = useCallback(async () => {
        setLoading(true);
        try {
            const params: any = {
                page: pagination.currentPage,
                page_size: pagination.pageSize,
            };

            if (searchTerm) params.search = searchTerm;
            if (statusFilter) params.status = statusFilter;
            if (activeTab !== 'all') params.status = activeTab;
            if (departmentFilter) params.department = departmentFilter;
            if (priorityFilter) params.priority = priorityFilter;

            const response = await Http.get('/admin/purchase-orders', {
                params,
            });
            const data = response.data;

            setPurchaseOrders(data.data || []);

            if (data.stats) {
                setStats(data.stats);
            }

            setPagination((prev) => ({
                ...prev,
                totalItems: data.total || data.data?.length || 0,
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
        departmentFilter,
        priorityFilter,
        activeTab,
    ]);

    const fetchBudgets = useCallback(async () => {
        try {
            const response = await Http.get('/admin/budgets');
            setBudgets(response.data || []);
        } catch (error) {
            console.error('Failed to fetch budgets:', error);
        }
    }, []);

    useEffect(() => {
        fetchPurchaseOrders();
        fetchBudgets();
    }, [fetchPurchaseOrders, fetchBudgets]);

    // ============================================
    // HANDLERS
    // ============================================

    const handleTabChange = (tab: string) => {
        setActiveTab(tab);
        setStatusFilter('');
        setPagination((prev) => ({ ...prev, currentPage: 1 }));
    };

    const handleView = (order: PurchaseOrder) => {
        setSelectedOrder(order);
        setShowDetailModal(true);
    };

    const handleApprove = (order: PurchaseOrder) => {
        setSelectedOrder(order);
        const level = order.status === 'pending_supervisor' ? 1 : 2;
        setApprovalLevel(level);
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
                    ? `/admin/purchase-orders/${selectedOrder.id}/supervisor-approve`
                    : `/admin/purchase-orders/${selectedOrder.id}/admin-approve`;

            const response = await Http.post(endpoint, {
                comments: approvalComments,
                approver_id: auth.user.id,
                approver_name: auth.user.name,
            });

            if (response.data.success) {
                toast.success(
                    `Order ${selectedOrder.po_number} approved successfully`,
                );
                await fetchPurchaseOrders();
                setShowApprovalModal(false);
                setSelectedOrder(null);
                setApprovalComments('');
            } else {
                throw new Error(response.data.message || 'Approval failed');
            }
        } catch (error: any) {
            console.error('Approval failed:', error);
            toast.error(
                error.response?.data?.message || 'Failed to approve order',
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
                    ? `/admin/purchase-orders/${selectedOrder.id}/supervisor-reject`
                    : `/admin/purchase-orders/${selectedOrder.id}/admin-reject`;

            const response = await Http.post(endpoint, {
                rejection_reason: rejectionReason,
                rejected_by: auth.user.id,
                rejected_by_name: auth.user.name,
            });

            if (response.data.success) {
                toast.success(`Order ${selectedOrder.po_number} rejected`);
                await fetchPurchaseOrders();
                setShowRejectionModal(false);
                setSelectedOrder(null);
                setRejectionReason('');
            } else {
                throw new Error(response.data.message || 'Rejection failed');
            }
        } catch (error: any) {
            console.error('Rejection failed:', error);
            toast.error(
                error.response?.data?.message || 'Failed to reject order',
            );
        } finally {
            setIsProcessing(false);
        }
    };

    const handleCancel = async (id: number) => {
        if (!confirm('Are you sure you want to cancel this purchase order?'))
            return;
        try {
            const response = await Http.post(
                `/admin/purchase-orders/${id}/cancel`,
            );
            if (response.data.success) {
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
            const response = await Http.delete(`/admin/purchase-orders/${id}`);
            if (response.data.success) {
                toast.success('Purchase order deleted');
                await fetchPurchaseOrders();
            }
        } catch (error) {
            console.error('Delete failed:', error);
            toast.error('Failed to delete order');
        }
    };

    const handleCreate = () => {
        setCreateForm({
            title: '',
            description: '',
            department: '',
            supplier_name: '',
            supplier_contact: '',
            total_amount: 0,
            currency: 'USD',
            budget_code: '',
            priority: 'medium',
            is_urgent: false,
            requires_two_level_approval: false,
            delivery_date: '',
            delivery_address: '',
            notes: '',
            items: [],
        });
        setItemForm({
            description: '',
            quantity: 1,
            unit_price: 0,
            total_price: 0,
            tax_rate: 0,
            tax_amount: 0,
            category: '',
        });
        setShowCreateModal(true);
    };

    const handleAddItem = () => {
        if (!itemForm.description.trim()) {
            toast.error('Please enter item description');
            return;
        }
        if (itemForm.quantity <= 0) {
            toast.error('Quantity must be greater than 0');
            return;
        }
        if (itemForm.unit_price <= 0) {
            toast.error('Unit price must be greater than 0');
            return;
        }

        const totalPrice = itemForm.quantity * itemForm.unit_price;
        const taxAmount = (totalPrice * (itemForm.tax_rate || 0)) / 100;
        const totalWithTax = totalPrice + taxAmount;

        const newItem: POItem = {
            ...itemForm,
            total_price: totalWithTax,
            tax_amount: taxAmount,
        };

        setCreateForm({
            ...createForm,
            items: [...createForm.items, newItem],
            total_amount: calculateTotal([...createForm.items, newItem]),
        });

        setItemForm({
            description: '',
            quantity: 1,
            unit_price: 0,
            total_price: 0,
            tax_rate: 0,
            tax_amount: 0,
            category: '',
        });
    };

    const handleRemoveItem = (index: number) => {
        const updatedItems = createForm.items.filter((_, i) => i !== index);
        setCreateForm({
            ...createForm,
            items: updatedItems,
            total_amount: calculateTotal(updatedItems),
        });
    };

    const handleCreateSubmit = async () => {
        if (!createForm.title.trim()) {
            toast.error('Please enter a title');
            return;
        }
        if (!createForm.department) {
            toast.error('Please select a department');
            return;
        }
        if (!createForm.supplier_name.trim()) {
            toast.error('Please enter supplier name');
            return;
        }
        if (createForm.items.length === 0) {
            toast.error('Please add at least one item');
            return;
        }
        if (!createForm.budget_code) {
            toast.error('Please select a budget code');
            return;
        }

        const selectedBudget = budgets.find(
            (b) => b.budget_code === createForm.budget_code,
        );
        if (
            selectedBudget &&
            selectedBudget.remaining_amount < createForm.total_amount
        ) {
            toast.error(
                `Insufficient budget. Remaining: ${formatCurrency(selectedBudget.remaining_amount, createForm.currency)}`,
            );
            return;
        }

        setIsProcessing(true);
        try {
            const response = await Http.post('/admin/purchase-orders', {
                ...createForm,
                requester_id: auth.user.id,
                requester_name: auth.user.name,
                requester_department: auth.user.department || '',
                submitted_by: auth.user.id,
                submitted_by_name: auth.user.name,
                status: 'pending_supervisor',
                approval_level: createForm.requires_two_level_approval ? 2 : 1,
            });

            if (response.data.success) {
                toast.success('Purchase order submitted successfully');
                setShowCreateModal(false);
                await fetchPurchaseOrders();
                setCreateForm({
                    title: '',
                    description: '',
                    department: '',
                    supplier_name: '',
                    supplier_contact: '',
                    total_amount: 0,
                    currency: 'USD',
                    budget_code: '',
                    priority: 'medium',
                    is_urgent: false,
                    requires_two_level_approval: false,
                    delivery_date: '',
                    delivery_address: '',
                    notes: '',
                    items: [],
                });
            } else {
                throw new Error(response.data.message || 'Submission failed');
            }
        } catch (error: any) {
            console.error('Create failed:', error);
            toast.error(
                error.response?.data?.message ||
                    'Failed to submit purchase order',
            );
        } finally {
            setIsProcessing(false);
        }
    };

    const handleExport = () => {
        toast.success('Exporting purchase orders...');
    };

    const handleRefresh = () => {
        fetchPurchaseOrders();
        toast.success('Data refreshed');
    };

    const handleViewBudget = (budget: Budget) => {
        setSelectedBudget(budget);
        setShowBudgetModal(true);
    };

    // ============================================
    // STATS CARDS
    // ============================================

    const StatCard = ({
        title,
        value,
        color,
        icon,
        subtitle,
        progress,
        progressColor,
    }: any) => (
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
                    {progress !== undefined && (
                        <div className="mt-2">
                            <Progress
                                value={progress}
                                className="h-2"
                                indicatorClassName={progressColor}
                            />
                        </div>
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
            label: 'PO #',
            minWidth: 100,
            format: (value) => (
                <span className="font-mono text-sm font-medium text-blue-600 dark:text-blue-400">
                    {value || 'N/A'}
                </span>
            ),
            sortable: true,
        },
        {
            id: 'title',
            label: 'Title',
            minWidth: 150,
            format: (value) => (
                <div>
                    <div className="text-sm font-medium text-slate-800 dark:text-slate-200">
                        {value}
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">
                        {createForm.department || 'No department'}
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
                        {formatDateTime(value)}
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
            show: (row) => {
                if (row.status === 'pending_supervisor' && isSupervisor)
                    return true;
                if (row.status === 'pending_admin' && isAdmin) return true;
                return false;
            },
        },
        {
            label: 'Reject',
            icon: <XCircle className="h-4 w-4" />,
            color: 'error',
            onClick: (row) => handleReject(row),
            show: (row) => {
                if (row.status === 'pending_supervisor' && isSupervisor)
                    return true;
                if (row.status === 'pending_admin' && isAdmin) return true;
                return false;
            },
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

    // Status options for filtering
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

    const budgetOptions = budgets.map((b) => ({
        value: b.budget_code,
        label: `${b.budget_code} - ${b.department} (${formatCurrency(b.remaining_amount)})`,
    }));

    // Tabs
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
    // RENDER - Keep all your existing JSX here
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
                            title="Purchase Requistions"
                            rowsPerPageOptions={[10, 25, 50, 100]}
                            defaultRowsPerPage={10}
                            defaultOrderBy="submitted_at"
                            defaultOrder="desc"
                            filterPlaceholder="Search by PO #, title, supplier..."
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
            {/* VIEW DETAIL MODAL */}
            {/* ========================================== */}
            <Dialog open={showDetailModal} onOpenChange={setShowDetailModal}>
                <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <FileText className="h-5 w-5 text-blue-600" />
                            Purchase Order Details
                        </DialogTitle>
                        <DialogDescription>
                            View complete details of the purchase order
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
                                        {
                                            STATUS_CONFIG[selectedOrder.status]
                                                ?.label
                                        }
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
                                        {selectedOrder.supplier_name}
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
                                        Budget Code
                                    </Label>
                                    <p className="font-medium text-slate-800 dark:text-slate-200">
                                        {selectedOrder.budget_code}
                                    </p>
                                    {selectedOrder.budget_allocated && (
                                        <p className="text-sm text-slate-500">
                                            Allocated:{' '}
                                            {formatCurrency(
                                                selectedOrder.budget_allocated,
                                            )}
                                        </p>
                                    )}
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
                                                    Tax
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
                                                        key={index}
                                                        className="border-t border-slate-200 dark:border-slate-700"
                                                    >
                                                        <td className="px-3 py-2">
                                                            {item.description}
                                                        </td>
                                                        <td className="px-3 py-2 text-right">
                                                            {item.quantity}
                                                        </td>
                                                        <td className="px-3 py-2 text-right">
                                                            {formatCurrency(
                                                                item.unit_price,
                                                            )}
                                                        </td>
                                                        <td className="px-3 py-2 text-right">
                                                            {item.tax_rate || 0}
                                                            %
                                                        </td>
                                                        <td className="px-3 py-2 text-right font-semibold">
                                                            {formatCurrency(
                                                                item.total_price,
                                                            )}
                                                        </td>
                                                    </tr>
                                                ),
                                            )}
                                        </tbody>
                                        <tfoot className="border-t-2 border-slate-300 dark:border-slate-600">
                                            <tr>
                                                <td
                                                    colSpan={4}
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

                            {/* Notes and Attachments */}
                            {selectedOrder.notes && (
                                <div>
                                    <Label className="text-xs text-slate-500">
                                        Notes
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
                                    {selectedOrder.supervisor_approved_by_name && (
                                        <div className="flex items-center gap-2 text-sm">
                                            <CheckCircle className="h-4 w-4 text-green-500" />
                                            <span>
                                                Approved by{' '}
                                                {
                                                    selectedOrder.supervisor_approved_by_name
                                                }
                                                {selectedOrder.supervisor_approved_at &&
                                                    ` on ${formatDateTime(selectedOrder.supervisor_approved_at)}`}
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
                            Approve Purchase Order
                        </DialogTitle>
                        <DialogDescription>
                            {approvalLevel === 1
                                ? 'Are you sure you want to approve this purchase order at the supervisor level?'
                                : 'Are you sure you want to approve this purchase order at the admin level?'}
                        </DialogDescription>
                    </DialogHeader>
                    {selectedOrder && (
                        <div className="space-y-4">
                            <div className="rounded-lg bg-green-50 p-4 dark:bg-green-900/20">
                                <p className="text-sm text-green-800 dark:text-green-300">
                                    <strong>PO #:</strong>{' '}
                                    {selectedOrder.po_number}
                                </p>
                                <p className="text-sm text-green-800 dark:text-green-300">
                                    <strong>Title:</strong>{' '}
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
                            Reject Purchase Order
                        </DialogTitle>
                        <DialogDescription>
                            Please provide a reason for rejecting this purchase
                            order.
                        </DialogDescription>
                    </DialogHeader>
                    {selectedOrder && (
                        <div className="space-y-4">
                            <div className="rounded-lg bg-red-50 p-4 dark:bg-red-900/20">
                                <p className="text-sm text-red-800 dark:text-red-300">
                                    <strong>PO #:</strong>{' '}
                                    {selectedOrder.po_number}
                                </p>
                                <p className="text-sm text-red-800 dark:text-red-300">
                                    <strong>Title:</strong>{' '}
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
                                    placeholder="Please explain why this purchase order is being rejected..."
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
