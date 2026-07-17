import AppLayout from '@/layouts/app-layout';
import { Head, router, usePage } from '@inertiajs/react';
import {
    Package,
    Pill,
    CreditCard,
    AlertTriangle,
    Clock,
    Eye,
    PackageX,
    CheckCircle,
    FileText,
    ChevronLeft,
    ChevronRight,
    Search,
    TrendingUp,
    Filter,
    Bell,
    AlertCircle,
    CheckSquare,
} from 'lucide-react';
import { StatCard } from '@/components/dashboard/cards/StatCard';
import { useState } from 'react';
import {
    PieChart,
    Pie,
    Cell,
    ResponsiveContainer,
    Tooltip,
    Legend,
} from 'recharts';

const recentTransactions = [
    {
        id: 1,
        invoiceNumber: 'INV-2024-001',
        patientName: 'John Doe',
        products: ['Amoxicillin', 'Paracetamol'],
        quantity: 3,
        totalAmount: 245.5,
        status: 'completed',
        date: '2024-01-15 10:30:00',
    },
    {
        id: 2,
        invoiceNumber: 'INV-2024-002',
        patientName: 'Jane Smith',
        products: ['Ibuprofen'],
        quantity: 2,
        totalAmount: 89.99,
        status: 'pending',
        date: '2024-01-15 09:15:00',
    },
    {
        id: 3,
        invoiceNumber: 'INV-2024-003',
        patientName: 'Robert Johnson',
        products: ['Omeprazole', 'Metformin'],
        quantity: 4,
        totalAmount: 367.25,
        status: 'completed',
        date: '2024-01-14 15:45:00',
    },
    {
        id: 4,
        invoiceNumber: 'INV-2024-004',
        patientName: 'Maria Garcia',
        products: ['Lisinopril'],
        quantity: 1,
        totalAmount: 56.75,
        status: 'cancelled',
        date: '2024-01-14 11:20:00',
    },
    {
        id: 5,
        invoiceNumber: 'INV-2024-005',
        patientName: 'David Wilson',
        products: ['Amoxicillin', 'Aspirin', 'Ibuprofen'],
        quantity: 6,
        totalAmount: 478.3,
        status: 'completed',
        date: '2024-01-13 14:00:00',
    },
];

type FilterStatus = 'all' | 'completed' | 'pending' | 'cancelled';
type NotificationFilter =
    | 'all'
    | 'unread'
    | 'warning'
    | 'danger'
    | 'success'
    | 'info';

const statusStyles: Record<string, string> = {
    completed:
        'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400 dark:ring-emerald-800',
    pending:
        'bg-amber-50 text-amber-700 ring-1 ring-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:ring-amber-800',
    cancelled:
        'bg-red-50 text-red-700 ring-1 ring-red-200 dark:bg-red-900/20 dark:text-red-400 dark:ring-red-800',
};

const FILTERS: { label: string; value: FilterStatus }[] = [
    { label: 'All', value: 'all' },
    { label: 'Completed', value: 'completed' },
    { label: 'Pending', value: 'pending' },
    { label: 'Cancelled', value: 'cancelled' },
];

const NOTIFICATION_FILTERS: {
    label: string;
    value: NotificationFilter;
    icon: any;
}[] = [
    { label: 'All', value: 'all', icon: Bell },
    { label: 'Unread', value: 'unread', icon: AlertCircle },
    { label: 'Warning', value: 'warning', icon: AlertTriangle },
    { label: 'Danger', value: 'danger', icon: AlertCircle },
    { label: 'Success', value: 'success', icon: CheckSquare },
    { label: 'Info', value: 'info', icon: Bell },
];

function formatCurrency(v: number) {
    return `ZMW ${v.toLocaleString('en-ZM', { minimumFractionDigits: 2 })}`;
}

// Custom tooltip for pie chart
const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
        return (
            <div className="rounded-lg border border-slate-200 bg-white p-2 shadow-lg dark:border-slate-700 dark:bg-slate-800">
                <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    {payload[0].name}
                </p>
                <p className="text-sm font-bold text-slate-900 dark:text-white">
                    {payload[0].value} units
                </p>
            </div>
        );
    }
    return null;
};

