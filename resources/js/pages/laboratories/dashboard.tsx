// components/dashboard/laboratory-dashboard.tsx

import { useMemo, useState, type ReactNode } from 'react';
import {
    AlertTriangle,
    Bell,
    CheckCircle2,
    ClipboardList,
    FlaskConical,
    MicroscopeIcon,
    Search,
    TestTube2,
    Users,
} from 'lucide-react';

import AppLayout from '@/layouts/app/app-header-layout';
import PageHeader from '@/components/PageHeader';

// ─── Types ────────────────────────────────────────────────────

export interface LabStats {
    sampleOrders: number;
    processedSamples: number;
    patientsSeen: number;
    patientsInQueue: number;
}

export interface TopTest {
    name: string;
    count: number;
}

export interface QueuePatient {
    id: number;
    patientCode: string;
    name: string;
    test: string;
    waitingMinutes: number;
    status: 'waiting' | 'collecting' | 'processing';
}

export interface ResultAlert {
    id: number;
    patientCode: string;
    name: string;
    test: string;
    value: string;
    flag: 'elevated' | 'normal';
    createdAt: string;
}

interface SummaryDatum {
    label: string;
    value: number;
    color: string;
}

interface TrendDatum {
    label: string;
    orders: number;
}

export interface BillingService {
    service: string;
    tests: number;
    cash: number;
    insurance: number;
}

export interface LabBill {
    id: number;
    patientCode: string;
    service: string;
    payer: 'cash' | 'insurance';
    insurer?: string | null;
    amount: number;
    status: 'paid' | 'pending' | 'claim submitted';
}

export interface LaboratoryBilling {
    services?: BillingService[] | null;
    recent?: LabBill[] | null;
}

export interface LaboratoryDashboardProps {
    userName?: string | null;
    stats?: Partial<LabStats> | null;
    topTests?: TopTest[] | null;
    queue?: QueuePatient[] | null;
    alerts?: ResultAlert[] | null;
    ordersTrend?: TrendDatum[] | null;
    resultFlagData?: SummaryDatum[] | null;
    sampleStatusData?: SummaryDatum[] | null;
    billing?: LaboratoryBilling | null;
}

// ─── Fallback data (used when the controller sends nothing) ───

const todayAt = (hours: number, minutes: number) => {
    const d = new Date();
    d.setHours(hours, minutes, 0, 0);
    return d.toISOString();
};

const DUMMY_STATS: LabStats = {
    sampleOrders: 128,
    processedSamples: 94,
    patientsSeen: 76,
    patientsInQueue: 12,
};

const DUMMY_TOP_TESTS: TopTest[] = [
    { name: 'Complete blood count', count: 42 },
    { name: 'Lipid panel', count: 28 },
    { name: 'Blood glucose', count: 19 },
    { name: 'Urinalysis', count: 11 },
];

const DUMMY_QUEUE: QueuePatient[] = [
    {
        id: 1,
        patientCode: 'LAB-0231',
        name: 'John Doe',
        test: 'Complete blood count',
        waitingMinutes: 12,
        status: 'waiting',
    },
    {
        id: 2,
        patientCode: 'LAB-0232',
        name: 'Jane Smith',
        test: 'Lipid panel',
        waitingMinutes: 8,
        status: 'collecting',
    },
    {
        id: 3,
        patientCode: 'LAB-0233',
        name: 'Amir Khan',
        test: 'Blood glucose',
        waitingMinutes: 5,
        status: 'processing',
    },
    {
        id: 4,
        patientCode: 'LAB-0234',
        name: 'Maria Garcia',
        test: 'Urinalysis',
        waitingMinutes: 3,
        status: 'waiting',
    },
];

