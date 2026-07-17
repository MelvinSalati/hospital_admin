import { AppointmentTable } from '@/components/dashboard/tables/AppointmentTable';
import PageHeader from '@/components/PageHeader';
import AppLayout from '@/layouts/app-layout';
import { usePage } from '@inertiajs/react';
import AppointmentsTable from './components/AppointmentsTable';

const breadcrumbs = [
    {
        title: 'Appointments',
        href: '/',
    },
];
export default function Appointments() {
    const { appointments } = usePage().props;
    console.log('recept' + appointments);

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <PageHeader
                title="Appointments"
                subtitle="Create and view appointments"
                backurl="/dashboard"
            />
            <AppointmentsTable appointments={appointments} />
        </AppLayout>
    );
}
