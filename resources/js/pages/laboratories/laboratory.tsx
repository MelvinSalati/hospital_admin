// resources/js/pages/laboratory/Nurses.tsx
import { Link, usePage } from '@inertiajs/react';
import {
    MicroscopeIcon,
    Users,
    UserPlus,
    ClipboardCheck,
    ArrowLeft,
    Eye,
    FlaskConical,
    Clock,
    CheckCircle2,
    AlertCircle,
} from 'lucide-react';
import { useState } from 'react';
import { router } from '@inertiajs/react';
import Notiflix from 'notiflix';
import PageHeader from '@/components/PageHeader';
import type { Column, Action } from '@/components/ReusableTable';
import ReusableTable from '@/components/ReusableTable';
import { Button } from '@/components/ui/button';
import AppLayout from '@/layouts/app-layout';
import { cn } from '@/lib/utils';

// ============ TYPES ============
interface QueuePatient {
    id: number;
    token: string;
    first_name: string;
    last_name: string;
    email: string | null;
    phone: string | null;
    gender: string | null;
    status: 'active' | 'pending' | 'completed' | string;
    created_at: string;
    patient_number?: string;
    visit_token?: string;
}

interface Props {
    queue: QueuePatient[];
    stats?: {
        pending_assignment?: number;
        assigned_today?: number;
        completed_today?: number;
    };
}

// ============ HELPERS ============
const formatDate = (date: string | null): string => {
    if (!date) return 'N/A';
    try {
        return new Date(date).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
        });
    } catch {
        return 'N/A';
    }
};

const formatTime = (date: string | null): string => {
    if (!date) return '';
    try {
        return new Date(date).toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
        });
    } catch {
        return '';
    }
};

const getStatusConfig = (status: string) => {
    const map: Record<string, { label: string; badge: string; dot: string }> = {
        active: {
            label: 'In Queue',
            badge: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800',
            dot: 'bg-blue-500',
        },
        pending: {
            label: 'Pending',
            badge: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-800',
            dot: 'bg-amber-500',
        },
        completed: {
            label: 'Completed',
            badge: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-800',
            dot: 'bg-emerald-500',
        },
        cancelled: {
            label: 'Cancelled',
            badge: 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700',
            dot: 'bg-slate-400',
        },
    };
    return map[status] ?? map.pending;
};

// ============ COMPACT STAT CARD ============
interface StatCardProps {
    label: string;
    value: number | string;
    icon: React.ReactNode;
    iconBg: string;
    iconColor: string;
}

function StatCard({ label, value, icon, iconBg, iconColor }: StatCardProps) {
    return (
        <div className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white p-3 transition-shadow hover:shadow-sm">
            <div
                className={cn(
                    'flex h-9 w-9 items-center justify-center rounded-md',
                    iconBg,
                )}
            >
                <span className={iconColor}>{icon}</span>
            </div>
            <div className="min-w-0">
                <p className="truncate text-[11px] font-medium tracking-wide text-slate-500 uppercase">
                    {label}
                </p>
                <p className="text-lg font-semibold text-slate-800 tabular-nums">
                    {value}
                </p>
            </div>
        </div>
    );
}

