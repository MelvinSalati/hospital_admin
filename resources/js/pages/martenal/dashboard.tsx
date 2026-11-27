import { useMemo, useState } from 'react';
import {
    AlertTriangle,
    Baby,
    Bell,
    CalendarCheck,
    CalendarClock,
    ClipboardList,
    HeartPulse,
    Search,
    UserCheck,
    Users,
} from 'lucide-react';

import AppLayout from '@/layouts/app/app-header-layout';
import PageHeader from '@/components/PageHeader';

type VisitStatus = 'waiting' | 'in-progress' | 'completed';

interface MCHStats {
    registeredMothers: number;
    visitsToday: number;
    activeANC: number;
    highRiskPregnancies: number;
}

interface ANCVisit {
    id: number;
    patientCode: string;
    name: string;
    service: string;
    waitingMinutes: number;
    status: VisitStatus;
}

interface MCHAlert {
    id: number;
    title: string;
    description: string;
    category: 'warning' | 'danger' | 'success' | 'info';
    time: string;
}

type ChartDatum = { label: string; value: number; color: string };
type TrendDatum = { month: string; visits: number };

interface MCHDashboardProps {
    departmentId?: number;
    userName?: string;
    stats?: Partial<MCHStats>;
    visits?: ANCVisit[];
    alerts?: MCHAlert[];
    serviceData?: ChartDatum[];
    attendanceTrend?: TrendDatum[];
    ancVisitData?: ChartDatum[];
    postnatalVisitData?: ChartDatum[];
    breakdownDays?: number;
}

const EMPTY_STATS: MCHStats = {
    registeredMothers: 0,
    visitsToday: 0,
    activeANC: 0,
    highRiskPregnancies: 0,
};

const STATUS_STYLES: Record<VisitStatus, string> = {
    waiting: 'bg-yellow-100 text-yellow-800',
    'in-progress': 'bg-blue-100 text-blue-800',
    completed: 'bg-green-100 text-green-800',
};

const ALERT_STYLES = {
    danger: { icon: AlertTriangle, color: 'text-red-600', bg: 'bg-red-50' },
    warning: {
        icon: CalendarClock,
        color: 'text-amber-600',
        bg: 'bg-amber-50',
    },
    success: { icon: UserCheck, color: 'text-green-600', bg: 'bg-green-50' },
    info: { icon: Bell, color: 'text-blue-600', bg: 'bg-blue-50' },
};

function StatCard({
    label,
    value,
    icon,
    tone,
}: {
    label: string;
    value: number;
    icon: React.ReactNode;
    tone: string;
}) {
    return (
        <div
            className={`flex items-center justify-between gap-2 rounded-lg px-3 py-3 shadow-sm ${tone}`}
        >
            <div className="min-w-0">
                <p className="truncate text-xs font-medium text-slate-600">
                    {label}
                </p>
                <p className="text-2xl leading-tight font-semibold text-slate-900">
                    {value.toLocaleString()}
                </p>
            </div>
            <div className="shrink-0 rounded-md bg-white/70 p-2 text-slate-700">
                {icon}
            </div>
        </div>
    );
}

function buildGradient(data: ChartDatum[], total: number) {
    let acc = 0;
    return data
        .map((item) => {
            const start = acc;
            acc += total > 0 ? (item.value / total) * 100 : 0;
            return `${item.color} ${start}% ${acc}%`;
        })
        .join(', ');
}

