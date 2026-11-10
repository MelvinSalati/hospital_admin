// pages/pharmacy/stock-monitoring.tsx

import React, { useMemo, useState } from 'react';
import { Head, router } from '@inertiajs/react';
import {
    Boxes,
    Package,
    PackageCheck,
    PackageX,
    TrendingDown,
    Clock,
    Layers,
    Search,
    RotateCcw,
    RefreshCw,
    ArrowDownToLine,
    ArrowUpFromLine,
    Activity,
} from 'lucide-react';
import AppLayout from '@/layouts/app-layout';

// ---------- Types ----------
interface BatchRow {
    id: number;
    product_id: number;
    product_name: string;
    product_sku: string | null;
    pack_size?: number | null;
    batch_number: string;
    expiry_date: string | null;
    days_to_expiry: number | null;
    received_quantity: number;
    remaining_quantity: number;
    dispensed_quantity: number;
    original_quantity: number;
    status: 'ok' | 'expired' | 'expiring_soon' | 'low_stock' | 'depleted';
    batch_status: string;
    location: string | null;
    supplier_id: number | null;
    created_at: string | null;
}

interface DeptMovement {
    department_id: number;
    department_name: string;
    total_in: number;
    total_dispensed: number;
    total_returned: number;
    total_expired_writeoff: number;
    total_damaged: number;
}

// ✅ Product movement now split by category (matches new backend)
interface ProductMovement {
    product_id: number;
    product_name: string;
    product_sku: string | null;
    pack_size?: number | null;
    total_in: number;
    total_dispensed: number;
    total_transferred_out: number;
    total_expired: number;
    total_damaged: number;
    movement_count: number;
    last_movement: string | null;
}

interface Summary {
    total_batches: number;
    total_received: number;
    total_remaining: number;
    total_dispensed: number;
    expired_count: number;
    expiring_soon_count: number;
    low_stock_count: number;
    depleted_count: number;
    expired_value_units: number;
    expiring_units: number;
}

interface Filters {
    department_id: number | null;
    expiry_window: number;
    search: string | null;
    show_depleted: boolean;
}

interface Props {
    summary: Summary;
    batches: BatchRow[];
    expired: BatchRow[];
    expiringSoon: BatchRow[];
    lowStock: BatchRow[];
    depleted: BatchRow[];
    deptMovement: DeptMovement[];
    productMovement: ProductMovement[];
    departments: { id: number; name: string }[];
    filters: Filters;
}

// ---------- Palette ----------
const PALETTE = {
    sky: '#0ea5e9',
    indigo: '#6366f1',
    emerald: '#10b981',
    violet: '#a855f7',
    rose: '#f43f5e',
    amber: '#f59e0b',
    orange: '#f97316',
    slate: '#94a3b8',
} as const;

type Tone = keyof typeof PALETTE;

// ---------- Helpers ----------
const STATUS_META: Record<
    string,
    { label: string; chip: string; dot: string; color: string }
> = {
    ok: {
        label: 'In Stock',
        chip: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-600/20',
        dot: 'bg-emerald-500',
        color: PALETTE.emerald,
    },
    expired: {
        label: 'Expired',
        chip: 'bg-red-50 text-red-700 ring-1 ring-red-600/20',
        dot: 'bg-red-500',
        color: PALETTE.rose,
    },
    expiring_soon: {
        label: 'Expiring',
        chip: 'bg-amber-50 text-amber-700 ring-1 ring-amber-600/20',
        dot: 'bg-amber-500',
        color: PALETTE.amber,
    },
    low_stock: {
        label: 'Low Stock',
        chip: 'bg-orange-50 text-orange-700 ring-1 ring-orange-600/20',
        dot: 'bg-orange-500',
        color: PALETTE.orange,
    },
    depleted: {
        label: 'Depleted',
        chip: 'bg-slate-100 text-slate-600 ring-1 ring-slate-600/20',
        dot: 'bg-slate-400',
        color: PALETTE.slate,
    },
};

const fmt = (n: number | null | undefined) =>
    n === null || n === undefined ? '—' : new Intl.NumberFormat().format(n);

const fmtQty = (
    units: number | null | undefined,
    packSize?: number | null,
): string => {
    if (units === null || units === undefined) return '—';
    const size = Math.max(1, Number(packSize) || 1);
    if (size <= 1) return fmt(units);

    const abs = Math.abs(units);
    const packs = Math.floor(abs / size) * (units < 0 ? -1 : 1);
    const loose = abs % size;

    const parts: string[] = [];
    if (packs) {
        parts.push(`${fmt(packs)} ${Math.abs(packs) === 1 ? 'pack' : 'packs'}`);
    }
    if (loose) parts.push(`${loose} loose`);

    return parts.length ? parts.join(' + ') : '0';
};

const hasPacks = (packSize?: number | null) => (Number(packSize) || 1) > 1;

const pct = (part: number, total: number) => {
    if (!total) return 0;
    return Math.min(100, Math.round((part / total) * 100));
};

const cx = (...classes: Array<string | false | null | undefined>) =>
    classes.filter(Boolean).join(' ');

