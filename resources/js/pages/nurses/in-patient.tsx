import PageHeader from '@/components/PageHeader';
import ReusableTable from '@/components/ReusableTable';
import type { Column, Action } from '@/components/ReusableTable';
import AppLayout from '@/layouts/app/app-header-layout';
import { usePage, router } from '@inertiajs/react';
import {
    BedIcon,
    Eye,
    CheckCircle2,
    Clock,
    Loader2,
    XCircle,
    Activity,
} from 'lucide-react';
import { useState } from 'react';
import type { FC } from 'react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

// ─── Types ──────────────────────────────────────────────────────────────────
type ProcedureStatus =
    | string
    | { value?: string | number; label?: string | number }
    | { id?: string | number; name?: string };

type Procedure = {
    id: number;
    token?: string;
    visit_token?: string;
    patient_id: number | { id: number; name: string };
    name: string;
    age_sex?: string;
    created_at?: string;
    status?: ProcedureStatus;
    photo_url?: string | null;
};

interface PageProps {
    procedures: Procedure[];
    [key: string]: unknown;
}

// ─── Illustrated avatars (DiceBear) ─────────────────────────────────────────
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

// ─── Helpers ────────────────────────────────────────────────────────────────
const formatDate = (d?: string) => {
    if (!d) return '—';
    try {
        return new Date(d).toLocaleDateString('en-ZM', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
        });
    } catch {
        return '—';
    }
};

/** patient_id can be a plain id or an { id, name } object. */
const resolvePatientId = (
    value: Procedure['patient_id'],
): number | undefined =>
    typeof value === 'object' && value !== null ? value.id : value;

/** "M/34" → "male", "F/8" → "female", anything else → null. */
const genderFromSexAge = (value: string | null | undefined): string | null => {
    const first = (value || '').trim().charAt(0).toUpperCase();

    if (first === 'M') return 'male';
    if (first === 'F') return 'female';

    return null;
};

/** Safely turn any status shape (string | {value,label} | {id,name}) into a string */
const mapStatus = (status: unknown): string => {
    if (status === null || status === undefined) return 'unknown';
    if (typeof status === 'object') {
        const s = status as Record<string, unknown>;
        return String(s.label ?? s.name ?? s.value ?? s.id ?? 'unknown');
    }
    return String(status);
};

/** Flat status config: solid bg, white text, icon */
const getStatusConfig = (status: unknown) => {
    const key = mapStatus(status).toLowerCase().replace(/\s+/g, '_');
    switch (key) {
        case 'active':
            return {
                label: 'Active',
                className: 'bg-emerald-500 text-white',
                icon: <Activity className="h-3 w-3" />,
            };
        case 'in_progress':
            return {
                label: 'In Progress',
                className: 'bg-blue-500 text-white',
                icon: <Loader2 className="h-3 w-3 animate-spin" />,
            };
        case 'pending':
            return {
                label: 'Pending',
                className: 'bg-amber-500 text-white',
                icon: <Clock className="h-3 w-3" />,
            };
        case 'completed':
            return {
                label: 'Completed',
                className: 'bg-teal-500 text-white',
                icon: <CheckCircle2 className="h-3 w-3" />,
            };
        case 'cancelled':
        case 'rejected':
            return {
                label: 'Cancelled',
                className: 'bg-rose-500 text-white',
                icon: <XCircle className="h-3 w-3" />,
            };
        default:
            return {
                label: mapStatus(status),
                className: 'bg-slate-400 text-white',
                icon: null,
            };
    }
};

// ─── Page ───────────────────────────────────────────────────────────────────
export default function InPatient() {
    const { procedures } = usePage<PageProps>().props;
    const columns: Column<Procedure>[] = [
        {
            id: 'token',
            label: 'Visit Token',
            sortable: true,
            format: (_v: unknown, row: Procedure) => {
                const token =
                    row.token ??
                    row.visit_token ??
                    `T-${String(row.id).padStart(4, '0')}`;
                return (
                    <span className="font-mono text-sm font-bold tracking-wider text-blue-700">
                        {token}
                    </span>
                );
            },
        },
        {
            id: 'name',
            label: 'Customer Name',
            sortable: true,
            filterable: true,
            format: (_v: unknown, row: Procedure) => (
                <div className="flex items-center gap-2.5">
                    <PatientAvatar
                        name={row?.name || ''}
                        patientId={resolvePatientId(row.patient_id) ?? row.id}
                        gender={genderFromSexAge(row.age_sex)}
                        photoUrl={row.photo_url}
                    />
                    <span className="text-sm font-medium text-gray-800 dark:text-slate-200">
                        {row?.name || '—'}
                    </span>
                </div>
            ),
        },
        { id: 'age_sex', label: 'Age/Sex', sortable: true },
        {
            id: 'created_at',
            label: 'Created At',
            sortable: true,
            format: (value: string) => (
                <span className="text-sm text-slate-700">
                    {formatDate(value)}
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
                active: 'success',
                pending: 'warning',
                in_progress: 'info',
                completed: 'success',
                cancelled: 'error',
            },
            format: (_v: unknown, row: Procedure) => {
                const config = getStatusConfig(row.status);
                return (
                    <Badge
                        className={cn(
                            'inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-semibold capitalize',
                            config.className,
                        )}
                    >
                        {config.icon}
                        {config.label}
                    </Badge>
                );
            },
        },
    ];

    const actions: Action<Procedure>[] = [
        {
            label: 'View',
            icon: <Eye size={16} />,
            color: 'info',
            onClick: (row) =>
                router.visit(
                    `../../patients/dashboard/${resolvePatientId(row.patient_id)}`,
                ),
        },
    ];

    const statusOptions = [
        { value: 'active', label: 'Active' },
        { value: 'pending', label: 'Pending' },
        { value: 'in_progress', label: 'In Progress' },
        { value: 'completed', label: 'Completed' },
        { value: 'cancelled', label: 'Cancelled' },
    ];

    return (
        <AppLayout
            breadcrumbs={[
                { title: 'Altaf Memorial Hospital', href: '/nurses' },
                { title: 'Nurses', href: '/nurses' },
                { title: 'Treatment Room', href: '/nurses/treatment-room' },
            ]}
        >
            <div className="h-full bg-blue-50">
                <PageHeader
                    icon={<BedIcon />}
                    title="Treatment Room"
                    subtitle="View procedures such as injection giving etc"
                />

                <div className="mt-6 p-4">
                    <ReusableTable
                        columns={columns}
                        data={procedures || []}
                        actions={actions}
                        filterPlaceholder="Search by patient or name..."
                        statusFilterKey="status"
                        statusOptions={statusOptions}
                        rowsPerPageOptions={[4, 8, 12, 16, 20]}
                        defaultRowsPerPage={4}
                        defaultOrderBy="created_at"
                        emptyMessage="No procedures found"
                        className="shadow-sm"
                    />
                </div>
            </div>
        </AppLayout>
    );
}
