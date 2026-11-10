
import { Head } from '@inertiajs/react';
import {
    Activity,
    BarChart3,
    CalendarCheck,
    CheckCircle2,
    Clock,
    FileText,
    UserCheck,
    Users,
    Wallet,
    XCircle,
} from 'lucide-react';
import React, { useState } from 'react';
import PageHeader from '@/components/PageHeader';
import ReusableTable from '@/components/ReusableTable';
import type { Column, Action } from '@/components/ReusableTable';
import AppLayout from '@/layouts/app-layout';
import type { BreadcrumbItem } from '@/types';

// ============================================
// TYPES
// ============================================

interface Report {
    id: string;
    name: string;
    category: string;
    description: string;
    icon: string;
    frequency: string;
    last_run: string | null;
    status: 'ready' | 'generating' | 'error';
}

// ============================================
// BREADCRUMBS
// ============================================

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Reception', href: '/reception' },
    { title: 'Reports', href: '/reception/reports' },
];

// ============================================
// ICON MAP
// ============================================

const iconMap: Record<string, React.ReactNode> = {
    Users: <Users className="h-5 w-5" />,
    UserCheck: <UserCheck className="h-5 w-5" />,
    Activity: <Activity className="h-5 w-5" />,
    CalendarCheck: <CalendarCheck className="h-5 w-5" />,
    Clock: <Clock className="h-5 w-5" />,
    Wallet: <Wallet className="h-5 w-5" />,
    CheckCircle2: <CheckCircle2 className="h-5 w-5" />,
    XCircle: <XCircle className="h-5 w-5" />,
    FileText: <FileText className="h-5 w-5" />,
};

// ============================================
// RECEPTION REPORTS
// ============================================

const reports: Report[] = [
    {
        id: 'patient-attendance',
        name: 'Patient Attendance Report',
        category: 'Patient Flow',
        description:
            'Daily summary of patients attending the facility',
        icon: 'Users',
        frequency: 'Daily',
        last_run: null,
        status: 'ready',
    },
    {
        id: 'registration',
        name: 'Patient Registration Report',
        category: 'Patients',
        description:
            'New and returning patients registered during the selected period',
        icon: 'UserCheck',
        frequency: 'Daily',
        last_run: null,
        status: 'ready',
    },
    {
        id: 'check-ins',
        name: 'Check-in Report',
        category: 'Patient Flow',
        description:
            'Patients checked in and their current reception status',
        icon: 'Activity',
        frequency: 'Daily',
        last_run: null,
        status: 'ready',
    },
    {
        id: 'visits',
        name: 'Visit Report',
        category: 'Visits',
        description:
            'Patient visits by department, provider and visit status',
        icon: 'FileText',
        frequency: 'Daily',
        last_run: null,
        status: 'ready',
    },
    {
        id: 'appointments',
        name: 'Appointment Report',
        category: 'Appointments',
        description:
            'Scheduled, completed, cancelled and rescheduled appointments',
        icon: 'CalendarCheck',
        frequency: 'Daily',
        last_run: null,
        status: 'ready',
    },
    {
        id: 'waiting-time',
        name: 'Waiting Time Report',
        category: 'Patient Flow',
        description:
            'Patient waiting time from check-in to commencement of service',
        icon: 'Clock',
        frequency: 'Daily',
        last_run: null,
        status: 'ready',
    },
    {
        id: 'billing-payments',
        name: 'Billing & Payment Report',
        category: 'Financial',
        description:
            'Patient charges, invoices, payments and payment methods',
        icon: 'Wallet',
        frequency: 'Daily',
        last_run: null,
        status: 'ready',
    },
    {
        id: 'outstanding-balances',
        name: 'Outstanding Balance Report',
        category: 'Financial',
        description:
            'Patients with unpaid or partially paid invoices',
        icon: 'Wallet',
        frequency: 'Daily',
        last_run: null,
        status: 'ready',
    },
    {
        id: 'cashier',
        name: 'Cashier End-of-Day Report',
        category: 'Financial',
        description:
            'Daily cashier transactions, collections, refunds and variances',
        icon: 'CheckCircle2',
        frequency: 'Daily',
        last_run: null,
        status: 'ready',
    },
    {
        id: 'no-shows-cancellations',
        name: 'No-show & Cancellation Report',
        category: 'Appointments',
        description:
            'Missed, cancelled and rescheduled patient appointments',
        icon: 'XCircle',
        frequency: 'Weekly',
        last_run: null,
        status: 'ready',
    },
    {
        id: 'referrals',
        name: 'Referral Report',
        category: 'Patient Flow',
        description:
            'Patients referred to or from the facility',
        icon: 'Activity',
        frequency: 'Monthly',
        last_run: null,
        status: 'ready',
    },
    {
        id: 'reception-activity',
        name: 'Reception Activity Report',
        category: 'Operations',
        description:
            'Receptionist activities including registrations, check-ins and transactions',
        icon: 'Activity',
        frequency: 'Monthly',
        last_run: null,
        status: 'ready',
    },
];

