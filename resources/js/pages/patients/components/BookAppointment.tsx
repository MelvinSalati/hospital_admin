import { usePage } from '@inertiajs/react';
import {
    CalendarPlus,
    Stethoscope,
    Building2,
    Calendar,
    Clock,
    ClipboardList,
    FileText,
    Loader2,
    CheckCircle2,
} from 'lucide-react';
import Notiflix from 'notiflix';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import Http from '@/utils/Http';

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

    const isEditMode = !!appointmentId;

    return (
        <div className="mx-auto w-full max-w-4xl overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            {/* ─── Header ─────────────────────────────────────────────── */}
            {/* <div className="flex items-center gap-3 border-b border-slate-200 bg-slate-100 px-5 py-3.5">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-600 text-white shadow-sm">
                    <CalendarPlus className="h-4.5 w-4.5" size={18} />
                </div>
                <div className="min-w-0 flex-1">
                    <h2 className="text-base font-semibold text-slate-900">
                        {isEditMode ? 'Update Appointment' : 'Book Appointment'}
                    </h2>
                    <p className="text-xs text-slate-500">
                        {isEditMode
                            ? 'Update the appointment status and details below'
                            : 'Fill in the details to schedule a new appointment'}
                    </p>
                </div>
                <span
                    className={`hidden shrink-0 rounded-full px-2.5 py-1 text-[11px] font-medium sm:inline-flex ${
                        isEditMode
                            ? 'bg-amber-50 text-amber-700'
                            : 'bg-emerald-50 text-emerald-700'
                    }`}
                >
                    {isEditMode ? 'Edit Mode' : 'New'}
                </span>
            </div> */}

            {/* ─── Body ───────────────────────────────────────────────── */}
            <div className="p-5">
                <div className="grid grid-cols-1 gap-x-5 gap-y-4 md:grid-cols-2">
                    {/* Department */}
                    <div className="space-y-1.5">
                        <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-700">
                            <Building2 size={13} className="text-slate-400" />
                            Department
                            <span className="text-red-500">*</span>
                        </label>
                        <select
                            className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-800 transition-colors focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none"
                            value={departmentId ?? ''}
                            onChange={(e) =>
                                setDepartmentId(Number(e.target.value))
                            }
                        >
                            <option value="">Select Department</option>
                            {departments?.map((department: any) => (
                                <option
                                    key={department.id}
                                    value={department.id}
                                >
                                    {department.name}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Doctor */}
                    <div className="space-y-1.5">
                        <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-700">
                            <Stethoscope size={13} className="text-slate-400" />
                            Doctor
                            <span className="text-red-500">*</span>
                        </label>
                        <select
                            className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-800 transition-colors focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none"
                            value={doctorId ?? ''}
                            onChange={(e) =>
                                setDoctorId(Number(e.target.value))
                            }
                        >
                            <option value="">Select Doctor</option>
                            {doctors?.map((doctor: any) => (
                                <option key={doctor.id} value={doctor.id}>
                                    Dr. {doctor.first_name} {doctor.surname}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Date */}
                    <div className="space-y-1.5">
                        <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-700">
                            <Calendar size={13} className="text-slate-400" />
                            Appointment Date
                            <span className="text-red-500">*</span>
                        </label>
                        <Input
                            type="date"
                            value={appointmentDate}
                            onChange={(e) => setAppointmentDate(e.target.value)}
                            className="h-10 text-sm"
                        />
                    </div>

                    {/* Time */}
                    <div className="space-y-1.5">
                        <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-700">
                            <Clock size={13} className="text-slate-400" />
                            Appointment Time
                            <span className="text-red-500">*</span>
                        </label>
                        <Input
                            type="time"
                            value={appointmentTime}
                            onChange={(e) => setAppointmentTime(e.target.value)}
                            className="h-10 text-sm"
                        />
                    </div>

                    {/* Reason / Status */}
                    <div className="space-y-1.5 md:col-span-2">
                        <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-700">
                            <ClipboardList
                                size={13}
                                className="text-slate-400"
                            />
                            {isEditMode
                                ? 'Appointment Status'
                                : 'Appointment Reason'}
                            <span className="text-red-500">*</span>
                        </label>
                        <select
                            className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-800 transition-colors focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none"
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                        >
                            {isEditMode ? (
                                <>
                                    <option value="">
                                        Select Appointment Status
                                    </option>
                                    {appointmentStatus.map((item) => (
                                        <option key={item} value={item}>
                                            {item
                                                .replace(/_/g, ' ')
                                                .replace(/\b\w/g, (c) =>
                                                    c.toUpperCase(),
                                                )}
                                        </option>
                                    ))}
                                </>
                            ) : (
                                <>
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
                    <div className="space-y-1.5 md:col-span-2">
                        <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-700">
                            <FileText size={13} className="text-slate-400" />
                            Additional Notes
                            <span className="font-normal text-slate-400">
                                (optional)
                            </span>
                        </label>
                        <textarea
                            placeholder="Enter any additional notes or special instructions..."
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            rows={3}
                            className="w-full resize-none rounded-lg border border-slate-300 p-3 text-sm transition-colors placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none"
                        />
                    </div>
                </div>
            </div>

            {/* ─── Footer ─────────────────────────────────────────────── */}
            <div className="flex items-center justify-between border-t border-slate-200 bg-slate-100 px-5 py-3.5">
                <p className="text-xs text-slate-500">
                    <span className="text-red-500">*</span> Required fields
                </p>
                <Button
                    onClick={handleBookAppointment}
                    disabled={loading || isEditMode}
                    className="h-10 min-w-[180px] text-sm font-medium"
                >
                    {loading ? (
                        <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            {isEditMode ? 'Updating...' : 'Booking...'}
                        </>
                    ) : (
                        <>
                            <CheckCircle2 className="mr-2 h-4 w-4" />
                            {isEditMode
                                ? 'Update Appointment'
                                : 'Book Appointment'}
                        </>
                    )}
                </Button>
            </div>
        </div>
    );
}
