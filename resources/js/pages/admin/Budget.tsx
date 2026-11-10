import { Head, usePage } from '@inertiajs/react';
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
    Archive,
    DollarSign,
    Calendar,
    Tag,
    Building,
} from 'lucide-react';
import { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-hot-toast';
import Container from '@/components/container';
import PageHeader from '@/components/PageHeader';
import { ReusableTable } from '@/components/ReusableTable';
import type { Column, Action } from '@/components/ReusableTable';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
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
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetDescription,
} from '@/components/ui/sheet';
import { Label } from '@/components/ui/label';
import AppLayout from '@/layouts/app-layout';
import Http from '@/utils/Http';

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
    department_name?: string | null;
    supplier_id: number | null;
    supplier_name?: string | null;
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
    approver_name?: string | null;
    approved_at: string;
    created_at: string;
    updated_at: string;
    deleted_at: string | null;
    revisions?: {
        id: number;
        previous_amount: string;
        new_amount: string;
        reason: string | null;
        created_at: string;
        user_name: string;
    }[];
}

interface FilterOption {
    value: string;
    label: string;
}

interface BudgetFilters {
    categories: FilterOption[];
    years: FilterOption[];
    departments: FilterOption[];
}

interface Props {
    filters?: BudgetFilters;
    permissions?: {
        can_create: boolean;
        can_edit: boolean;
        can_delete: boolean;
        can_approve: boolean;
    };
}

// ============================================
// CONFIGURATION (muted palette, matches Users page)
// ============================================

const BUDGET_TYPE_CONFIG: Record<
    string,
    { label: string; color: string; icon: JSX.Element }
> = {
    annual: {
        label: 'Annual',
        color: 'bg-slate-100 text-slate-700',
        icon: <Calendar className="h-3 w-3" />,
    },
    project: {
        label: 'Project',
        color: 'bg-slate-100 text-slate-700',
        icon: <Tag className="h-3 w-3" />,
    },
    grant: {
        label: 'Grant',
        color: 'bg-slate-100 text-slate-700',
        icon: <DollarSign className="h-3 w-3" />,
    },
    donor: {
        label: 'Donor',
        color: 'bg-slate-100 text-slate-700',
        icon: <TrendingUp className="h-3 w-3" />,
    },
    capital: {
        label: 'Capital',
        color: 'bg-slate-100 text-slate-700',
        icon: <Building className="h-3 w-3" />,
    },
};

const STATUS_CONFIG: Record<
    string,
    { label: string; color: string; icon: JSX.Element }
> = {
    active: {
        label: 'Active',
        color: 'bg-emerald-50 text-emerald-700',
        icon: <CheckCircle className="h-3 w-3" />,
    },
    pending: {
        label: 'Pending',
        color: 'bg-amber-50 text-amber-700',
        icon: <AlertTriangle className="h-3 w-3" />,
    },
    closed: {
        label: 'Closed',
        color: 'bg-slate-100 text-slate-600',
        icon: <XCircle className="h-3 w-3" />,
    },
    archived: {
        label: 'Archived',
        color: 'bg-slate-100 text-slate-500',
        icon: <Archive className="h-3 w-3" />,
    },
    on_hold: {
        label: 'On Hold',
        color: 'bg-orange-50 text-orange-700',
        icon: <AlertTriangle className="h-3 w-3" />,
    },
};

// ============================================
// MONEY HELPERS — integer minor units
// ============================================

const toMinor = (value: string | number | null | undefined): number => {
    if (value === null || value === undefined || value === '') return 0;
    const str = typeof value === 'number' ? value.toFixed(2) : value;
    const neg = str.trim().startsWith('-');
    const clean = str.replace(/[^0-9.]/g, '');
    const [whole, frac = ''] = clean.split('.');
    const cents = (frac + '00').slice(0, 2);
    const minor = parseInt(whole || '0', 10) * 100 + parseInt(cents, 10);
    return neg ? -minor : minor;
};

const formatCurrency = (value: string | number | null | undefined): string => {
    const minor =
        typeof value === 'number' ? Math.round(value * 100) : toMinor(value);
    return new Intl.NumberFormat('en-ZM', {
        style: 'currency',
        currency: 'ZMW',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }).format(minor / 100);
};

