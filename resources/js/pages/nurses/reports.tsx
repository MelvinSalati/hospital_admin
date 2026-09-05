import { BarChart3 } from 'lucide-react';
import PageHeader from '@/components/PageHeader';
import AppLayout from '@/layouts/app/app-header-layout';

export default function Reports() {
    return (
        <AppLayout
            breadcrumbs={[
                {
                    title: 'Nurses',
                    href: '/nurses/reports',
                },
                {
                    title: 'Reports',
                    href: '/nurses/reports',
                },
            ]}
        >
            <PageHeader
                icon={<BarChart3 />}
                title={'"Reports"'}
                subtitle="Generate nurses report"
            /> 

            {/* table shpwing reports */}
        </AppLayout>
    );
}
