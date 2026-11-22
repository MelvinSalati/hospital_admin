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
    BarChartBigIcon,
    PiggyBankIcon,
    Building2,
    Layers3Icon,
    Receipt,
    FileText,
    Upload,
} from 'lucide-react';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { toast } from 'react-hot-toast';
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
import CreateBudgetForm from './components/CreateBudgetForm';
import CreateTransactionForm from './components/CreateTransactionForm';

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

interface BudgetTransaction {
    id: number;
    transaction_no: string;
    transaction_code: string | null;
    budget_code: string;
    budget_allocation_id: number | null;
    budget_name?: string;
    transaction_type: string;
    reference_type: string | null;
    reference_id: number | null;
    amount: string;
    balance_before: string;
    balance_after: string;
    description: string | null;
    transaction_date: string;
    item_name: string | null;
    quantity: string | null;
    unit_cost: string | null;
    payee_name: string | null;
    payment_method: string | null;
    reference_number: string | null;
    receipt_path: string | null;
    receipt_original_name: string | null;
    status: 'pending' | 'approved' | 'rejected' | 'void';
    rejection_reason: string | null;
    created_by: number | null;
    recorded_by: number | null;
    approved_by: number | null;
    approved_at: string | null;
    created_at: string;
    updated_at: string;
    creator_name?: string;
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

type TxSubTab = 'petty-cash' | 'annual-budget';

// ============================================
// CONFIG
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

const TX_STATUS_CONFIG: Record<string, { label: string; color: string }> = {
    pending: { label: 'Pending', color: 'bg-amber-50 text-amber-700' },
    approved: { label: 'Approved', color: 'bg-emerald-50 text-emerald-700' },
    rejected: { label: 'Rejected', color: 'bg-red-50 text-red-700' },
    void: { label: 'Void', color: 'bg-slate-100 text-slate-600' },
};

const TX_TYPE_LABELS: Record<string, string> = {
    expense: 'Expense',
    actual: 'Actual',
    reservation: 'Reservation',
    commitment: 'Commitment',
    allocation: 'Allocation',
    refund: 'Refund',
    adjustment: 'Adjustment',
    reversal: 'Reversal',
    transfer_in: 'Transfer In',
    transfer_out: 'Transfer Out',
    reallocation: 'Reallocation',
};

const TX_SUBTAB_CONFIG: Record<
    TxSubTab,
    {
        label: string;
        group: string;
        title: string;
        placeholder: string;
        empty: string;
        icon: JSX.Element;
    }
> = {
    'petty-cash': {
        label: 'Petty Cash Transactions',
        group: 'petty_cash',
        title: 'Petty Cash Transactions',
        placeholder: 'Search txn no, item, payee, description...',
        empty: 'No petty cash transactions found',
        icon: <PiggyBankIcon className="h-4 w-4" />,
    },
    'annual-budget': {
        label: 'Annual Budget Transactions',
        group: 'annual_budget',
        title: 'Annual Budget Transactions',
        placeholder: 'Search txn no, budget, item, payee...',
        empty: 'No annual budget transactions found',
        icon: <Calendar className="h-4 w-4" />,
    },
};

// ============================================
// HELPERS
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

const formatDate = (date: string): string => {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString('en-ZM', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
    });
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

// API returns { expenseTx: [...], transactions: [...] } (a flat array is also tolerated)
const splitTransactions = (
    raw: unknown,
): { expenses: BudgetTransaction[]; others: BudgetTransaction[] } => {
    if (Array.isArray(raw)) {
        const all = raw as BudgetTransaction[];
        return {
            expenses: all.filter((t) => t.transaction_type === 'expense'),
            others: all.filter((t) => t.transaction_type !== 'expense'),
        };
    }
    const obj = (raw ?? {}) as {
        expenseTx?: BudgetTransaction[];
        transactions?: BudgetTransaction[];
    };
    return {
        expenses: obj.expenseTx ?? [],
        others: obj.transactions ?? [],
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
// SIMPLE CHARTS (no external lib required)
// ============================================

function UtilizationDoughnut({
    spent,
    available,
    reserved,
}: {
    spent: number;
    available: number;
    reserved: number;
}) {
    const total = spent + available + reserved || 1;
    const spentPct = (spent / total) * 100;
    const reservedPct = (reserved / total) * 100;
    const availablePct = (available / total) * 100;

    // SVG donut
    const r = 40;
    const c = 2 * Math.PI * r;
    const spentLen = (spentPct / 100) * c;
    const reservedLen = (reservedPct / 100) * c;
    const availableLen = (availablePct / 100) * c;

    return (
        <div className="flex flex-col items-center gap-4 sm:flex-row">
            <svg
                width="120"
                height="120"
                viewBox="0 0 100 100"
                className="-rotate-90"
            >
                <circle
                    cx="50"
                    cy="50"
                    r={r}
                    fill="none"
                    stroke="#e2e8f0"
                    strokeWidth="12"
                />
                <circle
                    cx="50"
                    cy="50"
                    r={r}
                    fill="none"
                    stroke="#10b981"
                    strokeWidth="12"
                    strokeDasharray={`${spentLen} ${c - spentLen}`}
                    strokeDashoffset="0"
                />
                <circle
                    cx="50"
                    cy="50"
                    r={r}
                    fill="none"
                    stroke="#f59e0b"
                    strokeWidth="12"
                    strokeDasharray={`${reservedLen} ${c - reservedLen}`}
                    strokeDashoffset={-spentLen}
                />
                <circle
                    cx="50"
                    cy="50"
                    r={r}
                    fill="none"
                    stroke="#3b82f6"
                    strokeWidth="12"
                    strokeDasharray={`${availableLen} ${c - availableLen}`}
                    strokeDashoffset={-(spentLen + reservedLen)}
                />
            </svg>
            <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                    <span className="h-3 w-3 rounded-full bg-emerald-500" />
                    <span>Spent: {formatCurrency(spent)}</span>
                </div>
                <div className="flex items-center gap-2">
                    <span className="h-3 w-3 rounded-full bg-amber-500" />
                    <span>Reserved: {formatCurrency(reserved)}</span>
                </div>
                <div className="flex items-center gap-2">
                    <span className="h-3 w-3 rounded-full bg-blue-500" />
                    <span>Available: {formatCurrency(available)}</span>
                </div>
            </div>
        </div>
    );
}

function UtilizationBars({ budgets }: { budgets: Budget[] }) {
    const top = budgets
        .filter((b) => b.status === 'active')
        .slice(0, 8)
        .map((b) => ({
            name: b.budget_code,
            pct: parseFloat(b.utilization_percentage) || 0,
            warning: parseFloat(b.warning_threshold) || 70,
            critical: parseFloat(b.critical_threshold) || 85,
        }));

    if (top.length === 0) {
        return (
            <p className="py-8 text-center text-sm text-slate-500">
                No active budgets to chart
            </p>
        );
    }

    return (
        <div className="space-y-3">
            {top.map((b) => {
                const u = utilizationState(b.pct, b.warning, b.critical);
                return (
                    <div key={b.name} className="space-y-1">
                        <div className="flex justify-between text-xs">
                            <span className="font-medium text-slate-700">
                                {b.name}
                            </span>
                            <span className={u.textColor}>
                                {b.pct.toFixed(1)}% · {u.label}
                            </span>
                        </div>
                        <div className="h-2 w-full rounded-full bg-slate-200">
                            <div
                                className={`h-2 rounded-full ${u.barColor}`}
                                style={{
                                    width: `${Math.min(b.pct, 100)}%`,
                                }}
                            />
                        </div>
                    </div>
                );
            })}
        </div>
    );
}

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

    const [activeTab, setActiveTab] = useState('budget-overview');
    const [txSubTab, setTxSubTab] = useState<TxSubTab>('petty-cash');
    const [loading, setLoading] = useState(false);
    const [txLoading, setTxLoading] = useState(false);
    const [budgets, setBudgets] = useState<Budget[]>([]);
    const [transactions, setTransactions] = useState<BudgetTransaction[]>([]);
    const [allTransactions, setAllTransactions] = useState<BudgetTransaction[]>(
        [],
    );
    const [selectedBudget, setSelectedBudget] = useState<Budget | null>(null);
    const [selectedTx, setSelectedTx] = useState<BudgetTransaction | null>(
        null,
    );

    // Filters
    const [searchTerm, setSearchTerm] = useState('');
    const [typeFilter, setTypeFilter] = useState('');
    const [categoryFilter, setCategoryFilter] = useState('');
    const [yearFilter, setYearFilter] = useState('');
    const [txSearch, setTxSearch] = useState('');
    const [txTypeFilter, setTxTypeFilter] = useState('');
    const [txStatusFilter, setTxStatusFilter] = useState('');

    // Drawers / dialogs
    const [showDetailDrawer, setShowDetailDrawer] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [showTxDetail, setShowTxDetail] = useState(false);
    const [showCreateTx, setShowCreateTx] = useState(false);

    const [filterOptions, setFilterOptions] = useState<BudgetFilters>(
        initialFilters ?? { categories: [], years: [], departments: [] },
    );

    const [pagination, setPagination] = useState({
        currentPage: 1,
        pageSize: 10,
        totalItems: 0,
        totalPages: 1,
    });

    const [txPagination, setTxPagination] = useState({
        currentPage: 1,
        pageSize: 10,
        totalItems: 0,
        totalPages: 1,
    });

    // ============================================
    // FETCH BUDGETS
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

    // ============================================
    // FETCH TRANSACTIONS
    // ============================================

    // Overview tab: just the latest few transactions
    const fetchTransactions = useCallback(async () => {
        setTxLoading(true);
        try {
            const response = await Http.get('/admin/budget-transactions', {
                params: { page: 1, page_size: 5 },
            });
            const data = response.data;
            if (data.success) {
                const { expenses, others } = splitTransactions(
                    data.transactions,
                );
                const recent = [...expenses, ...others]
                    .sort((a, b) =>
                        a.transaction_date === b.transaction_date
                            ? b.id - a.id
                            : b.transaction_date.localeCompare(
                                  a.transaction_date,
                              ),
                    )
                    .slice(0, 5);
                setTransactions(recent);
            }
        } catch (error) {
            console.error('Failed to fetch transactions:', error);
            toast.error('Failed to load transactions');
        } finally {
            setTxLoading(false);
        }
    }, []);

    // Transactions tab: load ALL pages, then filter/search/paginate locally
    const fetchAllTransactions = useCallback(async () => {
        setTxLoading(true);
        try {
            const PAGE_SIZE = 100;
            const collected: BudgetTransaction[] = [];
            let expenseRows: BudgetTransaction[] = [];
            let page = 1;
            let lastPage = 1;

            do {
                const response = await Http.get('/admin/budget-transactions', {
                    params: { page, page_size: PAGE_SIZE },
                });
                const data = response.data;
                if (!data.success) break;

                const { expenses, others } = splitTransactions(
                    data.transactions,
                );
                // expenseTx is returned in full on every page: take it once
                if (page === 1) expenseRows = expenses;
                collected.push(...others);
                lastPage = data.last_page ?? 1;
                page += 1;
            } while (page <= lastPage);

            setAllTransactions([...expenseRows, ...collected]);
        } catch (error) {
            console.error('Failed to fetch transactions:', error);
            toast.error('Failed to load transactions');
        } finally {
            setTxLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchBudgets();
    }, [fetchBudgets]);

    useEffect(() => {
        if (activeTab === 'budget-overview') {
            fetchTransactions();
        } else if (activeTab === 'petty-cash') {
            fetchAllTransactions();
        }
    }, [activeTab, fetchTransactions, fetchAllTransactions]);

    // Overview aggregates
    const overview = useMemo(() => {
        const active = budgets.filter((b) => b.status === 'active');
        let allocated = 0;
        let spent = 0;
        let available = 0;
        let reserved = 0;
        active.forEach((b) => {
            allocated += toMinor(b.allocated_amount) / 100;
            spent += toMinor(b.actual_spent) / 100;
            available += toMinor(b.available_amount) / 100;
            reserved += toMinor(b.reserved_amount) / 100;
        });
        return {
            count: active.length,
            allocated,
            spent,
            available,
            reserved,
            utilization:
                allocated > 0 ? ((spent / allocated) * 100).toFixed(1) : '0',
        };
    }, [budgets]);

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
            toast.error(
                error.response?.data?.message || 'Failed to archive budget',
            );
        }
    };

    const handleViewTx = (tx: BudgetTransaction) => {
        setSelectedTx(tx);
        setShowTxDetail(true);
    };

    const handleSwitchTxSubTab = (tab: TxSubTab) => {
        if (tab === txSubTab) return;
        setTxSearch('');
        setTxTypeFilter('');
        setTxStatusFilter('');
        setTxPagination((p) => ({ ...p, currentPage: 1 }));
        setTxSubTab(tab);
    };

    // ============================================
    // COLUMNS — BUDGETS
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

    // ============================================
    // COLUMNS — TRANSACTIONS
    // ============================================

    const txColumns: Column<BudgetTransaction>[] = [
        {
            id: 'transaction_no',
            label: 'Txn No',
            minWidth: 140,
            format: (v) => (
                <span className="font-mono text-xs font-medium text-slate-700">
                    {v}
                </span>
            ),
            sortable: true,
        },
        {
            id: 'transaction_date',
            label: 'Date',
            minWidth: 100,
            format: (v) => (
                <span className="text-sm text-slate-700">{formatDate(v)}</span>
            ),
            sortable: true,
        },
        {
            id: 'budget_code',
            label: 'Budget',
            minWidth: 120,
            format: (v, row) => (
                <div>
                    <div className="font-mono text-xs font-medium">{v}</div>
                    {row.budget_name && (
                        <div className="truncate text-xs text-slate-500">
                            {row.budget_name}
                        </div>
                    )}
                </div>
            ),
            sortable: true,
        },
        {
            id: 'transaction_type',
            label: 'Type',
            minWidth: 110,
            format: (v) => (
                <Badge variant="secondary" className="text-xs">
                    {TX_TYPE_LABELS[v] || v}
                </Badge>
            ),
            sortable: true,
        },
        {
            id: 'item_name',
            label: 'Item / Description',
            minWidth: 180,
            format: (v, row) => (
                <div>
                    <div className="text-sm font-medium text-slate-800">
                        {v || '—'}
                    </div>
                    {row.description && (
                        <div className="max-w-[200px] truncate text-xs text-slate-500">
                            {row.description}
                        </div>
                    )}
                </div>
            ),
        },
        {
            id: 'amount',
            label: 'Amount',
            minWidth: 110,
            format: (v) => (
                <span className="font-semibold text-slate-800">
                    {formatCurrency(v)}
                </span>
            ),
            sortable: true,
        },
        {
            id: 'payment_method',
            label: 'Method',
            minWidth: 100,
            format: (v) => (
                <span className="text-xs text-slate-600 capitalize">
                    {v?.replace('_', ' ') || '—'}
                </span>
            ),
        },
        {
            id: 'status',
            label: 'Status',
            minWidth: 100,
            format: (v) => {
                const cfg = TX_STATUS_CONFIG[v] || TX_STATUS_CONFIG.pending;
                return (
                    <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${cfg.color}`}
                    >
                        {cfg.label}
                    </span>
                );
            },
            sortable: true,
        },
        {
            id: 'receipt_path',
            label: 'Receipt',
            minWidth: 80,
            format: (v, row) =>
                v ? (
                    <a
                        href={`/storage/${v}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs text-cyan-600 hover:underline"
                    >
                        <FileText className="h-3.5 w-3.5" />
                        View
                    </a>
                ) : (
                    <span className="text-xs text-slate-400">—</span>
                ),
        },
    ];

    const txActions: Action<BudgetTransaction>[] = [
        {
            label: 'View',
            icon: <Eye className="h-4 w-4" />,
            color: 'primary',
            onClick: handleViewTx,
        },
    ];

    const typeOptions = Object.entries(BUDGET_TYPE_CONFIG).map(
        ([key, value]) => ({
            value: key,
            label: value.label,
        }),
    );

    const txTypeOptions = Object.entries(TX_TYPE_LABELS).map(
        ([value, label]) => ({ value, label }),
    );

    const txStatusOptions = Object.entries(TX_STATUS_CONFIG).map(
        ([value, cfg]) => ({ value, label: cfg.label }),
    );

    const annualTxTypeOptions = txTypeOptions.filter(
        (o) => o.value !== 'expense',
    );

    // Frontend filtering: sub-tab rule + search + type + status
    const filteredTransactions = useMemo(() => {
        const q = txSearch.trim().toLowerCase();

        return allTransactions.filter((t) => {
            // Petty cash = expense only; Annual budget = everything else
            if (txSubTab === 'petty-cash') {
                if (t.transaction_type !== 'expense') return false;
            } else if (t.transaction_type === 'expense') {
                return false;
            }

            if (txTypeFilter && t.transaction_type !== txTypeFilter)
                return false;
            if (txStatusFilter && t.status !== txStatusFilter) return false;

            if (q) {
                const haystack = [
                    t.transaction_no,
                    t.budget_code,
                    t.budget_name,
                    t.item_name,
                    t.payee_name,
                    t.description,
                    t.reference_number,
                ]
                    .filter(Boolean)
                    .join(' ')
                    .toLowerCase();
                if (!haystack.includes(q)) return false;
            }
            return true;
        });
    }, [allTransactions, txSubTab, txSearch, txTypeFilter, txStatusFilter]);

    const txTotalPages = Math.max(
        1,
        Math.ceil(filteredTransactions.length / txPagination.pageSize),
    );
    const txSafePage = Math.min(txPagination.currentPage, txTotalPages);

    const pagedTransactions = useMemo(() => {
        const start = (txSafePage - 1) * txPagination.pageSize;
        return filteredTransactions.slice(start, start + txPagination.pageSize);
    }, [filteredTransactions, txSafePage, txPagination.pageSize]);

    const currentTxSubTab = TX_SUBTAB_CONFIG[txSubTab];

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

            <div className="min-h-screen bg-blue-50">
                <PageHeader
                    icon={<Wallet className="h-6 w-6" />}
                    title="Budgets"
                    subtitle="Manage budget allocation, expenditure and proof of spend"
                    actions={[
                        {
                            label: 'Overview',
                            onClick: () => setActiveTab('budget-overview'),
                            icon: <BarChartBigIcon />,
                            variant:
                                activeTab === 'budget-overview'
                                    ? 'cyan'
                                    : 'default',
                        },
                        {
                            label: 'Transactions',
                            onClick: () => setActiveTab('petty-cash'),
                            icon: <PiggyBankIcon />,
                            variant:
                                activeTab === 'petty-cash' ? 'cyan' : 'default',
                        },
                        {
                            label: 'Annual Budget',
                            onClick: () => setActiveTab('planned-budget'),
                            icon: <Building2 />,
                            variant:
                                activeTab === 'planned-budget'
                                    ? 'cyan'
                                    : 'default',
                        },
                        {
                            label: 'Allocations',
                            onClick: () => setActiveTab('allocations'),
                            icon: <Layers3Icon />,
                            variant:
                                activeTab === 'allocations'
                                    ? 'cyan'
                                    : 'default',
                        },
                        {
                            label: 'Create Budget',
                            onClick: () => setActiveTab('create-budget'),
                            icon: <Plus />,
                            variant:
                                activeTab === 'create-budget'
                                    ? 'cyan'
                                    : 'default',
                        },
                    ]}
                />

                <div className="m-2 h-full rounded-lg bg-white shadow-sm">
                    {/* ========== OVERVIEW ========== */}
                    {activeTab === 'budget-overview' && (
                        <div className="space-y-6 p-4">
                            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                                <div className="rounded-xl border border-slate-200 bg-gradient-to-br from-blue-50 to-white p-4">
                                    <p className="text-xs font-medium text-blue-600">
                                        Active Budgets
                                    </p>
                                    <p className="mt-1 text-2xl font-bold text-blue-800">
                                        {overview.count}
                                    </p>
                                </div>
                                <div className="rounded-xl border border-slate-200 bg-gradient-to-br from-slate-50 to-white p-4">
                                    <p className="text-xs font-medium text-slate-600">
                                        Total Allocated
                                    </p>
                                    <p className="mt-1 text-2xl font-bold text-slate-800">
                                        {formatCurrency(overview.allocated)}
                                    </p>
                                </div>
                                <div className="rounded-xl border border-slate-200 bg-gradient-to-br from-emerald-50 to-white p-4">
                                    <p className="text-xs font-medium text-emerald-600">
                                        Total Spent
                                    </p>
                                    <p className="mt-1 text-2xl font-bold text-emerald-800">
                                        {formatCurrency(overview.spent)}
                                    </p>
                                </div>
                                <div className="rounded-xl border border-slate-200 bg-gradient-to-br from-cyan-50 to-white p-4">
                                    <p className="text-xs font-medium text-cyan-600">
                                        Overall Utilization
                                    </p>
                                    <p className="mt-1 text-2xl font-bold text-cyan-800">
                                        {overview.utilization}%
                                    </p>
                                </div>
                            </div>

                            <div className="grid gap-6 lg:grid-cols-2">
                                <div className="rounded-xl border border-slate-200 p-5">
                                    <h3 className="mb-4 text-sm font-semibold text-slate-700">
                                        Funds Distribution
                                    </h3>
                                    <UtilizationDoughnut
                                        spent={overview.spent}
                                        available={overview.available}
                                        reserved={overview.reserved}
                                    />
                                </div>
                                <div className="rounded-xl border border-slate-200 p-5">
                                    <h3 className="mb-4 text-sm font-semibold text-slate-700">
                                        Utilization by Budget
                                    </h3>
                                    <UtilizationBars budgets={budgets} />
                                </div>
                            </div>

                            <div className="rounded-xl border border-slate-200 p-5">
                                <div className="mb-3 flex items-center justify-between">
                                    <h3 className="text-sm font-semibold text-slate-700">
                                        Recent Transactions
                                    </h3>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() =>
                                            setActiveTab('petty-cash')
                                        }
                                    >
                                        View all
                                    </Button>
                                </div>
                                <ReusableTable
                                    columns={txColumns}
                                    data={transactions.slice(0, 5)}
                                    actions={txActions}
                                    loading={txLoading}
                                    emptyMessage="No transactions yet"
                                    rowsPerPageOptions={[5]}
                                    defaultRowsPerPage={5}
                                />
                            </div>
                        </div>
                    )}

                    {/* ========== TRANSACTIONS (Petty Cash / Annual Budget) ========== */}
                    {activeTab === 'petty-cash' && (
                        <div className="p-2">
                            {/* Sub-tabs (left) + actions (right) */}
                            <div className="mb-3 flex flex-wrap items-center justify-between gap-2 border-b border-slate-200">
                                <div className="flex flex-wrap gap-1">
                                    {(
                                        Object.keys(
                                            TX_SUBTAB_CONFIG,
                                        ) as TxSubTab[]
                                    ).map((key) => {
                                        const cfg = TX_SUBTAB_CONFIG[key];
                                        const isActive = txSubTab === key;
                                        return (
                                            <button
                                                key={key}
                                                type="button"
                                                onClick={() =>
                                                    handleSwitchTxSubTab(key)
                                                }
                                                className={`-mb-px inline-flex items-center gap-2 border-b-2 px-4 py-2 text-sm font-medium transition-colors ${
                                                    isActive
                                                        ? 'border-cyan-600 text-cyan-700'
                                                        : 'border-transparent text-slate-500 hover:text-slate-700'
                                                }`}
                                            >
                                                {cfg.icon}
                                                {cfg.label}
                                            </button>
                                        );
                                    })}
                                </div>

                                <div className="ml-auto flex items-center gap-2 pb-1">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="font-medium text-cyan-700"
                                        onClick={() => setShowCreateTx(true)}
                                    >
                                        <Plus className="mr-1 h-4 w-4" />
                                        Create Transaction
                                    </Button>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => {
                                            fetchAllTransactions();
                                            toast.success('Refreshed');
                                        }}
                                    >
                                        <RefreshCw className="mr-1 h-4 w-4" />
                                        Refresh
                                    </Button>
                                </div>
                            </div>

                            <ReusableTable
                                key={txSubTab}
                                columns={txColumns}
                                data={pagedTransactions}
                                actions={txActions}
                                loading={txLoading}
                                title={currentTxSubTab.title}
                                rowsPerPageOptions={[5, 10, 15, 20, 50]}
                                defaultRowsPerPage={10}
                                defaultOrderBy="transaction_date"
                                defaultOrder="desc"
                                filterPlaceholder={currentTxSubTab.placeholder}
                                additionalFilters={[
                                    // Petty cash is always 'expense', so no type filter there
                                    ...(txSubTab === 'annual-budget'
                                        ? [
                                              {
                                                  key: 'type',
                                                  label: 'Type',
                                                  options: annualTxTypeOptions,
                                                  value: txTypeFilter,
                                                  onChange: (v: string) => {
                                                      setTxTypeFilter(v);
                                                      setTxPagination((p) => ({
                                                          ...p,
                                                          currentPage: 1,
                                                      }));
                                                  },
                                              },
                                          ]
                                        : []),
                                    {
                                        key: 'status',
                                        label: 'Status',
                                        options: txStatusOptions,
                                        value: txStatusFilter,
                                        onChange: (v: string) => {
                                            setTxStatusFilter(v);
                                            setTxPagination((p) => ({
                                                ...p,
                                                currentPage: 1,
                                            }));
                                        },
                                    },
                                ]}
                                emptyMessage={currentTxSubTab.empty}
                                onSearchChange={(value) => {
                                    setTxSearch(value);
                                    setTxPagination((p) => ({
                                        ...p,
                                        currentPage: 1,
                                    }));
                                }}
                                onPageChange={(page) => {
                                    setTxPagination((p) => ({
                                        ...p,
                                        currentPage: page,
                                    }));
                                }}
                                onPageSizeChange={(size) => {
                                    setTxPagination((p) => ({
                                        ...p,
                                        pageSize: size,
                                        currentPage: 1,
                                    }));
                                }}
                                pagination={{
                                    currentPage: txSafePage,
                                    pageSize: txPagination.pageSize,
                                    totalItems: filteredTransactions.length,
                                    totalPages: txTotalPages,
                                }}
                            />
                        </div>
                    )}