const DUMMY_ALERTS: ResultAlert[] = [
    {
        id: 1,
        patientCode: 'LAB-0240',
        name: 'Fatima Noor',
        test: 'Blood glucose',
        value: '11.2 mmol/L',
        flag: 'elevated',
        createdAt: todayAt(9, 42),
    },
    {
        id: 2,
        patientCode: 'LAB-0241',
        name: 'David Lee',
        test: 'Lipid panel',
        value: '6.8 mmol/L',
        flag: 'elevated',
        createdAt: todayAt(9, 15),
    },
    {
        id: 3,
        patientCode: 'LAB-0242',
        name: 'Sara Ahmed',
        test: 'Complete blood count',
        value: 'Normal',
        flag: 'normal',
        createdAt: todayAt(8, 55),
    },
    {
        id: 4,
        patientCode: 'LAB-0243',
        name: 'Tom Brown',
        test: 'Urinalysis',
        value: 'Normal',
        flag: 'normal',
        createdAt: todayAt(8, 20),
    },
];

const DUMMY_TREND: TrendDatum[] = [
    { label: 'Mon', orders: 96 },
    { label: 'Tue', orders: 112 },
    { label: 'Wed', orders: 104 },
    { label: 'Thu', orders: 131 },
    { label: 'Fri', orders: 128 },
    { label: 'Sat', orders: 74 },
];

const DUMMY_RESULT_FLAGS: SummaryDatum[] = [
    { label: 'Normal', value: 71, color: '#16a34a' },
    { label: 'Abnormal', value: 19, color: '#f59e0b' },
    { label: 'Critical', value: 4, color: '#dc2626' },
];

const DUMMY_SAMPLE_STATUS: SummaryDatum[] = [
    { label: 'Collected', value: 22, color: '#2563eb' },
    { label: 'Processing', value: 18, color: '#0d9488' },
    { label: 'Completed', value: 94, color: '#16a34a' },
    { label: 'Rejected', value: 3, color: '#dc2626' },
];

const DUMMY_BILLING_SERVICES: BillingService[] = [
    { service: 'Complete blood count', tests: 42, cash: 2100, insurance: 4200 },
    { service: 'Lipid panel', tests: 28, cash: 1960, insurance: 3920 },
    { service: 'Blood glucose', tests: 19, cash: 570, insurance: 1140 },
    { service: 'Urinalysis', tests: 11, cash: 440, insurance: 880 },
];

const DUMMY_BILLS: LabBill[] = [
    {
        id: 1,
        patientCode: 'LAB-0231',
        service: 'Complete blood count',
        payer: 'cash',
        amount: 150,
        status: 'paid',
    },
    {
        id: 2,
        patientCode: 'LAB-0232',
        service: 'Lipid panel',
        payer: 'insurance',
        insurer: 'Madison',
        amount: 280,
        status: 'claim submitted',
    },
    {
        id: 3,
        patientCode: 'LAB-0233',
        service: 'Blood glucose',
        payer: 'cash',
        amount: 60,
        status: 'pending',
    },
    {
        id: 4,
        patientCode: 'LAB-0234',
        service: 'Urinalysis',
        payer: 'insurance',
        insurer: 'NHIMA',
        amount: 80,
        status: 'claim submitted',
    },
];

// ─── Helpers ──────────────────────────────────────────────────

const formatMoney = (amount: number) =>
    new Intl.NumberFormat('en-ZM', {
        style: 'currency',
        currency: 'ZMW',
        maximumFractionDigits: 2,
    }).format(Number.isFinite(Number(amount)) ? Number(amount) : 0);

const CHART_COLORS = ['#2563eb', '#16a34a', '#d97706', '#9333ea'] as const;

// Patient names stay masked on this screen.
const MASK = '******';
const maskName = (_name: string) => MASK;

const isToday = (iso: string) => {
    const d = new Date(iso);
    const now = new Date();
    return (
        d.getFullYear() === now.getFullYear() &&
        d.getMonth() === now.getMonth() &&
        d.getDate() === now.getDate()
    );
};

const formatTime = (iso: string) =>
    new Date(iso).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
    });

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

const STATUS_STYLES: Record<QueuePatient['status'], string> = {
    waiting: 'bg-yellow-100 text-yellow-800',
    collecting: 'bg-blue-100 text-blue-800',
    processing: 'bg-green-100 text-green-800',
};

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

