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
    Timer,
} from 'lucide-react';

import AppLayout from '@/layouts/app/app-header-layout';
import PageHeader from '@/components/PageHeader';

// ─── Types ────────────────────────────────────────────────────

type CaseStatus =
    | 'scheduled'
    | 'pre-op'
    | 'in-theatre'
    | 'recovery'
    | 'completed'
    | 'cancelled';

type AlertCategory = 'danger' | 'warning' | 'success' | 'info';

export interface TheaterStats {
    scheduledToday: number;
    completedToday: number;
    inTheatre: number;
    emergencyCases: number;
}

export interface SurgicalCase {
    id: number;
    patientCode: string;
    name: string;
    procedure: string;
    surgeon: string;
    theatre: string;
    scheduledTime: string;
    status: CaseStatus;
}

export interface TheaterAlert {
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
    procedures: number;
}

interface UtilizationDatum {
    theatre: string;
    percent: number;
}

export interface TheaterDashboardProps {
    stats?: Partial<TheaterStats> | null;
    cases?: SurgicalCase[] | null;
    alerts?: TheaterAlert[] | null;
    procedureData?: SummaryDatum[] | null;
    procedureTrend?: TrendDatum[] | null;
    urgencyData?: SummaryDatum[] | null;
    anaesthesiaData?: SummaryDatum[] | null;
    utilization?: UtilizationDatum[] | null;
}

// ─── Fallback data (used when the controller sends nothing) ───

const DUMMY_STATS: TheaterStats = {
    scheduledToday: 14,
    completedToday: 8,
    inTheatre: 2,
    emergencyCases: 3,
};

const DUMMY_CASES: SurgicalCase[] = [
    {
        id: 1,
        patientCode: 'THT-00211',
        name: 'John Banda',
        procedure: 'Appendectomy',
        surgeon: 'Dr. Mwansa',
        theatre: 'Theatre 1',
        scheduledTime: '08:00',
        status: 'completed',
    },
    {
        id: 2,
        patientCode: 'THT-00212',
        name: 'Mary Phiri',
        procedure: 'Caesarean section',
        surgeon: 'Dr. Chanda',
        theatre: 'Theatre 2',
        scheduledTime: '09:30',
        status: 'in-theatre',
    },
    {
        id: 3,
        patientCode: 'THT-00213',
        name: 'Grace Zulu',
        procedure: 'Hernia repair',
        surgeon: 'Dr. Mwansa',
        theatre: 'Theatre 1',
        scheduledTime: '10:30',
        status: 'pre-op',
    },
    {
        id: 4,
        patientCode: 'THT-00214',
        name: 'Peter Tembo',
        procedure: 'Fracture fixation',
        surgeon: 'Dr. Banda',
        theatre: 'Theatre 3',
        scheduledTime: '11:15',
        status: 'recovery',
    },
    {
        id: 5,
        patientCode: 'THT-00215',
        name: 'Ruth Mulenga',
        procedure: 'Hysterectomy',
        surgeon: 'Dr. Chanda',
        theatre: 'Theatre 2',
        scheduledTime: '13:00',
        status: 'scheduled',
    },
];

const DUMMY_ALERTS: TheaterAlert[] = [
    {
        id: 1,
        title: 'Emergency case booked',
        description: 'THT-00218 · Obstructed labour, Theatre 2 requested',
        category: 'danger',
        time: '10 minutes ago',
    },
    {
        id: 2,
        title: 'Consent form missing',
        description: 'THT-00213 · Hernia repair, needs signed consent',
        category: 'warning',
        time: '25 minutes ago',
    },
    {
        id: 3,
        title: 'Blood cross-match pending',
        description: 'THT-00215 · Hysterectomy, awaiting lab',
        category: 'warning',
        time: '40 minutes ago',
    },
    {
        id: 4,
        title: 'Instrument sterilisation due',
        description: 'Theatre 3 · Set B autoclave cycle',
        category: 'info',
        time: '1 hour ago',
    },
    {
        id: 5,
        title: 'Procedure completed',
        description: 'THT-00211 · Appendectomy, moved to recovery',
        category: 'success',
        time: '2 hours ago',
    },
];

const DUMMY_PROCEDURES: SummaryDatum[] = [
    { label: 'General surgery', value: 38, color: '#2563eb' },
    { label: 'Obstetric', value: 29, color: '#16a34a' },
    { label: 'Orthopaedic', value: 21, color: '#d97706' },
    { label: 'Gynaecological', value: 14, color: '#9333ea' },
];

