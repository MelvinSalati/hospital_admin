// components/dashboard/pharmacy-dashboard.tsx

import { useMemo, useState, type ComponentType, type ReactNode } from 'react';
import {
    AlertTriangle,
    Bell,
    ClipboardList,
    CreditCard,
    Eye,
    Package,
    Pill,
    Search,
    TrendingDown,
    UserCheck,
    Users,
} from 'lucide-react';
import AppLayout from '@/layouts/app/app-header-layout';
import PageHeader from '@/components/PageHeader';
import BottleShowcase, { type BottleItem } from '@/components/bottle-showcase';
import bpcImage from './images/bpc-tb-500.png';
import foundayoImage from './images/fundayo.png';

// ─── Types ────────────────────────────────────────────────────

type IconComponent = ComponentType<{ className?: string }>;

export type QueueStatus = 'waiting' | 'preparing' | 'ready';
export type AlertFlag = 'attention' | 'completed';
export type AlertCategory =
    | 'expiring'
    | 'low-stock'
    | 'restock'
    | 'dispensed'
    | 'expired-removed'
    | 'general';

export interface PharmacyStats {
    prescriptions: number;
    productsDispensed: number;
    patientsServed: number;
    patientsInQueue: number;
}

export interface TopDrug {
    name: string;
    count: number;
}

export interface QueuePatient {
    id: number;
    patientCode: string;
    name: string;
    prescription: string;
    waitingMinutes: number;
    status: QueueStatus;
}

export interface PharmacyAlert {
    id: number;
    patientCode: string;
    name: string; // patient / staff name (always masked in the UI)
    item: string; // drug name
    value: string; // e.g. "12 units left"
    flag: AlertFlag;
    category: AlertCategory;
    createdAt: string; // ISO timestamp — only the last 7 days are shown
}

export interface PharmacyDashboardProps {
    stats: PharmacyStats;
    topDrugs: TopDrug[];
    queue: QueuePatient[];
    alerts: PharmacyAlert[];
}

// ─── Constants ────────────────────────────────────────────────

const MASK = '******';
const QUEUE_PREVIEW_LIMIT = 4;
const TOP_DRUGS_LIMIT = 4;
const ALERT_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;
const CHART_COLORS = ['#2563eb', '#16a34a', '#d97706', '#9333ea'] as const;

// ─── Dummy data (used when no props are supplied) ─────────────

const minutesAgo = (minutes: number) =>
    new Date(Date.now() - minutes * 60_000).toISOString();

export const DUMMY_PROPS: PharmacyDashboardProps = {
    stats: {
        prescriptions: 86,
        productsDispensed: 214,
        patientsServed: 67,
        patientsInQueue: 9,
    },
    topDrugs: [
        { name: 'Amoxicillin 500mg', count: 42 },
        { name: 'Paracetamol 500mg', count: 36 },
        { name: 'Ibuprofen 400mg', count: 28 },
        { name: 'Omeprazole 20mg', count: 19 },
    ],
    queue: [
        {
            id: 1,
            patientCode: 'PHA-0412',
            name: 'John Doe',
            prescription: 'Amoxicillin, Paracetamol',
            waitingMinutes: 14,
            status: 'waiting',
        },
        {
            id: 2,
            patientCode: 'PHA-0413',
            name: 'Jane Smith',
            prescription: 'Ibuprofen',
            waitingMinutes: 9,
            status: 'preparing',
        },
        {
            id: 3,
            patientCode: 'PHA-0414',
            name: 'Amir Khan',
            prescription: 'Omeprazole, Metformin',
            waitingMinutes: 6,
            status: 'ready',
        },
        {
            id: 4,
            patientCode: 'PHA-0415',
            name: 'Maria Garcia',
            prescription: 'Lisinopril',
            waitingMinutes: 3,
            status: 'waiting',
        },
        {
            id: 5,
            patientCode: 'PHA-0416',
            name: 'Chen Wei',
            prescription: 'Amoxicillin, Aspirin',
            waitingMinutes: 1,
            status: 'preparing',
        },
    ],
    alerts: [
        {
            id: 1,
            patientCode: 'PHA-0420',
            name: 'Fatima Noor',
            item: 'Insulin Glargine',
            value: 'Awaiting stock',
            flag: 'attention',
            category: 'low-stock',
            createdAt: minutesAgo(20),
        },
        {
            id: 2,
            patientCode: 'PHA-0421',
            name: 'David Lee',
            item: 'Morphine 10mg',
            value: 'Controlled drug',
            flag: 'attention',
            category: 'expiring',
            createdAt: minutesAgo(45),
        },
        {
            id: 3,
            patientCode: 'PHA-0422',
            name: 'Sara Ahmed',
            item: 'Amoxicillin 500mg',
            value: 'Dispensed',
            flag: 'completed',
            category: 'dispensed',
            createdAt: minutesAgo(600),
        },
        {
            id: 4,
            patientCode: 'PHA-0423',
            name: 'Tom Brown',
            item: 'Paracetamol 500mg',
            value: 'Dispensed',
            flag: 'completed',
            category: 'dispensed',
            createdAt: minutesAgo(615),
        },
        {
            id: 5,
            patientCode: 'PHA-0424',
            name: 'Elena Petrova',
            item: 'Ibuprofen 400mg',
            value: 'Dispensed',
            flag: 'completed',
            category: 'dispensed',
            createdAt: minutesAgo(660),
        },
    ],
};

