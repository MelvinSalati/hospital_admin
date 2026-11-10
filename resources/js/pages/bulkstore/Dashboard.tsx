// resources/js/pages/bulkstore/dashboard/BulkStoreDashboard.tsx

import { Head, router, usePage } from '@inertiajs/react';
import {
    AlertTriangle,
    Boxes,
    CalendarClock,
    CheckCircle2,
    Clock,
    Download,
    FileText,
    Layers,
    RefreshCw,
    ShoppingCart,
    Store,
    Truck,
    Activity,
    Bell,
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

interface StockAlertItem {
    id: number;
    sku: string;
    name: string;
    category: string;
    current_stock: number;
    par_level: number;
    unit: string;
    unit_cost: number;
    status: 'out_of_stock' | 'critical' | 'low_stock' | 'healthy';
}

interface ExpiringBatch {
    id: number;
    sku: string;
    name: string;
    batch_number: string;
    quantity: number;
    unit: string;
    expiry_date: string;
    days_remaining: number;
    value_at_risk: number;
}

interface DepartmentConsumption {
    department: string;
    allocated_quota: number;
    issued_value: number;
    percentage_used: number;
}

interface RequisitionItem {
    id: number;
    req_number: string;
    department: string;
    requested_by: string;
    items_count: number;
    estimated_value: number;
    priority: 'urgent' | 'routine';
    status: 'pending' | 'approved' | 'partially_issued' | 'dispatched';
    requested_at: string;
}

interface PurchaseOrder {
    id: number;
    po_number: string;
    supplier: string;
    items_count: number;
    total_amount: number;
    expected_date: string;
    status: 'pending_approval' | 'ordered' | 'in_transit' | 'received';
}

export interface BulkStoreDashboardStats {
    total_inventory_value: number;
    inventory_value_change_pct: number;
    total_active_skus: number;
    low_stock_count: number;
    out_of_stock_count: number;
    expiring_soon_count: number;
    expiring_soon_value: number;
    billable_capture_rate: number;

    pending_requisitions: number;
    urgent_requisitions: number;
    pending_purchase_orders: number;
    pending_stock_adjustments: number;

    monthly_stock_movement: {
        month: string;
        received: number;
        issued: number;
    }[];
    inventory_by_category: {
        category: string;
        sku_count: number;
        total_value: number;
    }[];
    department_consumption: DepartmentConsumption[];

    critical_stock_items: StockAlertItem[];
    expiring_batches: ExpiringBatch[];
    recent_requisitions: RequisitionItem[];
    active_purchase_orders: PurchaseOrder[];
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

const formatCompact = (amount: number) =>
    new Intl.NumberFormat('en', {
        notation: 'compact',
        maximumFractionDigits: 1,
    }).format(amount ?? 0);

const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
    });

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

const getInitials = (name: string) =>
    name
        .replace(/^(Dr|Sr|Pharm|Mr|Mrs|Ms)\.?\s+/i, '')
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);

const labelize = (value: string) =>
    value.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
        healthy: 'bg-green-100 text-green-800',
        low_stock: 'bg-yellow-100 text-yellow-800',
        critical: 'bg-orange-100 text-orange-800',
        out_of_stock: 'bg-red-100 text-red-800',
        dispatched: 'bg-green-100 text-green-800',
        received: 'bg-green-100 text-green-800',
        approved: 'bg-blue-100 text-blue-800',
        in_transit: 'bg-indigo-100 text-indigo-800',
        ordered: 'bg-sky-100 text-sky-800',
        partially_issued: 'bg-purple-100 text-purple-800',
        pending: 'bg-yellow-100 text-yellow-800',
        pending_approval: 'bg-yellow-100 text-yellow-800',
        urgent: 'bg-red-100 text-red-800',
        routine: 'bg-slate-100 text-slate-600',
    };
    return colors[status] || 'bg-slate-100 text-slate-600';
};

const daysFromNow = (days: number) =>
    new Date(Date.now() + days * 86_400_000).toISOString().slice(0, 10);

// ============================================
// DUMMY PROPS (FALLBACK WHEN NO INERTIA PROPS)
// ============================================