// ─── Most used tests (donut + bars) ───────────────────────────

function TestBreakdown({ data }: { data: TopTest[] }) {
    const total = data.reduce((sum, t) => sum + t.count, 0);
    const colored = data.map((t, i) => ({
        ...t,
        value: t.count,
        color: CHART_COLORS[i % CHART_COLORS.length],
    }));

    return (
        <section className="rounded-xl bg-white p-4 shadow-sm">
            <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold text-slate-800">
                <FlaskConical
                    className="h-4 w-4 text-slate-500"
                    aria-hidden="true"
                />
                Most used tests
            </h2>

            <div className="grid grid-cols-2 items-center gap-4">
                <div className="flex justify-center">
                    <div
                        role="img"
                        aria-label={`${total} tests across ${data.length} types`}
                        className="relative flex h-36 w-36 items-center justify-center rounded-full"
                        style={{
                            background:
                                total > 0
                                    ? `conic-gradient(${buildGradient(colored, total)})`
                                    : '#e2e8f0',
                        }}
                    >
                        <div className="flex h-24 w-24 flex-col items-center justify-center rounded-full bg-white">
                            <span className="text-2xl font-semibold text-slate-900">
                                {total}
                            </span>
                            <span className="text-[10px] text-slate-500">
                                Total tests
                            </span>
                        </div>
                    </div>
                </div>

                <div className="space-y-3">
                    {colored.map((item) => (
                        <div key={item.name}>
                            <div className="mb-1 flex items-center justify-between gap-2 text-xs">
                                <span className="truncate text-slate-600">
                                    {item.name}
                                </span>
                                <span className="font-semibold text-slate-800 tabular-nums">
                                    {item.count}
                                </span>
                            </div>
                            <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
                                <div
                                    className="h-full rounded-full"
                                    style={{
                                        width: `${total > 0 ? (item.count / total) * 100 : 0}%`,
                                        backgroundColor: item.color,
                                    }}
                                />
                            </div>
                        </div>
                    ))}
                    {colored.length === 0 && (
                        <p className="text-xs text-slate-500">
                            No tests recorded yet.
                        </p>
                    )}
                </div>
            </div>
        </section>
    );
}

// ─── Orders trend (bars) ──────────────────────────────────────

function OrdersTrend({ data }: { data: TrendDatum[] }) {
    const max = Math.max(...data.map((d) => d.orders), 1);

    return (
        <section className="rounded-xl bg-white p-4 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
                <div>
                    <h2 className="text-sm font-semibold text-slate-800">
                        Sample order trend
                    </h2>
                    <p className="text-xs text-slate-500">
                        Orders received per day
                    </p>
                </div>
                <span className="rounded-md bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700">
                    This week
                </span>
            </div>

            <div className="flex h-36 items-end justify-between gap-3">
                {data.map((item) => (
                    <div
                        key={item.label}
                        className="flex h-full flex-1 flex-col items-center justify-end gap-2"
                    >
                        <span className="text-[10px] text-slate-500">
                            {item.orders}
                        </span>
                        <div
                            className="w-full max-w-10 rounded-t-md bg-blue-500 transition-colors hover:bg-blue-700"
                            style={{ height: `${(item.orders / max) * 75}%` }}
                            title={`${item.orders} orders`}
                        />
                        <span className="text-[10px] text-slate-500">
                            {item.label}
                        </span>
                    </div>
                ))}
            </div>
        </section>
    );
}

// ─── Queue table ──────────────────────────────────────────────

