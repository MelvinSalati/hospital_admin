// Pages/BulkStore/Dashboard.tsx
import AppLayout from '@/layouts/app-layout';
import { Head } from '@inertiajs/react';
import { BreadcrumbItem } from '@/types';
import {
    Package,
    DollarSign,
    AlertTriangle,
    Calendar,
    ArrowUp,
    ArrowDown,
    Activity,
    TrendingUp,
    Users,
    Truck,
    Clock,
    FileText,
    CheckCircle,
    AlertCircle,
    ShoppingCart,
    Zap,
    BarChart3,
    PieChart as PieChartIcon,
    RefreshCw,
    Download,
    Filter,
} from 'lucide-react';
import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import {
    Bar,
    BarChart,
    XAxis,
    YAxis,
    Tooltip,
    Legend,
    ResponsiveContainer,
    PieChart,
    Pie,
    Cell,
} from 'recharts';
import { Badge } from '@/components/ui/badge';
import { useState } from 'react';

// ============================================
// TYPES
// ============================================

interface DashboardStats {
    totalProducts: number;
    totalStockValue: number;
    totalQuantityAvailable: number;
    lowStockItems: number;
    outOfStockItems: number;
    overstockItems: number;
    nearExpiryItems: number;
    expiredItems: number;
    stockReceivedToday: number;
    stockIssuedToday: number;
    adjustmentsToday: number;
    returnsToday: number;
    pendingOrders: number;
    completedOrders: number;
    departmentsServed: number;
    pendingRequests: number;
    monthlyConsumption: number;
    monthlyReceived: number;
    monthlyAdjustments: number;
    monthlyReturns: number;
}

// ============================================
// DUMMY DATA
// ============================================

const stats: DashboardStats = {
    totalProducts: 1245,
    totalStockValue: 2800000,
    totalQuantityAvailable: 456789,
    lowStockItems: 46,
    outOfStockItems: 12,
    overstockItems: 23,
    nearExpiryItems: 78,
    expiredItems: 5,
    stockReceivedToday: 12500,
    stockIssuedToday: 8200,
    adjustmentsToday: 350,
    returnsToday: 180,
    pendingOrders: 14,
    completedOrders: 56,
    departmentsServed: 12,
    pendingRequests: 8,
    monthlyConsumption: 145000,
    monthlyReceived: 168000,
    monthlyAdjustments: 2450,
    monthlyReturns: 1200,
};

// Monthly summary data
const monthlySummaryData = [
    { metric: 'Consumption', value: 145000, change: 12, color: '#3b82f6' },
    { metric: 'Received', value: 168000, change: 8, color: '#22c55e' },
    { metric: 'Adjustments', value: 2450, change: -5, color: '#f59e0b' },
    { metric: 'Returns', value: 1200, change: -3, color: '#ef4444' },
];

// Top products data
const topProductsData = [
    { name: 'Paracetamol 500mg', quantity: 25000, percentage: 15 },
    { name: 'ART Drugs', quantity: 18400, percentage: 11 },
    { name: 'Antibiotics', quantity: 12500, percentage: 8 },
    { name: 'IV Fluids', quantity: 9800, percentage: 6 },
    { name: 'Syringes', quantity: 8700, percentage: 5 },
];

// Department consumption data
const departmentData = [
    { department: 'Pharmacy', consumption: 35000 },
    { department: 'OPD', consumption: 22000 },
    { department: 'Laboratory', consumption: 15000 },
    { department: 'Maternity', consumption: 12000 },
    { department: 'Surgical', consumption: 10000 },
];

// Recent transactions
const recentTransactions = [
    {
        date: 'Today',
        product: 'Ceftriaxone 1g',
        type: 'Received',
        quantity: 500,
        status: 'completed',
    },
    {
        date: 'Today',
        product: 'Surgical Gloves',
        type: 'Issued',
        quantity: 200,
        status: 'completed',
    },
    {
        date: 'Today',
        product: 'Syringes 5ml',
        type: 'Adjusted',
        quantity: -50,
        status: 'pending',
    },
    {
        date: 'Yesterday',
        product: 'Paracetamol',
        type: 'Received',
        quantity: 1000,
        status: 'completed',
    },
    {
        date: 'Yesterday',
        product: 'IV Fluids 1L',
        type: 'Issued',
        quantity: 150,
        status: 'completed',
    },
];

