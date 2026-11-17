// resources/js/pages/consultation/department.tsx

import { Link, usePage, router } from '@inertiajs/react';
import {
    AlertTriangle,
    Building2,
    Clock,
    Eye,
    Hourglass,
    Loader2,
    PlayCircle,
    Phone,
    Stethoscope,
    User,
    Users,
} from 'lucide-react';
import Notiflix from 'notiflix';
import { useEffect, useMemo, useState } from 'react';
import type { FC, ReactNode } from 'react';
import PageHeader from '@/components/PageHeader';
import ReusableTable from '@/components/ReusableTable';
import type { Action, Column } from '@/components/ReusableTable';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import AppLayout from '@/layouts/app-layout';
import Http from '@/utils/Http';

// ============================================================================
// Types
// ============================================================================

type VisitStatus =
    | 'pending'
    | 'active'
    | 'in_progress'
    | 'completed'
    | 'cancelled'
    | 'no_show';

interface QueueRecord {
    id: number;
    token: string | null;
    patient_id: number;
    patient_number?: string | null;
    patient_name: string | null;
    contact: string | null;
    gender: string | null;
    payment_method: string | null;
    original_payment_method?: string | null;
    status?: number | string | null;
    registered_at: string | null;
    assigned_department?: string | null;
    assigned_staff?: string | null;
    visit_status: string | null;
    priority: string | null;
    department_id?: number | null;
    photo_url?: string | null;
}

interface QueuePatient extends Omit<
    QueueRecord,
    | 'token'
    | 'patient_number'
    | 'patient_name'
    | 'contact'
    | 'gender'
    | 'payment_method'
    | 'visit_status'
    | 'priority'
    | 'assigned_department'
    | 'assigned_staff'
> {
    token: string;
    patient_number: string;
    patient_name: string;
    contact: string;
    gender: string;
    payment_method: string;
    visit_status: VisitStatus;
    priority: string;
    assigned_department: string;
    assigned_staff: string;
}

interface Props {
    [key: string]: unknown;
    queue?: QueueRecord[];
    stats?: {
        total_in_queue?: number;
        pending_assignment?: number;
        assigned_today?: number;
    };
}

type QueueTab = 'in_queue' | 'seen';

// ============================================================================
// Constants
// ============================================================================

/** How often the queue refreshes and wait times recalculate. */
const REFRESH_MS = 30_000;

const IN_QUEUE_STATUSES: VisitStatus[] = ['pending', 'active', 'in_progress'];
const SEEN_STATUSES: VisitStatus[] = ['completed', 'cancelled', 'no_show'];

const VALID_STATUSES: VisitStatus[] = [
    'pending',
    'active',
    'in_progress',
    'completed',
    'cancelled',
    'no_show',
];

const NUMERIC_STATUS: Record<number, VisitStatus> = {
    0: 'cancelled',
    1: 'active',
    2: 'pending',
    3: 'in_progress',
    4: 'completed',
};

/** Lower rank = seen first. */
const PRIORITY_RANK: Record<string, number> = {
    stat: 0,
    emergency: 1,
    urgent: 2,
    high: 2,
    routine: 3,
    medium: 3,
    low: 4,
};

// ============================================================================
// Illustrated avatars (DiceBear)
// ============================================================================

const AVATAR_BASE_URL = 'https://api.dicebear.com/9.x/avataaars/svg';

const AVATAR_STYLE = {
    skinColor: '614335,ae5d29',
    hairColor: '2c1b18,4a312c',
    backgroundColor: 'dbeafe,e0e7ff',
    maleTops:
        'shortCurly,shortFlat,shortRound,frizzle,theCaesar,dreads01,dreads02,sides',
    femaleTops: 'bob,bun,curly,curvy,dreads,fro,froBand,bigHair',
    neutralTops: 'shortCurly,shortFlat,bob,curly,fro,frizzle',
};

const getAvatarUrl = (
    patientId: number,
    gender: string | null | undefined,
    pixels: number,
): string => {
    const g = (gender || '').toLowerCase();
    const isMale = g === 'male';
    const isFemale = g === 'female';

    const params = new URLSearchParams({
        seed: `patient-${patientId}`,
        size: String(pixels),
        skinColor: AVATAR_STYLE.skinColor,
        hairColor: AVATAR_STYLE.hairColor,
        backgroundColor: AVATAR_STYLE.backgroundColor,
        top: isMale
            ? AVATAR_STYLE.maleTops
            : isFemale
              ? AVATAR_STYLE.femaleTops
              : AVATAR_STYLE.neutralTops,
        facialHairProbability: isMale ? '25' : '0',
        facialHairColor: '2c1b18',
        accessoriesProbability: '0',
    });

    return `${AVATAR_BASE_URL}?${params.toString()}`;
};

