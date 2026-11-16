// resources/js/pages/receptions/dashboard.tsx

import { useMemo, useState, type ReactNode } from 'react';
import {
    AlertTriangle,
    Banknote,
    Bell,
    CalendarCheck,
    CalendarClock,
    CircleDollarSign,
    ClipboardList,
    CreditCard,
    ReceiptText,
    Search,
    Smartphone,
    UserCheck,
    Users,
    Wallet,
} from 'lucide-react';

import AppLayout from '@/layouts/app/app-header-layout';
import PageHeader from '@/components/PageHeader';
import { usePage } from '@inertiajs/react';

// ─── Types (match ReceptionDashboardController props) ───────

type QueueStatus = 'waiting' | 'in-progress' | 'completed';
type AlertCategory = 'warning' | 'danger' | 'success' | 'info';

interface ReceptionStats {
    registeredPatients: number;
    visitsToday: number;
    activeTreatments: number;
    urgentReferrals: number;
}

interface ReceptionVisit {
    id: number;
    token: string;
    name: string;
    service: string;
    waitingMinutes: number;
    status: QueueStatus;
}

interface ReceptionAlert {
    id: number;
    title: string;
    description: string;
    category: AlertCategory;
    time: string;
}

interface SummaryDatum {
    label: string;
    value: number;
    color: string;
}

interface TrendDatum {
    month: string;
    visits: number;
}

interface PaymentStats {
    pendingBillsToday: number;
    pendingAmountToday: number;
    collectedToday: number;
    byMethod: {
        cash: number;
        card: number;
        mobile: number;
        insurance: number;
    };
}

interface PatientFlow {
    seenToday: number;
    inQueue: number;
    checkedIn: number;
    completed: number;
}

interface ReceptionDashboardProps {
    stats?: Partial<ReceptionStats> | null;
    visits?: ReceptionVisit[] | null;
    alerts?: ReceptionAlert[] | null;
    serviceData?: SummaryDatum[] | null;
    attendanceTrend?: TrendDatum[] | null;
    paymentStats?: Partial<PaymentStats> | null;
    patientFlow?: Partial<PatientFlow> | null;
}

// ─── Helpers ────────────────────────────────────────────────

/** Laravel decimals/aggregates can arrive as strings — always coerce. */
const num = (value: unknown): number => {
    const n = Number(value);
    return Number.isFinite(n) ? n : 0;
};

