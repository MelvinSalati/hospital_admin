// components/dashboard/laboratory-dashboard.tsx

import { useMemo, useState } from 'react';
import {
    Bell,
    ClipboardList,
    FlaskConical,
    MicroscopeIcon,
    TestTube2,
    UserCheck,
    Users,
} from 'lucide-react';
import AppLayout from '@/layouts/app/app-header-layout';
import PageHeader from '@/components/PageHeader';
import { usePage } from '@inertiajs/react';

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

export interface LaboratoryDashboardProps {
    userName: string;
    stats: LabStats;
    topTests: TopTest[];
    queue: QueuePatient[];
    alerts: ResultAlert[];
}

// ─── Dummy data (used when no props are supplied) ─────────────

const todayAt = (hours: number, minutes: number) => {
    const d = new Date();
    d.setHours(hours, minutes, 0, 0);
    return d.toISOString();
};

export const DUMMY_STATS: LabStats = {
    sampleOrders: 128,
    processedSamples: 94,
    patientsSeen: 76,
    patientsInQueue: 12,
};

export const DUMMY_TOP_TESTS: TopTest[] = [
    { name: 'Complete Blood Count', count: 42 },
    { name: 'Lipid Panel', count: 28 },
    { name: 'Blood Glucose', count: 19 },
    { name: 'Urinalysis', count: 11 },
];

