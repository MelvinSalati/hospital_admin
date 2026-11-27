import { Link, usePage, router } from '@inertiajs/react';
import {
    Users,
    Eye,
    Clock,
    Phone,
    Search,
    CheckCircle,
    Activity,
    UserCheck,
    Loader2,
    ChevronLeft,
    ChevronRight,
    User,
    CreditCard,
    Stethoscope,
} from 'lucide-react';
import Notiflix from 'notiflix';
import { useState, useMemo } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import AppLayout from '@/layouts/app-layout';
import Http from '@/utils/Http';
import PageHeader from '@/components/PageHeader';
import ReusableTable from '@/components/ReusableTable';
import type { Column, Action } from '@/components/ReusableTable';

// ============================================================================
// Types
// ============================================================================

type QueueTab = 'in_progress' | 'completed';

/** One row exactly as the backend sends it. */
interface QueuePatient {
    id: number;
    token: string;
    patient_id: number;
    patient_name: string;
    patient_number?: string | null;
    contact: string | null;
    gender: string | null;
    payment_method: string | null;
    original_payment_method: string | null;
    status: number | string | null;
    registered_at: string | null;
    assigned_department: string;
    assigned_staff: string;
    visit_status: string | null;
    visit_token_id?: number;
    priority: string | null;
    department_id: number;
    /** Optional real photo from backend */
    photo_url?: string | null;
}

interface Stats {
    total_in_queue: number;
    pending_assignment: number;
    assigned_today: number;
}

interface Props {
    [key: string]: unknown;
    queue?: QueuePatient[];
    stats?: Stats;
}

// ============================================================================
// Tabs config (rendered as PageHeader action buttons)
// ============================================================================

/** PageHeader button variant for the selected tab vs. the others. */
const TAB_ACTIVE_VARIANT = 'cyan';
const TAB_INACTIVE_VARIANT = 'outline';

const TABS: {
    key: QueueTab;
    label: string;
    subtitle: string;
    tableTitle: string;
    emptyMessage: string;
}[] = [
    {
        key: 'in_progress',
        label: 'In Progress',
        subtitle: 'Patients queued or currently being attended to',
        tableTitle: 'In Progress Patients',
        emptyMessage: 'No patients in progress',
    },
    {
        key: 'completed',
        label: 'Completed',
        subtitle: 'Patients whose visit has been completed',
        tableTitle: 'Completed Patients',
        emptyMessage: 'No completed patients',
    },
];

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
// Badge Components
// ============================================================================

