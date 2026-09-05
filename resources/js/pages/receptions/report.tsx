import { Head } from '@inertiajs/react';
import { Activity, BarChart3, Clock, FileText, Users } from 'lucide-react';
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
    { title: 'Nurses', href: '/nurses' },
    { title: 'Reports', href: '/nurses/reports' },
];

// ============================================
// ICON MAP
// ============================================

const iconMap: Record<string, React.ReactNode> = {
    Activity: <Activity className="h-5 w-5" />,
    Clock: <Clock className="h-5 w-5" />,
    Users: <Users className="h-5 w-5" />,
    FileText: <FileText className="h-5 w-5" />,
};

// ============================================
// NURSING REPORTS
// ============================================

const reports: Report[] = [
    {
        id: 'nursing-activity',
        name: 'Nursing Activity & Workload Report',
        category: 'Clinical Operations',
        description:
            'Summary of patients cared for, nursing assessments, procedures, interventions, tasks and overall nursing workload',
        icon: 'Activity',
        frequency: 'Daily',
        last_run: null,
        status: 'ready',
    },
    {
        id: 'nursing-attendance',
        name: 'Nursing Attendance & Shift Report',
        category: 'Workforce',
        description:
            'Nurse clock-in and clock-out times, hours worked, late arrivals, overtime and shift attendance',
        icon: 'Clock',
        frequency: 'Daily',
        last_run: null,
        status: 'ready',
    },
];

// ============================================
// CATEGORY COLORS
// ============================================

const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
        'Clinical Operations': 'bg-blue-100 text-blue-700',
        Workforce: 'bg-purple-100 text-purple-700',
    };

    return colors[category] || 'bg-gray-100 text-gray-700';
};

// ============================================
// MAIN COMPONENT
// ============================================

export default function Reports() {
    const [selectedReport, setSelectedReport] = useState<Report | null>(null);

    const handleRunReport = (report: Report) => {
        setSelectedReport(report);

        // Connect this to your backend later:
        //
        // router.post(`/nurses/reports/${report.id}`, {
        //     from,
        //     to,
        // });
    };

    const columns: Column<Report>[] = [
        {
            id: 'name',
            label: 'Report',
            minWidth: 300,
            sortable: true,
            format: (value: string, row: Report) => (
                <div className="flex items-center gap-3">
                    <div
                        className={`rounded-lg p-2 ${getCategoryColor(
                            row.category,
                        )}`}
                    >
                        {iconMap[row.icon] || <FileText className="h-5 w-5" />}
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
            minWidth: 160,
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
            minWidth: 380,
            format: (value: string) => (
                <span className="text-sm text-gray-500">{value}</span>
            ),
        },
        {
            id: 'frequency',
            label: 'Frequency',
            minWidth: 110,
            align: 'center',
            sortable: true,
            format: (value: string) => (
                <span className="text-sm text-gray-600">{value}</span>
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
            <Head title="Nursing Reports" />

            <div className="min-h-screen bg-slate-100">
                <div className="p-4">
                    <PageHeader
                        title="Nursing Reports"
                        icon={<BarChart3 />}
                        subtitle="Nursing activity, workload, attendance and shift performance"
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
