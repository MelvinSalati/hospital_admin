// resources/js/pages/admin/dashboard/AdminDashboard.tsx

import { usePage } from '@inertiajs/react';
import {
    RefreshCw,
    Download,
    DollarSign,
    Wallet,
    PiggyBank,
    Clock,
    FileText,
    Shield,
    Users,
    UserPlus,
    CreditCard,
    Search,
} from 'lucide-react';
import { useMemo, useState, type ReactNode } from 'react';
import { toast } from 'react-hot-toast';
import PageHeader from '@/components/PageHeader';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import AppLayout from '@/layouts/app-layout';

// ============================================
// TYPES
// ============================================

interface DashboardStats {
    // Financial
    total_budget: number;
    total_utilized: number;
    total_remaining: number;
    budget_utilization_percentage: number;

    // Approvals
    pending_approvals: number;
    pending_purchase_orders: number;
    pending_requisitions: number;

    // Recent activity
    recent_activities: {
        id: number;
        type: string;
        description: string;
        status: string;
        date: string;
        user: string;
    }[];

    // Services / payments / staff / claims / registrations
    top_services: { name: string; count: number }[];
    payment_methods: { name: string; count: number }[];
    staff_by_department: { name: string; count: number }[];
    insurance_claims: {
        id: number;
        provider: string;
        patient: string;
        amount: number;
        status: 'accepted' | 'pending' | 'rejected';
        date: string;
    }[];
    new_registrations: {
        id: number;
        name: string;
        patientCode: string;
        date: string;
        status: 'active' | 'inactive';
    }[];
}

// ============================================
// CONSTANTS + HELPERS
// ============================================

const CHART_COLORS = [
    '#2563eb',
    '#16a34a',
    '#d97706',
    '#9333ea',
    '#dc2626',
    '#0891b2',
    '#64748b',
] as const;

const cx = (...classes: Array<string | false | null | undefined>) =>
    classes.filter(Boolean).join(' ');

const asArray = <T,>(value: T[] | null | undefined): T[] =>
    Array.isArray(value) ? value : [];

const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('en-ZM', {
        style: 'currency',
        currency: 'ZMW',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(amount ?? 0);

const formatCompactCurrency = (amount: number) =>
    new Intl.NumberFormat('en-ZM', {
        style: 'currency',
        currency: 'ZMW',
        notation: 'compact',
        maximumFractionDigits: 1,
    }).format(amount ?? 0);

const formatRelative = (iso: string) => {
    const time = new Date(iso).getTime();
    if (Number.isNaN(time)) return '—';
    const minutes = Math.max(0, Math.floor((Date.now() - time) / 60_000));
    if (minutes < 1) return 'now';
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 30) return `${days}d ago`;
    return new Date(time).toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
    });
};

const getInitials = (name: string) =>
    (name ?? '')
        .split(' ')
        .filter(Boolean)
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);

const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
        approved: 'bg-green-100 text-green-800',
        accepted: 'bg-green-100 text-green-800',
        pending: 'bg-yellow-100 text-yellow-800',
        rejected: 'bg-red-100 text-red-800',
        completed: 'bg-blue-100 text-blue-800',
        sent: 'bg-indigo-100 text-indigo-800',
        active: 'bg-green-100 text-green-800',
        inactive: 'bg-slate-100 text-slate-600',
    };
    return colors[status] || 'bg-slate-100 text-slate-600';
};

// Shared type scale so every card feels consistent at any viewport
const T = {
    cardTitle: 'text-sm font-semibold leading-tight text-slate-800',
    cardSub: 'text-xs text-slate-500',
    body: 'text-sm text-slate-700',
    meta: 'text-xs text-slate-500',
    badge: 'rounded-full px-2 py-0.5 text-xs font-medium capitalize',
    count: 'text-lg font-semibold text-slate-900 tabular-nums',
} as const;

// ============================================
// DUMMY PROPS
// ============================================

const ago = (minutes: number) =>
    new Date(Date.now() - minutes * 60_000).toISOString();

