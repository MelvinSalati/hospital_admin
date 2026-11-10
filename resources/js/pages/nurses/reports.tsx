import { Head } from '@inertiajs/react';
import {
    Activity,
    BarChart3,
    FileText,
    Users,
    UserCheck,
    Wallet,
    ShieldCheck,
    Calendar,
} from 'lucide-react';
import React, { useMemo, useState } from 'react';
import PageHeader from '@/components/PageHeader';
import ReusableTable from '@/components/ReusableTable';
import type { Column, Action } from '@/components/ReusableTable';
import AppLayout from '@/layouts/app-layout';
import type { BreadcrumbItem } from '@/types';

// ============================================
// TYPES
// ============================================

interface Report {
    id: string;
    name: string;
    category: string;
    description: string;
    icon: string;
    frequency: string;
    last_run: string | null;
    status: 'ready' | 'generating' | 'error';
}

type RangeMode = 'day' | 'week' | 'month' | 'custom';

// ============================================
// BREADCRUMBS
// ============================================

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Nurses', href: '/nurses' },
    { title: 'Reports', href: '/nurses/reports' },
];

// ============================================
// ICON MAP
// ============================================

const iconMap: Record<string, React.ReactNode> = {
    Activity: <Activity className="h-5 w-5" />,
    Users: <Users className="h-5 w-5" />,
    UserCheck: <UserCheck className="h-5 w-5" />,
    Wallet: <Wallet className="h-5 w-5" />,
    ShieldCheck: <ShieldCheck className="h-5 w-5" />,
    FileText: <FileText className="h-5 w-5" />,
};

// ============================================
// REPORTS (only 3)
// ============================================

const reports: Report[] = [
    {
        id: 'patients-seen-department',
        name: 'Patients Seen in Department',
        category: 'Patient Statistics',
        description:
            'Total patients seen in this department, broken down by day, gender, age group and attending nurse',
        icon: 'UserCheck',
        frequency: 'Daily',
        last_run: null,
        status: 'ready',
    },
    {
        id: 'patients-cash',
        name: 'Patients Seen — Cash Paying',
        category: 'Billing',
        description:
            'Patients seen in the department who paid cash for procedures, with amounts collected per procedure, receipts issued and daily cash totals',
        icon: 'Wallet',
        frequency: 'Daily',
        last_run: null,
        status: 'ready',
    },
    {
        id: 'patients-insurance',
        name: 'Patients Seen — Insurance',
        category: 'Billing',
        description:
            'Patients seen in the department whose procedures were paid for by insurance schemes (NHIMA, private medical aid), with the procedures claimed, claim references and payer breakdown',
        icon: 'ShieldCheck',
        frequency: 'Daily',
        last_run: null,
        status: 'ready',
    },
];

// ============================================
// CATEGORY COLORS
// ============================================

const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
        'Clinical Operations': 'bg-blue-100 text-blue-700',
        Workforce: 'bg-purple-100 text-purple-700',
        'Patient Statistics': 'bg-emerald-100 text-emerald-700',
        Billing: 'bg-amber-100 text-amber-700',
    };
    return colors[category] || 'bg-gray-100 text-gray-700';
};

// ============================================
// DATE HELPERS
// ============================================

const toISO = (d: Date) => {
    const z = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
    return z.toISOString().slice(0, 10);
};

const startOfWeek = (d: Date) => {
    const c = new Date(d);
    const day = c.getDay();
    const diff = c.getDate() - day + (day === 0 ? -6 : 1);
    c.setDate(diff);
    return c;
};

const endOfWeek = (d: Date) => {
    const s = startOfWeek(d);
    s.setDate(s.getDate() + 6);
    return s;
};

const startOfMonth = (d: Date) => new Date(d.getFullYear(), d.getMonth(), 1);
const endOfMonth = (d: Date) => new Date(d.getFullYear(), d.getMonth() + 1, 0);

