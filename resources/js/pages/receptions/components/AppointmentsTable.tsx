import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import Http from '@/utils/Http';
import { useEffect, useMemo, useState } from 'react';

export default function AppointmentsTable({ appointments }) {
    const [appointmentDay, setAppointmentDay] = useState('Todays Appointments');

    const [appointmentsData, setAppointmentsData] =
        useState<any[]>(appointments);

    const [appointmentDate, setAppointmentDate] = useState('');

    /*
    |--------------------------------------------------------------------------
    | Pagination
    |--------------------------------------------------------------------------
    */

    const [currentPage, setCurrentPage] = useState(1);

    const itemsPerPage = 10;

    useEffect(() => {
        async function fetchAppointments() {
            try {
                if (!appointmentDate) {
                    setAppointmentsData(appointments);
                    setAppointmentDay('Todays Appointments');
                    return;
                }

                const response = await Http.get(
                    `appointments/${appointmentDate}`,
                );

                setAppointmentsData(response.data);

                setAppointmentDay(
                    `Appointments for ${new Date(
                        appointmentDate,
                    ).toLocaleDateString()}`,
                );

                setCurrentPage(1);
            } catch (error) {
                console.error(error);
            }
        }

        fetchAppointments();
    }, [appointmentDate, appointments]);

    /*
    |--------------------------------------------------------------------------
    | Paginated Data
    |--------------------------------------------------------------------------
    */

    const totalPages = Math.ceil(appointmentsData.length / itemsPerPage);

    const paginatedAppointments = useMemo(() => {
        const start = (currentPage - 1) * itemsPerPage;

        return appointmentsData.slice(start, start + itemsPerPage);
    }, [appointmentsData, currentPage]);

    const statusClass = (status: string) => {
        switch (status?.toLowerCase()) {
            case 'completed':
                return 'bg-green-100 text-green-700';

            case 'pending':
                return 'bg-yellow-100 text-yellow-700';

            case 'cancelled':
                return 'bg-red-100 text-red-700';

            case 'arrived':
                return 'bg-blue-100 text-blue-700';

            default:
                return 'bg-gray-100 text-gray-700';
        }
    };

    return (
        <div className="space-y-5">
            {/* Header Card */}
            <div className="rounded-xl border bg-white p-5 shadow-sm">
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-800">
                            {appointmentDay}
                        </h1>

                        <p className="mt-1 text-sm text-gray-500">
                            Total Appointments: {appointmentsData.length}
                        </p>
                    </div>

                    <div className="w-full md:w-60">
                        <Input
                            type="date"
                            value={appointmentDate}
                            onChange={(e) => setAppointmentDate(e.target.value)}
                        />
                    </div>
                </div>
            </div>

            {/* Table Card */}
            <div className="overflow-hidden rounded-xl border bg-white shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-slate-50">
                            <tr>
                                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">
                                    Patient
                                </th>

                                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">
                                    Doctor
                                </th>

                                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">
                                    Department
                                </th>

                                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">
                                    Date
                                </th>

                                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">
                                    Time
                                </th>

                                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">
                                    Status
                                </th>

                                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">
                                    Reason
                                </th>
                            </tr>
                        </thead>

                        <tbody>
                            {paginatedAppointments.length > 0 ? (
                                paginatedAppointments.map(
                                    (appointment: any) => (
                                        <tr
                                            key={appointment.id}
                                            className="border-t transition hover:bg-slate-50"
                                        >
                                            <td className="px-4 py-3">
                                                <div className="font-medium text-gray-800">
                                                    {
                                                        appointment.patient_first_name
                                                    }{' '}
                                                    {
                                                        appointment.patient_last_name
                                                    }
                                                </div>
                                            </td>

                                            <td className="px-4 py-3">
                                                Dr.{' '}
                                                {appointment.doctor_first_name}{' '}
                                                {appointment.doctor_last_name}
                                            </td>

                                            <td className="px-4 py-3">
                                                {appointment.department ||
                                                    'General'}
                                            </td>

                                            <td className="px-4 py-3">
                                                {new Date(
                                                    appointment.appointment_date,
                                                ).toLocaleDateString()}
                                            </td>

                                            <td className="px-4 py-3">
                                                {appointment.appointment_time}
                                            </td>

                                            <td className="px-4 py-3">
                                                <span
                                                    className={`rounded-full px-3 py-1 text-xs font-medium ${statusClass(
                                                        appointment.status,
                                                    )}`}
                                                >
                                                    {appointment.status}
                                                </span>
                                            </td>

                                            <td className="px-4 py-3">
                                                {appointment.reason}
                                            </td>
                                        </tr>
                                    ),
                                )
                            ) : (
                                <tr>
                                    <td
                                        colSpan={7}
                                        className="py-10 text-center text-gray-500"
                                    >
                                        No appointments found
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                {appointmentsData.length > 0 && (
                    <div className="flex items-center justify-between border-t bg-slate-50 px-6 py-4">
                        <p className="text-sm text-gray-500">
                            Page {currentPage} of {totalPages}
                        </p>

                        <div className="flex gap-2">
                            <Button
                                variant="outline"
                                disabled={currentPage === 1}
                                onClick={() =>
                                    setCurrentPage((prev) => prev - 1)
                                }
                            >
                                Previous
                            </Button>

                            <Button
                                variant="outline"
                                disabled={currentPage === totalPages}
                                onClick={() =>
                                    setCurrentPage((prev) => prev + 1)
                                }
                            >
                                Next
                            </Button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
