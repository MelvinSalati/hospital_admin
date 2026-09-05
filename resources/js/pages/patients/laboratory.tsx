// pages/patients/Laboratory.tsx - Refactored with two-column layout
import { usePage, router } from '@inertiajs/react';
import {
    AlertCircle,
    Plus,
    X,
    CheckCircle,
    ChevronLeft,
    ChevronRight,
    Trash2,
    ShoppingCart,
    Search,
    FileText,
    Calendar,
    User,
    Clock,
    FlaskConical,
    Microscope,
    Beaker,
    TestTube,
    Pill,
    Activity,
    Filter,
    AlertTriangle,
    History,
    Ban,
} from 'lucide-react';
import Notiflix from 'notiflix';
import { useState, useEffect, useMemo, ReactNode } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import PatientLayout from '@/layouts/patients/PatientLayout';
import Http from '@/utils/Http';
import type { Column} from './components/Table';
import { Table, StatusBadge } from './components/Table';

// ─── Types ─────────────────────────────────────────────────────────────────────
interface LabOrder {
    id: string | number;
    order_number: string;
    service_name: string;
    service_category?: string;
    quantity: number;
    unit_price: number;
    total_price: number;
    status: 'pending' | 'completed' | 'cancelled' | 'rejected';
    priority?: string;
    created_at: string;
    result_value?: string;
    performed_by?: string;
    result_date?: string;
    rejection_reason?: string;
}

interface LaboratoryProps {
    patientId: string;
    services: Array<{
        id: number;
        service_name: string;
        service_category?: string;
        price: number | string;
    }>;
    previousOrders: LabOrder[] | null;
    error?: string;
}

// ─── Utility Functions ─────────────────────────────────────────────────────────
const getPriceAsNumber = (
    price: string | number | undefined | null,
): number => {
    if (price === undefined || price === null) return 0;
    if (typeof price === 'string') {
        const parsed = parseFloat(price);
        return isNaN(parsed) ? 0 : parsed;
    }
    if (typeof price === 'number') {
        return isNaN(price) ? 0 : price;
    }
    return 0;
};

const formatCurrency = (amount: number | string): string => {
    const num = typeof amount === 'string' ? parseFloat(amount) : amount;
    if (isNaN(num)) return 'ZMW 0.00';
    return `ZMW ${num.toFixed(2)}`;
};

const formatDate = (date: string) => {
    if (!date) return '—';
    try {
        return new Date(date).toLocaleDateString('en-ZM', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
        });
    } catch {
        return '—';
    }
};

const getStatusColor = (status: string) => {
    switch (status) {
        case 'completed':
            return 'bg-green-100 text-green-800 border-green-200';
        case 'cancelled':
            return 'bg-red-100 text-red-800 border-red-200';
        case 'rejected':
            return 'bg-red-100 text-red-800 border-red-200';
        default:
            return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    }
};

const getStatusIcon = (status: string) => {
    switch (status) {
        case 'completed':
            return <CheckCircle className="h-3.5 w-3.5" />;
        case 'cancelled':
            return <X className="h-3.5 w-3.5" />;
        case 'rejected':
            return <Ban className="h-3.5 w-3.5" />;
        default:
            return <Clock className="h-3.5 w-3.5" />;
    }
};

// ─── Date Filter Labels ──────────────────────────────────────────────────────
const DATE_FILTER_LABELS: Record<string, string> = {
    all: 'All Time',
    today: 'Today',
    week: 'Last 7 Days',
    month: 'Last 30 Days',
    '3months': 'Last 3 Months',
};

