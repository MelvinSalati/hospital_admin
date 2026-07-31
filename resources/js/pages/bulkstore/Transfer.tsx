import AppLayout from '@/layouts/app-layout';
import { Head } from '@inertiajs/react';
import { BreadcrumbItem } from '@/types';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Bulk Store',
        href: '/bulkstore',
    },
    {
        title: 'Transfer',
        href: '/bulkstore/transfer',
    },
];

export default function Transfer() {
    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Transfer" />

            <div className="p-6">
                <h1 className="text-2xl font-semibold">Transfer</h1>
            </div>
        </AppLayout>
    );
}
