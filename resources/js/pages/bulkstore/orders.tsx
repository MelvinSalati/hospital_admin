// pages/bulkstore/orders.tsx
import AppLayout from '@/layouts/app-layout';
import { useState, useEffect } from 'react';
import { usePage, router } from '@inertiajs/react';
import {
    Search,
    Filter,
    Clock,
    Package,
    Building2,
    User,
    Calendar,
    ChevronLeft,
    ChevronRight,
    ChevronsLeft,
    ChevronsRight,
    Eye,
    CheckCircle,
    XCircle,
    AlertCircle,
    Loader2,
    FileText,
    Printer,
    Download,
    RefreshCw,
    ArrowUpDown,
    Check,
    AlertTriangle,
    Truck,
    Send,
    MoreVertical,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';

// Types
interface Order {
    id: number;
    request_number: string;
    department_id: number;
    department_name: string;
    request_date: string;
    status:
        | 'pending'
        | 'approved'
        | 'partially_issued'
        | 'completed'
        | 'rejected';
    priority: 'high' | 'medium' | 'low';
    total_items: number;
    requested_by_name: string;
    notes: string | null;
    approved_by: number | null;
    approved_date: string | null;
    completed_date: string | null;
    created_at: string;
    updated_at: string;
    items?: OrderItem[];
}

interface OrderItem {
    id: number;
    product_name: string;
    product_code: string;
    requested_quantity: number;
    issued_quantity: number;
    unit_of_measure: string;
    status: 'pending' | 'issued' | 'partial';
}

interface PaginatedResponse {
    data: Order[];
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
    from: number;
    to: number;
}

// Pagination Component
function Pagination({
    currentPage,
    lastPage,
    onPageChange,
    total,
    from,
    to,
}: {
    currentPage: number;
    lastPage: number;
    onPageChange: (page: number) => void;
    total: number;
    from: number;
    to: number;
}) {
    const pages = [];
    const maxVisiblePages = 5;

    let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(lastPage, startPage + maxVisiblePages - 1);

    if (endPage - startPage + 1 < maxVisiblePages) {
        startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }

    for (let i = startPage; i <= endPage; i++) {
        pages.push(i);
    }

    return (
        <div className="flex items-center justify-between border-t border-slate-200 px-4 py-3 dark:border-slate-700">
            <div className="text-xs text-slate-500 dark:text-slate-400">
                Showing <span className="font-medium">{from}</span> to{' '}
                <span className="font-medium">{to}</span> of{' '}
                <span className="font-medium">{total}</span> results
            </div>
            <div className="flex items-center gap-1">
                <button
                    onClick={() => onPageChange(1)}
                    disabled={currentPage === 1}
                    className="rounded-lg p-1.5 transition-colors hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50 dark:hover:bg-slate-700"
                >
                    <ChevronsLeft className="h-4 w-4 text-slate-500" />
                </button>
                <button
                    onClick={() => onPageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="rounded-lg p-1.5 transition-colors hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50 dark:hover:bg-slate-700"
                >
                    <ChevronLeft className="h-4 w-4 text-slate-500" />
                </button>
                {pages.map((page) => (
                    <button
                        key={page}
                        onClick={() => onPageChange(page)}
                        className={`rounded-lg px-3 py-1 text-xs font-medium transition-colors ${
                            page === currentPage
                                ? 'bg-blue-600 text-white'
                                : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700'
                        }`}
                    >
                        {page}
                    </button>
                ))}
                <button
                    onClick={() => onPageChange(currentPage + 1)}
                    disabled={currentPage === lastPage}
                    className="rounded-lg p-1.5 transition-colors hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50 dark:hover:bg-slate-700"
                >
                    <ChevronRight className="h-4 w-4 text-slate-500" />
                </button>
                <button
                    onClick={() => onPageChange(lastPage)}
                    disabled={currentPage === lastPage}
                    className="rounded-lg p-1.5 transition-colors hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50 dark:hover:bg-slate-700"
                >
                    <ChevronsRight className="h-4 w-4 text-slate-500" />
                </button>
            </div>
        </div>
    );
}

// Main Component
export default function Orders() {
    const { props } = usePage();

    // Get data from Inertia props or initialize empty
    const paginatedData = (props.orders as PaginatedResponse) || {
        data: [],
        current_page: 1,
        last_page: 1,
        per_page: 15,
        total: 0,
        from: 0,
        to: 0,
    };

    const [orders, setOrders] = useState<Order[]>(paginatedData.data || []);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<string>('all');
    const [priorityFilter, setPriorityFilter] = useState<string>('all');
    const [dateFilter, setDateFilter] = useState<string>('today');
    const [isLoading, setIsLoading] = useState(false);
    const [currentPage, setCurrentPage] = useState(
        paginatedData.current_page || 1,
    );
    const [lastPage, setLastPage] = useState(paginatedData.last_page || 1);
    const [total, setTotal] = useState(paginatedData.total || 0);
    const [from, setFrom] = useState(paginatedData.from || 0);
    const [to, setTo] = useState(paginatedData.to || 0);
    const [perPage] = useState(paginatedData.per_page || 15);
    const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
    const [isViewModalOpen, setIsViewModalOpen] = useState(false);

    // Fetch orders with filters
    const fetchOrders = async (page = 1) => {
        setIsLoading(true);
        try {
            const params = new URLSearchParams({
                page: page.toString(),
                per_page: perPage.toString(),
                search: searchTerm,
                status: statusFilter,
                priority: priorityFilter,
                date: dateFilter,
            });

            const response = await fetch(`/api/bulkstore/orders?${params}`, {
                headers: {
                    'X-CSRF-TOKEN':
                        document
                            .querySelector('meta[name="csrf-token"]')
                            ?.getAttribute('content') || '',
                },
            });
            if (response.ok) {
                const data = await response.json();
                setOrders(data.data || []);
                setCurrentPage(data.current_page || 1);
                setLastPage(data.last_page || 1);
                setTotal(data.total || 0);
                setFrom(data.from || 0);
                setTo(data.to || 0);
            }
        } catch (error) {
            console.error('Error fetching orders:', error);
        } finally {
            setIsLoading(false);
        }
    };

    // Initial fetch and when filters change
    useEffect(() => {
        fetchOrders(1);
    }, [searchTerm, statusFilter, priorityFilter, dateFilter]);

    const handlePageChange = (page: number) => {
        if (page >= 1 && page <= lastPage) {
            fetchOrders(page);
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'pending':
                return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
            case 'approved':
                return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400';
            case 'partially_issued':
                return 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400';
            case 'completed':
                return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
            case 'rejected':
                return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
            default:
                return 'bg-gray-100 text-gray-800';
        }
    };

    const getPriorityColor = (priority: string) => {
        switch (priority) {
            case 'high':
                return 'text-red-600 dark:text-red-400';
            case 'medium':
                return 'text-orange-600 dark:text-orange-400';
            case 'low':
                return 'text-blue-600 dark:text-blue-400';
            default:
                return 'text-gray-600';
        }
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'pending':
                return <Clock className="h-3.5 w-3.5" />;
            case 'approved':
                return <CheckCircle className="h-3.5 w-3.5" />;
            case 'partially_issued':
                return <AlertTriangle className="h-3.5 w-3.5" />;
            case 'completed':
                return <Check className="h-3.5 w-3.5" />;
            case 'rejected':
                return <XCircle className="h-3.5 w-3.5" />;
            default:
                return null;
        }
    };

    const formatDate = (date: string) => {
        return new Date(date).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
        });
    };

    const formatDateTime = (date: string) => {
        return new Date(date).toLocaleString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    return (
        <AppLayout>
            <div className="h-full bg-slate-50 p-4 dark:bg-slate-900">
                {/* Header */}
                <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                    <div>
                        <h1 className="text-xl font-bold text-slate-800 dark:text-slate-100">
                            Orders
                        </h1>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                            Manage and track all bulk store orders
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        <Badge
                            variant="outline"
                            className="bg-white dark:bg-slate-800"
                        >
                            <Clock className="mr-1 h-3 w-3" />
                            Today:{' '}
                            {
                                orders.filter((o) => {
                                    const today = new Date().toDateString();
                                    return (
                                        new Date(
                                            o.request_date,
                                        ).toDateString() === today
                                    );
                                }).length
                            }
                        </Badge>
                        <Badge
                            variant="outline"
                            className="bg-white dark:bg-slate-800"
                        >
                            <Package className="mr-1 h-3 w-3" />
                            Total: {total}
                        </Badge>
                        <button
                            onClick={() => fetchOrders(currentPage)}
                            disabled={isLoading}
                            className="flex h-8 items-center gap-1.5 rounded-lg border border-slate-200 px-3 text-xs hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-700"
                        >
                            <RefreshCw
                                className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`}
                            />
                            Refresh
                        </button>
                    </div>
                </div>

                {/* Filters */}
                <div className="mb-4 flex flex-wrap items-center gap-3 rounded-lg bg-white p-3 shadow-sm dark:bg-slate-800">
                    <div className="min-w-[200px] flex-1">
                        <div className="relative">
                            <Search className="absolute top-1/2 left-3 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                            <input
                                type="text"
                                placeholder="Search by request number or department..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="h-8 w-full rounded-lg border border-slate-200 pr-3 pl-9 text-xs focus:border-blue-400 focus:ring-1 focus:ring-blue-400 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                            />
                        </div>
                    </div>
                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="h-8 rounded-lg border border-slate-200 px-3 text-xs focus:border-blue-400 focus:ring-1 focus:ring-blue-400 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                    >
                        <option value="all">All Status</option>
                        <option value="pending">Pending</option>
                        <option value="approved">Approved</option>
                        <option value="partially_issued">
                            Partially Issued
                        </option>
                        <option value="completed">Completed</option>
                        <option value="rejected">Rejected</option>
                    </select>
                    <select
                        value={priorityFilter}
                        onChange={(e) => setPriorityFilter(e.target.value)}
                        className="h-8 rounded-lg border border-slate-200 px-3 text-xs focus:border-blue-400 focus:ring-1 focus:ring-blue-400 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                    >
                        <option value="all">All Priority</option>
                        <option value="high">High</option>
                        <option value="medium">Medium</option>
                        <option value="low">Low</option>
                    </select>
                    <select
                        value={dateFilter}
                        onChange={(e) => setDateFilter(e.target.value)}
                        className="h-8 rounded-lg border border-slate-200 px-3 text-xs focus:border-blue-400 focus:ring-1 focus:ring-blue-400 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                    >
                        <option value="today">Today</option>
                        <option value="yesterday">Yesterday</option>
                        <option value="week">This Week</option>
                        <option value="month">This Month</option>
                        <option value="all">All Time</option>
                    </select>
                    <button
                        onClick={() => {
                            setSearchTerm('');
                            setStatusFilter('all');
                            setPriorityFilter('all');
                            setDateFilter('today');
                        }}
                        className="flex h-8 items-center gap-1.5 rounded-lg border border-slate-200 px-3 text-xs hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-700"
                    >
                        <XCircle className="h-3.5 w-3.5" />
                        Clear
                    </button>
                </div>

                {/* Orders Table */}
                <div className="overflow-hidden rounded-lg bg-white shadow-sm dark:bg-slate-800">
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
                            <thead className="bg-slate-50 dark:bg-slate-800/50">
                                <tr>
                                    <th className="px-3 py-2 text-left text-xs font-medium tracking-wider text-slate-500 uppercase dark:text-slate-400">
                                        Request #
                                    </th>
                                    <th className="px-3 py-2 text-left text-xs font-medium tracking-wider text-slate-500 uppercase dark:text-slate-400">
                                        Department
                                    </th>
                                    <th className="px-3 py-2 text-left text-xs font-medium tracking-wider text-slate-500 uppercase dark:text-slate-400">
                                        Items
                                    </th>
                                    <th className="px-3 py-2 text-left text-xs font-medium tracking-wider text-slate-500 uppercase dark:text-slate-400">
                                        Status
                                    </th>
                                    <th className="px-3 py-2 text-left text-xs font-medium tracking-wider text-slate-500 uppercase dark:text-slate-400">
                                        Priority
                                    </th>
                                    <th className="px-3 py-2 text-left text-xs font-medium tracking-wider text-slate-500 uppercase dark:text-slate-400">
                                        Requested By
                                    </th>
                                    <th className="px-3 py-2 text-left text-xs font-medium tracking-wider text-slate-500 uppercase dark:text-slate-400">
                                        Date
                                    </th>
                                    <th className="px-3 py-2 text-right text-xs font-medium tracking-wider text-slate-500 uppercase dark:text-slate-400">
                                        Action
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                                {isLoading ? (
                                    Array.from({ length: 5 }).map((_, i) => (
                                        <tr key={i}>
                                            <td
                                                colSpan={8}
                                                className="px-3 py-4 text-center"
                                            >
                                                <div className="flex items-center justify-center">
                                                    <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
                                                    <span className="ml-2 text-sm text-slate-500">
                                                        Loading orders...
                                                    </span>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                ) : orders.length === 0 ? (
                                    <tr>
                                        <td
                                            colSpan={8}
                                            className="px-3 py-8 text-center"
                                        >
                                            <Package className="mx-auto h-10 w-10 text-slate-300 dark:text-slate-600" />
                                            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                                                No orders found
                                            </p>
                                            <p className="text-xs text-slate-400 dark:text-slate-500">
                                                Try adjusting your filters
                                            </p>
                                        </td>
                                    </tr>
                                ) : (
                                    orders.map((order) => (
                                        <tr
                                            key={order.id}
                                            className="cursor-pointer transition-colors hover:bg-slate-50 dark:hover:bg-slate-700/50"
                                            onClick={() => {
                                                setSelectedOrder(order);
                                                setIsViewModalOpen(true);
                                            }}
                                        >
                                            <td className="px-3 py-2">
                                                <span className="text-xs font-medium text-slate-800 dark:text-slate-100">
                                                    {order.request_number}
                                                </span>
                                            </td>
                                            <td className="px-3 py-2">
                                                <div className="flex items-center gap-1.5">
                                                    <Building2 className="h-3 w-3 text-slate-400" />
                                                    <span className="text-xs text-slate-600 dark:text-slate-300">
                                                        {order.department_name}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-3 py-2 text-xs text-slate-600 dark:text-slate-300">
                                                {order.total_items}
                                            </td>
                                            <td className="px-3 py-2">
                                                <Badge
                                                    className={`flex w-fit items-center gap-1 ${getStatusColor(order.status)}`}
                                                >
                                                    {getStatusIcon(
                                                        order.status,
                                                    )}
                                                    {order.status.replace(
                                                        '_',
                                                        ' ',
                                                    )}
                                                </Badge>
                                            </td>
                                            <td className="px-3 py-2">
                                                <Badge
                                                    variant="outline"
                                                    className={getPriorityColor(
                                                        order.priority,
                                                    )}
                                                >
                                                    {order.priority}
                                                </Badge>
                                            </td>
                                            <td className="px-3 py-2">
                                                <div className="flex items-center gap-1.5">
                                                    <User className="h-3 w-3 text-slate-400" />
                                                    <span className="text-xs text-slate-600 dark:text-slate-300">
                                                        {
                                                            order.requested_by_name
                                                        }
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-3 py-2">
                                                <div className="flex items-center gap-1.5">
                                                    <Calendar className="h-3 w-3 text-slate-400" />
                                                    <span className="text-xs text-slate-500 dark:text-slate-400">
                                                        {formatDate(
                                                            order.request_date,
                                                        )}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-3 py-2 text-right">
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setSelectedOrder(order);
                                                        setIsViewModalOpen(
                                                            true,
                                                        );
                                                    }}
                                                    className="inline-flex items-center gap-1 rounded-lg bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700 transition-colors hover:bg-blue-100 dark:bg-blue-900/30 dark:text-blue-400 dark:hover:bg-blue-900/50"
                                                >
                                                    <Eye className="h-3 w-3" />
                                                    View
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination */}
                    {!isLoading && orders.length > 0 && (
                        <Pagination
                            currentPage={currentPage}
                            lastPage={lastPage}
                            onPageChange={handlePageChange}
                            total={total}
                            from={from}
                            to={to}
                        />
                    )}
                </div>

                {/* View Order Modal */}
                {isViewModalOpen && selectedOrder && (
                    <ViewOrderModal
                        order={selectedOrder}
                        onClose={() => {
                            setIsViewModalOpen(false);
                            setSelectedOrder(null);
                        }}
                    />
                )}
            </div>
        </AppLayout>
    );
}

// View Order Modal Component
function ViewOrderModal({
    order,
    onClose,
}: {
    order: Order;
    onClose: () => void;
}) {
    const getStatusColor = (status: string) => {
        switch (status) {
            case 'pending':
                return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
            case 'approved':
                return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400';
            case 'partially_issued':
                return 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400';
            case 'completed':
                return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
            case 'rejected':
                return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
            default:
                return 'bg-gray-100 text-gray-800';
        }
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'pending':
                return <Clock className="h-3.5 w-3.5" />;
            case 'approved':
                return <CheckCircle className="h-3.5 w-3.5" />;
            case 'partially_issued':
                return <AlertTriangle className="h-3.5 w-3.5" />;
            case 'completed':
                return <Check className="h-3.5 w-3.5" />;
            case 'rejected':
                return <XCircle className="h-3.5 w-3.5" />;
            default:
                return null;
        }
    };

    const formatDate = (date: string) => {
        if (!date) return 'N/A';
        return new Date(date).toLocaleString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
            onClick={(e) => {
                if (e.target === e.currentTarget) onClose();
            }}
        >
            <div className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-xl bg-white shadow-2xl dark:bg-slate-800">
                {/* Header */}
                <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3 dark:border-slate-700">
                    <div className="flex items-center gap-3">
                        <div className="rounded-lg bg-blue-100 p-2 dark:bg-blue-900/30">
                            <FileText className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div>
                            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">
                                Order Details
                            </h3>
                            <p className="text-[10px] text-slate-500 dark:text-slate-400">
                                {order.request_number}
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <Badge className={getStatusColor(order.status)}>
                            {getStatusIcon(order.status)}
                            {order.status.replace('_', ' ')}
                        </Badge>
                        <button
                            onClick={onClose}
                            className="rounded-lg p-1 transition-colors hover:bg-slate-100 dark:hover:bg-slate-700"
                        >
                            <XCircle className="h-4 w-4 text-slate-500" />
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="p-5">
                    {/* Order Info */}
                    <div className="mb-4 grid grid-cols-2 gap-4 md:grid-cols-4">
                        <div className="rounded-lg bg-slate-50 p-3 dark:bg-slate-700/50">
                            <p className="text-[10px] text-slate-500 dark:text-slate-400">
                                Department
                            </p>
                            <p className="text-sm font-medium text-slate-800 dark:text-slate-100">
                                {order.department_name}
                            </p>
                        </div>
                        <div className="rounded-lg bg-slate-50 p-3 dark:bg-slate-700/50">
                            <p className="text-[10px] text-slate-500 dark:text-slate-400">
                                Total Items
                            </p>
                            <p className="text-sm font-medium text-slate-800 dark:text-slate-100">
                                {order.total_items}
                            </p>
                        </div>
                        <div className="rounded-lg bg-slate-50 p-3 dark:bg-slate-700/50">
                            <p className="text-[10px] text-slate-500 dark:text-slate-400">
                                Requested By
                            </p>
                            <p className="text-sm font-medium text-slate-800 dark:text-slate-100">
                                {order.requested_by_name}
                            </p>
                        </div>
                        <div className="rounded-lg bg-slate-50 p-3 dark:bg-slate-700/50">
                            <p className="text-[10px] text-slate-500 dark:text-slate-400">
                                Request Date
                            </p>
                            <p className="text-sm font-medium text-slate-800 dark:text-slate-100">
                                {formatDate(order.request_date)}
                            </p>
                        </div>
                    </div>

                    {/* Order Items Table */}
                    <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-700">
                        <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
                            <thead className="bg-slate-50 dark:bg-slate-800/50">
                                <tr>
                                    <th className="px-3 py-2 text-left text-xs font-medium text-slate-500 uppercase dark:text-slate-400">
                                        Product
                                    </th>
                                    <th className="px-3 py-2 text-left text-xs font-medium text-slate-500 uppercase dark:text-slate-400">
                                        Code
                                    </th>
                                    <th className="px-3 py-2 text-left text-xs font-medium text-slate-500 uppercase dark:text-slate-400">
                                        Requested
                                    </th>
                                    <th className="px-3 py-2 text-left text-xs font-medium text-slate-500 uppercase dark:text-slate-400">
                                        Issued
                                    </th>
                                    <th className="px-3 py-2 text-left text-xs font-medium text-slate-500 uppercase dark:text-slate-400">
                                        Unit
                                    </th>
                                    <th className="px-3 py-2 text-left text-xs font-medium text-slate-500 uppercase dark:text-slate-400">
                                        Status
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                                {order.items && order.items.length > 0 ? (
                                    order.items.map((item) => (
                                        <tr
                                            key={item.id}
                                            className="hover:bg-slate-50 dark:hover:bg-slate-700/50"
                                        >
                                            <td className="px-3 py-2 text-xs text-slate-800 dark:text-slate-100">
                                                {item.product_name}
                                            </td>
                                            <td className="px-3 py-2 text-xs text-slate-500 dark:text-slate-400">
                                                {item.product_code}
                                            </td>
                                            <td className="px-3 py-2 text-xs text-slate-600 dark:text-slate-300">
                                                {item.requested_quantity}
                                            </td>
                                            <td className="px-3 py-2 text-xs text-slate-600 dark:text-slate-300">
                                                {item.issued_quantity}
                                            </td>
                                            <td className="px-3 py-2 text-xs text-slate-500 dark:text-slate-400">
                                                {item.unit_of_measure}
                                            </td>
                                            <td className="px-3 py-2">
                                                <Badge
                                                    className={getStatusColor(
                                                        item.status,
                                                    )}
                                                >
                                                    {item.status}
                                                </Badge>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td
                                            colSpan={6}
                                            className="px-3 py-4 text-center text-sm text-slate-500"
                                        >
                                            No items found for this order
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Notes */}
                    {order.notes && (
                        <div className="mt-4 rounded-lg bg-slate-50 p-3 dark:bg-slate-700/50">
                            <p className="text-[10px] text-slate-500 dark:text-slate-400">
                                Notes
                            </p>
                            <p className="text-sm text-slate-800 dark:text-slate-100">
                                {order.notes}
                            </p>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="flex flex-wrap items-center justify-between border-t border-slate-200 px-5 py-3 dark:border-slate-700">
                    <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 dark:text-slate-400">
                        {order.approved_date && (
                            <span>
                                Approved: {formatDate(order.approved_date)}
                            </span>
                        )}
                        {order.completed_date && (
                            <span>
                                Completed: {formatDate(order.completed_date)}
                            </span>
                        )}
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={onClose}
                            className="rounded-lg border border-slate-300 px-4 py-1.5 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-700"
                        >
                            Close
                        </button>
                        <button
                            onClick={() => window.print()}
                            className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-1.5 text-xs font-medium text-white transition-colors hover:bg-blue-700"
                        >
                            <Printer className="h-3.5 w-3.5" />
                            Print
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