                    {/* ========== PLANNED BUDGET ========== */}
                    {activeTab === 'planned-budget' && (
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
                    )}

                    {/* ========== ALLOCATIONS ========== */}
                    {activeTab === 'allocations' && (
                        <div className="p-2">
                            <ReusableTable
                                columns={[
                                    ...columns.slice(0, 2),
                                    {
                                        id: 'allocated_amount',
                                        label: 'Allocated',
                                        minWidth: 120,
                                        format: (v) => formatCurrency(v),
                                        sortable: true,
                                    },
                                    {
                                        id: 'reserved_amount',
                                        label: 'Reserved',
                                        minWidth: 110,
                                        format: (v) => formatCurrency(v),
                                        sortable: true,
                                    },
                                    {
                                        id: 'committed_amount',
                                        label: 'Committed',
                                        minWidth: 110,
                                        format: (v) => formatCurrency(v),
                                        sortable: true,
                                    },
                                    {
                                        id: 'actual_spent',
                                        label: 'Spent',
                                        minWidth: 110,
                                        format: (v) => formatCurrency(v),
                                        sortable: true,
                                    },
                                    {
                                        id: 'available_amount',
                                        label: 'Available',
                                        minWidth: 120,
                                        format: (v, row) => {
                                            const critical =
                                                parseFloat(
                                                    row.critical_threshold ??
                                                        '85',
                                                ) || 85;
                                            const low = availableIsLow(
                                                v,
                                                row.allocated_amount,
                                                critical,
                                            );
                                            return (
                                                <span
                                                    className={
                                                        low
                                                            ? 'font-semibold text-red-600'
                                                            : 'font-medium text-emerald-600'
                                                    }
                                                >
                                                    {formatCurrency(v)}
                                                </span>
                                            );
                                        },
                                        sortable: true,
                                    },
                                    columns[columns.length - 1], // status
                                ]}
                                data={budgets}
                                actions={actions}
                                loading={loading}
                                title="Budget Allocations"
                                rowsPerPageOptions={[5, 10, 15, 20]}
                                defaultRowsPerPage={10}
                                filterPlaceholder="Search allocations..."
                                emptyMessage="No allocations found"
                                onSearchChange={(value) => {
                                    setSearchTerm(value);
                                    setPagination((p) => ({
                                        ...p,
                                        currentPage: 1,
                                    }));
                                }}
                                onPageChange={(page) =>
                                    setPagination((p) => ({
                                        ...p,
                                        currentPage: page,
                                    }))
                                }
                                onPageSizeChange={(size) =>
                                    setPagination((p) => ({
                                        ...p,
                                        pageSize: size,
                                        currentPage: 1,
                                    }))
                                }
                                pagination={{
                                    currentPage: pagination.currentPage,
                                    pageSize: pagination.pageSize,
                                    totalItems: pagination.totalItems,
                                    totalPages: pagination.totalPages,
                                }}
                            />
                        </div>
                    )}

