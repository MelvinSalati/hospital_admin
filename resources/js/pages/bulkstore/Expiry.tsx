// resources/js/pages/bulkstore/Expiry.tsx

import { Dialog, Transition } from '@headlessui/react';
import { Head, usePage, router } from '@inertiajs/react';
import { format } from 'date-fns';
import {
    AlertCircle,
    AlertTriangle,
    CheckCircle,
    Clock,
    Calendar,
    Eye,
    Printer,
    Download,
    RefreshCw,
    XCircle,
    AlertOctagon,
    X,
    Package,
    Building2,
    Users,
    DollarSign,
    Tag,
    TrendingUp,
    TrendingDown,
} from 'lucide-react';
import React, { useState } from 'react';
import { toast } from 'react-hot-toast';
import PageHeader from '@/components/PageHeader';
import type { Column, Action } from '@/components/ReusableTable';
import { ReusableTable } from '@/components/ReusableTable';
import AppLayout from '@/layouts/app-layout';
import type { BreadcrumbItem } from '@/types';

// ============================================
// TYPES
// ============================================

interface ExpiryItem {
    id: number;
    product_id: number;
    product_name: string;
    product_code: string;
    batch_number: string;
    supplier_id: number;
    supplier_name: string;
    quantity: number;
    remaining_quantity: number;
    unit_cost: number;
    total_value: number;
    expiry_date: string;
    days_until_expiry: number;
    status: 'critical' | 'warning' | 'ok' | 'expired';
    location: string;
    department_id: number;
    department_name: string;
    received_at: string;
    created_at: string;
}

interface Summary {
    total_products: number;
    total_batches: number;
    expired_batches: number;
    critical_batches: number;
    warning_batches: number;
    ok_batches: number;
    total_value: number;
}

interface ExpiryModalProps {
    isOpen: boolean;
    onClose: () => void;
    item: ExpiryItem | null;
}

// Page Props Type
interface PageProps {
    expiryItems: ExpiryItem[];
    summary: Summary | null;
    filters?: {
        search?: string;
        status?: string;
    };
    error?: string;
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
        title: 'Expiry',
        href: '/bulkstore/expiry',
    },
];

// ============================================
// EXPIRY DETAILS MODAL
// ============================================