/** Zambian kwacha, e.g. K12,450 */
const formatZMW = (value: unknown): string =>
    `K${num(value).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;

const plural = (count: number, singular: string, pluralForm = `${singular}s`) =>
    `${count} ${count === 1 ? singular : pluralForm}`;

// ─── Style maps ─────────────────────────────────────────────

const STATUS_STYLES: Record<QueueStatus, string> = {
    waiting: 'bg-yellow-100 text-yellow-800',
    'in-progress': 'bg-blue-100 text-blue-800',
    completed: 'bg-green-100 text-green-800',
};

const ALERT_STYLES: Record<
    AlertCategory,
    { icon: typeof Bell; color: string; bg: string }
> = {
    danger: { icon: AlertTriangle, color: 'text-red-600', bg: 'bg-red-50' },
    warning: {
        icon: CalendarClock,
        color: 'text-amber-600',
        bg: 'bg-amber-50',
    },
    success: { icon: UserCheck, color: 'text-green-600', bg: 'bg-green-50' },
    info: { icon: Bell, color: 'text-blue-600', bg: 'bg-blue-50' },
};

const METHOD_META = {
    cash: {
        label: 'Cash',
        color: '#16a34a',
        icon: <Banknote className="h-3.5 w-3.5" />,
    },
    card: {
        label: 'Card',
        color: '#2563eb',
        icon: <CreditCard className="h-3.5 w-3.5" />,
    },
    mobile: {
        label: 'Mobile',
        color: '#d97706',
        icon: <Smartphone className="h-3.5 w-3.5" />,
    },
    insurance: {
        label: 'Insurance',
        color: '#9333ea',
        icon: <ReceiptText className="h-3.5 w-3.5" />,
    },
} as const;

type MethodKey = keyof typeof METHOD_META;

// ─── StatCard ───────────────────────────────────────────────

function StatCard({
    label,
    value,
    icon,
    tone,
    format,
}: {
    label: string;
    value: number;
    icon: ReactNode;
    tone: string;
    format?: (n: number) => string;
}) {
    const safeValue = num(value);

    return (
        <div
            className={`flex items-center justify-between gap-2 rounded-lg px-3 py-3 shadow-sm ${tone}`}
        >
            <div className="min-w-0">
                <p className="truncate text-xs font-medium text-slate-600">
                    {label}
                </p>
                <p className="truncate text-2xl leading-tight font-semibold text-slate-900">
                    {format ? format(safeValue) : safeValue.toLocaleString()}
                </p>
            </div>

            <div className="shrink-0 rounded-md bg-white/70 p-2 text-slate-700">
                {icon}
            </div>
        </div>
    );
}

// ─── Service breakdown (donut) ──────────────────────────────

function ServiceBreakdown({ data }: { data: SummaryDatum[] }) {
    const total = data.reduce((sum, item) => sum + num(item.value), 0);
    let accumulated = 0;

    const gradient = data
        .map((item) => {
            const start = accumulated;
            accumulated += total > 0 ? (num(item.value) / total) * 100 : 0;
            return `${item.color} ${start}% ${accumulated}%`;
        })
        .join(', ');

    return (
        <section className="rounded-xl bg-white p-4 shadow-sm">
            <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold text-slate-800">
                <ClipboardList className="h-4 w-4 text-slate-500" />
                Reception Services
            </h2>

            <div className="grid grid-cols-2 items-center gap-4">
                <div className="flex justify-center">
                    <div
                        className="relative flex h-36 w-36 items-center justify-center rounded-full"
                        style={{
                            background:
                                total > 0
                                    ? `conic-gradient(${gradient})`
                                    : '#e2e8f0',
                        }}
                    >
                        <div className="flex h-24 w-24 flex-col items-center justify-center rounded-full bg-white">
                            <span className="text-2xl font-semibold text-slate-900">
                                {total}
                            </span>
                            <span className="text-[10px] text-slate-500">
                                Total visits
                            </span>
                        </div>
                    </div>
                </div>

                <div className="space-y-3">
                    {data.map((item) => (
                        <div key={item.label}>
                            <div className="mb-1 flex items-center justify-between gap-2 text-xs">
                                <span className="truncate text-slate-600">
                                    {item.label}
                                </span>
                                <span className="font-semibold text-slate-800">
                                    {num(item.value)}
                                </span>
                            </div>

                            <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
                                <div
                                    className="h-full rounded-full"
                                    style={{
                                        width: `${total > 0 ? (num(item.value) / total) * 100 : 0}%`,
                                        backgroundColor: item.color,
                                    }}
                                />
                            </div>
                        </div>
                    ))}

                    {data.length === 0 && (
                        <p className="text-xs text-slate-500">
                            No services recorded today.
                        </p>
                    )}
                </div>
            </div>
        </section>
    );
}

// ─── Attendance trend bar chart ─────────────────────────────

function AttendanceTrend({ data }: { data: TrendDatum[] }) {
    const max = Math.max(...data.map((item) => num(item.visits)), 1);

    return (
        <section className="rounded-xl bg-white p-4 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
                <div>
                    <h2 className="text-sm font-semibold text-slate-800">
                        Reception Attendance Trend
                    </h2>
                    <p className="text-xs text-slate-500">
                        Monthly patient visits
                    </p>
                </div>

                <span className="rounded-md bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700">
                    Last 6 months
                </span>
            </div>

            {data.length === 0 ? (
                <p className="py-10 text-center text-xs text-slate-500">
                    No attendance data yet.
                </p>
            ) : (
                <div className="flex h-36 items-end justify-between gap-3">
                    {data.map((item) => (
                        <div
                            key={item.month}
                            className="flex h-full flex-1 flex-col items-center justify-end gap-2"
                        >
                            <span className="text-[10px] text-slate-500">
                                {num(item.visits)}
                            </span>

                            <div
                                className="w-full max-w-10 rounded-t-md bg-blue-500 transition-all hover:bg-blue-700"
                                style={{
                                    height: `${(num(item.visits) / max) * 75}%`,
                                }}
                                title={`${num(item.visits)} visits`}
                            />

                            <span className="text-[10px] text-slate-500">
                                {item.month}
                            </span>
                        </div>
                    ))}
                </div>
            )}
        </section>
    );
}

// ─── Patient queue table ────────────────────────────────────

function ReceptionQueue({ rows }: { rows: ReceptionVisit[] }) {
    return (
        <section className="rounded-xl bg-white p-4 shadow-sm">
            <div className="mb-3 flex items-center justify-between">
                <div>
                    <h2 className="text-sm font-semibold text-slate-800">
                        Today's Reception Visits
                    </h2>
                    <p className="text-xs text-slate-500">
                        Patient intake and service queue
                    </p>
                </div>

                <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700">
                    {plural(rows.length, 'visit')}
                </span>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                    <thead className="text-slate-500">
                        <tr className="border-b border-slate-200">
                            <th className="py-2 pr-3 font-medium">Patient</th>
                            <th className="py-2 pr-3 font-medium">Reference</th>
                            <th className="py-2 pr-3 font-medium">Service</th>
                            <th className="py-2 pr-3 font-medium">Waiting</th>
                            <th className="py-2 font-medium">Status</th>
                        </tr>
                    </thead>

                    <tbody>
                        {rows.map((patient) => (
                            <tr
                                key={patient.id}
                                className="border-b border-slate-100 last:border-0"
                            >
                                <td className="py-3 pr-3 font-medium text-slate-800">
                                    {patient.name}
                                </td>
                                <td className="py-3 pr-3 text-slate-600">
                                    {patient.token}
                                </td>
                                <td className="py-3 pr-3 text-slate-600">
                                    {patient.service_name}
                                </td>
                                <td className="py-3 pr-3 text-slate-600">
                                    {patient.status === 'completed'
                                        ? '—'
                                        : `${num(patient.waitingMinutes)} min`}
                                </td>
                                <td className="py-3">
                                    <span
                                        className={`rounded-full px-2 py-1 text-[10px] font-medium capitalize ${
                                            STATUS_STYLES[patient.status] ??
                                            'bg-slate-100 text-slate-700'
                                        }`}
                                    >
                                        {String(patient.status).replace(
                                            '-',
                                            ' ',
                                        )}
                                    </span>
                                </td>
                            </tr>
                        ))}

                        {rows.length === 0 && (
                            <tr>
                                <td
                                    colSpan={5}
                                    className="py-8 text-center text-slate-500"
                                >
                                    No visits today.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </section>
    );
}

// ─── Payment breakdown (donut) ──────────────────────────────

function PaymentBreakdown({ stats }: { stats: PaymentStats }) {
    const entries = (Object.keys(METHOD_META) as MethodKey[]).map(
        (key) => [key, num(stats.byMethod[key])] as [MethodKey, number],
    );
    const total = entries.reduce((s, [, v]) => s + v, 0);
    let accumulated = 0;

    const gradient = entries
        .map(([k, v]) => {
            const start = accumulated;
            accumulated += total > 0 ? (v / total) * 100 : 0;
            return `${METHOD_META[k].color} ${start}% ${accumulated}%`;
        })
        .join(', ');

    return (
        <section className="rounded-xl bg-white p-4 shadow-sm">
            <div className="mb-4 flex items-start justify-between">
                <div>
                    <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-800">
                        <Wallet className="h-4 w-4 text-slate-500" />
                        Payments by Method
                    </h2>
                    <p className="mt-1 text-xs text-slate-500">
                        Today's collections breakdown
                    </p>
                </div>

                <span className="rounded-md bg-slate-100 px-2 py-1 text-[10px] font-medium text-slate-600">
                    Today
                </span>
            </div>

            <div className="flex items-center gap-5">
                <div
                    className="relative flex h-24 w-24 shrink-0 items-center justify-center rounded-full"
                    style={{
                        background:
                            total > 0
                                ? `conic-gradient(${gradient})`
                                : '#e2e8f0',
                    }}
                >
                    <div className="flex h-[68px] w-[68px] flex-col items-center justify-center rounded-full bg-white">
                        <span className="text-sm font-bold text-slate-800 tabular-nums">
                            {formatZMW(stats.collectedToday)}
                        </span>
                        <span className="text-[9px] text-slate-400">
                            Collected
                        </span>
                    </div>
                </div>

                <div className="min-w-0 flex-1 space-y-3">
                    {entries.map(([k, v]) => {
                        const percentage =
                            total > 0 ? Math.round((v / total) * 100) : 0;

                        return (
                            <div key={k}>
                                <div className="mb-1 flex items-center justify-between gap-2">
                                    <div className="flex min-w-0 items-center gap-2">
                                        <span
                                            className="h-2 w-2 shrink-0 rounded-full"
                                            style={{
                                                backgroundColor:
                                                    METHOD_META[k].color,
                                            }}
                                        />
                                        <span className="flex items-center gap-1 truncate text-[11px] text-slate-600">
                                            {METHOD_META[k].icon}
                                            {METHOD_META[k].label}
                                        </span>
                                    </div>

                                    <span className="text-[11px] font-semibold text-slate-800 tabular-nums">
                                        {formatZMW(v)}
                                    </span>
                                </div>

                                <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
                                    <div
                                        className="h-full rounded-full"
                                        style={{
                                            width: `${percentage}%`,
                                            backgroundColor:
                                                METHOD_META[k].color,
                                        }}
                                    />
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </section>
    );
}

// ─── Patient flow (seen vs queue) ───────────────────────────

function PatientFlowCard({ flow }: { flow: PatientFlow }) {
    const total = Math.max(flow.seenToday + flow.inQueue, 1);
    const seenPct = (flow.seenToday / total) * 100;
    const queuePct = (flow.inQueue / total) * 100;

    return (
        <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="mb-4 flex items-start justify-between">
                <div>
                    <h3 className="text-sm font-semibold text-slate-800">
                        Patient Flow
                    </h3>
                    <p className="mt-1 text-xs text-slate-500">
                        Seen vs. still in queue today
                    </p>
                </div>

                <span className="rounded-md bg-slate-100 px-2 py-1 text-[10px] font-medium text-slate-600">
                    Today
                </span>
            </div>

            <div className="grid grid-cols-2 gap-2">
                <div className="rounded-lg bg-emerald-50 p-2.5 ring-1 ring-emerald-100">
                    <div className="flex items-center gap-1 text-[10px] font-medium tracking-wide text-emerald-700 uppercase">
                        <UserCheck className="h-3 w-3" />
                        Seen
                    </div>
                    <p className="text-xl font-bold text-emerald-900 tabular-nums">
                        {flow.seenToday.toLocaleString()}
                    </p>
                    <p className="text-[10px] text-emerald-700/80">
                        {seenPct.toFixed(0)}% of visitors
                    </p>
                </div>

                <div className="rounded-lg bg-amber-50 p-2.5 ring-1 ring-amber-100">
                    <div className="flex items-center gap-1 text-[10px] font-medium tracking-wide text-amber-700 uppercase">
                        <CalendarClock className="h-3 w-3" />
                        In queue
                    </div>
                    <p className="text-xl font-bold text-amber-900 tabular-nums">
                        {flow.inQueue.toLocaleString()}
                    </p>
                    <p className="text-[10px] text-amber-700/80">
                        {queuePct.toFixed(0)}% of visitors
                    </p>
                </div>
            </div>

            <div className="mt-3 flex h-1.5 overflow-hidden rounded-full bg-slate-100">
                <div
                    className="h-full bg-emerald-500 transition-all"
                    style={{ width: `${seenPct}%` }}
                />
                <div
                    className="h-full bg-amber-500 transition-all"
                    style={{ width: `${queuePct}%` }}
                />
            </div>

            <div className="mt-3 flex items-center justify-between text-[11px] text-slate-500">
                <span>
                    Checked in:{' '}
                    <b className="text-slate-700">{flow.checkedIn}</b>
                </span>
                <span>
                    Completed:{' '}
                    <b className="text-slate-700">{flow.completed}</b>
                </span>
            </div>
        </section>
    );
}

// ─── Pending bills card ─────────────────────────────────────

function PendingBillsCard({ stats }: { stats: PaymentStats }) {
    const pendingPct = Math.min(
        (stats.pendingAmountToday /
            Math.max(stats.collectedToday + stats.pendingAmountToday, 1)) *
            100,
        100,
    );

    return (
        <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="mb-4 flex items-start justify-between">
                <div>
                    <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-800">
                        <ReceiptText className="h-4 w-4 text-slate-500" />
                        Pending Bills
                    </h3>
                    <p className="mt-1 text-xs text-slate-500">
                        Invoices awaiting payment today
                    </p>
                </div>

                <span className="rounded-md bg-amber-50 px-2 py-1 text-[10px] font-medium text-amber-700">
                    Today
                </span>
            </div>

            <div className="flex items-center gap-5">
                <div
                    className="relative flex h-24 w-24 shrink-0 items-center justify-center rounded-full"
                    style={{
                        background: `conic-gradient(#f59e0b 0% ${pendingPct}%, #e2e8f0 ${pendingPct}% 100%)`,
                    }}
                >
                    <div className="flex h-[68px] w-[68px] flex-col items-center justify-center rounded-full bg-white">
                        <span className="text-lg font-bold text-slate-800 tabular-nums">
                            {stats.pendingBillsToday}
                        </span>
                        <span className="text-[9px] text-slate-400">
                            unpaid
                        </span>
                    </div>
                </div>

                <div className="min-w-0 flex-1 space-y-2">
                    <div className="flex items-center gap-2 text-xs text-slate-600">
                        <CircleDollarSign className="h-4 w-4 shrink-0 text-amber-600" />
                        <span className="text-sm font-semibold text-slate-800 tabular-nums">
                            {formatZMW(stats.pendingAmountToday)}
                        </span>
                        <span className="text-[11px] text-slate-500">
                            outstanding
                        </span>
                    </div>

                    <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
                        <div
                            className="h-full rounded-full bg-amber-500"
                            style={{ width: `${pendingPct}%` }}
                        />
                    </div>

                    <p className="text-[11px] text-slate-500">
                        {pendingPct.toFixed(0)}% of today's billings still
                        unpaid
                    </p>
                </div>
            </div>
        </section>
    );
}

