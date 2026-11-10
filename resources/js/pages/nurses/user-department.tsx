import PageHeader from '@/components/PageHeader';
import ReusableTable from '@/components/ReusableTable';
import type { Column, Action } from '@/components/ReusableTable';
import AppLayout from '@/layouts/app/app-header-layout';
import { usePage, router } from '@inertiajs/react';
import {
    BedIcon,
    Eye,
    Users,
    Mail,
    Phone,
    Stethoscope,
    GraduationCap,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

// ─── Types ──────────────────────────────────────────────────────────────────
type Nurse = {
    id: number;
    user_id: number;
    department_id: number;
    first_name: string;
    surname: string;
    gender?: string | null;
    email?: string | null;
    mobile_phone_number?: string | null;
    address?: string | null;
    date_of_birth?: string | null;
    roles?: string[];
    certificates?: unknown[];
    degrees?: unknown[];
    diplomas?: unknown[] | null;
    license_number?: string | null;
    license_expiry_date?: string | null;
    created_at?: string;
    updated_at?: string;
};

interface PageProps {
    userDepartments: Nurse[];
    [key: string]: unknown;
}

// ─── Helpers ────────────────────────────────────────────────────────────────
const formatDate = (d?: string | null) => {
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

const calcAge = (dob?: string | null) => {
    if (!dob) return null;
    const birth = new Date(dob);
    const diff = Date.now() - birth.getTime();
    const age = Math.floor(diff / (1000 * 60 * 60 * 24 * 365.25));
    return age > 0 ? age : null;
};

// ─── Page ───────────────────────────────────────────────────────────────────
export default function Departments() {
    const { userDepartments } = usePage<PageProps>().props;

    const columns: Column<Nurse>[] = [
        {
            id: 'name',
            label: 'Nurse',
            sortable: true,
            filterable: true,
            format: (_v, row) => (
                <div className="flex flex-col">
                    <span className="text-sm font-medium text-gray-800">
                        {row.first_name} {row.surname}
                    </span>
                </div>
            ),
        },
        {
            id: 'gender',
            label: 'Gender',
            sortable: true,
            format: (_v, row) => (
                <span className="text-sm text-slate-700">
                    {row.gender || '—'}
                </span>
            ),
        },

        {
            id: 'mobile_phone_number',
            label: 'Phone',
            sortable: true,
            format: (_v, row) =>
                row.mobile_phone_number ? (
                    <span className="inline-flex items-center gap-1.5 text-sm text-slate-700">
                        <Phone className="h-3.5 w-3.5 text-gray-400" />
                        {row.mobile_phone_number}
                    </span>
                ) : (
                    <span className="text-sm text-gray-400">—</span>
                ),
        },
        {
            id: 'email',
            label: 'Email',
            sortable: true,
            format: (_v, row) =>
                row.email ? (
                    <span className="inline-flex items-center gap-1.5 text-sm text-slate-700">
                        <Mail className="h-3.5 w-3.5 text-gray-400" />
                        {row.email}
                    </span>
                ) : (
                    <span className="text-sm text-gray-400">—</span>
                ),
        },

        {
            id: 'created_at',
            label: 'Joined',
            sortable: true,
            format: (_v, row) => (
                <span className="text-sm text-slate-700">
                    {formatDate(row.created_at)}
                </span>
            ),
        },
    ];

    const actions: Action<Nurse>[] = [
        {
            label: 'View',
            icon: <Eye size={16} />,
            color: 'info',
            onClick: (row) => router.visit(`/nurses/${row.id}`),
        },
    ];

    return (
        <AppLayout
            breadcrumbs={[
                { title: 'Nurses', href: '/nurses' },
                { title: 'Departments', href: '/nurses/departments' },
            ]}
        >
            <div className="h-full bg-blue-50 p-2">
                <PageHeader
                    icon={<BedIcon />}
                    title="Nurses Departments"
                    subtitle="View your co-workers"
                />

                <div className="mt-6">
                    <ReusableTable
                        title="Nurses"
                        columns={columns}
                        data={userDepartments || []}
                        actions={actions}
                        filterPlaceholder="Search by name, phone or email..."
                        rowsPerPageOptions={[4,8,16]}
                        defaultRowsPerPage={4}
                        defaultOrderBy="name"
                        emptyMessage="No nurses found in this department"
                        className="shadow-sm"
                    />
                </div>
            </div>
        </AppLayout>
    );
}
