// pages/reception/appointments.tsx  (adjust path to match your Inertia page resolver)

import { Link, usePage, router } from '@inertiajs/react';
import {
    Eye,
    Clock,
    User,
    Loader2,
    Calendar as CalendarIcon,
} from 'lucide-react';
import Notiflix from 'notiflix';
import { useMemo, useState } from 'react';
import PageHeader from '@/components/PageHeader';
import ReusableTable from '@/components/ReusableTable';
import type { Column, Action } from '@/components/ReusableTable';
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

type AppointmentStatus =
    | 'waiting'
    | 'in_progress'
    | 'completed'
    | 'missed'
    | 'cancelled';

type AppointmentTab = 'today' | 'upcoming' | 'missed';

/** Shape of one row exactly as the backend sends it. */
interface AppointmentRecord {
    id: number;
    patient_id: number;
    patient_name: string | null;
    patient_number?: string | null;
    contact?: string | null;
    gender?: string | null;
    doctor_name: string | null;
    department: string | null;
    time: string | null; // "14:30" or full datetime
    next_appointment_date?: string | null;
    reason: string | null;
    status: string | null;
    /** Optional real photo from backend */
    photo_url?: string | null;
}

/** Normalised row the UI consumes. */
interface Appointment extends Omit<
    AppointmentRecord,
    'patient_name' | 'doctor_name' | 'department' | 'time' | 'reason' | 'status'
> {
    patient_name: string;
    doctor_name: string;
    department: string;
    time: string;
    reason: string;
    status: AppointmentStatus;
    /** Calendar day of the appointment (local, midnight). */
    scheduled_day: Date;
    /** Full datetime string to display when the day isn't today. */
    scheduled_at: string;
}

interface Props {
    [key: string]: unknown;
    appointments?: AppointmentRecord[];
}

// ============================================================================
// Illustrated avatars (same as nurses queue)
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

const VALID_STATUSES: AppointmentStatus[] = [
    'waiting',
    'in_progress',
    'completed',
    'missed',
    'cancelled',
];

const normalizeStatus = (
    status: string | null | undefined,
): AppointmentStatus => {
    if (!status) return 'waiting';
    const key = status
        .toLowerCase()
        .replace(/[\s-]+/g, '_') as AppointmentStatus;
    return VALID_STATUSES.includes(key) ? key : 'waiting';
};

/** Safari-safe parse (handles "2026-04-24 18:19:46" and ISO). */
const parseDate = (value?: string | null): Date | null => {
    if (!value) return null;
    const date = new Date(value.replace(' ', 'T'));
    return Number.isNaN(date.getTime()) ? null : date;
};

const startOfDay = (date: Date): Date => {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    return d;
};

const isHourMinute = (value?: string | null): boolean =>
    !!value && /^\d{2}:\d{2}$/.test(value);

const formatTime = (value?: string | null): string => {
    if (!value) return 'N/A';

    // Already "HH:mm"
    if (isHourMinute(value)) {
        const [h, m] = (value as string).split(':').map(Number);
        const d = new Date();
        d.setHours(h, m, 0, 0);
        return d.toLocaleTimeString('en-GB', {
            hour: '2-digit',
            minute: '2-digit',
        });
    }

    const date = parseDate(value);
    return date
        ? date.toLocaleTimeString('en-GB', {
              hour: '2-digit',
              minute: '2-digit',
          })
        : (value as string);
};

const formatDateTime = (value?: string | null): string => {
    const date = parseDate(value);
    if (!date) return value || 'N/A';

    return (
        date.toLocaleDateString('en-GB', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
        }) +
        ', ' +
        date.toLocaleTimeString('en-GB', {
            hour: '2-digit',
            minute: '2-digit',
        })
    );
};

/**
 * Works out which calendar day an appointment belongs to.
 * Priority: next_appointment_date → full datetime in `time` → today
 * (a bare "HH:mm" time with no date is treated as today).
 */
const resolveScheduledDay = (record: AppointmentRecord): Date => {
    const fromNext = parseDate(record.next_appointment_date);
    if (fromNext) return startOfDay(fromNext);

    if (record.time && !isHourMinute(record.time)) {
        const fromTime = parseDate(record.time);
        if (fromTime) return startOfDay(fromTime);
    }

    return startOfDay(new Date());
};