export const DUMMY_PROPS: DashboardStats = {
    total_budget: 12500000,
    total_utilized: 8750000,
    total_remaining: 2500000,
    budget_utilization_percentage: 77.8,
    pending_approvals: 28,
    pending_purchase_orders: 12,
    pending_requisitions: 8,
    recent_activities: [
        {
            id: 1,
            type: 'Purchase Order',
            description: 'PO #PO-2024-0045 approved for Medical Supplies',
            status: 'approved',
            date: ago(35),
            user: 'John Mwansa',
        },
        {
            id: 2,
            type: 'Requisition',
            description:
                'Requisition #REQ-2024-0023 rejected - Budget exceeded',
            status: 'rejected',
            date: ago(90),
            user: 'Sarah Phiri',
        },
        {
            id: 3,
            type: 'Stock Adjustment',
            description: 'Stock adjustment completed for Surgical Gloves',
            status: 'completed',
            date: ago(180),
            user: 'David Banda',
        },
        {
            id: 4,
            type: 'User Request',
            description: 'New user account requested for IT Department',
            status: 'pending',
            date: ago(260),
            user: 'Grace Mwape',
        },
        {
            id: 5,
            type: 'Refund',
            description: 'Refund #REF-2024-0012 processed for damaged items',
            status: 'approved',
            date: ago(1300),
            user: 'Peter Zulu',
        },
        {
            id: 6,
            type: 'Purchase Order',
            description: 'PO #PO-2024-0046 sent to supplier',
            status: 'sent',
            date: ago(1500),
            user: 'John Mwansa',
        },
        {
            id: 7,
            type: 'Requisition',
            description: 'Requisition #REQ-2024-0024 awaiting approval',
            status: 'pending',
            date: ago(1700),
            user: 'Sarah Phiri',
        },
    ],
    top_services: [
        { name: 'Outpatient Consultation', count: 412 },
        { name: 'Laboratory Tests', count: 286 },
        { name: 'Pharmacy Dispensing', count: 214 },
        { name: 'Imaging / X-Ray', count: 98 },
    ],
    payment_methods: [
        { name: 'Cash', count: 182 },
        { name: 'Mobile Money', count: 140 },
        { name: 'Insurance', count: 98 },
        { name: 'Card', count: 44 },
        { name: 'Other', count: 22 },
    ],
    staff_by_department: [
        { name: 'Medical', count: 58 },
        { name: 'Nursing', count: 42 },
        { name: 'Pharmacy', count: 18 },
        { name: 'Finance', count: 14 },
        { name: 'Admin', count: 12 },
        { name: 'IT', count: 12 },
    ],
    insurance_claims: [
        {
            id: 1,
            provider: 'Madison Health',
            patient: 'PHA-0412',
            amount: 4200,
            status: 'accepted',
            date: ago(45),
        },
        {
            id: 2,
            provider: 'NHIMA',
            patient: 'PHA-0418',
            amount: 1850,
            status: 'pending',
            date: ago(120),
        },
        {
            id: 3,
            provider: 'ZamLife',
            patient: 'PHA-0420',
            amount: 7600,
            status: 'accepted',
            date: ago(300),
        },
        {
            id: 4,
            provider: 'Madison Health',
            patient: 'PHA-0421',
            amount: 2100,
            status: 'rejected',
            date: ago(1400),
        },
        {
            id: 5,
            provider: 'NHIMA',
            patient: 'PHA-0423',
            amount: 980,
            status: 'pending',
            date: ago(1600),
        },
    ],
    new_registrations: [
        {
            id: 1,
            name: 'Chanda Mulenga',
            patientCode: 'PHA-0501',
            date: ago(50),
            status: 'active',
        },
        {
            id: 2,
            name: 'Mutale Bwalya',
            patientCode: 'PHA-0502',
            date: ago(110),
            status: 'active',
        },
        {
            id: 3,
            name: 'Thandiwe Nkomo',
            patientCode: 'PHA-0503',
            date: ago(1000),
            status: 'active',
        },
        {
            id: 4,
            name: 'Kabwe Musonda',
            patientCode: 'PHA-0504',
            date: ago(1200),
            status: 'active',
        },
        {
            id: 5,
            name: 'Lungile Phiri',
            patientCode: 'PHA-0505',
            date: ago(2400),
            status: 'inactive',
        },
    ],
};

// ============================================
// STAT CARD
// ============================================