const formatDateTime = (date: string): string => {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString('en-ZM', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
};

const utilizationState = (
    utilisationPct: number,
    warning: number,
    critical: number,
): { label: string; textColor: string; barColor: string } => {
    if (Number.isNaN(utilisationPct)) {
        return {
            label: 'Unknown',
            textColor: 'text-slate-500',
            barColor: 'bg-slate-400',
        };
    }
    if (utilisationPct > critical) {
        return {
            label: 'Critical',
            textColor: 'text-red-600',
            barColor: 'bg-red-500',
        };
    }
    if (utilisationPct > warning) {
        return {
            label: 'Warning',
            textColor: 'text-orange-600',
            barColor: 'bg-orange-500',
        };
    }
    return {
        label: 'Good',
        textColor: 'text-emerald-600',
        barColor: 'bg-emerald-500',
    };
};

const availableIsLow = (
    available: string | number,
    allocated: string | number,
    criticalThreshold: number,
): boolean => {
    const allocMinor = toMinor(allocated);
    if (allocMinor <= 0) return false;
    const availMinor = toMinor(available);
    const usedPct = ((allocMinor - availMinor) / allocMinor) * 100;
    return usedPct > criticalThreshold;
};

// ============================================
// MAIN COMPONENT
// ============================================

export default function Budgets({
    filters: initialFilters,
    permissions,
}: Props = {}) {
    const { props } = usePage();
    const auth = (props as any).auth;

    const can = {
        create:
            permissions?.can_create ?? auth?.user?.can_create_budget ?? false,
        edit: permissions?.can_edit ?? auth?.user?.can_edit_budget ?? false,
        delete:
            permissions?.can_delete ?? auth?.user?.can_delete_budget ?? false,
        approve:
            permissions?.can_approve ?? auth?.user?.can_approve_budget ?? false,
    };

    const [loading, setLoading] = useState(false);
    const [budgets, setBudgets] = useState<Budget[]>([]);
    const [selectedBudget, setSelectedBudget] = useState<Budget | null>(null);

    // Filters — no status filter state; backend uses activeTab request param only if you add tabs later
    const [searchTerm, setSearchTerm] = useState('');
    const [typeFilter, setTypeFilter] = useState('');
    const [categoryFilter, setCategoryFilter] = useState('');
    const [yearFilter, setYearFilter] = useState('');

    // Drawer / dialogs
    const [showDetailDrawer, setShowDetailDrawer] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);

    // Filter options
    const [filterOptions, setFilterOptions] = useState<BudgetFilters>(
        initialFilters ?? { categories: [], years: [], departments: [] },
    );

    const [pagination, setPagination] = useState({
        currentPage: 1,
        pageSize: 10,
        totalItems: 0,
        totalPages: 1,
    });

    // ============================================
    // FETCH
    // ============================================

    const fetchBudgets = useCallback(async () => {
        setLoading(true);
        try {
            const params: Record<string, unknown> = {
                page: pagination.currentPage,
                page_size: pagination.pageSize,
            };

            if (searchTerm) params.search = searchTerm;
            if (typeFilter) params.type = typeFilter;
            if (categoryFilter) params.category = categoryFilter;
            if (yearFilter) params.year = yearFilter;

            const response = await Http.get('/admin/all-budgets', { params });
            const data = response.data;

            if (data.success) {
                const budgetData: Budget[] = data.budgets || [];
                setBudgets(budgetData);

                if (data.filters) {
                    setFilterOptions({
                        categories: data.filters.categories ?? [],
                        years: data.filters.years ?? [],
                        departments: data.filters.departments ?? [],
                    });
                }

                setPagination((prev) => ({
                    ...prev,
                    totalItems: data.total ?? budgetData.length,
                    totalPages: data.last_page ?? 1,
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
        yearFilter,
    ]);

    useEffect(() => {
        fetchBudgets();
    }, [fetchBudgets]);

    // ============================================
    // HANDLERS
    // ============================================

    const handleView = (budget: Budget) => {
        setSelectedBudget(budget);
        setShowDetailDrawer(true);
    };

    const handleEdit = (budget: Budget) => {
        if (!can.edit) {
            toast.error('You do not have permission to edit budgets');
            return;
        }
        setSelectedBudget(budget);
        setShowEditModal(true);
    };

    const handleArchive = (budget: Budget) => {
        if (!can.delete) {
            toast.error('You do not have permission to archive budgets');
            return;
        }
        if (
            toMinor(budget.actual_spent) > 0 ||
            toMinor(budget.committed_amount) > 0
        ) {
            toast.error(
                'Cannot archive: this budget has spend or commitments. Close it instead.',
            );
            return;
        }
        setSelectedBudget(budget);
        setShowDeleteModal(true);
    };

    const handleConfirmArchive = async () => {
        if (!selectedBudget) return;
        try {
            const response = await Http.post(
                `/admin/budgets/${selectedBudget.id}/archive`,
            );
            if (response.data.success) {
                toast.success(`Budget ${selectedBudget.budget_code} archived`);
                await fetchBudgets();
                setShowDeleteModal(false);
                setSelectedBudget(null);
            } else {
                throw new Error(response.data.message || 'Archive failed');
            }
        } catch (error: any) {
            console.error('Archive failed:', error);
            toast.error(
                error.response?.data?.message || 'Failed to archive budget',
            );
        }
    };

    const handleExport = () => {
        const params = new URLSearchParams({
            format: 'csv',
            type: typeFilter,
            category: categoryFilter,
            year: yearFilter,
            search: searchTerm,
        });
        window.open(`/admin/budgets/export?${params.toString()}`, '_blank');
        toast.success('Export started');
    };

    const handleRefresh = () => {
        fetchBudgets();
        toast.success('Data refreshed');
    };

    const handleCreate = () => {
        if (!can.create) {
            toast.error('You do not have permission to create budgets');
            return;
        }
        window.location.href = '/admin/budgets/create';
    };

    // ============================================
    // COLUMNS
    // ============================================

    const columns: Column<Budget>[] = [
        {
            id: 'budget_code',
            label: 'Code',
            minWidth: 120,
            format: (value) => (
                <span className="font-mono text-sm font-medium text-slate-700">
                    {value || 'N/A'}
                </span>
            ),
            sortable: true,
        },
        {
            id: 'budget_name',
            label: 'Budget',
            minWidth: 200,
            format: (value, row) => (
                <div>
                    <div className="text-sm font-medium text-slate-800">
                        {value}
                    </div>
                    {row.description && (
                        <div className="max-w-[220px] truncate text-xs text-slate-500">
                            {row.description}
                        </div>
                    )}
                </div>
            ),
            sortable: true,
        },
        // {
        //     id: 'category',
        //     label: 'Category',
        //     minWidth: 140,
        //     format: (value: Category) => {
        //         if (!value)
        //             return <span className="text-sm text-slate-400">N/A</span>;
        //         return (
        //             <span
        //                 className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium"
        //                 style={{
        //                     backgroundColor: `${value.color}18`,
        //                     color: value.color,
        //                     border: `1px solid ${value.color}30`,
        //                 }}
        //             >
        //                 <Tag className="h-3 w-3" />
        //                 {value.name}
        //             </span>
        //         );
        //     },
        // },
        // {
        //     id: 'budget_type',
        //     label: 'Type',
        //     minWidth: 100,
        //     format: (value) => {
        //         const config =
        //             BUDGET_TYPE_CONFIG[value] || BUDGET_TYPE_CONFIG.annual;
        //         return (
        //             <span
        //                 className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${config.color}`}
        //             >
        //                 {config.icon}
        //                 {config.label}
        //             </span>
        //         );
        //     },
        //     sortable: true,
        // },
        {
            id: 'allocated_amount',
            label: 'Allocated',
            minWidth: 120,
            format: (value) => (
                <div className="font-semibold text-slate-800">
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
                <div className="text-slate-700">{formatCurrency(value)}</div>
            ),
            sortable: true,
        },
        {
            id: 'available_amount',
            label: 'Available',
            minWidth: 130,
            format: (value, row) => {
                const critical =
                    parseFloat(row.critical_threshold ?? '85') || 85;
                const low = availableIsLow(
                    value,
                    row.allocated_amount,
                    critical,
                );
                return (
                    <div
                        className={
                            low
                                ? 'font-semibold text-red-600'
                                : 'font-medium text-emerald-600'
                        }
                    >
                        {formatCurrency(value)}
                    </div>
                );
            },
            sortable: true,
        },
        {
            id: 'status',
            label: 'Status',
            minWidth: 220,
            format: (_value, row) => {
                const pct = parseFloat(row.utilization_percentage ?? '0') || 0;
                const warning = parseFloat(row.warning_threshold ?? '70') || 70;
                const critical =
                    parseFloat(row.critical_threshold ?? '85') || 85;
                const u = utilizationState(pct, warning, critical);
                const statusConfig =
                    STATUS_CONFIG[row.status] || STATUS_CONFIG.active;

                return (
                    <div className="space-y-1">
                        <div className="flex items-center gap-2">
                            <span
                                className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${statusConfig.color}`}
                            >
                                {statusConfig.icon}
                                {statusConfig.label}
                            </span>
                            {row.alert_triggered && (
                                <Badge
                                    variant="destructive"
                                    className="text-[10px]"
                                >
                                    Alert
                                </Badge>
                            )}
                        </div>
                        <div className="flex items-center gap-2">
                            <span
                                className={`text-xs font-medium ${u.textColor} min-w-[45px]`}
                            >
                                {pct.toFixed(1)}%
                            </span>
                            <div className="h-1.5 w-16 rounded-full bg-slate-200">
                                <div
                                    className={`h-1.5 rounded-full ${u.barColor}`}
                                    style={{ width: `${Math.min(pct, 100)}%` }}
                                />
                            </div>
                            <span
                                className={`text-[10px] font-medium ${u.textColor}`}
                            >
                                {u.label}
                            </span>
                        </div>
                    </div>
                );
            },
            sortable: true,
        },
        // {
        //     id: 'fiscal_year',
        //     label: 'Year',
        //     minWidth: 80,
        //     format: (value) => (
        //         <span className="rounded bg-slate-100 px-2 py-1 text-xs font-medium">
        //             {value || 'N/A'}
        //         </span>
        //     ),
        //     sortable: true,
        // },
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
            show: (row) =>
                can.edit &&
                (row.status === 'active' || row.status === 'pending'),
        },
        {
            label: 'Archive',
            icon: <Archive className="h-4 w-4" />,
            color: 'error',
            onClick: handleArchive,
            show: (row) =>
                can.delete &&
                row.status !== 'active' &&
                row.status !== 'archived' &&
                toMinor(row.actual_spent) === 0 &&
                toMinor(row.committed_amount) === 0,
        },
    ];

    const typeOptions = Object.entries(BUDGET_TYPE_CONFIG).map(
        ([key, value]) => ({
            value: key,
            label: value.label,
        }),
    );

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

            <div className="min-h-screen bg-slate-100 p-2">
                <Container>
                    <PageHeader
                        icon={<Wallet className="h-6 w-6" />}
                        title="Budgets"
                        subtitle="Manage budget allocation and expenditure"
                    >
                        <div className="flex items-center gap-2 self-center">
                            {can.create && (
                                <Button size="sm" onClick={handleCreate}>
                                    <Plus className="mr-1.5 h-3.5 w-3.5" />
                                    Create Budget
                                </Button>
                            )}
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={handleExport}
                            >
                                <Download className="mr-1.5 h-3.5 w-3.5" />
                                Export
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={handleRefresh}
                                disabled={loading}
                            >
                                <RefreshCw
                                    className={`mr-1.5 h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`}
                                />
                                Refresh
                            </Button>
                        </div>
                    </PageHeader>

                    {/* Table — only content under the header */}
                    <div className="mt-6">
                        <ReusableTable
                            columns={columns}
                            data={budgets}
                            actions={actions}
                            loading={loading}
                            title="Budget List"
                            rowsPerPageOptions={[4, 8, 12, 14, 20]}
                            defaultRowsPerPage={10}
                            defaultOrderBy="budget_code"
                            defaultOrder="asc"
                            filterPlaceholder="Search by code, name, description..."
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
                                    options: filterOptions.categories,
                                    value: categoryFilter,
                                    onChange: setCategoryFilter,
                                },
                                {
                                    key: 'year',
                                    label: 'Fiscal Year',
                                    options: filterOptions.years,
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
            {/* DETAIL DRAWER */}
            {/* ========================================== */}
            <Sheet open={showDetailDrawer} onOpenChange={setShowDetailDrawer}>
                <SheetContent className="w-full overflow-y-auto sm:max-w-xl">
                    <SheetHeader className="border-b">
                        <SheetTitle className="flex items-center gap-2">
                            <Wallet className="h-5 w-5 text-slate-600" />
                            Budget Details
                        </SheetTitle>
                        <SheetDescription>
                            {selectedBudget?.budget_code} —{' '}
                            {selectedBudget?.budget_name}
                        </SheetDescription>
                    </SheetHeader>

                    {selectedBudget && (
                        <div className="space-y-5p mt-4 p-4 py-2">
                            <div className="flex flex-wrap items-center gap-2">
                                <span
                                    className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${STATUS_CONFIG[selectedBudget.status]?.color ?? ''}`}
                                >
                                    {STATUS_CONFIG[selectedBudget.status]?.icon}
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
                                <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
                                    {
                                        BUDGET_TYPE_CONFIG[
                                            selectedBudget.budget_type
                                        ]?.label
                                    }
                                </span>
                                <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
                                    FY {selectedBudget.fiscal_year}
                                </span>
                            </div>

                            {selectedBudget.category && (
                                <div>
                                    <Label className="text-xs text-slate-500">
                                        Category
                                    </Label>
                                    <p className="text-sm font-medium text-slate-800">
                                        {selectedBudget.category.name} (
                                        {selectedBudget.category.code})
                                    </p>
                                </div>
                            )}

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <Label className="text-xs text-slate-500">
                                        Department
                                    </Label>
                                    <p className="text-sm font-medium text-slate-800">
                                        {selectedBudget.department_name ??
                                            'General'}
                                    </p>
                                </div>
                                <div>
                                    <Label className="text-xs text-slate-500">
                                        Supplier
                                    </Label>
                                    <p className="text-sm font-medium text-slate-800">
                                        {selectedBudget.supplier_name ?? 'N/A'}
                                    </p>
                                </div>
                            </div>

                            <div>
                                <Label className="text-xs text-slate-500">
                                    Financial Summary
                                </Label>
                                <div className="mt-2 grid grid-cols-3 gap-3">
                                    <div className="rounded-lg bg-blue-50 p-3">
                                        <p className="text-xs text-blue-600">
                                            Allocated
                                        </p>
                                        <p className="text-lg font-bold text-blue-700">
                                            {formatCurrency(
                                                selectedBudget.allocated_amount,
                                            )}
                                        </p>
                                    </div>
                                    <div className="rounded-lg bg-emerald-50 p-3">
                                        <p className="text-xs text-emerald-600">
                                            Spent
                                        </p>
                                        <p className="text-lg font-bold text-emerald-700">
                                            {formatCurrency(
                                                selectedBudget.actual_spent,
                                            )}
                                        </p>
                                    </div>
                                    <div className="rounded-lg bg-slate-50 p-3">
                                        <p className="text-xs text-slate-600">
                                            Available
                                        </p>
                                        <p className="text-lg font-bold text-slate-700">
                                            {formatCurrency(
                                                selectedBudget.available_amount,
                                            )}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div>
                                <div className="flex items-center justify-between">
                                    <Label className="text-xs text-slate-500">
                                        Utilization
                                    </Label>
                                    <span
                                        className={`text-sm font-medium ${
                                            utilizationState(
                                                parseFloat(
                                                    selectedBudget.utilization_percentage,
                                                ),
                                                parseFloat(
                                                    selectedBudget.warning_threshold,
                                                ),
                                                parseFloat(
                                                    selectedBudget.critical_threshold,
                                                ),
                                            ).textColor
                                        }`}
                                    >
                                        {parseFloat(
                                            selectedBudget.utilization_percentage,
                                        ).toFixed(1)}
                                        %
                                    </span>
                                </div>
                                <div className="mt-1 h-3 w-full rounded-full bg-slate-200">
                                    <div
                                        className={`h-3 rounded-full ${
                                            utilizationState(
                                                parseFloat(
                                                    selectedBudget.utilization_percentage,
                                                ),
                                                parseFloat(
                                                    selectedBudget.warning_threshold,
                                                ),
                                                parseFloat(
                                                    selectedBudget.critical_threshold,
                                                ),
                                            ).barColor
                                        }`}
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

                            <div>
                                <Label className="text-xs text-slate-500">
                                    Budget Breakdown
                                </Label>
                                <div className="mt-2 grid grid-cols-2 gap-2 text-sm">
                                    <div className="rounded border border-slate-200 p-2">
                                        <p className="text-xs text-slate-500">
                                            Original
                                        </p>
                                        <p className="font-medium">
                                            {formatCurrency(
                                                selectedBudget.original_amount,
                                            )}
                                        </p>
                                    </div>
                                    <div className="rounded border border-slate-200 p-2">
                                        <p className="text-xs text-slate-500">
                                            Revised
                                        </p>
                                        <p className="font-medium">
                                            {selectedBudget.revised_amount
                                                ? formatCurrency(
                                                      selectedBudget.revised_amount,
                                                  )
                                                : 'Not revised'}
                                        </p>
                                    </div>
                                    <div className="rounded border border-slate-200 p-2">
                                        <p className="text-xs text-slate-500">
                                            Reserved
                                        </p>
                                        <p className="font-medium">
                                            {formatCurrency(
                                                selectedBudget.reserved_amount,
                                            )}
                                        </p>
                                    </div>
                                    <div className="rounded border border-slate-200 p-2">
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

                            {selectedBudget.revisions &&
                                selectedBudget.revisions.length > 0 && (
                                    <div>
                                        <Label className="text-xs text-slate-500">
                                            Revision History
                                        </Label>
                                        <ul className="mt-2 space-y-2">
                                            {selectedBudget.revisions.map(
                                                (r) => (
                                                    <li
                                                        key={r.id}
                                                        className="rounded border border-slate-200 p-2 text-xs"
                                                    >
                                                        <p className="font-medium text-slate-700">
                                                            {formatCurrency(
                                                                r.previous_amount,
                                                            )}{' '}
                                                            →{' '}
                                                            {formatCurrency(
                                                                r.new_amount,
                                                            )}
                                                        </p>
                                                        <p className="text-slate-500">
                                                            {r.reason ??
                                                                'No reason given'}{' '}
                                                            · {r.user_name} ·{' '}
                                                            {formatDateTime(
                                                                r.created_at,
                                                            )}
                                                        </p>
                                                    </li>
                                                ),
                                            )}
                                        </ul>
                                    </div>
                                )}

                            {selectedBudget.alert_triggered && (
                                <Alert variant="destructive">
                                    <AlertTriangle className="h-4 w-4" />
                                    <AlertTitle>Alert Triggered</AlertTitle>
                                    <AlertDescription>
                                        {selectedBudget.alert_message ??
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

                            <div>
                                <Label className="text-xs text-slate-500">
                                    Approval
                                </Label>
                                <div className="mt-1 space-y-0.5 text-sm text-slate-600">
                                    <p>
                                        Approved by:{' '}
                                        {selectedBudget.approver_name ?? 'N/A'}
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

                            {selectedBudget.description && (
                                <div>
                                    <Label className="text-xs text-slate-500">
                                        Description
                                    </Label>
                                    <p className="text-sm text-slate-700">
                                        {selectedBudget.description}
                                    </p>
                                </div>
                            )}
                        </div>
                    )}

                    <div className="mt-6 flex justify-end">
                        <Button
                            variant="outline"
                            onClick={() => setShowDetailDrawer(false)}
                        >
                            Close
                        </Button>
                    </div>
                </SheetContent>
            </Sheet>

            {/* ========================================== */}
            {/* ARCHIVE CONFIRMATION */}
            {/* ========================================== */}
            <Dialog open={showDeleteModal} onOpenChange={setShowDeleteModal}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Archive className="h-5 w-5 text-red-600" />
                            Archive Budget
                        </DialogTitle>
                        <DialogDescription>
                            This soft-deletes the budget. It is blocked when
                            transactions exist and is audit-logged.
                        </DialogDescription>
                    </DialogHeader>
                    {selectedBudget && (
                        <div className="rounded-lg bg-red-50 p-4">
                            <p className="text-sm font-medium text-red-800">
                                <strong>Code:</strong>{' '}
                                {selectedBudget.budget_code}
                            </p>
                            <p className="text-sm text-red-700">
                                <strong>Name:</strong>{' '}
                                {selectedBudget.budget_name}
                            </p>
                            <p className="text-sm text-red-700">
                                <strong>Status:</strong>{' '}
                                {STATUS_CONFIG[selectedBudget.status]?.label}
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
                            onClick={handleConfirmArchive}
                            className="bg-red-600 hover:bg-red-700"
                        >
                            <Archive className="mr-2 h-4 w-4" />
                            Archive
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* ========================================== */}
            {/* EDIT MODAL */}
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
                            <div className="rounded-lg bg-yellow-50 p-4">
                                <p className="text-sm font-medium text-yellow-800">
                                    <strong>Code:</strong>{' '}
                                    {selectedBudget.budget_code}
                                </p>
                                <p className="text-sm text-yellow-700">
                                    <strong>Name:</strong>{' '}
                                    {selectedBudget.budget_name}
                                </p>
                                <p className="text-sm text-yellow-700">
                                    <strong>Allocated:</strong>{' '}
                                    {formatCurrency(
                                        selectedBudget.allocated_amount,
                                    )}
                                </p>
                            </div>
                            <div className="mt-4 text-center text-slate-500">
                                <p>Edit form coming soon.</p>
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