export const DUMMY_BULKSTORE_PROPS: BulkStoreDashboardStats = {
    total_inventory_value: 4850000,
    inventory_value_change_pct: 4.2,
    total_active_skus: 1420,
    low_stock_count: 34,
    out_of_stock_count: 7,
    expiring_soon_count: 19,
    expiring_soon_value: 142500,
    billable_capture_rate: 94.6,

    pending_requisitions: 14,
    urgent_requisitions: 4,
    pending_purchase_orders: 6,
    pending_stock_adjustments: 3,

    monthly_stock_movement: [
        { month: 'Jun', received: 820000, issued: 760000 },
        { month: 'Jul', received: 910000, issued: 840000 },
        { month: 'Aug', received: 780000, issued: 890000 },
        { month: 'Sep', received: 1050000, issued: 920000 },
        { month: 'Oct', received: 980000, issued: 960000 },
        { month: 'Nov', received: 1120000, issued: 1010000 },
    ],

    inventory_by_category: [
        { category: 'Pharmaceuticals', sku_count: 640, total_value: 2350000 },
        {
            category: 'Surgical & Implants',
            sku_count: 210,
            total_value: 1420000,
        },
        {
            category: 'Medical Consumables',
            sku_count: 410,
            total_value: 680000,
        },
        { category: 'Lab Reagents', sku_count: 160, total_value: 400000 },
    ],

    department_consumption: [
        {
            department: 'Operating Theatre',
            allocated_quota: 1500000,
            issued_value: 1290000,
            percentage_used: 86,
        },
        {
            department: 'Inpatient Pharmacy',
            allocated_quota: 1800000,
            issued_value: 1440000,
            percentage_used: 80,
        },
        {
            department: 'Emergency & Trauma',
            allocated_quota: 750000,
            issued_value: 690000,
            percentage_used: 92,
        },
        {
            department: 'Pathology & Lab',
            allocated_quota: 500000,
            issued_value: 340000,
            percentage_used: 68,
        },
        {
            department: 'Maternity & NICU',
            allocated_quota: 600000,
            issued_value: 420000,
            percentage_used: 70,
        },
    ],

    critical_stock_items: [
        {
            id: 1,
            sku: 'MED-ANT-014',
            name: 'Ceftriaxone 1g IV Injection',
            category: 'Pharmaceuticals',
            current_stock: 0,
            par_level: 500,
            unit: 'Vials',
            unit_cost: 35,
            status: 'out_of_stock',
        },
        {
            id: 2,
            sku: 'SUR-SUT-088',
            name: 'Vicryl 2-0 Absorbable Sutures',
            category: 'Surgical',
            current_stock: 18,
            par_level: 150,
            unit: 'Boxes',
            unit_cost: 420,
            status: 'critical',
        },
        {
            id: 3,
            sku: 'CON-GLV-002',
            name: 'Sterile Surgical Gloves (Size 7.5)',
            category: 'Consumables',
            current_stock: 45,
            par_level: 300,
            unit: 'Boxes',
            unit_cost: 180,
            status: 'critical',
        },
        {
            id: 4,
            sku: 'LAB-RGT-041',
            name: 'CBC Hematology Diluent (20L)',
            category: 'Lab Reagents',
            current_stock: 4,
            par_level: 15,
            unit: 'Packs',
            unit_cost: 1650,
            status: 'low_stock',
        },
        {
            id: 5,
            sku: 'MED-IVF-009',
            name: 'Normal Saline 0.9% 1000ml',
            category: 'Pharmaceuticals',
            current_stock: 120,
            par_level: 600,
            unit: 'Bags',
            unit_cost: 28,
            status: 'low_stock',
        },
    ],

    expiring_batches: [
        {
            id: 1,
            sku: 'MED-INS-012',
            name: 'Insulin Glargine 100IU/ml',
            batch_number: 'BCH-2025-88A',
            quantity: 85,
            unit: 'Pens',
            expiry_date: daysFromNow(22),
            days_remaining: 22,
            value_at_risk: 38250,
        },
        {
            id: 2,
            sku: 'LAB-RGT-019',
            name: 'Rapid Malaria Antigen Test Kits',
            batch_number: 'BCH-2025-41C',
            quantity: 40,
            unit: 'Kits (25s)',
            expiry_date: daysFromNow(39),
            days_remaining: 39,
            value_at_risk: 26000,
        },
        {
            id: 3,
            sku: 'MED-ANE-004',
            name: 'Propofol 1% Emulsion 20ml',
            batch_number: 'BCH-2025-92X',
            quantity: 140,
            unit: 'Ampoules',
            expiry_date: daysFromNow(73),
            days_remaining: 73,
            value_at_risk: 49000,
        },
    ],

    recent_requisitions: [
        {
            id: 101,
            req_number: 'REQ-2026-0894',
            department: 'Operating Theatre',
            requested_by: 'Sr. Mutale Chanda',
            items_count: 12,
            estimated_value: 64500,
            priority: 'urgent',
            status: 'pending',
            requested_at: new Date(Date.now() - 25 * 60_000).toISOString(),
        },
        {
            id: 102,
            req_number: 'REQ-2026-0893',
            department: 'Emergency & Trauma',
            requested_by: 'Dr. Kelvin Banda',
            items_count: 8,
            estimated_value: 28900,
            priority: 'urgent',
            status: 'approved',
            requested_at: new Date(Date.now() - 95 * 60_000).toISOString(),
        },
        {
            id: 103,
            req_number: 'REQ-2026-0892',
            department: 'Inpatient Pharmacy',
            requested_by: 'Pharm. Grace Phiri',
            items_count: 34,
            estimated_value: 142000,
            priority: 'routine',
            status: 'partially_issued',
            requested_at: new Date(Date.now() - 4 * 3600_000).toISOString(),
        },
        {
            id: 104,
            req_number: 'REQ-2026-0891',
            department: 'Maternity & NICU',
            requested_by: 'Sr. Martha Lungu',
            items_count: 15,
            estimated_value: 19400,
            priority: 'routine',
            status: 'dispatched',
            requested_at: new Date(Date.now() - 7 * 3600_000).toISOString(),
        },
    ],

    active_purchase_orders: [
        {
            id: 1,
            po_number: 'PO-2026-0412',
            supplier: 'Zambia Medical Supplies Ltd',
            items_count: 18,
            total_amount: 420000,
            expected_date: daysFromNow(4),
            status: 'in_transit',
        },
        {
            id: 2,
            po_number: 'PO-2026-0413',
            supplier: 'MedTech Surgical Africa',
            items_count: 9,
            total_amount: 315000,
            expected_date: daysFromNow(8),
            status: 'ordered',
        },
        {
            id: 3,
            po_number: 'PO-2026-0414',
            supplier: 'PharmaCare Distributors',
            items_count: 25,
            total_amount: 580000,
            expected_date: daysFromNow(12),
            status: 'pending_approval',
        },
    ],
};

