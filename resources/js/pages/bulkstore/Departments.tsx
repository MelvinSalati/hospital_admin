import { Head } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import type { BreadcrumbItem } from '@/types';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Bulk Store',
        href: '/bulkstore',
    },
    {
        title: 'Departments',
        href: '/bulkstore/departments',
    },
];

export default function Departments() {
    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Departments" />

            <div className="p-6">
                <h1 className="text-2xl font-semibold">Departments</h1>
            </div>
        </AppLayout>
    );
}
