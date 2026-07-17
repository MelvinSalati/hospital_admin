// pages/patients/appointments.tsx (or .page.tsx depending on setup)

import PageHeader from '@/components/PageHeader';
import PatientLayout from '@/layouts/patients/PatientLayout';
import { usePage } from '@inertiajs/react';
import BookAppointment from './components/BookAppointment';
import AppointmentsTable from './components/AppointmentsTable';
import { Button } from '@/components/ui/button';
import { useState } from 'react';
// Define tab configuration — now as a React component (reusable)

export default function PatientsAppointments() {
    const { appointments, patientId } = usePage().props;
    console.log(appointments, patientId);
    // Safety check: if no data available (e.g., SSR fallback), show message
    const hasData = Boolean(appointments?.length || patientId);
    const [activeTab, setActiveTab] = useState<number>(1);

    const AppointmentTabs = () => {
        return (
            <>
                <div className="flex flex-wrap gap-2 border-b border-gray-200 p-2">
                    {[
                        { id: 1, title: 'View Appointments' },
                        { id: 2, title: 'Book Appointment' },
                    ].map((tab) => (
                        <Button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`${
                                activeTab === tab.id
                                    ? 'rounded-none border-b-2 border-blue-500 text-blue-600'
                                    : 'border-b-2 border-transparent text-gray-500 hover:text-gray-700'
                            } rounded-none bg-transparent px-4 py-3 text-sm font-medium hover:bg-gray-50`}
                            variant="ghost"
                        >
                            {tab.title}
                        </Button>
                    ))}
                </div>

                {/* Tabs Content Area */}
                {activeTab === 1 && (
                    <AppointmentsTable
                        appointments={appointments}
                        patientId={patientId}
                    />
                )}

                {activeTab === 2 && <BookAppointment />}
            </>
        );
    };
    return (
        <PatientLayout
            breadcrumbs={[
                { title: 'Appointments', href: '/' },
                { title: 'Book Appointment', href: '/book' }, // Optional navigation link
            ]}
        >
            {/* Header */}
            <PageHeader
                title="Manage Appointments"
                subtitle={
                    hasData
                        ? 'View your scheduled visits and book new ones.'
                        : 'No appointments yet — start by booking one.'
                }
            />
            {AppointmentTabs()}
        </PatientLayout>
    );
}