// ============================================================================
// Helpers
// ============================================================================

const normalizeStatus = (
    status: number | string | null | undefined,
): VisitStatus => {
    if (status === null || status === undefined || status === '') {
        return 'pending';
    }

    if (typeof status === 'number') {
        return NUMERIC_STATUS[status] ?? 'pending';
    }

    const key = status.toLowerCase().replace(/[\s-]+/g, '_');

    // The backend still sends "waiting" for patients who have not been seen.
    if (key === 'waiting') {
        return 'pending';
    }

    return VALID_STATUSES.includes(key as VisitStatus)
        ? (key as VisitStatus)
        : 'pending';
};

const capitalize = (value: string): string =>
    value ? value.charAt(0).toUpperCase() + value.slice(1).toLowerCase() : '';

const parseDate = (value?: string | null): Date | null => {
    if (!value) {
        return null;
    }

    const date = new Date(value.replace(' ', 'T'));

    return Number.isNaN(date.getTime()) ? null : date;
};

const formatDate = (value?: string | null): string => {
    const date = parseDate(value);

    return date
        ? date.toLocaleDateString('en-GB', {
              day: '2-digit',
              month: 'short',
              year: 'numeric',
          })
        : 'N/A';
};

const formatTime = (value?: string | null): string => {
    const date = parseDate(value);

    return date
        ? date.toLocaleTimeString('en-GB', {
              hour: '2-digit',
              minute: '2-digit',
          })
        : '';
};

const formatDateTime = (value?: string | null): string =>
    parseDate(value) ? `${formatDate(value)}, ${formatTime(value)}` : 'N/A';

/** Minutes between arrival and `now`, or null when the date is unusable. */
const minutesWaiting = (value: string | null, now: number): number | null => {
    const date = parseDate(value);

    if (!date) {
        return null;
    }

    return Math.max(0, Math.floor((now - date.getTime()) / 60_000));
};

const formatWait = (minutes: number): string => {
    if (minutes < 1) {
        return '<1m';
    }

    if (minutes < 60) {
        return `${minutes}m`;
    }

    const hours = Math.floor(minutes / 60);
    const rest = String(minutes % 60).padStart(2, '0');

    return `${hours}h ${rest}m`;
};

const isUrgent = (priority: string): boolean =>
    ['stat', 'emergency', 'urgent', 'high'].includes(priority);

const normalizeRecord = (record: QueueRecord): QueuePatient => ({
    ...record,
    token: record.token || `T-${String(record.id).padStart(4, '0')}`,
    patient_number: record.patient_number || 'N/A',
    patient_name: record.patient_name?.trim() || 'Unknown patient',
    contact: record.contact || 'N/A',
    gender: record.gender ? capitalize(record.gender) : 'N/A',
    payment_method:
        record.payment_method ||
        record.original_payment_method ||
        'Not specified',
    visit_status: normalizeStatus(record.visit_status ?? record.status),
    priority: (record.priority || 'routine').toLowerCase(),
    assigned_department: record.assigned_department || 'Consultation',
    assigned_staff: record.assigned_staff || 'Not assigned',
});

// ============================================================================
// Badge components
// ============================================================================

const STATUS_CONFIG: Record<
    VisitStatus,
    { label: string; color: string; dot: string }
> = {
    pending: {
        label: 'Waiting',
        color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
        dot: 'bg-amber-500',
    },
    active: {
        label: 'Called',
        color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
        dot: 'bg-emerald-500',
    },
    in_progress: {
        label: 'In Consultation',
        color: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400',
        dot: 'bg-indigo-500',
    },
    completed: {
        label: 'Done',
        color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
        dot: 'bg-emerald-500',
    },
    cancelled: {
        label: 'Cancelled',
        color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
        dot: 'bg-red-500',
    },
    no_show: {
        label: 'No Show',
        color: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400',
        dot: 'bg-slate-500',
    },
};