// ─── Helpers ──────────────────────────────────────────────────

const maskName = (_name: string) => MASK;

const formatRelative = (iso: string) => {
    const minutes = Math.max(
        0,
        Math.floor((Date.now() - new Date(iso).getTime()) / 60_000),
    );
    if (minutes < 60) return `${minutes}m ago`;

    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;

    return `${Math.floor(hours / 24)}d ago`;
};

const isWithinLastWeek = (iso: string) => {
    const age = Date.now() - new Date(iso).getTime();
    return age >= 0 && age <= ALERT_WINDOW_MS;
};

const asArray = <T,>(value: T[] | null | undefined): T[] =>
    Array.isArray(value) ? value : [];

const cx = (...classes: Array<string | false | null | undefined>) =>
    classes.filter(Boolean).join(' ');

// ─── Stat card ────────────────────────────────────────────────

interface StatCardProps {
    label: string;
    value: number;
    icon: ReactNode;
    tone: string;
}

function StatCard({ label, value, icon, tone }: StatCardProps) {
    return (
        <div
            className={cx(
                'flex items-center justify-between gap-2 rounded-lg px-3 py-2.5 shadow-sm',
                tone,
            )}
        >
            <div className="min-w-0">
                <p className="truncate text-[clamp(0.65rem,0.9vw,0.8rem)] font-medium text-slate-600">
                    {label}
                </p>
                <p className="text-[clamp(1.25rem,2vw,1.75rem)] leading-tight font-semibold text-slate-900">
                    {value.toLocaleString()}
                </p>
            </div>
            <div className="shrink-0 rounded-md bg-white/60 p-1.5 text-slate-700">
                {icon}
            </div>
        </div>
    );
}

const buildStatCards = (stats: PharmacyStats): StatCardProps[] => [
    {
        label: 'Prescriptions',
        value: stats.prescriptions,
        tone: 'bg-green-100',
        icon: <ClipboardList className="h-4 w-4" />,
    },
    {
        label: 'Products dispensed',
        value: stats.productsDispensed,
        tone: 'bg-yellow-100',
        icon: <Pill className="h-4 w-4" />,
    },
    {
        label: 'Patients served',
        value: stats.patientsServed,
        tone: 'bg-blue-100',
        icon: <UserCheck className="h-4 w-4" />,
    },
    {
        label: 'In queue',
        value: stats.patientsInQueue,
        tone: 'bg-green-100',
        icon: <Users className="h-4 w-4" />,
    },
];

// ─── Doughnut (SVG, no chart dependency) ──────────────────────

const DOUGHNUT_RADIUS = 40;
const DOUGHNUT_CIRCUMFERENCE = 2 * Math.PI * DOUGHNUT_RADIUS;

interface DoughnutDatum {
    name: string;
    count: number;
    color?: string;
}

interface DoughnutProps {
    data: DoughnutDatum[];
    unit?: string; // centre caption when nothing is hovered
    className?: string; // size cap, e.g. "max-w-[7rem]"
    activeIndex?: number | null; // optional: controlled hover (e.g. from a legend)
    onActiveChange?: (index: number | null) => void;
}

