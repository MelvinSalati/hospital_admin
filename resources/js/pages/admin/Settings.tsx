import PageHeader from '@/components/PageHeader';
import { Cog6ToothIcon } from '@heroicons/react/24/outline';
import AppLayout from '@/layouts/app/app-header-layout';
import { usePage } from '@inertiajs/react';

export default function Administration() {
    return (
        <>
            <AppLayout
                breadcrumbs={[
                    {
                        title: 'Administration',
                        href: '/admin/administration',
                    },
                ]}
            >
                <div className="h-full bg-blue-50 p-2">
                    <PageHeader
                        title="Administration"
                        subtitle="Manage system settings and configurations."
                        icon={<Cog6ToothIcon className="h-6 w-6" />}
                    />
                </div>
            </AppLayout>
        </>
    );
}
