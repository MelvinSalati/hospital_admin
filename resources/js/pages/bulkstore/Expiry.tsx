// resources/js/pages/bulkstore/Expiry.tsx

import React, { useState, useEffect } from 'react';
import { Head } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import { BreadcrumbItem } from '@/types';
import PageHeader from '@/components/PageHeader';
import { ReusableTable, Column, Action } from '@/components/ReusableTable';
import {
    AlertCircle,
    AlertTriangle,
    CheckCircle,
    Clock,
    Calendar,
    Package,
    Box,
    Building2,
    Eye,
    Printer,
    Download,
    RefreshCw,
    Filter,
    Search,
    XCircle,
    TrendingDown,
    AlertOctagon,
    FileText,
    Truck,
    Users,
    DollarSign,
    Hash,
    Tag,
    Shield,
    ShieldCheck,
} from 'lucide-react';
import { Dialog, Transition } from '@headlessui/react';
import { toast } from 'react-hot-toast';
import axios from 'axios';
import { format, differenceInDays, isAfter, isBefore, addDays } from 'date-fns';

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

interface ExpiryModalProps {
    isOpen: boolean;
    onClose: () => void;
    item: ExpiryItem | null;
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

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-ZM', {
            style: 'currency',
            currency: 'ZMW',
            minimumFractionDigits: 2,
        }).format(amount || 0);
    };

    const getStatusConfig = (status: string) => {
        const configs = {
            critical: {
                label: 'Critical',
                color: 'bg-red-100 text-red-700 border-red-200',
                icon: AlertOctagon,
            },
            warning: {
                label: 'Warning',
                color: 'bg-yellow-100 text-yellow-700 border-yellow-200',
                icon: AlertTriangle,
            },
            ok: {
                label: 'OK',
                color: 'bg-green-100 text-green-700 border-green-200',
                icon: CheckCircle,
            },
            expired: {
                label: 'Expired',
                color: 'bg-gray-100 text-gray-700 border-gray-200',
                icon: XCircle,
            },
        };
        return configs[status as keyof typeof configs] || configs.ok;
    };

    const statusConfig = getStatusConfig(item.status);
    const StatusIcon = statusConfig.icon;

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
                            <Dialog.Panel className="relative w-full max-w-2xl transform overflow-hidden rounded-xl bg-white shadow-2xl transition-all">
                                {/* Header */}
                                <div className="rounded-t-xl border-b border-gray-200 bg-white px-6 py-4">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div
                                                className={`rounded-lg p-2 ${statusConfig.color}`}
                                            >
                                                <StatusIcon className="h-5 w-5" />
                                            </div>
                                            <div>
                                                <Dialog.Title className="text-lg font-semibold text-gray-900">
                                                    Expiry Details
                                                </Dialog.Title>
                                                <p className="text-sm text-gray-500">
                                                    {item.product_name} •{' '}
                                                    {item.batch_number}
                                                </p>
                                            </div>
                                        </div>
                                        <button
                                            onClick={onClose}
                                            className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
                                        >
                                            <X className="h-5 w-5" />
                                        </button>
                                    </div>
                                </div>

                                {/* Body */}
                                <div className="p-6">
                                    {/* Status Banner */}
                                    <div
                                        className={`mb-4 rounded-lg border p-4 ${statusConfig.color}`}
                                    >
                                        <div className="flex items-start gap-3">
                                            <StatusIcon className="mt-0.5 h-5 w-5 flex-shrink-0" />
                                            <div>
                                                <h5 className="font-medium">
                                                    {statusConfig.label} Status
                                                </h5>
                                                <p className="text-sm">
                                                    {item.status ===
                                                        'critical' &&
                                                        `Expires in ${item.days_until_expiry} days - Immediate action required!`}
                                                    {item.status ===
                                                        'warning' &&
                                                        `Expires in ${item.days_until_expiry} days - Plan for use or disposal.`}
                                                    {item.status === 'ok' &&
                                                        `Expires in ${item.days_until_expiry} days - Stock is healthy.`}
                                                    {item.status ===
                                                        'expired' &&
                                                        'This batch has expired and should be disposed of immediately.'}
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Product Info */}
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="rounded-lg border border-gray-200 p-3">
                                            <p className="text-xs text-gray-500">
                                                Product
                                            </p>
                                            <p className="text-sm font-medium text-gray-900">
                                                {item.product_name}
                                            </p>
                                            <p className="text-xs text-gray-400">
                                                Code: {item.product_code}
                                            </p>
                                        </div>
                                        <div className="rounded-lg border border-gray-200 p-3">
                                            <p className="text-xs text-gray-500">
                                                Batch Number
                                            </p>
                                            <p className="font-mono text-sm font-medium text-gray-900">
                                                {item.batch_number}
                                            </p>
                                        </div>
                                        <div className="rounded-lg border border-gray-200 p-3">
                                            <p className="text-xs text-gray-500">
                                                Supplier
                                            </p>
                                            <p className="text-sm font-medium text-gray-900">
                                                {item.supplier_name}
                                            </p>
                                        </div>
                                        <div className="rounded-lg border border-gray-200 p-3">
                                            <p className="text-xs text-gray-500">
                                                Department
                                            </p>
                                            <p className="text-sm font-medium text-gray-900">
                                                {item.department_name}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Stock & Value */}
                                    <div className="mt-4 grid grid-cols-3 gap-4">
                                        <div className="rounded-lg bg-gray-50 p-3 text-center">
                                            <p className="text-xs text-gray-500">
                                                Remaining Quantity
                                            </p>
                                            <p className="text-lg font-bold text-gray-900">
                                                {item.remaining_quantity}
                                            </p>
                                        </div>
                                        <div className="rounded-lg bg-gray-50 p-3 text-center">
                                            <p className="text-xs text-gray-500">
                                                Total Value
                                            </p>
                                            <p className="text-lg font-bold text-gray-900">
                                                {formatCurrency(
                                                    item.total_value,
                                                )}
                                            </p>
                                        </div>
                                        <div className="rounded-lg bg-gray-50 p-3 text-center">
                                            <p className="text-xs text-gray-500">
                                                Days Until Expiry
                                            </p>
                                            <p
                                                className={`text-lg font-bold ${
                                                    item.days_until_expiry < 30
                                                        ? 'text-red-600'
                                                        : item.days_until_expiry <
                                                            90
                                                          ? 'text-yellow-600'
                                                          : 'text-green-600'
                                                }`}
                                            >
                                                {item.days_until_expiry}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Dates */}
                                    <div className="mt-4 grid grid-cols-2 gap-4">
                                        <div className="flex items-center gap-2 text-sm text-gray-600">
                                            <Calendar className="h-4 w-4 text-gray-400" />
                                            <span>
                                                Expiry Date:{' '}
                                                <strong>
                                                    {formatDate(
                                                        item.expiry_date,
                                                    )}
                                                </strong>
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-2 text-sm text-gray-600">
                                            <Clock className="h-4 w-4 text-gray-400" />
                                            <span>
                                                Received:{' '}
                                                <strong>
                                                    {formatDate(
                                                        item.received_at,
                                                    )}
                                                </strong>
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                {/* Footer */}
                                <div className="rounded-b-xl border-t border-gray-200 bg-gray-50 px-6 py-4">
                                    <div className="flex justify-end gap-3">
                                        <button
                                            onClick={onClose}
                                            className="rounded-lg px-6 py-2 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-100"
                                        >
                                            Close
                                        </button>
                                        <button className="rounded-lg bg-blue-600 px-6 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700">
                                            <Printer className="mr-2 inline h-4 w-4" />
                                            Print
                                        </button>
                                    </div>
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
    const [items, setItems] = useState<ExpiryItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedItem, setSelectedItem] = useState<ExpiryItem | null>(null);
    const [showModal, setShowModal] = useState(false);

    // Fetch expiry data
    useEffect(() => {
        fetchExpiryData();
    }, []);

    const fetchExpiryData = async () => {
        setLoading(true);
        try {
            const response = await axios.get('/api/expiry');
            if (response.data.success) {
                setItems(response.data.data);
            }
        } catch (error) {
            console.error('Failed to fetch expiry data:', error);
            toast.error('Failed to load expiry data');
        } finally {
            setLoading(false);
        }
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
                <span className="font-mono text-sm text-gray-700">{value}</span>
            ),
        },
        {
            id: 'supplier_name',
            label: 'Supplier',
            minWidth: 120,
        },
        {
            id: 'remaining_quantity',
            label: 'Qty',
            minWidth: 60,
            align: 'center',
        },
        {
            id: 'total_value',
            label: 'Value',
            minWidth: 100,
            align: 'right',
            format: (value) => formatCurrency(value),
        },
        {
            id: 'expiry_date',
            label: 'Expiry Date',
            minWidth: 100,
            align: 'center',
            sortable: true,
            format: (value) => formatDate(value),
        },
        {
            id: 'days_until_expiry',
            label: 'Days Left',
            minWidth: 80,
            align: 'center',
            sortable: true,
            format: (value, row) => {
                const days = Number(value);
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
        {
            label: 'Print',
            icon: <Printer className="h-4 w-4" />,
            color: 'secondary',
            variant: 'text',
            onClick: (row) =>
                toast.info(`Printing expiry details for ${row.product_name}`),
        },
    ];

    // Status options for filtering
    const statusOptions = [
        { value: 'critical', label: 'Critical' },
        { value: 'warning', label: 'Warning' },
        { value: 'ok', label: 'OK' },
        { value: 'expired', label: 'Expired' },
    ];

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Expiry Tracking" />

            <div className="min-h-screen bg-slate-100">
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
                                onClick: fetchExpiryData,
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

                    {/* Background Check Notification */}
                    {/* <div className="mt-6 rounded-lg border border-blue-200 bg-white p-4">
                        <div className="flex items-start gap-3">
                            <ShieldCheck className="mt-0.5 h-5 w-5 flex-shrink-0 text-blue-600" />
                            <div>
                                <p className="text-sm font-medium text-blue-800">
                                    Automatic Background Checks Active
                                </p>
                                <p className="text-sm text-blue-700">
                                    The system automatically runs background
                                    checks on all products to monitor expiry
                                    dates and stock levels. You will be notified
                                    when products approach expiry or when stock
                                    levels are low.
                                </p>
                                <div className="mt-2 flex items-center gap-4 text-xs text-blue-600">
                                    <span className="flex items-center gap-1">
                                        <Clock className="h-3 w-3" />
                                        Last check:{' '}
                                        {new Date().toLocaleString()}
                                    </span>
                                    <span className="flex items-center gap-1">
                                        <CheckCircle className="h-3 w-3" />
                                        Auto-alerts enabled for critical items
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div> */}

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
                                rowsPerPageOptions={[10, 25, 50, 100]}
                                defaultRowsPerPage={10}
                                defaultOrderBy="days_until_expiry"
                                defaultOrder="asc"
                                loading={loading}
                                emptyMessage="No expiry records found. All stock is healthy."
                                filterPlaceholder="Search by product, batch, or supplier..."
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