// ============================================
// SMALL REUSABLE PIECES
// ============================================

interface StatCardProps {
    label: string;
    value: string | number;
    icon: ReactNode;
    tone: string;
    hint?: string;
}

function StatCard({ label, value, icon, tone, hint }: StatCardProps) {
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
                <p className="text-[clamp(1.1rem,2vw,1.6rem)] leading-tight font-semibold text-slate-900">
                    {typeof value === 'number' ? value.toLocaleString() : value}
                </p>
                {hint && (
                    <p className="truncate text-[10px] text-slate-500">
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

function StatusPill({ status }: { status: string }) {
    return (
        <span
            className={cx(
                'shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium whitespace-nowrap',
                getStatusColor(status),
            )}
        >
            {labelize(status)}
        </span>
    );
}

// ============================================
// DOUGHNUT
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
                    className="pointer-events-none fill-slate-900 text-[12px] font-semibold"
                >
                    {active
                        ? formatCompact(active.count)
                        : formatCompact(total)}
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

// ============================================
// DOUGHNUT + LEGEND CARD
// ============================================

interface DoughnutCardProps {
    title: string;
    subtitle?: string;
    icon: ReactNode;
    data: DoughnutDatum[];
    unit: string;
    formatValue?: (n: number) => string;
}

function DoughnutCard({
    title,
    subtitle,
    icon,
    data,
    unit,
    formatValue = (n) => String(n),
}: DoughnutCardProps) {
    const [activeIndex, setActiveIndex] = useState<number | null>(null);
    const total = data.reduce((sum, d) => sum + d.count, 0);

    return (
        <section className="flex min-h-[17rem] flex-1 flex-col rounded-xl bg-white p-4 shadow-sm">
            <header className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2.5">
                    <span className="flex h-7 w-7 items-center justify-center rounded-md bg-slate-100 text-slate-600">
                        {icon}
                    </span>
                    <div>
                        <h3 className="text-sm leading-tight font-semibold text-slate-800">
                            {title}
                        </h3>
                        {subtitle && (
                            <p className="text-[11px] text-slate-500">
                                {subtitle}
                            </p>
                        )}
                    </div>
                </div>
                <span className="text-lg font-semibold text-slate-900 tabular-nums">
                    {formatValue(total)}
                </span>
            </header>

            <div className="mt-3 flex flex-1 flex-col items-center justify-center gap-4">
                <div className="w-full max-w-[9rem]">
                    <Doughnut
                        data={data}
                        unit={unit}
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
                                {formatValue(d.count)}
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

function ProgressList({
    data,
    max: maxProp,
    formatValue = (n) => String(n),
    colorFor,
}: {
    data: { name: string; count: number }[];
    max?: number;
    formatValue?: (n: number) => string;
    colorFor?: (item: { name: string; count: number }, i: number) => string;
}) {
    const max = maxProp ?? Math.max(...data.map((d) => d.count), 1);
    return (
        <ul className="flex h-full flex-col justify-center gap-3">
            {data.map((item, i) => (
                <li key={item.name}>
                    <div className="mb-1 flex items-center justify-between text-[clamp(0.7rem,0.95vw,0.85rem)]">
                        <span className="truncate font-medium text-slate-700">
                            {item.name}
                        </span>
                        <span className="text-slate-500 tabular-nums">
                            {formatValue(item.count)}
                        </span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-slate-200">
                        <div
                            className="h-full rounded-full transition-[width] duration-500"
                            style={{
                                width: `${Math.min(100, (item.count / max) * 100)}%`,
                                backgroundColor:
                                    colorFor?.(item, i) ??
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
// PANEL (list card, same as admin dashboard)
// ============================================

function Panel<T>({
    title,
    subtitle,
    icon,
    rows,
    emptyText,
    renderRow,
}: {
    title: string;
    subtitle?: string;
    icon: ReactNode;
    rows: T[];
    emptyText: string;
    renderRow: (row: T) => ReactNode;
}) {
    return (
        <section className="flex min-h-0 flex-1 flex-col rounded-xl bg-white shadow-sm">
            <header className="flex items-center gap-2.5 px-4 pt-4">
                <span className="flex h-7 w-7 items-center justify-center rounded-md bg-slate-100 text-slate-600">
                    {icon}
                </span>
                <div>
                    <h3 className="text-sm leading-tight font-semibold text-slate-800">
                        {title}
                    </h3>
                    {subtitle && (
                        <p className="text-[11px] text-slate-500">{subtitle}</p>
                    )}
                </div>
            </header>
            <ul className="min-h-0 flex-1 divide-y divide-slate-100 overflow-y-auto px-1.5 pt-2 pb-2">
                {rows.map(renderRow)}
                {rows.length === 0 && (
                    <li className="py-6 text-center text-xs text-slate-500">
                        {emptyText}
                    </li>
                )}
            </ul>
        </section>
    );
}

// ============================================
// MAIN COMPONENT
// ============================================

export default function BulkStoreDashboard() {
    const page = usePage<{ stats?: Partial<BulkStoreDashboardStats> }>();
    const incoming = page.props?.stats;
    const isUsingDummyData = !incoming;

    const stats: BulkStoreDashboardStats = useMemo(() => {
        if (!incoming) return DUMMY_BULKSTORE_PROPS;
        return { ...DUMMY_BULKSTORE_PROPS, ...incoming };
    }, [incoming]);

    const [refreshing, setRefreshing] = useState(false);

    const handleRefresh = () => {
        setRefreshing(true);
        router.reload({
            only: ['stats'],
            onSuccess: () => toast.success('Bulk store metrics refreshed'),
            onError: () => toast.error('Could not refresh metrics'),
            onFinish: () => setRefreshing(false),
        });
    };

    const handleExport = () => {
        toast.success('Exporting stock and valuation report...');
    };

    const movement = asArray(stats.monthly_stock_movement);
    const categories = asArray(stats.inventory_by_category);
    const departments = asArray(stats.department_consumption);
    const criticalItems = asArray(stats.critical_stock_items);
    const expiring = asArray(stats.expiring_batches);
    const requisitions = asArray(stats.recent_requisitions);
    const purchaseOrders = asArray(stats.active_purchase_orders);

    const alertCount = stats.low_stock_count + stats.out_of_stock_count;
    const expiringAtRisk = expiring.reduce((s, b) => s + b.value_at_risk, 0);

    const maxMovement = useMemo(
        () => Math.max(1, ...movement.flatMap((m) => [m.received, m.issued])),
        [movement],
    );

    const statCards = useMemo(
        () => [
            {
                label: 'Total stock value',
                value: formatCurrency(stats.total_inventory_value),
                tone: 'bg-blue-100',
                icon: <Boxes className="h-4 w-4" />,
                hint: `${stats.total_active_skus.toLocaleString()} SKUs • ${stats.inventory_value_change_pct >= 0 ? '+' : ''}${stats.inventory_value_change_pct}%`,
            },
            {
                label: 'Low & out of stock',
                value: `${alertCount} SKUs`,
                tone: 'bg-red-100',
                icon: <AlertTriangle className="h-4 w-4" />,
                hint: `${stats.out_of_stock_count} out • ${stats.low_stock_count} below par`,
            },
            {
                label: 'Expiring in 90 days',
                value: formatCurrency(stats.expiring_soon_value),
                tone: 'bg-yellow-100',
                icon: <CalendarClock className="h-4 w-4" />,
                hint: `${stats.expiring_soon_count} batches (FEFO)`,
            },
            {
                label: 'Charge capture',
                value: `${stats.billable_capture_rate}%`,
                tone: 'bg-green-100',
                icon: <CheckCircle2 className="h-4 w-4" />,
                hint: 'Issued supplies billed',
            },
        ],
        [stats, alertCount],
    );

    const queueCards = useMemo(
        () => [
            {
                label: 'Pending requisitions',
                value: stats.pending_requisitions,
                tone: 'bg-purple-100',
                icon: <ShoppingCart className="h-4 w-4" />,
                hint: 'Awaiting approval or issue',
            },
            {
                label: 'Urgent requisitions',
                value: stats.urgent_requisitions,
                tone: 'bg-red-100',
                icon: <Clock className="h-4 w-4" />,
                hint: 'Theatre, emergency, wards',
            },
            {
                label: 'Purchase orders',
                value: stats.pending_purchase_orders,
                tone: 'bg-blue-100',
                icon: <Truck className="h-4 w-4" />,
                hint: 'Approval or goods receipt',
            },
            {
                label: 'Stock adjustments',
                value: stats.pending_stock_adjustments,
                tone: 'bg-slate-100',
                icon: <FileText className="h-4 w-4" />,
                hint: 'Write-offs and corrections',
            },
        ],
        [stats],
    );

    const categoryData = useMemo<DoughnutDatum[]>(
        () =>
            categories.map((c, i) => ({
                name: c.category,
                count: c.total_value,
                color: CHART_COLORS[i % CHART_COLORS.length],
            })),
        [categories],
    );

    const departmentData = useMemo(
        () =>
            departments.map((d) => ({
                name: d.department,
                count: d.percentage_used,
            })),
        [departments],
    );

    return (
        <AppLayout
            breadcrumbs={[
                { title: 'Home', href: '/' },
                { title: 'Bulk Store', href: '/bulkstore/dashboard' },
            ]}
        >
            <Head title="Bulk Store Dashboard" />

            <div className="bg-blue-50 p-2">
                <PageHeader
                    icon={<Store className="h-5 w-5" />}
                    title="Bulk Store Dashboard"
                    subtitle={
                        isUsingDummyData
                            ? 'Preview mode (dummy data)'
                            : 'Stock value, par alerts, expiries and department requisitions'
                    }
                >
                    <div className="flex items-center gap-2 self-center">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={handleRefresh}
                            disabled={refreshing}
                        >
                            <RefreshCw
                                className={cx(
                                    'mr-1.5 h-3.5 w-3.5',
                                    refreshing && 'animate-spin',
                                )}
                            />
                            Refresh
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={handleExport}
                        >
                            <Download className="mr-1.5 h-3.5 w-3.5" />
                            Export
                        </Button>
                    </div>
                </PageHeader>
            </div>

            <div className="grid h-screen grid-cols-1 gap-4 overflow-hidden bg-blue-50 p-4 lg:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)]">
                {/* ================= LEFT COLUMN ================= */}
                <div className="flex min-h-0 flex-col gap-4 overflow-y-auto">
                    {/* KPI row */}
                    <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
                        {statCards.map((card) => (
                            <StatCard key={card.label} {...card} />
                        ))}
                    </div>

                    {/* Queue row */}
                    <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
                        {queueCards.map((card) => (
                            <StatCard key={card.label} {...card} />
                        ))}
                    </div>

                    {/* Stock movement + department quotas */}
                    <section className="rounded-xl bg-white p-4 shadow-sm">
                        <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-800">
                            <Activity className="h-4 w-4 text-slate-500" />
                            Stock movement & quotas
                        </h2>
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                            <div>
                                <div className="mb-2 flex items-center justify-between">
                                    <p className="text-xs text-slate-500">
                                        Received vs issued (ZMW)
                                    </p>
                                    <div className="flex items-center gap-3 text-[11px] text-slate-500">
                                        <span className="flex items-center gap-1.5">
                                            <span className="h-2 w-2 rounded-full bg-blue-600" />
                                            Received
                                        </span>
                                        <span className="flex items-center gap-1.5">
                                            <span className="h-2 w-2 rounded-full bg-green-600" />
                                            Issued
                                        </span>
                                    </div>
                                </div>
                                {movement.length === 0 ? (
                                    <p className="py-10 text-center text-xs text-slate-500">
                                        No stock movement recorded yet.
                                    </p>
                                ) : (
                                    <div className="flex h-48 items-end gap-2">
                                        {movement.map((m) => (
                                            <div
                                                key={m.month}
                                                className="flex h-full flex-1 flex-col justify-end gap-1.5"
                                            >
                                                <div className="flex flex-1 items-end justify-center gap-1">
                                                    <div
                                                        className="w-full max-w-4 rounded-t bg-blue-600"
                                                        style={{
                                                            height: `${(m.received / maxMovement) * 100}%`,
                                                        }}
                                                        title={`Received ${formatCurrency(m.received)}`}
                                                    />
                                                    <div
                                                        className="w-full max-w-4 rounded-t bg-green-600"
                                                        style={{
                                                            height: `${(m.issued / maxMovement) * 100}%`,
                                                        }}
                                                        title={`Issued ${formatCurrency(m.issued)}`}
                                                    />
                                                </div>
                                                <div className="text-center">
                                                    <p className="text-[11px] font-medium text-slate-700">
                                                        {m.month}
                                                    </p>
                                                    <p className="text-[10px] text-slate-400 tabular-nums">
                                                        {formatCompact(
                                                            m.received,
                                                        )}{' '}
                                                        /{' '}
                                                        {formatCompact(
                                                            m.issued,
                                                        )}
                                                    </p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                            <div>
                                <p className="mb-1 text-xs text-slate-500">
                                    Department quotas used
                                </p>
                                {departmentData.length === 0 ? (
                                    <p className="py-10 text-center text-xs text-slate-500">
                                        No department quotas set.
                                    </p>
                                ) : (
                                    <ProgressList
                                        data={departmentData}
                                        max={100}
                                        formatValue={(n) => `${n}%`}
                                        colorFor={(item) =>
                                            item.count >= 90
                                                ? '#dc2626'
                                                : item.count >= 80
                                                  ? '#d97706'
                                                  : '#2563eb'
                                        }
                                    />
                                )}
                            </div>
                        </div>
                    </section>

                    {/* Category doughnut + expiring batches */}
                    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                        <DoughnutCard
                            title="Value by category"
                            subtitle="Share of stock value"
                            icon={<Layers className="h-3.5 w-3.5" />}
                            data={categoryData}
                            unit="ZMW"
                            formatValue={formatCompact}
                        />
                        <Panel
                            title="Expiring soon"
                            subtitle={`${formatCurrency(expiringAtRisk)} at risk • issue first`}
                            icon={<CalendarClock className="h-3.5 w-3.5" />}
                            rows={expiring}
                            emptyText="No batches expire in the next 90 days."
                            renderRow={(b) => (
                                <li
                                    key={b.id}
                                    className="flex items-center justify-between gap-2 px-2.5 py-2 hover:bg-slate-50"
                                >
                                    <div className="min-w-0">
                                        <p className="truncate text-sm font-medium text-slate-800">
                                            {b.name}
                                        </p>
                                        <p className="text-xs text-slate-500">
                                            {b.batch_number} · {b.quantity}{' '}
                                            {b.unit}
                                        </p>
                                        <p className="text-[11px] text-slate-400">
                                            {formatDate(b.expiry_date)} ·{' '}
                                            {formatCurrency(b.value_at_risk)}
                                        </p>
                                    </div>
                                    <span
                                        className={cx(
                                            'shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium whitespace-nowrap',
                                            b.days_remaining <= 30
                                                ? 'bg-red-100 text-red-800'
                                                : b.days_remaining <= 60
                                                  ? 'bg-yellow-100 text-yellow-800'
                                                  : 'bg-slate-100 text-slate-600',
                                        )}
                                    >
                                        {b.days_remaining}d left
                                    </span>
                                </li>
                            )}
                        />
                    </div>

                    {/* Reorder now table */}
                    <section className="rounded-xl bg-white p-4 shadow-sm">
                        <h2 className="mb-2 text-sm font-semibold text-slate-800">
                            Reorder now
                        </h2>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Item</TableHead>
                                    <TableHead>Stock vs par</TableHead>
                                    <TableHead className="text-right">
                                        Reorder cost
                                    </TableHead>
                                    <TableHead>Status</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {criticalItems.map((item) => {
                                    const pct = Math.min(
                                        100,
                                        Math.round(
                                            (item.current_stock /
                                                Math.max(1, item.par_level)) *
                                                100,
                                        ),
                                    );
                                    const reorderQty = Math.max(
                                        0,
                                        item.par_level - item.current_stock,
                                    );
                                    return (
                                        <TableRow key={item.id}>
                                            <TableCell>
                                                <p className="font-medium">
                                                    {item.name}
                                                </p>
                                                <p className="text-xs text-slate-400">
                                                    {item.sku} · {item.category}
                                                </p>
                                            </TableCell>
                                            <TableCell className="min-w-36">
                                                <p className="text-xs text-slate-600">
                                                    {item.current_stock} /{' '}
                                                    {item.par_level} {item.unit}
                                                </p>
                                                <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-200">
                                                    <div
                                                        className="h-full rounded-full"
                                                        style={{
                                                            width: `${pct}%`,
                                                            backgroundColor:
                                                                item.status ===
                                                                    'out_of_stock' ||
                                                                item.status ===
                                                                    'critical'
                                                                    ? '#dc2626'
                                                                    : '#d97706',
                                                        }}
                                                    />
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-right text-slate-600">
                                                {formatCurrency(
                                                    reorderQty * item.unit_cost,
                                                )}
                                                <p className="text-xs text-slate-400">
                                                    {reorderQty} {item.unit}
                                                </p>
                                            </TableCell>
                                            <TableCell>
                                                <StatusPill
                                                    status={item.status}
                                                />
                                            </TableCell>
                                        </TableRow>
                                    );
                                })}
                                {criticalItems.length === 0 && (
                                    <TableRow>
                                        <TableCell
                                            colSpan={4}
                                            className="py-6 text-center text-xs text-slate-500"
                                        >
                                            Every item is at or above par level.
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </section>

                    {/* Purchase orders table */}
                    <section className="rounded-xl bg-white p-4 shadow-sm">
                        <h2 className="mb-2 text-sm font-semibold text-slate-800">
                            Active purchase orders
                        </h2>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>PO number</TableHead>
                                    <TableHead>Supplier</TableHead>
                                    <TableHead>Expected</TableHead>
                                    <TableHead className="text-right">
                                        Total
                                    </TableHead>
                                    <TableHead>Status</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {purchaseOrders.map((po: PurchaseOrder) => (
                                    <TableRow key={po.id}>
                                        <TableCell className="font-medium">
                                            {po.po_number}
                                            <p className="text-xs font-normal text-slate-400">
                                                {po.items_count} items
                                            </p>
                                        </TableCell>
                                        <TableCell className="text-slate-600">
                                            {po.supplier}
                                        </TableCell>
                                        <TableCell className="text-xs text-slate-500 tabular-nums">
                                            {formatDate(po.expected_date)}
                                        </TableCell>
                                        <TableCell className="text-right text-slate-600">
                                            {formatCurrency(po.total_amount)}
                                        </TableCell>
                                        <TableCell>
                                            <StatusPill status={po.status} />
                                        </TableCell>
                                    </TableRow>
                                ))}
                                {purchaseOrders.length === 0 && (
                                    <TableRow>
                                        <TableCell
                                            colSpan={5}
                                            className="py-6 text-center text-xs text-slate-500"
                                        >
                                            No open purchase orders.
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </section>
                </div>

                {/* ================= RIGHT COLUMN ================= */}
                <div className="grid min-h-0 grid-rows-[minmax(0,1fr)_minmax(0,1fr)] gap-3 overflow-hidden">
                    {/* Recent requisitions */}
                    <Panel
                        title="Department requisitions"
                        subtitle="Most recent"
                        icon={<ShoppingCart className="h-3.5 w-3.5" />}
                        rows={requisitions}
                        emptyText="No requisitions yet."
                        renderRow={(r) => (
                            <li
                                key={r.id}
                                className="flex items-center gap-2 px-2.5 py-2 hover:bg-slate-50"
                            >
                                <Avatar className="h-7 w-7">
                                    <AvatarFallback className="bg-slate-100 text-[10px] text-slate-600">
                                        {getInitials(r.requested_by)}
                                    </AvatarFallback>
                                </Avatar>
                                <div className="min-w-0 flex-1">
                                    <p className="truncate text-sm font-medium text-slate-800">
                                        {r.req_number}
                                    </p>
                                    <p className="truncate text-xs text-slate-500">
                                        {r.department} · {r.items_count} items ·{' '}
                                        {formatCurrency(r.estimated_value)}
                                    </p>
                                    <p className="text-[11px] text-slate-400">
                                        {r.requested_by} ·{' '}
                                        {formatRelative(r.requested_at)}
                                    </p>
                                </div>
                                <div className="flex shrink-0 flex-col items-end gap-1">
                                    <StatusPill status={r.priority} />
                                    <StatusPill status={r.status} />
                                </div>
                            </li>
                        )}
                    />

                    {/* Stock alerts */}
                    <Panel
                        title="Stock alerts"
                        subtitle="Out of stock & below par"
                        icon={<Bell className="h-3.5 w-3.5" />}
                        rows={criticalItems}
                        emptyText="No stock alerts."
                        renderRow={(item) => (
                            <li
                                key={item.id}
                                className="flex items-center justify-between gap-2 px-2.5 py-2 hover:bg-slate-50"
                            >
                                <div className="min-w-0">
                                    <p className="truncate text-sm font-medium text-slate-800">
                                        {item.name}
                                    </p>
                                    <p className="text-xs text-slate-500">
                                        {item.current_stock} / {item.par_level}{' '}
                                        {item.unit}
                                    </p>
                                </div>
                                <StatusPill status={item.status} />
                            </li>
                        )}
                    />
                </div>
            </div>
        </AppLayout>
    );
}
