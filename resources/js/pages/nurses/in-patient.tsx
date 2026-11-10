// resources/js/pages/nurses/in-patient.tsx
import { router, usePage } from '@inertiajs/react';
import {
    BedIcon,
    Eye,
    ClipboardCheck,
    Users,
    UserCheck,
    Activity,
    Clock,
} from 'lucide-react';
import Notiflix from 'notiflix';
import PageHeader from '@/components/PageHeader';
import type { Column, Action } from '@/components/ReusableTable';
import ReusableTable from '@/components/ReusableTable';
import AppLayout from '@/layouts/app/app-header-layout';
import { cn } from '@/lib/utils';

// ============ TYPES ============
interface InPatientRow {
    id: number;
    patient_name: string;
    admission_number?: string;
    admission_date: string;
    bed_number: string | null;
    ward: string | null;
    status: 'active' | 'discharged' | string;
    priority?: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT' | 'EMERGENCY' | string;
    doctor_name?: string | null;
}

interface PageProps {
    listOfAdmittedPatients: InPatientRow[];
    stats?: {
        active?: number;
        discharged_today?: number;
        assigned_ward?: number;
        pending_review?: number;
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

const getStatusConfig = (status: string) => {
    const map: Record<string, { label: string; badge: string; dot: string }> = {
        active: {
            label: 'Active',
            badge: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-800',
            dot: 'bg-emerald-500',
        },
        discharged: {
            label: 'Discharged',
            badge: 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700',
            dot: 'bg-slate-400',
        },
        pending: {
            label: 'Pending',
            badge: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-800',
            dot: 'bg-amber-500',
        },
    };
    return map[status] ?? map.pending;
};

const getPriorityConfig = (priority?: string) => {
    const map: Record<string, { label: string; badge: string; dot: string }> = {
        LOW: {
            label: 'Low',
            badge: 'bg-slate-100 text-slate-600 border-slate-200',
            dot: 'bg-slate-400',
        },
        NORMAL: {
            label: 'Normal',
            badge: 'bg-blue-50 text-blue-700 border-blue-200',
            dot: 'bg-blue-500',
        },
        HIGH: {
            label: 'High',
            badge: 'bg-amber-50 text-amber-700 border-amber-200',
            dot: 'bg-amber-500',
        },
        URGENT: {
            label: 'Urgent',
            badge: 'bg-orange-50 text-orange-700 border-orange-200',
            dot: 'bg-orange-500',
        },
        EMERGENCY: {
            label: 'Emergency',
            badge: 'bg-red-50 text-red-700 border-red-200',
            dot: 'bg-red-500',
        },
    };
    return priority ? (map[priority] ?? map.NORMAL) : null;
};

// ============ STAT CARD ============
interface StatCardProps {
    label: string;
    value: number | string;
    icon: React.ReactNode;
    iconBg: string;
    iconColor: string;
}

// ============ MAIN COMPONENT ============
export default function InPatient() {
    const { listOfAdmittedPatients, stats = {} } = usePage<PageProps>().props;
    const rows = listOfAdmittedPatients ?? [];

    // ─── Derived stats (fall back to computed values if backend sends none) ───
    const activeCount =
        stats.active ?? rows.filter((r) => r.status === 'active').length;
    const wardCount =
        stats.assigned_ward ??
        new Set(rows.map((r) => r.ward).filter(Boolean)).size;
    const withBed = rows.filter((r) => r.bed_number).length;

    // ─── Handlers ───
    const viewPatient = (row: InPatientRow) => {
        router.visit(`/patients/admissions/${row.id}`);
    };

    const quickDischarge = (row: InPatientRow) => {
        Notiflix.Confirm.show(
            'Discharge Patient',
            `Mark ${row.patient_name} as discharged?`,
            'Confirm',
            'Cancel',
            () => {
                router.post(
                    `/admissions/${row.id}/discharge`,
                    {},
                    {
                        onSuccess: () => {
                            Notiflix.Notify.success('Patient discharged');
                            router.reload();
                        },
                        onError: () =>
                            Notiflix.Notify.failure('Failed to discharge'),
                    },
                );
            },
        );
    };

    // ─── Columns ───
    const columns: Column<InPatientRow>[] = [
        {
            id: 'admission_number',
            label: 'Admission',
            sortable: true,
            format: (value, row) => (
                <div className="flex items-center gap-2">
                    <div className="rounded border border-slate-200 bg-slate-50 p-1 text-slate-600">
                        <BedIcon size={13} />
                    </div>
                    <div className="min-w-0">
                        <p className="font-mono text-xs font-semibold text-slate-800">
                            {value ?? `ADM-${row.id}`}
                        </p>
                        {row.priority && getPriorityConfig(row.priority) && (
                            <span
                                className={cn(
                                    'mt-0.5 inline-flex items-center gap-1 rounded border px-1.5 py-0.5 text-[10px] font-medium',
                                    getPriorityConfig(row.priority)!.badge,
                                )}
                            >
                                <span
                                    className={cn(
                                        'h-1 w-1 rounded-full',
                                        getPriorityConfig(row.priority)!.dot,
                                    )}
                                />
                                {getPriorityConfig(row.priority)!.label}
                            </span>
                        )}
                    </div>
                </div>
            ),
        },
        {
            id: 'patient_name',
            label: 'Patient',
            sortable: true,
            filterable: true,
            format: (value, row) => (
                <div className="flex items-center gap-2">
                    <div className="flex h-7 w-7 items-center justify-center rounded-md border border-slate-200 bg-slate-50 text-[10px] font-semibold text-slate-600">
                        {row.patient_name
                            ?.split(' ')
                            .map((n) => n[0])
                            .slice(0, 2)
                            .join('')}
                    </div>
                    <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-slate-800">
                            {value}
                        </p>
                        {row.doctor_name && (
                            <p className="text-[11px] text-slate-400">
                                Dr. {row.doctor_name}
                            </p>
                        )}
                    </div>
                </div>
            ),
        },
        {
            id: 'ward',
            label: 'Ward',
            sortable: true,
            format: (value) => (
                <span className="text-xs text-slate-600">{value || '—'}</span>
            ),
        },
        {
            id: 'bed_number',
            label: 'Bed',
            sortable: true,
            format: (value) => (
                <span className="text-xs text-slate-600">{value || '—'}</span>
            ),
        },
        {
            id: 'status',
            label: 'Status',
            sortable: true,
            filterable: true,
            filterType: 'status',
            statusColors: {
                active: 'success',
                discharged: 'error',
                pending: 'warning',
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
            id: 'admission_date',
            label: 'Admitted',
            sortable: true,
            format: (value) => (
                <div className="text-xs text-slate-600">
                    {formatDate(value)}
                </div>
            ),
        },
    ];

    // ─── Actions ───
    const actions: Action<InPatientRow>[] = [
        {
            label: 'View Patient',
            icon: <Eye size={16} />,
            color: 'info',
            onClick: (row) => viewPatient(row),
        },
        {
            label: 'Discharge',
            icon: <ClipboardCheck size={16} />,
            color: 'error',
            show: (row) => row.status === 'active',
            onClick: (row) => quickDischarge(row),
        },
    ];

    // ─── Status filter options ───
    const statusOptions = [
        { value: 'active', label: 'Active' },
        { value: 'discharged', label: 'Discharged' },
        { value: 'pending', label: 'Pending' },
    ];

    return (
        <AppLayout
            breadcrumbs={[
                { href: '/', title: 'Nurses' },
                { href: '', title: 'Admissions' },
            ]}
        >
            <div className="h-full space-y-4 bg-blue-100 p-2">
                {/* ─── Header ─── */}
                <PageHeader
                    icon={<BedIcon className="h-5 w-5" />}
                    title="In-Patient Admissions"
                    subtitle="Monitor currently admitted patients, bed allocation, and discharge status"
                />

                {/* ─── Table ─── */}
                <ReusableTable
                    title="Current Admissions"
                    columns={columns}
                    data={rows}
                    actions={actions}
                    loading={false}
                    filterPlaceholder="Search by patient, admission no., ward..."
                    statusFilterKey="status"
                    statusOptions={statusOptions}
                    rowsPerPageOptions={[8, 15, 25, 50]}
                    defaultRowsPerPage={8}
                    defaultOrderBy="admission_date"
                    defaultOrderDirection="desc"
                    emptyMessage="No patients currently admitted"
                    className="shadow-sm"
                />
            </div>
        </AppLayout>
    );
}