// ---------- Quantity cell ----------
function QtyCell({
    units,
    packSize,
    strong = false,
}: {
    units: number;
    packSize?: number | null;
    strong?: boolean;
}) {
    return (
        <div>
            <div className={strong ? 'font-semibold text-slate-900' : ''}>
                {fmtQty(units, packSize)}
            </div>
            {hasPacks(packSize) && (
                <div className="text-[10px] font-normal text-slate-400">
                    {fmt(units)} units
                </div>
            )}
        </div>
    );
}

// ---------- Doughnut ----------
interface DonutDatum {
    name: string;
    count: number;
    color: string;
}

function Doughnut({
    data,
    centerLabel,
    centerValue,
    size = 160,
    thickness = 18,
}: {
    data: DonutDatum[];
    centerLabel: string;
    centerValue: string | number;
    size?: number;
    thickness?: number;
}) {
    const [hovered, setHovered] = useState<number | null>(null);

    const total = data.reduce((s, d) => s + d.count, 0);
    const radius = (size - thickness) / 2;
    const circumference = 2 * Math.PI * radius;

    let offset = 0;
    const segments = data.map((d) => {
        const length = total ? (d.count / total) * circumference : 0;
        const seg = { ...d, length, offset };
        offset += length;
        return seg;
    });

    const active = hovered !== null ? data[hovered] : null;

    return (
        <div
            className="relative inline-flex items-center justify-center"
            style={{ width: size, height: size }}
        >
            <svg width={size} height={size} className="-rotate-90">
                <circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    fill="none"
                    stroke="#f1f5f9"
                    strokeWidth={thickness}
                />
                {segments.map((s, i) => (
                    <circle
                        key={s.name}
                        cx={size / 2}
                        cy={size / 2}
                        r={radius}
                        fill="none"
                        stroke={s.color}
                        strokeWidth={hovered === i ? thickness + 3 : thickness}
                        strokeDasharray={`${s.length} ${circumference - s.length}`}
                        strokeDashoffset={-s.offset}
                        strokeLinecap="round"
                        opacity={hovered === null || hovered === i ? 1 : 0.25}
                        className="cursor-pointer transition-all duration-200"
                        onMouseEnter={() => setHovered(i)}
                        onMouseLeave={() => setHovered(null)}
                    />
                ))}
            </svg>
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-xl font-bold tracking-tight text-slate-900 tabular-nums">
                    {active ? active.count : centerValue}
                </span>
                <span className="max-w-[80%] truncate text-[10px] font-medium text-slate-400">
                    {active ? active.name : centerLabel}
                </span>
            </div>
        </div>
    );
}

// ---------- Radial progress ring ----------
function RadialRing({
    value,
    max,
    label,
    sublabel,
    color,
    size = 92,
    thickness = 8,
}: {
    value: number;
    max: number;
    label: string;
    sublabel?: string;
    color: string;
    size?: number;
    thickness?: number;
}) {
    const pctVal = max > 0 ? Math.min(100, (value / max) * 100) : 0;
    const radius = (size - thickness) / 2;
    const circumference = 2 * Math.PI * radius;
    const dash = (pctVal / 100) * circumference;

    return (
        <div className="flex flex-col items-center gap-1.5">
            <div className="relative" style={{ width: size, height: size }}>
                <svg width={size} height={size} className="-rotate-90">
                    <circle
                        cx={size / 2}
                        cy={size / 2}
                        r={radius}
                        fill="none"
                        stroke="#f1f5f9"
                        strokeWidth={thickness}
                    />
                    <circle
                        cx={size / 2}
                        cy={size / 2}
                        r={radius}
                        fill="none"
                        stroke={color}
                        strokeWidth={thickness}
                        strokeDasharray={`${dash} ${circumference - dash}`}
                        strokeLinecap="round"
                        className="transition-[stroke-dasharray] duration-700"
                    />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-sm font-bold text-slate-900 tabular-nums">
                        {Math.round(pctVal)}%
                    </span>
                    {sublabel && (
                        <span className="text-[9px] font-medium text-slate-400">
                            {sublabel}
                        </span>
                    )}
                </div>
            </div>
            <p className="text-[11px] font-medium text-slate-600">{label}</p>
        </div>
    );
}

// ---------- Sparkline ----------
function Sparkline({
    values,
    color,
    width = 100,
    height = 28,
}: {
    values: number[];
    color: string;
    width?: number;
    height?: number;
}) {
    if (values.length < 2) return null;
    const max = Math.max(...values, 1);
    const min = Math.min(...values, 0);
    const range = max - min || 1;
    const stepX = width / (values.length - 1);

    const points = values.map((v, i) => {
        const x = i * stepX;
        const y = height - ((v - min) / range) * (height - 4) - 2;
        return [x, y] as const;
    });

    const path = points
        .map(([x, y], i) => (i === 0 ? `M${x},${y}` : `L${x},${y}`))
        .join(' ');

    const area = `${path} L${width},${height} L0,${height} Z`;

    return (
        <svg width={width} height={height} className="overflow-visible">
            <defs>
                <linearGradient
                    id={`sp-${color.replace('#', '')}`}
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                >
                    <stop offset="0%" stopColor={color} stopOpacity="0.25" />
                    <stop offset="100%" stopColor={color} stopOpacity="0" />
                </linearGradient>
            </defs>
            <path d={area} fill={`url(#sp-${color.replace('#', '')})`} />
            <path
                d={path}
                fill="none"
                stroke={color}
                strokeWidth="1.75"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
            <circle
                cx={points[points.length - 1][0]}
                cy={points[points.length - 1][1]}
                r="2.5"
                fill={color}
            />
        </svg>
    );
}