// ─── Notifications panel ────────────────────────────────────

function NotificationsPanel({ alerts }: { alerts: ReceptionAlert[] }) {
    const [filter, setFilter] = useState('all');
    const [query, setQuery] = useState('');

    const visible = useMemo(() => {
        const q = query.toLowerCase();

        return alerts.filter((alert) => {
            const matchesFilter = filter === 'all' || alert.category === filter;
            const matchesSearch = `${alert.title} ${alert.description}`
                .toLowerCase()
                .includes(q);

            return matchesFilter && matchesSearch;
        });
    }, [alerts, filter, query]);

    return (
        <div className="grid">
            <section className="flex h-full min-h-[500px] min-w-0 flex-col rounded-xl border border-slate-200 bg-white shadow-sm">
                <header className="flex items-center justify-between px-4 pt-4">
                    <div>
                        <h2 className="text-sm font-semibold text-slate-800">
                            Notifications
                        </h2>
                        <p className="text-xs text-slate-500">
                            Reception and billing alerts
                        </p>
                    </div>

                    <span className="text-lg font-semibold text-slate-900">
                        {alerts.length}
                    </span>
                </header>

                <div className="space-y-3 px-4 py-3">
                    <div className="relative">
                        <Search className="absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />

                        <input
                            type="search"
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            placeholder="Search notifications..."
                            className="w-full rounded-md bg-slate-100 py-2 pr-2 pl-8 text-xs outline-none focus:ring-2 focus:ring-blue-200"
                        />
                    </div>

                    <div className="flex flex-wrap gap-1.5">
                        {['all', 'danger', 'warning', 'success', 'info'].map(
                            (item) => (
                                <button
                                    key={item}
                                    type="button"
                                    onClick={() => setFilter(item)}
                                    className={`rounded-full px-2.5 py-1 text-[11px] font-medium capitalize transition-colors ${
                                        filter === item
                                            ? 'bg-slate-800 text-white'
                                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                    }`}
                                >
                                    {item}
                                </button>
                            ),
                        )}
                    </div>
                </div>

                <ul className="min-h-0 flex-1 space-y-1 overflow-y-auto px-2 pb-3">
                    {visible.map((alert) => {
                        const style =
                            ALERT_STYLES[alert.category] ?? ALERT_STYLES.info;
                        const Icon = style.icon;

                        return (
                            <li
                                key={alert.id}
                                className="flex items-start gap-3 rounded-lg px-2 py-3 transition-colors hover:bg-slate-50"
                            >
                                <span
                                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${style.bg} ${style.color}`}
                                >
                                    <Icon className="h-4 w-4" />
                                </span>

                                <div className="min-w-0 flex-1">
                                    <div className="flex justify-between gap-2">
                                        <p className="truncate text-xs font-semibold text-slate-800">
                                            {alert.title}
                                        </p>
                                        <span className="shrink-0 text-[10px] text-slate-400">
                                            {alert.time}
                                        </span>
                                    </div>

                                    <p className="mt-1 text-[11px] text-slate-500">
                                        {alert.description}
                                    </p>
                                </div>
                            </li>
                        );
                    })}

                    {visible.length === 0 && (
                        <li className="py-8 text-center text-xs text-slate-500">
                            No notifications found.
                        </li>
                    )}
                </ul>
            </section>
        </div>
    );
}

// ─── Main page ──────────────────────────────────────────────

export default function ReceptionDashboard({
    stats: incomingStats,
    visits: incomingVisits,
    alerts: incomingAlerts,
    serviceData: incomingServiceData,
    attendanceTrend: incomingTrend,
    paymentStats: incomingPayments,
    patientFlow: incomingFlow,
}: ReceptionDashboardProps) {
    // All data comes from the backend. Missing values fall back to zero/empty
    // (never fake numbers) so the page always renders safely.
    const stats: ReceptionStats = {
        registeredPatients: num(incomingStats?.registeredPatients),
        visitsToday: num(incomingStats?.visitsToday),
        activeTreatments: num(incomingStats?.activeTreatments),
        urgentReferrals: num(incomingStats?.urgentReferrals),
    };

    const visits = incomingVisits ?? [];
    const alerts = incomingAlerts ?? [];
    const serviceData = incomingServiceData ?? [];
    const attendanceTrend = incomingTrend ?? [];

    const paymentStats: PaymentStats = {
        pendingBillsToday: num(incomingPayments?.pendingBillsToday),
        pendingAmountToday: num(incomingPayments?.pendingAmountToday),
        collectedToday: num(incomingPayments?.collectedToday),
        byMethod: {
            cash: num(incomingPayments?.byMethod?.cash),
            card: num(incomingPayments?.byMethod?.card),
            mobile: num(incomingPayments?.byMethod?.mobile),
            insurance: num(incomingPayments?.byMethod?.insurance),
        },
    };

    const patientFlow: PatientFlow = {
        seenToday: num(incomingFlow?.seenToday),
        inQueue: num(incomingFlow?.inQueue),
        checkedIn: num(incomingFlow?.checkedIn),
        completed: num(incomingFlow?.completed),
    };

    const statCards = [
        {
            label: 'Registered Patients',
            value: stats.registeredPatients,
            icon: <Users className="h-4 w-4" />,
            tone: 'bg-blue-100',
        },
        {
            label: "Today's Visits",
            value: stats.visitsToday,
            icon: <CalendarCheck className="h-4 w-4" />,
            tone: 'bg-green-100',
        },
        {
            label: 'Collected Today',
            value: paymentStats.collectedToday,
            icon: <Wallet className="h-4 w-4" />,
            tone: 'bg-yellow-100',
            format: formatZMW,
        },
        {
            label: 'Pending Bills',
            value: paymentStats.pendingBillsToday,
            icon: <ReceiptText className="h-4 w-4" />,
            tone: 'bg-red-100',
        },
    ];

    console.log(usePage());

    return (
        <AppLayout
            breadcrumbs={[
                { href: '/dashboard', title: 'Altaf Memorial Hospital' },
                { href: '/dashboard', title: 'Dashboard' },
                { href: '', title: 'Reception' },
            ]}
        >
            <div className="bg-blue-50 p-2">
                <PageHeader
                    icon={<Users className="h-5 w-5" />}
                    title="Reception Department"
                    subtitle="Manage patient intake, queues, billing and payment collection"
                />
            </div>

            <div className="grid min-h-screen grid-cols-1 gap-4 bg-blue-50 p-4 lg:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)]">
                {/* LEFT CONTENT */}
                <div className="flex min-w-0 flex-col gap-4">
                    {/* KPI CARDS */}
                    <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
                        {statCards.map((card) => (
                            <StatCard key={card.label} {...card} />
                        ))}
                    </div>

                    {/* SERVICE DISTRIBUTION */}
                    <ServiceBreakdown data={serviceData} />

                    {/* ATTENDANCE TREND */}
                    <AttendanceTrend data={attendanceTrend} />

                    {/* PATIENT QUEUE */}
                    <ReceptionQueue rows={visits} />
                </div>

                {/* RIGHT CONTENT */}
                <div className="min-w-0">
                    <div className="grid min-w-0 grid-cols-1 gap-4 xl:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]">
                        <div className="flex min-w-0 flex-col gap-4">
                            <PaymentBreakdown stats={paymentStats} />

                            <PendingBillsCard stats={paymentStats} />

                            <PatientFlowCard flow={patientFlow} />
                        </div>

                        <NotificationsPanel alerts={alerts} />
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}
