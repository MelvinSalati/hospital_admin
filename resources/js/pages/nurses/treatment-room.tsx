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
                    title={'Treatment Room'}
                    subtitle="View procedures such as injection givng etc"
                />
                <ReusableTable
                    title={'Seen Treatment Room'}
                    data={[]}
                    columns={[]}
                />
            </div>
        </AppLayout>
    );
}
