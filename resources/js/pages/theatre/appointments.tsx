// resources/js/pages/dentals/appointments.tsx
import { usePage } from '@inertiajs/react';
import { CalendarDays, Clock, Eye, Smile, Stethoscope, X } from 'lucide-react';
import { useMemo, useState } from 'react';
import PageHeader from '@/components/PageHeader';
import type { Action, Column } from '@/components/ReusableTable';
import ReusableTable from '@/components/ReusableTable';
import AppLayout from '@/layouts/app-layout';
import { cn } from '@/lib/utils';

// ============ TYPES ============
interface Appointment {
    appointment_uuid: string;
    patient_id: number;
    patient_name: string;
    gender_age: string;
    next_appointment_date: string;
    appointment_time: string;
    doctor: string;
    created_by: string;
    reason: string | null;
}

interface Props {
    appointments: Appointment[];
}

type Range = 'all' | 'today' | 'upcoming' | 'past';

// ============ HELPERS ============
const startOfToday = () => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d.getTime();
};

const toDay = (value: string) => {
    const d = new Date(value);
    d.setHours(0, 0, 0, 0);
    return d.getTime();
};

const getRange = (value: string): Exclude<Range, 'all'> => {
    const day = toDay(value);
    const today = startOfToday();
    if (day === today) return 'today';
    return day > today ? 'upcoming' : 'past';
};

const formatDate = (value: string) =>
    new Date(value).toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
    });

const formatTime = (value: string) => value?.slice(0, 5) || '—';

const initials = (name: string) =>
    (name || '?')
        .split(' ')
        .filter(Boolean)
        .map((n) => n[0])
        .slice(0, 2)
        .join('');

const rangeBadge: Record<
    Exclude<Range, 'all'>,
    { label: string; cls: string }
> = {
    today: { label: 'Today', cls: 'bg-blue-50 text-blue-700 border-blue-200' },
    upcoming: {
        label: 'Upcoming',
        cls: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    },
    past: {
        label: 'Past',
        cls: 'bg-slate-100 text-slate-600 border-slate-200',
    },
};

// ============ TABS (rendered as PageHeader action buttons) ============
/** PageHeader button variant for the selected tab vs. the others. */
const TAB_ACTIVE_VARIANT = 'cyan';
const TAB_INACTIVE_VARIANT = 'outline';

const TABS: { id: Range; label: string }[] = [
    { id: 'all', label: 'All' },
    { id: 'today', label: 'Today' },
    { id: 'upcoming', label: 'Upcoming' },
    { id: 'past', label: 'Past' },
];

// ============ DETAILS DRAWER ============
function AppointmentDrawer({
    appointment,
    isOpen,
    onClose,
}: {
    appointment: Appointment | null;
    isOpen: boolean;
    onClose: () => void;
}) {
    if (!appointment) return null;
    const badge = rangeBadge[getRange(appointment.next_appointment_date)];

    const rows: { label: string; value: string }[] = [
        { label: 'Date', value: formatDate(appointment.next_appointment_date) },
        { label: 'Time', value: formatTime(appointment.appointment_time) },
        { label: 'Sex/Age', value: appointment.gender_age },
        { label: 'Doctor', value: appointment.doctor },
        { label: 'Created by', value: appointment.created_by },
    ];

    return (
        <>
            <div
                className={cn(
                    'fixed inset-0 z-40 bg-slate-900/40 transition-opacity',
                    isOpen ? 'opacity-100' : 'pointer-events-none opacity-0',
                )}
                onClick={onClose}
            />
            <aside
                className={cn(
                    'fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col bg-white shadow-2xl transition-transform',
                    isOpen ? 'translate-x-0' : 'translate-x-full',
                )}
            >
                <header className="flex items-center justify-between border-b border-slate-200 p-4">
                    <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-600 text-white">
                            <CalendarDays size={18} />
                        </div>
                        <div>
                            <h2 className="text-sm font-semibold text-slate-900">
                                Appointment Details
                            </h2>
                            <p className="font-mono text-[11px] text-slate-500">
                                {appointment.appointment_uuid}
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100"
                    >
                        <X size={18} />
                    </button>
                </header>

                <div className="flex items-center gap-3 border-b border-slate-100 bg-slate-50/60 p-4">
                    <div className="flex h-9 w-9 items-center justify-center rounded-md bg-blue-600 text-xs font-semibold text-white">
                        {initials(appointment.patient_name)}
                    </div>
                    <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-slate-900">
                            {appointment.patient_name}
                        </p>
                        <p className="text-[11px] text-slate-500">
                            Patient ID {appointment.patient_id}
                        </p>
                    </div>
                    <span
                        className={cn(
                            'rounded-md border px-2 py-0.5 text-[11px] font-medium',
                            badge.cls,
                        )}
                    >
                        {badge.label}
                    </span>
                </div>

                <div className="flex-1 space-y-4 overflow-y-auto p-4">
                    <dl className="divide-y divide-slate-100 rounded-lg border border-slate-200">
                        {rows.map((r) => (
                            <div
                                key={r.label}
                                className="flex justify-between px-3 py-2.5 text-sm"
                            >
                                <dt className="text-slate-500">{r.label}</dt>
                                <dd className="font-medium text-slate-900">
                                    {r.value || '—'}
                                </dd>
                            </div>
                        ))}
                    </dl>

                    <div>
                        <h3 className="mb-2 text-[11px] font-semibold tracking-wide text-slate-500 uppercase">
                            Reason for visit
                        </h3>
                        <p className="rounded-lg border border-slate-200 bg-white p-3 text-sm text-slate-700">
                            {appointment.reason || 'No reason recorded'}
                        </p>
                    </div>
                </div>

                <footer className="border-t border-slate-200 bg-slate-50/60 p-4">
                    <button
                        onClick={onClose}
                        className="w-full rounded-md border border-slate-200 bg-white py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
                    >
                        Close
                    </button>
                </footer>
            </aside>
        </>
    );
}

