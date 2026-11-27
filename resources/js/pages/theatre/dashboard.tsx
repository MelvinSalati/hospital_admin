import { useMemo, useState, type ReactNode } from 'react';
import {
    AlertTriangle,
    Bell,
    CalendarCheck,
    CalendarClock,
    CheckCircle2,
    ClipboardList,
    Info,
    Scissors,
    Search,
    Users,
} from 'lucide-react';

import AppLayout from '@/layouts/app/app-header-layout';
import PageHeader from '@/components/PageHeader';

// ─── Types (match TheaterDashboardService::build()) ───────────

type CaseStatus = 'waiting' | 'completed';
type Priority = 'routine' | 'urgent' | 'emergency';
type AlertCategory = 'danger' | 'warning' | 'success' | 'info';

export interface TheaterStats {
    scheduledToday: number; // patients booked into theatre today
    completedToday: number; // patients cleared from theatre today
    inTheatre: number; // patients currently in the theatre queue
    emergencyCases: number; // emergency-priority patients today
}

export interface TheaterCase {
    id: number;
    patientCode: string; // visit token
    name: string;
    visitType: 'new' | 'revisit';
    priority: Priority;
    arrivedAt: string; // HH:mm
    minutes: number; // waiting time (open) or time spent (completed)
    status: CaseStatus;
}

export interface TheaterAlert {
    id: number;
    title: string;
    description: string;
    category: AlertCategory;
    createdAt: string; // ISO 8601
}

interface SummaryDatum {
    label: string;
    value: number;
    color: string;
}

interface TrendDatum {
    month: string;
    patients: number;
}

export interface TheaterDashboardProps {
    stats?: Partial<TheaterStats> | null;
    cases?: TheaterCase[] | null;
    alerts?: TheaterAlert[] | null;
    procedureData?: SummaryDatum[] | null;
    procedureTrend?: TrendDatum[] | null;
    urgencyData?: SummaryDatum[] | null;
    anaesthesiaData?: SummaryDatum[] | null;
}

// ─── Fallback data (used only when a prop is missing/null) ────

const DUMMY_STATS: TheaterStats = {
    scheduledToday: 14,
    completedToday: 8,
    inTheatre: 4,
    emergencyCases: 3,
};

const DUMMY_CASES: TheaterCase[] = [
    {
        id: 1,
        patientCode: '851504',
        name: 'Mary Phiri',
        visitType: 'revisit',
        priority: 'emergency',
        arrivedAt: '09:30',
        minutes: 42,
        status: 'waiting',
    },
    {
        id: 2,
        patientCode: '776684',
        name: 'John Banda',
        visitType: 'new',
        priority: 'urgent',
        arrivedAt: '10:05',
        minutes: 25,
        status: 'waiting',
    },
    {
        id: 3,
        patientCode: '761653',
        name: 'Grace Zulu',
        visitType: 'revisit',
        priority: 'routine',
        arrivedAt: '08:10',
        minutes: 95,
        status: 'completed',
    },
];

const DUMMY_ALERTS: TheaterAlert[] = [
    {
        id: 1,
        title: 'Emergency patient waiting',
        description: '851504 · Mary Phiri, waiting 42 min',
        category: 'danger',
        createdAt: new Date(Date.now() - 42 * 60_000).toISOString(),
    },
    {
        id: 2,
        title: 'Long wait in queue',
        description: '776684 · John Banda, waiting 75 min',
        category: 'warning',
        createdAt: new Date(Date.now() - 75 * 60_000).toISOString(),
    },
    {
        id: 3,
        title: 'Patient cleared from theatre',
        description: '761653 · Grace Zulu',
        category: 'success',
        createdAt: new Date(Date.now() - 100 * 60_000).toISOString(),
    },
];

const DUMMY_PROCEDURES: SummaryDatum[] = [
    { label: 'Caesarean Section', value: 18, color: '#2563eb' },
    { label: 'Appendectomy', value: 11, color: '#16a34a' },
    { label: 'Hernia Repair', value: 8, color: '#d97706' },
    { label: 'Minor Surgery', value: 6, color: '#9333ea' },
];

const DUMMY_TREND: TrendDatum[] = [
    { month: 'Jun', patients: 62 },
    { month: 'Jul', patients: 58 },
    { month: 'Aug', patients: 71 },
    { month: 'Sep', patients: 66 },
    { month: 'Oct', patients: 80 },
    { month: 'Nov', patients: 92 },
];

