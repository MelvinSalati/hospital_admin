import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import routes from '@/constants/routes';
import Http from '@/utils/Http';
import { usePage } from '@inertiajs/react';
import { use, useState } from 'react';
import Notiflix from 'notiflix';

export default function BookAppointment({ appointmentId }) {
    const { doctors, patientId, departments } = usePage().props as any;
    const [doctorId, setDoctorId] = useState<number | null>(null);
    const [departmentId, setDepartmentId] = useState<number | null>(null);

    const [appointmentDate, setAppointmentDate] = useState('');
    const [appointmentTime, setAppointmentTime] = useState('');

    const [reason, setReason] = useState('');
    const [notes, setNotes] = useState('');

    const [loading, setLoading] = useState(false);

    const appointmentReasons = [
        'Medical Follow-up',
        'Medication Collection',
        'Pharmacy Pick-up',
        'Procedure',
        'Surgery',
        'Antenatal Care',
        'Postnatal Care',
        'Routine Checkup',
        'Consultation',
        'Emergency Review',
        'Laboratory Review',
        'Radiology Review',
        'Vaccination',
        'Family Planning',
        'Pediatric Consultation',
    ];

    const appointmentStatus = [
        'no-show',
        'completed',
        'checked_in',
        'in_progress',
    ];

    const handleBookAppointment = async () => {
        if (
            !doctorId ||
            !departmentId ||
            !appointmentDate ||
            !appointmentTime ||
            !reason
        ) {
            Notiflix.Notify.failure('Please fill in all required fields.');
            return;
        }

        setLoading(true);

        try {
            const payload = {
                patient_id: patientId,
                doctor_id: doctorId,
                department_id: departmentId,
                appointment_date: appointmentDate,
                appointment_time: appointmentTime,
                appointment_id: appointmentId,
                reason,
                notes,
            };

            const response = await Http.post('appointments/create', payload);

            if (response.status === 201) {
                Notiflix.Notify.success(
                    response.data.message || 'Appointment booked successfully!',
                );

                setDoctorId(null);
                setDepartmentId(null);
                setAppointmentDate('');
                setAppointmentTime('');
                setReason('');
                setNotes('');
            } else {
                Notiflix.Notify.failure(
                    response.data.message || 'Something went wrong.',
                );
            }
        } catch (error) {
            Notiflix.Notify.failure('Server error. Please try again later.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="mx-auto w-full max-w-6xl space-y-8 overflow-hidden overflow-y-auto rounded-2xl border border-gray-200 bg-white p-2">
            {/* Header */}
            {/* Form */}
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                {/* Department */}
                <div className="space-y-2">
                    <label className="text-sm font-semibold text-gray-700">
                        Department
                    </label>

                    <select
                        className="h-11 w-full rounded-lg border border-gray-300 bg-white px-3 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                        value={departmentId ?? ''}
                        onChange={(e) =>
                            setDepartmentId(Number(e.target.value))
                        }
                    >
                        <option value="">Select Department</option>

                        {departments?.map((department: any) => (
                            <option key={department.id} value={department.id}>
                                {department.name}
                            </option>
                        ))}
                    </select>
                </div>

                {/* Doctor */}
                <div className="space-y-2">
                    <label className="text-sm font-semibold text-gray-700">
                        Doctor
                    </label>

                    <select
                        className="h-11 w-full rounded-lg border border-gray-300 bg-white px-3 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                        value={doctorId ?? ''}
                        onChange={(e) => setDoctorId(Number(e.target.value))}
                    >
                        <option value="">Select Doctor</option>

                        {doctors?.map((doctor: any) => (
                            <option key={doctor.id} value={doctor.id}>
                                {doctor.first_name} {doctor.surname}
                            </option>
                        ))}
                    </select>
                </div>

                {/* Date */}
                <div className="space-y-2">
                    <label className="text-sm font-semibold text-gray-700">
                        Appointment Date
                    </label>

                    <Input
                        type="date"
                        value={appointmentDate}
                        onChange={(e) => setAppointmentDate(e.target.value)}
                        className="h-11"
                    />
                </div>

                {/* Time */}
                <div className="space-y-2">
                    <label className="text-sm font-semibold text-gray-700">
                        Appointment Time
                    </label>

                    <Input
                        type="time"
                        value={appointmentTime}
                        onChange={(e) => setAppointmentTime(e.target.value)}
                        className="h-11"
                    />
                </div>

                {/* Reason */}
                <div className="space-y-2 md:col-span-2">
                    <label className="text-sm font-semibold text-gray-700">
                        Appointment Reason
                    </label>

                    <select
                        className="h-11 w-full rounded-lg border border-gray-300 bg-white px-3 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                    >
                        {appointmentId ? (
                            <>
                                <option value="">
                                    Select Appointment Status
                                </option>

                                {appointmentStatus.map((item) => (
                                    <option key={item} value={item}>
                                        {item}
                                    </option>
                                ))}
                            </>
                        ) : (
                            <>
                                {/* show reasons if appointment id is nukl */}
                                <option value="">
                                    Select Appointment Reason
                                </option>

                                {appointmentReasons.map((item) => (
                                    <option key={item} value={item}>
                                        {item}
                                    </option>
                                ))}
                            </>
                        )}
                    </select>
                </div>

                {/* Notes */}
                <div className="space-y-2 md:col-span-2">
                    <label className="text-sm font-semibold text-gray-700">
                        Additional Notes
                    </label>

                    <textarea
                        placeholder="Enter additional notes here..."
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        rows={5}
                        className="w-full resize-none rounded-lg border border-gray-300 p-4 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                </div>
            </div>

            {/* Footer */}
            <div className="flex justify-end border-t pt-6">
                {appointmentId ? (
                    <>
                        {' '}
                        <Button
                            onClick={handleBookAppointment}
                            disabled={loading}
                            className="h-11 min-w-[220px] text-sm font-medium"
                        >
                            {loading
                                ? 'Booking Appointment...'
                                : 'Book Appointment'}
                        </Button>
                    </>
                ) : (
                    <>
                        {' '}
                        <Button
                            disabled={true}
                            onClick={handleBookAppointment}
                            disabled={loading}
                            className="h-11 min-w-[220px] text-sm font-medium"
                        ></Button>
                    </>
                )}
            </div>
        </div>
    );
}
