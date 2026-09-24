import { inPatients } from '@/actions/App/Http/Controllers/Nurses/NursesController';
import PageHeader from '@/components/PageHeader';
import ReusableTable from '@/components/ReusableTable';
import AppLayout from '@/layouts/app/app-header-layout';
import { usePage } from '@inertiajs/react';
import { BedIcon, BedSingleIcon } from 'lucide-react';

export default function Departments() {
    const { assignedAdmission } = usePage().props;
    const columns = [];
    return (
        <AppLayout
            breadcrumbs={[
                {
                    title: 'Nurses',
                    href: '/',
                },
                {
                    title: 'Departments',
                    href: '/',
                },
            ]}
        >
            <div className="h-full bg-blue-50 p-6">
                <PageHeader
                    icon={<BedIcon />}
                    title={'Nurses Departments'}
                    subtitle="View  your co-workers"
                />
                <ReusableTable title={'Department'} data={[]} columns={[]} />
            </div>
        </AppLayout>
    );
}