const normalizeRecord = (record: AppointmentRecord): Appointment => ({
    ...record,
    patient_name: record.patient_name?.trim() || 'Unknown patient',
    doctor_name: record.doctor_name?.trim() || 'Unassigned',
    department: record.department?.trim() || 'General',
    time: record.time || record.next_appointment_date || '',
    reason: record.reason?.trim() || 'N/A',
    status: normalizeStatus(record.status),
    scheduled_day: resolveScheduledDay(record),
    scheduled_at: record.next_appointment_date || record.time || '',
});

/** Which tab a (normalised) appointment belongs to. */
const getTabFor = (row: Appointment, today: Date): AppointmentTab | null => {
    const dayMs = row.scheduled_day.getTime();
    const todayMs = today.getTime();

    // Missed: explicitly missed, or past-dated and never attended
    if (
        row.status === 'missed' ||
        (dayMs < todayMs &&
            (row.status === 'waiting' || row.status === 'in_progress'))
    ) {
        return 'missed';
    }

    // Cancelled / past completed appointments don't belong to any tab
    if (dayMs === todayMs) return 'today';

    if (dayMs > todayMs && row.status !== 'cancelled') return 'upcoming';

    return null;
};

// ============================================================================
// Tabs config (rendered as PageHeader action buttons)
// ============================================================================

/** PageHeader button variant for the selected tab vs. the others. */
const TAB_ACTIVE_VARIANT = 'cyan';
const TAB_INACTIVE_VARIANT = 'outline';

const TABS: {
    key: AppointmentTab;
    label: string;
    subtitle: string;
    emptyMessage: string;
}[] = [
    {
        key: 'today',
        label: 'Today',
        subtitle: 'Manage patient appointments and consultations for today',
        emptyMessage: 'No appointments scheduled for today',
    },
    {
        key: 'upcoming',
        label: 'Upcoming',
        subtitle: 'Appointments scheduled for future dates',
        emptyMessage: 'No upcoming appointments',
    },
    {
        key: 'missed',
        label: 'Missed',
        subtitle: 'Patients who did not attend their appointment',
        emptyMessage: 'No missed appointments',
    },
];

// ============================================================================
// Badge Components
// ============================================================================

const STATUS_CONFIG: Record<
    AppointmentStatus,
    { label: string; color: string; dot: string }
> = {
    waiting: {
        label: 'Waiting',
        color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
        dot: 'bg-amber-500',
    },
    in_progress: {
        label: 'In Progress',
        color: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400',
        dot: 'bg-indigo-500',
    },
    completed: {
        label: 'Completed',
        color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
        dot: 'bg-emerald-500',
    },
    missed: {
        label: 'Missed',
        color: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400',
        dot: 'bg-rose-500',
    },
    cancelled: {
        label: 'Cancelled',
        color: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400',
        dot: 'bg-slate-500',
    },
};

const StatusBadge: React.FC<{ status: AppointmentStatus }> = ({ status }) => {
    const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.waiting;
    return (
        <span
            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${cfg.color}`}
        >
            <span className={`h-1.5 w-1.5 rounded-full ${cfg.dot}`} />
            {cfg.label}
        </span>
    );
};

const DepartmentBadge: React.FC<{ department: string }> = ({ department }) => {
    const key = department.toLowerCase();
    const colors: Record<string, string> = {
        cardiology:
            'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400',
        emergency:
            'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
        neurology:
            'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400',
        ophthalmology:
            'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
        orthopedics:
            'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400',
        pediatrics:
            'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
        surgery:
            'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400',
        pharmacy:
            'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
        laboratory:
            'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
        general:
            'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400',
    };

    const color =
        colors[key] ||
        'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400';

    return (
        <span
            className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${color}`}
        >
            {department}
        </span>
    );
};