interface StatCardProps {
    label: string;
    value: string | number;
    fullValue?: string;
    icon: ReactNode;
    tone: string;
    hint?: string;
}

function StatCard({
    label,
    value,
    fullValue,
    icon,
    tone,
    hint,
}: StatCardProps) {
    return (
        <div
            className={cx(
                'flex min-w-0 items-center justify-between gap-2 rounded-lg px-3 py-3 shadow-sm',
                tone,
            )}
        >
            <div className="min-w-0">
                <p className="truncate text-xs font-medium text-slate-600 sm:text-sm">
                    {label}
                </p>
                <p
                    title={fullValue}
                    className="truncate text-lg leading-tight font-semibold text-slate-900 tabular-nums sm:text-xl xl:text-2xl"
                >
                    {typeof value === 'number' ? value.toLocaleString() : value}
                </p>
                {hint && (
                    <p className="truncate text-xs text-slate-500">{hint}</p>
                )}
            </div>
            <div className="shrink-0 rounded-md bg-white/60 p-1.5 text-slate-700">
                {icon}
            </div>
        </div>
    );
}

// ============================================
// DOUGHNUT (self-contained SVG)
// ============================================

const DOUGHNUT_RADIUS = 40;
const DOUGHNUT_CIRCUMFERENCE = 2 * Math.PI * DOUGHNUT_RADIUS;

interface DoughnutDatum {
    name: string;
    count: number;
    color?: string;
}

interface DoughnutProps {
    data: DoughnutDatum[];
    unit?: string;
    className?: string;
    activeIndex?: number | null;
    onActiveChange?: (index: number | null) => void;
}

function Doughnut({
    data,
    unit = 'total',
    className = 'max-w-[10rem]',
    activeIndex: activeIndexProp,
    onActiveChange,
}: DoughnutProps) {
    const [innerActive, setInnerActive] = useState<number | null>(null);
    const activeIndex =
        activeIndexProp !== undefined ? activeIndexProp : innerActive;

    const setActiveIndex = (index: number | null) => {
        setInnerActive(index);
        onActiveChange?.(index);
    };

    const total = useMemo(
        () => data.reduce((sum, d) => sum + d.count, 0),
        [data],
    );

    const segments = useMemo(() => {
        let offset = 0;
        return data.map((d, i) => {
            const length = total
                ? (d.count / total) * DOUGHNUT_CIRCUMFERENCE
                : 0;
            const segment = {
                name: d.name,
                count: d.count,
                length,
                offset,
                color: d.color ?? CHART_COLORS[i % CHART_COLORS.length],
            };
            offset += length;
            return segment;
        });
    }, [data, total]);

    const active = activeIndex === null ? null : segments[activeIndex];
    const caption = active ? active.name : unit;
    const centerValue = active ? active.count : total;
    const centerText =
        centerValue >= 1_000_000
            ? `${(centerValue / 1_000_000).toFixed(1)}M`
            : centerValue.toLocaleString();

    return (
        <div className="flex h-full items-center justify-center">
            <svg
                viewBox="0 0 100 100"
                className={cx('aspect-square w-full', className)}
                role="group"
                aria-label={`Breakdown, ${total} ${unit} in total`}
            >
                <g transform="rotate(-90 50 50)">
                    <circle
                        cx="50"
                        cy="50"
                        r={DOUGHNUT_RADIUS}
                        fill="none"
                        stroke="#e2e8f0"
                        strokeWidth="14"
                    />
                    {segments.map((s, i) => (
                        <circle
                            key={s.name}
                            cx="50"
                            cy="50"
                            r={DOUGHNUT_RADIUS}
                            fill="none"
                            stroke={s.color}
                            strokeWidth={activeIndex === i ? 16 : 14}
                            strokeDasharray={`${s.length} ${DOUGHNUT_CIRCUMFERENCE - s.length}`}
                            strokeDashoffset={-s.offset}
                            opacity={
                                activeIndex === null || activeIndex === i
                                    ? 1
                                    : 0.35
                            }
                            tabIndex={0}
                            aria-label={`${s.name}: ${s.count}`}
                            className="cursor-pointer transition-[opacity,stroke-width] duration-150 outline-none"
                            onMouseEnter={() => setActiveIndex(i)}
                            onMouseLeave={() => setActiveIndex(null)}
                            onFocus={() => setActiveIndex(i)}
                            onBlur={() => setActiveIndex(null)}
                            onClick={() =>
                                setActiveIndex(activeIndex === i ? null : i)
                            }
                        />
                    ))}
                </g>
                <text
                    x="50"
                    y="49"
                    textAnchor="middle"
                    fontSize="13"
                    fontWeight="600"
                    className="pointer-events-none fill-slate-900"
                >
                    {centerText}
                </text>
                <text
                    x="50"
                    y="60"
                    textAnchor="middle"
                    fontSize={caption.length > 14 ? 5.5 : 7}
                    className="pointer-events-none fill-slate-500"
                >
                    {caption}
                </text>
            </svg>
        </div>
    );
}

