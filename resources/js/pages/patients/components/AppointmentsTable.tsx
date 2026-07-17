import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';

import Notiflix from 'notiflix';
import Http from '@/utils/Http';
import routes from '@/constants/routes';
import BookAppointment from './BookAppointment';

interface AppointmentProps {
    appointments: any[];
}

const appointmentStatus = [
    {
        id: 1,
        value: 'Completed',
    },
    {
        id: 2,
        value: 'Checked In',
    },
    {
        id: 3,
        value: 'In progress',
    },
    {
        id: 4,
        value: 'No show up',
    },
];
export default function AppointmentsTable({ appointments }: AppointmentProps) {
    const [filter, setFilter] = useState('all');
    const [updateAppointmentModal, setUpdateAppointmentModal] =
        useState<boolean>(false);
    const [appointmentId, setAppointmentId] = useState<number>();
    const [loadingId, setLoadingId] = useState<number | null>(null);
    const [selectedAppointment, setSelectedAppointment] = useState<any | null>(
        null,
    );

    const [openDialog, setOpenDialog] = useState(false);

    /*
    |--------------------------------------------------------------------------
    | Filtered Appointments
    |--------------------------------------------------------------------------
    */

    const filteredAppointments = useMemo(() => {
        if (filter === 'all') return appointments;

        return appointments.filter((appt) => appt.status === filter);
    }, [appointments, filter]);

    /*
    |--------------------------------------------------------------------------
    | Mark Patient As Arrived
    |--------------------------------------------------------------------------
    */

    const handlePatientArrived = async (appointmentId: number) => {
        try {
            setLoadingId(appointmentId);

            const response = await Http.put(
                routes.api.appointment.updateStatus(appointmentId),
                {
                    status: 'arrived',
                },
            );

            if (response.status === 200) {
                Notiflix.Notify.success('Patient marked as arrived.');

                window.location.reload();
            }
        } catch (error) {
            Notiflix.Notify.failure('Failed to update appointment.');
        } finally {
            setLoadingId(null);
        }
    };

    /*
    |--------------------------------------------------------------------------
    | Open Appointment Details
    |--------------------------------------------------------------------------
    */

    const handleViewAppointment = (appointment: any) => {
        setSelectedAppointment(appointment);

        setOpenDialog(true);
    };

    /*
    |--------------------------------------------------------------------------
    | Status Badge
    |--------------------------------------------------------------------------
    */

    const getStatusClasses = (status: string) => {
        switch (status) {
            case 'completed':
                return 'bg-green-100 text-green-700';

            case 'cancelled':
                return 'bg-red-100 text-red-700';

            case 'arrived':
                return 'bg-blue-100 text-blue-700';

            default:
                return 'bg-yellow-100 text-yellow-700';
        }
    };

    return (
        <>
            <div className="w-full overflow-hidden rounded-2xl border bg-white shadow-sm">
                {/* Header */}
                <div className="flex flex-col gap-4 border-b p-6 md:flex-row md:items-center md:justify-between">
                    <div>
                        <h2 className="text-2xl font-bold text-gray-800">
                            Appointments
                        </h2>

                        <p className="mt-1 text-sm text-gray-500">
                            View and manage patient appointments
                        </p>
                    </div>

                    {/* Filter */}
                    <div className="flex items-center gap-3">
                        <label className="text-sm font-medium">Filter:</label>

                        <select
                            value={filter}
                            onChange={(e) => setFilter(e.target.value)}
                            className="h-10 rounded-lg border px-3"
                        >
                            <option value="all">All</option>

                            <option value="pending">Pending</option>

                            <option value="arrived">Arrived</option>

                            <option value="completed">Completed</option>

                            <option value="cancelled">Cancelled</option>
                        </select>
                    </div>
                </div>

                {/* Table */}
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="border-b bg-gray-50">
                            <tr>
                                <th className="p-4 text-left text-sm font-semibold text-gray-600">
                                    Token
                                </th>

                                <th className="p-4 text-left text-sm font-semibold text-gray-600">
                                    Date
                                </th>

                                <th className="p-4 text-left text-sm font-semibold text-gray-600">
                                    Time
                                </th>

                                <th className="p-4 text-left text-sm font-semibold text-gray-600">
                                    Reason
                                </th>

                                <th className="p-4 text-left text-sm font-semibold text-gray-600">
                                    Priority
                                </th>

                                <th className="p-4 text-left text-sm font-semibold text-gray-600">
                                    Status
                                </th>

                                <th className="p-4 text-right text-sm font-semibold text-gray-600">
                                    Actions
                                </th>
                            </tr>
                        </thead>

                        <tbody>
                            {filteredAppointments.length > 0 ? (
                                filteredAppointments.map((appt: any) => (
                                    <tr
                                        key={appt.id}
                                        className="border-b transition hover:bg-gray-50"
                                    >
                                        {/* Token */}
                                        <td className="p-4 text-sm font-medium text-gray-800">
                                            {appt.visit_token ||
                                                appt.appointment_uuid?.slice(
                                                    0,
                                                    8,
                                                )}
                                        </td>

                                        {/* Date */}
                                        <td className="p-4 text-sm text-gray-600">
                                            {new Date(
                                                appt.appointment_date,
                                            ).toLocaleDateString()}
                                        </td>

                                        {/* Time */}
                                        <td className="p-4 text-sm text-gray-600">
                                            {appt.appointment_time}
                                        </td>

                                        {/* Reason */}
                                        <td className="p-4 text-sm text-gray-700">
                                            {appt.reason}
                                        </td>

                                        {/* Priority */}
                                        <td className="p-4">
                                            <span className="inline-flex items-center rounded-full bg-gray-100 px-3 py-1 text-xs font-medium capitalize">
                                                {appt.priority}
                                            </span>
                                        </td>

                                        {/* Status */}
                                        <td className="p-4">
                                            <span
                                                className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold capitalize ${getStatusClasses(
                                                    appt.status,
                                                )}`}
                                            >
                                                {appt.status}
                                            </span>
                                        </td>

                                        {/* Actions */}
                                        <td className="p-4">
                                            <div className="flex justify-end gap-2">
                                                {/* <Button
                                                    size="sm"
                                                    onClick={() => {
                                                        (setUpdateAppointmentModal(
                                                            true,
                                                        ),
                                                            setAppointmentId(
                                                                appt.id,
                                                            ));
                                                    }}
                                                    disabled={
                                                        loadingId === appt.id
                                                    }
                                                >
                                                    Change Appt Status
                                                </Button> */}
                                                {appt.status === 'pending' && (
                                                    <Button
                                                        size="sm"
                                                        onClick={() => {
                                                            (setUpdateAppointmentModal(
                                                                true,
                                                            ),
                                                                setAppointmentId(
                                                                    appt.id,
                                                                ));
                                                        }}
                                                        disabled={
                                                            loadingId ===
                                                            appt.id
                                                        }
                                                    >
                                                        Change Appt Status
                                                    </Button>
                                                )}

                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={() =>
                                                        handleViewAppointment(
                                                            appt,
                                                        )
                                                    }
                                                >
                                                    View Appt
                                                </Button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td
                                        colSpan={7}
                                        className="py-10 text-center text-gray-500"
                                    >
                                        No appointments found.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Appointment Details Dialog */}
            <Dialog open={openDialog} onOpenChange={setOpenDialog}>
                <DialogContent className="max-w-2xl border-0 shadow-2xl">
                    <DialogHeader className="border-b border-gray-200 pb-4">
                        <DialogTitle className="text-xl font-light tracking-wide text-gray-900">
                            Appointment Details
                        </DialogTitle>
                    </DialogHeader>

                    {selectedAppointment && (
                        <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
                            {/* Appointment Token */}
                            <div className="group border-l-2 border-gray-900 pl-4 transition-all hover:border-gray-600">
                                <p className="text-[11px] font-medium tracking-[0.2em] text-gray-400 uppercase">
                                    Token
                                </p>
                                <p className="mt-1.5 font-mono text-sm font-semibold text-gray-900">
                                    {selectedAppointment.visit_token ||
                                        selectedAppointment.appointment_uuid?.slice(
                                            0,
                                            8,
                                        )}
                                </p>
                            </div>

                            {/* Status */}
                            <div className="group border-l-2 border-gray-900 pl-4 transition-all hover:border-gray-600">
                                <p className="text-[11px] font-medium tracking-[0.2em] text-gray-400 uppercase">
                                    Status
                                </p>
                                <span
                                    className={`mt-1.5 inline-block text-sm font-semibold capitalize ${getStatusClasses(
                                        selectedAppointment.status,
                                    )}`}
                                >
                                    {selectedAppointment.status}
                                </span>
                            </div>

                            {/* Date */}
                            <div className="group border-l-2 border-gray-900 pl-4 transition-all hover:border-gray-600">
                                <p className="text-[11px] font-medium tracking-[0.2em] text-gray-400 uppercase">
                                    Date
                                </p>
                                <p className="mt-1.5 text-sm text-gray-900">
                                    {new Date(
                                        selectedAppointment.appointment_date,
                                    ).toLocaleDateString('en-US', {
                                        weekday: 'short',
                                        year: 'numeric',
                                        month: 'short',
                                        day: 'numeric',
                                    })}
                                </p>
                            </div>

                            {/* Time */}
                            <div className="group border-l-2 border-gray-900 pl-4 transition-all hover:border-gray-600">
                                <p className="text-[11px] font-medium tracking-[0.2em] text-gray-400 uppercase">
                                    Time
                                </p>
                                <p className="mt-1.5 text-sm text-gray-900">
                                    {selectedAppointment.appointment_time}
                                </p>
                            </div>

                            {/* Doctor */}
                            <div className="group border-l-2 border-gray-900 pl-4 transition-all hover:border-gray-600">
                                <p className="text-[11px] font-medium tracking-[0.2em] text-gray-400 uppercase">
                                    Physician
                                </p>
                                <p className="mt-1.5 text-sm font-medium text-gray-900">
                                    {selectedAppointment?.doctor?.name ||
                                        'Not Assigned'}
                                </p>
                            </div>

                            {/* Department */}
                            <div className="group border-l-2 border-gray-900 pl-4 transition-all hover:border-gray-600">
                                <p className="text-[11px] font-medium tracking-[0.2em] text-gray-400 uppercase">
                                    Department
                                </p>
                                <p className="mt-1.5 text-sm text-gray-900">
                                    {selectedAppointment.department || 'N/A'}
                                </p>
                            </div>

                            {/* Priority */}
                            <div className="group border-l-2 border-gray-900 pl-4 transition-all hover:border-gray-600">
                                <p className="text-[11px] font-medium tracking-[0.2em] text-gray-400 uppercase">
                                    Priority
                                </p>
                                <p className="mt-1.5 text-sm font-medium text-gray-900 capitalize">
                                    {selectedAppointment.priority}
                                </p>
                            </div>

                            {/* Room */}
                            <div className="group border-l-2 border-gray-900 pl-4 transition-all hover:border-gray-600">
                                <p className="text-[11px] font-medium tracking-[0.2em] text-gray-400 uppercase">
                                    Room
                                </p>
                                <p className="mt-1.5 text-sm text-gray-900">
                                    {selectedAppointment.room || 'Not Assigned'}
                                </p>
                            </div>

                            {/* Reason */}
                            <div className="md:col-span-2">
                                <div className="border-t border-gray-100 pt-4">
                                    <p className="text-[11px] font-medium tracking-[0.2em] text-gray-400 uppercase">
                                        Reason
                                    </p>
                                    <p className="mt-1.5 text-sm leading-relaxed text-gray-700">
                                        {selectedAppointment.reason}
                                    </p>
                                </div>
                            </div>

                            {/* Notes */}
                            <div className="md:col-span-2">
                                <div className="border-t border-gray-100 pt-4">
                                    <p className="text-[11px] font-medium tracking-[0.2em] text-gray-400 uppercase">
                                        Notes
                                    </p>
                                    <p className="mt-1.5 text-sm leading-relaxed text-gray-500 italic">
                                        {selectedAppointment.notes ||
                                            'No notes added'}
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
            {/* Appointment Details Dialog */}
            <Dialog
                open={updateAppointmentModal}
                onOpenChange={setUpdateAppointmentModal}
            >
                <DialogContent className="max-w-2xl border-0 shadow-2xl">
                    <DialogHeader className="border-b border-gray-200 pb-4">
                        <DialogTitle className="text-xl font-light tracking-wide text-gray-900">
                            Appointment Details
                        </DialogTitle>
                    </DialogHeader>
                    <BookAppointment appointmentId={appointmentId} />
                </DialogContent>
            </Dialog>
        </>
    );
}