const DUMMY_URGENCY: SummaryDatum[] = [
    { label: 'Routine', value: 54, color: '#2563eb' },
    { label: 'Urgent', value: 28, color: '#f59e0b' },
    { label: 'Emergency', value: 18, color: '#dc2626' },
];

const DUMMY_ANAESTHESIA: SummaryDatum[] = [
    { label: 'General', value: 20, color: '#2563eb' },
    { label: 'Spinal', value: 14, color: '#16a34a' },
    { label: 'Local', value: 6, color: '#d97706' },
];

// ─── Helpers ──────────────────────────────────────────────────

const buildGradient = (
    data: { value: number; color: string }[],
    total: number,
) => {
    let acc = 0;
    return data
        .map((item) => {
            const start = acc;
            acc += total > 0 ? (item.value / total) * 100 : 0;
            return `${item.color} ${start}% ${acc}%`;
        })
        .join(', ');
};

const formatDuration = (minutes: number) => {
    const m = Math.max(0, Math.round(minutes));
    if (m < 60) return `${m} min`;
    const h = Math.floor(m / 60);
    const rem = m % 60;
    return rem ? `${h} h ${rem} min` : `${h} h`;
};

const timeAgo = (iso: string) => {
    const diff = Date.now() - new Date(iso).getTime();
    if (!Number.isFinite(diff)) return '';
    const mins = Math.max(0, Math.floor(diff / 60_000));
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins} min ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs} h ago`;
    return `${Math.floor(hrs / 24)} d ago`;
};

const CASE_STATUS_STYLES: Record<CaseStatus, string> = {
    waiting: 'bg-yellow-100 text-yellow-800',
    completed: 'bg-green-100 text-green-800',
};

const PRIORITY_STYLES: Record<Priority, string> = {
    routine: 'bg-slate-100 text-slate-700',
    urgent: 'bg-amber-100 text-amber-800',
    emergency: 'bg-red-100 text-red-800',
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
    success: { icon: CheckCircle2, color: 'text-green-600', bg: 'bg-green-50' },
    info: { icon: Info, color: 'text-blue-600', bg: 'bg-blue-50' },
};

const ALERT_FILTERS: { key: 'all' | AlertCategory; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'danger', label: 'Urgent' },
    { key: 'warning', label: 'Pending' },
    { key: 'success', label: 'Done' },
];

// ─── Stat card ────────────────────────────────────────────────

function StatCard({
    label,
    value,
    icon,
    tone,
}: {
    label: string;
    value: number;
    icon: ReactNode;
    tone: string;
}) {
    const safeValue = Number.isFinite(Number(value)) ? Number(value) : 0;

    return (
        <div
            className={`flex items-center justify-between gap-2 rounded-lg px-3 py-3 shadow-sm ${tone}`}
        >
            <div className="min-w-0">
                <p className="truncate text-xs font-medium text-slate-600">
                    {label}
                </p>
                <p className="text-2xl leading-tight font-semibold text-slate-900">
                    {safeValue.toLocaleString()}
                </p>
            </div>
            <div
                className="shrink-0 rounded-md bg-white/70 p-2 text-slate-700"
                aria-hidden="true"
            >
                {icon}
            </div>
        </div>
    );
}

// ─── Procedures this month (donut + bars) ─────────────────────

function ProcedureBreakdown({ data }: { data: SummaryDatum[] }) {
    const total = data.reduce((sum, item) => sum + item.value, 0);

    return (
        <section className="rounded-xl bg-white p-4 shadow-sm">
            <div className="mb-4 flex items-start justify-between">
                <div>
                    <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-800">
                        <ClipboardList
                            className="h-4 w-4 text-slate-500"
                            aria-hidden="true"
                        />
                        Procedures performed
                    </h2>
                    <p className="text-xs text-slate-500">
                        Most requested theatre procedures
                    </p>
                </div>
                <span className="rounded-md bg-slate-100 px-2 py-1 text-[10px] font-medium text-slate-600">
                    This month
                </span>
            </div>

            <div className="grid grid-cols-2 items-center gap-4">
                <div className="flex justify-center">
                    <div
                        role="img"
                        aria-label={`${total} procedures across ${data.length} types`}
                        className="relative flex h-36 w-36 items-center justify-center rounded-full"
                        style={{
                            background:
                                total > 0
                                    ? `conic-gradient(${buildGradient(data, total)})`
                                    : '#e2e8f0',
                        }}
                    >
                        <div className="flex h-24 w-24 flex-col items-center justify-center rounded-full bg-white">
                            <span className="text-2xl font-semibold text-slate-900">
                                {total}
                            </span>
                            <span className="text-[10px] text-slate-500">
                                Total procedures
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
                                    {item.value}
                                </span>
                            </div>
                            <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
                                <div
                                    className="h-full rounded-full"
                                    style={{
                                        width: `${total > 0 ? (item.value / total) * 100 : 0}%`,
                                        backgroundColor: item.color,
                                    }}
                                />
                            </div>
                        </div>
                    ))}
                    {data.length === 0 && (
                        <p className="text-xs text-slate-500">
                            No procedures recorded this month.
                        </p>
                    )}
                </div>
            </div>
        </section>
    );
}

// ─── Patient volume trend (bars) ──────────────────────────────

function VolumeTrend({ data }: { data: TrendDatum[] }) {
    const max = Math.max(...data.map((d) => d.patients), 1);

    return (
        <section className="rounded-xl bg-white p-4 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
                <div>
                    <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-800">
                        <Users
                            className="h-4 w-4 text-slate-500"
                            aria-hidden="true"
                        />
                        Theatre patient volume
                    </h2>
                    <p className="text-xs text-slate-500">
                        Patients received per month
                    </p>
                </div>
                <span className="rounded-md bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700">
                    Last 6 months
                </span>
            </div>

            <div className="flex h-36 items-end justify-between gap-3">
                {data.map((item) => (
                    <div
                        key={item.month}
                        className="flex h-full flex-1 flex-col items-center justify-end gap-2"
                    >
                        <span className="text-[10px] text-slate-500">
                            {item.patients}
                        </span>
                        <div
                            className="w-full max-w-10 rounded-t-md bg-blue-500 transition-colors hover:bg-blue-700"
                            style={{
                                height: `${(item.patients / max) * 75}%`,
                                minHeight: item.patients > 0 ? '4px' : '0',
                            }}
                            title={`${item.patients} patients`}
                        />
                        <span className="text-[10px] text-slate-500">
                            {item.month}
                        </span>
                    </div>
                ))}
                {data.length === 0 && (
                    <p className="w-full text-center text-xs text-slate-500">
                        No trend data available.
                    </p>
                )}
            </div>
        </section>
    );
}

// ─── Today's theatre queue ────────────────────────────────────

function TheatreList({ rows }: { rows: TheaterCase[] }) {
    return (
        <section className="rounded-xl bg-white p-4 shadow-sm">
            <div className="mb-3 flex items-center justify-between">
                <div>
                    <h2 className="text-sm font-semibold text-slate-800">
                        Today’s theatre queue
                    </h2>
                    <p className="text-xs text-slate-500">
                        Patients waiting and recently cleared
                    </p>
                </div>
                <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700">
                    {rows.length} patients
                </span>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                    <thead className="text-slate-500">
                        <tr className="border-b border-slate-200">
                            <th className="py-2 pr-3 font-medium">Arrived</th>
                            <th className="py-2 pr-3 font-medium">Patient</th>
                            <th className="py-2 pr-3 font-medium">Visit</th>
                            <th className="py-2 pr-3 font-medium">Priority</th>
                            <th className="py-2 pr-3 font-medium">Time</th>
                            <th className="py-2 font-medium">Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        {rows.map((c) => (
                            <tr
                                key={c.id}
                                className="border-b border-slate-100 last:border-0"
                            >
                                <td className="py-3 pr-3 text-slate-600 tabular-nums">
                                    {c.arrivedAt}
                                </td>
                                <td className="py-3 pr-3">
                                    <p className="font-medium text-slate-800">
                                        {c.name}
                                    </p>
                                    <p className="text-[10px] text-slate-500">
                                        {c.patientCode}
                                    </p>
                                </td>
                                <td className="py-3 pr-3 text-slate-600 capitalize">
                                    {c.visitType}
                                </td>
                                <td className="py-3 pr-3">
                                    <span
                                        className={`rounded-full px-2 py-1 text-[10px] font-medium whitespace-nowrap capitalize ${PRIORITY_STYLES[c.priority] ?? PRIORITY_STYLES.routine}`}
                                    >
                                        {c.priority}
                                    </span>
                                </td>
                                <td className="py-3 pr-3 whitespace-nowrap text-slate-600 tabular-nums">
                                    {formatDuration(c.minutes)}
                                </td>
                                <td className="py-3">
                                    <span
                                        className={`rounded-full px-2 py-1 text-[10px] font-medium whitespace-nowrap capitalize ${CASE_STATUS_STYLES[c.status] ?? CASE_STATUS_STYLES.waiting}`}
                                    >
                                        {c.status}
                                    </span>
                                </td>
                            </tr>
                        ))}
                        {rows.length === 0 && (
                            <tr>
                                <td
                                    colSpan={6}
                                    className="py-8 text-center text-slate-500"
                                >
                                    No patients in the theatre queue today.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </section>
    );
}

// ─── Summary card (donut + legend) ────────────────────────────

function SummaryCard({
    title,
    subtitle,
    data,
    emptyText,
}: {
    title: string;
    subtitle: string;
    data: SummaryDatum[];
    emptyText: string;
}) {
    const total = data.reduce((sum, item) => sum + item.value, 0);

    return (
        <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="mb-4 flex items-start justify-between">
                <div>
                    <h3 className="text-sm font-semibold text-slate-800">
                        {title}
                    </h3>
                    <p className="mt-1 text-xs text-slate-500">{subtitle}</p>
                </div>
                <span className="rounded-md bg-slate-100 px-2 py-1 text-[10px] font-medium text-slate-600">
                    This month
                </span>
            </div>

            <div className="flex items-center gap-5">
                <div
                    role="img"
                    aria-label={`${title}: ${total} total`}
                    className="relative flex h-24 w-24 shrink-0 items-center justify-center rounded-full"
                    style={{
                        background:
                            total > 0
                                ? `conic-gradient(${buildGradient(data, total)})`
                                : '#e2e8f0',
                    }}
                >
                    <div className="flex h-[68px] w-[68px] flex-col items-center justify-center rounded-full bg-white">
                        <span className="text-xl font-bold text-slate-800">
                            {total}
                        </span>
                        <span className="text-[9px] text-slate-500">Total</span>
                    </div>
                </div>

                <div className="min-w-0 flex-1 space-y-3">
                    {data.map((item) => {
                        const pct =
                            total > 0
                                ? Math.round((item.value / total) * 100)
                                : 0;
                        return (
                            <div key={item.label}>
                                <div className="mb-1 flex items-center justify-between gap-2">
                                    <div className="flex min-w-0 items-center gap-2">
                                        <span
                                            className="h-2 w-2 shrink-0 rounded-full"
                                            style={{
                                                backgroundColor: item.color,
                                            }}
                                            aria-hidden="true"
                                        />
                                        <span className="truncate text-[11px] text-slate-600">
                                            {item.label}
                                        </span>
                                    </div>
                                    <span className="text-[11px] font-semibold text-slate-800">
                                        {item.value}
                                    </span>
                                </div>
                                <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
                                    <div
                                        className="h-full rounded-full"
                                        style={{
                                            width: `${pct}%`,
                                            backgroundColor: item.color,
                                        }}
                                    />
                                </div>
                            </div>
                        );
                    })}
                    {data.length === 0 && (
                        <p className="text-xs text-slate-500">{emptyText}</p>
                    )}
                </div>
            </div>
        </section>
    );
}

// ─── Notifications ────────────────────────────────────────────

function NotificationsPanel({ alerts }: { alerts: TheaterAlert[] }) {
    const [filter, setFilter] = useState<'all' | AlertCategory>('all');
    const [query, setQuery] = useState('');

    const visible = useMemo(() => {
        const q = query.trim().toLowerCase();
        return alerts.filter(
            (a) =>
                (filter === 'all' || a.category === filter) &&
                (!q || `${a.title} ${a.description}`.toLowerCase().includes(q)),
        );
    }, [alerts, filter, query]);

    return (
        <section className="flex h-full min-h-[500px] min-w-0 flex-col rounded-xl border border-slate-200 bg-white shadow-sm">
            <header className="flex items-center justify-between px-4 pt-4">
                <div>
                    <h2 className="text-sm font-semibold text-slate-800">
                        Notifications
                    </h2>
                    <p className="text-xs text-slate-500">
                        Queue alerts and recent activity
                    </p>
                </div>
                <span className="text-lg font-semibold text-slate-900">
                    {alerts.length}
                </span>
            </header>

            <div className="space-y-3 px-4 py-3">
                <div className="relative">
                    <Search
                        className="absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2 text-slate-400"
                        aria-hidden="true"
                    />
                    <input
                        type="search"
                        aria-label="Search notifications"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="Search notifications…"
                        className="w-full rounded-md bg-slate-100 py-2 pr-2 pl-8 text-xs outline-none focus:ring-2 focus:ring-blue-200"
                    />
                </div>

                <div className="flex flex-wrap gap-1.5">
                    {ALERT_FILTERS.map(({ key, label }) => (
                        <button
                            key={key}
                            type="button"
                            aria-pressed={filter === key}
                            onClick={() => setFilter(key)}
                            className={`rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
                                filter === key
                                    ? 'bg-slate-800 text-white'
                                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                            }`}
                        >
                            {label}
                        </button>
                    ))}
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
                                aria-hidden="true"
                            >
                                <Icon className="h-4 w-4" />
                            </span>
                            <div className="min-w-0 flex-1">
                                <div className="flex justify-between gap-2">
                                    <p className="truncate text-xs font-semibold text-slate-800">
                                        {alert.title}
                                    </p>
                                    <span className="shrink-0 text-[10px] text-slate-500">
                                        {timeAgo(alert.createdAt)}
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
    );
}

// ─── Page ─────────────────────────────────────────────────────

export default function TheaterDashboard({
    stats: incomingStats,
    cases: incomingCases,
    alerts: incomingAlerts,
    procedureData: incomingProcedures,
    procedureTrend: incomingTrend,
    urgencyData: incomingUrgency,
    anaesthesiaData: incomingAnaesthesia,
}: TheaterDashboardProps = {}) {
    const stats: TheaterStats = { ...DUMMY_STATS, ...(incomingStats ?? {}) };
    const cases = incomingCases ?? DUMMY_CASES;
    const alerts = incomingAlerts ?? DUMMY_ALERTS;
    const procedureData = incomingProcedures ?? DUMMY_PROCEDURES;
    const trend = incomingTrend ?? DUMMY_TREND;
    const urgencyData = incomingUrgency ?? DUMMY_URGENCY;
    const anaesthesiaData = incomingAnaesthesia ?? DUMMY_ANAESTHESIA;

    const statCards = [
        {
            label: 'Booked today',
            value: stats.scheduledToday,
            icon: <CalendarCheck className="h-4 w-4" />,
            tone: 'bg-blue-100',
        },
        {
            label: 'Completed today',
            value: stats.completedToday,
            icon: <CheckCircle2 className="h-4 w-4" />,
            tone: 'bg-green-100',
        },
        {
            label: 'In theatre queue',
            value: stats.inTheatre,
            icon: <Scissors className="h-4 w-4" />,
            tone: 'bg-yellow-100',
        },
        {
            label: 'Emergency cases',
            value: stats.emergencyCases,
            icon: <AlertTriangle className="h-4 w-4" />,
            tone: 'bg-red-100',
        },
    ];

    return (
        <AppLayout
            breadcrumbs={[
                { href: '/dashboard', title: 'Altaf Memorial Hospital' },
                { href: '/dashboard', title: 'Dashboard' },
                { href: '', title: 'Theater' },
            ]}
        >
            <div className="bg-blue-50">
                <PageHeader
                    icon={<Scissors className="h-5 w-5" />}
                    title="Theater department"
                    subtitle="Monitor the theatre queue, procedures and patient priority"
                />
            </div>

            <div className="grid min-h-screen grid-cols-1 gap-4 overflow-hidden bg-blue-50 p-4 lg:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)]">
                {/* LEFT CONTENT */}
                <div className="flex min-h-0 flex-col gap-4 overflow-y-auto">
                    <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
                        {statCards.map((card) => (
                            <StatCard key={card.label} {...card} />
                        ))}
                    </div>

                    <ProcedureBreakdown data={procedureData} />
                    <VolumeTrend data={trend} />
                    <TheatreList rows={cases} />
                </div>

                {/* RIGHT CONTENT */}
                <div className="min-h-0">
                    <div className="grid min-w-0 grid-cols-1 gap-4 xl:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]">
                        <div className="flex min-w-0 flex-col gap-4">
                            <SummaryCard
                                title="Case urgency"
                                subtitle="Routine, urgent and emergency patients"
                                data={urgencyData}
                                emptyText="No patients this month."
                            />
                            <SummaryCard
                                title="Anaesthesia type"
                                subtitle="Anaesthesia ordered across procedures"
                                data={anaesthesiaData}
                                emptyText="No anaesthesia orders this month."
                            />
                        </div>

                        <NotificationsPanel alerts={alerts} />
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}
