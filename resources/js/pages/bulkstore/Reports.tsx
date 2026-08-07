// resources/js/pages/bulkstore/Reports.tsx

import { Dialog, Transition } from '@headlessui/react';
import { Head } from '@inertiajs/react';
import axios from 'axios';
import { format } from 'date-fns';
import {
    Package,
    TrendingUp,
    TrendingDown,
    AlertTriangle,
    AlertCircle,
    FileText,
    Download,
    RefreshCw,
    Eye,
    Building2,
    X,
    Loader2,
    Box,
    Truck,
    DollarSign,
    ClipboardCheck,
    Archive,
    BarChart3,
    PieChart,
    Activity,
    FileSpreadsheet,
    FileDown,
    Printer,
} from 'lucide-react';
import React, { useState } from 'react';
import { toast } from 'react-hot-toast';
import PageHeader from '@/components/PageHeader'
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

interface ReportFilters {
    date_from?: string;
    date_to?: string;
    department_id?: number;
    product_id?: number;
    format?: 'pdf' | 'excel' | 'csv';
}

// ============================================
// BREADCRUMBS
// ============================================

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Bulk Store',
        href: '/bulkstore',
    },
    {
        title: 'Reports',
        href: '/bulkstore/reports',
    },
];

// ============================================
// ICON MAP
// ============================================

const iconMap: Record<string, React.ReactNode> = {
    Package: <Package className="h-5 w-5" />,
    TrendingUp: <TrendingUp className="h-5 w-5" />,
    TrendingDown: <TrendingDown className="h-5 w-5" />,
    AlertTriangle: <AlertTriangle className="h-5 w-5" />,
    AlertCircle: <AlertCircle className="h-5 w-5" />,
    FileText: <FileText className="h-5 w-5" />,
    Box: <Box className="h-5 w-5" />,
    Truck: <Truck className="h-5 w-5" />,
    DollarSign: <DollarSign className="h-5 w-5" />,
    ClipboardCheck: <ClipboardCheck className="h-5 w-5" />,
    Archive: <Archive className="h-5 w-5" />,
    BarChart3: <BarChart3 className="h-5 w-5" />,
    PieChart: <PieChart className="h-5 w-5" />,
    Activity: <Activity className="h-5 w-5" />,
    Building2: <Building2 className="h-5 w-5" />,
};

// ============================================
// MAIN COMPONENT
// ============================================