/** Hover (or focus) a segment to see its exact count in the centre. */
function Doughnut({
    data,
    unit = 'units',
    className = 'max-w-[11rem]',
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
                        />
                    ))}
                </g>
                <text
                    x="50"
                    y="48"
                    textAnchor="middle"
                    className="pointer-events-none fill-slate-900 text-[14px] font-semibold"
                >
                    {active ? active.count : total}
                </text>
                <text
                    x="50"
                    y="60"
                    textAnchor="middle"
                    className={cx(
                        'pointer-events-none fill-slate-500',
                        caption.length > 14 ? 'text-[5.5px]' : 'text-[7px]',
                    )}
                >
                    {caption}
                </text>
            </svg>
        </div>
    );
}

// ─── Horizontal progress list ─────────────────────────────────

function DrugProgress({ data }: { data: TopDrug[] }) {
    const max = Math.max(...data.map((d) => d.count), 1);

    return (
        <ul className="flex h-full flex-col justify-center gap-3">
            {data.map((drug, i) => (
                <li key={drug.name}>
                    <div className="mb-1 flex items-center justify-between text-[clamp(0.7rem,0.95vw,0.85rem)]">
                        <span className="truncate font-medium text-slate-700">
                            {drug.name}
                        </span>
                        <span className="text-slate-500 tabular-nums">
                            {drug.count}
                        </span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-slate-200">
                        <div
                            className="h-full rounded-full transition-[width] duration-500"
                            style={{
                                width: `${(drug.count / max) * 100}%`,
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

// ─── Queue table ──────────────────────────────────────────────

const QUEUE_STATUS_STYLE: Record<QueueStatus, string> = {
    waiting: 'bg-yellow-100 text-yellow-800',
    preparing: 'bg-blue-100 text-blue-800',
    ready: 'bg-green-100 text-green-800',
};

const QUEUE_COLUMNS = ['Patient', 'Ref', 'Prescription', 'Waiting', 'Status'];

function QueueTable({ rows }: { rows: QueuePatient[] }) {
    const visibleRows = rows.slice(0, QUEUE_PREVIEW_LIMIT);

    return (
        <div className="overflow-x-auto">
            <table className="w-full text-left text-[clamp(0.7rem,0.95vw,0.85rem)]">
                <thead className="text-slate-500">
                    <tr className="border-b border-slate-200">
                        {QUEUE_COLUMNS.map((col) => (
                            <th key={col} className="py-2 pr-3 font-medium">
                                {col}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {visibleRows.map((p) => (
                        <tr
                            key={p.id}
                            className="border-b border-slate-100 last:border-0"
                        >
                            <td className="py-2 pr-3 font-medium tracking-wider text-slate-800">
                                {maskName(p.name)}
                            </td>
                            <td className="py-2 pr-3 text-slate-600">
                                {p.patientCode}
                            </td>
                            <td className="py-2 pr-3 text-slate-600">
                                {p.prescription}
                            </td>
                            <td className="py-2 pr-3 text-slate-600 tabular-nums">
                                {p.waitingMinutes} min
                            </td>
                            <td className="py-2">
                                <span
                                    className={cx(
                                        'rounded-full px-2 py-0.5 text-xs font-medium capitalize',
                                        QUEUE_STATUS_STYLE[p.status],
                                    )}
                                >
                                    {p.status}
                                </span>
                            </td>
                        </tr>
                    ))}
                    {visibleRows.length === 0 && (
                        <tr>
                            <td
                                colSpan={QUEUE_COLUMNS.length}
                                className="py-6 text-center text-slate-500"
                            >
                                No patients in the queue.
                            </td>
                        </tr>
                    )}
                </tbody>
            </table>
        </div>
    );
}

// ─── Notification styling ─────────────────────────────────────

interface CategoryStyle {
    label: string;
    icon: IconComponent;
    color: string; // used only for the chart segments and the small status dot
}

const CATEGORY_STYLE: Record<AlertCategory, CategoryStyle> = {
    expiring: { label: 'Expiring', icon: Eye, color: '#d97706' },
    'low-stock': { label: 'Low stock', icon: AlertTriangle, color: '#dc2626' },
    restock: { label: 'Restock', icon: Package, color: '#2563eb' },
    dispensed: { label: 'Dispensed', icon: Pill, color: '#059669' },
    'expired-removed': {
        label: 'Removed',
        icon: TrendingDown,
        color: '#64748b',
    },
    general: { label: 'Info', icon: Bell, color: '#7c3aed' },
};

// The backend may send a category we don't know yet: fall back to "general".
const styleOf = (category: AlertCategory) =>
    CATEGORY_STYLE[category] ?? CATEGORY_STYLE.general;

interface SummaryTheme {
    title: string;
    subtitle: string;
    emptyText: string;
    icon: IconComponent;
}

const SUMMARY_THEME: Record<AlertFlag, SummaryTheme> = {
    attention: {
        title: 'Needs attention',
        subtitle: 'Expiring, low stock & restock',
        emptyText: 'Nothing needs attention this week.',
        icon: AlertTriangle,
    },
    completed: {
        title: 'Completed',
        subtitle: 'Dispensed, removed & resolved',
        emptyText: 'No completed items this week.',
        icon: Eye,
    },
};

// ─── Doughnut summary card (one per flag, each its own white card) ───

function AlertSummaryCard({
    flag,
    alerts,
}: {
    flag: AlertFlag;
    alerts: PharmacyAlert[];
}) {
    const theme = SUMMARY_THEME[flag];
    const HeaderIcon = theme.icon;
    const [activeIndex, setActiveIndex] = useState<number | null>(null);

    const data = useMemo<DoughnutDatum[]>(() => {
        const counts = new Map<AlertCategory, number>();

        asArray(alerts)
            .filter((a) => a.flag === flag && isWithinLastWeek(a.createdAt))
            .forEach((a) =>
                counts.set(a.category, (counts.get(a.category) ?? 0) + 1),
            );

        return Array.from(counts, ([category, count]) => ({
            name: styleOf(category).label,
            count,
            color: styleOf(category).color,
        }));
    }, [alerts, flag]);

    const total = data.reduce((sum, d) => sum + d.count, 0);

    return (
        <section className="flex min-h-[17rem] flex-1 flex-col rounded-xl bg-white p-4 shadow-sm">
            <header className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2.5">
                    <span className="flex h-7 w-7 items-center justify-center rounded-md bg-slate-100 text-slate-600">
                        <HeaderIcon className="h-3.5 w-3.5" />
                    </span>
                    <div>
                        <h3 className="text-sm leading-tight font-semibold text-slate-800">
                            {theme.title}
                        </h3>
                        <p className="text-[11px] text-slate-500">
                            {theme.subtitle}
                        </p>
                    </div>
                </div>
                <span className="text-lg font-semibold text-slate-900 tabular-nums">
                    {total}
                </span>
            </header>

            {total === 0 ? (
                <p className="flex flex-1 items-center justify-center text-center text-xs text-slate-500">
                    {theme.emptyText}
                </p>
            ) : (
                <div className="mt-3 flex flex-1 flex-col items-center justify-center gap-4">
                    <div className="w-full max-w-[9rem]">
                        <Doughnut
                            data={data}
                            unit="this week"
                            className="max-w-[9rem]"
                            activeIndex={activeIndex}
                            onActiveChange={setActiveIndex}
                        />
                    </div>
                    <ul className="w-full space-y-1">
                        {data.map((d, i) => (
                            <li
                                key={d.name}
                                onMouseEnter={() => setActiveIndex(i)}
                                onMouseLeave={() => setActiveIndex(null)}
                                className={cx(
                                    'flex items-center justify-between gap-3 rounded-md px-2 py-1 text-xs transition-colors',
                                    activeIndex === i && 'bg-slate-50',
                                )}
                            >
                                <span className="flex min-w-0 items-center gap-2 text-slate-600">
                                    <span
                                        className="h-2 w-2 shrink-0 rounded-full"
                                        style={{ backgroundColor: d.color }}
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
            )}
        </section>
    );
}

// ─── Single notification row (no borders, no tinted backgrounds) ───

function NotificationRow({ alert }: { alert: PharmacyAlert }) {
    const style = styleOf(alert.category);
    const Icon = style.icon;

    return (
        <li className="flex items-start gap-3 rounded-lg px-2.5 py-2.5 transition-colors hover:bg-slate-50">
            <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-500">
                <Icon className="h-4 w-4" />
            </span>

            <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-2">
                    <p className="truncate text-sm font-medium text-slate-800">
                        {alert.item}
                    </p>
                    <span className="shrink-0 text-[11px] text-slate-400 tabular-nums">
                        {formatRelative(alert.createdAt)}
                    </span>
                </div>

                <p className="mt-0.5 text-xs text-slate-500">
                    {maskName(alert.name)} · {alert.patientCode}
                </p>

                <div className="mt-1 flex items-center justify-between gap-2 text-xs">
                    <span className="inline-flex items-center gap-1.5 text-slate-500">
                        <span
                            className="h-1.5 w-1.5 rounded-full"
                            style={{ backgroundColor: style.color }}
                        />
                        {style.label}
                    </span>
                    <span className="font-medium text-slate-700">
                        {alert.value}
                    </span>
                </div>
            </div>
        </li>
    );
}

// ─── Filter chip ──────────────────────────────────────────────

interface FilterChipProps {
    label: string;
    count: number;
    active: boolean;
    onClick: () => void;
}

function FilterChip({ label, count, active, onClick }: FilterChipProps) {
    return (
        <button
            type="button"
            onClick={onClick}
            aria-pressed={active}
            className={cx(
                'rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors',
                active
                    ? 'bg-slate-800 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200',
            )}
        >
            {label} ({count})
        </button>
    );
}

// ─── Notification feed (all notifications, one list) ──────────

type FeedFilter = 'all' | AlertFlag;

const FEED_FILTERS: Array<{ id: FeedFilter; label: string }> = [
    { id: 'all', label: 'All' },
    { id: 'attention', label: 'Needs attention' },
    { id: 'completed', label: 'Completed' },
];

function NotificationFeed({ alerts }: { alerts: PharmacyAlert[] }) {
    const [filter, setFilter] = useState<FeedFilter>('all');
    const [query, setQuery] = useState('');

    const recent = useMemo(
        () => asArray(alerts).filter((a) => isWithinLastWeek(a.createdAt)),
        [alerts],
    );

    const countFor = (id: FeedFilter) =>
        id === 'all'
            ? recent.length
            : recent.filter((a) => a.flag === id).length;

    const visible = useMemo(() => {
        const q = query.trim().toLowerCase();

        // patient names are masked in the UI, so they are not searchable
        const matchesQuery = (a: PharmacyAlert) =>
            !q ||
            [a.item, a.patientCode, a.value, styleOf(a.category).label].some(
                (text) => text.toLowerCase().includes(q),
            );

        return recent
            .filter(
                (a) =>
                    (filter === 'all' || a.flag === filter) && matchesQuery(a),
            )
            .sort(
                (a, b) =>
                    new Date(b.createdAt).getTime() -
                    new Date(a.createdAt).getTime(),
            );
    }, [recent, filter, query]);

    return (
        <section className="flex h-full min-h-0 flex-col rounded-xl bg-white shadow-sm">
            <header className="flex items-start justify-between gap-2 px-4 pt-4">
                <div>
                    <h3 className="text-sm leading-tight font-semibold text-slate-800">
                        Notifications
                    </h3>
                    <p className="text-[11px] text-slate-500">Last 7 days</p>
                </div>
                <span className="text-lg font-semibold text-slate-900 tabular-nums">
                    {recent.length}
                </span>
            </header>

            <div className="space-y-2.5 px-4 pt-3 pb-2">
                <div className="relative">
                    <Search
                        aria-hidden="true"
                        className="pointer-events-none absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2 text-slate-400"
                    />
                    <input
                        type="search"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="Search item, ref or status"
                        aria-label="Search notifications"
                        className="w-full rounded-md bg-slate-100 py-1.5 pr-2 pl-8 text-xs text-slate-700 placeholder:text-slate-400 focus:bg-white focus:ring-2 focus:ring-slate-200 focus:outline-none"
                    />
                </div>

                <div className="flex flex-wrap gap-1.5">
                    {FEED_FILTERS.map(({ id, label }) => (
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

            <ul className="min-h-0 flex-1 space-y-0.5 overflow-y-auto px-1.5 pb-2">
                {visible.map((a) => (
                    <NotificationRow key={a.id} alert={a} />
                ))}
                {visible.length === 0 && (
                    <li className="flex flex-col items-center justify-center py-10 text-center">
                        <Bell className="mb-1.5 h-6 w-6 text-slate-300" />
                        <p className="text-xs text-slate-500">
                            {query.trim()
                                ? 'No notifications match your search.'
                                : 'No notifications this week.'}
                        </p>
                    </li>
                )}
            </ul>
        </section>
    );
}

// ─── Right rail: doughnut cards | notification feed ───────────

function NotificationsPanel({ alerts }: { alerts: PharmacyAlert[] }) {
    return (
        <div className="grid h-full min-h-0 grid-cols-1 gap-3 overflow-y-auto xl:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)] xl:overflow-visible">
            {/* column 1: the gap between the cards shows the parent background */}
            <div className="flex h-full min-h-0 flex-col gap-3 xl:overflow-y-auto">
                <AlertSummaryCard flag="attention" alerts={alerts} />
                <AlertSummaryCard flag="completed" alerts={alerts} />
            </div>

            {/* column 2: the notifications themselves */}
            <div className="h-96 min-h-0 xl:h-full">
                <NotificationFeed alerts={alerts} />
            </div>
        </div>
    );
}

// ─── Main layout ──────────────────────────────────────────────

export default function PharmacyDashboard({
    stats: statsProp,
    topDrugs: topDrugsProp,
    queue: queueProp,
    alerts: alertsProp,
}: Partial<PharmacyDashboardProps> = {}) {
    // `null` or a wrong shape from the backend must not crash the page

    const stats = statsProp ?? DUMMY_PROPS.stats;
    const topDrugs = asArray(topDrugsProp ?? DUMMY_PROPS.topDrugs);
    const queue = asArray(queueProp ?? DUMMY_PROPS.queue);
    const alerts = asArray(alertsProp ?? DUMMY_PROPS.alerts);

    const statCards = useMemo(() => buildStatCards(stats), [stats]);

    const topDrugsRanked = useMemo(
        () =>
            [...topDrugs]
                .sort((a, b) => b.count - a.count)
                .slice(0, TOP_DRUGS_LIMIT),
        [topDrugs],
    );

    const bottles = useMemo<BottleItem[]>(() => {
        // total drugs ordered across everyone waiting in the queue
        const orderedInQueue = queue.reduce(
            (sum, p) => sum + p.prescription.split(',').filter(Boolean).length,
            0,
        );
        const needsAttention = alerts.filter(
            (a) => a.flag === 'attention' && isWithinLastWeek(a.createdAt),
        ).length;

        return [
            {
                src: bpcImage,
                label: 'Ordered in queue',
                count: orderedInQueue,
                tone: 'amber',
            },
            {
                src: foundayoImage,
                label: 'Dispensed',
                count: stats.productsDispensed,
                tone: 'emerald',
            },
            {
                src: bpcImage,
                label: 'Needs attention',
                count: needsAttention,
                tone: 'rose',
            },
        ];
    }, [queue, alerts, stats.productsDispensed]);

    return (
        <AppLayout
            breadcrumbs={[
                { href: '/dashboard', title: 'Altaf Memorial Hospital' },
                { href: '/dashboard', title: 'Dashboard' },
                { href: '', title: 'Pharmacy' },
            ]}
        >
            <div>
                <PageHeader
                    icon={<Package className="h-5 w-5" />}
                    title="Pharmacy Department"
                    subtitle="Manage dispensing queue, prescriptions, and pharmacy workflow"
                >
                    <BottleShowcase bottles={bottles} className="self-center" />
                </PageHeader>
            </div>

            <div className="grid h-screen grid-cols-1 gap-4 overflow-hidden bg-blue-50 p-4 lg:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)]">
                {/* LEFT */}
                <div className="flex min-h-0 flex-col gap-4 overflow-y-auto">
                    <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
                        {statCards.map((card) => (
                            <StatCard key={card.label} {...card} />
                        ))}
                    </div>

                    <section className="rounded-xl bg-white p-4 shadow-sm">
                        <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-800">
                            <CreditCard className="h-4 w-4 text-slate-500" />
                            Most dispensed drugs
                        </h2>
                        <div className="grid grid-cols-2 gap-4">
                            <Doughnut data={topDrugsRanked} />
                            <DrugProgress data={topDrugsRanked} />
                        </div>
                    </section>

                    <section className="rounded-xl bg-white p-4 shadow-sm">
                        <h2 className="mb-2 text-sm font-semibold text-slate-800">
                            Patients in queue
                        </h2>
                        <QueueTable rows={queue} />
                    </section>
                </div>

                {/* RIGHT */}
                <div className="min-h-0">
                    <NotificationsPanel alerts={alerts} />
                </div>
            </div>
        </AppLayout>
    );
}
