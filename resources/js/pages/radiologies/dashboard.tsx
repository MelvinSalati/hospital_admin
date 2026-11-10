// components/dashboard/imaging-dashboard.tsx

import { useMemo, useState, useEffect, useRef } from 'react';
import {
    Bell,
    CheckCircle2,
    ClipboardList,
    FileText,
    Image as ImageIcon,
    MicroscopeIcon,
    ScanLine,
    Stethoscope,
    UserCheck,
    Users,
} from 'lucide-react';
import AppLayout from '@/layouts/app/app-header-layout';
import PageHeader from '@/components/PageHeader';

// ─── Fallback Image Helper ───────────────────────────────────
// Used ONLY if the backend sends a null/empty thumbnail URL.
const MOCK_XRAYS = [
    'https://images.unsplash.com/photo-1516549655169-df83a0774514?q=80&w=400&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1530497610245-94d3c16cda28?q=80&w=400&auto=format&fit=crop',
];

const MOCK_ULTRASOUNDS = [
    'https://images.unsplash.com/photo-1579154204601-01588f351e67?q=80&w=400&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1581056771107-24ca5f033842?q=80&w=400&auto=format&fit=crop',
];

const getFallbackImage = (testName: string) => {
    const isUltrasound =
        testName.toLowerCase().includes('ultrasound') ||
        testName.toLowerCase().includes('us');
    const pool = isUltrasound ? MOCK_ULTRASOUNDS : MOCK_XRAYS;
    return pool[Math.floor(Math.random() * pool.length)];
};

// ─── Types ───────────────────────────────────────────────────

export interface ImagingStats {
    sampleOrders: number;
    processedSamples: number;
    patientsSeen: number;
    patientsInQueue: number;
}

export interface ImagingModality {
    name: string;
    count: number;
}

export interface QueuePatient {
    id: number;
    patientCode: string;
    name: string;
    test: string;
    waitingMinutes: number;
    status: 'waiting' | 'processing';
    thumbnailUrl?: string;
}

export interface ImagingAlert {
    id: number;
    patientCode: string;
    name: string;
    test: string;
    value: string;
    flag: 'elevated' | 'normal';
    createdAt: string;
    thumbnailUrl?: string;
}

export interface RecentScan {
    id: number;
    patientCode: string;
    modality: string;
    imageUrl: string;
    completedAt: string;
}

export interface ImagingDashboardProps {
    userName: string;
    stats: ImagingStats;
    topTests: ImagingModality[];
    queue: QueuePatient[];
    alerts: ImagingAlert[];
    recentScans: RecentScan[];
}

// ─── Defaults & Helpers ──────────────────────────────────────

const EMPTY_STATS: ImagingStats = {
    sampleOrders: 0,
    processedSamples: 0,
    patientsSeen: 0,
    patientsInQueue: 0,
};

const maskName = (_name: string) => '******';

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