// ============================================
// SHARED CARD HEADER
// ============================================

function CardHeader({
    icon,
    title,
    subtitle,
    count,
}: {
    icon: ReactNode;
    title: string;
    subtitle?: string;
    count?: number | string;
}) {
    return (
        <header className="flex items-start justify-between gap-2">
            <div className="flex min-w-0 items-center gap-2.5">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-slate-100 text-slate-600">
                    {icon}
                </span>
                <div className="min-w-0">
                    <h3 className={cx(T.cardTitle, 'truncate')}>{title}</h3>
                    {subtitle && <p className={T.cardSub}>{subtitle}</p>}
                </div>
            </div>
            {count !== undefined && <span className={T.count}>{count}</span>}
        </header>
    );
}

// ============================================
// DOUGHNUT CARD
// ============================================

function DoughnutCard({
    title,
    subtitle,
    icon,
    data,
    unit,
}: {
    title: string;
    subtitle?: string;
    icon: ReactNode;
    data: DoughnutDatum[];
    unit: string;
}) {
    const [activeIndex, setActiveIndex] = useState<number | null>(null);
    const total = data.reduce((sum, d) => sum + d.count, 0);

    return (
        <section className="flex min-w-0 flex-col rounded-xl bg-white p-4 shadow-sm">
            <CardHeader
                icon={icon}
                title={title}
                subtitle={subtitle}
                count={total}
            />

            <div className="mt-4 flex flex-1 flex-col items-center justify-center gap-4">
                <div className="w-full max-w-[10rem]">
                    <Doughnut
                        data={data}
                        unit={unit}
                        className="max-w-[10rem]"
                        activeIndex={activeIndex}
                        onActiveChange={setActiveIndex}
                    />
                </div>
                <ul className="w-full space-y-0.5">
                    {data.map((d, i) => (
                        <li
                            key={d.name}
                            onMouseEnter={() => setActiveIndex(i)}
                            onMouseLeave={() => setActiveIndex(null)}
                            className={cx(
                                'flex items-center justify-between gap-3 rounded-md px-2 py-1 text-sm transition-colors',
                                activeIndex === i && 'bg-slate-50',
                            )}
                        >
                            <span className="flex min-w-0 items-center gap-2 text-slate-600">
                                <span
                                    className="h-2.5 w-2.5 shrink-0 rounded-full"
                                    style={{
                                        backgroundColor:
                                            d.color ??
                                            CHART_COLORS[
                                                i % CHART_COLORS.length
                                            ],
                                    }}
                                />
                                <span className="truncate">{d.name}</span>
                            </span>
                            <span className="font-medium text-slate-800 tabular-nums">
                                {d.count}
                            </span>
                        </li>
                    ))}
                </ul>
            </div>
        </section>
    );
}

// ============================================
// HORIZONTAL PROGRESS LIST
// ============================================

function ProgressList({ data }: { data: { name: string; count: number }[] }) {
    const max = Math.max(...data.map((d) => d.count), 1);
    return (
        <ul className="flex h-full flex-col justify-center gap-3">
            {data.map((item, i) => (
                <li key={item.name}>
                    <div className="mb-1 flex items-center justify-between gap-2 text-sm">
                        <span className="truncate font-medium text-slate-700">
                            {item.name}
                        </span>
                        <span className="text-slate-500 tabular-nums">
                            {item.count}
                        </span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-slate-200">
                        <div
                            className="h-full rounded-full transition-[width] duration-500"
                            style={{
                                width: `${(item.count / max) * 100}%`,
                                backgroundColor:
                                    CHART_COLORS[i % CHART_COLORS.length],
                            }}
                        />
                    </div>
                </li>
            ))}
        </ul>
    );
}