function LabQueue({ rows }: { rows: QueuePatient[] }) {
    return (
        <section className="rounded-xl bg-white p-4 shadow-sm">
            <div className="mb-3 flex items-center justify-between">
                <div>
                    <h2 className="text-sm font-semibold text-slate-800">
                        Patients in queue
                    </h2>
                    <p className="text-xs text-slate-500">
                        Waiting for sample collection or processing
                    </p>
                </div>
                <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700">
                    {rows.length} in queue
                </span>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                    <thead className="text-slate-500">
                        <tr className="border-b border-slate-200">
                            <th className="py-2 pr-3 font-medium">Patient</th>
                            <th className="py-2 pr-3 font-medium">Reference</th>
                            <th className="py-2 pr-3 font-medium">Test</th>
                            <th className="py-2 pr-3 font-medium">Waiting</th>
                            <th className="py-2 font-medium">Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        {rows.slice(0, 6).map((p) => (
                            <tr
                                key={p.id}
                                className="border-b border-slate-100 last:border-0"
                            >
                                <td className="py-3 pr-3 font-medium tracking-wider text-slate-800">
                                    {p.name}
                                </td>
                                <td className="py-3 pr-3 text-slate-600">
                                    {p.patientCode}
                                </td>
                                <td className="py-3 pr-3 text-slate-600">
                                    {p.test}
                                </td>
                                <td className="py-3 pr-3 text-slate-600 tabular-nums">
                                    {p.waitingMinutes} min
                                </td>
                                <td className="py-3">
                                    <span
                                        className={`rounded-full px-2 py-1 text-[10px] font-medium capitalize ${STATUS_STYLES[p.status]}`}
                                    >
                                        {p.status}
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
                                    No patients in the queue.
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
                    Today
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

// ─── Result notifications ─────────────────────────────────────

type Filter = 'all' | ResultAlert['flag'];

const FILTERS: { key: Filter; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'elevated', label: 'Abnormal' },
    { key: 'normal', label: 'Normal' },
];

const FLAG_STYLES = {
    elevated: {
        icon: AlertTriangle,
        color: 'text-red-600',
        bg: 'bg-red-50',
        text: 'text-red-700',
    },
    normal: {
        icon: CheckCircle2,
        color: 'text-green-600',
        bg: 'bg-green-50',
        text: 'text-green-700',
    },
};

function ResultsPanel({ alerts }: { alerts: ResultAlert[] }) {
    const [filter, setFilter] = useState<Filter>('all');
    const [query, setQuery] = useState('');

    const todays = useMemo(
        () =>
            alerts
                .filter((a) => isToday(a.createdAt))
                .sort(
                    (a, b) => +new Date(b.createdAt) - +new Date(a.createdAt),
                ),
        [alerts],
    );

    const visible = useMemo(() => {
        const q = query.trim().toLowerCase();
        return todays.filter(
            (a) =>
                (filter === 'all' || a.flag === filter) &&
                (!q ||
                    `${a.test} ${a.patientCode} ${a.value}`
                        .toLowerCase()
                        .includes(q)),
        );
    }, [todays, filter, query]);

    return (
        <section className="flex h-full min-h-[500px] min-w-0 flex-col rounded-xl border border-slate-200 bg-white shadow-sm">
            <header className="flex items-center justify-between px-4 pt-4">
                <div>
                    <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-800">
                        <Bell
                            className="h-4 w-4 text-slate-500"
                            aria-hidden="true"
                        />
                        Result notifications
                    </h2>
                    <p className="text-xs text-slate-500">
                        Results reported today
                    </p>
                </div>
                <span className="text-lg font-semibold text-slate-900">
                    {todays.length}
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
                        aria-label="Search results"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="Search by test, reference or value…"
                        className="w-full rounded-md bg-slate-100 py-2 pr-2 pl-8 text-xs outline-none focus:ring-2 focus:ring-blue-200"
                    />
                </div>

                <div className="flex flex-wrap gap-1.5">
                    {FILTERS.map(({ key, label }) => (
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
                {visible.map((a) => {
                    const style = FLAG_STYLES[a.flag];
                    const Icon = style.icon;
                    return (
                        <li
                            key={a.id}
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
                                        {a.test}
                                    </p>
                                    <span className="shrink-0 text-[10px] text-slate-500">
                                        {formatTime(a.createdAt)}
                                    </span>
                                </div>
                                <p className="mt-1 text-[11px] text-slate-500">
                                    <span className="tracking-wider">
                                        {maskName(a.name)}
                                    </span>{' '}
                                    · {a.patientCode}
                                </p>
                                <p
                                    className={`mt-0.5 text-[11px] font-semibold ${style.text}`}
                                >
                                    {a.value}
                                </p>
                            </div>
                        </li>
                    );
                })}
                {visible.length === 0 && (
                    <li className="py-8 text-center text-xs text-slate-500">
                        No results match.
                    </li>
                )}
            </ul>
        </section>
    );
}

// ─── Billing (right column) ───────────────────────────────────

const BILL_STATUS_STYLES: Record<LabBill['status'], string> = {
    paid: 'bg-green-100 text-green-800',
    pending: 'bg-yellow-100 text-yellow-800',
    'claim submitted': 'bg-blue-100 text-blue-800',
};

function BillingRow({
    services,
    bills,
}: {
    services: BillingService[];
    bills: LabBill[];
}) {
    return (
        <section className="min-w-0 space-y-6 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="overflow-x-auto">
                <h2 className="mb-2 text-sm font-semibold text-slate-800">
                    Billing by service
                </h2>
                <table className="w-full text-left text-xs">
                    <thead className="text-slate-500">
                        <tr className="border-b border-slate-200">
                            <th className="py-2 pr-3 font-medium">Service</th>
                            <th className="py-2 pr-3 text-right font-medium">
                                Tests
                            </th>
                            <th className="py-2 pr-3 text-right font-medium">
                                Cash
                            </th>
                            <th className="py-2 pr-3 text-right font-medium">
                                Insurance
                            </th>
                            <th className="py-2 text-right font-medium">
                                Total
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        {services.map((s) => (
                            <tr
                                key={s.service}
                                className="border-b border-slate-100 last:border-0"
                            >
                                <td className="py-3 pr-3 font-medium text-slate-800">
                                    {s.service}
                                </td>
                                <td className="py-3 pr-3 text-right text-slate-600 tabular-nums">
                                    {s.tests}
                                </td>
                                <td className="py-3 pr-3 text-right whitespace-nowrap text-slate-600 tabular-nums">
                                    {formatMoney(s.cash)}
                                </td>
                                <td className="py-3 pr-3 text-right whitespace-nowrap text-slate-600 tabular-nums">
                                    {formatMoney(s.insurance)}
                                </td>
                                <td className="py-3 text-right font-semibold whitespace-nowrap text-slate-800 tabular-nums">
                                    {formatMoney(s.cash + s.insurance)}
                                </td>
                            </tr>
                        ))}
                        {services.length === 0 && (
                            <tr>
                                <td
                                    colSpan={5}
                                    className="py-8 text-center text-slate-500"
                                >
                                    No billed services today.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            <div className="overflow-x-auto">
                <h2 className="mb-2 text-sm font-semibold text-slate-800">
                    Recent bills
                </h2>
                <table className="w-full text-left text-xs">
                    <thead className="text-slate-500">
                        <tr className="border-b border-slate-200">
                            <th className="py-2 pr-3 font-medium">Reference</th>
                            <th className="py-2 pr-3 font-medium">Service</th>
                            <th className="py-2 pr-3 font-medium">Payer</th>
                            <th className="py-2 pr-3 text-right font-medium">
                                Amount
                            </th>
                            <th className="py-2 font-medium">Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        {bills.slice(0, 6).map((b) => (
                            <tr
                                key={b.id}
                                className="border-b border-slate-100 last:border-0"
                            >
                                <td className="py-3 pr-3 text-slate-600">
                                    {b.patientCode}
                                </td>
                                <td className="py-3 pr-3 font-medium text-slate-800">
                                    {b.service}
                                </td>
                                <td className="py-3 pr-3 text-slate-600">
                                    {b.payer === 'cash'
                                        ? 'Cash'
                                        : b.insurer
                                          ? `Insurance (${b.insurer})`
                                          : 'Insurance'}
                                </td>
                                <td className="py-3 pr-3 text-right whitespace-nowrap text-slate-800 tabular-nums">
                                    {formatMoney(b.amount)}
                                </td>
                                <td className="py-3">
                                    <span
                                        className={`rounded-full px-2 py-1 text-[10px] font-medium whitespace-nowrap capitalize ${BILL_STATUS_STYLES[b.status]}`}
                                    >
                                        {b.status}
                                    </span>
                                </td>
                            </tr>
                        ))}
                        {bills.length === 0 && (
                            <tr>
                                <td
                                    colSpan={5}
                                    className="py-8 text-center text-slate-500"
                                >
                                    No bills raised today.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </section>
    );
}

// ─── Page ─────────────────────────────────────────────────────

export default function LaboratoryDashboard({
    stats: incomingStats,
    topTests: incomingTests,
    queue: incomingQueue,
    alerts: incomingAlerts,
    ordersTrend: incomingTrend,
    resultFlagData: incomingFlags,
    sampleStatusData: incomingStatus,
    billing: incomingBilling,
}: LaboratoryDashboardProps = {}) {
    const stats: LabStats = { ...DUMMY_STATS, ...(incomingStats ?? {}) };
    const topTests = incomingTests ?? DUMMY_TOP_TESTS;
    const queue = incomingQueue ?? DUMMY_QUEUE;
    const alerts = incomingAlerts ?? DUMMY_ALERTS;
    const trend = incomingTrend ?? DUMMY_TREND;
    const resultFlags = incomingFlags ?? DUMMY_RESULT_FLAGS;
    const sampleStatus = incomingStatus ?? DUMMY_SAMPLE_STATUS;
    const billingServices = incomingBilling?.services ?? DUMMY_BILLING_SERVICES;
    const bills = incomingBilling?.recent ?? DUMMY_BILLS;

    const top4 = useMemo(
        () => [...topTests].sort((a, b) => b.count - a.count).slice(0, 4),
        [topTests],
    );

    const abnormalToday = useMemo(
        () =>
            alerts.filter((a) => a.flag === 'elevated' && isToday(a.createdAt))
                .length,
        [alerts],
    );

    const statCards = [
        {
            label: 'Sample orders',
            value: stats.sampleOrders,
            icon: <ClipboardList className="h-4 w-4" />,
            tone: 'bg-blue-100',
        },
        {
            label: 'Processed samples',
            value: stats.processedSamples,
            icon: <TestTube2 className="h-4 w-4" />,
            tone: 'bg-green-100',
        },
        {
            label: 'In queue',
            value: stats.patientsInQueue,
            icon: <Users className="h-4 w-4" />,
            tone: 'bg-yellow-100',
        },
        {
            label: 'Abnormal results today',
            value: abnormalToday,
            icon: <AlertTriangle className="h-4 w-4" />,
            tone: 'bg-red-100',
        },
    ];

    return (
        <AppLayout
            breadcrumbs={[
                { href: '/dashboard', title: 'Altaf Memorial Hospital' },
                { href: '', title: 'Dashboard' },
                { href: '', title: 'Laboratory' },
            ]}
        >
            <div className="bg-blue-50">
                <PageHeader
                    icon={<MicroscopeIcon className="h-5 w-5" />}
                    title="Laboratory department"
                    subtitle="Manage the patient queue, samples and results"
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

                    <TestBreakdown data={top4} />
                    <OrdersTrend data={trend} />
                    <LabQueue rows={queue} />
                </div>

                {/* RIGHT CONTENT */}
                <div className="flex min-h-0 min-w-0 flex-col gap-4">
                    <div className="grid min-w-0 grid-cols-1 gap-4 xl:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]">
                        <div className="flex min-w-0 flex-col gap-4">
                            <SummaryCard
                                title="Result flags"
                                subtitle="Normal, abnormal and critical results"
                                data={resultFlags}
                            />
                            <SummaryCard
                                title="Sample status"
                                subtitle="Where today’s samples are in the workflow"
                                data={sampleStatus}
                            />
                        </div>

                        <ResultsPanel alerts={alerts} />
                    </div>

                    <BillingRow services={billingServices} bills={bills} />
                </div>
            </div>
        </AppLayout>
    );
}