const PatientAvatar: React.FC<{
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

const DetailField: React.FC<{
    label: string;
    children: React.ReactNode;
}> = ({ label, children }) => (
    <div>
        <Label className="text-xs text-slate-500">{label}</Label>
        <div className="mt-0.5 text-sm text-slate-800 dark:text-slate-200">
            {children}
        </div>
    </div>
);

// ============================================================================
// Main Component
// ============================================================================

export default function Appointments() {
    const { appointments = [] } = usePage<Props>().props;

    const [activeTab, setActiveTab] = useState<AppointmentTab>('today');
    const [selected, setSelected] = useState<Appointment | null>(null);
    const [showDetailsModal, setShowDetailsModal] = useState(false);
    const [loading, setLoading] = useState(false);

    const processed = useMemo<Appointment[]>(
        () => appointments.map(normalizeRecord),
        [appointments],
    );

    // Group appointments by tab once, so counts and rows stay in sync
    const grouped = useMemo<Record<AppointmentTab, Appointment[]>>(() => {
        const today = startOfDay(new Date());
        const result: Record<AppointmentTab, Appointment[]> = {
            today: [],
            upcoming: [],
            missed: [],
        };

        processed.forEach((row) => {
            const tab = getTabFor(row, today);
            if (tab) result[tab].push(row);
        });

        return result;
    }, [processed]);

    const activeTabConfig = TABS.find((t) => t.key === activeTab) ?? TABS[0];
    const tabData = grouped[activeTab];

    // Tabs as PageHeader action buttons (label carries the live count)
    const headerActions = TABS.map((tab) => ({
        label: `${tab.label} (${grouped[tab.key].length})`,
        variant:
            tab.key === activeTab ? TAB_ACTIVE_VARIANT : TAB_INACTIVE_VARIANT,
        onClick: () => setActiveTab(tab.key),
    }));

    // ------------------------------------------------------------------------
    // Handlers
    // ------------------------------------------------------------------------

    const handleViewDetails = (row: Appointment) => {
        setSelected(row);
        setShowDetailsModal(true);
    };

    const runAction = async (
        id: number,
        endpoint: string,
        successMsg: string,
    ) => {
        setLoading(true);
        Notiflix.Loading.pulse('Updating...');
        try {
            const response = await Http.post(`/appointments/${id}/${endpoint}`);
            if (response.data?.success !== false) {
                Notiflix.Notify.success(successMsg);
                router.reload({ only: ['appointments'] });
            } else {
                Notiflix.Notify.failure(
                    response.data?.message || 'Action failed',
                );
            }
        } catch (error: any) {
            Notiflix.Notify.failure(
                error.response?.data?.message || 'Action failed',
            );
        } finally {
            Notiflix.Loading.remove();
            setLoading(false);
        }
    };

    const startConsultation = (id: number) =>
        runAction(id, 'start', 'Consultation started');

    // ------------------------------------------------------------------------
    // Columns
    // ------------------------------------------------------------------------

    const columns: Column<Appointment>[] = [
        {
            id: 'patient_name',
            label: 'Patient',
            sortable: true,
            filterable: true,
            format: (_value, row) => (
                <Link
                    href={`/patients/dashboard/${row.id}`}
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
                        <div className="text-xs text-slate-400">
                            ID: {row.patient_id}
                            {row.patient_number && (
                                <span> · EMR: {row.patient_number}</span>
                            )}
                        </div>
                    </div>
                </Link>
            ),
        },
        {
            id: 'doctor_name',
            label: 'Doctor',
            sortable: true,
            format: (_value, row) => (
                <div className="flex items-center gap-2">
                    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-indigo-100 text-xs font-medium text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300">
                        {row.doctor_name.charAt(0).toUpperCase()}
                    </div>
                    <span className="text-sm text-slate-700 dark:text-slate-300">
                        {row.doctor_name}
                    </span>
                </div>
            ),
        },
        {
            id: 'department',
            label: 'Department',
            sortable: true,
            format: (_value, row) => (
                <DepartmentBadge department={row.department} />
            ),
        },
        {
            id: 'time',
            label: activeTab === 'today' ? 'Time' : 'Date & Time',
            sortable: true,
            format: (value, row) => (
                <div className="flex items-center gap-1.5">
                    <Clock size={14} className="text-slate-400" />
                    <span className="text-sm text-slate-700 dark:text-slate-300">
                        {activeTab === 'today'
                            ? formatTime(value as string)
                            : formatDateTime(row.scheduled_at)}
                    </span>
                </div>
            ),
        },
        {
            id: 'reason',
            label: 'Reason',
            sortable: true,
            format: (value) => (
                <span className="text-sm text-slate-700 dark:text-slate-300">
                    {value || '—'}
                </span>
            ),
        },
        {
            id: 'status',
            label: 'Status',
            sortable: true,
            filterable: true,
            format: (_value, row) => <StatusBadge status={row.status} />,
        },
    ];

    // ------------------------------------------------------------------------
    // Actions
    // ------------------------------------------------------------------------

    const actions: Action<Appointment>[] = [
        {
            label: 'View Dashboard',
            icon: <Eye size={16} />,
            color: 'info',
            onClick: (row) => router.visit(`/patients/dashboard/${row.id}`),
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
                { href: '', title: 'MCH' },
                { href: '/reception/appointments', title: 'Appointments' },
            ]}
        >
            <PageHeader
                icon={<CalendarIcon className="h-6 w-6" />}
                title="Appointments"
                subtitle={activeTabConfig.subtitle}
                actions={headerActions}
            />

            <div className="flex h-full min-h-screen flex-1 flex-col gap-4 bg-blue-50 p-4 dark:bg-slate-900">
                <ReusableTable
                    key={activeTab}
                    columns={columns}
                    data={tabData}
                    actions={actions}
                    loading={loading}
                    filterPlaceholder="Search by patient name, doctor, or reason..."
                    statusFilterKey="status"
                    statusOptions={statusOptions}
                    rowsPerPageOptions={[8, 15, 25, 50]}
                    defaultRowsPerPage={8}
                    defaultOrderBy="time"
                    emptyMessage={activeTabConfig.emptyMessage}
                    className="shadow-sm"
                />

                {/* Details Modal */}
                <Dialog
                    open={showDetailsModal}
                    onOpenChange={(open) => {
                        setShowDetailsModal(open);
                        if (!open) setSelected(null);
                    }}
                >
                    <DialogContent className="max-w-md">
                        <DialogHeader>
                            <DialogTitle className="text-sm">
                                Appointment Details
                            </DialogTitle>
                        </DialogHeader>

                        {selected && (
                            <div className="space-y-4">
                                <div className="flex items-center gap-3">
                                    <PatientAvatar
                                        name={selected.patient_name}
                                        patientId={selected.patient_id}
                                        gender={selected.gender}
                                        photoUrl={selected.photo_url}
                                        size="lg"
                                    />
                                    <div>
                                        <p className="text-sm font-medium">
                                            {selected.patient_name}
                                        </p>
                                        <p className="text-xs text-slate-500">
                                            Patient ID: {selected.patient_id}
                                        </p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <DetailField label="Doctor">
                                        {selected.doctor_name}
                                    </DetailField>
                                    <DetailField label="Department">
                                        <DepartmentBadge
                                            department={selected.department}
                                        />
                                    </DetailField>
                                    <DetailField label="Date & Time">
                                        {isHourMinute(selected.scheduled_at)
                                            ? formatTime(selected.scheduled_at)
                                            : formatDateTime(
                                                  selected.scheduled_at,
                                              )}
                                    </DetailField>
                                    <DetailField label="Status">
                                        <StatusBadge status={selected.status} />
                                    </DetailField>
                                    <DetailField label="Reason">
                                        {selected.reason}
                                    </DetailField>
                                    {selected.contact && (
                                        <DetailField label="Contact">
                                            {selected.contact}
                                        </DetailField>
                                    )}
                                </div>

                                <div className="flex items-center justify-between gap-2 border-t pt-3">
                                    <Link
                                        href={`/patients/dashboard/${selected.patient_id}`}
                                        className="inline-flex items-center gap-1 rounded bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-600 transition-colors hover:bg-blue-100 dark:bg-blue-950/30 dark:text-blue-400"
                                    >
                                        <Eye className="h-3.5 w-3.5" />
                                        Dashboard
                                    </Link>

                                    <div className="flex gap-2">
                                        {selected.status === 'waiting' &&
                                            activeTab === 'today' && (
                                                <Button
                                                    size="sm"
                                                    className="text-xs"
                                                    disabled={loading}
                                                    onClick={async () => {
                                                        await startConsultation(
                                                            selected.id,
                                                        );
                                                        setShowDetailsModal(
                                                            false,
                                                        );
                                                    }}
                                                >
                                                    {loading && (
                                                        <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
                                                    )}
                                                    Start consultation
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