                    {/* ========== CREATE BUDGET ========== */}
                    {activeTab === 'create-budget' && (
                        <div className="p-2">
                            <CreateBudgetForm
                                categories={filterOptions.categories}
                                departments={filterOptions.departments}
                                years={filterOptions.years}
                                onCreated={() => {
                                    fetchBudgets();
                                    setActiveTab('planned-budget');
                                }}
                                onCancel={() => setActiveTab('planned-budget')}
                            />
                        </div>
                    )}
                </div>
            </div>

            {/* ========== CREATE TRANSACTION SHEET ========== */}
            <Sheet open={showCreateTx} onOpenChange={setShowCreateTx}>
                <SheetContent className="w-full overflow-y-auto sm:max-w-2xl">
                    <SheetHeader className="sr-only">
                        <SheetTitle>Create Transaction</SheetTitle>
                    </SheetHeader>
                    <CreateTransactionForm
                        budgets={budgets.map((b) => ({
                            id: b.id,
                            budget_code: b.budget_code,
                            budget_name: b.budget_name,
                            available_amount: b.available_amount,
                            status: b.status,
                        }))}
                        onCreated={() => {
                            setShowCreateTx(false);
                            fetchAllTransactions();
                            fetchTransactions();
                            fetchBudgets();
                        }}
                        onCancel={() => setShowCreateTx(false)}
                    />
                </SheetContent>
            </Sheet>

