import AppLayout from '@/layouts/app-layout';
import { Head } from '@inertiajs/react';
import { BreadcrumbItem } from '@/types';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Bulk Store',
        href: '/bulkstore',
    },
    {
        title: 'Stock',
        href: '/bulkstore/stock',
    },
];

export default function Stock() {
    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Stock" />

            <div className="p-6">
                <h1 className="text-2xl font-semibold">Stock</h1>
            </div>
        </AppLayout>
    );
}