// Pending actions
const pendingActions = [
    { action: 'Approve Requests', count: 14, priority: 'high', icon: Clock },
    { action: 'Receive Orders', count: 5, priority: 'medium', icon: Truck },
    {
        action: 'Stock Adjustments',
        count: 8,
        priority: 'medium',
        icon: AlertTriangle,
    },
    { action: 'Expiry Review', count: 3, priority: 'low', icon: Calendar },
];

// ============================================
// STAT CARD COMPONENT
// ============================================

interface StatCardProps {
    title: string;
    value: string | number;
    icon: React.ReactNode;
    color:
        | 'red'
        | 'blue'
        | 'green'
        | 'yellow'
        | 'purple'
        | 'teal'
        | 'orange'
        | 'pink';
    subtitle?: string;
    trend?: {
        value: number;
        direction: 'up' | 'down';
        label: string;
    };
    className?: string;
}

const colorConfig = {
    red: {
        bg: 'bg-red-50 dark:bg-red-950/30',
        icon: 'text-red-600 dark:text-red-400',
        text: 'text-red-700 dark:text-red-300',
    },
    blue: {
        bg: 'bg-blue-50 dark:bg-blue-950/30',
        icon: 'text-blue-600 dark:text-blue-400',
        text: 'text-blue-700 dark:text-blue-300',
    },
    green: {
        bg: 'bg-green-50 dark:bg-green-950/30',
        icon: 'text-green-600 dark:text-green-400',
        text: 'text-green-700 dark:text-green-300',
    },
    yellow: {
        bg: 'bg-yellow-50 dark:bg-yellow-950/30',
        icon: 'text-yellow-600 dark:text-yellow-400',
        text: 'text-yellow-700 dark:text-yellow-300',
    },
    purple: {
        bg: 'bg-purple-50 dark:bg-purple-950/30',
        icon: 'text-purple-600 dark:text-purple-400',
        text: 'text-purple-700 dark:text-purple-300',
    },
    teal: {
        bg: 'bg-teal-50 dark:bg-teal-950/30',
        icon: 'text-teal-600 dark:text-teal-400',
        text: 'text-teal-700 dark:text-teal-300',
    },
    orange: {
        bg: 'bg-orange-50 dark:bg-orange-950/30',
        icon: 'text-orange-600 dark:text-orange-400',
        text: 'text-orange-700 dark:text-orange-300',
    },
    pink: {
        bg: 'bg-pink-50 dark:bg-pink-950/30',
        icon: 'text-pink-600 dark:text-pink-400',
        text: 'text-pink-700 dark:text-pink-300',
    },
};

const StatCard: React.FC<StatCardProps> = ({
    title,
    value,
    icon,
    color,
    subtitle,
    trend,
    className = '',
}) => {
    const colors = colorConfig[color];

    return (
        <div
            className={`rounded-xl ${colors.bg} p-4 shadow-sm transition-shadow hover:shadow-md ${className}`}
        >
            <div className="flex items-start justify-between">
                <div className="flex-1">
                    <p className="text-[10px] font-medium tracking-wider text-slate-500 uppercase dark:text-slate-400">
                        {title}
                    </p>
                    <p className={`text-2xl font-bold ${colors.text} mt-0.5`}>
                        {value}
                    </p>
                    {subtitle && (
                        <p className="mt-0.5 text-[10px] text-slate-400 dark:text-slate-500">
                            {subtitle}
                        </p>
                    )}
                    {trend && (
                        <div className="mt-1 flex items-center gap-1">
                            {trend.direction === 'up' ? (
                                <ArrowUp className="h-3 w-3 text-green-500" />
                            ) : (
                                <ArrowDown className="h-3 w-3 text-red-500" />
                            )}
                            <span
                                className={`text-xs font-medium ${trend.direction === 'up' ? 'text-green-600' : 'text-red-600'}`}
                            >
                                {trend.value}%
                            </span>
                            <span className="text-[10px] text-slate-400">
                                {trend.label}
                            </span>
                        </div>
                    )}
                </div>
                <div className={`rounded-lg ${colors.bg} p-2`}>
                    <div className={colors.icon}>{icon}</div>
                </div>
            </div>
        </div>
    );
};