const formatWaitTime = (minutes: number) => {
    if (minutes < 60) return `${minutes} mins`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ${minutes % 60}m`;
    const days = Math.floor(hours / 24);
    return `${days}d ${hours % 24}h`;
};

const CHART_COLORS = ['#2563eb', '#16a34a', '#d97706', '#9333ea'] as const;

// ─── StatCard ────────────────────────────────────────────────

interface StatCardProps {
    label: string;
    value?: number | null;
    icon: React.ReactNode;
    tone: string;
}

function StatCard({ label, value, icon, tone }: StatCardProps) {
    const safe =
        typeof value === 'number' && Number.isFinite(value) ? value : 0;
    return (
        <div
            className={`${tone} flex items-center justify-between gap-2 rounded-lg px-3 py-2.5 shadow-sm`}
        >
            <div className="min-w-0">
                <p className="truncate text-[clamp(0.65rem,0.9vw,0.8rem)] font-medium text-slate-600">
                    {label}
                </p>
                <p className="text-[clamp(1.25rem,2vw,1.75rem)] leading-tight font-semibold text-slate-900">
                    {safe.toLocaleString()}
                </p>
            </div>
            <div className="shrink-0 rounded-md bg-white/60 p-1.5 text-slate-700">
                {icon}
            </div>
        </div>
    );
}

// ─── Doughnut ────────────────────────────────────────────────

function Doughnut({ data }: { data: ImagingModality[] }) {
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
                aria-label="Imaging modality usage"
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
                    studies
                </text>
            </svg>
        </div>
    );
}

// ─── ModalityProgress ────────────────────────────────────────

function ModalityProgress({ data }: { data: ImagingModality[] }) {
    const max = data.length ? Math.max(...data.map((d) => d.count), 1) : 1;

    if (data.length === 0) {
        return (
            <p className="flex h-full items-center justify-center text-sm text-slate-500">
                No modality data yet.
            </p>
        );
    }

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

// ─── Image Viewer Modal ──────────────────────────────────────

function ImageViewer({
    src,
    alt,
    onClose,
}: {
    src: string;
    alt: string;
    onClose: () => void;
}) {
    if (!src) return null;
    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
            onClick={onClose}
        >
            <div className="relative max-h-full max-w-4xl overflow-hidden rounded-lg bg-black shadow-2xl ring-1 ring-white/20">
                <img
                    src={src}
                    alt={alt}
                    className="max-h-[85vh] w-auto object-contain"
                />
                <button
                    onClick={onClose}
                    className="absolute top-2 right-2 rounded-full bg-black/50 p-2 text-white transition-colors hover:bg-black/80"
                >
                    ✕
                </button>
                <div className="absolute right-0 bottom-0 left-0 bg-gradient-to-t from-black/80 to-transparent p-4 text-white">
                    <p className="text-sm font-medium">{alt}</p>
                    <p className="text-xs text-white/70">
                        Patient ID: ****** | Scan Date: Today
                    </p>
                </div>
            </div>
        </div>
    );
}

// ─── Queue Table ─────────────────────────────────────────────

const statusStyle: Record<QueuePatient['status'], string> = {
    waiting: 'bg-yellow-100 text-yellow-800',
    processing: 'bg-blue-100 text-blue-800',
};

function QueueTable({
    rows,
    onViewImage,
}: {
    rows: QueuePatient[];
    onViewImage: (url: string) => void;
}) {
    return (
        <div className="max-h-[20rem] overflow-x-auto overflow-y-auto">
            <table className="w-full text-left text-[clamp(0.7rem,0.95vw,0.85rem)]">
                <thead className="sticky top-0 z-10 bg-white text-slate-500 shadow-sm">
                    <tr className="border-b border-slate-200">
                        <th className="py-2 pr-2 font-medium">Scan</th>
                        <th className="py-2 pr-3 font-medium">Patient</th>
                        <th className="py-2 pr-3 font-medium">Ref</th>
                        <th className="py-2 pr-3 font-medium">Study</th>
                        <th className="py-2 pr-3 font-medium">Waiting</th>
                        <th className="py-2 pr-3 font-medium">Status</th>
                    </tr>
                </thead>
                <tbody>
                    {rows.map((p) => {
                        // Use backend URL if it exists, otherwise fallback to random mock
                        const imgUrl =
                            p.thumbnailUrl || getFallbackImage(p.test);

                        return (
                            <tr
                                key={p.id}
                                className="border-b border-slate-100 last:border-0 hover:bg-slate-50/50"
                            >
                                <td className="py-2 pr-2">
                                    <button
                                        onClick={() => onViewImage(imgUrl)}
                                        className="block h-10 w-10 overflow-hidden rounded-md bg-slate-200 ring-1 ring-slate-300 transition-all hover:ring-blue-500"
                                    >
                                        <img
                                            src={imgUrl}
                                            alt="Scan preview"
                                            className="h-full w-full object-cover"
                                            loading="lazy"
                                        />
                                    </button>
                                </td>
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
                                    {formatWaitTime(p.waitingMinutes)}
                                </td>
                                <td className="py-2 pr-3">
                                    <span
                                        className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize ${statusStyle[p.status]}`}
                                    >
                                        {p.thumbnailUrl?.length > 0
                                            ? 'processed'
                                            : 'waiting..'}
                                    </span>
                                </td>
                            </tr>
                        );
                    })}
                    {rows.length === 0 && (
                        <tr>
                            <td
                                colSpan={7}
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

// ─── Recent Scans Widget ─────────────────────────────────────

function RecentScansWidget({
    scans,
    onViewImage,
}: {
    scans: RecentScan[];
    onViewImage: (url: string) => void;
}) {
    if (!scans.length) return null;

    return (
        <section className="rounded-xl bg-white p-4 shadow-sm">
            <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-800">
                <ImageIcon className="h-4 w-4 text-slate-500" />
                Recently Completed
            </h2>

            <div className="relative grid grid-cols-2 gap-2">
                {scans.map((scan) => {
                    const imgUrl =
                        scan.imageUrl || getFallbackImage(scan.modality);

                    return (
                        <button
                            key={scan.id}
                            onClick={() => onViewImage(imgUrl)}
                            // Container stays fixed. Hover adds a shadow and ring.
                            className="group relative z-0 flex aspect-[4/3] max-h-24 w-full overflow-hidden rounded-lg bg-slate-100 text-left ring-1 ring-slate-200 transition-all duration-300 hover:z-10 hover:shadow-md hover:ring-blue-400"
                        >
                            <img
                                src={imgUrl}
                                alt={scan.modality}
                                // Only the image scales up on hover, not the container
                                className="h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-110"
                                loading="lazy"
                            />

                            {/* Gradient Overlay - fades in on hover */}
                            <div className="absolute inset-0 flex flex-col justify-end bg-gradient-to-t from-black/80 via-black/20 to-transparent p-2 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                                <p className="truncate text-[10px] leading-tight font-semibold text-white">
                                    {scan.modality}
                                </p>
                                <p className="truncate text-[9px] text-white/80">
                                    {scan.patientCode}
                                </p>
                            </div>

                            {/* Badge - fades out on hover so it doesn't block the image */}
                            <span className="absolute top-1.5 right-1.5 rounded bg-black/60 px-1.5 py-0.5 text-[9px] font-medium text-white backdrop-blur-sm transition-opacity duration-300 group-hover:opacity-0">
                                {scan.modality.includes('Ultrasound')
                                    ? 'US'
                                    : 'XR'}
                            </span>
                        </button>
                    );
                })}
            </div>
        </section>
    );
}

// ─── Alerts Panel ────────────────────────────────────────────

function AlertsPanel({ alerts }: { alerts: ImagingAlert[] }) {
    const todays = useMemo(
        () =>
            alerts
                .filter((a) => isToday(a.createdAt))
                .sort(
                    (a, b) => +new Date(b.createdAt) - +new Date(a.createdAt),
                ),
        [alerts],
    );

    const urgentCount = todays.filter((a) => a.flag === 'elevated').length;

    return (
        <section className="flex min-h-0 flex-1 flex-col rounded-xl bg-white p-4 shadow-sm">
            <header className="mb-3 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-slate-500" />
                    <h2 className="text-sm font-semibold text-slate-800">
                        Alerts today
                    </h2>
                </div>
                {urgentCount > 0 && (
                    <span className="flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">
                        <Bell className="h-3 w-3" />
                        {urgentCount} urgent
                    </span>
                )}
            </header>

            {todays.length === 0 ? (
                <div className="flex flex-1 flex-col items-center justify-center py-8 text-center">
                    <CheckCircle2 className="mb-2 h-8 w-8 text-green-400/80" />
                    <p className="text-sm font-medium text-slate-600">
                        All caught up!
                    </p>
                    <p className="text-xs text-slate-400">
                        No alerts for today.
                    </p>
                </div>
            ) : (
                <ul className="min-h-0 flex-1 space-y-1.5 overflow-y-auto pr-1">
                    {todays.map((a) => (
                        <li
                            key={a.id}
                            className={`rounded-lg border px-2.5 py-1.5 ${a.flag === 'elevated' ? 'border-red-200 bg-red-50/50' : 'border-slate-100'}`}
                        >
                            <div className="flex items-center justify-between gap-2">
                                <p className="truncate text-[11px] font-medium text-slate-700">
                                    {maskName(a.name)}
                                </p>
                                <span className="shrink-0 text-[10px] text-slate-400 tabular-nums">
                                    {formatTime(a.createdAt)}
                                </span>
                            </div>
                            <p className="truncate text-[10px] text-slate-500">
                                {a.test} · {a.patientCode}
                            </p>
                            <p
                                className={`mt-1 flex items-center gap-1 text-[11px] leading-snug ${a.flag === 'elevated' ? 'text-red-700' : 'text-slate-600'}`}
                            >
                                {a.flag === 'elevated' && (
                                    <span className="mr-1 inline-block h-1.5 w-1.5 rounded-full bg-red-500" />
                                )}
                                {a.value}
                            </p>
                        </li>
                    ))}
                </ul>
            )}
        </section>
    );
}

// ─── Main Layout ─────────────────────────────────────────────

export default function ImagingDashboard({
    userName = '',
    stats = EMPTY_STATS,
    topTests = [],
    queue = [],
    alerts = [],
    recentScans = [],
}: Partial<ImagingDashboardProps> = {}) {
    const [viewingImage, setViewingImage] = useState<string | null>(null);

    const cards: StatCardProps[] = [
        {
            label: 'Imaging orders',
            value: stats.sampleOrders,
            tone: 'bg-green-100',
            icon: <ClipboardList className="h-4 w-4" />,
        },
        {
            label: 'Completed studies',
            value: stats.processedSamples,
            tone: 'bg-yellow-100',
            icon: <ScanLine className="h-4 w-4" />,
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

    const [knownOrders, setKnownOrders] = useState<number[]>([]);
    const audioRef = useRef<HTMLAudioElement | null>(null);

    useEffect(() => {
        audioRef.current = new Audio('/sounds/notification.mp3');

        const checkForNewOrders = async () => {
            try {
                const res = await fetch('/api/imaging/recent-notifications');
                if (!res.ok) return;
                const orders = await res.json();

                const newOrders = orders.filter(
                    (o: any) => !knownOrders.includes(o.id),
                );

                if (newOrders.length > 0 && knownOrders.length > 0) {
                    // Play sound
                    audioRef.current?.play().catch(() => {});

                    // Show toast for each new order
                    newOrders.forEach((o: any) => {
                        toast.info(
                            o.priority === 'urgent'
                                ? '🚨 URGENT Imaging Order'
                                : 'New Imaging Order',
                            {
                                description: `${o.test} — ${o.patientName} (${o.orderNumber})`,
                                duration: 10000,
                            },
                        );
                    });
                }

                setKnownOrders(orders.map((o: any) => o.id));
            } catch (e) {
                // Silent fail — do not spam the user
            }
        };

        // First run: just seed known IDs, do not notify
        checkForNewOrders();

        // Then poll every 15 seconds
        const interval = setInterval(checkForNewOrders, 15000);
        return () => clearInterval(interval);
    }, []);

    return (
        <AppLayout
            breadcrumbs={[
                { href: '/dashboard', title: 'Dashboard' },
                { href: '', title: 'Imaging' },
                { href: '', title: 'Overview' },
            ]}
        >
            {viewingImage && (
                <ImageViewer
                    src={viewingImage}
                    alt="Medical Scan Preview"
                    onClose={() => setViewingImage(null)}
                />
            )}

            <div className="bg-blue-100 p-2">
                <PageHeader
                    icon={<MicroscopeIcon className="h-5 w-5" />}
                    title="Radiology and Imaging Department"
                    subtitle="Manage imaging queues and reporting workflow"
                />
            </div>

            <div className="grid h-screen grid-cols-1 gap-4 overflow-hidden bg-blue-50 p-4 lg:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)]">
                {/* LEFT COLUMN */}
                <div className="flex min-h-0 flex-col gap-4 overflow-y-auto">
                    <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
                        {cards.map((c) => (
                            <StatCard key={c.label} {...c} />
                        ))}
                    </div>

                    <section className="rounded-xl bg-white p-4 shadow-sm">
                        <h2 className="mb-2 text-sm font-semibold text-slate-800">
                            Patients in queue
                        </h2>
                        <QueueTable
                            rows={queue}
                            onViewImage={(url) => setViewingImage(url)}
                        />
                    </section>

                    <section className="rounded-xl bg-white p-4 shadow-sm">
                        <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-800">
                            <Stethoscope className="h-4 w-4 text-slate-500" />
                            Completed modalities today
                        </h2>
                        <div className="grid grid-cols-2 gap-4">
                            <Doughnut data={top4} />
                            <ModalityProgress data={top4} />
                        </div>
                    </section>
                </div>

                {/* RIGHT COLUMN */}
                <div className="flex min-h-0 flex-col gap-4 overflow-y-auto">
                    <RecentScansWidget
                        scans={recentScans}
                        onViewImage={(url) => setViewingImage(url)}
                    />
                    <AlertsPanel alerts={alerts} />
                </div>
            </div>
        </AppLayout>
    );
}