// ─── Order Details Modal ──────────────────────────────────────────────────────
const OrderDetailsModal = ({
    isOpen,
    onClose,
    order,
}: {
    isOpen: boolean;
    onClose: () => void;
    order: LabOrder | null;
}) => {
    if (!isOpen || !order) return null;

    return (
        <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="flex min-h-screen items-center justify-center p-4">
                <div
                    className="fixed inset-0 bg-black/50 backdrop-blur-sm"
                    onClick={onClose}
                />
                <div className="relative w-full max-w-3xl rounded-2xl bg-white shadow-2xl">
                    {/* Header */}
                    <div className="flex items-center justify-between border-b px-6 py-4">
                        <div className="flex items-center gap-3">
                            <div className="rounded-lg bg-blue-50 p-2">
                                <FileText className="h-5 w-5 text-blue-600" />
                            </div>
                            <div>
                                <h2 className="text-lg font-semibold text-gray-800">
                                    Order Details
                                </h2>
                                <p className="text-sm text-gray-500">
                                    Order #{order.order_number}
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className="rounded-full p-1 transition-colors hover:bg-gray-100"
                        >
                            <X className="h-5 w-5 text-gray-500" />
                        </button>
                    </div>

                    <div className="p-6">
                        {/* Order Summary */}
                        <div className="mb-6 grid grid-cols-2 gap-4 rounded-lg bg-gray-50 p-4 md:grid-cols-4">
                            <div>
                                <p className="text-xs text-gray-500">Status</p>
                                <Badge
                                    className={`mt-1 flex w-fit items-center gap-1.5 ${getStatusColor(order.status)}`}
                                >
                                    {getStatusIcon(order.status)}
                                    <span className="capitalize">
                                        {order.status}
                                    </span>
                                </Badge>
                            </div>
                            <div>
                                <p className="text-xs text-gray-500">Date</p>
                                <p className="mt-1 flex items-center gap-1 text-sm font-medium text-gray-700">
                                    <Calendar className="h-3.5 w-3.5 text-gray-400" />
                                    {formatDate(order.created_at)}
                                </p>
                            </div>
                            <div>
                                <p className="text-xs text-gray-500">
                                    Priority
                                </p>
                                <p className="mt-1 text-sm font-medium text-gray-700">
                                    {order.priority || 'Routine'}
                                </p>
                            </div>
                            <div>
                                <p className="text-xs text-gray-500">Total</p>
                                <p className="mt-1 text-sm font-semibold text-blue-600">
                                    {formatCurrency(order.total_price)}
                                </p>
                            </div>
                        </div>

                        {/* Test Details */}
                        <div className="mb-4">
                            <h3 className="mb-3 text-sm font-semibold text-gray-700">
                                Test Information
                            </h3>
                            <div className="overflow-hidden rounded-lg border border-gray-200">
                                <table className="w-full">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                                                Test Name
                                            </th>
                                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                                                Category
                                            </th>
                                            <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">
                                                Quantity
                                            </th>
                                            <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">
                                                Unit Price
                                            </th>
                                            <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">
                                                Total
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        <tr className="hover:bg-blue-50/30">
                                            <td className="px-4 py-3 text-sm text-gray-700">
                                                <div className="flex items-center gap-2">
                                                    <TestTube className="h-3.5 w-3.5 text-blue-400" />
                                                    {order.service_name}
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 text-sm text-gray-500">
                                                {order.service_category ||
                                                    'Laboratory'}
                                            </td>
                                            <td className="px-4 py-3 text-right text-sm text-gray-700">
                                                {order.quantity}
                                            </td>
                                            <td className="px-4 py-3 text-right text-sm text-gray-600">
                                                {formatCurrency(
                                                    order.unit_price,
                                                )}
                                            </td>
                                            <td className="px-4 py-3 text-right text-sm font-semibold text-blue-600">
                                                {formatCurrency(
                                                    order.total_price,
                                                )}
                                            </td>
                                        </tr>
                                    </tbody>
                                    <tfoot className="bg-gray-50">
                                        <tr>
                                            <td
                                                colSpan={4}
                                                className="px-4 py-2 text-right text-sm font-medium text-gray-700"
                                            >
                                                Grand Total
                                            </td>
                                            <td className="px-4 py-2 text-right text-sm font-bold text-blue-600">
                                                {formatCurrency(
                                                    order.total_price,
                                                )}
                                            </td>
                                        </tr>
                                    </tfoot>
                                </table>
                            </div>
                        </div>

                        {/* Results (if completed) */}
                        {order.status === 'completed' && order.result_value && (
                            <div className="rounded-lg border border-green-200 bg-green-50 p-4">
                                <h4 className="mb-2 flex items-center gap-2 text-sm font-semibold text-green-800">
                                    <CheckCircle className="h-4 w-4" />
                                    Results
                                </h4>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <p className="text-xs text-gray-500">
                                            Result Value
                                        </p>
                                        <p className="text-sm font-medium text-gray-800">
                                            {order.result_value}
                                        </p>
                                    </div>
                                    {order.performed_by && (
                                        <div>
                                            <p className="text-xs text-gray-500">
                                                Performed By
                                            </p>
                                            <p className="text-sm text-gray-800">
                                                {order.performed_by}
                                            </p>
                                        </div>
                                    )}
                                    {order.result_date && (
                                        <div>
                                            <p className="text-xs text-gray-500">
                                                Result Date
                                            </p>
                                            <p className="text-sm text-gray-800">
                                                {formatDate(order.result_date)}
                                            </p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Rejection Reason */}
                        {order.status === 'rejected' &&
                            order.rejection_reason && (
                                <div className="rounded-lg border border-red-200 bg-red-50 p-4">
                                    <h4 className="mb-2 flex items-center gap-2 text-sm font-semibold text-red-800">
                                        <Ban className="h-4 w-4" />
                                        Rejection Reason
                                    </h4>
                                    <p className="text-sm text-gray-700">
                                        {order.rejection_reason}
                                    </p>
                                </div>
                            )}

                        {/* Actions */}
                        <div className="mt-6 flex justify-end gap-3">
                            <Button
                                variant="outline"
                                onClick={onClose}
                                className="border-gray-200 text-gray-600 hover:bg-gray-50"
                            >
                                Close
                            </Button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

// ─── Previous Results Component ─────────────────────────────────────────────
interface PreviousResult {
    id: string | number;
    order_number: string;
    service_name: string;
    result_value: string;
    performed_by?: string;
    result_date: string;
    status: 'completed' | 'rejected';
}

const PreviousResultsTable = ({ orders }: { orders: LabOrder[] }) => {
    // Filter completed orders with results
    const completedOrders = orders.filter(
        (order) => order.status === 'completed' && order.result_value,
    );

    // Filter rejected orders
    const rejectedOrders = orders.filter(
        (order) => order.status === 'rejected',
    );

    // Pending orders
    const pendingOrders = orders.filter((order) => order.status === 'pending');

    return (
        <div className="space-y-4">
            {/* Completed Results */}
            <div className="rounded-lg border border-green-200 bg-green-50/50">
                <div className="flex items-center gap-2 border-b border-green-200 px-4 py-3">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <h4 className="text-sm font-semibold text-green-800">
                        Completed Results
                    </h4>
                    <Badge className="ml-auto bg-green-200 text-green-800">
                        {completedOrders.length}
                    </Badge>
                </div>
                <div className="p-3">
                    {completedOrders.length > 0 ? (
                        <div className="space-y-2">
                            {completedOrders.slice(0, 5).map((order) => (
                                <div
                                    key={order.id}
                                    className="rounded-lg bg-white p-3 shadow-sm transition-colors hover:bg-green-50"
                                >
                                    <div className="flex items-start justify-between">
                                        <div className="min-w-0 flex-1">
                                            <p className="text-sm font-medium text-gray-800">
                                                {order.service_name}
                                            </p>
                                            <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-gray-500">
                                                <span className="flex items-center gap-1">
                                                    <Calendar className="h-3 w-3" />
                                                    {formatDate(
                                                        order.result_date ||
                                                            order.created_at,
                                                    )}
                                                </span>
                                                {order.performed_by && (
                                                    <span className="flex items-center gap-1">
                                                        <User className="h-3 w-3" />
                                                        {order.performed_by}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                        <div className="ml-2 flex items-center gap-2">
                                            <Badge className="bg-blue-100 text-blue-800">
                                                {order.result_value}
                                            </Badge>
                                            <Badge className="bg-green-100 text-green-800">
                                                Completed
                                            </Badge>
                                        </div>
                                    </div>
                                </div>
                            ))}
                            {completedOrders.length > 5 && (
                                <p className="text-center text-xs text-gray-400">
                                    +{completedOrders.length - 5} more results
                                </p>
                            )}
                        </div>
                    ) : (
                        <p className="py-4 text-center text-sm text-gray-400">
                            No completed results available
                        </p>
                    )}
                </div>
            </div>

            {/* Rejected & Pending Results */}
            <div className="rounded-lg border border-red-200 bg-red-50/50">
                <div className="flex items-center gap-2 border-b border-red-200 px-4 py-3">
                    <AlertTriangle className="h-4 w-4 text-red-600" />
                    <h4 className="text-sm font-semibold text-red-800">
                        Rejected & Pending
                    </h4>
                    <Badge className="ml-auto bg-red-200 text-red-800">
                        {rejectedOrders.length + pendingOrders.length}
                    </Badge>
                </div>
                <div className="p-3">
                    {rejectedOrders.length > 0 || pendingOrders.length > 0 ? (
                        <div className="space-y-2">
                            {/* Rejected Orders */}
                            {rejectedOrders.slice(0, 3).map((order) => (
                                <div
                                    key={order.id}
                                    className="rounded-lg bg-white p-3 shadow-sm transition-colors hover:bg-red-50"
                                >
                                    <div className="flex items-start justify-between">
                                        <div className="min-w-0 flex-1">
                                            <p className="text-sm font-medium text-gray-800">
                                                {order.service_name}
                                            </p>
                                            <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-gray-500">
                                                <span className="flex items-center gap-1">
                                                    <Calendar className="h-3 w-3" />
                                                    {formatDate(
                                                        order.created_at,
                                                    )}
                                                </span>
                                                {order.rejection_reason && (
                                                    <span className="flex items-center gap-1 text-red-600">
                                                        <Ban className="h-3 w-3" />
                                                        {order.rejection_reason}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                        <Badge className="bg-red-100 text-red-800">
                                            Rejected
                                        </Badge>
                                    </div>
                                </div>
                            ))}

                            {/* Pending Orders */}
                            {pendingOrders.slice(0, 3).map((order) => (
                                <div
                                    key={order.id}
                                    className="rounded-lg bg-white p-3 shadow-sm transition-colors hover:bg-yellow-50"
                                >
                                    <div className="flex items-start justify-between">
                                        <div className="min-w-0 flex-1">
                                            <p className="text-sm font-medium text-gray-800">
                                                {order.service_name}
                                            </p>
                                            <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-gray-500">
                                                <span className="flex items-center gap-1">
                                                    <Calendar className="h-3 w-3" />
                                                    {formatDate(
                                                        order.created_at,
                                                    )}
                                                </span>
                                                <span className="flex items-center gap-1 text-yellow-600">
                                                    <Clock className="h-3 w-3" />
                                                    Waiting for results
                                                </span>
                                            </div>
                                        </div>
                                        <Badge className="bg-yellow-100 text-yellow-800">
                                            Pending
                                        </Badge>
                                    </div>
                                </div>
                            ))}

                            {(rejectedOrders.length > 3 ||
                                pendingOrders.length > 3) && (
                                <p className="text-center text-xs text-gray-400">
                                    +
                                    {Math.max(0, rejectedOrders.length - 3) +
                                        Math.max(
                                            0,
                                            pendingOrders.length - 3,
                                        )}{' '}
                                    more items
                                </p>
                            )}
                        </div>
                    ) : (
                        <p className="py-4 text-center text-sm text-gray-400">
                            No rejected or pending results
                        </p>
                    )}
                </div>
            </div>
        </div>
    );
};

// ─── LabOrderTable Component ──────────────────────────────────────────────
interface LabOrderTableProps {
    orders: LabOrder[];
    isLabTechnician?: boolean;
    onEnterResults?: (order: LabOrder) => void;
    onViewDetails?: (order: LabOrder) => void;
    onExport?: () => void;
    itemsPerPage?: number;
}

const LabOrderTable = ({
    orders,
    isLabTechnician = false,
    onEnterResults,
    onViewDetails,
    onExport,
    itemsPerPage = 5,
}: LabOrderTableProps) => {
    // Filter states
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [dateFilter, setDateFilter] = useState('all');
    const [currentPage, setCurrentPage] = useState(1);
    const [selectedOrder, setSelectedOrder] = useState<LabOrder | null>(null);
    const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);

    // Filter orders
    const filteredOrders = useMemo(() => {
        return orders.filter((order) => {
            const matchesSearch =
                searchTerm === '' ||
                order.order_number
                    ?.toLowerCase()
                    .includes(searchTerm.toLowerCase()) ||
                order.service_name
                    ?.toLowerCase()
                    .includes(searchTerm.toLowerCase());

            const matchesStatus =
                statusFilter === 'all' || order.status === statusFilter;

            let matchesDate = true;
            if (dateFilter !== 'all') {
                const orderDate = new Date(order.created_at);
                const today = new Date();
                const todayStart = new Date(today.setHours(0, 0, 0, 0));

                switch (dateFilter) {
                    case 'today':
                        matchesDate = orderDate >= todayStart;
                        break;
                    case 'week': {
                        const weekAgo = new Date(todayStart);
                        weekAgo.setDate(weekAgo.getDate() - 7);
                        matchesDate = orderDate >= weekAgo;
                        break;
                    }
                    case 'month': {
                        const monthAgo = new Date(todayStart);
                        monthAgo.setMonth(monthAgo.getMonth() - 1);
                        matchesDate = orderDate >= monthAgo;
                        break;
                    }
                    case '3months': {
                        const threeMonthsAgo = new Date(todayStart);
                        threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
                        matchesDate = orderDate >= threeMonthsAgo;
                        break;
                    }
                    default:
                        matchesDate = true;
                }
            }

            return matchesSearch && matchesStatus && matchesDate;
        });
    }, [orders, searchTerm, statusFilter, dateFilter]);

    // Calculate total pages
    const totalPages = Math.ceil(filteredOrders.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const paginatedOrders = filteredOrders.slice(
        startIndex,
        startIndex + itemsPerPage,
    );

    const handleFilterChange = (setter: any, value: any) => {
        setter(value);
        setCurrentPage(1);
    };

    const clearFilters = () => {
        setSearchTerm('');
        setStatusFilter('all');
        setDateFilter('all');
        setCurrentPage(1);
    };

    const hasActiveFilters =
        searchTerm || statusFilter !== 'all' || dateFilter !== 'all';

    // Handle row click to show details
    const handleRowClick = (order: LabOrder) => {
        setSelectedOrder(order);
        setIsDetailsModalOpen(true);
        if (onViewDetails) {
            onViewDetails(order);
        }
    };

    // Define columns for the Table component
    const columns: Column<LabOrder>[] = [
        {
            key: 'order_number',
            header: 'Order #',
            render: (value) => (
                <span className="font-mono text-sm font-medium text-gray-700">
                    {value}
                </span>
            ),
            sortable: true,
            className: 'font-mono',
        },
        {
            key: 'service_name',
            header: 'Test Name',
            render: (value, row) => (
                <div>
                    <div className="flex items-center gap-2">
                        <TestTube className="h-3.5 w-3.5 text-blue-400" />
                        <span>{value}</span>
                        {row.priority === 'urgent' && (
                            <Badge className="bg-red-100 text-xs text-red-800">
                                Urgent
                            </Badge>
                        )}
                        {row.priority === 'stat' && (
                            <Badge className="bg-orange-100 text-xs text-orange-800">
                                STAT
                            </Badge>
                        )}
                    </div>
                    {row.result_value && (
                        <div className="mt-0.5 text-xs text-gray-500">
                            Result: {row.result_value}
                        </div>
                    )}
                </div>
            ),
            sortable: true,
        },
        {
            key: 'quantity',
            header: 'Qty',
            render: (value) => <span>{value}</span>,
            sortable: true,
        },
        {
            key: 'unit_price',
            header: 'Unit Price',
            render: (value) => (
                <span className="text-gray-600">{formatCurrency(value)}</span>
            ),
            sortable: true,
        },
        {
            key: 'total_price',
            header: 'Total',
            render: (value) => (
                <span className="font-semibold text-blue-600">
                    {formatCurrency(value)}
                </span>
            ),
            sortable: true,
        },
        {
            key: 'status',
            header: 'Status',
            render: (value) => {
                return (
                    <Badge
                        className={`flex w-fit items-center gap-1.5 ${getStatusColor(value)}`}
                    >
                        {getStatusIcon(value)}
                        <span className="capitalize">{value}</span>
                    </Badge>
                );
            },
            sortable: true,
        },
        {
            key: 'created_at',
            header: 'Date',
            render: (value) => (
                <span className="text-sm text-gray-500">
                    {formatDate(value)}
                </span>
            ),
            sortable: true,
        },
    ];

    // Add action column for lab technicians
    const renderActions = (row: LabOrder) => {
        if (!isLabTechnician) return null;

        return (
            <div className="flex items-center justify-end gap-2">
                {row.status === 'pending' && onEnterResults && (
                    <Button
                        size="sm"
                        onClick={(e) => {
                            e.stopPropagation();
                            onEnterResults(row);
                        }}
                        className="border border-blue-200 bg-blue-50 text-blue-600 hover:bg-blue-100"
                    >
                        <Activity className="mr-1 h-3.5 w-3.5" />
                        Enter Results
                    </Button>
                )}
                {row.status === 'completed' && (
                    <span className="flex items-center gap-1.5 text-sm font-medium text-green-600">
                        <CheckCircle className="h-4 w-4" />
                        Ready
                    </span>
                )}
                {row.status === 'cancelled' && (
                    <span className="flex items-center gap-1.5 text-sm font-medium text-red-600">
                        <X className="h-4 w-4" />
                        Cancelled
                    </span>
                )}
                {row.status === 'rejected' && (
                    <span className="flex items-center gap-1.5 text-sm font-medium text-red-600">
                        <Ban className="h-4 w-4" />
                        Rejected
                    </span>
                )}
            </div>
        );
    };

    return (
        <div className="space-y-4">
            {/* Filter Toolbar */}
            <div className="flex flex-col gap-3 rounded-xl p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="relative max-w-md flex-1">
                    <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-gray-400" />
                    <Input
                        type="text"
                        placeholder="Search by order #, test name..."
                        value={searchTerm}
                        onChange={(e) =>
                            handleFilterChange(setSearchTerm, e.target.value)
                        }
                        className="h-10 pr-4 pl-9 text-sm focus:border-blue-400 focus:ring-blue-400"
                    />
                    {searchTerm && (
                        <button
                            onClick={() => setSearchTerm('')}
                            className="absolute top-1/2 right-3 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                        >
                            <X className="h-4 w-4" />
                        </button>
                    )}
                </div>

                <div className="flex flex-wrap items-center gap-2">
                    <Select
                        value={statusFilter}
                        onValueChange={(value) =>
                            handleFilterChange(setStatusFilter, value)
                        }
                    >
                        <SelectTrigger className="h-10 w-[140px] border-gray-200 text-sm">
                            <Filter className="mr-2 h-3.5 w-3.5 text-gray-400" />
                            <SelectValue placeholder="All Status" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Status</SelectItem>
                            <SelectItem value="pending">Pending</SelectItem>
                            <SelectItem value="completed">Completed</SelectItem>
                            <SelectItem value="cancelled">Cancelled</SelectItem>
                            <SelectItem value="rejected">Rejected</SelectItem>
                        </SelectContent>
                    </Select>

                    <Select
                        value={dateFilter}
                        onValueChange={(value) =>
                            handleFilterChange(setDateFilter, value)
                        }
                    >
                        <SelectTrigger className="h-10 w-[130px] border-gray-200 text-sm">
                            <Calendar className="mr-2 h-3.5 w-3.5 text-gray-400" />
                            <SelectValue placeholder="Date" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Time</SelectItem>
                            <SelectItem value="today">Today</SelectItem>
                            <SelectItem value="week">Last 7 Days</SelectItem>
                            <SelectItem value="month">Last 30 Days</SelectItem>
                            <SelectItem value="3months">
                                Last 3 Months
                            </SelectItem>
                        </SelectContent>
                    </Select>

                    {hasActiveFilters && (
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={clearFilters}
                            className="h-10 text-sm text-gray-500 hover:text-gray-700"
                        >
                            <X className="mr-1 h-3.5 w-3.5" />
                            Clear
                        </Button>
                    )}

                    {onExport && filteredOrders.length > 0 && (
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={onExport}
                            className="h-10"
                        >
                            Export
                        </Button>
                    )}
                </div>
            </div>

            {/* Filter Chips */}
            {hasActiveFilters && (
                <div className="flex flex-wrap items-center gap-2 px-1">
                    <span className="text-xs font-medium text-gray-500">
                        Active filters:
                    </span>
                    {searchTerm && (
                        <Badge variant="secondary" className="gap-1 text-xs">
                            Search: {searchTerm}
                            <button
                                onClick={() => setSearchTerm('')}
                                className="ml-1 text-gray-400 hover:text-gray-600"
                            >
                                <X className="h-3 w-3" />
                            </button>
                        </Badge>
                    )}
                    {statusFilter !== 'all' && (
                        <Badge variant="secondary" className="gap-1 text-xs">
                            Status: {statusFilter}
                            <button
                                onClick={() => setStatusFilter('all')}
                                className="ml-1 text-gray-400 hover:text-gray-600"
                            >
                                <X className="h-3 w-3" />
                            </button>
                        </Badge>
                    )}
                    {dateFilter !== 'all' && (
                        <Badge variant="secondary" className="gap-1 text-xs">
                            Date: {DATE_FILTER_LABELS[dateFilter]}
                            <button
                                onClick={() => setDateFilter('all')}
                                className="ml-1 text-gray-400 hover:text-gray-600"
                            >
                                <X className="h-3 w-3" />
                            </button>
                        </Badge>
                    )}
                </div>
            )}

            {/* Table Component */}
            <Table
                data={paginatedOrders}
                columns={columns}
                subtitle={`${filteredOrders.length} order${filteredOrders.length !== 1 ? 's' : ''} found`}
                emptyMessage={
                    hasActiveFilters
                        ? 'No orders match your filters'
                        : 'No laboratory orders available'
                }
                onRowClick={handleRowClick}
                actions={isLabTechnician ? renderActions : undefined}
                searchable={false}
                pagination={{
                    currentPage,
                    totalPages,
                    onPageChange: setCurrentPage,
                    totalItems: filteredOrders.length,
                    itemsPerPage,
                }}
                className="border-0 shadow-none"
            />

            {/* Order Details Modal */}
            <OrderDetailsModal
                isOpen={isDetailsModalOpen}
                onClose={() => {
                    setIsDetailsModalOpen(false);
                    setSelectedOrder(null);
                }}
                order={selectedOrder}
            />
        </div>
    );
};

// ─── Results Entry Dialog Component ──────────────────────────────────────────
const ResultsEntryDialog = ({
    isOpen,
    onClose,
    onSuccess,
    testOrder,
    patientName,
}: {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    testOrder: any;
    patientName: string;
}) => {
    const [formData, setFormData] = useState({
        result_value: '',
        remarks: '',
        performed_by: '',
        result_date: new Date().toISOString().split('T')[0],
    });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});

    useEffect(() => {
        if (testOrder) {
            setFormData((prev) => ({
                ...prev,
                result_value: testOrder.result_value || '',
            }));
        }
    }, [testOrder]);

    if (!isOpen || !testOrder) return null;

    const handleChange = (
        e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
    ) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
        if (errors[name]) {
            setErrors((prev) => ({ ...prev, [name]: '' }));
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!formData.result_value) {
            setErrors({ result_value: 'Result is required' });
            return;
        }

        setIsSubmitting(true);

        router.post(`/lab/results/${testOrder.id}`, formData, {
            onSuccess: () => {
                Notiflix.Notify.success('Results saved successfully');
                onSuccess();
                onClose();
            },
            onError: (err) => setErrors(err),
            onFinish: () => setIsSubmitting(false),
        });
    };

    return (
        <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="flex min-h-screen items-center justify-center p-4">
                <div
                    className="fixed inset-0 bg-black/50 backdrop-blur-sm"
                    onClick={onClose}
                />
                <div className="relative w-full max-w-lg rounded-2xl shadow-2xl">
                    <div className="flex items-center justify-between border-b px-6 py-4">
                        <div className="flex items-center gap-3">
                            <div className="rounded-lg bg-blue-50 p-2">
                                <FlaskConical className="h-5 w-5 text-blue-600" />
                            </div>
                            <h2 className="text-lg font-semibold text-gray-800">
                                Enter Lab Results
                            </h2>
                        </div>
                        <button
                            onClick={onClose}
                            className="rounded-full p-1 transition-colors hover:bg-gray-100"
                        >
                            <X className="h-5 w-5 text-gray-500" />
                        </button>
                    </div>
                    <form onSubmit={handleSubmit} className="space-y-4 p-6">
                        <div className="rounded-lg border border-blue-100 bg-gradient-to-r from-blue-50 to-indigo-50 p-4">
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <p className="text-xs text-gray-500">
                                        Patient
                                    </p>
                                    <p className="flex items-center gap-1 font-medium text-gray-800">
                                        <User className="h-3.5 w-3.5 text-gray-400" />
                                        {patientName}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-xs text-gray-500">
                                        Test
                                    </p>
                                    <p className="flex items-center gap-1 font-medium text-gray-800">
                                        <Microscope className="h-3.5 w-3.5 text-gray-400" />
                                        {testOrder.service_name}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-xs text-gray-500">
                                        Order #
                                    </p>
                                    <p className="font-mono text-sm font-medium text-gray-800">
                                        {testOrder.order_number}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-xs text-gray-500">
                                        Date
                                    </p>
                                    <p className="flex items-center gap-1 font-medium text-gray-800">
                                        <Calendar className="h-3.5 w-3.5 text-gray-400" />
                                        {new Date().toLocaleDateString()}
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div>
                            <label className="mb-1.5 block text-sm font-medium text-gray-700">
                                Result Value{' '}
                                <span className="text-red-500">*</span>
                            </label>
                            <textarea
                                name="result_value"
                                value={formData.result_value}
                                onChange={handleChange}
                                rows={3}
                                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                                placeholder="Enter test results..."
                            />
                            {errors.result_value && (
                                <p className="mt-1 text-xs text-red-500">
                                    {errors.result_value}
                                </p>
                            )}
                        </div>

                        <div>
                            <label className="mb-1.5 block text-sm font-medium text-gray-700">
                                Performed By
                            </label>
                            <input
                                type="text"
                                name="performed_by"
                                value={formData.performed_by}
                                onChange={handleChange}
                                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                                placeholder="Enter your name"
                            />
                        </div>

                        <div>
                            <label className="mb-1.5 block text-sm font-medium text-gray-700">
                                Result Date
                            </label>
                            <input
                                type="date"
                                name="result_date"
                                value={formData.result_date}
                                onChange={handleChange}
                                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                            />
                        </div>

                        <div className="flex gap-3 pt-4">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={onClose}
                                className="flex-1 border-gray-200 text-gray-600 hover:bg-gray-50"
                            >
                                Cancel
                            </Button>
                            <Button
                                type="submit"
                                disabled={isSubmitting}
                                className="flex-1 bg-blue-600 text-white hover:bg-blue-700"
                            >
                                {isSubmitting ? (
                                    <span className="flex items-center gap-2">
                                        <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                                        Saving...
                                    </span>
                                ) : (
                                    'Save Results'
                                )}
                            </Button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

// ─── Order Modal Component ──────────────────────────────────────────────────
const OrderModal = ({
    isOpen,
    onClose,
    onSave,
    services,
    patientId,
}: {
    isOpen: boolean;
    onClose: () => void;
    onSave: (items: any[], patientId: string) => Promise<void>;
    services: LaboratoryProps['services'];
    patientId: string;
}) => {
    const [cart, setCart] = useState<any[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const filteredServices =
        services?.filter((s) =>
            s.service_name.toLowerCase().includes(searchTerm.toLowerCase()),
        ) || [];

    const addToCart = (service: any) => {
        const price = getPriceAsNumber(service.price);

        const existing = cart.find(
            (item) => item.service_id === service.id || item.id === service.id,
        );

        if (existing) {
            setCart(
                cart.map((item) =>
                    item.service_id === service.id || item.id === service.id
                        ? { ...item, quantity: item.quantity + 1 }
                        : item,
                ),
            );
        } else {
            const cartItem = {
                ...service,
                cart_id: Date.now() + Math.random(),
                service_id: service.id,
                quantity: 1,
                price: price,
            };
            setCart([...cart, cartItem]);
        }
        Notiflix.Notify.success(`${service.service_name} added to cart`);
    };

    const removeFromCart = (cartId: number | string) => {
        setCart(cart.filter((item) => item.cart_id !== cartId));
    };

    const updateQuantity = (cartId: number | string, quantity: number) => {
        if (quantity < 1) return;
        setCart(
            cart.map((item) =>
                item.cart_id === cartId ? { ...item, quantity } : item,
            ),
        );
    };

    const totalAmount = cart.reduce(
        (sum, item) => sum + (item.price || 0) * item.quantity,
        0,
    );

    const handleSubmit = async () => {
        if (cart.length === 0) {
            Notiflix.Notify.warning('Please add at least one test to order');
            return;
        }

        setIsSubmitting(true);
        try {
            const itemsToSubmit = cart.map((item) => ({
                id: item.service_id || item.id,
                service_name: item.service_name,
                service_category: item.service_category || 'Laboratory',
                price: item.price || 0,
                quantity: item.quantity,
            }));
            await onSave(itemsToSubmit, patientId);
            setCart([]);
            onClose();
        } catch (error) {
            console.error(error);
        } finally {
            setIsSubmitting(false);
        }
    };

    // Category color mapping
    const getCategoryColor = (category: string) => {
        const colors: Record<string, string> = {
            Haematology: 'bg-red-100 text-red-700 border-red-200',
            Biochemistry: 'bg-blue-100 text-blue-700 border-blue-200',
            Microbiology: 'bg-emerald-100 text-emerald-700 border-emerald-200',
            Immunology: 'bg-purple-100 text-purple-700 border-purple-200',
            Serology: 'bg-amber-100 text-amber-700 border-amber-200',
            Toxicology: 'bg-rose-100 text-rose-700 border-rose-200',
            Endocrinology: 'bg-cyan-100 text-cyan-700 border-cyan-200',
            Genetics: 'bg-indigo-100 text-indigo-700 border-indigo-200',
            Urinalysis: 'bg-yellow-100 text-yellow-700 border-yellow-200',
            Histopathology: 'bg-pink-100 text-pink-700 border-pink-200',
            Laboratory: 'bg-slate-100 text-slate-700 border-slate-200',
        };
        return colors[category] || colors['Laboratory'];
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="flex min-h-screen items-center justify-center p-4">
                <div
                    className="fixed inset-0 bg-black/40 backdrop-blur-sm"
                    onClick={onClose}
                />

                <div className="relative w-full max-w-6xl rounded-xl shadow-xl">
                    {/* Header */}
                    <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3">
                        <div className="flex items-center gap-2.5">
                            <div className="rounded-lg bg-blue-50 p-2">
                                <Beaker className="h-4 w-4 text-blue-600" />
                            </div>
                            <div>
                                <h2 className="text-sm font-semibold text-slate-800">
                                    Order Laboratory Tests
                                </h2>
                                <p className="text-xs text-slate-500">
                                    Select tests and add to cart
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className="rounded p-1 hover:bg-slate-100"
                        >
                            <X className="h-4 w-4 text-slate-400" />
                        </button>
                    </div>

                    <div className="flex min-h-[420px] flex-col md:flex-row">
                        {/* Left - Available Tests */}
                        <div className="w-full border-r border-slate-200 p-4 md:w-1/2">
                            <div className="relative mb-3">
                                <Search className="absolute top-1/2 left-3 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                                <input
                                    type="text"
                                    placeholder="Search tests..."
                                    value={searchTerm}
                                    onChange={(e) =>
                                        setSearchTerm(e.target.value)
                                    }
                                    className="w-full rounded-lg border border-slate-200 py-1.5 pr-3 pl-8 text-sm focus:border-blue-400 focus:ring-2 focus:ring-blue-400/20 focus:outline-none"
                                />
                                <span className="absolute top-1/2 right-3 -translate-y-1/2 text-xs text-slate-400">
                                    {filteredServices.length}
                                </span>
                            </div>

                            <div className="max-h-[340px] space-y-1.5 overflow-y-auto pr-1">
                                {filteredServices.map((service, index) => {
                                    const price = getPriceAsNumber(
                                        service.price,
                                    );
                                    const category =
                                        service.service_category ||
                                        'Laboratory';
                                    const colorClass =
                                        getCategoryColor(category);

                                    return (
                                        <div
                                            key={service.id || index}
                                            className={`flex items-center justify-between rounded-lg border ${colorClass} px-3 py-2 transition-colors hover:opacity-80`}
                                        >
                                            <div className="min-w-0 flex-1">
                                                <div className="truncate text-sm font-medium">
                                                    {service.service_name}
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-xs font-medium">
                                                        {formatCurrency(price)}
                                                    </span>
                                                    <span className="text-xs text-slate-500">
                                                        {category}
                                                    </span>
                                                </div>
                                            </div>
                                            <button
                                                onClick={() =>
                                                    addToCart(service)
                                                }
                                                className={`ml-2 flex h-7 items-center gap-1 rounded-lg px-2.5 text-xs font-medium transition-colors ${colorClass} hover:bg-opacity-80`}
                                            >
                                                <Plus className="h-3 w-3" />
                                                Add
                                            </button>
                                        </div>
                                    );
                                })}
                                {filteredServices.length === 0 && (
                                    <div className="py-8 text-center">
                                        <FlaskConical className="mx-auto h-8 w-8 text-slate-300" />
                                        <p className="mt-1 text-sm text-slate-400">
                                            No tests found
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Right - Cart */}
                        <div className="w-full bg-slate-50/50 p-4 md:w-1/2">
                            <div className="mb-3 flex items-center justify-between">
                                <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                                    <ShoppingCart className="h-4 w-4 text-blue-600" />
                                    Cart
                                    <span className="ml-1 rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">
                                        {cart.length}
                                    </span>
                                </h3>
                                {cart.length > 0 && (
                                    <button
                                        onClick={() => {
                                            if (confirm('Clear all items?')) {
                                                setCart([]);
                                            }
                                        }}
                                        className="text-xs text-red-500 hover:text-red-700"
                                    >
                                        Clear
                                    </button>
                                )}
                            </div>

                            <div className="max-h-[340px] space-y-1.5 overflow-y-auto pr-1">
                                {cart.map((item) => {
                                    const itemPrice = item.price || 0;
                                    const total = itemPrice * item.quantity;
                                    const category =
                                        item.service_category || 'Laboratory';
                                    const colorClass =
                                        getCategoryColor(category);

                                    return (
                                        <div
                                            key={item.cart_id}
                                            className={`rounded-lg border ${colorClass} bg-white px-3 py-2`}
                                        >
                                            <div className="flex items-start justify-between">
                                                <div className="min-w-0 flex-1">
                                                    <div className="truncate text-sm font-medium">
                                                        {item.service_name}
                                                    </div>
                                                    <div className="flex items-center gap-2 text-xs text-slate-500">
                                                        <span>
                                                            {formatCurrency(
                                                                itemPrice,
                                                            )}
                                                        </span>
                                                        <span>•</span>
                                                        <span>
                                                            {item.quantity}×
                                                        </span>
                                                    </div>
                                                </div>
                                                <button
                                                    onClick={() =>
                                                        removeFromCart(
                                                            item.cart_id,
                                                        )
                                                    }
                                                    className="rounded p-1 text-slate-400 hover:bg-red-50 hover:text-red-500"
                                                >
                                                    <Trash2 className="h-3.5 w-3.5" />
                                                </button>
                                            </div>
                                            <div className="mt-1.5 flex items-center justify-between">
                                                <div className="flex items-center gap-1">
                                                    <button
                                                        onClick={() =>
                                                            updateQuantity(
                                                                item.cart_id,
                                                                item.quantity -
                                                                    1,
                                                            )
                                                        }
                                                        className="flex h-6 w-6 items-center justify-center rounded border border-slate-200 bg-white text-xs hover:bg-slate-50"
                                                    >
                                                        -
                                                    </button>
                                                    <span className="w-6 text-center text-sm font-medium">
                                                        {item.quantity}
                                                    </span>
                                                    <button
                                                        onClick={() =>
                                                            updateQuantity(
                                                                item.cart_id,
                                                                item.quantity +
                                                                    1,
                                                            )
                                                        }
                                                        className="flex h-6 w-6 items-center justify-center rounded border border-slate-200 bg-white text-xs hover:bg-slate-50"
                                                    >
                                                        +
                                                    </button>
                                                </div>
                                                <div className="text-sm font-semibold text-blue-600">
                                                    {formatCurrency(total)}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                                {cart.length === 0 && (
                                    <div className="py-10 text-center">
                                        <ShoppingCart className="mx-auto h-8 w-8 text-slate-300" />
                                        <p className="mt-1 text-sm text-slate-400">
                                            Cart is empty
                                        </p>
                                    </div>
                                )}
                            </div>

                            {cart.length > 0 && (
                                <div className="mt-3 border-t border-slate-200 pt-3">
                                    <div className="mb-2.5 flex items-center justify-between">
                                        <span className="text-sm font-medium text-slate-600">
                                            Total
                                        </span>
                                        <span className="text-lg font-bold text-blue-600">
                                            {formatCurrency(totalAmount)}
                                        </span>
                                    </div>
                                    <button
                                        onClick={handleSubmit}
                                        disabled={isSubmitting}
                                        className="w-full rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
                                    >
                                        {isSubmitting ? (
                                            <span className="flex items-center justify-center gap-2">
                                                <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                                                Processing...
                                            </span>
                                        ) : (
                                            `Place Order (${formatCurrency(totalAmount)})`
                                        )}
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

// ─── Main Laboratory Component ──────────────────────────────────────────────
export default function Laboratory() {
    const { props } = usePage();
    const { patientId, services, previousOrders, error } =
        props as LaboratoryProps;

    const [isOrderModalOpen, setIsOrderModalOpen] = useState(false);
    const [isResultsDialogOpen, setIsResultsDialogOpen] = useState(false);
    const [selectedTestOrder, setSelectedTestOrder] = useState<LabOrder | null>(
        null,
    );

    const userRoles = (props as any).auth?.user?.profile?.roles || [];
    const isLabTechnician = userRoles.includes('lab_technician');

    const enhancedOrders: LabOrder[] = useMemo(() => {
        return (previousOrders || []).map((order) => ({
            ...order,
            quantity: order.quantity ?? 1,
            unit_price: getPriceAsNumber(order.unit_price),
            total_price: getPriceAsNumber(order.total_price),
        }));
    }, [previousOrders]);

    const handleSaveOrder = async (items: any[], identifier: string) => {
        try {
            const response = await Http.post(`${identifier}/lab-orders`, {
                patient_id: identifier,
                services: items.map((item) => ({
                    id: item.id,
                    service_name: item.service_name,
                    service_category: item.service_category || 'Laboratory',
                    price: item.price,
                    quantity: item.quantity,
                    notes: null,
                    priority: 'routine',
                })),
            });

            if (response.status === 200 || response.status === 201) {
                Notiflix.Notify.success(
                    response.data.message ||
                        `${items.length} test(s) ordered successfully`,
                );
                router.reload({ only: ['previousOrders'] });
                return response.data;
            } else {
                Notiflix.Notify.failure(
                    'Something went wrong while saving order!',
                );
                throw new Error('Failed to save order');
            }
        } catch (error: any) {
            console.error('Error saving order:', error);
            Notiflix.Notify.failure(
                error.response?.data?.message ||
                    'Something went wrong while saving order!',
            );
            throw error;
        }
    };

    const handleEnterResults = (order: LabOrder) => {
        setSelectedTestOrder(order);
        setIsResultsDialogOpen(true);
    };

    const handleResultsSuccess = () => {
        router.reload();
    };

    const handleExport = () => {
        if (enhancedOrders.length === 0) {
            Notiflix.Notify.warning('No data to export');
            return;
        }

        const headers = [
            'Order #',
            'Test Name',
            'Quantity',
            'Unit Price',
            'Total',
            'Status',
            'Date',
        ];
        const rows = enhancedOrders.map((order) => [
            order.order_number,
            order.service_name,
            order.quantity,
            order.unit_price,
            order.total_price,
            order.status,
            new Date(order.created_at).toLocaleDateString(),
        ]);

        const csv = [
            headers.join(','),
            ...rows.map((row) => row.join(',')),
        ].join('\n');
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `lab_orders_${patientId}_${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        window.URL.revokeObjectURL(url);
    };

    if (error) {
        return (
            <PatientLayout
                breadcrumbs={[
                    { title: 'Patient', href: '/' },
                    { title: 'Laboratory', href: '/' },
                ]}
            >
                <div className="p-6">
                    <div className="flex gap-3 rounded-lg border border-red-200 bg-red-50 p-4">
                        <AlertCircle className="h-5 w-5 text-red-500" />
                        <p className="text-red-700">{error}</p>
                    </div>
                </div>
            </PatientLayout>
        );
    }

    return (
        <PatientLayout
            breadcrumbs={[
                { title: 'Patient', href: '/' },
                { title: 'Laboratory', href: '/' },
            ]}
        >
            <div className="h-full space-y-6 bg-blue-50">
                {/* Header */}
                <div className="flex flex-col justify-between gap-4 bg-white p-6 sm:flex-row sm:items-center">
                    <div>
                        <div className="flex items-center gap-3">
                            <div className="rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 p-2.5 shadow-lg shadow-blue-200">
                                <FlaskConical className="h-6 w-6 text-white" />
                            </div>
                            <div>
                                <h1 className="text-2xl font-bold text-gray-900">
                                    Laboratory Services
                                </h1>
                                <p className="text-sm text-gray-500">
                                    Manage laboratory tests and results
                                </p>
                            </div>
                        </div>
                    </div>
                    <Button
                        onClick={() => setIsOrderModalOpen(true)}
                        className="bg-blue-600 text-white shadow-lg shadow-blue-200 hover:bg-blue-700"
                    >
                        <Plus className="mr-2 h-4 w-4" />
                        Order Tests
                    </Button>
                </div>

                {/* Two-Column Layout */}
                <div className="grid grid-cols-1 gap-6 px-4 lg:grid-cols-4">
                    {/* Left Column - 70% (3/4 of 4 columns = 3) */}
                    <div className="lg:col-span-3">
                        {enhancedOrders.length > 0 ? (
                            <div className="rounded-sm bg-white p-4">
                                <LabOrderTable
                                    orders={enhancedOrders}
                                    isLabTechnician={isLabTechnician}
                                    onEnterResults={handleEnterResults}
                                    onExport={handleExport}
                                    itemsPerPage={5}
                                />
                            </div>
                        ) : (
                            <div className="rounded-xl border border-gray-200 bg-white py-16 text-center shadow-sm">
                                <FlaskConical className="mx-auto h-16 w-16 text-gray-300" />
                                <h3 className="mt-4 text-lg font-medium text-gray-700">
                                    No test orders found
                                </h3>
                                <p className="mt-1 text-sm text-gray-400">
                                    Start by ordering your first laboratory test
                                </p>
                                <Button
                                    onClick={() => setIsOrderModalOpen(true)}
                                    className="mt-4 bg-blue-600 text-white hover:bg-blue-700"
                                >
                                    <Plus className="mr-2 h-4 w-4" />
                                    Order Your First Test
                                </Button>
                            </div>
                        )}
                    </div>

                    {/* Right Column - 30% (1/4 of 4 columns = 1) */}
                    <div className="lg:col-span-1">
                        <div className="sticky top-4 space-y-4">
                            {/* Previous Results Section */}
                            <div className="rounded-lg bg-white p-4 shadow-sm">
                                <div className="mb-3 flex items-center gap-2 border-b border-gray-200 pb-2">
                                    <History className="h-4 w-4 text-blue-600" />
                                    <h3 className="text-sm font-semibold text-gray-700">
                                        Previous Results
                                    </h3>
                                    <Badge className="ml-auto bg-blue-100 text-blue-800">
                                        {
                                            enhancedOrders.filter(
                                                (o) =>
                                                    o.status === 'completed' &&
                                                    o.result_value,
                                            ).length
                                        }
                                    </Badge>
                                </div>
                                <PreviousResultsTable orders={enhancedOrders} />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Order Modal */}
                <OrderModal
                    isOpen={isOrderModalOpen}
                    onClose={() => setIsOrderModalOpen(false)}
                    onSave={handleSaveOrder}
                    services={services || []}
                    patientId={patientId}
                />

                {/* Results Dialog */}
                <ResultsEntryDialog
                    isOpen={isResultsDialogOpen}
                    onClose={() => {
                        setIsResultsDialogOpen(false);
                        setSelectedTestOrder(null);
                    }}
                    onSuccess={handleResultsSuccess}
                    testOrder={selectedTestOrder}
                    patientName={(props as any).patient?.name || 'Patient'}
                />
            </div>
        </PatientLayout>
    );
}