export const DUMMY_QUEUE: QueuePatient[] = [
    {
        id: 1,
        patientCode: 'LAB-0231',
        name: 'John Doe',
        test: 'Complete Blood Count',
        waitingMinutes: 12,
        status: 'waiting',
    },
    {
        id: 2,
        patientCode: 'LAB-0232',
        name: 'Jane Smith',
        test: 'Lipid Panel',
        waitingMinutes: 8,
        status: 'collecting',
    },
    {
        id: 3,
        patientCode: 'LAB-0233',
        name: 'Amir Khan',
        test: 'Blood Glucose',
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
    {
        id: 5,
        patientCode: 'LAB-0235',
        name: 'Chen Wei',
        test: 'Complete Blood Count',
        waitingMinutes: 1,
        status: 'collecting',
    },
];

export const DUMMY_ALERTS: ResultAlert[] = [
    {
        id: 1,
        patientCode: 'LAB-0240',
        name: 'Fatima Noor',
        test: 'Blood Glucose',
        value: '11.2 mmol/L',
        flag: 'elevated',
        createdAt: todayAt(9, 42),
    },
    {
        id: 2,
        patientCode: 'LAB-0241',
        name: 'David Lee',
        test: 'Lipid Panel',
        value: '6.8 mmol/L',
        flag: 'elevated',
        createdAt: todayAt(9, 15),
    },
    {
        id: 3,
        patientCode: 'LAB-0242',
        name: 'Sara Ahmed',
        test: 'Complete Blood Count',
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
    {
        id: 5,
        patientCode: 'LAB-0244',
        name: 'Elena Petrova',
        test: 'Blood Glucose',
        value: 'Normal',
        flag: 'normal',
        createdAt: todayAt(7, 50),
    },
];

export const DUMMY_PROPS: LaboratoryDashboardProps = {
    userName: 'Dr. Sample User',
    stats: DUMMY_STATS,
    topTests: DUMMY_TOP_TESTS,
    queue: DUMMY_QUEUE,
    alerts: DUMMY_ALERTS,
};

// ─── Helpers ──────────────────────────────────────────────────

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

const CHART_COLORS = ['#2563eb', '#16a34a', '#d97706', '#9333ea'] as const;

// ─── Stat card ────────────────────────────────────────────────

interface StatCardProps {
    label: string;
    value: number;
    icon: React.ReactNode;
    tone: string;
}

function StatCard({ label, value, icon, tone }: StatCardProps) {
    return (
        <div
            className={`${tone} flex items-center justify-between gap-2 rounded-lg px-3 py-2.5 shadow-sm`}
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

// ─── Doughnut (SVG, no chart dependency) ──────────────────────

function Doughnut({ data }: { data: TopTest[] }) {
    const total = data.reduce((s, d) => s + d.count, 0);
    const r = 40;
    const c = 2 * Math.PI * r;

    const segments = useMemo(() => {
        let offset = 0;
        return data.map((d, i) => {
            const len = total ? (d.count / total) * c : 0;
            const seg = {
                ...d,
                len,
                offset,
                color: CHART_COLORS[i % CHART_COLORS.length],
            };
            offset += len;
            return seg;
        });
    }, [data, total, c]);

    return (
        <div className="flex h-full flex-col items-center justify-center gap-2">
            <svg
                viewBox="0 0 100 100"
                className="aspect-square w-full max-w-[11rem]"
                role="img"
                aria-label="Most used tests"
            >
                <g transform="rotate(-90 50 50)">
                    <circle
                        cx="50"
                        cy="50"
                        r={r}
                        fill="none"
                        stroke="#e2e8f0"
                        strokeWidth="14"
                    />
                    {segments.map((s) => (
                        <circle
                            key={s.name}
                            cx="50"
                            cy="50"
                            r={r}
                            fill="none"
                            stroke={s.color}
                            strokeWidth="14"
                            strokeDasharray={`${s.len} ${c - s.len}`}
                            strokeDashoffset={-s.offset}
                        />
                    ))}
                </g>
                <text
                    x="50"
                    y="48"
                    textAnchor="middle"
                    className="fill-slate-900 text-[14px] font-semibold"
                >
                    {total}
                </text>
                <text
                    x="50"
                    y="60"
                    textAnchor="middle"
                    className="fill-slate-500 text-[7px]"
                >
                    tests
                </text>
            </svg>
        </div>
    );
}

// ─── Horizontal progress list ─────────────────────────────────

function TestProgress({ data }: { data: TopTest[] }) {
    const max = Math.max(...data.map((d) => d.count), 1);
    return (
        <ul className="flex h-full flex-col justify-center gap-3">
            {data.map((t, i) => (
                <li key={t.name}>
                    <div className="mb-1 flex items-center justify-between text-[clamp(0.7rem,0.95vw,0.85rem)]">
                        <span className="truncate font-medium text-slate-700">
                            {t.name}
                        </span>
                        <span className="text-slate-500 tabular-nums">
                            {t.count}
                        </span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-slate-200">
                        <div
                            className="h-full rounded-full transition-[width] duration-500"
                            style={{
                                width: `${(t.count / max) * 100}%`,
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

const statusStyle: Record<QueuePatient['status'], string> = {
    waiting: 'bg-yellow-100 text-yellow-800',
    collecting: 'bg-blue-100 text-blue-800',
    processing: 'bg-green-100 text-green-800',
};

function QueueTable({ rows }: { rows: QueuePatient[] }) {
    return (
        <div className="overflow-x-auto">
            <table className="w-full text-left text-[clamp(0.7rem,0.95vw,0.85rem)]">
                <thead className="text-slate-500">
                    <tr className="border-b border-slate-200">
                        <th className="py-2 pr-3 font-medium">Patient</th>
                        <th className="py-2 pr-3 font-medium">Ref</th>
                        <th className="py-2 pr-3 font-medium">Test</th>
                        <th className="py-2 pr-3 font-medium">Waiting</th>
                        <th className="py-2 font-medium">Status</th>
                    </tr>
                </thead>
                <tbody>
                    {rows.slice(0, 4).map((p) => (
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
                                {p.test}
                            </td>
                            <td className="py-2 pr-3 text-slate-600 tabular-nums">
                                {p.waitingMinutes} min
                            </td>
                            <td className="py-2">
                                <span
                                    className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize ${statusStyle[p.status]}`}
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

// ─── Result notifications (right panel) ───────────────────────

type Tab = 'elevated' | 'normal';

function ResultsPanel({ alerts }: { alerts: ResultAlert[] }) {
    const [tab, setTab] = useState<Tab>('elevated');

    const todays = useMemo(
        () => alerts.filter((a) => isToday(a.createdAt)),
        [alerts],
    );
    const counts = {
        elevated: todays.filter((a) => a.flag === 'elevated').length,
        normal: todays.filter((a) => a.flag === 'normal').length,
    };
    const visible = todays
        .filter((a) => a.flag === tab)
        .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));

    const tabs: { key: Tab; label: string }[] = [
        { key: 'elevated', label: 'Abnormal Results' },
        { key: 'normal', label: 'Normal results' },
    ];

    return (
        <section className="flex h-full min-h-0 flex-col rounded-xl bg-white p-4 shadow-sm">
            <header className="mb-3 flex items-center gap-2">
                <Bell className="h-4 w-4 text-slate-500" />
                <h2 className="text-sm font-semibold text-slate-800">
                    Today&apos;s result notifications
                </h2>
            </header>

            <div
                role="tablist"
                className="mb-3 grid grid-cols-2 gap-1 rounded-lg bg-slate-100 p-1"
            >
                {tabs.map((t) => (
                    <button
                        key={t.key}
                        role="tab"
                        aria-selected={tab === t.key}
                        onClick={() => setTab(t.key)}
                        className={`flex items-center justify-center gap-2 rounded-md px-2 py-1.5 text-xs font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 sm:text-sm ${
                            tab === t.key
                                ? 'bg-white text-slate-900 shadow-sm'
                                : 'text-slate-500 hover:text-slate-700'
                        }`}
                    >
                        {t.label}
                        <span
                            className={`rounded-full px-1.5 text-xs ${
                                t.key === 'elevated'
                                    ? 'bg-red-100 text-red-700'
                                    : 'bg-green-100 text-green-700'
                            }`}
                        >
                            {counts[t.key]}
                        </span>
                    </button>
                ))}
            </div>

            <ul
                role="tabpanel"
                className="min-h-0 flex-1 space-y-2 overflow-y-auto pr-1"
            >
                {visible.map((a) => (
                    <li
                        key={a.id}
                        className="flex items-center justify-between gap-3 rounded-lg border border-slate-100 px-3 py-2"
                    >
                        <div className="min-w-0">
                            <p className="font-medium tracking-wider text-slate-800">
                                {maskName(a.name)}
                            </p>
                            <p className="truncate text-xs text-slate-500">
                                {a.patientCode} · {a.test}
                            </p>
                        </div>
                        <div className="shrink-0 text-right">
                            <p
                                className={`text-sm font-semibold ${a.flag === 'elevated' ? 'text-red-600' : 'text-green-600'}`}
                            >
                                {a.value}
                            </p>
                            <p className="text-xs text-slate-400">
                                {formatTime(a.createdAt)}
                            </p>
                        </div>
                    </li>
                ))}
                {visible.length === 0 && (
                    <li className="py-10 text-center text-sm text-slate-500">
                        No {tab} results reported today.
                    </li>
                )}
            </ul>
        </section>
    );
}

// ─── Main layout ──────────────────────────────────────────────

export default function LaboratoryDashboard({
    userName = DUMMY_PROPS.userName,
    stats = DUMMY_PROPS.stats,
    topTests = DUMMY_PROPS.topTests,
    queue = DUMMY_PROPS.queue,
    alerts = DUMMY_PROPS.alerts,
}: Partial<LaboratoryDashboardProps> = {}) {
    const { props } = usePage();

    console.log(props);
    const cards: StatCardProps[] = [
        {
            label: 'Sample orders',
            value: stats.sampleOrders,
            tone: 'bg-green-100',
            icon: <ClipboardList className="h-4 w-4" />,
        },
        {
            label: 'Processed samples',
            value: stats.processedSamples,
            tone: 'bg-yellow-100',
            icon: <TestTube2 className="h-4 w-4" />,
        },
        {
            label: 'Patients seen',
            value: stats.patientsSeen,
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

    const top4 = [...topTests].sort((a, b) => b.count - a.count).slice(0, 4);

    return (
        <AppLayout
            breadcrumbs={[
                { href: '/dashboard', title: 'Dashboard' },
                { href: '', title: 'Laboratory' },
                { href: '', title: 'Queue' },
            ]}
        >
            <div className="bg-blue-100 p-2">
                <PageHeader
                    icon={<MicroscopeIcon className="h-5 w-5" />}
                    title="Laboratory Department"
                    subtitle="Manage patient queue, samples, and laboratory workflow"
                />
            </div>
            <div className="grid h-screen grid-cols-1 gap-4 overflow-hidden bg-blue-50 p-4 lg:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)]">
                {/* LEFT */}
                <div className="flex min-h-0 flex-col gap-4 overflow-y-auto">
                    <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
                        {cards.map((c) => (
                            <StatCard key={c.label} {...c} />
                        ))}
                    </div>

                    <section className="rounded-xl bg-white p-4 shadow-sm">
                        <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-800">
                            <FlaskConical className="h-4 w-4 text-slate-500" />
                            Most used tests
                        </h2>
                        <div className="grid grid-cols-2 gap-4">
                            <Doughnut data={top4} />
                            <TestProgress data={top4} />
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
                    <ResultsPanel alerts={alerts} />
                </div>
            </div>
        </AppLayout>
    );
}