const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
    const config: Record<string, { label: string; color: string }> = {
        queued: {
            label: 'Queued',
            color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
        },
        pending: {
            label: 'Pending',
            color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
        },
        active: {
            label: 'Active',
            color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
        },
        in_progress: {
            label: 'In Prog',
            color: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400',
        },
        completed: {
            label: 'Done',
            color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
        },
        cancelled: {
            label: 'Cancelled',
            color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
        },
    };
    const cfg = config[status] || config.pending;

    return (
        <span
            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${cfg.color}`}
        >
            <span
                className={`h-1.5 w-1.5 rounded-full ${cfg.color.split(' ')[0].replace('bg-', 'bg-')}`}
            />
            {cfg.label}
        </span>
    );
};

const PriorityBadge: React.FC<{ priority: string }> = ({ priority }) => {
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
    const cfg = config[priority] || config.routine;

    return (
        <span
            className={`inline-flex items-center rounded px-2 py-0.5 text-[10px] font-medium ${cfg.color}`}
        >
            {cfg.label}
        </span>
    );
};

const PaymentBadge: React.FC<{ method: string }> = ({ method }) => {
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

const StatCard: React.FC<{ icon: any; label: string; value: number }> = ({
    icon: Icon,
    label,
    value,
}) => {
    const colors: Record<string, string> = {
        Queue: 'bg-blue-50 text-blue-600 dark:bg-blue-950/30 dark:text-blue-400',
        Pending:
            'bg-amber-50 text-amber-600 dark:bg-amber-950/30 dark:text-amber-400',
        Assigned:
            'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/30 dark:text-emerald-400',
    };

    return (
        <div
            className={`rounded-lg px-4 py-2 text-center ${colors[label as keyof typeof colors] || colors.Queue}`}
        >
            <div className="flex items-center justify-center gap-1 text-xs font-medium uppercase">
                <Icon className="h-3.5 w-3.5" />
                {label}
            </div>
            <p className="text-xl font-bold">{value}</p>
        </div>
    );
};

// ============================================================================
// Stethoscope Icon
// ============================================================================

const StethoscopeIcon: React.FC<{ className?: string }> = ({
    className = 'h-5 w-5',
}) => (
    <svg
        className={className}
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
    >
        <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
        />
    </svg>
);

// ============================================================================
// Helpers
// ============================================================================

/** Numeric status codes the backend may send in `status`. */
const STATUS_CODE_MAP: Record<number, string> = {
    0: 'cancelled',
    1: 'active',
    2: 'pending',
    3: 'in_progress',
    4: 'completed',
};

/**
 * Backend sends `visit_status` as a string (e.g. "queued") and `status` as a
 * number (e.g. 1). Prefer the string, fall back to the numeric code.
 */
const normalizeStatus = (
    visitStatus: string | null | undefined,
    status: number | string | null | undefined,
): string => {
    const raw = visitStatus || status;
    if (raw === null || raw === undefined || raw === '') return 'pending';

    if (typeof raw === 'number') return STATUS_CODE_MAP[raw] || 'pending';

    return raw.toLowerCase().replace(/[\s-]+/g, '_');
};

/** Which tab a status belongs to. Cancelled visits belong to no tab. */
const getTabFor = (status: string): QueueTab | null => {
    if (status === 'completed') return 'completed';
    if (status === 'cancelled') return null;
    // queued, pending, active, in_progress
    return 'in_progress';
};

/** Safari-safe parse (handles "2026-11-23 18:12:13" and ISO). */
const formatTime = (dateString?: string | null) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString.replace(' ', 'T'));
    if (Number.isNaN(date.getTime())) return dateString;
    return date.toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
    });
};

// ============================================================================
// Main Component
// ============================================================================

export default function Nurses() {
    const { queue = [] } = usePage<Props>().props;

    const [activeTab, setActiveTab] = useState<QueueTab>('in_progress');
    const [selectedPatient, setSelectedPatient] = useState<QueuePatient | null>(
        null,
    );
    const [showDetailsModal, setShowDetailsModal] = useState(false);
    const [loading, setLoading] = useState(false);

    // Process queue data
    const processedQueue = useMemo(() => {
        return queue.map((patient) => ({
            ...patient,
            token: patient.token || `T-${String(patient.id).padStart(4, '0')}`,
            payment_method:
                patient.payment_method ||
                patient.original_payment_method ||
                'Not specified',
            contact: patient.contact || 'N/A',
            gender: patient.gender || 'N/A',
            visit_status: normalizeStatus(patient.visit_status, patient.status),
            priority: patient.priority || 'routine',
        }));
    }, [queue]);

    // Split the queue by tab once, so counts and rows stay in sync
    const grouped = useMemo<Record<QueueTab, typeof processedQueue>>(() => {
        const result: Record<QueueTab, typeof processedQueue> = {
            in_progress: [],
            completed: [],
        };

        processedQueue.forEach((row) => {
            const tab = getTabFor(row.visit_status);
            if (tab) result[tab].push(row);
        });

        return result;
    }, [processedQueue]);

    const activeTabConfig = TABS.find((t) => t.key === activeTab) ?? TABS[0];
    const tabData = grouped[activeTab];

    // Tabs as PageHeader action buttons (label carries the live count)
    const headerActions = TABS.map((tab) => ({
        label: `${tab.label} (${grouped[tab.key].length})`,
        variant:
            tab.key === activeTab ? TAB_ACTIVE_VARIANT : TAB_INACTIVE_VARIANT,
        onClick: () => setActiveTab(tab.key),
    }));

    const handleViewDetails = (patient: QueuePatient) => {
        setSelectedPatient(patient);
        setShowDetailsModal(true);
    };

    const handleStatusUpdate = async (patientId: number, newStatus: string) => {
        setLoading(true);
        Notiflix.Loading.pulse('Updating...');

        try {
            const response = await Http.post(
                `/nurses/queue/${patientId}/status`,
                { status: newStatus },
            );
            if (response.data.success) {
                Notiflix.Loading.remove();
                Notiflix.Notify.success(`Status updated to ${newStatus}`);
                router.reload();
            } else {
                Notiflix.Loading.remove();
                Notiflix.Notify.failure(
                    response.data.message || 'Failed to update status',
                );
            }
        } catch (error: any) {
            Notiflix.Loading.remove();
            Notiflix.Notify.failure(
                error.response?.data?.message || 'Failed to update status',
            );
        } finally {
            setLoading(false);
        }
    };

    // ============================================
    // COLUMNS DEFINITION
    // ============================================

    const columns: Column<QueuePatient>[] = [
        {
            id: 'token',
            label: 'Token',
            sortable: true,
            format: (value) => (
                <span className="font-mono text-sm font-medium text-blue-600 dark:text-blue-400">
                    {value || 'N/A'}
                </span>
            ),
        },
        {
            id: 'patient_name',
            label: 'Patient',
            sortable: true,
            filterable: true,
            format: (value, row) => (
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
                            <span>EMR #: {row.patient_number || 'N/A'}</span>
                            {row.contact && row.contact !== 'N/A' && (
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
            format: (value, row) => (
                <PriorityBadge priority={row.priority || 'routine'} />
            ),
        },
        {
            id: 'visit_status',
            label: 'Status',
            sortable: true,
            filterable: true,
            format: (value, row) => (
                <StatusBadge status={row.visit_status || 'pending'} />
            ),
        },
        {
            id: 'registered_at',
            label: 'Arrived',
            sortable: true,
            format: (value) => (
                <div className="flex items-center gap-1.5">
                    <Clock size={14} className="text-slate-400" />
                    <span className="text-sm text-slate-700 dark:text-slate-300">
                        {formatTime(value as string)}
                    </span>
                </div>
            ),
        },
        {
            id: 'payment_method',
            label: 'Payment',
            sortable: true,
            format: (value, row) => (
                <PaymentBadge method={row.payment_method || ''} />
            ),
        },
    ];

    // ============================================
    // ACTIONS DEFINITION
    // ============================================

    const actions: Action<QueuePatient>[] = [
        {
            label: 'View Dashboard',
            icon: <Eye size={16} />,
            color: 'info',
            onClick: (row) => {
                router.visit(`/patients/dashboard/${row.patient_id}`);
            },
        },
        {
            label: 'Details',
            icon: <User size={16} />,
            color: 'info',
            onClick: (row) => handleViewDetails(row),
        },
        {
            label: 'Mark Active',
            icon: <Activity size={16} />,
            color: 'success',
            show: (row) =>
                row.visit_status === 'pending' || row.visit_status === 'queued',
            onClick: (row) => handleStatusUpdate(row.id, 'active'),
        },
    ];

    // ============================================
    // RENDER
    // ============================================

    return (
        <AppLayout
            breadcrumbs={[
                { href: '', title: 'Altaf Memorial Hospital' },
                { href: '', title: 'MCH' },
                { href: '', title: 'Encounters' },
            ]}
        >
            {/* Header */}
            <PageHeader
                icon={<Stethoscope />}
                title="MCH Encounters Queue"
                subtitle={activeTabConfig.subtitle}
                actions={headerActions}
            />

            <div className="flex h-full min-h-screen flex-1 flex-col gap-4 bg-blue-50 p-2 dark:bg-slate-900">
                {/* Reusable Table */}
                <ReusableTable
                    key={activeTab}
                    title={activeTabConfig.tableTitle}
                    columns={columns}
                    data={tabData}
                    actions={actions}
                    loading={loading}
                    filterPlaceholder="Search by patient name, token, or contact..."
                    rowsPerPageOptions={[5, 10, 25, 50]}
                    defaultRowsPerPage={10}
                    defaultOrderBy="registered_at"
                    emptyMessage={activeTabConfig.emptyMessage}
                    className="shadow-sm"
                />

                {/* Details Modal */}
                <Dialog
                    open={showDetailsModal}
                    onOpenChange={(open) => {
                        setShowDetailsModal(open);
                        if (!open) setSelectedPatient(null);
                    }}
                >
                    <DialogContent className="max-w-sm">
                        <DialogHeader>
                            <DialogTitle className="text-sm">
                                Patient Details
                            </DialogTitle>
                        </DialogHeader>
                        {selectedPatient && (
                            <div className="space-y-3">
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
                                <div className="grid grid-cols-2 gap-2 text-sm">
                                    <div>
                                        <Label className="text-xs text-slate-500">
                                            Contact
                                        </Label>
                                        <p>{selectedPatient.contact}</p>
                                    </div>
                                    <div>
                                        <Label className="text-xs text-slate-500">
                                            Gender
                                        </Label>
                                        <p className="capitalize">
                                            {selectedPatient.gender}
                                        </p>
                                    </div>
                                    <div>
                                        <Label className="text-xs text-slate-500">
                                            Priority
                                        </Label>
                                        <p>
                                            <PriorityBadge
                                                priority={
                                                    selectedPatient.priority ||
                                                    'routine'
                                                }
                                            />
                                        </p>
                                    </div>
                                    <div>
                                        <Label className="text-xs text-slate-500">
                                            Status
                                        </Label>
                                        <p>
                                            <StatusBadge
                                                status={
                                                    selectedPatient.visit_status ||
                                                    'pending'
                                                }
                                            />
                                        </p>
                                    </div>
                                    <div>
                                        <Label className="text-xs text-slate-500">
                                            Payment
                                        </Label>
                                        <p>
                                            <PaymentBadge
                                                method={
                                                    selectedPatient.payment_method ||
                                                    ''
                                                }
                                            />
                                        </p>
                                    </div>
                                    <div>
                                        <Label className="text-xs text-slate-500">
                                            Registered
                                        </Label>
                                        <p className="text-xs">
                                            {formatTime(
                                                selectedPatient.registered_at,
                                            )}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center justify-between gap-2 border-t pt-2">
                                    <Link
                                        href={`/patients/dashboard/${selectedPatient.patient_id}`}
                                        className="inline-flex items-center gap-1 rounded bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-600 transition-colors hover:bg-blue-100 dark:bg-blue-950/30 dark:text-blue-400"
                                    >
                                        <Eye className="h-3.5 w-3.5" />
                                        Dashboard
                                    </Link>
                                    <Button
                                        size="sm"
                                        className="text-xs"
                                        onClick={() => {
                                            setShowDetailsModal(false);
                                        }}
                                    >
                                        Close
                                    </Button>
                                </div>
                            </div>
                        )}
                    </DialogContent>
                </Dialog>
            </div>
        </AppLayout>
    );
}