function ExpiryDetailsModal({ isOpen, onClose, item }: ExpiryModalProps) {
    if (!item) return null;

    const formatDate = (date: string) => {
        try {
            return format(new Date(date), 'dd MMM yyyy');
        } catch {
            return date;
        }
    };

    const getStatusConfig = (status: string) => {
        const configs = {
            critical: {
                label: 'Critical',
                color: 'bg-red-50 text-red-700 border-red-200',
                icon: AlertOctagon,
            },
            warning: {
                label: 'Warning',
                color: 'bg-yellow-50 text-yellow-700 border-yellow-200',
                icon: AlertTriangle,
            },
            ok: {
                label: 'Healthy',
                color: 'bg-green-50 text-green-700 border-green-200',
                icon: CheckCircle,
            },
            expired: {
                label: 'Expired',
                color: 'bg-gray-50 text-gray-700 border-gray-200',
                icon: XCircle,
            },
        };
        return configs[status as keyof typeof configs] || configs.ok;
    };

    const statusConfig = getStatusConfig(item.status);
    const StatusIcon = statusConfig.icon;

    // Status message helper
    const getStatusMessage = () => {
        const messages = {
            critical: `⚠️ Expires in ${item.days_until_expiry} days — Immediate action required!`,
            warning: `📋 Expires in ${item.days_until_expiry} days — Plan for use or disposal.`,
            ok: `✅ Expires in ${item.days_until_expiry} days — Stock is healthy.`,
            expired: `❌ This batch has expired and should be disposed of immediately.`,
        };
        return messages[item.status as keyof typeof messages] || messages.ok;
    };

    return (
        <Transition show={isOpen} as={React.Fragment}>
            <Dialog as="div" className="relative z-50" onClose={onClose}>
                <Transition.Child
                    as={React.Fragment}
                    enter="ease-out duration-300"
                    enterFrom="opacity-0"
                    enterTo="opacity-100"
                    leave="ease-in duration-200"
                    leaveFrom="opacity-100"
                    leaveTo="opacity-0"
                >
                    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" />
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
                            <Dialog.Panel className="relative w-full max-w-xl transform overflow-hidden rounded-2xl bg-white shadow-2xl transition-all">
                                {/* Header */}
                                <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
                                    <div className="flex items-center gap-3">
                                        <div
                                            className={`rounded-lg p-2 ${statusConfig.color}`}
                                        >
                                            <StatusIcon className="h-5 w-5" />
                                        </div>
                                        <div>
                                            <Dialog.Title className="text-base font-semibold text-gray-900">
                                                Batch Details
                                            </Dialog.Title>
                                            <p className="text-xs text-gray-500">
                                                {item.product_name} · #
                                                {item.batch_number}
                                            </p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={onClose}
                                        className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
                                    >
                                        <X className="h-4 w-4" />
                                    </button>
                                </div>

                                {/* Body */}
                                <div className="space-y-5 p-6">
                                    {/* Status Banner */}
                                    <div
                                        className={`rounded-lg border p-3 ${statusConfig.color}`}
                                    >
                                        <p className="text-sm font-medium">
                                            {getStatusMessage()}
                                        </p>
                                    </div>

                                    {/* Info Grid - 3 columns */}
                                    <div className="grid grid-cols-3 gap-3">
                                        <div className="rounded-lg bg-gray-50 p-3 text-center">
                                            <p className="text-[10px] tracking-wider text-gray-500 uppercase">
                                                Product
                                            </p>
                                            <p className="mt-0.5 truncate text-sm font-semibold text-gray-900">
                                                {item.product_name}
                                            </p>
                                            <p className="text-[10px] text-gray-400">
                                                {item.product_code}
                                            </p>
                                        </div>
                                        <div className="rounded-lg bg-gray-50 p-3 text-center">
                                            <p className="text-[10px] tracking-wider text-gray-500 uppercase">
                                                Batch
                                            </p>
                                            <p className="mt-0.5 font-mono text-sm font-semibold text-gray-900">
                                                {item.batch_number}
                                            </p>
                                        </div>
                                        <div className="rounded-lg bg-gray-50 p-3 text-center">
                                            <p className="text-[10px] tracking-wider text-gray-500 uppercase">
                                                Status
                                            </p>
                                            <span
                                                className={`mt-0.5 inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${statusConfig.color}`}
                                            >
                                                <span className="h-1.5 w-1.5 rounded-full bg-current" />
                                                {statusConfig.label}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Info Grid - 2 columns */}
                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="rounded-lg bg-gray-50 p-3 text-center">
                                            <p className="text-[10px] tracking-wider text-gray-500 uppercase">
                                                Supplier
                                            </p>
                                            <p className="mt-0.5 truncate text-sm font-medium text-gray-900">
                                                {item.supplier_name}
                                            </p>
                                        </div>
                                        <div className="rounded-lg bg-gray-50 p-3 text-center">
                                            <p className="text-[10px] tracking-wider text-gray-500 uppercase">
                                                Quantity
                                            </p>
                                            <p className="mt-0.5 text-sm font-semibold text-gray-900">
                                                {item.remaining_quantity}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Dates */}
                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="flex items-center justify-center gap-2 rounded-lg bg-gray-50 p-3">
                                            <Calendar className="h-4 w-4 text-gray-400" />
                                            <div>
                                                <p className="text-[10px] tracking-wider text-gray-500 uppercase">
                                                    Expiry
                                                </p>
                                                <p className="text-sm font-medium text-gray-900">
                                                    {formatDate(
                                                        item.expiry_date,
                                                    )}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex items-center justify-center gap-2 rounded-lg bg-gray-50 p-3">
                                            <Clock className="h-4 w-4 text-gray-400" />
                                            <div>
                                                <p className="text-[10px] tracking-wider text-gray-500 uppercase">
                                                    Created
                                                </p>
                                                <p className="text-sm font-medium text-gray-900">
                                                    {formatDate(
                                                        item.created_at,
                                                    )}
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Days Left - Full width */}
                                    <div
                                        className={`rounded-lg p-3 text-center ${
                                            item.days_until_expiry < 0
                                                ? 'bg-gray-100'
                                                : item.days_until_expiry < 30
                                                  ? 'bg-red-100'
                                                  : item.days_until_expiry < 90
                                                    ? 'bg-yellow-100'
                                                    : 'bg-green-100'
                                        }`}
                                    >
                                        <p className="text-[10px] tracking-wider text-gray-600 uppercase">
                                            Days Until Expiry
                                        </p>
                                        <p
                                            className={`text-2xl font-bold ${
                                                item.days_until_expiry < 0
                                                    ? 'text-gray-600'
                                                    : item.days_until_expiry <
                                                        30
                                                      ? 'text-red-600'
                                                      : item.days_until_expiry <
                                                          90
                                                        ? 'text-yellow-600'
                                                        : 'text-green-600'
                                            }`}
                                        >
                                            {item.days_until_expiry < 0
                                                ? 'Expired'
                                                : item.days_until_expiry}
                                        </p>
                                    </div>
                                </div>

                                {/* Footer */}
                                <div className="flex justify-end gap-2 border-t border-gray-100 bg-gray-50 px-6 py-3">
                                    <button
                                        onClick={onClose}
                                        className="rounded-lg px-4 py-1.5 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-200"
                                    >
                                        Close
                                    </button>
                                    <button className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-1.5 text-sm font-medium text-white transition-colors hover:bg-blue-700">
                                        <Printer className="h-3.5 w-3.5" />
                                        Print
                                    </button>
                                </div>
                            </Dialog.Panel>
                        </Transition.Child>
                    </div>
                </div>
            </Dialog>
        </Transition>
    );
}
// ============================================
// MAIN COMPONENT
// ============================================