// ============================================
// RECENT ACTIVITY CARD (with inline filter)
// ============================================

type ActivityFilter =
    | 'all'
    | 'approved'
    | 'pending'
    | 'rejected'
    | 'completed'
    | 'sent';

const ACTIVITY_FILTERS: Array<{ id: ActivityFilter; label: string }> = [
    { id: 'all', label: 'All' },
    { id: 'approved', label: 'Approved' },
    { id: 'pending', label: 'Pending' },
    { id: 'rejected', label: 'Rejected' },
    { id: 'completed', label: 'Completed' },
    { id: 'sent', label: 'Sent' },
];

function FilterChip({
    label,
    count,
    active,
    onClick,
}: {
    label: string;
    count: number;
    active: boolean;
    onClick: () => void;
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            aria-pressed={active}
            className={cx(
                'rounded-full px-3 py-1 text-xs font-medium transition-colors',
                active
                    ? 'bg-slate-800 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200',
            )}
        >
            {label} ({count})
        </button>
    );
}

function RecentActivityCard({
    activities,
}: {
    activities: DashboardStats['recent_activities'];
}) {
    const [filter, setFilter] = useState<ActivityFilter>('all');
    const [query, setQuery] = useState('');

    const all = useMemo(() => asArray(activities), [activities]);

    const countFor = (id: ActivityFilter) =>
        id === 'all' ? all.length : all.filter((a) => a.status === id).length;

    const visible = useMemo(() => {
        const q = query.trim().toLowerCase();
        return all.filter((a) => {
            const matchesFilter = filter === 'all' || a.status === filter;
            const matchesQuery =
                !q ||
                [a.type, a.description, a.user, a.status].some((text) =>
                    (text ?? '').toLowerCase().includes(q),
                );
            return matchesFilter && matchesQuery;
        });
    }, [all, filter, query]);

    return (
        <section className="min-w-0 rounded-xl bg-white p-4 shadow-sm">
            <header className="mb-3 flex items-start justify-between gap-2">
                <h2 className={T.cardTitle}>Recent approvals &amp; activity</h2>
                <span className={T.count}>{visible.length}</span>
            </header>

            <div className="mb-3 space-y-2.5">
                <div className="relative">
                    <Search
                        aria-hidden="true"
                        className="pointer-events-none absolute top-1/2 left-2.5 h-4 w-4 -translate-y-1/2 text-slate-400"
                    />
                    <input
                        type="search"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="Search type, description or user"
                        aria-label="Search activity"
                        className="w-full rounded-md bg-slate-100 py-2 pr-2 pl-8 text-sm text-slate-700 placeholder:text-slate-400 focus:bg-white focus:ring-2 focus:ring-slate-200 focus:outline-none"
                    />
                </div>

                <div className="flex flex-wrap gap-1.5">
                    {ACTIVITY_FILTERS.map(({ id, label }) => (
                        <FilterChip
                            key={id}
                            label={label}
                            count={countFor(id)}
                            active={filter === id}
                            onClick={() => setFilter(id)}
                        />
                    ))}
                </div>
            </div>

            <Table className="text-sm">
                <TableHeader>
                    <TableRow>
                        <TableHead>Type</TableHead>
                        <TableHead className="hidden md:table-cell">
                            Description
                        </TableHead>
                        <TableHead className="hidden sm:table-cell">
                            User
                        </TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">When</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {visible.slice(0, 5).map((a) => (
                        <TableRow key={a.id}>
                            <TableCell className="font-medium whitespace-nowrap">
                                {a.type}
                            </TableCell>
                            <TableCell className="hidden max-w-xs truncate text-slate-600 md:table-cell">
                                {a.description}
                            </TableCell>
                            <TableCell className="hidden text-slate-600 sm:table-cell">
                                {a.user}
                            </TableCell>
                            <TableCell>
                                <span
                                    className={cx(
                                        T.badge,
                                        getStatusColor(a.status),
                                    )}
                                >
                                    {a.status}
                                </span>
                            </TableCell>
                            <TableCell className="text-right text-xs whitespace-nowrap text-slate-400 tabular-nums">
                                {formatRelative(a.date)}
                            </TableCell>
                        </TableRow>
                    ))}
                    {visible.length === 0 && (
                        <TableRow>
                            <TableCell
                                colSpan={5}
                                className="py-8 text-center text-sm text-slate-500"
                            >
                                {query.trim()
                                    ? 'No activity matches your search.'
                                    : 'No activity for this filter.'}
                            </TableCell>
                        </TableRow>
                    )}
                </TableBody>
            </Table>
        </section>
    );
}

