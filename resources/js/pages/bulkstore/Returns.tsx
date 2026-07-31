import AppLayout from '@/layouts/app-layout';
import { Head } from '@inertiajs/react';
import { BreadcrumbItem } from '@/types';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Bulk Store',
        href: '/bulkstore',
    },
    {
        title: 'Returns',
        href: '/bulkstore/returns',
    },
];

export default function Returns() {
    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Returns" />

            <div className="p-6">
                <h1 className="text-2xl font-semibold">Returns</h1>
            </div>
        </AppLayout>
    );
}
