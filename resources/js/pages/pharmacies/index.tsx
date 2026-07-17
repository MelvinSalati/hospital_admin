import StatsCard from '@/components/StatsCard';
import { Users, UserPlus, ClipboardCheck } from 'lucide-react';
import PageHeader from '@/components/PageHeader';
import AppLayout from '@/layouts/app-layout';
import PatientTable from '@/components/PatientTable';
import { usePage } from '@inertiajs/react';

export default function PharmacyDepartment() {
    const { stats, queue } = usePage<any>().props;
    console.log(stats, queue);
    return (
        <AppLayout
            breadcrumbs={[
                {
                    title: 'Pharmacy',
                    href: '/',
                },
                {
                    title: 'Queue',
                    href: '/',
                },
            ]}
        >
            <PageHeader title="Pharmacy" subtitle="View pharmacy queue" />{' '}
            <div className="grid grid-cols-1 gap-4 p-4 md:grid-cols-3">
                <StatsCard
                    title="Total in Queue"
                    value={stats.total_in_queue}
                    icon={Users}
                    bgColor="bg-blue-50"
                    iconColor="text-blue-600"
                />

                <StatsCard
                    title="Pending Assignment"
                    value={stats.pending_assignement}
                    icon={UserPlus}
                    bgColor="bg-yellow-50"
                    iconColor="text-orange-600"
                />

                <StatsCard
                    title="Assigned Today"
                    value={stats.assigned_today}
                    icon={ClipboardCheck}
                    bgColor="bg-green-50"
                    iconColor="text-green-600"
                />
                <PatientTable
                    patients={queue}
                    baseUrl="/dashboard/patients"
                    onStartConsultation={(p) => console.log('Quick start', p)}
                />
            </div>
        </AppLayout>
    );
}