const StatusBadge: FC<{ status: VisitStatus }> = ({ status }) => {
    const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.pending;

    return (
        <span
            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${cfg.color}`}
        >
            <span className={`h-1.5 w-1.5 rounded-full ${cfg.dot}`} />
            {cfg.label}
        </span>
    );
};

const PriorityBadge: FC<{ priority: string }> = ({ priority }) => {
    const config: Record<string, { label: string; color: string }> = {
        routine: {
            label: 'Routine',
            color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
        },
        urgent: {
            label: 'Urgent',
            color: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
        },
        emergency: {
            label: 'Emergency',
            color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
        },
        stat: {
            label: 'STAT',
            color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
        },
    };

    // Older records use high / medium / low.
    const aliases: Record<string, string> = {
        high: 'urgent',
        medium: 'routine',
        low: 'routine',
    };

    const cfg = config[aliases[priority] ?? priority] || config.routine;

    return (
        <span
            className={`inline-flex items-center rounded px-2 py-0.5 text-[10px] font-medium ${cfg.color}`}
        >
            {cfg.label}
        </span>
    );
};

const PaymentBadge: FC<{ method: string }> = ({ method }) => {
    if (!method || method === 'Not specified') {
        return <span className="text-xs text-slate-400">—</span>;
    }

    const config: Record<string, { label: string; color: string }> = {
        cash: {
            label: 'Cash',
            color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
        },
        nhima: {
            label: 'NHIMA',
            color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
        },
        insurance: {
            label: 'Insurance',
            color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
        },
        charity: {
            label: 'Charity',
            color: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400',
        },
        mobile_money: {
            label: 'Mobile',
            color: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
        },
        card: {
            label: 'Card',
            color: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400',
        },
        altaf: {
            label: 'Altaf',
            color: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400',
        },
    };

    const cfg = config[method.toLowerCase()] || {
        label: method,
        color: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400',
    };

    return (
        <span
            className={`inline-flex items-center rounded px-2 py-0.5 text-[10px] font-medium ${cfg.color}`}
        >
            {cfg.label}
        </span>
    );
};

/** Live wait time. Turns amber after 30 minutes and red after an hour. */
const WaitBadge: FC<{ minutes: number | null }> = ({ minutes }) => {
    if (minutes === null) {
        return <span className="text-xs text-slate-400">—</span>;
    }

    const tone =
        minutes >= 60
            ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
            : minutes >= 30
              ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
              : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300';

    return (
        <span
            className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${tone}`}
        >
            <Hourglass size={12} />
            {formatWait(minutes)}
        </span>
    );
};

const PatientAvatar: FC<{
    name: string;
    patientId?: number;
    gender?: string | null;
    photoUrl?: string | null;
    size?: 'sm' | 'lg';
}> = ({ name, patientId, gender, photoUrl, size = 'sm' }) => {
    const [failed, setFailed] = useState(false);

    const dimension = size === 'lg' ? 'h-12 w-12 text-sm' : 'h-9 w-9 text-xs';
    const pixels = size === 'lg' ? 96 : 72;

    const src =
        photoUrl ||
        (patientId !== undefined
            ? getAvatarUrl(patientId, gender, pixels)
            : null);

    const initials = (name || '')
        .split(' ')
        .filter(Boolean)
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);

    if (!src || failed) {
        return (
            <div
                className={`flex ${dimension} shrink-0 items-center justify-center rounded-full bg-blue-100 font-medium text-blue-700 dark:bg-blue-900/40 dark:text-blue-300`}
            >
                {initials || '?'}
            </div>
        );
    }

    return (
        <img
            src={src}
            alt={name}
            loading="lazy"
            referrerPolicy="no-referrer"
            onError={() => setFailed(true)}
            className={`${dimension} shrink-0 rounded-full bg-blue-100 object-cover dark:bg-blue-900/40`}
        />
    );
};

const DetailField: FC<{ label: string; children: ReactNode }> = ({
    label,
    children,
}) => (
    <div>
        <Label className="text-xs text-slate-500">{label}</Label>
        <div className="mt-0.5 text-sm text-slate-800 dark:text-slate-200">
            {children}
        </div>
    </div>
);

