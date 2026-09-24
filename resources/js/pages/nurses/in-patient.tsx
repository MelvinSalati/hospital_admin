import { inPatients } from '@/actions/App/Http/Controllers/Nurses/NursesController';
import PageHeader from '@/components/PageHeader';
import ReusableTable from '@/components/ReusableTable';
import AppLayout from '@/layouts/app/app-header-layout';
import { usePage } from '@inertiajs/react';
import { BedIcon, BedSingleIcon } from 'lucide-react';

export default function InPatient() {
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
                    title: 'Admissions',
                    href: '/',
                },
            ]}
        >
            <div className="h-full bg-blue-50 p-6">
                <PageHeader
                    icon={<BedIcon />}
                    title={'Admissions'}
                    subtitle="View currently in enrolled patients"
                />
                <ReusableTable
                    title={'Current in Admission'}
                    data={[]}
                    columns={[]}
                />
            </div>
        </AppLayout>
    );
}