function ServiceBreakdown({
    data,
    days,
}: {
    data: ChartDatum[];
    days: number;
}) {
    const total = data.reduce((sum, i) => sum + i.value, 0);

    return (
        <section className="rounded-xl bg-white p-4 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
                <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-800">
                    <ClipboardList className="h-4 w-4 text-slate-500" />
                    Maternal Health Services
                </h2>
                <span className="rounded-md bg-slate-100 px-2 py-1 text-[10px] font-medium text-slate-600">
                    Last {days} days
                </span>
            </div>

            {data.length === 0 || total === 0 ? (
                <p className="py-8 text-center text-xs text-slate-500">
                    No service data yet.
                </p>
            ) : (
                <div className="grid grid-cols-2 items-center gap-4">
                    <div className="flex justify-center">
                        <div
                            className="relative flex h-36 w-36 items-center justify-center rounded-full"
                            style={{
                                background: `conic-gradient(${buildGradient(data, total)})`,
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
                                        {item.value}
                                    </span>
                                </div>
                                <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
                                    <div
                                        className="h-full rounded-full"
                                        style={{
                                            width: `${(item.value / total) * 100}%`,
                                            backgroundColor: item.color,
                                        }}
                                    />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </section>
    );
}

function ANCTrend({ data }: { data: TrendDatum[] }) {
    const max = Math.max(1, ...data.map((i) => i.visits));

    return (
        <section className="rounded-xl bg-white p-4 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
                <div>
                    <h2 className="text-sm font-semibold text-slate-800">
                        ANC Attendance Trend
                    </h2>
                    <p className="text-xs text-slate-500">
                        Monthly antenatal visits
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
                            {item.visits}
                        </span>
                        <div
                            className="w-full max-w-10 rounded-t-md bg-blue-500 transition-all hover:bg-blue-700"
                            style={{ height: `${(item.visits / max) * 75}%` }}
                            title={`${item.visits} visits`}
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

function ANCQueue({ rows }: { rows: ANCVisit[] }) {
    return (
        <section className="rounded-xl bg-white p-4 shadow-sm">
            <div className="mb-3 flex items-center justify-between">
                <div>
                    <h2 className="text-sm font-semibold text-slate-800">
                        Today's MCH Visits
                    </h2>
                    <p className="text-xs text-slate-500">
                        Maternal care consultation queue
                    </p>
                </div>
                <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700">
                    {rows.length} visits
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
                        {rows.map((p) => (
                            <tr
                                key={p.id}
                                className="border-b border-slate-100 last:border-0"
                            >
                                <td className="py-3 pr-3 font-medium text-slate-800">
                                    {p.name}
                                </td>
                                <td className="py-3 pr-3 text-slate-600">
                                    {p.patientCode}
                                </td>
                                <td className="py-3 pr-3 text-slate-600">
                                    {p.service}
                                </td>
                                <td className="py-3 pr-3 text-slate-600">
                                    {p.waitingMinutes} min
                                </td>
                                <td className="py-3">
                                    <span
                                        className={`rounded-full px-2 py-1 text-[10px] font-medium ${STATUS_STYLES[p.status] ?? STATUS_STYLES.waiting}`}
                                    >
                                        {p.status.replace('-', ' ')}
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
                                    No visits recorded today.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </section>
    );
}

function VisitSummaryCard({
    title,
    subtitle,
    data,
    periodLabel,
}: {
    title: string;
    subtitle: string;
    data: ChartDatum[];
    periodLabel: string;
}) {
    const total = data.reduce((sum, i) => sum + i.value, 0);

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
                    {periodLabel}
                </span>
            </div>

            <div className="flex items-center gap-5">
                <div
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
                        <span className="text-[9px] text-slate-400">Total</span>
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

function NotificationsPanel({
    alerts,
    ancVisitData,
    postnatalVisitData,
    periodLabel,
}: {
    alerts: MCHAlert[];
    ancVisitData: ChartDatum[];
    postnatalVisitData: ChartDatum[];
    periodLabel: string;
}) {
    const [filter, setFilter] = useState('all');
    const [query, setQuery] = useState('');

    const visible = useMemo(() => {
        const q = query.toLowerCase();
        return alerts.filter((a) => {
            const matchesFilter = filter === 'all' || a.category === filter;
            const matchesSearch = `${a.title} ${a.description}`
                .toLowerCase()
                .includes(q);
            return matchesFilter && matchesSearch;
        });
    }, [alerts, filter, query]);

    return (
        <div className="grid min-w-0 grid-cols-1 gap-4 xl:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]">
            <div className="flex min-w-0 flex-col gap-4">
                <VisitSummaryCard
                    title="ANC Visits"
                    subtitle="Antenatal care attendance"
                    data={ancVisitData}
                    periodLabel={periodLabel}
                />
                <VisitSummaryCard
                    title="Postnatal Visits"
                    subtitle="Postnatal care attendance"
                    data={postnatalVisitData}
                    periodLabel={periodLabel}
                />
            </div>

            <section className="flex h-full min-h-[500px] min-w-0 flex-col rounded-xl border border-slate-200 bg-white shadow-sm">
                <header className="flex items-center justify-between px-4 pt-4">
                    <div>
                        <h2 className="text-sm font-semibold text-slate-800">
                            Notifications
                        </h2>
                        <p className="text-xs text-slate-500">
                            Maternal health alerts
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
                        {['all', 'danger', 'warning', 'success'].map((item) => (
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

export default function MCHDashboard({
    stats,
    visits = [],
    alerts = [],
    serviceData = [],
    attendanceTrend = [],
    ancVisitData = [],
    postnatalVisitData = [],
    breakdownDays = 90,
}: MCHDashboardProps) {
    const s = { ...EMPTY_STATS, ...stats };
    const periodLabel = `Last ${breakdownDays} days`;

    const statCards = [
        {
            label: 'Registered Mothers',
            value: s.registeredMothers,
            icon: <Users className="h-4 w-4" />,
            tone: 'bg-blue-100',
        },
        {
            label: "Today's Visits",
            value: s.visitsToday,
            icon: <CalendarCheck className="h-4 w-4" />,
            tone: 'bg-green-100',
        },
        {
            label: 'Active ANC Clients',
            value: s.activeANC,
            icon: <HeartPulse className="h-4 w-4" />,
            tone: 'bg-yellow-100',
        },
        {
            label: 'High-risk Pregnancies',
            value: s.highRiskPregnancies,
            icon: <AlertTriangle className="h-4 w-4" />,
            tone: 'bg-red-100',
        },
    ];

    return (
        <AppLayout
            breadcrumbs={[
                { href: '/dashboard', title: 'Dashboard' },
                { href: '', title: 'Maternal Health' },
            ]}
        >
            <div className="bg-blue-50">
                <PageHeader
                    icon={<Baby className="h-5 w-5" />}
                    title="Maternal Health Department"
                    subtitle="Manage antenatal care, postnatal services and maternal health workflows"
                />
            </div>

            <div className="grid min-h-screen grid-cols-1 gap-4 overflow-hidden bg-blue-50 p-4 lg:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)]">
                <div className="flex min-h-0 flex-col gap-4 overflow-y-auto">
                    <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
                        {statCards.map((card) => (
                            <StatCard key={card.label} {...card} />
                        ))}
                    </div>

                    <ServiceBreakdown data={serviceData} days={breakdownDays} />
                    <ANCTrend data={attendanceTrend} />
                    <ANCQueue rows={visits} />
                </div>

                <div className="min-h-0">
                    <NotificationsPanel
                        alerts={alerts}
                        ancVisitData={ancVisitData}
                        postnatalVisitData={postnatalVisitData}
                        periodLabel={periodLabel}
                    />
                </div>
            </div>
        </AppLayout>
    );
}
