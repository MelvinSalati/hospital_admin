import React, { useState, useEffect, useCallback } from 'react';
import { Head, usePage } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import Container from '@/components/Container';
import PageHeader from '@/components/PageHeader';
import {
    Plus,
    Download,
    RefreshCw,
    Wallet,
    TrendingUp,
    TrendingDown,
    AlertTriangle,
    CheckCircle,
    XCircle,
    Eye,
    Edit,
    Trash2,
    DollarSign,
    PieChart,
    Calendar,
    Tag,
    Building,
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
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

// ============================================
// TYPES
// ============================================

interface Category {
    id: number;
    code: string;
    name: string;
    description: string;
    type: string;
    color: string;
    parent_id: number | null;
    is_active: number;
    created_at: string;
    updated_at: string;
}

interface Budget {
    id: number;
    budget_code: string;
    budget_name: string;
    description: string | null;
    category_id: number;
    category: Category;
    department_id: number | null;
    supplier_id: number | null;
    fiscal_year: string;
    budget_type: 'annual' | 'project' | 'grant' | 'donor' | 'capital';
    original_amount: string;
    revised_amount: string | null;
    allocated_amount: string;
    reserved_amount: string;
    committed_amount: string;
    actual_spent: string;
    available_amount: string;
    utilization_percentage: string;
    warning_threshold: string;
    critical_threshold: string;
    alert_triggered: boolean;
    alert_message: string | null;
    alert_triggered_at: string | null;
    status: 'active' | 'pending' | 'closed' | 'archived' | 'on_hold';
    created_by: number;
    approved_by: number;
    approved_at: string;
    created_at: string;
    updated_at: string;
    deleted_at: string | null;
}

interface BudgetStats {
    total_budgets: number;
    total_allocated: number;
    total_spent: number;
    total_available: number;
    overall_utilization: number;
    active_budgets: number;
    alert_count: number;
}

// ============================================
// CONFIGURATION
// ============================================

const BUDGET_TYPE_CONFIG: Record<
    string,
    { label: string; color: string; icon: React.ReactNode }
> = {
    annual: {
        label: 'Annual',
        color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
        icon: <Calendar className="h-3 w-3" />,
    },
    project: {
        label: 'Project',
        color: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
        icon: <Tag className="h-3 w-3" />,
    },
    grant: {
        label: 'Grant',
        color: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
        icon: <DollarSign className="h-3 w-3" />,
    },
    donor: {
        label: 'Donor',
        color: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
        icon: <TrendingUp className="h-3 w-3" />,
    },
    capital: {
        label: 'Capital',
        color: 'bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-400',
        icon: <Building className="h-3 w-3" />,
    },
};

const STATUS_CONFIG: Record<
    string,
    { label: string; color: string; icon: React.ReactNode }
> = {
    active: {
        label: 'Active',
        color: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
        icon: <CheckCircle className="h-3 w-3" />,
    },
    pending: {
        label: 'Pending',
        color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
        icon: <AlertTriangle className="h-3 w-3" />,
    },
    closed: {
        label: 'Closed',
        color: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
        icon: <XCircle className="h-3 w-3" />,
    },
    archived: {
        label: 'Archived',
        color: 'bg-slate-100 text-slate-800 dark:bg-slate-700 dark:text-slate-300',
        icon: <XCircle className="h-3 w-3" />,
    },
    on_hold: {
        label: 'On Hold',
        color: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
        icon: <AlertTriangle className="h-3 w-3" />,
    },
};

// ============================================
// MAIN COMPONENT
// ============================================

export default function Budgets() {
    const { props } = usePage();
    const { auth } = props;

    const [loading, setLoading] = useState(false);
    const [budgets, setBudgets] = useState<Budget[]>([]);
    const [selectedBudget, setSelectedBudget] = useState<Budget | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [typeFilter, setTypeFilter] = useState<string>('');
    const [categoryFilter, setCategoryFilter] = useState<string>('');
    const [statusFilter, setStatusFilter] = useState<string>('');
    const [yearFilter, setYearFilter] = useState<string>('');
    const [activeTab, setActiveTab] = useState<string>('all');

    // Modal states
    const [showDetailModal, setShowDetailModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);

    // Stats
    const [stats, setStats] = useState<BudgetStats>({
        total_budgets: 0,
        total_allocated: 0,
        total_spent: 0,
        total_available: 0,
        overall_utilization: 0,
        active_budgets: 0,
        alert_count: 0,
    });

    const [pagination, setPagination] = useState({
        currentPage: 1,
        pageSize: 10,
        totalItems: 0,
        totalPages: 1,
    });

    // ============================================
    // HELPER FUNCTIONS
    // ============================================

    const formatCurrency = (amount: string | number) => {
        const num = typeof amount === 'string' ? parseFloat(amount) : amount;
        if (isNaN(num)) return '$0.00';
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        }).format(num);
    };

    const formatDate = (date: string) => {
        if (!date) return 'N/A';
        return new Date(date).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
        });
    };

    const formatDateTime = (date: string) => {
        if (!date) return 'N/A';
        return new Date(date).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    const getUtilizationColor = (percentage: string | number) => {
        const p =
            typeof percentage === 'string'
                ? parseFloat(percentage)
                : percentage;
        if (isNaN(p)) return 'text-green-600';
        if (p > 85) return 'text-red-600';
        if (p > 70) return 'text-orange-600';
        return 'text-green-600';
    };

    const getUtilizationProgressColor = (percentage: string | number) => {
        const p =
            typeof percentage === 'string'
                ? parseFloat(percentage)
                : percentage;
        if (isNaN(p)) return 'bg-green-500';
        if (p > 85) return 'bg-red-500';
        if (p > 70) return 'bg-orange-500';
        return 'bg-green-500';
    };

    // ============================================
    // FETCH DATA
    // ============================================

    const fetchBudgets = useCallback(async () => {
        setLoading(true);
        try {
            const params: any = {
                page: pagination.currentPage,
                page_size: pagination.pageSize,
            };

            if (searchTerm) params.search = searchTerm;
            if (typeFilter) params.type = typeFilter;
            if (categoryFilter) params.category = categoryFilter;
            if (statusFilter) params.status = statusFilter;
            if (yearFilter) params.year = yearFilter;
            if (activeTab !== 'all') {
                if (activeTab === 'alert') {
                    params.alert_triggered = true;
                } else {
                    params.status = activeTab;
                }
            }

            const response = await Http.get('/admin/all-budgets', { params });
            const data = response.data;

            if (data.success) {
                const budgetData = data.budgets || [];
                setBudgets(budgetData);

                // Calculate stats from the data
                const totalAllocated = budgetData.reduce(
                    (sum: number, b: Budget) =>
                        sum + parseFloat(b.allocated_amount || 0),
                    0,
                );
                const totalSpent = budgetData.reduce(
                    (sum: number, b: Budget) =>
                        sum + parseFloat(b.actual_spent || 0),
                    0,
                );
                const totalAvailable = budgetData.reduce(
                    (sum: number, b: Budget) =>
                        sum + parseFloat(b.available_amount || 0),
                    0,
                );
                const overallUtilization =
                    totalAllocated > 0
                        ? (totalSpent / totalAllocated) * 100
                        : 0;

                setStats({
                    total_budgets: budgetData.length,
                    total_allocated: totalAllocated,
                    total_spent: totalSpent,
                    total_available: totalAvailable,
                    overall_utilization: overallUtilization,
                    active_budgets: budgetData.filter(
                        (b: Budget) => b.status === 'active',
                    ).length,
                    alert_count: budgetData.filter(
                        (b: Budget) => b.alert_triggered,
                    ).length,
                });

                setPagination((prev) => ({
                    ...prev,
                    totalItems: data.total || budgetData.length || 0,
                    totalPages: data.last_page || 1,
                }));
            }
        } catch (error) {
            console.error('Failed to fetch budgets:', error);
            toast.error('Failed to load budgets');
        } finally {
            setLoading(false);
        }
    }, [
        pagination.currentPage,
        pagination.pageSize,
        searchTerm,
        typeFilter,
        categoryFilter,
        statusFilter,
        yearFilter,
        activeTab,
    ]);

    useEffect(() => {
        fetchBudgets();
    }, [fetchBudgets]);

    // ============================================
    // HANDLERS
    // ============================================

    const handleTabChange = (tab: string) => {
        setActiveTab(tab);
        setStatusFilter('');
        setPagination((prev) => ({ ...prev, currentPage: 1 }));
    };

    const handleView = (budget: Budget) => {
        setSelectedBudget(budget);
        setShowDetailModal(true);
    };

    const handleEdit = (budget: Budget) => {
        setSelectedBudget(budget);
        setShowEditModal(true);
    };

    const handleDelete = async (budget: Budget) => {
        setSelectedBudget(budget);
        setShowDeleteModal(true);
    };

    const handleConfirmDelete = async () => {
        if (!selectedBudget) return;
        try {
            const response = await Http.delete(
                `/admin/budgets/${selectedBudget.id}`,
            );
            if (response.data.success) {
                toast.success(
                    `Budget ${selectedBudget.budget_code} deleted successfully`,
                );
                await fetchBudgets();
                setShowDeleteModal(false);
                setSelectedBudget(null);
            } else {
                throw new Error(response.data.message || 'Delete failed');
            }
        } catch (error: any) {
            console.error('Delete failed:', error);
            toast.error(
                error.response?.data?.message || 'Failed to delete budget',
            );
        }
    };

    const handleExport = () => {
        toast.success('Exporting budgets...');
    };

    const handleRefresh = () => {
        fetchBudgets();
        toast.success('Data refreshed');
    };

    const handleCreate = () => {
        toast.success('Create budget functionality coming soon!');
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
                            <Progress value={progress} className="h-2" />
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

    const columns: Column<Budget>[] = [
        {
            id: 'budget_code',
            label: 'Budget Code',
            minWidth: 120,
            format: (value) => (
                <span className="font-mono text-sm font-medium text-blue-600 dark:text-blue-400">
                    {value || 'N/A'}
                </span>
            ),
            sortable: true,
        },
        {
            id: 'budget_name',
            label: 'Budget Name',
            minWidth: 180,
            format: (value, row) => (
                <div>
                    <div className="text-sm font-medium text-slate-800 dark:text-slate-200">
                        {value}
                    </div>
                    {row.description && (
                        <div className="max-w-[200px] truncate text-xs text-slate-500 dark:text-slate-400">
                            {row.description}
                        </div>
                    )}
                </div>
            ),
            sortable: true,
        },
        {
            id: 'category',
            label: 'Category',
            minWidth: 140,
            format: (value: Category) => {
                if (!value)
                    return <span className="text-sm text-slate-400">N/A</span>;
                return (
                    <span
                        className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium"
                        style={{
                            backgroundColor: `${value.color}20`,
                            color: value.color,
                            border: `1px solid ${value.color}40`,
                        }}
                    >
                        <Tag className="h-3 w-3" />
                        {value.name}
                    </span>
                );
            },
        },
        {
            id: 'budget_type',
            label: 'Type',
            minWidth: 100,
            format: (value) => {
                const config =
                    BUDGET_TYPE_CONFIG[value] || BUDGET_TYPE_CONFIG.annual;
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
            id: 'allocated_amount',
            label: 'Allocated',
            minWidth: 120,
            format: (value) => (
                <div className="font-semibold text-slate-800 dark:text-slate-200">
                    {formatCurrency(value)}
                </div>
            ),
            sortable: true,
        },
        {
            id: 'actual_spent',
            label: 'Spent',
            minWidth: 120,
            format: (value) => (
                <div className="text-slate-700 dark:text-slate-300">
                    {formatCurrency(value)}
                </div>
            ),
            sortable: true,
        },
        {
            id: 'available_amount',
            label: 'Available',
            minWidth: 130,
            format: (value, row) => {
                const available = parseFloat(value || 0);
                const allocated = parseFloat(row.allocated_amount || 0);
                const isLow = available < allocated * 0.2;
                return (
                    <div
                        className={
                            isLow
                                ? 'font-semibold text-red-600'
                                : 'font-medium text-green-600'
                        }
                    >
                        {formatCurrency(value)}
                        {isLow && (
                            <span className="ml-1 text-xs text-red-500">
                                ⚠️
                            </span>
                        )}
                    </div>
                );
            },
            sortable: true,
        },
        {
            id: 'utilization_percentage',
            label: 'Utilization',
            minWidth: 160,
            format: (value, row) => {
                const percentage = parseFloat(value || 0);
                const warningThreshold = parseFloat(
                    row.warning_threshold || 70,
                );
                const criticalThreshold = parseFloat(
                    row.critical_threshold || 85,
                );

                let statusText = 'Good';
                let statusColor = 'text-green-600';
                if (percentage > criticalThreshold) {
                    statusText = 'Critical';
                    statusColor = 'text-red-600';
                } else if (percentage > warningThreshold) {
                    statusText = 'Warning';
                    statusColor = 'text-orange-600';
                }

                return (
                    <div className="flex items-center gap-2">
                        <span
                            className={`text-sm font-medium ${getUtilizationColor(percentage)} min-w-[45px]`}
                        >
                            {percentage.toFixed(1)}%
                        </span>
                        <div className="h-2 w-20 rounded-full bg-gray-200">
                            <div
                                className={`h-2 rounded-full ${getUtilizationProgressColor(percentage)}`}
                                style={{
                                    width: `${Math.min(percentage, 100)}%`,
                                }}
                            />
                        </div>
                        <span className={`text-xs ${statusColor} font-medium`}>
                            {statusText}
                        </span>
                    </div>
                );
            },
            sortable: true,
        },
        {
            id: 'alert_triggered',
            label: 'Alert',
            minWidth: 80,
            format: (value) =>
                value ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-1 text-xs font-medium text-red-800 dark:bg-red-900/30 dark:text-red-400">
                        <span className="h-2 w-2 animate-pulse rounded-full bg-red-500" />
                        Alert
                    </span>
                ) : (
                    <span className="rounded-full bg-green-100 px-2 py-1 text-xs font-medium text-green-800 dark:bg-green-900/30 dark:text-green-400">
                        ✓ OK
                    </span>
                ),
        },
        {
            id: 'status',
            label: 'Status',
            minWidth: 100,
            format: (value) => {
                const config = STATUS_CONFIG[value] || STATUS_CONFIG.active;
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
            id: 'fiscal_year',
            label: 'Year',
            minWidth: 80,
            format: (value) => (
                <span className="rounded bg-slate-100 px-2 py-1 text-xs font-medium dark:bg-slate-700">
                    {value || 'N/A'}
                </span>
            ),
            sortable: true,
        },
    ];

    const actions: Action<Budget>[] = [
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
            show: (row) => row.status === 'active' || row.status === 'pending',
        },
        {
            label: 'Delete',
            icon: <Trash2 className="h-4 w-4" />,
            color: 'error',
            onClick: handleDelete,
            show: (row) => row.status !== 'active',
        },
    ];

    // Filter options
    const typeOptions = Object.entries(BUDGET_TYPE_CONFIG).map(
        ([key, value]) => ({
            value: key,
            label: value.label,
        }),
    );

    // Get unique categories from the budgets data
    const categoryOptions = Array.from(
        new Map(budgets.map((b) => [b.category_id, b.category])).values(),
    )
        .filter(Boolean)
        .map((cat) => ({
            value: String(cat.id),
            label: cat.name,
        }));

    const statusOptions = Object.entries(STATUS_CONFIG).map(([key, value]) => ({
        value: key,
        label: value.label,
    }));

    const yearOptions = Array.from(new Set(budgets.map((b) => b.fiscal_year)))
        .filter(Boolean)
        .sort()
        .map((year) => ({
            value: year,
            label: year,
        }));

    // Tabs
    const tabs = [
        {
            key: 'all',
            label: 'All',
            count: stats.total_budgets,
            icon: <Wallet className="h-4 w-4" />,
        },
        {
            key: 'active',
            label: 'Active',
            count: stats.active_budgets,
            icon: <CheckCircle className="h-4 w-4" />,
        },
        {
            key: 'alert',
            label: 'Alert',
            count: stats.alert_count,
            icon: <AlertTriangle className="h-4 w-4" />,
        },
        {
            key: 'pending',
            label: 'Pending',
            count: budgets.filter((b) => b.status === 'pending').length,
            icon: <AlertTriangle className="h-4 w-4" />,
        },
        {
            key: 'closed',
            label: 'Closed',
            count: budgets.filter((b) => b.status === 'closed').length,
            icon: <XCircle className="h-4 w-4" />,
        },
    ];

    // ============================================
    // RENDER
    // ============================================

    return (
        <AppLayout
            breadcrumbs={[
                { title: 'Home', href: '/' },
                { title: 'Finance', href: '' },
                { title: 'Budgets', href: '' },
            ]}
        >
            <Head title="Budgets" />

            <div className="min-h-screen bg-slate-100 px-4 py-6 dark:bg-slate-900">
                <Container>
                    {/* Header */}
                    <PageHeader
                        icon={<Wallet className="h-6 w-6" />}
                        title="Budgets"
                        subtitle="Manage budget allocation and expenditure"
                        actions={[
                            <div className="flex items-center gap-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={handleExport}
                                >
                                    <Download className="mr-2 h-4 w-4" />
                                    Export
                                </Button>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={handleRefresh}
                                >
                                    <RefreshCw className="mr-2 h-4 w-4" />
                                    Refresh
                                </Button>
                                <Button size="sm" onClick={handleCreate}>
                                    <Plus className="mr-2 h-4 w-4" />
                                    New Budget
                                </Button>
                            </div>,
                        ]}
                    />

                    {/* Stats Cards */}
                    <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                        <StatCard
                            title="Total Allocated"
                            value={formatCurrency(stats.total_allocated)}
                            color="bg-blue-50 dark:bg-blue-900/20"
                            icon={<Wallet className="h-5 w-5 text-blue-600" />}
                        />
                        <StatCard
                            title="Total Spent"
                            value={formatCurrency(stats.total_spent)}
                            color="bg-green-50 dark:bg-green-900/20"
                            icon={
                                <TrendingDown className="h-5 w-5 text-green-600" />
                            }
                        />
                        <StatCard
                            title="Total Available"
                            value={formatCurrency(stats.total_available)}
                            color="bg-purple-50 dark:bg-purple-900/20"
                            icon={
                                <DollarSign className="h-5 w-5 text-purple-600" />
                            }
                        />
                        <StatCard
                            title="Overall Utilization"
                            value={`${stats.overall_utilization.toFixed(1)}%`}
                            color="bg-orange-50 dark:bg-orange-900/20"
                            icon={
                                <PieChart className="h-5 w-5 text-orange-600" />
                            }
                            progress={Math.min(stats.overall_utilization, 100)}
                        />
                    </div>

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
                            data={budgets}
                            actions={actions}
                            loading={loading}
                            title="Budget List"
                            rowsPerPageOptions={[10, 25, 50, 100]}
                            defaultRowsPerPage={10}
                            defaultOrderBy="budget_code"
                            defaultOrder="asc"
                            filterPlaceholder="Search by code, name, description..."
                            statusFilterKey="status"
                            statusOptions={statusOptions}
                            additionalFilters={[
                                {
                                    key: 'type',
                                    label: 'Type',
                                    options: typeOptions,
                                    value: typeFilter,
                                    onChange: setTypeFilter,
                                },
                                {
                                    key: 'category',
                                    label: 'Category',
                                    options: categoryOptions,
                                    value: categoryFilter,
                                    onChange: setCategoryFilter,
                                },
                                {
                                    key: 'year',
                                    label: 'Fiscal Year',
                                    options: yearOptions,
                                    value: yearFilter,
                                    onChange: setYearFilter,
                                },
                            ]}
                            emptyMessage="No budgets found"
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
                            <Wallet className="h-5 w-5 text-blue-600" />
                            Budget Details
                        </DialogTitle>
                        <DialogDescription>
                            Complete details of the budget allocation
                        </DialogDescription>
                    </DialogHeader>
                    {selectedBudget && (
                        <div className="space-y-4">
                            {/* Header */}
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-2xl font-bold text-slate-800 dark:text-slate-200">
                                        {selectedBudget.budget_code}
                                    </p>
                                    <p className="text-sm text-slate-500 dark:text-slate-400">
                                        {selectedBudget.budget_name}
                                    </p>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span
                                        className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${STATUS_CONFIG[selectedBudget.status]?.color || ''}`}
                                    >
                                        {
                                            STATUS_CONFIG[selectedBudget.status]
                                                ?.icon
                                        }
                                        {
                                            STATUS_CONFIG[selectedBudget.status]
                                                ?.label
                                        }
                                    </span>
                                    {selectedBudget.alert_triggered && (
                                        <Badge variant="destructive">
                                            <AlertTriangle className="mr-1 h-3 w-3" />
                                            Alert
                                        </Badge>
                                    )}
                                </div>
                            </div>

                            {/* Category Badge */}
                            {selectedBudget.category && (
                                <div>
                                    <span
                                        className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-medium"
                                        style={{
                                            backgroundColor: `${selectedBudget.category.color}20`,
                                            color: selectedBudget.category
                                                .color,
                                            border: `1px solid ${selectedBudget.category.color}40`,
                                        }}
                                    >
                                        <Tag className="h-4 w-4" />
                                        {selectedBudget.category.name}
                                        <span className="text-xs opacity-60">
                                            ({selectedBudget.category.code})
                                        </span>
                                    </span>
                                </div>
                            )}

                            {/* Details Grid */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <Label className="text-xs text-slate-500">
                                        Budget Type
                                    </Label>
                                    <p className="font-medium text-slate-800 dark:text-slate-200">
                                        {BUDGET_TYPE_CONFIG[
                                            selectedBudget.budget_type
                                        ]?.label || selectedBudget.budget_type}
                                    </p>
                                </div>
                                <div>
                                    <Label className="text-xs text-slate-500">
                                        Fiscal Year
                                    </Label>
                                    <p className="font-medium text-slate-800 dark:text-slate-200">
                                        {selectedBudget.fiscal_year}
                                    </p>
                                </div>
                                <div>
                                    <Label className="text-xs text-slate-500">
                                        Department
                                    </Label>
                                    <p className="font-medium text-slate-800 dark:text-slate-200">
                                        {selectedBudget.department_id ||
                                            'General'}
                                    </p>
                                </div>
                                <div>
                                    <Label className="text-xs text-slate-500">
                                        Supplier
                                    </Label>
                                    <p className="font-medium text-slate-800 dark:text-slate-200">
                                        {selectedBudget.supplier_id || 'N/A'}
                                    </p>
                                </div>
                            </div>

                            {/* Financial Summary */}
                            <div>
                                <Label className="text-xs text-slate-500">
                                    Financial Summary
                                </Label>
                                <div className="mt-2 grid grid-cols-3 gap-3">
                                    <div className="rounded-lg bg-blue-50 p-3 dark:bg-blue-900/20">
                                        <p className="text-xs text-blue-600 dark:text-blue-400">
                                            Allocated
                                        </p>
                                        <p className="text-lg font-bold text-blue-700 dark:text-blue-300">
                                            {formatCurrency(
                                                selectedBudget.allocated_amount,
                                            )}
                                        </p>
                                    </div>
                                    <div className="rounded-lg bg-green-50 p-3 dark:bg-green-900/20">
                                        <p className="text-xs text-green-600 dark:text-green-400">
                                            Spent
                                        </p>
                                        <p className="text-lg font-bold text-green-700 dark:text-green-300">
                                            {formatCurrency(
                                                selectedBudget.actual_spent,
                                            )}
                                        </p>
                                    </div>
                                    <div className="rounded-lg bg-purple-50 p-3 dark:bg-purple-900/20">
                                        <p className="text-xs text-purple-600 dark:text-purple-400">
                                            Available
                                        </p>
                                        <p className="text-lg font-bold text-purple-700 dark:text-purple-300">
                                            {formatCurrency(
                                                selectedBudget.available_amount,
                                            )}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Utilization */}
                            <div>
                                <div className="flex items-center justify-between">
                                    <Label className="text-xs text-slate-500">
                                        Utilization
                                    </Label>
                                    <span
                                        className={`text-sm font-medium ${getUtilizationColor(selectedBudget.utilization_percentage)}`}
                                    >
                                        {parseFloat(
                                            selectedBudget.utilization_percentage,
                                        ).toFixed(1)}
                                        %
                                    </span>
                                </div>
                                <div className="mt-1 h-3 w-full rounded-full bg-slate-200 dark:bg-slate-700">
                                    <div
                                        className={`h-3 rounded-full ${getUtilizationProgressColor(selectedBudget.utilization_percentage)}`}
                                        style={{
                                            width: `${Math.min(parseFloat(selectedBudget.utilization_percentage), 100)}%`,
                                        }}
                                    />
                                </div>
                                <div className="mt-1 flex justify-between text-xs text-slate-500">
                                    <span>
                                        Warning:{' '}
                                        {selectedBudget.warning_threshold}%
                                    </span>
                                    <span>
                                        Critical:{' '}
                                        {selectedBudget.critical_threshold}%
                                    </span>
                                </div>
                            </div>

                            {/* Budget Breakdown */}
                            <div>
                                <Label className="text-xs text-slate-500">
                                    Budget Breakdown
                                </Label>
                                <div className="mt-2 grid grid-cols-3 gap-2 text-sm">
                                    <div className="rounded border border-slate-200 p-2 dark:border-slate-700">
                                        <p className="text-xs text-slate-500">
                                            Original Amount
                                        </p>
                                        <p className="font-medium">
                                            {formatCurrency(
                                                selectedBudget.original_amount,
                                            )}
                                        </p>
                                    </div>
                                    <div className="rounded border border-slate-200 p-2 dark:border-slate-700">
                                        <p className="text-xs text-slate-500">
                                            Reserved
                                        </p>
                                        <p className="font-medium">
                                            {formatCurrency(
                                                selectedBudget.reserved_amount,
                                            )}
                                        </p>
                                    </div>
                                    <div className="rounded border border-slate-200 p-2 dark:border-slate-700">
                                        <p className="text-xs text-slate-500">
                                            Committed
                                        </p>
                                        <p className="font-medium">
                                            {formatCurrency(
                                                selectedBudget.committed_amount,
                                            )}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Alert Info */}
                            {selectedBudget.alert_triggered && (
                                <Alert variant="destructive">
                                    <AlertTriangle className="h-4 w-4" />
                                    <AlertTitle>Alert Triggered</AlertTitle>
                                    <AlertDescription>
                                        {selectedBudget.alert_message ||
                                            'Budget utilization has exceeded thresholds'}
                                        {selectedBudget.alert_triggered_at && (
                                            <span className="mt-1 block text-xs">
                                                Triggered at:{' '}
                                                {formatDateTime(
                                                    selectedBudget.alert_triggered_at,
                                                )}
                                            </span>
                                        )}
                                    </AlertDescription>
                                </Alert>
                            )}

                            {/* Approval Info */}
                            <div>
                                <Label className="text-xs text-slate-500">
                                    Approval Information
                                </Label>
                                <div className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                                    <p>
                                        Approved by:{' '}
                                        {selectedBudget.approved_by}
                                    </p>
                                    <p>
                                        Approved at:{' '}
                                        {formatDateTime(
                                            selectedBudget.approved_at,
                                        )}
                                    </p>
                                    <p>
                                        Created at:{' '}
                                        {formatDateTime(
                                            selectedBudget.created_at,
                                        )}
                                    </p>
                                    {selectedBudget.updated_at && (
                                        <p>
                                            Updated at:{' '}
                                            {formatDateTime(
                                                selectedBudget.updated_at,
                                            )}
                                        </p>
                                    )}
                                </div>
                            </div>

                            {/* Description */}
                            {selectedBudget.description && (
                                <div>
                                    <Label className="text-xs text-slate-500">
                                        Description
                                    </Label>
                                    <p className="text-sm text-slate-700 dark:text-slate-300">
                                        {selectedBudget.description}
                                    </p>
                                </div>
                            )}

                            {/* Category Description */}
                            {selectedBudget.category?.description && (
                                <div>
                                    <Label className="text-xs text-slate-500">
                                        Category Description
                                    </Label>
                                    <p className="text-sm text-slate-600 dark:text-slate-400">
                                        {selectedBudget.category.description}
                                    </p>
                                </div>
                            )}
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
            {/* DELETE CONFIRMATION MODAL */}
            {/* ========================================== */}
            <Dialog open={showDeleteModal} onOpenChange={setShowDeleteModal}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Trash2 className="h-5 w-5 text-red-600" />
                            Delete Budget
                        </DialogTitle>
                        <DialogDescription>
                            Are you sure you want to delete this budget? This
                            action cannot be undone.
                        </DialogDescription>
                    </DialogHeader>
                    {selectedBudget && (
                        <div className="rounded-lg bg-red-50 p-4 dark:bg-red-900/20">
                            <p className="text-sm font-medium text-red-800 dark:text-red-300">
                                <strong>Code:</strong>{' '}
                                {selectedBudget.budget_code}
                            </p>
                            <p className="text-sm text-red-700 dark:text-red-300">
                                <strong>Name:</strong>{' '}
                                {selectedBudget.budget_name}
                            </p>
                            <p className="text-sm text-red-700 dark:text-red-300">
                                <strong>Allocated:</strong>{' '}
                                {formatCurrency(
                                    selectedBudget.allocated_amount,
                                )}
                            </p>
                            <p className="text-sm text-red-700 dark:text-red-300">
                                <strong>Status:</strong>{' '}
                                {STATUS_CONFIG[selectedBudget.status]?.label ||
                                    selectedBudget.status}
                            </p>
                        </div>
                    )}
                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => setShowDeleteModal(false)}
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={handleConfirmDelete}
                            className="bg-red-600 hover:bg-red-700"
                        >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* ========================================== */}
            {/* EDIT MODAL - Placeholder */}
            {/* ========================================== */}
            <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Edit className="h-5 w-5 text-yellow-600" />
                            Edit Budget
                        </DialogTitle>
                        <DialogDescription>
                            Edit budget details
                        </DialogDescription>
                    </DialogHeader>
                    {selectedBudget && (
                        <div className="py-4">
                            <div className="rounded-lg bg-yellow-50 p-4 dark:bg-yellow-900/20">
                                <p className="text-sm font-medium text-yellow-800 dark:text-yellow-300">
                                    <strong>Code:</strong>{' '}
                                    {selectedBudget.budget_code}
                                </p>
                                <p className="text-sm text-yellow-700 dark:text-yellow-300">
                                    <strong>Name:</strong>{' '}
                                    {selectedBudget.budget_name}
                                </p>
                                <p className="text-sm text-yellow-700 dark:text-yellow-300">
                                    <strong>Allocated:</strong>{' '}
                                    {formatCurrency(
                                        selectedBudget.allocated_amount,
                                    )}
                                </p>
                            </div>
                            <div className="mt-4 text-center text-slate-500">
                                <p>Edit functionality is coming soon!</p>
                            </div>
                        </div>
                    )}
                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => setShowEditModal(false)}
                        >
                            Close
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </AppLayout>
    );
}