// ============ MAIN COMPONENT ============
export default function Nurses() {
    const { props } = usePage<Props>();
    const queues = props.queue || [];
    const stats = props.stats || {};

    // ─── Handle "View Patient" ───
    const viewPatient = (row: QueuePatient) => {
        router.visit(`/patients/lab/${row.id}`);
    };

    // ─── Handle "Collect Sample" (example) ───
    const collectSample = (row: QueuePatient) => {
        Notiflix.Confirm.show(
            'Collect Sample',
            `Collect sample for ${row.first_name} ${row.last_name}?`,
            'Confirm',
            'Cancel',
            () => {
                router.post(
                    `/laboratory/samples/${row.id}/collect`,
                    {},
                    {
                        onSuccess: () => {
                            Notiflix.Notify.success('Sample collected');
                            router.reload();
                        },
                        onError: () =>
                            Notiflix.Notify.failure('Failed to collect sample'),
                    },
                );
            },
        );
    };

    // ─── Columns ───
    const columns: Column<QueuePatient>[] = [
        {
            id: 'token',
            label: 'Token',
            sortable: true,
            format: (value) => (
                <div className="flex items-center gap-2">
                    <div className="rounded border border-slate-200 bg-slate-50 p-1 text-slate-600">
                        <FlaskConical size={13} />
                    </div>
                    <span className="font-mono text-xs font-semibold text-slate-800">
                        AMH-{value}
                    </span>
                </div>
            ),
        },
        {
            id: 'first_name',
            label: 'Patient',
            sortable: true,
            filterable: true,
            format: (_, row) => (
                <div className="flex items-center gap-2">
                    <div className="flex h-7 w-7 items-center justify-center rounded-md border border-slate-200 bg-slate-50 text-[10px] font-semibold text-slate-600">
                        {row.first_name?.[0]}
                        {row.last_name?.[0]}
                    </div>
                    <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-slate-800">
                            {row.first_name} {row.last_name}
                        </p>
                        {row.patient_number && (
                            <p className="font-mono text-[11px] text-slate-400">
                                {row.patient_number}
                            </p>
                        )}
                    </div>
                </div>
            ),
        },
        {
            id: 'phone',
            label: 'Contact',
            format: (_, row) => (
                <div className="text-xs text-slate-600">
                    {row.phone && <div>{row.phone}</div>}
                    {row.email && (
                        <div className="truncate text-slate-400">
                            {row.email}
                        </div>
                    )}
                    {!row.phone && !row.email && (
                        <span className="text-slate-400">—</span>
                    )}
                </div>
            ),
        },
        {
            id: 'gender',
            label: 'Gender',
            sortable: true,
            format: (value) => (
                <span className="text-xs text-slate-600 capitalize">
                    {value || '—'}
                </span>
            ),
        },
        {
            id: 'status',
            label: 'Status',
            sortable: true,
            filterable: true,
            filterType: 'status',
            statusColors: {
                active: 'info',
                pending: 'warning',
                completed: 'success',
                cancelled: 'error',
            },
            format: (value) => {
                const config = getStatusConfig(value);
                return (
                    <span
                        className={cn(
                            'inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-[11px] font-medium',
                            config.badge,
                        )}
                    >
                        <span
                            className={cn(
                                'h-1.5 w-1.5 rounded-full',
                                config.dot,
                            )}
                        />
                        {config.label}
                    </span>
                );
            },
        },
        {
            id: 'created_at',
            label: 'Registered',
            sortable: true,
            format: (value) => (
                <div className="text-xs text-slate-600">
                    <div>{formatDate(value)}</div>
                    <div className="text-slate-400">{formatTime(value)}</div>
                </div>
            ),
        },
    ];

    // ─── Actions ───
    const actions: Action<QueuePatient>[] = [
        {
            label: 'View Patient',
            icon: <Eye size={16} />,
            color: 'info',
            onClick: (row) => viewPatient(row),
        },
        {
            label: 'Collect Sample',
            icon: <FlaskConical size={16} />,
            color: 'success',
            show: (row) => row.status === 'active' || row.status === 'pending',
            onClick: (row) => collectSample(row),
        },
    ];

    // ─── Status filter options ───
    const statusOptions = [
        { value: 'active', label: 'In Queue' },
        { value: 'pending', label: 'Pending' },
        { value: 'completed', label: 'Completed' },
        { value: 'cancelled', label: 'Cancelled' },
    ];

    return (
        <AppLayout
            breadcrumbs={[
                { href: '/dashboard', title: 'Dashboard' },
                { href: '', title: 'Laboratory' },
                { href: '', title: 'Queue' },
            ]}
        >
            <div className="h-full space-y-4 bg-blue-50 p-4">
                {/* ─── Header ─── */}
                <PageHeader
                    icon={<MicroscopeIcon className="h-5 w-5" />}
                    title="Laboratory Department"
                    subtitle="Manage patient queue, samples, and laboratory workflow"
                />

                {/* ─── Queue Table ─── */}
                <ReusableTable
                    title="Patient Queue"
                    columns={columns}
                    data={queues}
                    actions={actions}
                    loading={false}
                    filterPlaceholder="Search by name, token, or phone..."
                    statusFilterKey="status"
                    statusOptions={statusOptions}
                    rowsPerPageOptions={[8, 15, 25, 50]}
                    defaultRowsPerPage={8}
                    defaultOrderBy="created_at"
                    defaultOrderDirection="asc"
                    emptyMessage="No patients in the queue"
                    className="shadow-sm"
                />
            </div>
        </AppLayout>
    );
}
