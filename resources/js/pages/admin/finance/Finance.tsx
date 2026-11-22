import { Head, usePage } from '@inertiajs/react';
import {
    BarChartBigIcon,
    Ban,
    Banknote,
    CalendarDays,
    CheckCircle,
    ChevronDown,
    Coins,
    Eye,
    FileText,
    Plus,
    Receipt,
    RefreshCw,
    TrendingDown,
    TrendingUp,
    Wallet,
    XCircle,
} from 'lucide-react';
import type { ReactNode } from 'react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'react-hot-toast';
import PageHeader from '@/components/PageHeader';
import { ReusableTable } from '@/components/ReusableTable';
import type { Column, Action } from '@/components/ReusableTable';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Label } from '@/components/ui/label';
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
} from '@/components/ui/sheet';
import AppLayout from '@/layouts/app-layout';
import Http from '@/utils/Http';
import CreateExpenseForm from './../components/CreateExpenseForm';
import CreateRevenueForm from './../components/CreateRevenueForm';

// ============================================
// TYPES
// ============================================

interface FilterOption {
    value: string;
    label: string;
}

interface FinanceFilters {
    revenue_categories: FilterOption[];
    expense_categories: FilterOption[];
}

interface Props {
    filters?: FinanceFilters;
    permissions?: {
        can_create: boolean;
        can_approve: boolean;
        can_pay: boolean;
        can_cancel: boolean;
    };
}

interface Collection {
    id: number;
    invoice_id: number | string | null;
    amount: string;
    payment_method: string | null;
    reference: string | null;
    collected_at: string | null;
}

interface Revenue {
    id: number;
    revenue_no: string;
    revenue_date: string;
    category_id: number;
    category_name: string | null;
    source_type: string;
    payer_name: string | null;
    amount: string;
    payment_method: string | null;
    reference_number: string | null;
    description: string | null;
    receipt_path: string | null;
    receipt_original_name: string | null;
    status: 'pending' | 'received' | 'cancelled';
    creator_name: string | null;
    canceller_name: string | null;
    cancelled_at: string | null;
    cancellation_reason: string | null;
    created_at: string;
}

interface Expense {
    id: number;
    expense_no: string;
    expense_date: string;
    category_id: number;
    category_name: string | null;
    budget_code: string | null;
    payee_name: string;
    amount: string;
    payment_method: string | null;
    reference_number: string | null;
    description: string | null;
    receipt_path: string | null;
    receipt_original_name: string | null;
    status: 'pending' | 'approved' | 'paid' | 'rejected' | 'void';
    rejection_reason: string | null;
    creator_name: string | null;
    approver_name: string | null;
    approved_at: string | null;
    payer_name: string | null;
    paid_at: string | null;
    created_at: string;
}

interface TrendPoint {
    month: string;
    collections: number;
    revenue: number;
    income: number;
    expenses: number;
}

interface Overview {
    collections_total: number;
    collections_count: number;
    revenue_total: number;
    total_income: number;
    expenses_total: number;
    pending_expenses: number;
    pending_expense_count: number;
    net_position: number;
    collections_by_method: { method: string; total: number; count: number }[];
    revenue_by_category: { category: string; total: number }[];
    expenses_by_category: { category: string; total: number }[];
    trend: TrendPoint[];
}

type TabId = 'overview' | 'collections' | 'revenue' | 'expenses';
type ActionMode = 'reject' | 'void' | 'cancel' | null;

// ============================================
// CONFIG
// ============================================

const REVENUE_STATUS: Record<string, { label: string; color: string }> = {
    pending: { label: 'Pending', color: 'bg-amber-50 text-amber-700' },
    received: { label: 'Received', color: 'bg-emerald-50 text-emerald-700' },
    cancelled: { label: 'Cancelled', color: 'bg-slate-100 text-slate-600' },
};

const EXPENSE_STATUS: Record<string, { label: string; color: string }> = {
    pending: { label: 'Pending', color: 'bg-amber-50 text-amber-700' },
    approved: { label: 'Approved', color: 'bg-blue-50 text-blue-700' },
    paid: { label: 'Paid', color: 'bg-emerald-50 text-emerald-700' },
    rejected: { label: 'Rejected', color: 'bg-red-50 text-red-700' },
    void: { label: 'Void', color: 'bg-slate-100 text-slate-600' },
};

const SOURCE_LABELS: Record<string, string> = {
    grant: 'Grant',
    donation: 'Donation',
    insurance_claim: 'Insurance Claim',
    service_fee: 'Service Fee',
    other: 'Other',
};

const toOptions = (map: Record<string, { label: string }>): FilterOption[] =>
    Object.entries(map).map(([value, cfg]) => ({ value, label: cfg.label }));

// ============================================
// HELPERS
// ============================================

const formatCurrency = (value: string | number | null | undefined): string => {
    const num = Number(value ?? 0);
    return new Intl.NumberFormat('en-ZM', {
        style: 'currency',
        currency: 'ZMW',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }).format(Number.isFinite(num) ? num : 0);
};

const formatCompact = (value: number): string => {
    const num = Number.isFinite(value) ? value : 0;
    return new Intl.NumberFormat('en-ZM', {
        notation: 'compact',
        maximumFractionDigits: 1,
    }).format(num);
};

const formatDate = (date: string | null | undefined): string => {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString('en-ZM', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
    });
};

const formatDateTime = (date: string | null | undefined): string => {
    if (!date) return 'N/A';
    return new Date(date).toLocaleString('en-ZM', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
};

const prettify = (value: string | null | undefined): string =>
    value ? value.replace(/_/g, ' ') : '—';

const isoDate = (d: Date): string => {
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

const cleanParams = (obj: Record<string, string>): Record<string, string> =>
    Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== ''));

const cx = (...classes: Array<string | false | null | undefined>) =>
    classes.filter(Boolean).join(' ');

// ============================================
// SERVER-PAGINATED LIST HOOK
// ============================================

function usePagedList<T>(
    url: string,
    rowsKey: string,
    enabled: boolean,
    params: Record<string, string>,
) {
    const [rows, setRows] = useState<T[]>([]);
    const [loading, setLoading] = useState(false);
    const [search, setSearch] = useState('');
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);
    const [totals, setTotals] = useState({ totalItems: 0, totalPages: 1 });
    const [meta, setMeta] = useState<any>({});
    const paramsKey = JSON.stringify(params);

    // Any filter change goes back to page 1
    useEffect(() => {
        setPage(1);
    }, [paramsKey]);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const query: Record<string, unknown> = {
                page,
                page_size: pageSize,
                ...JSON.parse(paramsKey),
            };
            if (search) query.search = search;

            const response = await Http.get(url, { params: query });
            const data = response.data;

            if (data.success) {
                setRows(data[rowsKey] || []);
                setMeta(data);
                setTotals({
                    totalItems: data.total ?? 0,
                    totalPages: data.last_page ?? 1,
                });
            }
        } catch (error) {
            console.error(`Failed to load ${rowsKey}:`, error);
            toast.error('Failed to load data');
        } finally {
            setLoading(false);
        }
    }, [url, rowsKey, page, pageSize, search, paramsKey]);

    useEffect(() => {
        if (enabled) load();
    }, [enabled, load]);

    return {
        rows,
        loading,
        meta,
        reload: load,
        pagination: { currentPage: page, pageSize, ...totals },
        onSearchChange: (value: string) => {
            setSearch(value);
            setPage(1);
        },
        onPageChange: (p: number) => setPage(p),
        onPageSizeChange: (size: number) => {
            setPageSize(size);
            setPage(1);
        },
    };
}

// ============================================
// SMALL VISUAL COMPONENTS (no chart library)
// ============================================