const detectMode = (from: string, to: string): RangeMode => {
    if (!from || !to) return 'custom';
    const f = new Date(from);
    const t = new Date(to);
    if (toISO(f) === toISO(t)) return 'day';

    if (
        toISO(startOfWeek(f)) === toISO(startOfWeek(t)) &&
        toISO(endOfWeek(f)) === toISO(endOfWeek(t))
    )
        return 'week';

    if (
        f.getDate() === 1 &&
        toISO(startOfMonth(f)) === toISO(startOfMonth(t)) &&
        t.getDate() === endOfMonth(t).getDate()
    )
        return 'month';

    return 'custom';
};

const formatRangeLabel = (mode: RangeMode, from: string, to: string) => {
    const fmt = (d: string, opts: Intl.DateTimeFormatOptions) =>
        new Date(d).toLocaleDateString('en-ZM', opts);

    if (mode === 'day')
        return fmt(from, {
            weekday: 'short',
            day: 'numeric',
            month: 'short',
            year: 'numeric',
        });
    if (mode === 'week')
        return `${fmt(from, { day: 'numeric', month: 'short' })} – ${fmt(to, {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
        })}`;
    if (mode === 'month') return fmt(from, { month: 'long', year: 'numeric' });
    return `${fmt(from, { day: 'numeric', month: 'short' })} – ${fmt(to, {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
    })}`;
};

const presets = [
    { key: 'day', label: 'Today' },
    { key: 'yesterday', label: 'Yesterday' },
    { key: 'week', label: 'This Week' },
    { key: 'month', label: 'This Month' },
] as const;

const rangeFromPreset = (key: string): { from: string; to: string } => {
    const now = new Date();
    switch (key) {
        case 'day':
            return { from: toISO(now), to: toISO(now) };
        case 'yesterday': {
            const y = new Date(now);
            y.setDate(y.getDate() - 1);
            return { from: toISO(y), to: toISO(y) };
        }
        case 'week':
            return { from: toISO(startOfWeek(now)), to: toISO(endOfWeek(now)) };
        case 'month':
            return {
                from: toISO(startOfMonth(now)),
                to: toISO(endOfMonth(now)),
            };
        default:
            return { from: toISO(now), to: toISO(now) };
    }
};

// ============================================
// MAIN COMPONENT
// ============================================