// Mature color scheme for notifications (no rounded edges, just borders)
const getNotificationBorderColor = (type: string) => {
    switch (type) {
        case 'danger':
            return 'border-l-4 border-l-red-400 border-b border-slate-100 dark:border-l-red-500 dark:border-slate-800';
        case 'warning':
            return 'border-l-4 border-l-amber-400 border-b border-slate-100 dark:border-l-amber-500 dark:border-slate-800';
        case 'success':
            return 'border-l-4 border-l-emerald-400 border-b border-slate-100 dark:border-l-emerald-500 dark:border-slate-800';
        case 'info':
            return 'border-l-4 border-l-blue-400 border-b border-slate-100 dark:border-l-blue-500 dark:border-slate-800';
        default:
            return 'border-b border-slate-100 dark:border-slate-800';
    }
};

const getTypeIcon = (type: string) => {
    switch (type) {
        case 'danger':
            return AlertCircle;
        case 'warning':
            return AlertTriangle;
        case 'success':
            return CheckCircle;
        default:
            return Bell;
    }
};

function formatTimeAgo(dateString: string) {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 60) return `${diffMins} min ago`;
    if (diffHours < 24)
        return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
}

export default function PharmacyDashboard() {
    const [activeFilter, setActiveFilter] = useState<FilterStatus>('all');
    const [searchTerm, setSearchTerm] = useState('');
    const [notificationFilter, setNotificationFilter] =
        useState<NotificationFilter>('all');
    const {
        stats,
        topDispensedDrugs,
        weeklyTrend,
        notifications,
        recentTransactions,
    } = usePage().props;
    console.log(stats, topDispensedDrugs, weeklyTrend, notifications);
    // Filter notifications (limit to 5)
    const filteredNotifications = notifications
        .filter((notification) => {
            if (notificationFilter === 'all') return true;
            if (notificationFilter === 'unread') return !notification.read;
            return notification.type === notificationFilter;
        })
        .slice(0, 5); // Limit to 5 notifications

    const unreadCount = notifications.filter((n) => !n.read).length;

    // Filter transactions
    const filteredTransactions = recentTransactions.filter((transaction) => {
        const matchesSearch =
            transaction.patientName
                .toLowerCase()
                .includes(searchTerm.toLowerCase()) ||
            transaction.invoiceNumber
                .toLowerCase()
                .includes(searchTerm.toLowerCase());
        const matchesStatus =
            activeFilter === 'all' || transaction.status === activeFilter;
        return matchesSearch && matchesStatus;
    });

    const counts: Record<FilterStatus, number> = {
        all: recentTransactions.length,
        completed: recentTransactions.filter((t) => t.status === 'completed')
            .length,
        pending: recentTransactions.filter((t) => t.status === 'pending')
            .length,
        cancelled: recentTransactions.filter((t) => t.status === 'cancelled')
            .length,
    };

    return (
        <AppLayout
            breadcrumbs={[
                { title: 'Pharmacy', href: '/pharmacy' },
                { title: 'Dashboard', href: '/pharmacy/logistics' },
            ]}
        >
            <Head title="Pharmacy Dashboard" />

            <div className="flex h-full min-h-screen flex-1 flex-col gap-3 bg-slate-50 p-3 dark:bg-slate-900">
                {/* Header */}
                <div className="mb-1">
                    <h1 className="text-xl font-bold text-slate-800 dark:text-white">
                        Pharmacy Dashboard
                    </h1>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                        Manage products, track dispensations, and monitor
                        inventory
                    </p>
                </div>

                {/* Two Column Layout */}
                <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
                    {/* Left Column - Stat Cards + Pie Chart */}
                    <div className="space-y-3 lg:col-span-2">
                        {/* Stat Cards Row */}
                        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                            <StatCard
                                title="Products Managed"
                                value={stats.totalProducts}
                                icon={<Package />}
                                trend={{
                                    direction: 'up',
                                    percentage: stats.productsTrend,
                                }}
                                colorScheme="purple"
                            />
                            <StatCard
                                title="Products Dispensed"
                                value={stats.productsDispensed}
                                icon={<Pill />}
                                trend={{
                                    direction: 'up',
                                    percentage: stats.dispensedTrend,
                                }}
                                colorScheme="blue"
                            />
                            <StatCard
                                title="Total Transactions"
                                value={stats.totalTransactions}
                                icon={<CreditCard />}
                                trend={{
                                    direction: 'up',
                                    percentage: stats.transactionsTrend,
                                }}
                                colorScheme="green"
                            />
                        </div>

                        {/* Top Dispensed Drugs Pie Chart */}
                        <div className="rounded-lg border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800">
                            <div className="flex items-center gap-2 border-b border-slate-100 px-3 py-2 dark:border-slate-700">
                                <div className="rounded-md bg-slate-100 p-1 dark:bg-slate-700">
                                    <TrendingUp className="h-3.5 w-3.5 text-slate-500 dark:text-slate-400" />
                                </div>
                                <div>
                                    <h3 className="text-xs font-semibold text-slate-800 dark:text-slate-100">
                                        Top Dispensed Drugs
                                    </h3>
                                    <p className="text-[9px] text-slate-500 dark:text-slate-400">
                                        Most prescribed medications this month
                                    </p>
                                </div>
                            </div>
                            <div className="p-3">
                                <ResponsiveContainer width="100%" height={200}>
                                    <PieChart>
                                        <Pie
                                            data={topDispensedDrugs}
                                            cx="50%"
                                            cy="50%"
                                            innerRadius={50}
                                            outerRadius={70}
                                            paddingAngle={3}
                                            dataKey="value"
                                            label={({ name, percent }) =>
                                                `${name} ${(percent * 100).toFixed(0)}%`
                                            }
                                            labelLine={false}
                                            className="cursor-pointer"
                                        >
                                            {topDispensedDrugs.map(
                                                (entry, index) => (
                                                    <Cell
                                                        key={`cell-${index}`}
                                                        fill={entry.color}
                                                        stroke="#fff"
                                                        strokeWidth={2}
                                                    />
                                                ),
                                            )}
                                        </Pie>
                                        <Tooltip content={<CustomTooltip />} />
                                        <Legend
                                            wrapperStyle={{
                                                fontSize: '10px',
                                                paddingTop: '8px',
                                            }}
                                            iconType="circle"
                                            iconSize={6}
                                        />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    </div>

                    {/* Right Column - Notifications with Filter */}
                    <div className="lg:col-span-1">
                        <div className="rounded-lg border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800">
                            {/* Notification Header */}
                            <div className="border-b border-slate-100 px-3 py-2 dark:border-slate-700">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <Bell className="h-3.5 w-3.5 text-slate-500 dark:text-slate-400" />
                                        <h3 className="text-xs font-semibold text-slate-800 dark:text-slate-100">
                                            Notifications
                                        </h3>
                                        {unreadCount > 0 && (
                                            <span className="rounded-full bg-red-100 px-1.5 py-0 text-[9px] font-medium text-red-700 dark:bg-red-900/30 dark:text-red-400">
                                                {unreadCount}
                                            </span>
                                        )}
                                    </div>

                                    {/* Notification Filter Dropdown */}
                                    <div className="relative">
                                        <select
                                            value={notificationFilter}
                                            onChange={(e) =>
                                                setNotificationFilter(
                                                    e.target
                                                        .value as NotificationFilter,
                                                )
                                            }
                                            className="rounded border border-slate-200 bg-white px-2 py-0.5 text-[9px] font-medium text-slate-600 focus:ring-1 focus:ring-blue-400 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
                                        >
                                            {NOTIFICATION_FILTERS.map(
                                                (filter) => (
                                                    <option
                                                        key={filter.value}
                                                        value={filter.value}
                                                    >
                                                        {filter.label}
                                                    </option>
                                                ),
                                            )}
                                        </select>
                                    </div>
                                </div>
                            </div>

                            {/* Notifications List - p-0 m-0, only bottom border */}
                            <div className="space-y-0">
                                {filteredNotifications.length === 0 ? (
                                    <div className="py-8 text-center">
                                        <Bell className="mx-auto mb-2 h-6 w-6 text-slate-300 dark:text-slate-600" />
                                        <p className="text-xs text-slate-500 dark:text-slate-400">
                                            No notifications
                                        </p>
                                    </div>
                                ) : (
                                    filteredNotifications.map(
                                        (notification, idx) => {
                                            const IconComponent = getTypeIcon(
                                                notification.type,
                                            );
                                            const isLast =
                                                idx ===
                                                filteredNotifications.length -
                                                    1;
                                            return (
                                                <a
                                                    key={notification.id}
                                                    href={notification.link}
                                                    className={`block p-2 transition-all hover:bg-slate-50 dark:hover:bg-slate-800/50 ${getNotificationBorderColor(notification.type)} ${!isLast ? 'border-b border-slate-100 dark:border-slate-800' : ''}`}
                                                >
                                                    <div className="flex items-start gap-2">
                                                        <div className="flex-shrink-0">
                                                            <IconComponent
                                                                className={`mt-0.5 h-3 w-3 ${
                                                                    notification.type ===
                                                                    'danger'
                                                                        ? 'text-red-500'
                                                                        : notification.type ===
                                                                            'warning'
                                                                          ? 'text-amber-500'
                                                                          : notification.type ===
                                                                              'success'
                                                                            ? 'text-emerald-500'
                                                                            : 'text-blue-500'
                                                                }`}
                                                            />
                                                        </div>
                                                        <div className="min-w-0 flex-1">
                                                            <div className="flex items-center justify-between gap-1">
                                                                <p className="text-[10px] font-semibold text-slate-700 dark:text-slate-300">
                                                                    {
                                                                        notification.title
                                                                    }
                                                                    {!notification.read && (
                                                                        <span className="ml-1.5 inline-block h-1.5 w-1.5 rounded-full bg-blue-500"></span>
                                                                    )}
                                                                </p>
                                                                <span className="text-[8px] text-slate-400">
                                                                    {formatTimeAgo(
                                                                        notification.time,
                                                                    )}
                                                                </span>
                                                            </div>
                                                            <p className="mt-0.5 line-clamp-2 text-[9px] leading-tight text-slate-600 dark:text-slate-400">
                                                                {
                                                                    notification.message
                                                                }
                                                            </p>
                                                        </div>
                                                    </div>
                                                </a>
                                            );
                                        },
                                    )
                                )}
                            </div>

                            {/* View All Link */}
                            {notifications.length > 5 && (
                                <div className="border-t border-slate-100 px-3 py-2 text-center dark:border-slate-700">
                                    <a
                                        href="/pharmacy/notifications"
                                        className="text-[9px] font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400"
                                    >
                                        View all notifications →
                                    </a>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Transactions Table */}
                <div className="rounded-lg border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800">
                    {/* Table header */}
                    <div className="flex flex-col gap-2 border-b border-slate-100 px-3 py-2 sm:flex-row sm:items-center sm:justify-between dark:border-slate-700">
                        <div className="flex items-center gap-2">
                            <div className="rounded-md bg-slate-100 p-1 dark:bg-slate-700">
                                <FileText className="h-3.5 w-3.5 text-slate-500 dark:text-slate-400" />
                            </div>
                            <div>
                                <h3 className="text-xs font-semibold text-slate-800 dark:text-slate-100">
                                    Recent Transactions
                                </h3>
                                <p className="text-[9px] text-slate-500 dark:text-slate-400">
                                    {recentTransactions.length} transactions
                                    total
                                </p>
                            </div>
                        </div>

                        {/* Filter tabs */}
                        <div className="flex divide-x divide-slate-200 self-start overflow-hidden rounded-md border border-slate-200 dark:divide-slate-600 dark:border-slate-600">
                            {FILTERS.map((f) => (
                                <button
                                    key={f.value}
                                    onClick={() => setActiveFilter(f.value)}
                                    className={`flex items-center gap-1 px-2 py-1 text-[9px] font-medium transition-colors ${
                                        activeFilter === f.value
                                            ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900'
                                            : 'bg-white text-slate-500 hover:bg-slate-50 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700'
                                    }`}
                                >
                                    {f.label}
                                    {counts[f.value] > 0 && (
                                        <span
                                            className={`rounded-full px-1 py-0 text-[8px] tabular-nums ${
                                                activeFilter === f.value
                                                    ? 'bg-white/20 text-white dark:bg-slate-900/20 dark:text-slate-900'
                                                    : 'bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400'
                                            }`}
                                        >
                                            {counts[f.value]}
                                        </span>
                                    )}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Search Bar */}
                    <div className="border-b border-slate-100 px-3 py-2 dark:border-slate-700">
                        <div className="relative max-w-xs">
                            <Search className="absolute top-1/2 left-2 h-3 w-3 -translate-y-1/2 text-slate-400" />
                            <input
                                type="text"
                                placeholder="Search by patient or invoice..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full rounded-md border border-slate-200 py-1 pr-2 pl-6 text-[10px] focus:border-blue-400 focus:ring-1 focus:ring-blue-400 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                            />
                        </div>
                    </div>

                    {/* Table */}
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-slate-100 dark:border-slate-700">
                                    {[
                                        'Invoice #',
                                        'Patient',
                                        'Products',
                                        'Qty',
                                        'Total',
                                        'Status',
                                        'Date',
                                        'Actions',
                                    ].map((h) => (
                                        <th
                                            key={h}
                                            className="px-3 py-2 text-left text-[9px] font-semibold tracking-wider whitespace-nowrap text-slate-400 uppercase dark:text-slate-500"
                                        >
                                            {h}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50 dark:divide-slate-700/50">
                                {filteredTransactions.length === 0 ? (
                                    <tr>
                                        <td
                                            colSpan={8}
                                            className="px-3 py-8 text-center"
                                        >
                                            <FileText className="mx-auto mb-1 h-6 w-6 text-slate-300 dark:text-slate-600" />
                                            <p className="text-xs text-slate-500 dark:text-slate-400">
                                                No recentTransactionsmatch the
                                                current filter.
                                            </p>
                                        </td>
                                    </tr>
                                ) : (
                                    filteredTransactions.map((transaction) => (
                                        <tr
                                            key={transaction.id}
                                            className="transition-colors hover:bg-slate-50/70 dark:hover:bg-slate-700/30"
                                        >
                                            <td className="px-3 py-2 font-mono text-[10px] whitespace-nowrap text-slate-600 dark:text-slate-300">
                                                {transaction.invoiceNumber}
                                            </td>
                                            <td className="px-3 py-2">
                                                <span className="text-[10px] font-medium text-slate-800 dark:text-slate-100">
                                                    {transaction.patientName}
                                                </span>
                                            </td>
                                            <td className="px-3 py-2">
                                                <div className="flex flex-wrap gap-1">
                                                    {transaction.products
                                                        .slice(0, 2)
                                                        .map((product, idx) => (
                                                            <span
                                                                key={idx}
                                                                className="rounded bg-slate-100 px-1 py-0 text-[8px] dark:bg-slate-700"
                                                            >
                                                                {product}
                                                            </span>
                                                        ))}
                                                    {transaction.products
                                                        .length > 2 && (
                                                        <span className="text-[8px] text-slate-500">
                                                            +
                                                            {transaction
                                                                .products
                                                                .length - 2}
                                                        </span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-3 py-2 text-[10px] whitespace-nowrap text-slate-500 dark:text-slate-400">
                                                {transaction.quantity}
                                            </td>
                                            <td className="px-3 py-2 text-[10px] font-medium whitespace-nowrap text-slate-800 tabular-nums dark:text-slate-100">
                                                {formatCurrency(
                                                    transaction.totalAmount,
                                                )}
                                            </td>
                                            <td className="px-3 py-2 whitespace-nowrap">
                                                <span
                                                    className={`inline-flex items-center rounded-full px-1.5 py-0 text-[8px] font-medium capitalize ${statusStyles[transaction.status]}`}
                                                >
                                                    {transaction.status}
                                                </span>
                                            </td>
                                            <td className="px-3 py-2 text-[10px] whitespace-nowrap text-slate-500 dark:text-slate-400">
                                                {new Date(
                                                    transaction.date,
                                                ).toLocaleDateString()}
                                            </td>
                                            <td className="px-3 py-2 whitespace-nowrap">
                                                <button
                                                    className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[9px] font-medium text-slate-600 transition-colors hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700"
                                                    title="View transaction details"
                                                >
                                                    <Eye className="h-2.5 w-2.5" />
                                                    Details
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination */}
                    <div className="flex flex-col gap-2 border-t border-slate-100 px-3 py-2 sm:flex-row sm:items-center sm:justify-between dark:border-slate-700">
                        <p className="text-[9px] text-slate-500 dark:text-slate-400">
                            Showing{' '}
                            <span className="font-medium text-slate-700 dark:text-slate-200">
                                1–{filteredTransactions.length}
                            </span>{' '}
                            of{' '}
                            <span className="font-medium text-slate-700 dark:text-slate-200">
                                {filteredTransactions.length}
                            </span>{' '}
                            transactions
                        </p>

                        <div className="flex items-center gap-1">
                            <button
                                disabled={true}
                                className="rounded p-1 text-slate-500 transition-colors hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-30 dark:hover:bg-slate-700"
                            >
                                <ChevronLeft className="h-3 w-3" />
                            </button>
                            <button className="min-w-[24px] rounded bg-slate-900 px-1.5 py-0.5 text-[9px] font-medium text-white dark:bg-slate-100 dark:text-slate-900">
                                1
                            </button>
                            <button
                                disabled={true}
                                className="rounded p-1 text-slate-500 transition-colors hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-30 dark:hover:bg-slate-700"
                            >
                                <ChevronRight className="h-3 w-3" />
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}
