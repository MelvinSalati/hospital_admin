// pages/patients/appointments.tsx

import { usePage, router } from '@inertiajs/react';
import {
    CalendarIcon,
    X,
    Eye,
    Clock,
    CheckCircle2,
    XCircle,
    AlertCircle,
    User,
    Stethoscope,
    FileText,
    Building2,
    Trash2,
    Edit2,
} from 'lucide-react';
import { useState } from 'react';
import Notiflix from 'notiflix';
import PageHeader from '@/components/PageHeader';
import type { Column, Action } from '@/components/ReusableTable';
import ReusableTable from '@/components/ReusableTable';
import { Button } from '@/components/ui/button';
import PatientLayout from '@/layouts/patients/PatientLayout';
import Http from '@/utils/Http';
import BookAppointment from './components/BookAppointment';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Appointment {
    id: number;
    appointment_number?: string;
    patient_id?: number;
    patient_name?: string;
    patient_number?: string;
    doctor_name?: string;
    department?: string;
    service_name?: string;
    appointment_date?: string;
    appointment_time?: string;
    scheduled_at?: string;
    duration_minutes?: number;
    reason?: string;
    notes?: string;
    status?:
        | 'scheduled'
        | 'confirmed'
        | 'pending'
        | 'completed'
        | 'cancelled'
        | 'no_show';
    type?: string;
    payment_scheme?: string;
    created_at?: string;
    [key: string]: any;
}

