import ReusableTable from '@/components/ReusableTable';
import AppLayout from '@/layouts/app/app-header-layout';
import { usePage } from '@inertiajs/react';
import { format } from 'path';

interface columns {
    name: string;
    email: string;
    role: string;
    poneNumber: string;
    createdAt: string;
}

export default function UserDepartment() {
    const { departmentUsers } = usePage().props;
    const columns = [
        {
            id: 'name',
            label: 'name',
        },
    ];
    return (
        <AppLayout
            breadcrumbs={[
                {
                    title: 'Departments',
                    href: '#',
                },
                {
                    title: 'Nurses',
                    href: '/',
                },
            ]}
        >
            <ReusableTable data={departmentUsers} columns={columns} />
        </AppLayout>
    );
}