// ============================================
// MAIN COMPONENT
// ============================================

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Bulk Store', href: '/bulkstore' },
    { title: 'Dashboard', href: '/bulkstore/dashboard' },
];

export default function Dashboard() {
    const [dateRange, setDateRange] = useState('This Month');
    const [isRefreshing, setIsRefreshing] = useState(false);

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-ZM', {
            style: 'currency',
            currency: 'ZMW',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
        }).format(amount);
    };

    const formatNumber = (num: number) => {
        return new Intl.NumberFormat('en-US').format(num);
    };

    const handleRefresh = () => {
        setIsRefreshing(true);
        setTimeout(() => setIsRefreshing(false), 1000);
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Bulk Store Dashboard" />

            <div className="space-y-4 p-4">
                {/* Header */}
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                        <h1 className="text-xl font-bold text-slate-800 dark:text-slate-100">
                            Dashboard
                        </h1>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                            Bulk Store Overview • {dateRange}
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        <select
                            value={dateRange}
                            onChange={(e) => setDateRange(e.target.value)}
                            className="h-8 rounded-lg border border-slate-200 px-3 text-xs focus:border-blue-400 focus:ring-1 focus:ring-blue-400 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                        >
                            <option value="Today">Today</option>
                            <option value="This Week">This Week</option>
                            <option value="This Month">This Month</option>
                            <option value="This Quarter">This Quarter</option>
                            <option value="This Year">This Year</option>
                        </select>
                        <button
                            onClick={handleRefresh}
                            disabled={isRefreshing}
                            className="flex h-8 items-center gap-1.5 rounded-lg border border-slate-200 px-3 text-xs transition-colors hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-700"
                        >
                            <RefreshCw
                                className={`h-3.5 w-3.5 ${isRefreshing ? 'animate-spin' : ''}`}
                            />
                            Refresh
                        </button>
                    </div>
                </div>

                {/* ============================================ */}
                {/* SECTION 1: Colored Stat Cards - No Borders */}
                {/* ============================================ */}
                <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
                    <StatCard
                        title="Total Products"
                        value={formatNumber(stats.totalProducts)}
                        icon={<Package className="h-5 w-5" />}
                        color="blue"
                        trend={{
                            value: 12,
                            direction: 'up',
                            label: 'vs last month',
                        }}
                    />
                    <StatCard
                        title="Stock Value"
                        value={formatCurrency(stats.totalStockValue)}
                        icon={<DollarSign className="h-5 w-5" />}
                        color="green"
                        trend={{
                            value: 8.5,
                            direction: 'up',
                            label: 'vs last month',
                        }}
                    />
                    <StatCard
                        title="Low Stock"
                        value={stats.lowStockItems}
                        icon={<AlertTriangle className="h-5 w-5" />}
                        color="yellow"
                        subtitle={`${stats.outOfStockItems} out of stock`}
                    />
                    <StatCard
                        title="Near Expiry"
                        value={stats.nearExpiryItems}
                        icon={<Calendar className="h-5 w-5" />}
                        color="red"
                        subtitle={`${stats.expiredItems} expired`}
                    />
                    <StatCard
                        title="Received Today"
                        value={formatNumber(stats.stockReceivedToday)}
                        icon={<ArrowDown className="h-5 w-5" />}
                        color="purple"
                        trend={{
                            value: 12,
                            direction: 'up',
                            label: 'vs yesterday',
                        }}
                    />
                    <StatCard
                        title="Issued Today"
                        value={formatNumber(stats.stockIssuedToday)}
                        icon={<ArrowUp className="h-5 w-5" />}
                        color="teal"
                        trend={{
                            value: 8,
                            direction: 'down',
                            label: 'vs yesterday',
                        }}
                    />
                </div>

                {/* ============================================ */}
                {/* SECTION 2: Quick Monthly Summary */}
                {/* ============================================ */}
                <Card className="shadow-sm">
                    <CardHeader className="pb-2">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <BarChart3 className="h-4 w-4 text-slate-500" />
                                <CardTitle className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                                    Monthly Summary
                                </CardTitle>
                            </div>
                            <Badge variant="outline" className="text-[10px]">
                                {dateRange}
                            </Badge>
                        </div>
                        <CardDescription className="text-xs">
                            Key metrics for {dateRange.toLowerCase()}
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                            {monthlySummaryData.map((item, index) => (
                                <div
                                    key={index}
                                    className="rounded-lg bg-slate-50 p-3 text-center dark:bg-slate-800/50"
                                >
                                    <p className="text-[10px] font-medium tracking-wider text-slate-500 uppercase dark:text-slate-400">
                                        {item.metric}
                                    </p>
                                    <p className="mt-0.5 text-lg font-bold text-slate-800 dark:text-slate-100">
                                        {formatNumber(item.value)}
                                    </p>
                                    <div
                                        className={`mt-0.5 flex items-center justify-center gap-1 text-xs font-medium ${
                                            item.change > 0
                                                ? 'text-green-600'
                                                : 'text-red-600'
                                        }`}
                                    >
                                        {item.change > 0 ? (
                                            <ArrowUp className="h-3 w-3" />
                                        ) : (
                                            <ArrowDown className="h-3 w-3" />
                                        )}
                                        {Math.abs(item.change)}% vs last month
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>

                {/* ============================================ */}
                {/* SECTION 3: Top Products & Department Consumption */}
                {/* ============================================ */}
                <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                    <Card className="shadow-sm">
                        <CardHeader className="pb-2">
                            <div className="flex items-center gap-2">
                                <Zap className="h-4 w-4 text-orange-500" />
                                <CardTitle className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                                    Top Consumed Products
                                </CardTitle>
                            </div>
                            <CardDescription className="text-xs">
                                Most frequently issued items
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-2.5">
                                {topProductsData.map((product, index) => (
                                    <div
                                        key={index}
                                        className="flex items-center gap-3"
                                    >
                                        <span className="w-5 text-right text-[10px] font-medium text-slate-400">
                                            #{index + 1}
                                        </span>
                                        <div className="flex-1">
                                            <div className="flex items-center justify-between">
                                                <span className="max-w-[120px] truncate text-xs font-medium text-slate-700 dark:text-slate-300">
                                                    {product.name}
                                                </span>
                                                <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                                                    {formatNumber(
                                                        product.quantity,
                                                    )}
                                                </span>
                                            </div>
                                            <div className="mt-0.5 h-1.5 w-full rounded-full bg-slate-100 dark:bg-slate-700">
                                                <div
                                                    className="h-1.5 rounded-full transition-all"
                                                    style={{
                                                        width: `${product.percentage}%`,
                                                        backgroundColor: `hsl(${217 + index * 30}, 91%, 60%)`,
                                                    }}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="shadow-sm">
                        <CardHeader className="pb-2">
                            <div className="flex items-center gap-2">
                                <Users className="h-4 w-4 text-purple-500" />
                                <CardTitle className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                                    Department Consumption
                                </CardTitle>
                            </div>
                            <CardDescription className="text-xs">
                                Stock usage by department
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="h-[180px] w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart
                                        data={departmentData}
                                        layout="vertical"
                                    >
                                        <XAxis
                                            type="number"
                                            tick={{
                                                fontSize: 10,
                                                fill: '#94a3b8',
                                            }}
                                        />
                                        <YAxis
                                            dataKey="department"
                                            type="category"
                                            width={70}
                                            tick={{
                                                fontSize: 10,
                                                fill: '#94a3b8',
                                            }}
                                        />
                                        <Tooltip
                                            contentStyle={{
                                                backgroundColor: 'white',
                                                border: '1px solid #e2e8f0',
                                                borderRadius: '8px',
                                                fontSize: '12px',
                                            }}
                                        />
                                        <Bar
                                            dataKey="consumption"
                                            fill="#8b5cf6"
                                            radius={[0, 4, 4, 0]}
                                            name="Consumption"
                                        />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* ============================================ */}
                {/* SECTION 4: Pending Actions & Recent Transactions */}
                {/* ============================================ */}
                <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                    <Card className="shadow-sm">
                        <CardHeader className="pb-2">
                            <div className="flex items-center gap-2">
                                <Clock className="h-4 w-4 text-amber-500" />
                                <CardTitle className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                                    Pending Actions
                                </CardTitle>
                            </div>
                            <CardDescription className="text-xs">
                                Tasks requiring attention
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-1.5">
                                {pendingActions.map((action, index) => {
                                    const Icon = action.icon;
                                    const priorityColors = {
                                        high: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
                                        medium: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
                                        low: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
                                    };
                                    return (
                                        <div
                                            key={index}
                                            className="flex items-center justify-between rounded-lg bg-slate-50 p-2.5 transition-colors hover:bg-slate-100 dark:bg-slate-800/50 dark:hover:bg-slate-700/50"
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className="rounded-lg bg-white p-1.5 shadow-sm dark:bg-slate-700">
                                                    <Icon className="h-3.5 w-3.5 text-slate-500" />
                                                </div>
                                                <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
                                                    {action.action}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <span
                                                    className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${priorityColors[action.priority as keyof typeof priorityColors]}`}
                                                >
                                                    {action.count}
                                                </span>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="shadow-sm">
                        <CardHeader className="pb-2">
                            <div className="flex items-center gap-2">
                                <Activity className="h-4 w-4 text-slate-500" />
                                <CardTitle className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                                    Recent Transactions
                                </CardTitle>
                            </div>
                            <CardDescription className="text-xs">
                                Latest inventory movements
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-1.5">
                                {recentTransactions.map(
                                    (transaction, index) => (
                                        <div
                                            key={index}
                                            className="flex items-center justify-between rounded-lg p-2 transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/50"
                                        >
                                            <div className="flex min-w-0 items-center gap-3">
                                                <span className="w-12 flex-shrink-0 text-[10px] text-slate-400">
                                                    {transaction.date}
                                                </span>
                                                <span className="truncate text-xs font-medium text-slate-700 dark:text-slate-300">
                                                    {transaction.product}
                                                </span>
                                            </div>
                                            <div className="flex flex-shrink-0 items-center gap-2">
                                                <span
                                                    className={`text-[10px] font-medium ${
                                                        transaction.type ===
                                                        'Received'
                                                            ? 'text-green-600'
                                                            : transaction.type ===
                                                                'Issued'
                                                              ? 'text-blue-600'
                                                              : 'text-orange-600'
                                                    }`}
                                                >
                                                    {transaction.type}
                                                </span>
                                                <span
                                                    className={`text-xs font-bold ${
                                                        transaction.quantity > 0
                                                            ? 'text-green-600'
                                                            : 'text-red-600'
                                                    }`}
                                                >
                                                    {transaction.quantity > 0
                                                        ? '+'
                                                        : ''}
                                                    {transaction.quantity}
                                                </span>
                                                <Badge
                                                    variant="outline"
                                                    className={`text-[10px] ${
                                                        transaction.status ===
                                                        'completed'
                                                            ? 'border-green-200 text-green-600'
                                                            : 'border-yellow-200 text-yellow-600'
                                                    }`}
                                                >
                                                    {transaction.status}
                                                </Badge>
                                            </div>
                                        </div>
                                    ),
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* ============================================ */}
                {/* SECTION 5: Quick Actions */}
                {/* ============================================ */}
                <div className="grid grid-cols-4 gap-2 md:grid-cols-8">
                    {[
                        {
                            icon: ShoppingCart,
                            label: 'New Order',
                            color: 'blue',
                        },
                        { icon: ArrowDown, label: 'Receive', color: 'green' },
                        {
                            icon: AlertTriangle,
                            label: 'Adjust',
                            color: 'orange',
                        },
                        { icon: FileText, label: 'Reports', color: 'purple' },
                        { icon: Calendar, label: 'Expiry', color: 'red' },
                        { icon: Users, label: 'Issues', color: 'teal' },
                        { icon: Truck, label: 'Supplier', color: 'amber' },
                        { icon: Download, label: 'Export', color: 'pink' },
                    ].map((item, i) => (
                        <button
                            key={i}
                            className={`p-2.5 bg-${item.color}-50 hover:bg-${item.color}-100 dark:bg-${item.color}-950/20 dark:hover:bg-${item.color}-900/30 rounded-xl text-center shadow-sm transition-all hover:shadow`}
                        >
                            <item.icon
                                className={`h-4 w-4 text-${item.color}-600 dark:text-${item.color}-400 mx-auto mb-1`}
                            />
                            <span
                                className={`text-[10px] font-medium text-${item.color}-700 dark:text-${item.color}-400`}
                            >
                                {item.label}
                            </span>
                        </button>
                    ))}
                </div>
            </div>
        </AppLayout>
    );
}