type Tone = 'blue' | 'emerald' | 'cyan' | 'red' | 'amber';

const CHART_COLORS = [
    '#2563eb',
    '#16a34a',
    '#d97706',
    '#9333ea',
    '#0891b2',
] as const;
const OTHER_COLOR = '#94a3b8';
const MAX_SLICES = 5;

const STAT_TONES: Record<Tone, string> = {
    blue: 'bg-blue-100',
    emerald: 'bg-green-100',
    cyan: 'bg-cyan-100',
    red: 'bg-red-100',
    amber: 'bg-yellow-100',
};

interface KpiItem {
    label: string;
    value: string;
    hint?: string;
    tone: Tone;
    negative?: boolean;
    icon: ReactNode;
}

function StatCard({ label, value, hint, tone, negative, icon }: KpiItem) {
    return (
        <div
            className={cx(
                'flex items-center justify-between gap-2 rounded-lg px-3 py-2.5 shadow-sm',
                STAT_TONES[tone],
            )}
        >
            <div className="min-w-0">
                <p className="truncate text-xs font-medium text-slate-600">
                    {label}
                </p>
                <p
                    className={cx(
                        'truncate text-[clamp(1rem,1.5vw,1.35rem)] leading-tight font-semibold tabular-nums',
                        negative ? 'text-red-700' : 'text-slate-900',
                    )}
                    title={value}
                >
                    {value}
                </p>
                {hint && (
                    <p className="truncate text-[11px] text-slate-500">
                        {hint}
                    </p>
                )}
            </div>
            <div className="shrink-0 rounded-md bg-white/60 p-1.5 text-slate-700">
                {icon}
            </div>
        </div>
    );
}

/** White rounded card used for every chart section. */
function Panel({
    title,
    subtitle,
    icon,
    right,
    className = '',
    children,
}: {
    title: string;
    subtitle?: string;
    icon?: ReactNode;
    right?: ReactNode;
    className?: string;
    children: ReactNode;
}) {
    return (
        <section className={cx('rounded-xl bg-white p-4 shadow-sm', className)}>
            <header className="mb-3 flex items-center justify-between gap-2">
                <div className="flex min-w-0 items-center gap-2.5">
                    {icon && (
                        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-slate-100 text-slate-600">
                            {icon}
                        </span>
                    )}
                    <div className="min-w-0">
                        <h3 className="truncate text-sm leading-tight font-semibold text-slate-800">
                            {title}
                        </h3>
                        {subtitle && (
                            <p className="truncate text-[11px] text-slate-500">
                                {subtitle}
                            </p>
                        )}
                    </div>
                </div>
                {right}
            </header>
            {children}
        </section>
    );
}

// ---------- Doughnut (SVG) ----------

interface Slice {
    name: string;
    value: number;
    color: string;
}

const RADIUS = 40;
const CIRC = 2 * Math.PI * RADIUS;

/** Sorts, keeps the top slices and groups the rest into "Other". */
const buildSlices = (items: { label: string; value: number }[]): Slice[] => {
    const sorted = [...items]
        .filter((i) => i.value > 0)
        .sort((a, b) => b.value - a.value);
    const top = sorted.slice(0, MAX_SLICES);
    const rest = sorted.slice(MAX_SLICES);

    const slices: Slice[] = top.map((i, idx) => ({
        name: i.label,
        value: i.value,
        color: CHART_COLORS[idx % CHART_COLORS.length],
    }));

    if (rest.length > 0) {
        slices.push({
            name: 'Other',
            value: rest.reduce((sum, i) => sum + i.value, 0),
            color: OTHER_COLOR,
        });
    }
    return slices;
};

function Doughnut({
    data,
    activeIndex,
    onActiveChange,
}: {
    data: Slice[];
    activeIndex: number | null;
    onActiveChange: (i: number | null) => void;
}) {
    const total = data.reduce((sum, d) => sum + d.value, 0);

    let offset = 0;
    const segments = data.map((d) => {
        const length = total ? (d.value / total) * CIRC : 0;
        const seg = { ...d, length, offset };
        offset += length;
        return seg;
    });

    const active = activeIndex === null ? null : segments[activeIndex];
    const caption = active ? active.name : 'ZMW total';

    return (
        <svg
            viewBox="0 0 100 100"
            className="aspect-square w-full max-w-[9.5rem]"
            role="group"
            aria-label={`Breakdown, ${formatCompact(total)} in total`}
        >
            <g transform="rotate(-90 50 50)">
                <circle
                    cx="50"
                    cy="50"
                    r={RADIUS}
                    fill="none"
                    stroke="#e2e8f0"
                    strokeWidth="14"
                />
                {segments.map((s, i) => (
                    <circle
                        key={s.name}
                        cx="50"
                        cy="50"
                        r={RADIUS}
                        fill="none"
                        stroke={s.color}
                        strokeWidth={activeIndex === i ? 16 : 14}
                        strokeDasharray={`${s.length} ${CIRC - s.length}`}
                        strokeDashoffset={-s.offset}
                        opacity={
                            activeIndex === null || activeIndex === i ? 1 : 0.35
                        }
                        tabIndex={0}
                        aria-label={`${s.name}: ${formatCurrency(s.value)}`}
                        className="cursor-pointer transition-[opacity,stroke-width] duration-150 outline-none"
                        onMouseEnter={() => onActiveChange(i)}
                        onMouseLeave={() => onActiveChange(null)}
                        onFocus={() => onActiveChange(i)}
                        onBlur={() => onActiveChange(null)}
                    />
                ))}
            </g>
            <text
                x="50"
                y="49"
                textAnchor="middle"
                className="pointer-events-none fill-slate-900 text-[13px] font-semibold"
            >
                {formatCompact(active ? active.value : total)}
            </text>
            <text
                x="50"
                y="60"
                textAnchor="middle"
                className={cx(
                    'pointer-events-none fill-slate-500 capitalize',
                    caption.length > 14 ? 'text-[5px]' : 'text-[6.5px]',
                )}
            >
                {caption}
            </text>
        </svg>
    );
}

// ---------- Breakdown card: doughnut + coloured progress list ----------