// ---------- Main Component ----------
export default function StockMonitoring({
    summary,
    batches,
    expired,
    expiringSoon,
    lowStock,
    depleted,
    deptMovement,
    productMovement,
    departments,
    filters,
}: Props) {
    const [tab, setTab] = useState<
        'all' | 'expiring' | 'expired' | 'low' | 'depleted'
    >('all');
    const [search, setSearch] = useState(filters.search ?? '');
    const [deptId, setDeptId] = useState<number | ''>(
        filters.department_id ?? '',
    );
    const [expiryWindow, setExpiryWindow] = useState(
        filters.expiry_window ?? 90,
    );

    const rows: BatchRow[] = useMemo(() => {
        switch (tab) {
            case 'expiring':
                return expiringSoon;
            case 'expired':
                return expired;
            case 'low':
                return lowStock;
            case 'depleted':
                return depleted;
            default:
                return batches;
        }
    }, [tab, batches, expiringSoon, expired, lowStock, depleted]);

    const applyFilters = () => {
        router.get(
            route('pharmacy.stock-monitoring'),
            {
                search: search || undefined,
                department_id: deptId || undefined,
                expiry_window: expiryWindow,
            },
            { preserveState: true, replace: true },
        );
    };

    const resetFilters = () => {
        setSearch('');
        setDeptId('');
        setExpiryWindow(90);
        router.get(route('pharmacy.stock-monitoring'), {}, { replace: true });
    };

    // ── Chart data ──────────────────────────────────────
    const stockHealth = useMemo<DonutDatum[]>(
        () =>
            [
                {
                    name: 'In Stock',
                    count: Math.max(
                        summary.total_batches -
                            summary.expired_count -
                            summary.expiring_soon_count -
                            summary.low_stock_count -
                            summary.depleted_count,
                        0,
                    ),
                    color: PALETTE.emerald,
                },
                {
                    name: 'Expiring',
                    count: summary.expiring_soon_count,
                    color: PALETTE.amber,
                },
                {
                    name: 'Expired',
                    count: summary.expired_count,
                    color: PALETTE.rose,
                },
                {
                    name: 'Low Stock',
                    count: summary.low_stock_count,
                    color: PALETTE.orange,
                },
                {
                    name: 'Depleted',
                    count: summary.depleted_count,
                    color: PALETTE.slate,
                },
            ].filter((d) => d.count > 0),
        [summary],
    );

    const flowData = useMemo<DonutDatum[]>(
        () => [
            {
                name: 'Remaining',
                count: summary.total_remaining,
                color: PALETTE.emerald,
            },
            {
                name: 'Dispensed',
                count: summary.total_dispensed,
                color: PALETTE.sky,
            },
        ],
        [summary],
    );

    const trendIn = useMemo(
        () => deptMovement.slice(0, 7).map((d) => Number(d.total_in) || 0),
        [deptMovement],
    );
    const trendOut = useMemo(
        () =>
            deptMovement.slice(0, 7).map((d) => Number(d.total_dispensed) || 0),
        [deptMovement],
    );

    const totalIn =
        deptMovement.reduce((s, d) => s + Number(d.total_in), 0) || 1;
    const totalOut =
        deptMovement.reduce((s, d) => s + Number(d.total_dispensed), 0) || 1;

    const tabs = [
        { key: 'all', label: 'All Batches', count: batches.length },
        { key: 'expiring', label: 'Expiring Soon', count: expiringSoon.length },
        { key: 'expired', label: 'Expired', count: expired.length },
        { key: 'low', label: 'Low Stock', count: lowStock.length },
        { key: 'depleted', label: 'Depleted', count: depleted.length },
    ] as const;

    const attention =
        summary.expired_count +
        summary.expiring_soon_count +
        summary.low_stock_count;

    return (
        <AppLayout>
            <Head title="Stock Monitoring" />

            <div className="min-h-screen bg-slate-50">
                <div className="mx-auto max-w-[1600px] space-y-6 p-4 md:p-6">
                    {/* ── Header ─────────────────────────────── */}
                    <div className="flex flex-wrap items-end justify-between gap-4">
                        <div>
                            <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
                                <Package className="h-3.5 w-3.5" />
                                <span>Pharmacy</span>
                                <span className="text-slate-300">/</span>
                                <span>Inventory</span>
                            </div>
                            <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">
                                Stock Monitoring
                            </h1>
                            <p className="mt-0.5 text-sm text-slate-500">
                                Track batches, expiries, dispensed &amp;
                                remaining quantities. Totals are in units
                                (tablets/capsules); product rows also show
                                packs.
                            </p>
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={applyFilters}
                                className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-3.5 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-slate-800"
                            >
                                <RefreshCw className="h-3.5 w-3.5" />
                                Refresh
                            </button>
                            <button
                                onClick={resetFilters}
                                className="inline-flex items-center gap-2 rounded-lg bg-white px-3.5 py-2 text-sm font-medium text-slate-700 shadow-sm ring-1 ring-slate-200 transition-colors hover:bg-slate-50"
                            >
                                <RotateCcw className="h-3.5 w-3.5" />
                                Reset
                            </button>
                        </div>
                    </div>

                    {/* ── KPI grid ───────────────────────────── */}
                    <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                        <KpiCard
                            label="Total Batches"
                            value={summary.total_batches}
                            icon={<Boxes className="h-4 w-4" />}
                            tone="sky"
                        />
                        <KpiCard
                            label="Units Received"
                            value={summary.total_received}
                            icon={<ArrowDownToLine className="h-4 w-4" />}
                            tone="indigo"
                        />
                        <KpiCard
                            label="Units Remaining"
                            value={summary.total_remaining}
                            icon={<Package className="h-4 w-4" />}
                            tone="emerald"
                        />
                        <KpiCard
                            label="Units Dispensed"
                            value={summary.total_dispensed}
                            icon={<ArrowUpFromLine className="h-4 w-4" />}
                            tone="violet"
                        />
                        <KpiCard
                            label="Expired"
                            value={summary.expired_count}
                            icon={<PackageX className="h-4 w-4" />}
                            tone="rose"
                            hint={`${fmt(summary.expired_value_units)} units`}
                        />
                        <KpiCard
                            label="Expiring Soon"
                            value={summary.expiring_soon_count}
                            icon={<Clock className="h-4 w-4" />}
                            tone="amber"
                            hint={`${fmt(summary.expiring_units)} units`}
                        />
                        <KpiCard
                            label="Low Stock"
                            value={summary.low_stock_count}
                            icon={<TrendingDown className="h-4 w-4" />}
                            tone="orange"
                        />
                        <KpiCard
                            label="Depleted"
                            value={summary.depleted_count}
                            icon={<PackageCheck className="h-4 w-4" />}
                            tone="slate"
                        />
                    </div>

                    {/* ── Visual analytics row ───────────────── */}
                    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
                        <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200/70">
                            <div className="mb-4 flex items-center justify-between">
                                <div>
                                    <h3 className="text-sm font-semibold text-slate-900">
                                        Stock Health
                                    </h3>
                                    <p className="text-[11px] text-slate-500">
                                        Batch status distribution
                                    </p>
                                </div>
                                <span className="rounded-full bg-slate-50 px-2 py-0.5 text-[11px] font-semibold text-slate-600 tabular-nums">
                                    {summary.total_batches} total
                                </span>
                            </div>
                            <div className="flex items-center gap-5">
                                <Doughnut
                                    data={stockHealth}
                                    centerLabel="batches"
                                    centerValue={summary.total_batches}
                                    size={150}
                                    thickness={16}
                                />
                                <ul className="flex-1 space-y-1.5">
                                    {stockHealth.map((d) => (
                                        <li
                                            key={d.name}
                                            className="flex items-center justify-between gap-2 text-xs"
                                        >
                                            <span className="flex min-w-0 items-center gap-2 text-slate-600">
                                                <span
                                                    className="h-2 w-2 shrink-0 rounded-full"
                                                    style={{
                                                        backgroundColor:
                                                            d.color,
                                                    }}
                                                />
                                                <span className="truncate">
                                                    {d.name}
                                                </span>
                                            </span>
                                            <span className="font-semibold text-slate-900 tabular-nums">
                                                {d.count}
                                            </span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </div>

                        <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200/70">
                            <div className="mb-4">
                                <h3 className="text-sm font-semibold text-slate-900">
                                    Stock Flow
                                </h3>
                                <p className="text-[11px] text-slate-500">
                                    Dispensed vs remaining (units)
                                </p>
                            </div>
                            <div className="flex items-center gap-5">
                                <Doughnut
                                    data={flowData}
                                    centerLabel="remaining"
                                    centerValue={`${pct(summary.total_remaining, summary.total_received)}%`}
                                    size={150}
                                    thickness={16}
                                />
                                <ul className="flex-1 space-y-2">
                                    {flowData.map((d) => (
                                        <li key={d.name}>
                                            <div className="flex items-center justify-between text-xs">
                                                <span className="flex items-center gap-2 text-slate-600">
                                                    <span
                                                        className="h-2 w-2 rounded-full"
                                                        style={{
                                                            backgroundColor:
                                                                d.color,
                                                        }}
                                                    />
                                                    {d.name}
                                                </span>
                                                <span className="font-semibold text-slate-900 tabular-nums">
                                                    {fmt(d.count)}
                                                </span>
                                            </div>
                                            <div className="mt-1 h-1 overflow-hidden rounded-full bg-slate-100">
                                                <div
                                                    className="h-full rounded-full transition-[width] duration-500"
                                                    style={{
                                                        width: `${pct(d.count, summary.total_received)}%`,
                                                        backgroundColor:
                                                            d.color,
                                                    }}
                                                />
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </div>

                        <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200/70">
                            <div className="mb-4 flex items-center justify-between">
                                <div>
                                    <h3 className="text-sm font-semibold text-slate-900">
                                        Flow Trend
                                    </h3>
                                    <p className="text-[11px] text-slate-500">
                                        By department (units)
                                    </p>
                                </div>
                                {attention > 0 && (
                                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-700 ring-1 ring-amber-600/20">
                                        <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                                        {attention} need attention
                                    </span>
                                )}
                            </div>

                            <div className="space-y-3">
                                <div className="rounded-xl bg-slate-50/60 p-3">
                                    <div className="mb-1 flex items-center justify-between">
                                        <span className="flex items-center gap-1.5 text-[11px] font-medium text-slate-600">
                                            <ArrowDownToLine className="h-3 w-3 text-emerald-500" />
                                            Inbound
                                        </span>
                                        <span className="text-xs font-semibold text-slate-900 tabular-nums">
                                            {fmt(totalIn)}
                                        </span>
                                    </div>
                                    <Sparkline
                                        values={
                                            trendIn.length
                                                ? trendIn
                                                : [1, 2, 3, 4, 3, 4, 5]
                                        }
                                        color={PALETTE.emerald}
                                        width={240}
                                        height={32}
                                    />
                                </div>
                                <div className="rounded-xl bg-slate-50/60 p-3">
                                    <div className="mb-1 flex items-center justify-between">
                                        <span className="flex items-center gap-1.5 text-[11px] font-medium text-slate-600">
                                            <ArrowUpFromLine className="h-3 w-3 text-sky-500" />
                                            Dispensed
                                        </span>
                                        <span className="text-xs font-semibold text-slate-900 tabular-nums">
                                            {fmt(totalOut)}
                                        </span>
                                    </div>
                                    <Sparkline
                                        values={
                                            trendOut.length
                                                ? trendOut
                                                : [3, 4, 3, 5, 4, 6, 5]
                                        }
                                        color={PALETTE.sky}
                                        width={240}
                                        height={32}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* ── Radial health rings ────────────────── */}
                    <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200/70">
                        <div className="mb-4 flex items-center justify-between">
                            <div>
                                <h3 className="text-sm font-semibold text-slate-900">
                                    Utilisation Overview
                                </h3>
                                <p className="text-[11px] text-slate-500">
                                    Key stock ratios at a glance
                                </p>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                            <RadialRing
                                value={summary.total_remaining}
                                max={summary.total_received || 1}
                                label="In Stock"
                                sublabel={`${fmt(summary.total_remaining)} units`}
                                color={PALETTE.emerald}
                            />
                            <RadialRing
                                value={summary.total_dispensed}
                                max={summary.total_received || 1}
                                label="Dispensed"
                                sublabel={`${fmt(summary.total_dispensed)} units`}
                                color={PALETTE.sky}
                            />
                            <RadialRing
                                value={summary.expiring_soon_count}
                                max={summary.total_batches || 1}
                                label="Expiring"
                                sublabel={`${fmt(summary.expiring_soon_count)} batches`}
                                color={PALETTE.amber}
                            />
                            <RadialRing
                                value={summary.low_stock_count}
                                max={summary.total_batches || 1}
                                label="Low Stock"
                                sublabel={`${fmt(summary.low_stock_count)} batches`}
                                color={PALETTE.orange}
                            />
                        </div>
                    </div>

                    {/* ── Filters ────────────────────────────── */}
                    <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200/70">
                        <div className="mb-3 flex items-center gap-2 text-xs font-semibold tracking-wide text-slate-500 uppercase">
                            <Activity className="h-3.5 w-3.5" />
                            Filters
                        </div>
                        <div className="flex flex-wrap items-end gap-3">
                            <div className="min-w-[220px] flex-1">
                                <label className="mb-1 block text-xs font-medium text-slate-500">
                                    Search
                                </label>
                                <div className="relative">
                                    <Search className="pointer-events-none absolute top-1/2 left-3 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                                    <input
                                        value={search}
                                        onChange={(e) =>
                                            setSearch(e.target.value)
                                        }
                                        placeholder="Product name or batch #"
                                        className="w-full rounded-lg border-0 bg-slate-50 py-2 pr-3 pl-9 text-sm text-slate-800 ring-1 ring-slate-200 transition placeholder:text-slate-400 focus:bg-white focus:ring-2 focus:ring-slate-900/10 focus:outline-none"
                                        onKeyDown={(e) =>
                                            e.key === 'Enter' && applyFilters()
                                        }
                                    />
                                </div>
                            </div>
                            <div className="min-w-[160px]">
                                <label className="mb-1 block text-xs font-medium text-slate-500">
                                    Department
                                </label>
                                <select
                                    value={deptId}
                                    onChange={(e) =>
                                        setDeptId(
                                            e.target.value
                                                ? Number(e.target.value)
                                                : '',
                                        )
                                    }
                                    className="w-full rounded-lg border-0 bg-slate-50 px-3 py-2 text-sm text-slate-800 ring-1 ring-slate-200 transition focus:bg-white focus:ring-2 focus:ring-slate-900/10 focus:outline-none"
                                >
                                    <option value="">All departments</option>
                                    {departments.map((d) => (
                                        <option key={d.id} value={d.id}>
                                            {d.name}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div className="min-w-[140px]">
                                <label className="mb-1 block text-xs font-medium text-slate-500">
                                    Expiry window
                                </label>
                                <select
                                    value={expiryWindow}
                                    onChange={(e) =>
                                        setExpiryWindow(Number(e.target.value))
                                    }
                                    className="w-full rounded-lg border-0 bg-slate-50 px-3 py-2 text-sm text-slate-800 ring-1 ring-slate-200 transition focus:bg-white focus:ring-2 focus:ring-slate-900/10 focus:outline-none"
                                >
                                    {[30, 60, 90, 180, 365].map((d) => (
                                        <option key={d} value={d}>
                                            {d} days
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* ── Tabs + Table ───────────────────────── */}
                    <div className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200/70">
                        <div className="flex flex-wrap items-center gap-1 border-b border-slate-100 px-3 pt-3">
                            {tabs.map((t) => {
                                const active = tab === t.key;
                                return (
                                    <button
                                        key={t.key}
                                        onClick={() => setTab(t.key)}
                                        className={cx(
                                            'relative inline-flex items-center gap-2 rounded-t-lg px-3.5 py-2.5 text-sm font-medium transition-colors',
                                            active
                                                ? 'text-slate-900'
                                                : 'text-slate-500 hover:text-slate-700',
                                        )}
                                    >
                                        <span>{t.label}</span>
                                        <span
                                            className={cx(
                                                'rounded-full px-1.5 py-0.5 text-[10px] font-semibold tabular-nums',
                                                active
                                                    ? 'bg-slate-900 text-white'
                                                    : 'bg-slate-100 text-slate-600',
                                            )}
                                        >
                                            {t.count}
                                        </span>
                                        {active && (
                                            <span className="absolute inset-x-0 -bottom-px h-0.5 rounded-full bg-slate-900" />
                                        )}
                                    </button>
                                );
                            })}
                        </div>

                        <div className="overflow-x-auto">
                            <table className="min-w-full text-sm">
                                <thead>
                                    <tr className="border-b border-slate-100 bg-slate-50/50 text-left text-[11px] font-semibold tracking-wide text-slate-500 uppercase">
                                        <th className="px-4 py-3">Product</th>
                                        <th className="px-4 py-3">Batch</th>
                                        <th className="px-4 py-3">Expiry</th>
                                        <th className="px-4 py-3 text-right">
                                            Received
                                        </th>
                                        <th className="px-4 py-3 text-right">
                                            Remaining
                                        </th>
                                        <th className="px-4 py-3 text-right">
                                            Dispensed
                                        </th>
                                        <th className="w-48 px-4 py-3">
                                            Usage
                                        </th>
                                        <th className="px-4 py-3 text-center">
                                            Status
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {rows.length === 0 && (
                                        <tr>
                                            <td
                                                colSpan={8}
                                                className="px-4 py-16 text-center"
                                            >
                                                <div className="flex flex-col items-center gap-2 text-slate-400">
                                                    <Layers className="h-8 w-8" />
                                                    <p className="text-sm">
                                                        No batches found
                                                    </p>
                                                    <p className="text-xs">
                                                        Try adjusting filters or
                                                        the expiry window
                                                    </p>
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                    {rows.map((b) => {
                                        const usedPct = pct(
                                            b.dispensed_quantity,
                                            b.received_quantity,
                                        );
                                        const meta =
                                            STATUS_META[b.status] ??
                                            STATUS_META.ok;
                                        return (
                                            <tr
                                                key={b.id}
                                                className="group transition-colors hover:bg-slate-50/60"
                                            >
                                                <td className="px-4 py-3">
                                                    <div className="font-medium text-slate-900">
                                                        {b.product_name}
                                                    </div>
                                                    <div className="mt-0.5 flex items-center gap-2 font-mono text-[11px] text-slate-400">
                                                        <span>
                                                            {b.product_sku ??
                                                                '—'}
                                                        </span>
                                                        {hasPacks(
                                                            b.pack_size,
                                                        ) && (
                                                            <span className="rounded bg-slate-100 px-1.5 py-0.5 font-sans text-[10px] font-medium text-slate-500">
                                                                {b.pack_size} /
                                                                pack
                                                            </span>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <span className="font-mono text-xs text-slate-700">
                                                        {b.batch_number}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <div className="text-slate-700">
                                                        {b.expiry_date ?? '—'}
                                                    </div>
                                                    {b.days_to_expiry !==
                                                        null && (
                                                        <div
                                                            className={cx(
                                                                'mt-0.5 text-[11px] font-medium tabular-nums',
                                                                b.days_to_expiry <
                                                                    0
                                                                    ? 'text-red-600'
                                                                    : b.days_to_expiry <=
                                                                        30
                                                                      ? 'text-amber-600'
                                                                      : 'text-slate-400',
                                                            )}
                                                        >
                                                            {b.days_to_expiry <
                                                            0
                                                                ? `${Math.abs(b.days_to_expiry)}d overdue`
                                                                : `${b.days_to_expiry}d left`}
                                                        </div>
                                                    )}
                                                </td>
                                                <td className="px-4 py-3 text-right text-slate-600 tabular-nums">
                                                    <QtyCell
                                                        units={
                                                            b.received_quantity
                                                        }
                                                        packSize={b.pack_size}
                                                    />
                                                </td>
                                                <td className="px-4 py-3 text-right text-slate-900 tabular-nums">
                                                    <QtyCell
                                                        units={
                                                            b.remaining_quantity
                                                        }
                                                        packSize={b.pack_size}
                                                        strong
                                                    />
                                                </td>
                                                <td className="px-4 py-3 text-right text-slate-600 tabular-nums">
                                                    <QtyCell
                                                        units={
                                                            b.dispensed_quantity
                                                        }
                                                        packSize={b.pack_size}
                                                    />
                                                </td>
                                                <td className="px-4 py-3">
                                                    <div className="flex items-center gap-2">
                                                        <MiniRing
                                                            value={usedPct}
                                                            color={meta.color}
                                                        />
                                                        <div className="flex-1">
                                                            <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                                                                <div
                                                                    className="h-full rounded-full transition-[width] duration-500"
                                                                    style={{
                                                                        width: `${usedPct}%`,
                                                                        backgroundColor:
                                                                            meta.color,
                                                                    }}
                                                                />
                                                            </div>
                                                            <div className="mt-1 text-[10px] font-medium text-slate-400 tabular-nums">
                                                                {usedPct}% used
                                                            </div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3 text-center">
                                                    <span
                                                        className={cx(
                                                            'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium',
                                                            meta.chip,
                                                        )}
                                                    >
                                                        <span
                                                            className={cx(
                                                                'h-1.5 w-1.5 rounded-full',
                                                                meta.dot,
                                                            )}
                                                        />
                                                        {meta.label}
                                                    </span>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* ── Movement panels ────────────────────── */}
                    <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
                        <MovementCard
                            title="Department Movement"
                            subtitle="Stock flow by department (units)"
                            icon={<Layers className="h-4 w-4" />}
                            empty={deptMovement.length === 0}
                            emptyText="No movement recorded"
                            columns={[
                                'Department',
                                'In',
                                'Dispensed',
                                'Returned',
                                'Expired',
                                'Damaged',
                            ]}
                        >
                            {deptMovement.map((d) => (
                                <tr
                                    key={d.department_id}
                                    className="transition-colors hover:bg-slate-50/60"
                                >
                                    <td className="px-4 py-2.5">
                                        <div className="font-medium text-slate-800">
                                            {d.department_name}
                                        </div>
                                        <div className="mt-1 flex h-1 gap-0.5 overflow-hidden rounded-full bg-slate-100">
                                            <div
                                                className="h-full bg-emerald-500"
                                                style={{
                                                    width: `${pct(Number(d.total_in), totalIn)}%`,
                                                }}
                                            />
                                            <div
                                                className="h-full bg-sky-500"
                                                style={{
                                                    width: `${pct(Number(d.total_dispensed), totalIn)}%`,
                                                }}
                                            />
                                            <div
                                                className="h-full bg-rose-500"
                                                style={{
                                                    width: `${pct(Number(d.total_expired_writeoff), totalIn)}%`,
                                                }}
                                            />
                                        </div>
                                    </td>
                                    <td className="px-4 py-2.5 text-right text-slate-700 tabular-nums">
                                        {fmt(Number(d.total_in))}
                                    </td>
                                    <td className="px-4 py-2.5 text-right text-slate-700 tabular-nums">
                                        {fmt(Number(d.total_dispensed))}
                                    </td>
                                    <td className="px-4 py-2.5 text-right text-slate-700 tabular-nums">
                                        {fmt(Number(d.total_returned))}
                                    </td>
                                    <td className="px-4 py-2.5 text-right font-medium text-red-600 tabular-nums">
                                        {fmt(Number(d.total_expired_writeoff))}
                                    </td>
                                    <td className="px-4 py-2.5 text-right font-medium text-orange-600 tabular-nums">
                                        {fmt(Number(d.total_damaged))}
                                    </td>
                                </tr>
                            ))}
                        </MovementCard>

                        {/* ✅ Top Product Movements — split columns */}
                        <MovementCard
                            title="Top Product Movements"
                            subtitle="Dispensations and transfers by product"
                            icon={<Activity className="h-4 w-4" />}
                            empty={productMovement.length === 0}
                            emptyText="No product movement recorded"
                            columns={[
                                'Product',
                                'In',
                                'Dispensed',
                                'Transferred',
                                'Moves',
                                'Last',
                            ]}
                        >
                            {productMovement.map((p) => (
                                <tr
                                    key={p.product_id}
                                    className="transition-colors hover:bg-slate-50/60"
                                >
                                    <td className="px-4 py-2.5">
                                        <div className="font-medium text-slate-800">
                                            {p.product_name}
                                        </div>
                                        <div className="font-mono text-[11px] text-slate-400">
                                            {p.product_sku ?? '—'}
                                        </div>
                                    </td>
                                    <td className="px-4 py-2.5 text-right font-medium text-emerald-700 tabular-nums">
                                        <QtyCell
                                            units={Number(p.total_in)}
                                            packSize={p.pack_size}
                                        />
                                    </td>
                                    <td className="px-4 py-2.5 text-right font-medium text-sky-600 tabular-nums">
                                        <QtyCell
                                            units={Number(p.total_dispensed)}
                                            packSize={p.pack_size}
                                        />
                                    </td>
                                    <td className="px-4 py-2.5 text-right font-medium text-rose-600 tabular-nums">
                                        <QtyCell
                                            units={Number(
                                                p.total_transferred_out,
                                            )}
                                            packSize={p.pack_size}
                                        />
                                    </td>
                                    <td className="px-4 py-2.5 text-right text-slate-700 tabular-nums">
                                        {fmt(p.movement_count)}
                                    </td>
                                    <td className="px-4 py-2.5 text-right text-[11px] text-slate-400">
                                        {p.last_movement ?? '—'}
                                    </td>
                                </tr>
                            ))}
                        </MovementCard>
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}

// ---------- Mini ring used inside table rows ----------
function MiniRing({
    value,
    color,
    size = 22,
    thickness = 3,
}: {
    value: number;
    color: string;
    size?: number;
    thickness?: number;
}) {
    const r = (size - thickness) / 2;
    const c = 2 * Math.PI * r;
    const dash = (Math.min(100, value) / 100) * c;
    return (
        <svg width={size} height={size} className="shrink-0 -rotate-90">
            <circle
                cx={size / 2}
                cy={size / 2}
                r={r}
                fill="none"
                stroke="#f1f5f9"
                strokeWidth={thickness}
            />
            <circle
                cx={size / 2}
                cy={size / 2}
                r={r}
                fill="none"
                stroke={color}
                strokeWidth={thickness}
                strokeDasharray={`${dash} ${c - dash}`}
                strokeLinecap="round"
                className="transition-[stroke-dasharray] duration-500"
            />
        </svg>
    );
}

// ---------- Small components ----------
const TONES: Record<Tone, { bg: string; text: string; icon: string }> = {
    sky: {
        bg: 'bg-sky-50',
        text: 'text-sky-700',
        icon: 'bg-sky-500/10 text-sky-600',
    },
    indigo: {
        bg: 'bg-indigo-50',
        text: 'text-indigo-700',
        icon: 'bg-indigo-500/10 text-indigo-600',
    },
    emerald: {
        bg: 'bg-emerald-50',
        text: 'text-emerald-700',
        icon: 'bg-emerald-500/10 text-emerald-600',
    },
    violet: {
        bg: 'bg-violet-50',
        text: 'text-violet-700',
        icon: 'bg-violet-500/10 text-violet-600',
    },
    rose: {
        bg: 'bg-rose-50',
        text: 'text-rose-700',
        icon: 'bg-rose-500/10 text-rose-600',
    },
    amber: {
        bg: 'bg-amber-50',
        text: 'text-amber-700',
        icon: 'bg-amber-500/10 text-amber-600',
    },
    orange: {
        bg: 'bg-orange-50',
        text: 'text-orange-700',
        icon: 'bg-orange-500/10 text-orange-600',
    },
    slate: {
        bg: 'bg-slate-100',
        text: 'text-slate-700',
        icon: 'bg-slate-500/10 text-slate-600',
    },
};

function KpiCard({
    label,
    value,
    icon,
    tone,
    hint,
}: {
    label: string;
    value: number;
    icon: React.ReactNode;
    tone: Tone;
    hint?: string;
}) {
    const t = TONES[tone];
    return (
        <div
            className={cx(
                'group relative overflow-hidden rounded-2xl p-4 shadow-sm ring-1 ring-slate-200/70 transition-all hover:shadow-md',
                t.bg,
            )}
        >
            <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                    <p className="truncate text-[11px] font-semibold tracking-wide text-slate-500 uppercase">
                        {label}
                    </p>
                    <p
                        className={cx(
                            'mt-1.5 text-2xl font-bold tracking-tight tabular-nums',
                            t.text,
                        )}
                    >
                        {fmt(value)}
                    </p>
                    {hint && (
                        <p className="mt-0.5 text-[11px] font-medium text-slate-500">
                            {hint}
                        </p>
                    )}
                </div>
                <div
                    className={cx(
                        'flex h-9 w-9 shrink-0 items-center justify-center rounded-xl',
                        t.icon,
                    )}
                >
                    {icon}
                </div>
            </div>
        </div>
    );
}

function MovementCard({
    title,
    subtitle,
    icon,
    columns,
    empty,
    emptyText,
    children,
}: {
    title: string;
    subtitle: string;
    icon: React.ReactNode;
    columns: string[];
    empty: boolean;
    emptyText: string;
    children: React.ReactNode;
}) {
    return (
        <div className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200/70">
            <div className="flex items-center gap-3 border-b border-slate-100 px-5 py-4">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
                    {icon}
                </div>
                <div>
                    <h2 className="text-sm font-semibold text-slate-900">
                        {title}
                    </h2>
                    <p className="text-[11px] text-slate-500">{subtitle}</p>
                </div>
            </div>
            <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                    <thead>
                        <tr className="border-b border-slate-100 bg-slate-50/50 text-left text-[11px] font-semibold tracking-wide text-slate-500 uppercase">
                            {columns.map((c, i) => (
                                <th
                                    key={c}
                                    className={cx(
                                        'px-4 py-2.5',
                                        i === 0 ? 'text-left' : 'text-right',
                                    )}
                                >
                                    {c}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {empty && (
                            <tr>
                                <td
                                    colSpan={columns.length}
                                    className="px-4 py-10 text-center text-sm text-slate-400"
                                >
                                    {emptyText}
                                </td>
                            </tr>
                        )}
                        {children}
                    </tbody>
                </table>
            </div>
        </div>
    );
}