const DUMMY_TREND: TrendDatum[] = [
    { month: 'Jan', procedures: 62 },
    { month: 'Feb', procedures: 58 },
    { month: 'Mar', procedures: 71 },
    { month: 'Apr', procedures: 66 },
    { month: 'May', procedures: 80 },
    { month: 'Jun', procedures: 92 },
];

const DUMMY_URGENCY: SummaryDatum[] = [
    { label: 'Elective', value: 54, color: '#2563eb' },
    { label: 'Urgent', value: 28, color: '#f59e0b' },
    { label: 'Emergency', value: 18, color: '#dc2626' },
];

const DUMMY_ANAESTHESIA: SummaryDatum[] = [
    { label: 'General', value: 46, color: '#2563eb' },
    { label: 'Spinal', value: 34, color: '#0d9488' },
    { label: 'Local', value: 15, color: '#f59e0b' },
    { label: 'Sedation', value: 8, color: '#9333ea' },
];

const DUMMY_UTILIZATION: UtilizationDatum[] = [
    { theatre: 'Theatre 1', percent: 85 },
    { theatre: 'Theatre 2', percent: 92 },
    { theatre: 'Theatre 3', percent: 48 },
];

// ─── Helpers ──────────────────────────────────────────────────

const CHART_COLORS = ['#2563eb', '#16a34a', '#d97706', '#9333ea'] as const;

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

const CASE_STATUS_STYLES: Record<CaseStatus, string> = {
    scheduled: 'bg-slate-100 text-slate-700',
    'pre-op': 'bg-yellow-100 text-yellow-800',
    'in-theatre': 'bg-blue-100 text-blue-800',
    recovery: 'bg-purple-100 text-purple-800',
    completed: 'bg-green-100 text-green-800',
    cancelled: 'bg-red-100 text-red-800',
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

const utilizationColor = (percent: number) =>
    percent >= 90
        ? 'bg-red-500'
        : percent >= 70
          ? 'bg-amber-500'
          : 'bg-green-500';

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

// ─── Procedures by specialty (donut + bars) ───────────────────

function ProcedureBreakdown({ data }: { data: SummaryDatum[] }) {
    const total = data.reduce((sum, item) => sum + item.value, 0);

    return (
        <section className="rounded-xl bg-white p-4 shadow-sm">
            <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold text-slate-800">
                <ClipboardList
                    className="h-4 w-4 text-slate-500"
                    aria-hidden="true"
                />
                Procedures by specialty
            </h2>

            <div className="grid grid-cols-2 items-center gap-4">
                <div className="flex justify-center">
                    <div
                        role="img"
                        aria-label={`${total} procedures across ${data.length} specialties`}
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
                            No procedures recorded yet.
                        </p>
                    )}
                </div>
            </div>
        </section>
    );
}

// ─── Procedure trend (bars) ───────────────────────────────────

function ProcedureTrend({ data }: { data: TrendDatum[] }) {
    const max = Math.max(...data.map((d) => d.procedures), 1);

    return (
        <section className="rounded-xl bg-white p-4 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
                <div>
                    <h2 className="text-sm font-semibold text-slate-800">
                        Surgical volume trend
                    </h2>
                    <p className="text-xs text-slate-500">
                        Monthly procedures performed
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
                            {item.procedures}
                        </span>
                        <div
                            className="w-full max-w-10 rounded-t-md bg-blue-500 transition-colors hover:bg-blue-700"
                            style={{
                                height: `${(item.procedures / max) * 75}%`,
                            }}
                            title={`${item.procedures} procedures`}
                        />
                        <span className="text-[10px] text-slate-500">
                            {item.month}
                        </span>
                    </div>
                ))}
            </div>
        </section>
    );
}

// ─── Theatre utilization ──────────────────────────────────────

function TheatreUtilization({ data }: { data: UtilizationDatum[] }) {
    return (
        <section className="rounded-xl bg-white p-4 shadow-sm">
            <div className="mb-4">
                <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-800">
                    <Timer
                        className="h-4 w-4 text-slate-500"
                        aria-hidden="true"
                    />
                    Theatre utilization
                </h2>
                <p className="text-xs text-slate-500">
                    Booked time against available time today
                </p>
            </div>

            <ul className="space-y-3">
                {data.map((t) => {
                    const pct = Math.min(Math.max(t.percent, 0), 100);
                    return (
                        <li key={t.theatre}>
                            <div className="mb-1 flex justify-between text-xs">
                                <span className="font-medium text-slate-700">
                                    {t.theatre}
                                </span>
                                <span className="text-slate-600 tabular-nums">
                                    {pct}%
                                </span>
                            </div>
                            <div
                                role="progressbar"
                                aria-label={`${t.theatre} utilization`}
                                aria-valuenow={pct}
                                aria-valuemin={0}
                                aria-valuemax={100}
                                className="h-2 overflow-hidden rounded-full bg-slate-100"
                            >
                                <div
                                    className={`h-full rounded-full ${utilizationColor(pct)}`}
                                    style={{ width: `${pct}%` }}
                                />
                            </div>
                        </li>
                    );
                })}
                {data.length === 0 && (
                    <li className="text-xs text-slate-500">
                        No theatre data available.
                    </li>
                )}
            </ul>
        </section>
    );
}

