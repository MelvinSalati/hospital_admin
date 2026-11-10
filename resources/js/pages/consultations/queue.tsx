// resources/js/pages/consultation/department.tsx
import { usePage, router } from '@inertiajs/react';
import { Clock, Eye, PlayCircle, Stethoscope } from 'lucide-react';
import React, { useMemo } from 'react';
import PageHeader from '@/components/PageHeader';
import ReusableTable from '@/components/ReusableTable';
import type { Action, Column } from '@/components/ReusableTable';
import { Badge } from '@/components/ui/badge';
import AppLayout from '@/layouts/app-layout';
import { cn } from '@/lib/utils';

// ============================================
// TYPES
// ============================================

interface QueuePatient {
    id: number | string;
    patient_name: string;
    token?: string;
    priority?: string;
    visit_status?: string;
    registered_at?: string;
}

interface PageProps {
    stats?: {
        total_in_queue?: number;
        pending_assignment?: number;
        assigned_today?: number;
    };
    queue?: QueuePatient[];
    [key: string]: unknown;
}

// ============================================
// FORMATTERS / CONFIG
// ============================================

const formatDate = (date?: string): string => {
    if (!date) return '';
    try {
        return new Date(date).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
        });
    } catch {
        return '';
    }
};

const formatTime = (date?: string): string => {
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

const STATUS_CONFIGS: Record<string, { label: string; color: string }> = {
    waiting: {
        label: 'Waiting',
        color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
    },
    in_progress: {
        label: 'In Progress',
        color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    },
    completed: {
        label: 'Completed',
        color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    },
    cancelled: {
        label: 'Cancelled',
        color: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400',
    },
    no_show: {
        label: 'No Show',
        color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    },
};

const getStatusConfig = (status?: string) => {
    const key = String(status ?? '').toLowerCase();
    return (
        STATUS_CONFIGS[key] ?? {
            label: key ? key.charAt(0).toUpperCase() + key.slice(1) : 'Pending',
            color: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400',
        }
    );
};

const PRIORITY_CONFIGS: Record<string, { label: string; color: string }> = {
    emergency: { label: 'Emergency', color: 'bg-red-600 text-white' },
    high: { label: 'High', color: 'bg-orange-500 text-white' },
    medium: { label: 'Medium', color: 'bg-blue-500 text-white' },
    low: { label: 'Low', color: 'bg-gray-400 text-white' },
};

const getPriorityConfig = (priority?: string) => {
    const key = String(priority ?? '').toLowerCase();
    return (
        PRIORITY_CONFIGS[key] ?? {
            label: key ? key.charAt(0).toUpperCase() + key.slice(1) : 'Routine',
            color: 'bg-gray-400 text-white',
        }
    );
};

// ============================================
// COMPONENT
// ============================================

export default function ConsultationQueue() {
    const { queue = [] } = usePage<PageProps>().props;
    console.log(queue);

    // ---------- action handlers ----------
    const handleStartConsultation = (patient: QueuePatient) => {
        if (patient?.id == null) {
            console.warn(
                'Cannot start consultation: patient.id is missing',
                patient,
            );
            return;
        }
        const url = `/patients/dashboard/${patient.patient_id}`;
        console.debug('[Consultation] Navigating to', url);
        router.visit(url, {
            preserveScroll: false,
            onError: (errors) =>
                console.error('[Consultation] Navigation failed', errors),
        });
    };

    const handleViewProfile = (patient: QueuePatient) => {
        if (patient?.id == null) {
            console.warn('Cannot view profile: patient.id is missing', patient);
            return;
        }
        router.visit(`/patients/dashboard/${patient.patient_id}`);
    };

    // ---------- columns ----------
    const columns: Column<QueuePatient>[] = useMemo(
        () => [
            {
                id: 'token',
                label: 'Token',
                sortable: true,
                format: (_, row) => (
                    <span className="font-mono text-sm font-medium">
                        {row.token || `VIS-${row.id}`}
                    </span>
                ),
            },
            {
                id: 'patient_name',
                label: 'Patient',
                sortable: true,
                filterable: true,
                format: (_, row) => (
                    <span className="font-medium text-slate-800 dark:text-slate-200">
                        {row.patient_name}
                    </span>
                ),
            },
            {
                id: 'priority',
                label: 'Priority',
                sortable: true,
                format: (_, row) => {
                    const { label, color } = getPriorityConfig(row.priority);
                    return (
                        <Badge className={cn('text-xs font-medium', color)}>
                            {label}
                        </Badge>
                    );
                },
            },
            {
                id: 'visit_status',
                label: 'Status',
                sortable: true,
                filterable: true,
                filterType: 'status',
                statusColors: {
                    waiting: 'warning',
                    in_progress: 'info',
                    completed: 'success',
                    cancelled: 'error',
                    no_show: 'error',
                },
                format: (_, row) => {
                    const { label, color } = getStatusConfig(row.visit_status);
                    return (
                        <span
                            className={cn(
                                'inline-flex items-center rounded-full px-3 py-1 text-xs font-medium shadow-sm',
                                color,
                            )}
                        >
                            {label}
                        </span>
                    );
                },
            },
            {
                id: 'registered_at',
                label: 'Registered',
                sortable: true,
                format: (_, row) =>
                    row.registered_at ? (
                        <div className="flex items-center gap-2">
                            <Clock size={14} className="text-slate-400" />
                            <div>
                                <span className="text-sm text-slate-700 dark:text-slate-300">
                                    {formatTime(row.registered_at)}
                                </span>
                                <span className="ml-1 text-xs text-slate-400">
                                    ({formatDate(row.registered_at)})
                                </span>
                            </div>
                        </div>
                    ) : (
                        <span className="text-sm text-slate-400">—</span>
                    ),
            },
        ],
        [],
    );

    // ---------- row actions ----------
    const actions: Action<QueuePatient>[] = useMemo(
        () => [
            {
                label: 'Start Consultation',
                icon: <PlayCircle size={16} />,
                color: 'primary',
                onClick: handleStartConsultation,
            },
            {
                label: 'View Profile',
                icon: <Eye size={16} />,
                onClick: handleViewProfile,
            },
        ],
        [],
    );

    const statusOptions = [
        { value: 'waiting', label: 'Waiting' },
        { value: 'in_progress', label: 'In Progress' },
        { value: 'completed', label: 'Completed' },
        { value: 'cancelled', label: 'Cancelled' },
        { value: 'no_show', label: 'No Show' },
    ];

    return (
        <AppLayout
            breadcrumbs={[
                { title: 'Consultation', href: '/consultation' },
                { title: 'Queue', href: '/consultation/queue' },
            ]}
        >
            <div className="h-full bg-blue-100 p-4">
                <PageHeader
                    icon={<Stethoscope />}
                    title="Consultation Department"
                    subtitle="View clients in Consultation department queue"
                />

                <div className="mt-6">
                    <ReusableTable
                        title="Consultation Queue"
                        columns={columns}
                        data={queue}
                        actions={actions}
                        filterPlaceholder="Search by patient name or token..."
                        statusFilterKey="visit_status"
                        statusOptions={statusOptions}
                        rowsPerPageOptions={[8, 15, 25, 50]}
                        defaultRowsPerPage={8}
                        defaultOrderBy="registered_at"
                        emptyMessage="No patients in the consultation queue"
                        className="shadow-sm"
                    />
                </div>
            </div>
        </AppLayout>
    );
}