const StatCard: FC<{
    label: string;
    value: number;
    icon: ReactNode;
    tone: string;
}> = ({ label, value, icon, tone }) => (
    <div className="flex items-center gap-3 rounded-xl border border-white bg-white p-3 shadow-sm dark:border-slate-700 dark:bg-slate-800">
        <div
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${tone}`}
        >
            {icon}
        </div>
        <div>
            <p className="text-xl leading-none font-semibold text-slate-800 dark:text-slate-100">
                {value}
            </p>
            <p className="mt-1 text-xs text-slate-500">{label}</p>
        </div>
    </div>
);

// ============================================================================
// Main component
// ============================================================================

export default function ConsultationQueue() {
    const { queue = [] } = usePage<Props>().props;

    const [selectedPatient, setSelectedPatient] = useState<QueuePatient | null>(
        null,
    );
    const [showDetailsModal, setShowDetailsModal] = useState(false);
    const [loading, setLoading] = useState(false);
    const [activeTab, setActiveTab] = useState<QueueTab>('in_queue');
    const [now, setNow] = useState(() => Date.now());

    // Keep wait times ticking and the queue fresh while the tab is visible.
    useEffect(() => {
        const timer = setInterval(() => {
            setNow(Date.now());

            if (document.visibilityState === 'visible') {
                router.reload({ only: ['queue', 'stats'] });
            }
        }, REFRESH_MS);

        return () => clearInterval(timer);
    }, []);

    const processedQueue = useMemo<QueuePatient[]>(
        () => queue.map(normalizeRecord),
        [queue],
    );

    const inQueue = useMemo(
        () =>
            processedQueue
                .filter((p) => IN_QUEUE_STATUSES.includes(p.visit_status))
                // Most urgent first, then first come first served.
                .sort((a, b) => {
                    const rank =
                        (PRIORITY_RANK[a.priority] ?? 3) -
                        (PRIORITY_RANK[b.priority] ?? 3);

                    if (rank !== 0) {
                        return rank;
                    }

                    return (
                        (parseDate(a.registered_at)?.getTime() ?? 0) -
                        (parseDate(b.registered_at)?.getTime() ?? 0)
                    );
                }),
        [processedQueue],
    );

    const seen = useMemo(
        () =>
            processedQueue.filter((p) =>
                SEEN_STATUSES.includes(p.visit_status),
            ),
        [processedQueue],
    );

    const tableData = activeTab === 'in_queue' ? inQueue : seen;

    const waitingCount = inQueue.filter(
        (p) => p.visit_status === 'pending' || p.visit_status === 'active',
    ).length;
    const inConsultationCount = inQueue.filter(
        (p) => p.visit_status === 'in_progress',
    ).length;
    const urgentCount = inQueue.filter((p) => isUrgent(p.priority)).length;

    // ------------------------------------------------------------------------
    // Handlers
    // ------------------------------------------------------------------------

    const openDashboard = (patient: QueuePatient) => {
        router.visit(`/patients/dashboard/${patient.patient_id}`);
    };

    const updateStatus = async (
        queueId: number,
        newStatus: VisitStatus,
    ): Promise<boolean> => {
        setLoading(true);
        Notiflix.Loading.pulse('Updating...');

        try {
            const response = await Http.post(
                `/consultation/queue/${queueId}/status`,
                { status: newStatus },
            );

            if (response.data.success) {
                Notiflix.Notify.success(
                    `Status updated to ${STATUS_CONFIG[newStatus].label}`,
                );
                router.reload({ only: ['queue', 'stats'] });

                return true;
            }

            Notiflix.Notify.failure(
                response.data.message || 'Failed to update status',
            );

            return false;
        } catch (error: any) {
            Notiflix.Notify.failure(
                error.response?.data?.message || 'Failed to update status',
            );

            return false;
        } finally {
            Notiflix.Loading.remove();
            setLoading(false);
        }
    };

    const handleStartConsultation = async (patient: QueuePatient) => {
        if (!patient.patient_id) {
            Notiflix.Notify.failure('This queue entry has no patient attached');

            return;
        }

        // Mark the visit as in consultation, then open the patient. A failed
        // status update must never stop the clinician from reaching the chart.
        if (['pending', 'active'].includes(patient.visit_status)) {
            await updateStatus(patient.id, 'in_progress');
        }

        openDashboard(patient);
    };

    const handleViewDetails = (patient: QueuePatient) => {
        setSelectedPatient(patient);
        setShowDetailsModal(true);
    };

    // ------------------------------------------------------------------------
    // Columns
    // ------------------------------------------------------------------------

    const columns: Column<QueuePatient>[] = [
        {
            id: 'token',
            label: 'Token',
            sortable: true,
            format: (value, row) => (
                <span className="inline-flex items-center gap-2">
                    {['stat', 'emergency'].includes(row.priority) &&
                        IN_QUEUE_STATUSES.includes(row.visit_status) && (
                            <span className="relative flex h-2 w-2">
                                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75 motion-reduce:animate-none" />
                                <span className="relative inline-flex h-2 w-2 rounded-full bg-red-500" />
                            </span>
                        )}
                    <span className="font-mono text-sm font-medium text-blue-600 dark:text-blue-400">
                        {(value as string) || 'N/A'}
                    </span>
                </span>
            ),
        },
        {
            id: 'patient_name',
            label: 'Patient',
            sortable: true,
            filterable: true,
            format: (_value, row) => (
                <Link
                    href={`/patients/dashboard/${row.patient_id}`}
                    className="flex items-center gap-2.5 hover:text-blue-600 dark:hover:text-blue-400"
                >
                    <PatientAvatar
                        name={row.patient_name}
                        patientId={row.patient_id}
                        gender={row.gender}
                        photoUrl={row.photo_url}
                    />
                    <div>
                        <span className="font-medium text-slate-800 dark:text-slate-200">
                            {row.patient_name}
                        </span>
                        <div className="flex items-center gap-2 text-xs text-slate-400">
                            <span>EMR #: {row.patient_number}</span>
                            {row.contact !== 'N/A' && (
                                <>
                                    <span>•</span>
                                    <Phone size={10} />
                                    <span>{row.contact}</span>
                                </>
                            )}
                        </div>
                    </div>
                </Link>
            ),
        },
        {
            id: 'priority',
            label: 'Priority',
            sortable: true,
            format: (_value, row) => <PriorityBadge priority={row.priority} />,
        },
        {
            id: 'visit_status',
            label: 'Status',
            sortable: true,
            filterable: true,
            format: (_value, row) => <StatusBadge status={row.visit_status} />,
        },
        {
            id: 'registered_at',
            label: 'Waiting',
            sortable: true,
            format: (value, row) => (
                <div className="flex flex-col gap-1">
                    {IN_QUEUE_STATUSES.includes(row.visit_status) ? (
                        <WaitBadge
                            minutes={minutesWaiting(row.registered_at, now)}
                        />
                    ) : null}
                    <div className="flex items-center gap-1.5">
                        <Clock size={12} className="text-slate-400" />
                        <span className="text-xs text-slate-500 dark:text-slate-400">
                            {formatDateTime(value as string)}
                        </span>
                    </div>
                </div>
            ),
        },
    ];

    // ------------------------------------------------------------------------
    // Actions
    // ------------------------------------------------------------------------

    const actions: Action<QueuePatient>[] = [
        {
            label: 'Start Consultation',
            icon: <PlayCircle size={16} />,
            color: 'primary',
            onClick: (row) => handleStartConsultation(row),
        },
        {
            label: 'View Dashboard',
            icon: <Eye size={16} />,
            color: 'info',
            onClick: (row) => openDashboard(row),
        },
        {
            label: 'Details',
            icon: <User size={16} />,
            color: 'info',
            onClick: (row) => handleViewDetails(row),
        },
    ];

    const statusOptions = VALID_STATUSES.map((value) => ({
        value,
        label: STATUS_CONFIG[value].label,
    }));

    // ------------------------------------------------------------------------
    // Render
    // ------------------------------------------------------------------------

    return (
        <AppLayout
            breadcrumbs={[
                { href: '/dashboard', title: 'Altaf Memorial Hospital' },
                { href: '', title: 'Department' },
                { href: '/consultation/queue', title: 'Consultation' },
            ]}
        >
            <PageHeader
                icon={<Stethoscope />}
                title="Consultation Encounter Queue"
                subtitle="Patients waiting to see a clinician, most urgent first"
                actions={[
                    {
                        label: `In Process (${inQueue.length})`,
                        onClick: () => setActiveTab('in_queue'),
                        variant: activeTab === 'in_queue' ? 'cyan' : 'default',
                    },
                    {
                        label: `Completed (${seen.length})`,
                        onClick: () => setActiveTab('seen'),
                        variant: activeTab === 'seen' ? 'cyan' : 'default',
                    },
                ]}
            />

            <div className="flex h-full min-h-screen flex-1 flex-col gap-4 bg-blue-50 p-4 dark:bg-slate-900">
                <ReusableTable
                    columns={columns}
                    data={tableData}
                    actions={actions}
                    loading={loading}
                    filterPlaceholder="Search by patient name, token, or contact..."
                    statusFilterKey="visit_status"
                    statusOptions={statusOptions}
                    rowsPerPageOptions={[8, 15, 25, 50]}
                    defaultRowsPerPage={8}
                    defaultOrderBy="registered_at"
                    emptyMessage={
                        activeTab === 'in_queue'
                            ? 'No patients are waiting for consultation'
                            : 'No patients have been seen yet'
                    }
                    className="shadow-sm"
                />

                {/* Details modal */}
                <Dialog
                    open={showDetailsModal}
                    onOpenChange={(open) => {
                        setShowDetailsModal(open);

                        if (!open) {
                            setSelectedPatient(null);
                        }
                    }}
                >
                    <DialogContent className="max-w-md">
                        <DialogHeader>
                            <DialogTitle className="text-sm">
                                Patient Details
                            </DialogTitle>
                        </DialogHeader>

                        {selectedPatient && (
                            <div className="space-y-4">
                                <div className="flex items-center gap-3">
                                    <PatientAvatar
                                        name={selectedPatient.patient_name}
                                        patientId={selectedPatient.patient_id}
                                        gender={selectedPatient.gender}
                                        photoUrl={selectedPatient.photo_url}
                                        size="lg"
                                    />
                                    <div>
                                        <p className="text-sm font-medium">
                                            {selectedPatient.patient_name}
                                        </p>
                                        <p className="text-xs text-slate-500">
                                            Token: {selectedPatient.token}
                                        </p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <DetailField label="EMR number">
                                        {selectedPatient.patient_number}
                                    </DetailField>
                                    <DetailField label="Contact">
                                        {selectedPatient.contact}
                                    </DetailField>
                                    <DetailField label="Gender">
                                        {selectedPatient.gender}
                                    </DetailField>
                                    <DetailField label="Priority">
                                        <PriorityBadge
                                            priority={selectedPatient.priority}
                                        />
                                    </DetailField>
                                    <DetailField label="Status">
                                        <StatusBadge
                                            status={
                                                selectedPatient.visit_status
                                            }
                                        />
                                    </DetailField>
                                    <DetailField label="Payment">
                                        <PaymentBadge
                                            method={
                                                selectedPatient.payment_method
                                            }
                                        />
                                    </DetailField>
                                    <DetailField label="Department">
                                        {selectedPatient.assigned_department}
                                    </DetailField>
                                    <DetailField label="Clinician">
                                        {selectedPatient.assigned_staff}
                                    </DetailField>
                                    <DetailField label="Arrived">
                                        {formatDateTime(
                                            selectedPatient.registered_at,
                                        )}
                                    </DetailField>
                                    <DetailField label="Waiting">
                                        {IN_QUEUE_STATUSES.includes(
                                            selectedPatient.visit_status,
                                        ) ? (
                                            <WaitBadge
                                                minutes={minutesWaiting(
                                                    selectedPatient.registered_at,
                                                    now,
                                                )}
                                            />
                                        ) : (
                                            '—'
                                        )}
                                    </DetailField>
                                </div>

                                <div className="flex items-center justify-between gap-2 border-t pt-3">
                                    <Link
                                        href={`/patients/dashboard/${selectedPatient.patient_id}`}
                                        className="inline-flex items-center gap-1 rounded bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-600 transition-colors hover:bg-blue-100 dark:bg-blue-950/30 dark:text-blue-400"
                                    >
                                        <Eye className="h-3.5 w-3.5" />
                                        Dashboard
                                    </Link>

                                    <div className="flex gap-2">
                                        {selectedPatient.visit_status ===
                                            'pending' && (
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                className="text-xs"
                                                disabled={loading}
                                                onClick={async () => {
                                                    await updateStatus(
                                                        selectedPatient.id,
                                                        'no_show',
                                                    );
                                                    setShowDetailsModal(false);
                                                }}
                                            >
                                                No show
                                            </Button>
                                        )}

                                        {IN_QUEUE_STATUSES.includes(
                                            selectedPatient.visit_status,
                                        ) && (
                                            <Button
                                                size="sm"
                                                className="text-xs"
                                                disabled={loading}
                                                onClick={async () => {
                                                    setShowDetailsModal(false);
                                                    await handleStartConsultation(
                                                        selectedPatient,
                                                    );
                                                }}
                                            >
                                                {loading ? (
                                                    <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
                                                ) : (
                                                    <PlayCircle className="mr-1 h-3.5 w-3.5" />
                                                )}
                                                {selectedPatient.visit_status ===
                                                'in_progress'
                                                    ? 'Continue'
                                                    : 'Start consultation'}
                                            </Button>
                                        )}

                                        <Button
                                            size="sm"
                                            variant="outline"
                                            className="text-xs"
                                            onClick={() =>
                                                setShowDetailsModal(false)
                                            }
                                        >
                                            Close
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </DialogContent>
                </Dialog>
            </div>
        </AppLayout>
    );
}