interface PageProps {
    appointments?: Appointment[];
    patientId?: string | number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const formatDate = (date?: string): string => {
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

const getStatusBadge = (status: string) => {
    const configs: Record<
        string,
        { label: string; gradient: string; icon: JSX.Element }
    > = {
        scheduled: {
            label: 'Scheduled',
            gradient: 'from-blue-400 to-blue-500',
            icon: <Clock size={14} />,
        },
        confirmed: {
            label: 'Confirmed',
            gradient: 'from-emerald-400 to-emerald-500',
            icon: <CheckCircle2 size={14} />,
        },
        pending: {
            label: 'Pending',
            gradient: 'from-amber-400 to-amber-500',
            icon: <AlertCircle size={14} />,
        },
        completed: {
            label: 'Completed',
            gradient: 'from-emerald-400 to-emerald-500',
            icon: <CheckCircle2 size={14} />,
        },
        cancelled: {
            label: 'Cancelled',
            gradient: 'from-red-400 to-red-500',
            icon: <XCircle size={14} />,
        },
        no_show: {
            label: 'No Show',
            gradient: 'from-gray-400 to-gray-500',
            icon: <X size={14} />,
        },
    };
    return (
        configs[status?.toLowerCase()] || {
            label: status || 'Unknown',
            gradient: 'from-gray-400 to-gray-500',
            icon: <Clock size={14} />,
        }
    );
};

// ─── Main Component ──────────────────────────────────────────────────────────

export default function PatientsAppointments() {
    const { appointments = [], patientId } = usePage().props as PageProps;
    const [isBookingOpen, setIsBookingOpen] = useState(false);
    const [selectedAppointment, setSelectedAppointment] =
        useState<Appointment | null>(null);
    const [viewModalOpen, setViewModalOpen] = useState(false);
    console.log(appointments);
    const hasData = Boolean(appointments?.length);

    const getSubtitle = () => {
        if (!hasData) {
            return 'No appointments yet — start by booking one.';
        }
        return appointments.length
            ? `You have ${appointments.length} scheduled appointment${appointments.length > 1 ? 's' : ''}.`
            : 'No appointments scheduled. Book your first appointment now.';
    };

    const handleBookAppointment = () => {
        setIsBookingOpen(true);
    };

    const handleCloseModal = () => {
        setIsBookingOpen(false);
    };

    const handleViewAppointment = (row: Appointment) => {
        setSelectedAppointment(row);
        setViewModalOpen(true);
    };

    const closeViewModal = () => {
        setViewModalOpen(false);
        setSelectedAppointment(null);
    };

    const handleCancelAppointment = (row: Appointment) => {
        Notiflix.Confirm.show(
            'Cancel Appointment',
            `Are you sure you want to cancel appointment ${row.appointment_number || `#${row.id}`}?`,
            'Yes, Cancel',
            'Keep',
            async () => {
                try {
                    await Http.put(`/api/appointments/${row.id}/cancel`);
                    Notiflix.Notify.success('Appointment cancelled');
                    router.reload({ only: ['appointments'] });
                } catch {
                    Notiflix.Notify.failure('Failed to cancel appointment');
                }
            },
        );
    };

    // ─── Table Columns ───────────────────────────────────────────────────────

    const columns: Column<Appointment>[] = [
        {
            id: 'appointment_number',
            label: 'Appointment #',
            sortable: true,
            format: (value, row) => (
                <div className="flex items-center gap-2">
                    <div className="rounded-lg bg-blue-100 p-1.5 text-blue-600">
                        <CalendarIcon size={14} />
                    </div>
                    <span className="font-mono text-sm font-semibold text-blue-600">
                        {value || `APT-${row.id}`}
                    </span>
                </div>
            ),
        },

        {
            id: 'doctor_name',
            label: 'Doctor',
            sortable: true,
            format: (value, row) => (
                <div className="flex items-center gap-2">
                    <Stethoscope size={14} className="text-gray-400" />
                    <div>
                        <span className="text-sm text-gray-700">
                            {value || 'Not assigned'}
                        </span>
                        {row.department && (
                            <div className="flex items-center gap-1 text-xs text-gray-400">
                                <Building2 size={10} />
                                {row.department}
                            </div>
                        )}
                    </div>
                </div>
            ),
        },
        {
            id: 'scheduled_at',
            label: 'Date & Time',
            sortable: true,
            format: (value, row) => {
                const dateVal = value || row.appointment_date || row.created_at;
                return (
                    <div className="flex items-center gap-2">
                        <Clock size={14} className="text-gray-400" />
                        <div>
                            <div className="text-sm text-gray-700">
                                {formatDate(dateVal)}
                            </div>
                            {(row.appointment_time || value) && (
                                <div className="text-xs text-gray-400">
                                    {row.appointment_time ||
                                        formatTime(dateVal)}
                                </div>
                            )}
                        </div>
                    </div>
                );
            },
        },
        {
            id: 'reason',
            label: 'notes',
            sortable: true,
            format: (value, row) => (
                <div className="flex items-center gap-2">
                    <FileText size={14} className="text-gray-400" />
                    <span className="text-sm text-gray-700">
                        {value || row.type || 'General'}
                    </span>
                </div>
            ),
        },
        {
            id: 'status',
            label: 'Status',
            sortable: true,
            filterable: true,
            filterType: 'status',
            statusColors: {
                scheduled: 'info',
                confirmed: 'success',
                pending: 'warning',
                completed: 'success',
                cancelled: 'error',
                no_show: 'info',
            },
            format: (value) => {
                const config = getStatusBadge(value);
                return (
                    <span
                        className={`inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r ${config.gradient} px-3 py-1 text-xs font-medium text-white shadow-sm`}
                    >
                        {config.icon}
                        {config.label}
                    </span>
                );
            },
        },
    ];

    // ─── Table Actions ───────────────────────────────────────────────────────

    const actions: Action<Appointment>[] = [
        // {
        //     label: 'View',
        //     icon: <Eye size={16} />,
        //     color: 'info',
        //     onClick: (row) => handleViewAppointment(row),
        // },
        // {
        //     label: 'Cancel',
        //     icon: <XCircle size={16} />,
        //     color: 'error',
        //     show: (row) =>
        //         row.status !== 'cancelled' && row.status !== 'completed',
        //     onClick: (row) => handleCancelAppointment(row),
        // },
    ];

    // ─── Render ──────────────────────────────────────────────────────────────

    return (
        <PatientLayout
            breadcrumbs={[
                { title: 'Appointments', href: '/appointments' },
                { title: 'Manage', href: '#' },
            ]}
        >
            <div className="min-h-screen space-y-6 bg-blue-50 p-2">
                <PageHeader
                    icon={<CalendarIcon className="h-6 w-6" />}
                    title="Manage Appointments"
                    subtitle={getSubtitle()}
                    actions={[
                        {
                            label: 'Book Appointment',
                            onClick: handleBookAppointment,
                        },
                    ]}
                />

                <ReusableTable
                    title="Appointments"
                    columns={columns}
                    data={appointments}
                    actions={actions}
                    loading={false}
                    filterPlaceholder="Search by patient, doctor, or appointment #..."
                    statusFilterKey="status"
                    statusOptions={[
                        { value: 'scheduled', label: 'Scheduled' },
                        { value: 'confirmed', label: 'Confirmed' },
                        { value: 'pending', label: 'Pending' },
                        { value: 'completed', label: 'Completed' },
                        { value: 'cancelled', label: 'Cancelled' },
                        { value: 'no_show', label: 'No Show' },
                    ]}
                    rowsPerPageOptions={[8, 15, 25, 50]}
                    defaultRowsPerPage={8}
                    defaultOrderBy="scheduled_at"
                    emptyMessage="No appointments found — book one to get started"
                />

                {/* Booking Modal */}
                {isBookingOpen && (
                    <div
                        className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
                        onClick={handleCloseModal}
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="booking-modal-title"
                    >
                        <div
                            className="relative max-h-[90vh] w-full max-w-2xl overflow-hidden rounded-xl border border-gray-200 bg-white shadow-2xl"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="flex items-start justify-between border-b border-gray-100 px-6 py-4">
                                <div className="flex items-start gap-3">
                                    <div className="mt-0.5 rounded-lg bg-blue-50 p-2">
                                        <CalendarIcon className="h-5 w-5 text-blue-600" />
                                    </div>
                                    <div>
                                        <h2
                                            id="booking-modal-title"
                                            className="text-lg font-semibold text-gray-900"
                                        >
                                            Book Appointment
                                        </h2>
                                        <p className="text-sm text-gray-500">
                                            Schedule a new appointment
                                        </p>
                                    </div>
                                </div>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={handleCloseModal}
                                    className="h-8 w-8 rounded-lg hover:bg-gray-100"
                                    aria-label="Close modal"
                                >
                                    <X className="h-4 w-4" />
                                </Button>
                            </div>

                            <div className="">
                                <BookAppointment />
                            </div>
                        </div>
                    </div>
                )}

                {/* View Appointment Modal */}
                {viewModalOpen && selectedAppointment && (
                    <AppointmentDetailModal
                        appointment={selectedAppointment}
                        onClose={closeViewModal}
                    />
                )}
            </div>
        </PatientLayout>
    );
}

// ─── Appointment Detail Modal ────────────────────────────────────────────────

function AppointmentDetailModal({
    appointment,
    onClose,
}: {
    appointment: Appointment;
    onClose: () => void;
}) {
    const statusConfig = getStatusBadge(appointment.status || 'scheduled');

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
            onClick={onClose}
            role="dialog"
            aria-modal="true"
        >
            <div
                className="relative max-h-[90vh] w-full max-w-2xl overflow-hidden rounded-xl border border-gray-200 bg-white shadow-2xl"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-start justify-between border-b border-gray-100 px-6 py-4">
                    <div className="flex items-start gap-3">
                        <div className="mt-0.5 rounded-lg bg-blue-600 p-2">
                            <CalendarIcon className="h-5 w-5 text-white" />
                        </div>
                        <div>
                            <h2 className="text-lg font-semibold text-gray-900">
                                Appointment Details
                            </h2>
                            <p className="font-mono text-sm text-gray-500">
                                {appointment.appointment_number ||
                                    `APT-${appointment.id}`}
                            </p>
                        </div>
                    </div>
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={onClose}
                        className="h-8 w-8 rounded-lg hover:bg-gray-100"
                    >
                        <X className="h-4 w-4" />
                    </Button>
                </div>

                {/* Body */}
                <div className="max-h-[calc(90vh-8rem)] overflow-y-auto p-6">
                    <div className="mb-4">
                        <span
                            className={`inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r ${statusConfig.gradient} px-3 py-1 text-xs font-medium text-white shadow-sm`}
                        >
                            {statusConfig.icon}
                            {statusConfig.label}
                        </span>
                    </div>

                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        <DetailRow
                            label="Patient"
                            value={
                                appointment.patient_name ||
                                `Patient #${appointment.patient_id ?? 'N/A'}`
                            }
                        />
                        <DetailRow
                            label="Patient Number"
                            value={appointment.patient_number}
                        />
                        <DetailRow
                            label="Doctor"
                            value={appointment.doctor_name}
                        />
                        <DetailRow
                            label="Department"
                            value={appointment.department}
                        />
                        <DetailRow
                            label="Service"
                            value={appointment.service_name || appointment.type}
                        />
                        <DetailRow
                            label="Date"
                            value={formatDate(
                                appointment.scheduled_at ||
                                    appointment.appointment_date,
                            )}
                        />
                        <DetailRow
                            label="Time"
                            value={
                                appointment.appointment_time ||
                                formatTime(
                                    appointment.scheduled_at ||
                                        appointment.appointment_date,
                                )
                            }
                        />
                        <DetailRow
                            label="Duration"
                            value={
                                appointment.duration_minutes
                                    ? `${appointment.duration_minutes} min`
                                    : undefined
                            }
                        />
                        <DetailRow
                            label="Payment Scheme"
                            value={appointment.payment_scheme}
                        />
                        <DetailRow
                            label="Created"
                            value={formatDate(appointment.created_at)}
                        />
                    </div>

                    {appointment.reason && (
                        <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-4">
                            <h4 className="mb-1 text-xs font-semibold text-amber-700 uppercase">
                                Reason
                            </h4>
                            <p className="text-sm text-amber-800">
                                {appointment.reason}
                            </p>
                        </div>
                    )}

                    {appointment.notes && (
                        <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
                            <h4 className="mb-1 text-xs font-semibold text-slate-500 uppercase">
                                Notes
                            </h4>
                            <p className="text-sm text-slate-600">
                                {appointment.notes}
                            </p>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="flex justify-end border-t border-gray-100 bg-gray-50 px-6 py-4">
                    <Button
                        onClick={onClose}
                        variant="outline"
                        className="h-9 text-sm"
                    >
                        Close
                    </Button>
                </div>
            </div>
        </div>
    );
}

function DetailRow({
    label,
    value,
}: {
    label: string;
    value?: string | number | null;
}) {
    if (!value) return null;
    return (
        <div>
            <p className="text-xs text-gray-400">{label}</p>
            <p className="text-sm font-medium text-gray-800">{value}</p>
        </div>
    );
}