// ─── Today's theatre list (queue) ─────────────────────────────

function TheatreList({ rows }: { rows: SurgicalCase[] }) {
    return (
        <section className="rounded-xl bg-white p-4 shadow-sm">
            <div className="mb-3 flex items-center justify-between">
                <div>
                    <h2 className="text-sm font-semibold text-slate-800">
                        Today’s theatre list
                    </h2>
                    <p className="text-xs text-slate-500">
                        Scheduled and ongoing procedures
                    </p>
                </div>
                <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700">
                    {rows.length} cases
                </span>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                    <thead className="text-slate-500">
                        <tr className="border-b border-slate-200">
                            <th className="py-2 pr-3 font-medium">Time</th>
                            <th className="py-2 pr-3 font-medium">Patient</th>
                            <th className="py-2 pr-3 font-medium">Procedure</th>
                            <th className="py-2 pr-3 font-medium">Surgeon</th>
                            <th className="py-2 pr-3 font-medium">Theatre</th>
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
                                    {c.scheduledTime}
                                </td>
                                <td className="py-3 pr-3">
                                    <p className="font-medium text-slate-800">
                                        {c.name}
                                    </p>
                                    <p className="text-[10px] text-slate-500">
                                        {c.patientCode}
                                    </p>
                                </td>
                                <td className="py-3 pr-3 text-slate-600">
                                    {c.procedure}
                                </td>
                                <td className="py-3 pr-3 text-slate-600">
                                    {c.surgeon}
                                </td>
                                <td className="py-3 pr-3 whitespace-nowrap text-slate-600">
                                    {c.theatre}
                                </td>
                                <td className="py-3">
                                    <span
                                        className={`rounded-full px-2 py-1 text-[10px] font-medium whitespace-nowrap capitalize ${CASE_STATUS_STYLES[c.status]}`}
                                    >
                                        {c.status.replace('-', ' ')}
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
                                    No procedures scheduled today.
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
}: {
    title: string;
    subtitle: string;
    data: SummaryDatum[];
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
                        Theatre alerts and pre-op checks
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
                    const style = ALERT_STYLES[alert.category];
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
    utilization: incomingUtilization,
}: TheaterDashboardProps = {}) {
    const stats: TheaterStats = { ...DUMMY_STATS, ...(incomingStats ?? {}) };
    const cases = incomingCases ?? DUMMY_CASES;
    const alerts = incomingAlerts ?? DUMMY_ALERTS;
    const procedureData = incomingProcedures ?? DUMMY_PROCEDURES;
    const trend = incomingTrend ?? DUMMY_TREND;
    const urgencyData = incomingUrgency ?? DUMMY_URGENCY;
    const anaesthesiaData = incomingAnaesthesia ?? DUMMY_ANAESTHESIA;
    const utilization = incomingUtilization ?? DUMMY_UTILIZATION;

    const statCards = [
        {
            label: 'Scheduled today',
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
            label: 'In theatre now',
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
                { href: '/dashboard', title: 'Altaf Memeorial Hospital' },
                { href: '/dashboard', title: 'Dashboard' },
                { href: '', title: 'Theater' },
            ]}
        >
            <div className="bg-blue-50 p-2">
                <PageHeader
                    icon={<Scissors className="h-5 w-5" />}
                    title="Theater department"
                    subtitle="Manage theatre lists, procedures and pre-operative readiness"
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
                    <ProcedureTrend data={trend} />
                    <TheatreUtilization data={utilization} />
                    <TheatreList rows={cases} />
                </div>

                {/* RIGHT CONTENT */}
                <div className="min-h-0">
                    <div className="grid min-w-0 grid-cols-1 gap-4 xl:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]">
                        <div className="flex min-w-0 flex-col gap-4">
                            <SummaryCard
                                title="Case urgency"
                                subtitle="Elective, urgent and emergency cases"
                                data={urgencyData}
                            />
                            <SummaryCard
                                title="Anaesthesia type"
                                subtitle="Anaesthesia used across procedures"
                                data={anaesthesiaData}
                            />
                        </div>

                        <NotificationsPanel alerts={alerts} />
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}