function BreakdownCard({
    title,
    subtitle,
    icon,
    items,
    emptyText,
    className,
}: {
    title: string;
    subtitle?: string;
    icon: ReactNode;
    items: { label: string; value: number; extra?: string }[];
    emptyText: string;
    className?: string;
}) {
    const [activeIndex, setActiveIndex] = useState<number | null>(null);

    const extras = new Map(items.map((i) => [i.label, i.extra]));
    const slices = useMemo(() => buildSlices(items), [items]);
    const total = slices.reduce((sum, s) => sum + s.value, 0);
    const max = Math.max(...slices.map((s) => s.value), 1);

    return (
        <Panel
            title={title}
            subtitle={subtitle}
            icon={icon}
            className={className}
            right={
                <span className="text-sm font-semibold text-slate-900 tabular-nums">
                    {formatCurrency(total)}
                </span>
            }
        >
            {slices.length === 0 ? (
                <p className="py-10 text-center text-xs text-slate-500">
                    {emptyText}
                </p>
            ) : (
                <div className="grid items-center gap-4 sm:grid-cols-[auto_1fr]">
                    <div className="flex justify-center">
                        <Doughnut
                            data={slices}
                            activeIndex={activeIndex}
                            onActiveChange={setActiveIndex}
                        />
                    </div>

                    <ul className="space-y-2.5">
                        {slices.map((s, i) => (
                            <li
                                key={s.name}
                                onMouseEnter={() => setActiveIndex(i)}
                                onMouseLeave={() => setActiveIndex(null)}
                                className={cx(
                                    'rounded-md px-1.5 py-0.5 transition-colors',
                                    activeIndex === i && 'bg-slate-50',
                                )}
                            >
                                <div className="mb-1 flex items-center justify-between gap-2 text-xs">
                                    <span className="flex min-w-0 items-center gap-2 font-medium text-slate-700 capitalize">
                                        <span
                                            className="h-2 w-2 shrink-0 rounded-full"
                                            style={{
                                                backgroundColor: s.color,
                                            }}
                                        />
                                        <span className="truncate">
                                            {s.name}
                                            {extras.get(s.name) && (
                                                <span className="ml-1 font-normal text-slate-400">
                                                    {extras.get(s.name)}
                                                </span>
                                            )}
                                        </span>
                                    </span>
                                    <span className="shrink-0 text-slate-500 tabular-nums">
                                        {formatCurrency(s.value)}
                                        <span className="ml-1.5 inline-block w-8 text-right text-[10px] text-slate-400">
                                            {total
                                                ? Math.round(
                                                      (s.value / total) * 100,
                                                  )
                                                : 0}
                                            %
                                        </span>
                                    </span>
                                </div>
                                <div className="h-2 overflow-hidden rounded-full bg-slate-200">
                                    <div
                                        className="h-full rounded-full transition-[width] duration-500"
                                        style={{
                                            width: `${(s.value / max) * 100}%`,
                                            backgroundColor: s.color,
                                        }}
                                    />
                                </div>
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </Panel>
    );
}

// ---------- Trend bars ----------

function TrendBars({ trend }: { trend: TrendPoint[] }) {
    const max = Math.max(...trend.flatMap((t) => [t.income, t.expenses]), 1);
    const ticks = [1, 0.5, 0];

    return (
        <div className="flex gap-2">
            <div className="flex h-36 flex-col justify-between text-right text-[10px] text-slate-400 tabular-nums">
                {ticks.map((t) => (
                    <span key={t}>{formatCompact(max * t)}</span>
                ))}
            </div>

            <div className="min-w-0 flex-1">
                <div className="relative h-36">
                    <div className="pointer-events-none absolute inset-0 flex flex-col justify-between">
                        {ticks.map((t) => (
                            <div
                                key={t}
                                className="border-t border-dashed border-slate-200"
                            />
                        ))}
                    </div>

                    <div className="relative flex h-full items-end gap-2">
                        {trend.map((t) => (
                            <div
                                key={t.month}
                                className="flex h-full flex-1 items-end justify-center gap-1"
                                title={`${t.month}: income ${formatCurrency(t.income)}, expenses ${formatCurrency(t.expenses)}`}
                            >
                                <div
                                    className="w-full max-w-[20px] rounded-t-md bg-green-500"
                                    style={{
                                        height: `${(t.income / max) * 100}%`,
                                    }}
                                />
                                <div
                                    className="w-full max-w-[20px] rounded-t-md bg-red-400"
                                    style={{
                                        height: `${(t.expenses / max) * 100}%`,
                                    }}
                                />
                            </div>
                        ))}
                    </div>
                </div>

                <div className="mt-1 flex gap-2">
                    {trend.map((t) => (
                        <div
                            key={t.month}
                            className="flex-1 text-center text-[10px] text-slate-500"
                        >
                            {t.month}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

function TrendLegend() {
    return (
        <div className="flex items-center gap-3 text-[11px] text-slate-500">
            <span className="flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-green-500" />
                Income
            </span>
            <span className="flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-red-400" />
                Expenses
            </span>
        </div>
    );
}

function StatusPill({
    status,
    config,
}: {
    status: string;
    config: Record<string, { label: string; color: string }>;
}) {
    const cfg = config[status] ?? {
        label: status,
        color: 'bg-slate-100 text-slate-600',
    };
    return (
        <span
            className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${cfg.color}`}
        >
            {cfg.label}
        </span>
    );
}

function ReceiptLink({
    path,
    name,
}: {
    path: string | null;
    name?: string | null;
}) {
    if (!path) return <span className="text-xs text-slate-400">—</span>;
    return (
        <a
            href={`/storage/${path}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs text-cyan-600 hover:underline"
        >
            <FileText className="h-3.5 w-3.5" />
            {name || 'View'}
        </a>
    );
}

// ============================================
// MAIN COMPONENT
// ============================================

export default function Finance({ filters, permissions }: Props = {}) {
    const { props } = usePage();
    const auth = (props as any).auth;

    const can = {
        create:
            permissions?.can_create ?? auth?.user?.can_create_finance ?? false,
        approve:
            permissions?.can_approve ??
            auth?.user?.can_approve_finance ??
            false,
        pay: permissions?.can_pay ?? auth?.user?.can_pay_finance ?? false,
        cancel:
            permissions?.can_cancel ?? auth?.user?.can_cancel_finance ?? false,
    };

    const revenueCategories = filters?.revenue_categories ?? [
        { id: 1, name: 'Grants', code: 'REV-GRANT' },
        { id: 2, name: 'Donations', code: 'REV-DONATION' },
        { id: 3, name: 'Insurance Claims', code: 'REV-INSURANCE' },
        { id: 4, name: 'Government Subsidies', code: 'REV-GOVT' },
        { id: 5, name: 'Service Fees', code: 'REV-SERVICE' },
        { id: 6, name: 'Rental Income', code: 'REV-RENTAL' },
        { id: 7, name: 'Training & Workshop Fees', code: 'REV-TRAINING' },
        { id: 8, name: 'Interest Income', code: 'REV-INTEREST' },
        { id: 9, name: 'Sale of Assets', code: 'REV-ASSETS' },
        { id: 10, name: 'Other Income', code: 'REV-OTHER' },
    ];
    const expenseCategories = filters?.expense_categories ?? [
        { id: 1, name: 'Grants', code: 'REV-GRANT' },
        { id: 2, name: 'Donations', code: 'REV-DONATION' },
        { id: 3, name: 'Insurance Claims', code: 'REV-INSURANCE' },
        { id: 4, name: 'Government Subsidies', code: 'REV-GOVT' },
        { id: 5, name: 'Service Fees', code: 'REV-SERVICE' },
        { id: 6, name: 'Rental Income', code: 'REV-RENTAL' },
        { id: 7, name: 'Training & Workshop Fees', code: 'REV-TRAINING' },
        { id: 8, name: 'Interest Income', code: 'REV-INTEREST' },
        { id: 9, name: 'Sale of Assets', code: 'REV-ASSETS' },
        { id: 10, name: 'Other Income', code: 'REV-OTHER' },
    ];

    const [activeTab, setActiveTab] = useState<TabId>('overview');

    // Global date range (applies to every tab)
    const now = new Date();
    const [dateFrom, setDateFrom] = useState(
        isoDate(new Date(now.getFullYear(), 0, 1)),
    );
    const [dateTo, setDateTo] = useState(isoDate(now));

    // Per-tab filters
    const [collMethod, setCollMethod] = useState('');
    const [revStatus, setRevStatus] = useState('');
    const [revCategory, setRevCategory] = useState('');
    const [expStatus, setExpStatus] = useState('');
    const [expCategory, setExpCategory] = useState('');

    // Overview
    const [overview, setOverview] = useState<Overview | null>(null);
    const [overviewLoading, setOverviewLoading] = useState(false);

    // Sheets
    const [showCreateRevenue, setShowCreateRevenue] = useState(false);
    const [showCreateExpense, setShowCreateExpense] = useState(false);
    const [selectedRevenue, setSelectedRevenue] = useState<Revenue | null>(
        null,
    );
    const [selectedExpense, setSelectedExpense] = useState<Expense | null>(
        null,
    );
    const [actionMode, setActionMode] = useState<ActionMode>(null);
    const [reason, setReason] = useState('');
    const [acting, setActing] = useState(false);

    const dateParams = useMemo(
        () => cleanParams({ date_from: dateFrom, date_to: dateTo }),
        [dateFrom, dateTo],
    );

    const periodLabel = useMemo(() => {
        if (!dateFrom && !dateTo) return 'All time';
        const from = dateFrom ? formatDate(dateFrom) : 'Start';
        const to = dateTo ? formatDate(dateTo) : 'Today';
        return `${from} – ${to}`;
    }, [dateFrom, dateTo]);

    const collections = usePagedList<Collection>(
        '/admin/finance/collections',
        'collections',
        activeTab === 'collections',
        { ...dateParams, ...cleanParams({ payment_method: collMethod }) },
    );

    const revenues = usePagedList<Revenue>(
        '/admin/finance/revenues',
        'revenues',
        activeTab === 'revenue',
        {
            ...dateParams,
            ...cleanParams({ status: revStatus, category_id: revCategory }),
        },
    );

    const expenses = usePagedList<Expense>(
        '/admin/finance/expenses',
        'expenses',
        activeTab === 'expenses',
        {
            ...dateParams,
            ...cleanParams({ status: expStatus, category_id: expCategory }),
        },
    );

    // ============================================
    // OVERVIEW FETCH
    // ============================================

    const fetchOverview = useCallback(async () => {
        setOverviewLoading(true);
        try {
            const response = await Http.get('/admin/finance/overview', {
                params: dateParams,
            });
            if (response.data.success) {
                setOverview(response.data.overview);
            }
        } catch (error) {
            console.error('Failed to fetch finance overview:', error);
            toast.error('Failed to load overview');
        } finally {
            setOverviewLoading(false);
        }
    }, [dateParams]);

    useEffect(() => {
        if (activeTab === 'overview') fetchOverview();
    }, [activeTab, fetchOverview]);

    const refreshAll = () => {
        fetchOverview();
        if (activeTab === 'collections') collections.reload();
        if (activeTab === 'revenue') revenues.reload();
        if (activeTab === 'expenses') expenses.reload();
    };

    // ============================================
    // DATE RANGE HELPERS
    // ============================================

    const setThisMonth = () => {
        const d = new Date();
        setDateFrom(isoDate(new Date(d.getFullYear(), d.getMonth(), 1)));
        setDateTo(isoDate(d));
    };
    const setThisYear = () => {
        const d = new Date();
        setDateFrom(isoDate(new Date(d.getFullYear(), 0, 1)));
        setDateTo(isoDate(d));
    };
    const clearDates = () => {
        setDateFrom('');
        setDateTo('');
    };

    // ============================================
    // ACTIONS (expenses + revenue)
    // ============================================

    const closeSheets = () => {
        setSelectedExpense(null);
        setSelectedRevenue(null);
        setActionMode(null);
        setReason('');
    };

    const runExpenseAction = async (
        path: 'approve' | 'reject' | 'pay' | 'void',
        body?: Record<string, string>,
    ) => {
        if (!selectedExpense) return;
        setActing(true);
        try {
            const res = await Http.post(
                `/admin/finance/expenses/${selectedExpense.id}/${path}`,
                body,
            );
            toast.success(res.data.message || 'Done');
            setSelectedExpense(res.data.expense);
            setActionMode(null);
            setReason('');
            expenses.reload();
        } catch (error: any) {
            const errors = error.response?.data?.errors;
            const first = errors ? Object.values(errors).flat()[0] : null;
            toast.error(
                (first as string) ||
                    error.response?.data?.message ||
                    'Action failed',
            );
        } finally {
            setActing(false);
        }
    };

    const runRevenueAction = async (
        path: 'receive' | 'cancel',
        body?: Record<string, string>,
    ) => {
        if (!selectedRevenue) return;
        setActing(true);
        try {
            const res = await Http.post(
                `/admin/finance/revenues/${selectedRevenue.id}/${path}`,
                body,
            );
            toast.success(res.data.message || 'Done');
            setSelectedRevenue(res.data.revenue);
            setActionMode(null);
            setReason('');
            revenues.reload();
        } catch (error: any) {
            const errors = error.response?.data?.errors;
            const first = errors ? Object.values(errors).flat()[0] : null;
            toast.error(
                (first as string) ||
                    error.response?.data?.message ||
                    'Action failed',
            );
        } finally {
            setActing(false);
        }
    };

    // ============================================
    // COLUMNS
    // ============================================

    const collectionColumns: Column<Collection>[] = [
        {
            id: 'collected_at',
            label: 'Date',
            minWidth: 150,
            format: (v) => (
                <span className="text-sm text-slate-700">
                    {formatDateTime(v)}
                </span>
            ),
            sortable: true,
        },
        {
            id: 'invoice_id',
            label: 'Invoice',
            minWidth: 100,
            format: (v) => (
                <span className="font-mono text-xs font-medium text-slate-700">
                    {v ? `#${v}` : '—'}
                </span>
            ),
            sortable: true,
        },
        {
            id: 'payment_method',
            label: 'Method',
            minWidth: 110,
            format: (v) => (
                <span className="text-xs text-slate-600 capitalize">
                    {prettify(v)}
                </span>
            ),
            sortable: true,
        },
        {
            id: 'reference',
            label: 'Reference',
            minWidth: 130,
            format: (v) => (
                <span className="text-xs text-slate-600">{v || '—'}</span>
            ),
        },
        {
            id: 'amount',
            label: 'Amount',
            minWidth: 120,
            format: (v) => (
                <span className="font-semibold text-emerald-700">
                    {formatCurrency(v)}
                </span>
            ),
            sortable: true,
        },
    ];

    const revenueColumns: Column<Revenue>[] = [
        {
            id: 'revenue_no',
            label: 'Revenue No',
            minWidth: 150,
            format: (v) => (
                <span className="font-mono text-xs font-medium text-slate-700">
                    {v}
                </span>
            ),
            sortable: true,
        },
        {
            id: 'revenue_date',
            label: 'Date',
            minWidth: 100,
            format: (v) => (
                <span className="text-sm text-slate-700">{formatDate(v)}</span>
            ),
            sortable: true,
        },
        {
            id: 'category_name',
            label: 'Category',
            minWidth: 130,
            format: (v, row) => (
                <div>
                    <div className="text-sm font-medium text-slate-800">
                        {v || '—'}
                    </div>
                    <div className="text-xs text-slate-500">
                        {SOURCE_LABELS[row.source_type] ??
                            prettify(row.source_type)}
                    </div>
                </div>
            ),
            sortable: true,
        },
        {
            id: 'payer_name',
            label: 'Payer',
            minWidth: 150,
            format: (v, row) => (
                <div>
                    <div className="text-sm text-slate-800">{v || '—'}</div>
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
            minWidth: 120,
            format: (v) => (
                <span className="font-semibold text-slate-800">
                    {formatCurrency(v)}
                </span>
            ),
            sortable: true,
        },
        {
            id: 'status',
            label: 'Status',
            minWidth: 100,
            format: (v) => <StatusPill status={v} config={REVENUE_STATUS} />,
            sortable: true,
        },
        {
            id: 'receipt_path',
            label: 'Receipt',
            minWidth: 80,
            format: (v) => <ReceiptLink path={v} />,
        },
    ];

    const expenseColumns: Column<Expense>[] = [
        {
            id: 'expense_no',
            label: 'Expense No',
            minWidth: 150,
            format: (v) => (
                <span className="font-mono text-xs font-medium text-slate-700">
                    {v}
                </span>
            ),
            sortable: true,
        },
        {
            id: 'expense_date',
            label: 'Date',
            minWidth: 100,
            format: (v) => (
                <span className="text-sm text-slate-700">{formatDate(v)}</span>
            ),
            sortable: true,
        },
        {
            id: 'category_name',
            label: 'Category',
            minWidth: 130,
            format: (v, row) => (
                <div>
                    <div className="text-sm font-medium text-slate-800">
                        {v || '—'}
                    </div>
                    {row.budget_code && (
                        <div className="font-mono text-[10px] text-slate-500">
                            {row.budget_code}
                        </div>
                    )}
                </div>
            ),
            sortable: true,
        },
        {
            id: 'payee_name',
            label: 'Payee',
            minWidth: 160,
            format: (v, row) => (
                <div>
                    <div className="text-sm text-slate-800">{v}</div>
                    {row.description && (
                        <div className="max-w-[200px] truncate text-xs text-slate-500">
                            {row.description}
                        </div>
                    )}
                </div>
            ),
            sortable: true,
        },
        {
            id: 'amount',
            label: 'Amount',
            minWidth: 120,
            format: (v) => (
                <span className="font-semibold text-slate-800">
                    {formatCurrency(v)}
                </span>
            ),
            sortable: true,
        },
        {
            id: 'status',
            label: 'Status',
            minWidth: 100,
            format: (v) => <StatusPill status={v} config={EXPENSE_STATUS} />,
            sortable: true,
        },
        {
            id: 'receipt_path',
            label: 'Receipt',
            minWidth: 80,
            format: (v) => <ReceiptLink path={v} />,
        },
    ];

    const revenueActions: Action<Revenue>[] = [
        {
            label: 'View',
            icon: <Eye className="h-4 w-4" />,
            color: 'primary',
            onClick: (row) => {
                setActionMode(null);
                setReason('');
                setSelectedRevenue(row);
            },
        },
    ];

    const expenseActions: Action<Expense>[] = [
        {
            label: 'View',
            icon: <Eye className="h-4 w-4" />,
            color: 'primary',
            onClick: (row) => {
                setActionMode(null);
                setReason('');
                setSelectedExpense(row);
            },
        },
    ];

    // ============================================
    // RENDER HELPERS
    // ============================================

    const tableToolbar = (opts: {
        onCreate?: () => void;
        createLabel?: string;
    }) => (
        <div className="mb-3 flex flex-wrap items-center justify-end gap-2">
            {opts.onCreate && can.create && (
                <Button
                    variant="outline"
                    className="font-medium text-cyan-700"
                    onClick={opts.onCreate}
                >
                    <Plus className="mr-1 h-4 w-4" />
                    {opts.createLabel}
                </Button>
            )}
            <Button
                variant="outline"
                onClick={() => {
                    refreshAll();
                    toast.success('Refreshed');
                }}
            >
                <RefreshCw className="mr-1 h-4 w-4" />
                Refresh
            </Button>
        </div>
    );

    const inputClass =
        'rounded-md border border-slate-300 bg-white px-2 py-1 text-sm text-slate-700 focus:border-cyan-500 focus:outline-none';

    const reasonBox = (
        label: string,
        confirmLabel: string,
        onConfirm: () => void,
        tone: 'red' | 'slate',
    ) => (
        <div className="space-y-2 rounded-lg border border-slate-200 bg-slate-50 p-3">
            <Label className="text-xs text-slate-600">{label}</Label>
            <textarea
                rows={2}
                className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:border-cyan-500 focus:outline-none"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Reason (required)"
            />
            <div className="flex justify-end gap-2">
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                        setActionMode(null);
                        setReason('');
                    }}
                    disabled={acting}
                >
                    Back
                </Button>
                <Button
                    size="sm"
                    disabled={acting || !reason.trim()}
                    className={
                        tone === 'red' ? 'bg-red-600 hover:bg-red-700' : ''
                    }
                    onClick={onConfirm}
                >
                    {confirmLabel}
                </Button>
            </div>
        </div>
    );

    // ============================================
    // RENDER
    // ============================================

    return (
        <AppLayout
            breadcrumbs={[
                { title: 'Altaf Memorial Hospital', href: '/' },
                { title: 'Administration', href: '' },
                { title: 'Finance', href: '' },
            ]}
        >
            <Head title="Finance" />

            <div className="min-h-screen bg-blue-50">
                <PageHeader
                    icon={<Wallet className="h-6 w-6" />}
                    title="Finance"
                    subtitle="Collections, revenue and expenditure at a glance"
                    actions={[
                        {
                            label: 'Overview',
                            onClick: () => setActiveTab('overview'),
                            icon: <BarChartBigIcon />,
                            variant:
                                activeTab === 'overview' ? 'cyan' : 'default',
                        },
                        {
                            label: 'Collections',
                            onClick: () => setActiveTab('collections'),
                            icon: <Coins />,
                            variant:
                                activeTab === 'collections'
                                    ? 'cyan'
                                    : 'default',
                        },
                        {
                            label: 'Revenue',
                            onClick: () => setActiveTab('revenue'),
                            icon: <Banknote />,
                            variant:
                                activeTab === 'revenue' ? 'cyan' : 'default',
                        },
                        {
                            label: 'Expenses',
                            onClick: () => setActiveTab('expenses'),
                            icon: <Receipt />,
                            variant:
                                activeTab === 'expenses' ? 'cyan' : 'default',
                        },
                    ]}
                />

                <div className="m-2 rounded-lg bg-white shadow-sm">
                    {/* ========== DATE RANGE ========== */}
                    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 p-3">
                        <div className="flex flex-wrap items-center gap-2 text-sm">
                            <CalendarDays className="h-4 w-4 text-slate-400" />

                            <input
                                type="date"
                                className={inputClass}
                                value={dateFrom}
                                max={dateTo || undefined}
                                style={{ height: 40, width: 180 }}
                                onChange={(e) => setDateFrom(e.target.value)}
                            />

                            <span className="text-slate-400">to</span>

                            <input
                                type="date"
                                className={inputClass}
                                value={dateTo}
                                min={dateFrom || undefined}
                                style={{ height: 40, width: 180 }}
                                onChange={(e) => setDateTo(e.target.value)}
                            />
                        </div>

                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="gap-2"
                                >
                                    <CalendarDays className="h-4 w-4" />
                                    Date Range
                                    <ChevronDown className="h-4 w-4" />
                                </Button>
                            </DropdownMenuTrigger>

                            <DropdownMenuContent align="end">
                                <DropdownMenuLabel>
                                    Quick Date Selection
                                </DropdownMenuLabel>
                                <DropdownMenuSeparator />

                                <DropdownMenuItem onSelect={setThisMonth}>
                                    This month
                                </DropdownMenuItem>

                                <DropdownMenuItem onSelect={setThisYear}>
                                    This year
                                </DropdownMenuItem>

                                <DropdownMenuItem onSelect={clearDates}>
                                    All time
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>

                    {/* ========== OVERVIEW ========== */}
                    {activeTab === 'overview' && (
                        <div className="space-y-3 rounded-b-lg bg-blue-50 p-3">
                            {overviewLoading && !overview && (
                                <p className="py-10 text-center text-sm text-slate-500">
                                    Loading overview...
                                </p>
                            )}

                            {overview && (
                                <>
                                    <div className="flex items-center justify-between text-xs text-slate-500">
                                        <span>
                                            Period:{' '}
                                            <span className="font-medium text-slate-700">
                                                {periodLabel}
                                            </span>
                                        </span>
                                        {overviewLoading && (
                                            <span className="text-slate-400">
                                                Updating...
                                            </span>
                                        )}
                                    </div>

                                    {/* KPI cards */}
                                    <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
                                        <StatCard
                                            label="Collections"
                                            value={formatCurrency(
                                                overview.collections_total,
                                            )}
                                            hint={`${overview.collections_count} patient payments`}
                                            tone="blue"
                                            icon={<Coins className="h-4 w-4" />}
                                        />
                                        <StatCard
                                            label="Other Revenue"
                                            value={formatCurrency(
                                                overview.revenue_total,
                                            )}
                                            hint="Grants, donations, claims"
                                            tone="cyan"
                                            icon={
                                                <Banknote className="h-4 w-4" />
                                            }
                                        />
                                        <StatCard
                                            label="Total Income"
                                            value={formatCurrency(
                                                overview.total_income,
                                            )}
                                            hint="Collections + revenue"
                                            tone="emerald"
                                            icon={
                                                <TrendingUp className="h-4 w-4" />
                                            }
                                        />
                                        <StatCard
                                            label="Expenses"
                                            value={formatCurrency(
                                                overview.expenses_total,
                                            )}
                                            hint="Approved and paid"
                                            tone="red"
                                            icon={
                                                <TrendingDown className="h-4 w-4" />
                                            }
                                        />
                                        <StatCard
                                            label="Net Position"
                                            value={formatCurrency(
                                                overview.net_position,
                                            )}
                                            hint="Income minus expenses"
                                            tone={
                                                overview.net_position >= 0
                                                    ? 'emerald'
                                                    : 'red'
                                            }
                                            negative={overview.net_position < 0}
                                            icon={
                                                <Wallet className="h-4 w-4" />
                                            }
                                        />
                                        <StatCard
                                            label="Awaiting Approval"
                                            value={formatCurrency(
                                                overview.pending_expenses,
                                            )}
                                            hint={`${overview.pending_expense_count} pending expenses`}
                                            tone="amber"
                                            icon={
                                                <Receipt className="h-4 w-4" />
                                            }
                                        />
                                    </div>

                                    {/* Trend */}
                                    <Panel
                                        title="Income vs expenses"
                                        subtitle="Last 6 months"
                                        icon={
                                            <BarChartBigIcon className="h-3.5 w-3.5" />
                                        }
                                        right={<TrendLegend />}
                                    >
                                        <TrendBars trend={overview.trend} />
                                    </Panel>

                                    {/* Breakdowns */}
                                    <div className="grid gap-3 xl:grid-cols-2">
                                        <BreakdownCard
                                            title="Collections by payment method"
                                            subtitle="Share of total collected"
                                            icon={
                                                <Coins className="h-3.5 w-3.5" />
                                            }
                                            emptyText="No collections in this period"
                                            items={overview.collections_by_method.map(
                                                (m) => ({
                                                    label: prettify(m.method),
                                                    value: m.total,
                                                    extra: `(${m.count})`,
                                                }),
                                            )}
                                        />
                                        <BreakdownCard
                                            title="Revenue by category"
                                            subtitle="Other revenue only"
                                            icon={
                                                <Banknote className="h-3.5 w-3.5" />
                                            }
                                            emptyText="No revenue in this period"
                                            items={overview.revenue_by_category.map(
                                                (c) => ({
                                                    label: c.category,
                                                    value: c.total,
                                                }),
                                            )}
                                        />
                                        <BreakdownCard
                                            title="Expenses by category"
                                            subtitle="Approved and paid"
                                            icon={
                                                <Receipt className="h-3.5 w-3.5" />
                                            }
                                            emptyText="No expenses in this period"
                                            className="xl:col-span-2"
                                            items={overview.expenses_by_category.map(
                                                (c) => ({
                                                    label: c.category,
                                                    value: c.total,
                                                }),
                                            )}
                                        />
                                    </div>
                                </>
                            )}
                        </div>
                    )}

                    {/* ========== COLLECTIONS ========== */}
                    {activeTab === 'collections' && (
                        <div className="p-2">
                            {tableToolbar({})}
                            <div className="mb-3 rounded-lg bg-blue-50 px-4 py-2 text-sm text-blue-800">
                                Total collected in view:{' '}
                                <strong>
                                    {formatCurrency(
                                        collections.meta.summary?.total_amount,
                                    )}
                                </strong>
                            </div>
                            <ReusableTable
                                columns={collectionColumns}
                                data={collections.rows}
                                loading={collections.loading}
                                title="Patient Collections"
                                rowsPerPageOptions={[5, 10, 15, 20, 50]}
                                defaultRowsPerPage={10}
                                defaultOrderBy="collected_at"
                                defaultOrder="desc"
                                filterPlaceholder="Search invoice or method..."
                                additionalFilters={[
                                    {
                                        key: 'payment_method',
                                        label: 'Method',
                                        options: collections.meta.methods ?? [],
                                        value: collMethod,
                                        onChange: setCollMethod,
                                    },
                                ]}
                                emptyMessage="No collections found"
                                onSearchChange={collections.onSearchChange}
                                onPageChange={collections.onPageChange}
                                onPageSizeChange={collections.onPageSizeChange}
                                pagination={collections.pagination}
                            />
                        </div>
                    )}

                    {/* ========== REVENUE ========== */}
                    {activeTab === 'revenue' && (
                        <div className="p-2">
                            {tableToolbar({
                                onCreate: () => setShowCreateRevenue(true),
                                createLabel: 'Record Revenue',
                            })}
                            <div className="mb-3 flex flex-wrap gap-3 text-sm">
                                <div className="rounded-lg bg-emerald-50 px-4 py-2 text-emerald-800">
                                    Received:{' '}
                                    <strong>
                                        {formatCurrency(
                                            revenues.meta.summary
                                                ?.received_total,
                                        )}
                                    </strong>
                                </div>
                                <div className="rounded-lg bg-amber-50 px-4 py-2 text-amber-800">
                                    Expected:{' '}
                                    <strong>
                                        {formatCurrency(
                                            revenues.meta.summary
                                                ?.pending_total,
                                        )}
                                    </strong>
                                </div>
                            </div>
                            <ReusableTable
                                columns={revenueColumns}
                                data={revenues.rows}
                                actions={revenueActions}
                                loading={revenues.loading}
                                title="Other Revenue"
                                rowsPerPageOptions={[5, 10, 15, 20, 50]}
                                defaultRowsPerPage={10}
                                defaultOrderBy="revenue_date"
                                defaultOrder="desc"
                                filterPlaceholder="Search revenue no, payer, reference..."
                                additionalFilters={[
                                    {
                                        key: 'category',
                                        label: 'Category',
                                        options: revenueCategories,
                                        value: revCategory,
                                        onChange: setRevCategory,
                                    },
                                    {
                                        key: 'status',
                                        label: 'Status',
                                        options: toOptions(REVENUE_STATUS),
                                        value: revStatus,
                                        onChange: setRevStatus,
                                    },
                                ]}
                                emptyMessage="No revenue found"
                                onSearchChange={revenues.onSearchChange}
                                onPageChange={revenues.onPageChange}
                                onPageSizeChange={revenues.onPageSizeChange}
                                pagination={revenues.pagination}
                            />
                        </div>
                    )}

                    {/* ========== EXPENSES ========== */}
                    {activeTab === 'expenses' && (
                        <div className="p-2">
                            {tableToolbar({
                                onCreate: () => setShowCreateExpense(true),
                                createLabel: 'Record Expense',
                            })}
                            <div className="mb-3 flex flex-wrap gap-3 text-sm">
                                <div className="rounded-lg bg-red-50 px-4 py-2 text-red-800">
                                    Spent (approved + paid):{' '}
                                    <strong>
                                        {formatCurrency(
                                            expenses.meta.summary?.spent_total,
                                        )}
                                    </strong>
                                </div>
                                <div className="rounded-lg bg-amber-50 px-4 py-2 text-amber-800">
                                    Awaiting approval:{' '}
                                    <strong>
                                        {formatCurrency(
                                            expenses.meta.summary
                                                ?.pending_total,
                                        )}
                                    </strong>
                                </div>
                            </div>
                            <ReusableTable
                                columns={expenseColumns}
                                data={expenses.rows}
                                actions={expenseActions}
                                loading={expenses.loading}
                                title="Expenses"
                                rowsPerPageOptions={[5, 10, 15, 20, 50]}
                                defaultRowsPerPage={10}
                                defaultOrderBy="expense_date"
                                defaultOrder="desc"
                                filterPlaceholder="Search expense no, payee, budget code..."
                                additionalFilters={[
                                    {
                                        key: 'category',
                                        label: 'Category',
                                        options: expenseCategories,
                                        value: expCategory,
                                        onChange: setExpCategory,
                                    },
                                    {
                                        key: 'status',
                                        label: 'Status',
                                        options: toOptions(EXPENSE_STATUS),
                                        value: expStatus,
                                        onChange: setExpStatus,
                                    },
                                ]}
                                emptyMessage="No expenses found"
                                onSearchChange={expenses.onSearchChange}
                                onPageChange={expenses.onPageChange}
                                onPageSizeChange={expenses.onPageSizeChange}
                                pagination={expenses.pagination}
                            />
                        </div>
                    )}
                </div>
            </div>

            {/* ========== CREATE REVENUE SHEET ========== */}
            <Sheet open={showCreateRevenue} onOpenChange={setShowCreateRevenue}>
                <SheetContent className="w-full overflow-y-auto sm:max-w-xl">
                    <SheetHeader className="sr-only">
                        <SheetTitle>Record Revenue</SheetTitle>
                    </SheetHeader>
                    <CreateRevenueForm
                        categories={revenueCategories}
                        onCreated={() => {
                            setShowCreateRevenue(false);
                            revenues.reload();
                            fetchOverview();
                        }}
                        onCancel={() => setShowCreateRevenue(false)}
                    />
                </SheetContent>
            </Sheet>

            {/* ========== CREATE EXPENSE SHEET ========== */}
            <Sheet open={showCreateExpense} onOpenChange={setShowCreateExpense}>
                <SheetContent className="w-full overflow-y-auto sm:max-w-xl">
                    <SheetHeader className="sr-only">
                        <SheetTitle>Record Expense</SheetTitle>
                    </SheetHeader>
                    <CreateExpenseForm
                        categories={expenseCategories}
                        onCreated={() => {
                            setShowCreateExpense(false);
                            expenses.reload();
                            fetchOverview();
                        }}
                        onCancel={() => setShowCreateExpense(false)}
                    />
                </SheetContent>
            </Sheet>

            {/* ========== REVENUE DETAIL SHEET ========== */}
            <Sheet
                open={!!selectedRevenue}
                onOpenChange={(open) => {
                    if (!open) closeSheets();
                }}
            >
                <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
                    <SheetHeader className="border-b">
                        <SheetTitle className="flex items-center gap-2">
                            <Banknote className="h-5 w-5 text-slate-600" />
                            Revenue Details
                        </SheetTitle>
                        <SheetDescription>
                            {selectedRevenue?.revenue_no}
                        </SheetDescription>
                    </SheetHeader>

                    {selectedRevenue && (
                        <div className="mt-4 space-y-4 p-4">
                            <div className="flex flex-wrap gap-2">
                                <StatusPill
                                    status={selectedRevenue.status}
                                    config={REVENUE_STATUS}
                                />
                                <Badge variant="secondary">
                                    {SOURCE_LABELS[
                                        selectedRevenue.source_type
                                    ] ?? prettify(selectedRevenue.source_type)}
                                </Badge>
                            </div>

                            <div className="grid grid-cols-2 gap-3 text-sm">
                                <div>
                                    <Label className="text-xs text-slate-500">
                                        Date
                                    </Label>
                                    <p>
                                        {formatDate(
                                            selectedRevenue.revenue_date,
                                        )}
                                    </p>
                                </div>
                                <div>
                                    <Label className="text-xs text-slate-500">
                                        Amount
                                    </Label>
                                    <p className="font-semibold">
                                        {formatCurrency(selectedRevenue.amount)}
                                    </p>
                                </div>
                                <div>
                                    <Label className="text-xs text-slate-500">
                                        Category
                                    </Label>
                                    <p>
                                        {selectedRevenue.category_name || '—'}
                                    </p>
                                </div>
                                <div>
                                    <Label className="text-xs text-slate-500">
                                        Payment
                                    </Label>
                                    <p className="capitalize">
                                        {prettify(
                                            selectedRevenue.payment_method,
                                        )}
                                    </p>
                                </div>
                                <div>
                                    <Label className="text-xs text-slate-500">
                                        Payer
                                    </Label>
                                    <p>{selectedRevenue.payer_name || '—'}</p>
                                </div>
                                <div>
                                    <Label className="text-xs text-slate-500">
                                        Reference
                                    </Label>
                                    <p>
                                        {selectedRevenue.reference_number ||
                                            '—'}
                                    </p>
                                </div>
                            </div>

                            {selectedRevenue.description && (
                                <div>
                                    <Label className="text-xs text-slate-500">
                                        Description
                                    </Label>
                                    <p className="text-sm text-slate-700">
                                        {selectedRevenue.description}
                                    </p>
                                </div>
                            )}

                            {selectedRevenue.receipt_path && (
                                <div>
                                    <Label className="text-xs text-slate-500">
                                        Receipt
                                    </Label>
                                    <div className="mt-1">
                                        <ReceiptLink
                                            path={selectedRevenue.receipt_path}
                                            name={
                                                selectedRevenue.receipt_original_name
                                            }
                                        />
                                    </div>
                                </div>
                            )}

                            {selectedRevenue.status === 'cancelled' && (
                                <div className="rounded-lg bg-slate-50 p-3 text-sm text-slate-600">
                                    <p className="font-medium">
                                        Cancelled{' '}
                                        {formatDateTime(
                                            selectedRevenue.cancelled_at,
                                        )}
                                        {selectedRevenue.canceller_name &&
                                            ` by ${selectedRevenue.canceller_name}`}
                                    </p>
                                    {selectedRevenue.cancellation_reason && (
                                        <p className="mt-1">
                                            {
                                                selectedRevenue.cancellation_reason
                                            }
                                        </p>
                                    )}
                                </div>
                            )}

                            <div className="border-t pt-3 text-xs text-slate-500">
                                <p>
                                    Recorded{' '}
                                    {formatDateTime(selectedRevenue.created_at)}
                                    {selectedRevenue.creator_name &&
                                        ` by ${selectedRevenue.creator_name}`}
                                </p>
                            </div>

                            {actionMode === 'cancel' ? (
                                reasonBox(
                                    'Why is this revenue entry being cancelled?',
                                    'Confirm Cancel',
                                    () =>
                                        runRevenueAction('cancel', {
                                            reason: reason.trim(),
                                        }),
                                    'red',
                                )
                            ) : (
                                <div className="flex flex-wrap justify-end gap-2">
                                    {selectedRevenue.status === 'pending' &&
                                        can.approve && (
                                            <Button
                                                size="sm"
                                                disabled={acting}
                                                className="bg-emerald-600 hover:bg-emerald-700"
                                                onClick={() =>
                                                    runRevenueAction('receive')
                                                }
                                            >
                                                <CheckCircle className="mr-1 h-4 w-4" />
                                                Mark Received
                                            </Button>
                                        )}
                                    {selectedRevenue.status !== 'cancelled' &&
                                        can.cancel && (
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                className="text-red-600"
                                                onClick={() =>
                                                    setActionMode('cancel')
                                                }
                                            >
                                                <Ban className="mr-1 h-4 w-4" />
                                                Cancel Entry
                                            </Button>
                                        )}
                                </div>
                            )}
                        </div>
                    )}

                    <div className="mt-2 flex justify-end p-4">
                        <Button variant="outline" onClick={closeSheets}>
                            Close
                        </Button>
                    </div>
                </SheetContent>
            </Sheet>

            {/* ========== EXPENSE DETAIL SHEET ========== */}
            <Sheet
                open={!!selectedExpense}
                onOpenChange={(open) => {
                    if (!open) closeSheets();
                }}
            >
                <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
                    <SheetHeader className="border-b">
                        <SheetTitle className="flex items-center gap-2">
                            <Receipt className="h-5 w-5 text-slate-600" />
                            Expense Details
                        </SheetTitle>
                        <SheetDescription>
                            {selectedExpense?.expense_no}
                        </SheetDescription>
                    </SheetHeader>

                    {selectedExpense && (
                        <div className="mt-4 space-y-4 p-4">
                            <div className="flex flex-wrap gap-2">
                                <StatusPill
                                    status={selectedExpense.status}
                                    config={EXPENSE_STATUS}
                                />
                                {selectedExpense.budget_code && (
                                    <Badge
                                        variant="secondary"
                                        className="font-mono"
                                    >
                                        {selectedExpense.budget_code}
                                    </Badge>
                                )}
                            </div>

                            <div className="grid grid-cols-2 gap-3 text-sm">
                                <div>
                                    <Label className="text-xs text-slate-500">
                                        Date
                                    </Label>
                                    <p>
                                        {formatDate(
                                            selectedExpense.expense_date,
                                        )}
                                    </p>
                                </div>
                                <div>
                                    <Label className="text-xs text-slate-500">
                                        Amount
                                    </Label>
                                    <p className="font-semibold">
                                        {formatCurrency(selectedExpense.amount)}
                                    </p>
                                </div>
                                <div>
                                    <Label className="text-xs text-slate-500">
                                        Category
                                    </Label>
                                    <p>
                                        {selectedExpense.category_name || '—'}
                                    </p>
                                </div>
                                <div>
                                    <Label className="text-xs text-slate-500">
                                        Payment
                                    </Label>
                                    <p className="capitalize">
                                        {prettify(
                                            selectedExpense.payment_method,
                                        )}
                                    </p>
                                </div>
                                <div>
                                    <Label className="text-xs text-slate-500">
                                        Payee
                                    </Label>
                                    <p>{selectedExpense.payee_name}</p>
                                </div>
                                <div>
                                    <Label className="text-xs text-slate-500">
                                        Reference
                                    </Label>
                                    <p>
                                        {selectedExpense.reference_number ||
                                            '—'}
                                    </p>
                                </div>
                            </div>

                            {selectedExpense.description && (
                                <div>
                                    <Label className="text-xs text-slate-500">
                                        Description
                                    </Label>
                                    <p className="text-sm text-slate-700">
                                        {selectedExpense.description}
                                    </p>
                                </div>
                            )}

                            {selectedExpense.receipt_path && (
                                <div>
                                    <Label className="text-xs text-slate-500">
                                        Receipt
                                    </Label>
                                    <div className="mt-1">
                                        <ReceiptLink
                                            path={selectedExpense.receipt_path}
                                            name={
                                                selectedExpense.receipt_original_name
                                            }
                                        />
                                    </div>
                                </div>
                            )}

                            {(selectedExpense.status === 'rejected' ||
                                selectedExpense.status === 'void') &&
                                selectedExpense.rejection_reason && (
                                    <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
                                        <p className="font-medium capitalize">
                                            {selectedExpense.status} reason
                                        </p>
                                        <p className="mt-1">
                                            {selectedExpense.rejection_reason}
                                        </p>
                                    </div>
                                )}

                            <div className="space-y-0.5 border-t pt-3 text-xs text-slate-500">
                                <p>
                                    Submitted{' '}
                                    {formatDateTime(selectedExpense.created_at)}
                                    {selectedExpense.creator_name &&
                                        ` by ${selectedExpense.creator_name}`}
                                </p>
                                {selectedExpense.approved_at && (
                                    <p>
                                        {selectedExpense.status === 'rejected'
                                            ? 'Rejected'
                                            : 'Approved'}{' '}
                                        {formatDateTime(
                                            selectedExpense.approved_at,
                                        )}
                                        {selectedExpense.approver_name &&
                                            ` by ${selectedExpense.approver_name}`}
                                    </p>
                                )}
                                {selectedExpense.paid_at && (
                                    <p>
                                        Paid{' '}
                                        {formatDateTime(
                                            selectedExpense.paid_at,
                                        )}
                                        {selectedExpense.payer_name &&
                                            ` by ${selectedExpense.payer_name}`}
                                    </p>
                                )}
                            </div>

                            {actionMode === 'reject' ? (
                                reasonBox(
                                    'Why is this expense being rejected?',
                                    'Confirm Reject',
                                    () =>
                                        runExpenseAction('reject', {
                                            reason: reason.trim(),
                                        }),
                                    'red',
                                )
                            ) : actionMode === 'void' ? (
                                reasonBox(
                                    'Why is this expense being voided?',
                                    'Confirm Void',
                                    () =>
                                        runExpenseAction('void', {
                                            reason: reason.trim(),
                                        }),
                                    'red',
                                )
                            ) : (
                                <div className="flex flex-wrap justify-end gap-2">
                                    {selectedExpense.status === 'pending' &&
                                        can.approve && (
                                            <>
                                                <Button
                                                    size="sm"
                                                    disabled={acting}
                                                    className="bg-emerald-600 hover:bg-emerald-700"
                                                    onClick={() =>
                                                        runExpenseAction(
                                                            'approve',
                                                        )
                                                    }
                                                >
                                                    <CheckCircle className="mr-1 h-4 w-4" />
                                                    Approve
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    className="text-red-600"
                                                    onClick={() =>
                                                        setActionMode('reject')
                                                    }
                                                >
                                                    <XCircle className="mr-1 h-4 w-4" />
                                                    Reject
                                                </Button>
                                            </>
                                        )}
                                    {selectedExpense.status === 'approved' &&
                                        can.pay && (
                                            <Button
                                                size="sm"
                                                disabled={acting}
                                                className="bg-blue-600 hover:bg-blue-700"
                                                onClick={() =>
                                                    runExpenseAction('pay')
                                                }
                                            >
                                                <Banknote className="mr-1 h-4 w-4" />
                                                Mark as Paid
                                            </Button>
                                        )}
                                    {['pending', 'approved', 'paid'].includes(
                                        selectedExpense.status,
                                    ) &&
                                        can.cancel && (
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                className="text-slate-600"
                                                onClick={() =>
                                                    setActionMode('void')
                                                }
                                            >
                                                <Ban className="mr-1 h-4 w-4" />
                                                Void
                                            </Button>
                                        )}
                                </div>
                            )}
                        </div>
                    )}

                    <div className="mt-2 flex justify-end p-4">
                        <Button variant="outline" onClick={closeSheets}>
                            Close
                        </Button>
                    </div>
                </SheetContent>
            </Sheet>
        </AppLayout>
    );
}