// ============================================
// INSURANCE CLAIMS CARD
// ============================================

function InsuranceClaimsCard({
    claims,
}: {
    claims: DashboardStats['insurance_claims'];
}) {
    return (
        <section className="flex min-w-0 flex-col rounded-xl bg-white p-4 shadow-sm">
            <CardHeader
                icon={<FileText className="h-4 w-4" />}
                title="Insurance claims"
                subtitle="Accepted & pending"
                count={claims.length}
            />

            <ul className="-mx-2 mt-2 max-h-80 space-y-0.5 overflow-y-auto">
                {claims.map((c) => (
                    <li
                        key={c.id}
                        className="flex items-start gap-3 rounded-lg px-2 py-2.5 transition-colors hover:bg-slate-50"
                    >
                        <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-500">
                            <FileText className="h-4 w-4" />
                        </span>
                        <div className="min-w-0 flex-1">
                            <div className="flex items-baseline justify-between gap-2">
                                <p className="truncate text-sm font-medium text-slate-800">
                                    {c.provider}
                                </p>
                                <span className="shrink-0 text-xs text-slate-400 tabular-nums">
                                    {formatRelative(c.date)}
                                </span>
                            </div>
                            <div className="mt-0.5 flex items-center justify-between gap-2">
                                <p className={cx(T.meta, 'truncate')}>
                                    {c.patient} · {formatCurrency(c.amount)}
                                </p>
                                <span
                                    className={cx(
                                        T.badge,
                                        'shrink-0',
                                        getStatusColor(c.status),
                                    )}
                                >
                                    {c.status}
                                </span>
                            </div>
                        </div>
                    </li>
                ))}
                {claims.length === 0 && (
                    <li className="flex flex-col items-center justify-center py-10 text-center">
                        <FileText className="mb-1.5 h-6 w-6 text-slate-300" />
                        <p className="text-sm text-slate-500">
                            No claims this week.
                        </p>
                    </li>
                )}
            </ul>
        </section>
    );
}

// ============================================
// NEW REGISTRATIONS CARD
// ============================================

function NewRegistrationsCard({
    registrations,
}: {
    registrations: DashboardStats['new_registrations'];
}) {
    return (
        <section className="flex min-w-0 flex-col rounded-xl bg-white p-4 shadow-sm">
            <CardHeader
                icon={<UserPlus className="h-4 w-4" />}
                title="New patient registrations"
                subtitle="Latest sign-ups"
                count={registrations.length}
            />

            <ul className="-mx-2 mt-2 max-h-80 space-y-0.5 overflow-y-auto">
                {registrations.map((r) => (
                    <li
                        key={r.id}
                        className="flex items-center gap-3 rounded-lg px-2 py-2.5 transition-colors hover:bg-slate-50"
                    >
                        <Avatar className="h-8 w-8 shrink-0">
                            <AvatarFallback className="bg-slate-100 text-xs text-slate-600">
                                {getInitials(r.name)}
                            </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0 flex-1">
                            <div className="flex items-baseline justify-between gap-2">
                                <p className="truncate text-sm font-medium text-slate-800">
                                    {r.name}
                                </p>
                                <span className="shrink-0 text-xs text-slate-400 tabular-nums">
                                    {formatRelative(r.date)}
                                </span>
                            </div>
                            <p className={cx(T.meta, 'mt-0.5')}>
                                {r.patientCode}
                            </p>
                        </div>
                        <span
                            className={cx(
                                T.badge,
                                'shrink-0',
                                getStatusColor(r.status),
                            )}
                        >
                            {r.status}
                        </span>
                    </li>
                ))}
                {registrations.length === 0 && (
                    <li className="flex flex-col items-center justify-center py-10 text-center">
                        <UserPlus className="mb-1.5 h-6 w-6 text-slate-300" />
                        <p className="text-sm text-slate-500">
                            No new registrations.
                        </p>
                    </li>
                )}
            </ul>
        </section>
    );
}

