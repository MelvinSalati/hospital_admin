import { Head } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import type { BreadcrumbItem } from '@/types';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Bulk Store',
        href: '/bulkstore',
    },
    {
        title: 'AuditTrail',
        href: '/bulkstore/audittrail',
    },
];

export default function AuditTrail() {
    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="AuditTrail" />

            <div className="p-6">
                <h1 className="text-2xl font-semibold">AuditTrail</h1>
            </div>
        </AppLayout>
    );
}