export default function Expiry() {
    // Get data from Inertia props
    const {
        expiryItems,
        summary,
        filters = {},
        error,
    } = usePage<PageProps>().props;

    // State
    const [items] = useState<ExpiryItem[]>(expiryItems || []);
    const [loading, setLoading] = useState(false);
    const [selectedItem, setSelectedItem] = useState<ExpiryItem | null>(null);
    const [showModal, setShowModal] = useState(false);
    const [searchTerm, setSearchTerm] = useState(filters.search || '');
    const [statusFilter, setStatusFilter] = useState(filters.status || '');

    // Handle refresh using Inertia
    const handleRefresh = () => {
        setLoading(true);
        router.reload({
            only: ['expiryItems', 'summary', 'filters'],
            onFinish: () => setLoading(false),
        });
    };

    // Handle search
    const handleSearch = (value: string) => {
        setSearchTerm(value);
        router.get(
            '/bulkstore/expiry',
            { search: value, status: statusFilter },
            {
                preserveState: true,
                preserveScroll: true,
                only: ['expiryItems', 'summary', 'filters'],
            },
        );
    };

    // Handle status filter
    const handleStatusFilter = (value: string) => {
        setStatusFilter(value);
        router.get(
            '/bulkstore/expiry',
            { search: searchTerm, status: value },
            {
                preserveState: true,
                preserveScroll: true,
                only: ['expiryItems', 'summary', 'filters'],
            },
        );
    };

    // Handlers
    const handleView = (item: ExpiryItem) => {
        setSelectedItem(item);
        setShowModal(true);
    };

    const formatDate = (date: string) => {
        try {
            return format(new Date(date), 'dd MMM yyyy');
        } catch {
            return date;
        }
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-ZM', {
            style: 'currency',
            currency: 'ZMW',
            minimumFractionDigits: 2,
        }).format(amount || 0);
    };

    const getStatusBadge = (status: string) => {
        const configs = {
            critical: { label: 'Critical', color: 'bg-red-100 text-red-700' },
            warning: {
                label: 'Warning',
                color: 'bg-yellow-100 text-yellow-700',
            },
            ok: { label: 'OK', color: 'bg-green-100 text-green-700' },
            expired: { label: 'Expired', color: 'bg-gray-100 text-gray-700' },
        };
        const config = configs[status as keyof typeof configs] || configs.ok;
        return (
            <span
                className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${config.color}`}
            >
                <span className="h-1.5 w-1.5 rounded-full bg-current" />
                {config.label}
            </span>
        );
    };

    // Columns
    const columns: Column<ExpiryItem>[] = [
        {
            id: 'product_name',
            label: 'Product',
            minWidth: 150,
            format: (value, row) => (
                <div>
                    <p className="text-sm font-medium text-gray-900">{value}</p>
                    <p className="text-xs text-gray-500">{row.product_code}</p>
                </div>
            ),
        },
        {
            id: 'batch_number',
            label: 'Batch #',
            minWidth: 100,
            format: (value) => (
                <span className="font-mono text-sm text-gray-700">
                    {value || 'N/A'}
                </span>
            ),
        },
        {
            id: 'supplier_name',
            label: 'Supplier',
            minWidth: 120,
            format: (value) => (
                <span className="text-sm">{value || 'N/A'}</span>
            ),
        },
        {
            id: 'remaining_quantity',
            label: 'Qty',
            minWidth: 60,
            align: 'center',
            format: (value) => (
                <span className="font-medium">{value || 0}</span>
            ),
        },

        {
            id: 'expiry_date',
            label: 'Expiry Date',
            minWidth: 100,
            align: 'center',
            sortable: true,
            format: (value) => (value ? formatDate(value) : 'N/A'),
        },
        {
            id: 'days_until_expiry',
            label: 'Days Left',
            minWidth: 80,
            align: 'center',
            sortable: true,
            format: (value) => {
                const days = Number(value);
                if (isNaN(days))
                    return <span className="text-gray-400">N/A</span>;
                if (days < 0)
                    return (
                        <span className="font-bold text-gray-500">Expired</span>
                    );
                let color = 'text-green-600';
                if (days < 30) color = 'text-red-600';
                else if (days < 90) color = 'text-yellow-600';
                return <span className={`font-bold ${color}`}>{days}</span>;
            },
        },
        {
            id: 'status',
            label: 'Status',
            minWidth: 100,
            align: 'center',
            filterType: 'status',
            statusColors: {
                critical: 'error',
                warning: 'warning',
                ok: 'success',
                expired: 'default',
            },
            format: (value) => getStatusBadge(value),
        },
        {
            id: 'department_name',
            label: 'Department',
            minWidth: 120,
            format: (value) => (
                <span className="text-sm">{value || 'Bulk Store'}</span>
            ),
        },
    ];

    // Actions
    const actions: Action<ExpiryItem>[] = [
        {
            label: 'View Details',
            icon: <Eye className="h-4 w-4" />,
            color: 'primary',
            variant: 'text',
            onClick: handleView,
        },
    ];

    // Status options for filtering
    const statusOptions = [
        { value: 'critical', label: 'Critical' },
        { value: 'warning', label: 'Warning' },
        { value: 'ok', label: 'OK' },
        { value: 'expired', label: 'Expired' },
    ];

    // Loading or error state
    if (error) {
        return (
            <AppLayout breadcrumbs={breadcrumbs}>
                <Head title="Expiry Tracking" />
                <div className="h-full bg-blue-50">
                    <div className="p-6">
                        <div className="rounded-lg bg-white p-8 text-center shadow-sm">
                            <AlertCircle className="mx-auto h-12 w-12 text-red-500" />
                            <h3 className="mt-4 text-lg font-medium text-gray-900">
                                Error
                            </h3>
                            <p className="mt-2 text-sm text-gray-500">
                                {error}
                            </p>
                            <button
                                onClick={handleRefresh}
                                className="mt-4 inline-flex items-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
                            >
                                <RefreshCw className="mr-2 h-4 w-4" />
                                Retry
                            </button>
                        </div>
                    </div>
                </div>
            </AppLayout>
        );
    }

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Expiry Tracking" />

            <div className="h-full bg-blue-50">
                <div className="p-6">
                    {/* Page Header */}
                    <PageHeader
                        title="Expiry Tracking"
                        subtitle="Monitor product expiry dates and manage near-expiry inventory"
                        icon={
                            <AlertCircle className="h-6 w-6 text-yellow-600" />
                        }
                        actions={[
                            {
                                label: 'Refresh',
                                icon: (
                                    <RefreshCw
                                        className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`}
                                    />
                                ),
                                onClick: handleRefresh,
                                variant: 'outline',
                            },
                            {
                                label: 'Export Report',
                                icon: <Download className="h-4 w-4" />,
                                onClick: () =>
                                    toast.success('Exporting expiry report...'),
                                variant: 'outline',
                            },
                            {
                                label: 'Print All',
                                icon: <Printer className="h-4 w-4" />,
                                onClick: () => toast.info('Preparing print...'),
                                variant: 'outline',
                            },
                        ]}
                    />

                    {/* Table */}
                    <div className="mt-6 w-full">
                        <div className="overflow-hidden rounded-lg bg-white shadow-sm">
                            <ReusableTable
                                columns={columns}
                                data={items}
                                actions={actions}
                                title="Expiry Tracking List"
                                statusFilterKey="status"
                                statusOptions={statusOptions}
                                onRowClick={(row) => handleView(row)}
                                rowsPerPageOptions={[5, 15, 30, 50]}
                                defaultRowsPerPage={5}
                                defaultOrderBy="days_until_expiry"
                                defaultOrder="asc"
                                loading={loading}
                                emptyMessage="No expiry records found. All stock is healthy."
                                filterPlaceholder="Search by product, batch, or supplier..."
                                searchValue={searchTerm}
                                onSearchChange={handleSearch}
                                statusValue={statusFilter}
                                onStatusChange={handleStatusFilter}
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* Expiry Details Modal */}
            <ExpiryDetailsModal
                isOpen={showModal}
                onClose={() => {
                    setShowModal(false);
                    setSelectedItem(null);
                }}
                item={selectedItem}
            />
        </AppLayout>
    );
}