// ============================================
// MAIN COMPONENT
// ============================================

export default function AdminDashboard(props: Partial<DashboardStats> = {}) {
    const { props: pageProps } = usePage();
    const [refreshing, setRefreshing] = useState(false);

    // Backend may pass data via Inertia props OR directly. Missing/null keys fall back to dummy data.
    const merged: DashboardStats = useMemo(() => {
        const incoming = {
            ...(pageProps as Partial<DashboardStats>),
            ...props,
        } as Record<string, unknown>;
        const cleaned = Object.fromEntries(
            Object.entries(incoming).filter(
                ([, v]) => v !== null && v !== undefined,
            ),
        );
        return { ...DUMMY_PROPS, ...cleaned } as DashboardStats;
    }, [pageProps, props]);

    const statCards = useMemo(
        () => [
            {
                label: 'Total budget',
                value: formatCompactCurrency(merged.total_budget),
                fullValue: formatCurrency(merged.total_budget),
                tone: 'bg-blue-100',
                icon: <Wallet className="h-4 w-4" />,
                hint: `${merged.budget_utilization_percentage}% utilised`,
            },
            {
                label: 'Utilised',
                value: formatCompactCurrency(merged.total_utilized),
                fullValue: formatCurrency(merged.total_utilized),
                tone: 'bg-green-100',
                icon: <PiggyBank className="h-4 w-4" />,
                hint: `${merged.budget_utilization_percentage}% of budget`,
            },
            {
                label: 'Remaining',
                value: formatCompactCurrency(merged.total_remaining),
                fullValue: formatCurrency(merged.total_remaining),
                tone: 'bg-yellow-100',
                icon: <DollarSign className="h-4 w-4" />,
                hint: 'Available balance',
            },
            {
                label: 'Pending approvals',
                value: merged.pending_approvals,
                tone: 'bg-purple-100',
                icon: <Clock className="h-4 w-4" />,
                hint: `${merged.pending_purchase_orders} POs • ${merged.pending_requisitions} reqs`,
            },
        ],
        [merged],
    );

    const paymentMethods = useMemo<DoughnutDatum[]>(
        () =>
            asArray(merged.payment_methods).map((p, i) => ({
                ...p,
                color: CHART_COLORS[i % CHART_COLORS.length],
            })),
        [merged.payment_methods],
    );

    const staffByDept = useMemo<DoughnutDatum[]>(
        () =>
            asArray(merged.staff_by_department).map((d, i) => ({
                ...d,
                color: CHART_COLORS[i % CHART_COLORS.length],
            })),
        [merged.staff_by_department],
    );

    const topServices = useMemo(
        () =>
            [...asArray(merged.top_services)].sort((a, b) => b.count - a.count),
        [merged.top_services],
    );

    const insuranceClaims = useMemo(
        () =>
            [...asArray(merged.insurance_claims)]
                .filter(
                    (c) => c.status === 'accepted' || c.status === 'pending',
                )
                .sort(
                    (a, b) =>
                        new Date(b.date).getTime() - new Date(a.date).getTime(),
                ),
        [merged.insurance_claims],
    );

    const newRegistrations = useMemo(
        () =>
            [...asArray(merged.new_registrations)].sort(
                (a, b) =>
                    new Date(b.date).getTime() - new Date(a.date).getTime(),
            ),
        [merged.new_registrations],
    );

    const budgetDoughnut = useMemo<DoughnutDatum[]>(
        () => [
            {
                name: 'Utilised',
                count: merged.total_utilized,
                color: '#16a34a',
            },
            {
                name: 'Remaining',
                count: merged.total_remaining,
                color: '#f59e0b',
            },
        ],
        [merged.total_utilized, merged.total_remaining],
    );

    const handleRefresh = async () => {
        setRefreshing(true);
        try {
            await new Promise((r) => setTimeout(r, 600));
            toast.success('Dashboard refreshed');
        } finally {
            setRefreshing(false);
        }
    };

    return (
        <AppLayout
            breadcrumbs={[
                { title: 'Home', href: '/' },
                { title: 'Dashboard', href: '/admin/dashboard' },
            ]}
        >
            <div className="min-h-screen bg-blue-50">
                <div className="p-2">
                    <PageHeader
                        icon={<Shield className="h-5 w-5" />}
                        title="Admin Dashboard"
                        subtitle="Weekly overview of facility operations"
                    >
                        <div className="flex items-center gap-2 self-center">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={handleRefresh}
                                disabled={refreshing}
                                aria-label="Refresh dashboard"
                            >
                                <RefreshCw
                                    className={cx(
                                        'h-3.5 w-3.5 sm:mr-1.5',
                                        refreshing && 'animate-spin',
                                    )}
                                />
                                <span className="hidden sm:inline">
                                    Refresh
                                </span>
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                aria-label="Export dashboard"
                            >
                                <Download className="h-3.5 w-3.5 sm:mr-1.5" />
                                <span className="hidden sm:inline">Export</span>
                            </Button>
                        </div>
                    </PageHeader>
                </div>

                <div className="grid grid-cols-1 gap-4 p-3 sm:p-4 lg:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)] lg:items-start">
                    {/* ================= LEFT COLUMN ================= */}
                    <div className="flex min-w-0 flex-col gap-4">
                        <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
                            {statCards.map((card) => (
                                <StatCard key={card.label} {...card} />
                            ))}
                        </div>

                        <section className="min-w-0 rounded-xl bg-white p-4 shadow-sm">
                            <h2
                                className={cx(
                                    T.cardTitle,
                                    'mb-3 flex items-center gap-2',
                                )}
                            >
                                <CreditCard className="h-4 w-4 text-slate-500" />
                                Financials
                            </h2>
                            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                                <div className="min-w-0">
                                    <p className={cx(T.cardSub, 'mb-2')}>
                                        Budget allocation vs utilisation
                                    </p>
                                    <div className="flex flex-col items-center gap-3">
                                        <div className="w-full max-w-[10rem]">
                                            <Doughnut
                                                data={budgetDoughnut}
                                                unit="ZMW"
                                                className="max-w-[10rem]"
                                            />
                                        </div>
                                        <ul className="flex flex-wrap justify-center gap-x-4 gap-y-1 text-sm text-slate-600">
                                            {budgetDoughnut.map((d) => (
                                                <li
                                                    key={d.name}
                                                    className="flex items-center gap-1.5"
                                                >
                                                    <span
                                                        className="h-2.5 w-2.5 rounded-full"
                                                        style={{
                                                            backgroundColor:
                                                                d.color,
                                                        }}
                                                    />
                                                    {d.name}
                                                    <span className="font-medium text-slate-800 tabular-nums">
                                                        {formatCompactCurrency(
                                                            d.count,
                                                        )}
                                                    </span>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                </div>
                                <div className="min-w-0">
                                    <p className={cx(T.cardSub, 'mb-2')}>
                                        Top services this week
                                    </p>
                                    <ProgressList data={topServices} />
                                </div>
                            </div>
                        </section>

                        <RecentActivityCard
                            activities={merged.recent_activities}
                        />
                    </div>

                    {/* ================= RIGHT RAIL ================= */}
                    <div className="grid min-w-0 grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-1 2xl:grid-cols-2">
                        <DoughnutCard
                            title="Payment methods"
                            subtitle="This week"
                            icon={<CreditCard className="h-4 w-4" />}
                            data={paymentMethods}
                            unit="payments"
                        />
                        <DoughnutCard
                            title="Staff by department"
                            subtitle="Active users"
                            icon={<Users className="h-4 w-4" />}
                            data={staffByDept}
                            unit="staff"
                        />
                        <InsuranceClaimsCard claims={insuranceClaims} />
                        <NewRegistrationsCard
                            registrations={newRegistrations}
                        />
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}