// ============ MAIN COMPONENT ============
export default function Appointments() {
    const { props } = usePage<Props>();
    const appointments = props.appointments || [];

    const [range, setRange] = useState<Range>('all');
    const [selected, setSelected] = useState<Appointment | null>(null);
    const [drawerOpen, setDrawerOpen] = useState(false);

    const counts = useMemo(() => {
        const c = { all: appointments.length, today: 0, upcoming: 0, past: 0 };
        appointments.forEach((a) => {
            c[getRange(a.next_appointment_date)]++;
        });
        return c;
    }, [appointments]);

    const rows = useMemo(
        () =>
            range === 'all'
                ? appointments
                : appointments.filter(
                      (a) => getRange(a.next_appointment_date) === range,
                  ),
        [appointments, range],
    );

    // Tabs as PageHeader action buttons (label carries the live count)
    const headerActions = TABS.map((tab) => ({
        label: `${tab.label} (${counts[tab.id]})`,
        variant: tab.id === range ? TAB_ACTIVE_VARIANT : TAB_INACTIVE_VARIANT,
        onClick: () => setRange(tab.id),
    }));

    const openDetails = (row: Appointment) => {
        setSelected(row);
        setDrawerOpen(true);
    };

    const closeDetails = () => {
        setDrawerOpen(false);
        setTimeout(() => setSelected(null), 250);
    };

    const columns: Column<Appointment>[] = [
        {
            id: 'patient_name',
            label: 'Patient',
            sortable: true,
            filterable: true,
            format: (_, row) => (
                <div className="flex items-center gap-2">
                    <div className="flex h-7 w-7 items-center justify-center rounded-md bg-blue-600 text-[10px] font-semibold text-white">
                        {initials(row.patient_name)}
                    </div>
                    <p className="text-sm font-medium">{row.patient_name}</p>
                </div>
            ),
        },
        {
            id: 'gender_age',
            label: 'Sex/Age',
            sortable: true,
            format: (value) => (
                <span className="text-xs text-slate-600">{value || '—'}</span>
            ),
        },
        {
            id: 'next_appointment_date',
            label: 'Date',
            sortable: true,
            format: (value) => (
                <span className="inline-flex items-center gap-1.5 text-xs text-slate-700">
                    <CalendarDays size={12} className="text-slate-400" />
                    {formatDate(value)}
                </span>
            ),
        },
        {
            id: 'appointment_time',
            label: 'Time',
            sortable: true,
            format: (value) => (
                <span className="inline-flex items-center gap-1.5 font-mono text-xs text-slate-700">
                    <Clock size={12} className="text-slate-400" />
                    {formatTime(value)}
                </span>
            ),
        },
        {
            id: 'doctor',
            label: 'Doctor',
            sortable: true,
            filterable: true,
            format: (value) => (
                <span className="inline-flex items-center gap-1.5 text-xs text-slate-700">
                    <Stethoscope size={12} className="text-slate-400" />
                    {value || '—'}
                </span>
            ),
        },
        {
            id: 'reason',
            label: 'Reason',
            format: (value) => (
                <span className="line-clamp-1 max-w-[240px] text-xs text-slate-600">
                    {value || '—'}
                </span>
            ),
        },
        {
            id: 'next_appointment_date_status',
            label: 'When',
            format: (_, row) => {
                const badge = rangeBadge[getRange(row.next_appointment_date)];
                return (
                    <span
                        className={cn(
                            'rounded-md border px-2 py-0.5 text-[11px] font-medium',
                            badge.cls,
                        )}
                    >
                        {badge.label}
                    </span>
                );
            },
        },
    ];

    const actions: Action<Appointment>[] = [
        {
            label: 'View Appointment',
            icon: <Eye size={16} />,
            color: 'info',
            onClick: (row) => openDetails(row),
        },
    ];

    return (
        <AppLayout
            breadcrumbs={[
                { href: '/dashboard', title: 'Altaf Memorial Hospital' },
                { href: '', title: 'Theater' },
                { href: '', title: 'Appointments' },
            ]}
        >
            <PageHeader
                icon={<Smile className="h-5 w-5" />}
                title="Theater"
                subtitle="Scheduled appointments for theater clinic"
                actions={headerActions}
            />

            <div className="h-full space-y-4 bg-blue-50 p-4">
                <ReusableTable
                    key={range}
                    title="Appointments"
                    columns={columns}
                    data={rows}
                    actions={actions}
                    loading={false}
                    filterPlaceholder="Search by patient or doctor..."
                    rowsPerPageOptions={[8, 15, 25, 50]}
                    defaultRowsPerPage={8}
                    defaultOrderBy="next_appointment_date"
                    defaultOrderDirection="asc"
                    emptyMessage="No appointments found"
                    className="shadow-sm"
                />
            </div>

            <AppointmentDrawer
                appointment={selected}
                isOpen={drawerOpen}
                onClose={closeDetails}
            />
        </AppLayout>
    );
}