export default function Reports() {
    const [loading, setLoading] = useState(false);
    const [selectedReport, setSelectedReport] = useState<Report | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [filters, setFilters] = useState<ReportFilters>({});
    const [generating, setGenerating] = useState(false);

    // Report data
    const reports: Report[] = [
        // Inventory Reports
        {
            id: 'current-stock',
            name: 'Current Stock Report',
            category: 'Inventory',
            description: 'Snapshot of all current inventory with quantities and values',
            icon: 'Package',
            frequency: 'Daily',
            last_run: '2026-07-25 08:30',
            status: 'ready',
        },
        {
            id: 'stock-level',
            name: 'Stock Level Report',
            category: 'Inventory',
            description: 'Products with current stock levels vs reorder points',
            icon: 'BarChart3',
            frequency: 'Daily',
            last_run: '2026-07-24 16:45',
            status: 'ready',
        },
        {
            id: 'slow-moving',
            name: 'Slow-Moving Stock Report',
            category: 'Inventory',
            description: 'Products with low turnover (60+ days in stock)',
            icon: 'TrendingDown',
            frequency: 'Monthly',
            last_run: '2026-07-01 09:00',
            status: 'ready',
        },
        {
            id: 'fast-moving',
            name: 'Fast-Moving Stock Report',
            category: 'Inventory',
            description: 'High turnover products requiring frequent reordering',
            icon: 'TrendingUp',
            frequency: 'Monthly',
            last_run: '2026-07-01 09:30',
            status: 'ready',
        },
        {
            id: 'dead-stock',
            name: 'Dead Stock Report',
            category: 'Inventory',
            description: 'Products with no movement in 90+ days',
            icon: 'Archive',
            frequency: 'Quarterly',
            last_run: '2026-06-30 10:00',
            status: 'ready',
        },
        {
            id: 'expiry',
            name: 'Expiry Report',
            category: 'Inventory',
            description: 'Products nearing expiry (30/60/90 days)',
            icon: 'AlertCircle',
            frequency: 'Weekly',
            last_run: '2026-07-22 08:00',
            status: 'ready',
        },
        {
            id: 'valuation',
            name: 'Stock Valuation Report',
            category: 'Inventory',
            description: 'Total inventory value by product and department',
            icon: 'DollarSign',
            frequency: 'Monthly',
            last_run: '2026-07-01 11:00',
            status: 'ready',
        },
        // Stock Movement Reports
        {
            id: 'stock-movements',
            name: 'Stock Movement Report',
            category: 'Movements',
            description: 'All stock movements within date range',
            icon: 'Activity',
            frequency: 'Daily',
            last_run: '2026-07-25 07:00',
            status: 'ready',
        },
        {
            id: 'receiving',
            name: 'Receiving Report',
            category: 'Movements',
            description: 'All goods received from suppliers',
            icon: 'Truck',
            frequency: 'Daily',
            last_run: '2026-07-25 07:15',
            status: 'ready',
        },
        {
            id: 'issuing',
            name: 'Issuing Report',
            category: 'Movements',
            description: 'All goods issued to departments',
            icon: 'Box',
            frequency: 'Daily',
            last_run: '2026-07-25 07:30',
            status: 'ready',
        },
        {
            id: 'transfers',
            name: 'Transfer Report',
            category: 'Movements',
            description: 'Inter-department stock transfers',
            icon: 'Activity',
            frequency: 'Weekly',
            last_run: '2026-07-24 08:00',
            status: 'ready',
        },
        {
            id: 'adjustments',
            name: 'Adjustment Report',
            category: 'Movements',
            description: 'All stock adjustments with reasons',
            icon: 'AlertTriangle',
            frequency: 'Weekly',
            last_run: '2026-07-24 08:30',
            status: 'ready',
        },
        // Requisition Reports
        {
            id: 'requisition-status',
            name: 'Requisition Status Report',
            category: 'Requisitions',
            description: 'All requisitions by status (pending/approved/fulfilled)',
            icon: 'ClipboardCheck',
            frequency: 'Daily',
            last_run: '2026-07-25 06:00',
            status: 'ready',
        },
        {
            id: 'department-consumption',
            name: 'Department Consumption Report',
            category: 'Requisitions',
            description: 'Products consumed by each department',
            icon: 'Building2',
            frequency: 'Monthly',
            last_run: '2026-07-01 12:00',
            status: 'ready',
        },
        {
            id: 'fulfillment-rate',
            name: 'Fulfillment Rate Report',
            category: 'Requisitions',
            description: 'Requisition fulfillment rate by department',
            icon: 'PieChart',
            frequency: 'Weekly',
            last_run: '2026-07-24 09:00',
            status: 'ready',
        },
        // Financial Reports
        {
            id: 'budget-vs-actual',
            name: 'Budget vs Actual Report',
            category: 'Financial',
            description: 'Budget allocation vs actual consumption by department',
            icon: 'DollarSign',
            frequency: 'Monthly',
            last_run: '2026-07-01 14:00',
            status: 'ready',
        },
        {
            id: 'supplier-spend',
            name: 'Supplier Spend Report',
            category: 'Financial',
            description: 'Total spend by supplier',
            icon: 'FileText',
            frequency: 'Quarterly',
            last_run: '2026-06-30 15:00',
            status: 'ready',
        },
    ];

    // Categories for filtering
    const categoryOptions = [
        { value: 'all', label: 'All Categories' },
        { value: 'Inventory', label: 'Inventory' },
        { value: 'Movements', label: 'Stock Movements' },
        { value: 'Requisitions', label: 'Requisitions' },
        { value: 'Financial', label: 'Financial' },
    ];

    // Frequency options for filtering
    const frequencyOptions = [
        { value: 'all', label: 'All Frequencies' },
        { value: 'Daily', label: 'Daily' },
        { value: 'Weekly', label: 'Weekly' },
        { value: 'Monthly', label: 'Monthly' },
        { value: 'Quarterly', label: 'Quarterly' },
    ];

    // ============================================
    // HANDLERS
    // ============================================

    const handleRunReport = async () => {
        if (!selectedReport) return;

        setGenerating(true);
        try {
            const response = await axios.post(`/api/bulkstore/reports/${selectedReport.id}`, filters, {
                responseType: 'blob',
            });

            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `${selectedReport.id}-${format(new Date(), 'yyyy-MM-dd')}.${filters.format || 'pdf'}`);
            document.body.appendChild(link);
            link.click();
            link.remove();

            toast.success('Report generated successfully');
            setIsModalOpen(false);
        } catch (error) {
            console.error('Failed to generate report:', error);
            toast.error('Failed to generate report');
        } finally {
            setGenerating(false);
        }
    };

    const handleOpenModal = (report: Report) => {
        setSelectedReport(report);
        setFilters({ format: 'pdf' });
        setIsModalOpen(true);
    };

    const formatDate = (date: string | null) => {
        if (!date) return 'Never';
        try {
            return format(new Date(date), 'dd MMM yyyy HH:mm');
        } catch {
            return date;
        }
    };

    const getCategoryColor = (category: string) => {
        const colors: Record<string, string> = {
            Inventory: 'bg-blue-100 text-blue-700',
            Movements: 'bg-green-100 text-green-700',
            Requisitions: 'bg-purple-100 text-purple-700',
            Financial: 'bg-yellow-100 text-yellow-700',
        };
        return colors[category] || 'bg-gray-100 text-gray-700';
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'ready':
                return {
                    label: 'Ready',
                    color: 'success',
                    icon: 'check-circle',
                };
            case 'generating':
                return {
                    label: 'Generating',
                    color: 'warning',
                    icon: 'loader',
                };
            case 'error':
                return {
                    label: 'Error',
                    color: 'error',
                    icon: 'alert-triangle',
                };
            default:
                return {
                    label: 'Unknown',
                    color: 'default',
                    icon: 'help-circle',
                };
        }
    };

    // ============================================
    // COLUMNS DEFINITION
    // ============================================

    const columns: Column<Report>[] = [
        {
            id: 'name',
            label: 'Report',
            minWidth: 250,
            sortable: true,
            format: (value: string, row: Report) => (
                <div className="flex items-center gap-3">
                    <div className={`rounded-lg p-2 ${getCategoryColor(row.category)}`}>
                        {iconMap[row.icon] || <FileText className="h-5 w-5" />}
                    </div>
                    <div>
                        <p className="text-sm font-medium text-gray-900">{row.name}</p>
                    </div>
                </div>
            ),
        },
        {
            id: 'category',
            label: 'Category',
            minWidth: 120,
            sortable: true,
            format: (value: string) => (
                <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${getCategoryColor(value)}`}>
                    {value}
                </span>
            ),
        },
        {
            id: 'description',
            label: 'Description',
            minWidth: 250,
            format: (value: string) => (
                <span className="text-sm text-gray-500">{value}</span>
            ),
        },
        {
            id: 'frequency',
            label: 'Frequency',
            minWidth: 100,
            align: 'center',
            sortable: true,
            format: (value: string) => (
                <span className="text-sm text-gray-600">{value}</span>
            ),
        },
        {
            id: 'last_run',
            label: 'Last Run',
            minWidth: 150,
            align: 'center',
            sortable: true,
            format: (value: string | null) => (
                <span className="text-sm text-gray-500">{formatDate(value)}</span>
            ),
        },
        {
            id: 'status',
            label: 'Status',
            minWidth: 100,
            align: 'center',
            sortable: true,
            format: (value: string) => {
                const status = getStatusBadge(value);
                const statusColors: Record<string, string> = {
                    success: 'bg-green-100 text-green-700',
                    warning: 'bg-yellow-100 text-yellow-700',
                    error: 'bg-red-100 text-red-700',
                    default: 'bg-gray-100 text-gray-700',
                };
                return (
                    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${statusColors[status.color]}`}>
                        <span className="h-1.5 w-1.5 rounded-full bg-current" />
                        {status.label}
                    </span>
                );
            },
        },
    ];

    // ============================================
    // ACTIONS DEFINITION
    // ============================================

    const actions: Action<Report>[] = [
        {
            label: 'Run Report',
            icon: <Eye className="w-4 h-4" />,
            color: 'primary',
            variant: 'contained',
            onClick: handleOpenModal,
        },
    ];

    // ============================================
    // RENDER
    // ============================================

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Reports" />

            <div className="bg-slate-100 min-h-screen">
                <div className="p-4">
                    {/* Header */}
                 
                    <PageHeader title="Report Managements" icon={<BarChart3 />} subtitle={"Manage department reports quartely, monthly and yearly"}/>

                    {/* Reusable Table */}
                    <div className="w-full rounded-lg  shadow-sm overflow-hidden ">
                        <ReusableTable
                            columns={columns}
                            data={reports}
                            actions={actions}
                            title="Available Reports"
                            searchPlaceholder="Search reports..."
                            defaultRowsPerPage={8}
                            defaultOrderBy="name"
                            defaultOrder="asc"
                            emptyMessage="No reports found"
                            filterPlaceholder="Filter reports..."
                        />
                    </div>
                </div>
            </div>

            {/* ========================================== */}
            {/* RUN REPORT MODAL */}
            {/* ========================================== */}
            <Transition show={isModalOpen} as={React.Fragment}>
                <Dialog as="div" className="relative z-50" onClose={() => setIsModalOpen(false)}>
                    <Transition.Child
                        as={React.Fragment}
                        enter="ease-out duration-300"
                        enterFrom="opacity-0"
                        enterTo="opacity-100"
                        leave="ease-in duration-200"
                        leaveFrom="opacity-100"
                        leaveTo="opacity-0"
                    >
                        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" />
                    </Transition.Child>

                    <div className="fixed inset-0 overflow-y-auto">
                        <div className="flex min-h-full items-center justify-center p-4">
                            <Transition.Child
                                as={React.Fragment}
                                enter="ease-out duration-300"
                                enterFrom="opacity-0 scale-95"
                                enterTo="opacity-100 scale-100"
                                leave="ease-in duration-200"
                                leaveFrom="opacity-100 scale-100"
                                leaveTo="opacity-0 scale-95"
                            >
                                <Dialog.Panel className="relative w-full max-w-md transform overflow-hidden rounded-xl bg-white shadow-2xl transition-all">
                                    {/* Header */}
                                    <div className="px-6 py-4 border-b border-gray-200 bg-white rounded-t-xl">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <div className="rounded-lg bg-blue-50 p-2">
                                                    {selectedReport && iconMap[selectedReport.icon]}
                                                </div>
                                                <div>
                                                    <Dialog.Title className="text-lg font-semibold text-gray-900">
                                                        Run Report
                                                    </Dialog.Title>
                                                    <p className="text-sm text-gray-500">
                                                        {selectedReport?.name}
                                                    </p>
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => setIsModalOpen(false)}
                                                className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
                                            >
                                                <X className="h-5 w-5" />
                                            </button>
                                        </div>
                                    </div>

                                    {/* Body */}
                                    <div className="px-6 py-4 space-y-4">
                                        {/* Date Range */}
                                        <div>
                                            <label className="block text-xs font-medium text-gray-700 mb-1">
                                                Date Range
                                            </label>
                                            <div className="grid grid-cols-2 gap-2">
                                                <div>
                                                    <label className="block text-xs text-gray-500 mb-0.5">From</label>
                                                    <input
                                                        type="date"
                                                        value={filters.date_from || ''}
                                                        onChange={(e) => setFilters({ ...filters, date_from: e.target.value })}
                                                        className="w-full rounded border border-gray-300 px-3 py-1.5 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-xs text-gray-500 mb-0.5">To</label>
                                                    <input
                                                        type="date"
                                                        value={filters.date_to || ''}
                                                        onChange={(e) => setFilters({ ...filters, date_to: e.target.value })}
                                                        className="w-full rounded border border-gray-300 px-3 py-1.5 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                                                    />
                                                </div>
                                            </div>
                                        </div>

                                        {/* Export Format */}
                                        <div>
                                            <label className="block text-xs font-medium text-gray-700 mb-1">
                                                Export Format
                                            </label>
                                            <div className="grid grid-cols-3 gap-2">
                                                <button
                                                    onClick={() => setFilters({ ...filters, format: 'pdf' })}
                                                    className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                                                        filters.format === 'pdf' || !filters.format
                                                            ? 'bg-blue-600 text-white'
                                                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                                    }`}
                                                >
                                                    <FileText className="h-4 w-4 mx-auto mb-1" />
                                                    PDF
                                                </button>
                                                <button
                                                    onClick={() => setFilters({ ...filters, format: 'excel' })}
                                                    className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                                                        filters.format === 'excel'
                                                            ? 'bg-green-600 text-white'
                                                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                                    }`}
                                                >
                                                    <FileSpreadsheet className="h-4 w-4 mx-auto mb-1" />
                                                    Excel
                                                </button>
                                                <button
                                                    onClick={() => setFilters({ ...filters, format: 'csv' })}
                                                    className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                                                        filters.format === 'csv'
                                                            ? 'bg-blue-600 text-white'
                                                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                                    }`}
                                                >
                                                    <FileText className="h-4 w-4 mx-auto mb-1" />
                                                    CSV
                                                </button>
                                            </div>
                                        </div>

                                        {/* Additional Info */}
                                        <div className="rounded-lg bg-gray-50 p-3 text-xs text-gray-500 space-y-1">
                                            <p>Report: <span className="font-medium text-gray-700">{selectedReport?.name}</span></p>
                                            <p>Category: <span className="font-medium text-gray-700">{selectedReport?.category}</span></p>
                                            <p>Frequency: <span className="font-medium text-gray-700">{selectedReport?.frequency}</span></p>
                                            <p>Last run: <span className="font-medium text-gray-700">{formatDate(selectedReport?.last_run || null)}</span></p>
                                        </div>
                                    </div>

                                    {/* Footer */}
                                    <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 rounded-b-xl">
                                        <div className="flex justify-end gap-3">
                                            <button
                                                onClick={() => setIsModalOpen(false)}
                                                className="rounded-lg px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 transition-colors"
                                                disabled={generating}
                                            >
                                                Cancel
                                            </button>
                                            <button
                                                onClick={handleRunReport}
                                                disabled={generating}
                                                className={`flex items-center gap-2 rounded-lg px-6 py-2 text-sm font-medium text-white transition-colors ${
                                                    generating
                                                        ? 'bg-gray-400 cursor-not-allowed'
                                                        : 'bg-blue-600 hover:bg-blue-700'
                                                }`}
                                            >
                                                {generating ? (
                                                    <>
                                                        <Loader2 className="h-4 w-4 animate-spin" />
                                                        Generating...
                                                    </>
                                                ) : (
                                                    <>
                                                        <Download className="h-4 w-4" />
                                                        Generate Report
                                                    </>
                                                )}
                                            </button>
                                        </div>
                                    </div>
                                </Dialog.Panel>
                            </Transition.Child>
                        </div>
                    </div>
                </Dialog>
            </Transition>
        </AppLayout>
    );
}