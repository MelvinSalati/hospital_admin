import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import AppLayout from '@/layouts/app-layout';
import { Link, usePage } from '@inertiajs/react';
import {
    ArrowLeftCircle,
    Inbox,
    MenuIcon,
    Thermometer,
    ThermometerSnowflake,
    User2,
    ClipboardCheck,
    UserPlus,
    Users,
    Stethoscope,
    ArrowLeft,
    MicroscopeIcon,
} from 'lucide-react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { useState } from 'react';
import PageHeader from '@/components/PageHeader';

export default function Nurses() {
    const tabs = [
        {
            key: 1,
            name: 'Queue',
        },
        {
            key: 2,
            name: 'Samples Processed',
        },
        {
            key: 3,
            name: 'Management',
        },
    ];

    const { props } = usePage();
    const [activeTab, setActiveTab] = useState('Queue');
    const [cartModal, setCartModal] = useState(false);
    const queues = props.queue;
    const stats = [];
    const cartalogueHandler = () => {
        setCartModal(true);
    };

    return (
        <AppLayout
            breadcrumbs={[
                {
                    href: '',
                    title: 'Department',
                },
                {
                    href: '',
                    title: 'Laboratory',
                },
            ]}
        >
            <div className="bg-white p-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Button variant="outline" size="icon" asChild>
                            <Link href="/dashboard">
                                <ArrowLeft size={16} />
                            </Link>
                        </Button>

                        <div>
                            <h1 className="flex items-center gap-2 text-xl font-semibold">
                                <MicroscopeIcon size={18} />
                                Laboratory Department
                            </h1>
                            <p className="text-sm text-gray-500">
                                Manage patient consultations and medical records
                            </p>
                        </div>
                    </div>
                </div>
                {/* Stats Cards */}
                <div className="grid grid-cols-1 gap-4 p-2 md:grid-cols-3">
                    <div>
                        <div className="flex items-center justify-between rounded-lg bg-violet-100 p-4">
                            <div>
                                <p className="text-sm text-gray-500">
                                    Total in Queue
                                </p>
                                <p className="text-2xl font-bold">
                                    {queues.length || 0}
                                </p>
                            </div>
                            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white">
                                <Users className="h-6 w-6 text-blue-600" />
                            </div>
                        </div>
                    </div>
                    <div>
                        <div className="flex items-center justify-between rounded-lg bg-green-200 p-4">
                            <div>
                                <p className="text-sm text-gray-500">
                                    Pending Assignment
                                </p>
                                <p className="text-2xl font-bold">
                                    {stats.pending_assignment || 0}
                                </p>
                            </div>
                            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white">
                                <UserPlus className="h-6 w-6 text-orange-600" />
                            </div>
                        </div>
                    </div>
                    <div>
                        <div className="flex items-center justify-between rounded-lg bg-blue-200 p-4">
                            <div>
                                <p className="text-sm text-gray-500">
                                    Assigned Today
                                </p>
                                <p className="text-2xl font-bold">
                                    {queues.length || 0}
                                </p>
                            </div>
                            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white">
                                <ClipboardCheck className="h-6 w-6 text-green-600" />
                            </div>
                        </div>
                    </div>
                </div>
                {activeTab === 'Queue' && (
                    <div className="p-4">
                        {queues.length > 0 ? (
                            <>
                                <div className="hidden overflow-x-auto md:block">
                                    <table className="w-full">
                                        <thead className="bg-gray-50 dark:bg-gray-700">
                                            <tr>
                                                <th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase dark:text-gray-300">
                                                    Token
                                                </th>
                                                <th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase dark:text-gray-300">
                                                    Name
                                                </th>
                                                <th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase dark:text-gray-300">
                                                    Contact
                                                </th>
                                                <th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase dark:text-gray-300">
                                                    Gender
                                                </th>
                                                <th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase dark:text-gray-300">
                                                    Status
                                                </th>
                                                <th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase dark:text-gray-300">
                                                    Registered
                                                </th>
                                                <th className="px-6 py-3 text-right text-xs font-medium tracking-wider text-gray-500 uppercase dark:text-gray-300">
                                                    Actions
                                                </th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                                            {queues.length > 0 ? (
                                                queues.map((patient) => (
                                                    <tr
                                                        key={patient.id}
                                                        className="transition-colors hover:bg-gray-50 dark:hover:bg-gray-700"
                                                    >
                                                        <td className="p-2 text-sm font-semibold whitespace-nowrap text-blue-900 dark:text-blue-400">
                                                            {'AMH-'}
                                                            {patient.token}
                                                        </td>
                                                        <td className="px-6 py-4 whitespace-nowrap">
                                                            <div className="text-sm font-medium text-gray-900 dark:text-white">
                                                                {
                                                                    patient.first_name
                                                                }{' '}
                                                                {
                                                                    patient.last_name
                                                                }
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-4 whitespace-nowrap">
                                                            <div className="text-sm text-gray-500 dark:text-gray-400">
                                                                <div>
                                                                    {
                                                                        patient.email
                                                                    }
                                                                </div>
                                                                <div>
                                                                    {
                                                                        patient.phone
                                                                    }
                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-4 text-sm whitespace-nowrap text-gray-500 capitalize dark:text-gray-400">
                                                            {patient.gender}
                                                        </td>
                                                        <td className="px-6 py-4 whitespace-nowrap">
                                                            <span
                                                                className={`rounded-full px-2 py-1 text-xs font-medium ${
                                                                    patient.status ===
                                                                    'active'
                                                                        ? 'bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100'
                                                                        : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                                                                }`}
                                                            >
                                                                {'Pending'}
                                                            </span>
                                                        </td>
                                                        <td className="px-6 py-4 text-sm whitespace-nowrap text-gray-500 dark:text-gray-400">
                                                            {new Date(
                                                                patient.created_at,
                                                            ).toLocaleDateString()}
                                                        </td>
                                                        <td className="flex gap-2 px-6 py-4 text-right text-sm font-medium whitespace-nowrap">
                                                            <Link
                                                                href={`/patients/lab/${patient.id}`}
                                                                className="rounded-3xl bg-black p-1 text-white"
                                                            >
                                                                View Patient
                                                            </Link>
                                                        </td>
                                                    </tr>
                                                ))
                                            ) : (
                                                <tr>
                                                    <td
                                                        colSpan={7}
                                                        className="px-6 py-12 text-center text-gray-500 dark:text-gray-400"
                                                    >
                                                        <div className="flex flex-col items-center">
                                                            <svg
                                                                className="mb-3 h-12 w-12 text-gray-400"
                                                                fill="none"
                                                                stroke="currentColor"
                                                                viewBox="0 0 24 24"
                                                            >
                                                                <path
                                                                    strokeLinecap="round"
                                                                    strokeLinejoin="round"
                                                                    strokeWidth={
                                                                        2
                                                                    }
                                                                    d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                                                                />
                                                            </svg>
                                                            <p className="text-lg font-medium">
                                                                No patients
                                                                found
                                                            </p>
                                                        </div>
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </>
                        ) : (
                            <></>
                        )}
                    </div>
                )}
         
            </div>
        </AppLayout>
    );
}