// ============================================
// CATEGORY COLORS
// ============================================

const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
        'Patient Flow': 'bg-blue-100 text-blue-700',
        Patients: 'bg-indigo-100 text-indigo-700',
        Visits: 'bg-green-100 text-green-700',
        Appointments: 'bg-purple-100 text-purple-700',
        Financial: 'bg-yellow-100 text-yellow-700',
        Operations: 'bg-gray-100 text-gray-700',
    };

    return colors[category] || 'bg-gray-100 text-gray-700';
};

// ============================================
// MAIN COMPONENT
// ============================================

export default function Reports() {
    const [selectedReport, setSelectedReport] = useState<Report | null>(
        null,
    );

    const handleRunReport = (report: Report) => {
        setSelectedReport(report);

        // Connect this to your backend later:
        //
        // Http.post(`reception/reports/${report.id}`, {
        //     from,
        //     to,
        // });
    };

    const columns: Column<Report>[] = [
        {
            id: 'name',
            label: 'Report',
            minWidth: 280,
            sortable: true,
            format: (value: string, row: Report) => (
                <div className="flex items-center gap-3">
                    <div
                        className={`rounded-lg p-2 ${getCategoryColor(
                            row.category,
                        )}`}
                    >
                        {iconMap[row.icon] || (
                            <FileText className="h-5 w-5" />
                        )}
                    </div>

                    <div>
                        <p className="text-sm font-medium text-gray-900">
                            {row.name}
                        </p>
                    </div>
                </div>
            ),
        },
        {
            id: 'category',
            label: 'Category',
            minWidth: 140,
            sortable: true,
            format: (value: string) => (
                <span
                    className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${getCategoryColor(
                        value,
                    )}`}
                >
                    {value}
                </span>
            ),
        },
        {
            id: 'description',
            label: 'Description',
            minWidth: 320,
            format: (value: string) => (
                <span className="text-sm text-gray-500">
                    {value}
                </span>
            ),
        },
        {
            id: 'frequency',
            label: 'Frequency',
            minWidth: 110,
            align: 'center',
            sortable: true,
            format: (value: string) => (
                <span className="text-sm text-gray-600">
                    {value}
                </span>
            ),
        },
        {
            id: 'status',
            label: 'Status',
            minWidth: 100,
            align: 'center',
            sortable: true,
            format: (value: string) => (
                <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-700">
                    <span className="h-1.5 w-1.5 rounded-full bg-current" />
                    Ready
                </span>
            ),
        },
    ];

    const actions: Action<Report>[] = [
        {
            label: 'Run Report',
            icon: <FileText className="h-4 w-4" />,
            color: 'primary',
            variant: 'contained',
            onClick: handleRunReport,
        },
    ];

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Reception Reports" />

            <div className="min-h-screen bg-slate-100">
                <div className="p-4">
                    <PageHeader
                        title="Reception Reports"
                        icon={<BarChart3 />}
                        subtitle="Patient flow, visits, appointments and reception operations"
                    />

                    <div className="mt-4 overflow-hidden rounded-lg shadow-sm">
                        <ReusableTable
                            columns={columns}
                            data={reports}
                            actions={actions}
                            title="Available Reports"
                            searchPlaceholder="Search reports..."
                            defaultRowsPerPage={10}
                            defaultOrderBy="name"
                            defaultOrder="asc"
                            emptyMessage="No reports found"
                            filterPlaceholder="Filter reports..."
                        />
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}