            {/* ========== TX DETAIL SHEET ========== */}
            <Sheet open={showTxDetail} onOpenChange={setShowTxDetail}>
                <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
                    <SheetHeader className="border-b">
                        <SheetTitle className="flex items-center gap-2">
                            <Receipt className="h-5 w-5 text-slate-600" />
                            Transaction Details
                        </SheetTitle>
                        <SheetDescription>
                            {selectedTx?.transaction_no}
                        </SheetDescription>
                    </SheetHeader>
                    {selectedTx && (
                        <div className="mt-4 space-y-4 p-4">
                            <div className="flex flex-wrap gap-2">
                                <Badge variant="secondary">
                                    {TX_TYPE_LABELS[
                                        selectedTx.transaction_type
                                    ] || selectedTx.transaction_type}
                                </Badge>
                                <span
                                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                                        TX_STATUS_CONFIG[selectedTx.status]
                                            ?.color
                                    }`}
                                >
                                    {TX_STATUS_CONFIG[selectedTx.status]?.label}
                                </span>
                            </div>

                            <div className="grid grid-cols-2 gap-3 text-sm">
                                <div>
                                    <Label className="text-xs text-slate-500">
                                        Date
                                    </Label>
                                    <p>
                                        {formatDate(
                                            selectedTx.transaction_date,
                                        )}
                                    </p>
                                </div>
                                <div>
                                    <Label className="text-xs text-slate-500">
                                        Amount
                                    </Label>
                                    <p className="font-semibold">
                                        {formatCurrency(selectedTx.amount)}
                                    </p>
                                </div>
                                <div>
                                    <Label className="text-xs text-slate-500">
                                        Budget
                                    </Label>
                                    <p className="font-mono">
                                        {selectedTx.budget_code}
                                    </p>
                                </div>
                                <div>
                                    <Label className="text-xs text-slate-500">
                                        Payment
                                    </Label>
                                    <p className="capitalize">
                                        {selectedTx.payment_method?.replace(
                                            '_',
                                            ' ',
                                        ) || '—'}
                                    </p>
                                </div>
                            </div>

                            {selectedTx.item_name && (
                                <div>
                                    <Label className="text-xs text-slate-500">
                                        Item
                                    </Label>
                                    <p className="text-sm">
                                        {selectedTx.item_name}
                                        {selectedTx.quantity &&
                                            selectedTx.unit_cost && (
                                                <span className="text-slate-500">
                                                    {' '}
                                                    · {
                                                        selectedTx.quantity
                                                    } ×{' '}
                                                    {formatCurrency(
                                                        selectedTx.unit_cost,
                                                    )}
                                                </span>
                                            )}
                                    </p>
                                </div>
                            )}

                            {selectedTx.payee_name && (
                                <div>
                                    <Label className="text-xs text-slate-500">
                                        Payee
                                    </Label>
                                    <p className="text-sm">
                                        {selectedTx.payee_name}
                                    </p>
                                </div>
                            )}

                            {selectedTx.description && (
                                <div>
                                    <Label className="text-xs text-slate-500">
                                        Description
                                    </Label>
                                    <p className="text-sm text-slate-700">
                                        {selectedTx.description}
                                    </p>
                                </div>
                            )}

                            {selectedTx.receipt_path && (
                                <div>
                                    <Label className="text-xs text-slate-500">
                                        Receipt
                                    </Label>
                                    <a
                                        href={`/storage/${selectedTx.receipt_path}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="mt-1 inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm text-cyan-700 hover:bg-cyan-50"
                                    >
                                        <FileText className="h-4 w-4" />
                                        {selectedTx.receipt_original_name ||
                                            'View receipt'}
                                    </a>
                                </div>
                            )}

                            <div className="border-t pt-3 text-xs text-slate-500">
                                <p>
                                    Created:{' '}
                                    {formatDateTime(selectedTx.created_at)}
                                </p>
                                {selectedTx.approved_at && (
                                    <p>
                                        Approved:{' '}
                                        {formatDateTime(selectedTx.approved_at)}
                                    </p>
                                )}
                            </div>
                        </div>
                    )}
                    <div className="mt-4 flex justify-end p-4">
                        <Button
                            variant="outline"
                            onClick={() => setShowTxDetail(false)}
                        >
                            Close
                        </Button>
                    </div>
                </SheetContent>
            </Sheet>

            {/* ========== BUDGET DETAIL DRAWER (kept from original) ========== */}
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
                        <div className="mt-4 space-y-5 p-4 py-2">
                            {/* ... keep your existing detail content exactly as before ... */}
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

                            {/* Utilization, breakdown, revisions, alert, approval — keep as in your original */}
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

            {/* Archive + Edit dialogs — keep your existing ones */}
            <Dialog open={showDeleteModal} onOpenChange={setShowDeleteModal}>
                {/* ... your existing archive dialog ... */}
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
