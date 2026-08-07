import { Badge, UsersIcon } from 'lucide-react';
import { useEffect, useState } from 'react';
import Container from '@/components/container';
import PageHeader from '@/components/PageHeader';
import ReusableTable from '@/components/ReusableTable';
import AppLayout from '@/layouts/app-layout';
import Http from '@/utils/Http';
export default function Users() {
    const [usersAll, setUsersAll] = useState([]);
    const [loading, setLoading] = useState(false);

    const getUsers = async () => {
        try {
            setLoading(true);
            const response = await Http.get('/admin/all-users');
            if (response.data.success) {
                setLoading(false);
                setUsersAll(response.data.users);
            } else {
                setLoading(false);
            }
        } catch (error) {
            console.log(error);
            setLoading(false);
        }
    };

    useEffect(() => {
        getUsers();
    }, []);
    const columns = [
        {
            id: 'serial_number',
            label: 'SN',
            minWidth: 50,
            sortable: true,
            format: (value, row) => (
                <div>
                    <p
                        className={`text-sm ${!row.serial_number ? 'font-semibold text-slate-900 dark:text-slate-100' : 'text-slate-700 dark:text-slate-300'}`}
                    >
                        {row.serial_number}
                    </p>
                </div>
            ),
        },
        {
            id: 'employee_number',
            label: 'Mobile Phone Number',
            minWidth: 200,
            sortable: true,
            format: (value, row) => (
                <div>
                    <p
                        className={`text-sm ${!row.mobile_phone_number ? 'font-semibold text-slate-900 dark:text-slate-100' : 'text-slate-700 dark:text-slate-300'}`}
                    >
                        {row.mobile_phone_number}
                    </p>
                </div>
            ),
        },
        {
            id: 'user_details',
            label: 'Personal Information',
            minWidth: 200,
            sortable: true,
            format: (value, row) => (
                <div>
                    <p
                        className={`text-sm ${!row.read ? 'font-semibold text-slate-900 dark:text-slate-100' : 'text-slate-700 dark:text-slate-300'}`}
                    >
                        {row.name}
                    </p>
                    <span className="text-slate-400">{row.email}</span>
                </div>
            ),
        },
        {
            id: 'department',
            label: 'Department',
            minWidth: 200,
            sortable: true,
            format: (value, row) => (
                <div>
                    <p
                        className={`text-sm ${!row.department_name ? 'font-semibold text-slate-900 dark:text-slate-100' : 'text-slate-700 dark:text-slate-300'}`}
                    >
                        {row.department_name}
                    </p>
                </div>
            ),
        },
        {
            id: 'roles',
            label: 'Roles',
            minWidth: 200,
            sortable: true,
            format: (value, row) => (
                <div>
                    <p
                        className={`text-sm ${!row.roles?.length ? 'font-semibold text-slate-900 dark:text-slate-100' : 'text-slate-700 dark:text-slate-300'}`}
                    >
                        General
                    </p>
                </div>
            ),
        },

        {
            id: 'last_logged_in',
            label: 'Last Logged In',
            minWidth: 200,
            sortable: true,
            format: (value, row) => (
                <div>
                    <p
                        className={`text-sm ${!row.read ? 'font-semibold text-slate-900 dark:text-slate-100' : 'text-slate-700 dark:text-slate-300'}`}
                    >
                        ---
                    </p>
                </div>
            ),
        },
    ];
    return (
        <AppLayout
            breadcrumbs={[
                {
                    title: 'Admin',
                    href: '/',
                },
                {
                    title: 'Registered Users',
                    href: '/',
                },
            ]}
        >
            <div className="bg-slate-100">
                <Container>
                    <PageHeader
                        title={'Users Management'}
                        icon={<UsersIcon />}
                        subtitle={
                            'Manage all system users,roles and permissions'
                        }
                    />
                    <ReusableTable
                        title={'Users Management'}
                        columns={columns}
                        data={usersAll}
                        loading={loading}
                    />
                </Container>
            </div>
        </AppLayout>
    );
}
