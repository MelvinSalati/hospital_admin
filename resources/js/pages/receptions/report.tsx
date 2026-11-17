import { Head, usePage } from '@inertiajs/react';
import {
    Activity,
    BarChart3,
    FileText,
    Users,
    UserCheck,
    Wallet,
    ShieldCheck,
} from 'lucide-react';
import React, { useMemo, useState } from 'react';
import PageHeader from '@/components/PageHeader';
import ReportRangeModal from '@/components/ReportRangeModal';
import ReusableTable from '@/components/ReusableTable';
import type { Column, Action } from '@/components/ReusableTable';
import AppLayout from '@/layouts/app-layout';
import type { BreadcrumbItem } from '@/types';
import Http from '@/utils/Http';
import { generateReceptionReportPdf } from '@/utils/generateReceptionReportPdf';
import type { ReportJson } from '@/utils/generateReportPdf';

// ============================================
// CONFIG
// ============================================

// Matches Route::prefix('v1/receptions') in the routes file.
// Change to '/v1/receptions' if routes are in web.php or Http already adds /api.
const REPORTS_API_BASE = 'receptions';

// ============================================
// TYPES
// ============================================

interface Report {
    id: string;
    /** Route segment under REPORTS_API_BASE */
    endpoint: string;
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
    { href: '/dashboard', title: 'Altaf Memorial Hospital' },
    { title: 'Reception', href: '/receptions' },
    { title: 'Reports', href: '/receptions/reports' },
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
// REPORTS
// ============================================

const reports: Report[] = [
    {
        id: 'daily_revenue_collection',
        endpoint: 'daily-revenue',
        name: 'Daily Revenue Collection Report',
        category: 'Billing',
        description:
            'Payments received from patients, including receipts, payment methods, cashier collections and daily revenue totals.',
        icon: 'Wallet',
        frequency: 'Daily',
        last_run: null,
        status: 'ready',
    },
    {
        id: 'billing_invoicing',
        endpoint: 'billing-invoicing',
        name: 'Billing & Invoicing Report',
        category: 'Billing',
        description:
            'Patient invoices generated within the selected period, showing services billed, amounts paid, outstanding balances and invoice status.',
        icon: 'FileText',
        frequency: 'Daily / Monthly',
        last_run: null,
        status: 'ready',
    },
    {
        id: 'insurance_billing',
        endpoint: 'insurance',
        name: 'Insurance Billing & Claims Report',
        category: 'Insurance',
        description:
            'Patient-level insurance billing report showing patient details, insurance provider, date services were accessed, itemised services, prices, invoice totals and claims due for submission.',
        icon: 'ShieldCheck',
        frequency: 'Daily / Monthly',
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
        Insurance: 'bg-sky-100 text-sky-700',
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
    if (!from || !to) return '';

    const fmt = (d: string, opts: Intl.DateTimeFormatOptions) =>
        new Date(d).toLocaleDateString('en-ZM', opts);

    if (mode === 'day')
        return fmt(from, {
            weekday: 'short',
            day: 'numeric',
            month: 'short',
            year: 'numeric',
        });
    if (mode === 'month') return fmt(from, { month: 'long', year: 'numeric' });

    // week + custom
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
    const { auth } = usePage().props as any;

    const [selectedReport, setSelectedReport] = useState<Report | null>(null);

    const [from, setFrom] = useState<string>(() => toISO(new Date()));
    const [to, setTo] = useState<string>(() => toISO(new Date()));

    const mode: RangeMode = useMemo(() => detectMode(from, to), [from, to]);

    const [isRunning, setIsRunning] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const openReport = (report: Report) => {
        setError(null);
        setSelectedReport(report);
    };

    const closeModal = () => {
        if (isRunning) return;
        setSelectedReport(null);
        setError(null);
    };

    const handleRunReport = async () => {
        if (!selectedReport || isRunning) return;

        setIsRunning(true);
        setError(null);

        try {
            const departmentId = auth.user.profile.department_id;

            const { data: body } = await Http.post(
                `${REPORTS_API_BASE}/${selectedReport.endpoint}/${departmentId}`,
                { from, to, mode },
            );

            const safeName = selectedReport.name
                .replace(/[^a-z0-9]+/gi, '-')
                .toLowerCase();

            await generateReceptionReportPdf(
                selectedReport.endpoint,
                body,
                `${safeName}-${from}_to_${to}.pdf`,
                { department: 'Reception', generatedBy: auth?.user?.name },
            );

            setSelectedReport(null);
        } catch (e: any) {
            const msg =
                e?.response?.data?.message ??
                e?.message ??
                'Failed to generate report';
            setError(msg);
        } finally {
            setIsRunning(false);
        }
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
            <Head title="Reception Reports" />
            <PageHeader
                title="Reception Reports"
                icon={<BarChart3 />}
                subtitle="View reports pertaining to the reception department"
            />

            <div className="min-h-screen bg-blue-50">
                <div className="p-2">
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

            <ReportRangeModal
                open={!!selectedReport}
                title={selectedReport?.name ?? ''}
                description={selectedReport?.description ?? ''}
                category={selectedReport?.category ?? ''}
                frequency={selectedReport?.frequency ?? ''}
                icon={
                    selectedReport
                        ? (iconMap[selectedReport.icon] ?? (
                              <FileText className="h-5 w-5" />
                          ))
                        : null
                }
                iconClassName={
                    selectedReport
                        ? getCategoryColor(selectedReport.category)
                        : undefined
                }
                from={from}
                to={to}
                mode={mode}
                rangeLabel={formatRangeLabel(mode, from, to)}
                presets={presets.map((p) => {
                    const r = rangeFromPreset(p.key);
                    return {
                        key: p.key,
                        label: p.label,
                        active: r.from === from && r.to === to,
                    };
                })}
                isRunning={isRunning}
                error={error}
                onPreset={(key) => {
                    const r = rangeFromPreset(key);
                    setFrom(r.from);
                    setTo(r.to);
                }}
                onFromChange={setFrom}
                onToChange={setTo}
                onClose={closeModal}
                onRun={handleRunReport}
            />
        </AppLayout>
    );
}