export default function Reports() {
    const [selectedReport, setSelectedReport] = useState<Report | null>(null);

    const [from, setFrom] = useState<string>(() => toISO(new Date()));
    const [to, setTo] = useState<string>(() => toISO(new Date()));

    const mode: RangeMode = useMemo(() => detectMode(from, to), [from, to]);

    const openReport = (report: Report) => setSelectedReport(report);
    const closeModal = () => setSelectedReport(null);

    const handleRunReport = () => {
        if (!selectedReport) return;
        console.log('Run report:', selectedReport.id, { from, to, mode });
        // router.post(`/nurses/reports/${selectedReport.id}`, { from, to, mode });
        closeModal();
    };

    const columns: Column<Report>[] = [
        {
            id: 'name',
            label: 'Report',
            minWidth: 300,
            sortable: true,
            format: (_v: unknown, row: Report) => (
                <div className="flex items-center gap-3">
                    <div
                        className={`rounded-lg p-2 ${getCategoryColor(
                            row.category,
                        )}`}
                    >
                        {iconMap[row.icon] || <FileText className="h-5 w-5" />}
                    </div>
                    <p className="text-sm font-medium text-gray-900">
                        {row.name}
                    </p>
                </div>
            ),
        },
        {
            id: 'category',
            label: 'Category',
            minWidth: 160,
            sortable: true,
            format: (value: string) => (
                <span
                    className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${getCategoryColor(
                        value,
                    )}`}
                >
                    {value}
                </span>
            ),
        },
        {
            id: 'description',
            label: 'Description',
            minWidth: 380,
            format: (value: string) => (
                <span className="text-sm text-gray-500">{value}</span>
            ),
        },
        {
            id: 'frequency',
            label: 'Frequency',
            minWidth: 110,
            align: 'center',
            sortable: true,
            format: (value: string) => (
                <span className="text-sm text-gray-600">{value}</span>
            ),
        },
        {
            id: 'status',
            label: 'Status',
            minWidth: 100,
            align: 'center',
            sortable: true,
            format: () => (
                <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-700">
                    <span className="h-1.5 w-1.5 rounded-full bg-current" />
                    Ready
                </span>
            ),
        },
    ];

    const actions: Action<Report>[] = [
        {
            label: 'Run Report',
            icon: <FileText className="h-4 w-4" />,
            color: 'primary',
            variant: 'contained',
            onClick: openReport,
        },
    ];

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Nursing Reports" />

            <div className="min-h-screen bg-slate-100">
                <div className="p-4">
                    <PageHeader
                        title="Nursing Reports"
                        icon={<BarChart3 />}
                        subtitle="Patients seen and procedures performed in the department"
                    />

                    <div className="mt-4 overflow-hidden rounded-lg shadow-sm">
                        <ReusableTable
                            columns={columns}
                            data={reports}
                            actions={actions}
                            title="Available Reports"
                            searchPlaceholder="Search reports..."
                            defaultRowsPerPage={10}
                            defaultOrderBy="name"
                            defaultOrder="asc"
                            emptyMessage="No reports found"
                            filterPlaceholder="Filter reports..."
                        />
                    </div>
                </div>
            </div>

            {/* ---------- Date Range Modal ---------- */}
            {selectedReport && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
                    onClick={closeModal}
                >
                    <div
                        className="w-full max-w-md overflow-hidden rounded-xl bg-white shadow-2xl"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex items-start gap-3 border-b bg-slate-50 px-5 py-4">
                            <div
                                className={`rounded-lg p-2 ${getCategoryColor(
                                    selectedReport.category,
                                )}`}
                            >
                                {iconMap[selectedReport.icon] || (
                                    <FileText className="h-5 w-5" />
                                )}
                            </div>
                            <div className="flex-1">
                                <h3 className="text-base font-semibold text-gray-900">
                                    {selectedReport.name}
                                </h3>
                                <p className="text-xs text-gray-500">
                                    Choose a date range for this report
                                </p>
                            </div>
                            <button
                                onClick={closeModal}
                                className="rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                                aria-label="Close"
                            >
                                ✕
                            </button>
                        </div>

                        <div className="space-y-4 px-5 py-4">
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-medium tracking-wide text-gray-500 uppercase">
                                    Detected period
                                </span>
                                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 capitalize">
                                    <Calendar className="h-3 w-3" />
                                    {mode}
                                </span>
                            </div>

                            <div className="flex flex-wrap gap-2">
                                {presets.map((p) => {
                                    const r = rangeFromPreset(p.key);
                                    const active =
                                        r.from === from && r.to === to;
                                    return (
                                        <button
                                            key={p.key}
                                            type="button"
                                            onClick={() => {
                                                setFrom(r.from);
                                                setTo(r.to);
                                            }}
                                            className={`rounded-md border px-3 py-1.5 text-xs font-medium transition ${
                                                active
                                                    ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                                                    : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:bg-gray-50'
                                            }`}
                                        >
                                            {p.label}
                                        </button>
                                    );
                                })}
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="mb-1 block text-xs font-medium text-gray-600">
                                        From
                                    </label>
                                    <input
                                        type="date"
                                        value={from}
                                        max={to}
                                        onChange={(e) =>
                                            setFrom(e.target.value)
                                        }
                                        className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="mb-1 block text-xs font-medium text-gray-600">
                                        To
                                    </label>
                                    <input
                                        type="date"
                                        value={to}
                                        min={from}
                                        onChange={(e) => setTo(e.target.value)}
                                        className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                                    />
                                </div>
                            </div>

                            <div className="rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600">
                                <span className="font-medium text-slate-700">
                                    {formatRangeLabel(mode, from, to)}
                                </span>
                            </div>
                        </div>

                        <div className="flex justify-end gap-2 border-t bg-slate-50 px-5 py-3">
                            <button
                                type="button"
                                onClick={closeModal}
                                className="rounded-md border border-gray-200 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={handleRunReport}
                                className="rounded-md bg-emerald-600 px-4 py-1.5 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700"
                            >
                                Run Report
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </AppLayout>
    );
}
