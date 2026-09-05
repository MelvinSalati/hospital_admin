// pages/patients/appointments.tsx

import { usePage } from '@inertiajs/react';
import { CalendarIcon, X, Eye, PlusCircle } from 'lucide-react';
import { useState } from 'react';
import PageHeader from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import PatientLayout from '@/layouts/patients/PatientLayout';
import AppointmentsTable from './components/AppointmentsTable';
import BookAppointment from './components/BookAppointment';

interface Appointment {
    id: number;
    // Add other appointment properties as needed
}

interface PageProps {
    appointments: Appointment[];
    patientId: string | number;
}

export default function PatientsAppointments() {
    const { appointments, patientId } = usePage().props as PageProps;
    const [isBookingOpen, setIsBookingOpen] = useState(false);

    const hasData = Boolean(appointments?.length || patientId);

    const handleBookAppointment = () => {
        setIsBookingOpen(true);
    };

    const handleCloseModal = () => {
        setIsBookingOpen(false);
    };

    const getSubtitle = () => {
        if (!hasData) {
            return 'No appointments yet — start by booking one.';
        }
        return appointments?.length
            ? `You have ${appointments.length} scheduled appointment${appointments.length > 1 ? 's' : ''}.`
            : 'No appointments scheduled. Book your first appointment now.';
    };

    return (
        <PatientLayout
            breadcrumbs={[
                { title: 'Appointments', href: '/appointments' },
                { title: 'Manage', href: '#' },
            ]}
        >
            <div className="min-h-screen bg-blue-50">
                {/* Page Header */}
                <PageHeader
                    icon={<CalendarIcon className="h-5 w-5" />}
                    title="Manage Appointments"
                    subtitle={getSubtitle()}
                    action={[
                        {
                            label: 'Book Appointment',
                            onClick: handleBookAppointment,
                            className: 'h-12 px-6 text-base font-medium gap-3',
                        },
                    ]}
                />

                {/* Main Grid Layout - Actions on LEFT, Appointments on RIGHT */}
                <div className="grid grid-cols-1 gap-6 lg:grid-cols-[280px_1fr]">
                    {/* Left Column - Action Panel */}
                    <div className="bg-gray-50 p-2">
                        <div className="space-y-3 px-2">
                            <Button
                                variant="outline"
                                className="h-auto w-full justify-start gap-3 rounded-lg border-gray-200 px-4 py-3 text-sm font-medium hover:bg-gray-50"
                            >
                                <Eye className="h-5 w-5 shrink-0" />
                                <div className="flex flex-col items-start text-left">
                                    <span>View Appointments</span>
                                    <span className="text-xs font-normal text-gray-500">
                                        See all your scheduled visits
                                    </span>
                                </div>
                            </Button>
                            <Button
                                onClick={handleBookAppointment}
                                className="h-auto w-full justify-start gap-3 rounded-lg bg-blue-600 px-4 py-3 text-sm font-medium text-white shadow-sm hover:bg-blue-700"
                            >
                                <PlusCircle className="h-5 w-5 shrink-0" />
                                <div className="flex flex-col items-start text-left">
                                    <span>Book Appointment</span>
                                    <span className="text-xs font-normal text-blue-100">
                                        Schedule a new visit
                                    </span>
                                </div>
                            </Button>
                        </div>
                    </div>

                    {/* Right Column - Appointments Table */}
                    <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
                        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
                            <div className="flex items-center gap-3">
                                <div className="rounded-lg bg-blue-50 p-2">
                                    <CalendarIcon className="h-4 w-4 text-blue-600" />
                                </div>
                                <div>
                                    <h2 className="text-sm font-semibold text-gray-900">
                                        Appointments
                                    </h2>
                                    <p className="text-xs text-gray-500">
                                        Your scheduled appointments
                                    </p>
                                </div>
                            </div>
                            {appointments?.length > 0 && (
                                <span className="inline-flex items-center rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700">
                                    {appointments.length} total
                                </span>
                            )}
                        </div>
                        <div className="p-4">
                            <AppointmentsTable
                                appointments={appointments}
                                patientId={patientId}
                            />
                        </div>
                    </div>
                </div>

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
                            {/* Modal Header */}
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

                            {/* Modal Body */}
                            <div className="max-h-[calc(90vh-8rem)] overflow-y-auto p-6">
                                <BookAppointment />
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </PatientLayout>
    );
}
