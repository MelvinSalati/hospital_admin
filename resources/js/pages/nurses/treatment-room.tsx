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
};

interface PageProps {
    procedures: Procedure[];
    [key: string]: unknown;
}

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
                <span className="text-sm font-medium text-gray-800">
                    {row?.name || '—'}
                </span>
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
                router.visit(`../patients/procedures/${row.patient_id}`),
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
                { title: 'Nurses', href: '/nurses' },
                { title: 'Treatment Room', href: '/nurses/treatment-room' },
            ]}
        >
            <div className="h-full bg-blue-50 p-2">
                <PageHeader
                    icon={<BedIcon />}
                    title="Treatment Room"
                    subtitle="View procedures such as injection giving etc"
                />

                <div className="mt-6">
                    <ReusableTable
                        title="Seen Treatment Room"
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
