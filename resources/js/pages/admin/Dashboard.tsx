// resources/js/pages/admin/dashboard/AdminDashboard.tsx

import React, { useState, useEffect, useCallback } from 'react';
import { Head, usePage } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import Container from '@/components/container';
import PageHeader from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import {
    AreaChart,
    Area,
    BarChart,
    Bar,
    PieChart as RePieChart,
    Pie,
    Cell,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
} from 'recharts';
import { toast } from 'react-hot-toast';
import Http from '@/utils/Http';

import {
    RefreshCw,
    Download,
    DollarSign,
    Wallet,
    TrendingUp,
    TrendingDown,
    PiggyBank,
    Package,
    AlertTriangle,
    XCircle,
    Clock,
    ShoppingCart,
    FileText,
    User,
    Boxes,
    Undo,
    Shield,
    Activity,
    CheckCircle,
    Check,
    Users,
    UserPlus,
    UserCheck,
    UserMinus,
    ChevronRight,
    Send,
} from 'lucide-react';

// ============================================
// TYPES
// ============================================

interface BudgetLine {
    id: number;
    code: string;
    name: string;
    department: string;
    allocated: number;
    utilized: number;
    remaining: number;
    percentage_used: number;
    status: 'on_track' | 'warning' | 'critical' | 'exceeded';
}

interface UserStats {
    total: number;
    active: number;
    inactive: number;
    new_this_month: number;
    by_role: {
        role: string;
        count: number;
    }[];
    recent_users: {
        id: number;
        name: string;
        email: string;
        role: string;
        avatar: string;
        joined_at: string;
        status: 'active' | 'inactive';
    }[];
}

interface DashboardStats {
    // Financial
    total_budget: number;
    total_allocated: number;
    total_utilized: number;
    total_remaining: number;
    budget_utilization_percentage: number;
    monthly_spending: { month: string; amount: number }[];
    budget_by_department: {
        department: string;
        allocated: number;
        utilized: number;
        remaining: number;
    }[];
    budget_lines: BudgetLine[];
    top_budget_lines: BudgetLine[];

    // Revenue
    total_revenue: number;
    monthly_revenue: { month: string; amount: number }[];
    revenue_by_source: { source: string; amount: number }[];

    // Inventory
    total_items: number;
    low_stock_items: number;
    out_of_stock_items: number;
    total_value: number;
    inventory_by_category: { category: string; count: number }[];

    // Approvals
    pending_approvals: number;
    pending_purchase_orders: number;
    pending_requisitions: number;
    pending_adjustments: number;
    pending_refunds: number;
    pending_user_requests: number;

    // Users
    user_stats: UserStats;

    // Recent Activity
    recent_activities: {
        id: number;
        type: string;
        description: string;
        status: string;
        date: string;
        user: string;
        user_avatar?: string;
    }[];
}

// ============================================
// COMPACT STAT CARD COMPONENT
// ============================================

interface CompactStatCardProps {
    title: string;
    value: string | number;
    subtitle?: string;
    icon: React.ReactNode;
    color: string;
    trend?: {
        value: number;
        isUp: boolean;
    };
    progress?: number;
    progressColor?: string;
    onClick?: () => void;
    size?: 'sm' | 'xs';
}

const CompactStatCard: React.FC<CompactStatCardProps> = ({
    title,
    value,
    subtitle,
    icon,
    color,
    trend,
    progress,
    progressColor,
    onClick,
    size = 'sm',
}) => {
    const padding = size === 'xs' ? 'p-2' : 'p-3';
    const valueSize = size === 'xs' ? 'text-base' : 'text-lg';
    const iconSize = size === 'xs' ? 'h-3.5 w-3.5' : 'h-4 w-4';
    const iconPadding = size === 'xs' ? 'p-1.5' : 'p-2';

    return (
        <Card
            className={`cursor-pointer border border-slate-200 transition-all hover:shadow-md dark:border-slate-700 ${padding}`}
            onClick={onClick}
        >
            <CardContent className="p-0">
                <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                            <p className="truncate text-[10px] font-medium tracking-wide text-slate-500 uppercase dark:text-slate-400">
                                {title}
                            </p>
                            {trend && (
                                <div
                                    className={`flex items-center gap-0.5 text-[9px] font-medium ${trend.isUp ? 'text-emerald-600' : 'text-red-600'}`}
                                >
                                    {trend.isUp ? (
                                        <TrendingUp className="h-2.5 w-2.5" />
                                    ) : (
                                        <TrendingDown className="h-2.5 w-2.5" />
                                    )}
                                    <span>{Math.abs(trend.value)}%</span>
                                </div>
                            )}
                        </div>
                        <p
                            className={`font-bold text-slate-800 dark:text-slate-200 ${valueSize}`}
                        >
                            {value}
                        </p>
                        {subtitle && (
                            <p className="truncate text-[9px] text-slate-400 dark:text-slate-500">
                                {subtitle}
                            </p>
                        )}
                        {progress !== undefined && (
                            <div className="mt-1">
                                <Progress
                                    value={progress}
                                    className="h-1"
                                    indicatorClassName={
                                        progressColor || 'bg-blue-500'
                                    }
                                />
                            </div>
                        )}
                    </div>
                    <div
                        className={`flex-shrink-0 rounded-full ${color} ${iconPadding}`}
                    >
                        <div className={iconSize}>{icon}</div>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
};

// ============================================
// MAIN COMPONENT
// ============================================

export default function AdminDashboard() {
    const { props } = usePage();
    const [loading, setLoading] = useState(false);
    const [selectedTimeRange, setSelectedTimeRange] = useState('month');

    // ============================================
    // DUMMY DATA - Matches expected Inertia props structure
    // ============================================

    const dummyStats: DashboardStats = {
        // Financial
        total_budget: 12500000,
        total_allocated: 11250000,
        total_utilized: 8750000,
        total_remaining: 2500000,
        budget_utilization_percentage: 77.8,
        monthly_spending: [
            { month: 'Jan', amount: 650000 },
            { month: 'Feb', amount: 720000 },
            { month: 'Mar', amount: 890000 },
            { month: 'Apr', amount: 780000 },
            { month: 'May', amount: 920000 },
            { month: 'Jun', amount: 1050000 },
            { month: 'Jul', amount: 980000 },
            { month: 'Aug', amount: 1120000 },
            { month: 'Sep', amount: 860000 },
            { month: 'Oct', amount: 940000 },
            { month: 'Nov', amount: 1100000 },
            { month: 'Dec', amount: 1250000 },
        ],
        budget_by_department: [
            {
                department: 'Medical',
                allocated: 4500000,
                utilized: 3800000,
                remaining: 700000,
            },
            {
                department: 'Operations',
                allocated: 3200000,
                utilized: 2800000,
                remaining: 400000,
            },
            {
                department: 'Finance',
                allocated: 1500000,
                utilized: 1100000,
                remaining: 400000,
            },
            {
                department: 'Human Resources',
                allocated: 1200000,
                utilized: 950000,
                remaining: 250000,
            },
            {
                department: 'IT',
                allocated: 1000000,
                utilized: 750000,
                remaining: 250000,
            },
            {
                department: 'Procurement',
                allocated: 800000,
                utilized: 620000,
                remaining: 180000,
            },
            {
                department: 'Logistics',
                allocated: 300000,
                utilized: 240000,
                remaining: 60000,
            },
        ],
        budget_lines: [
            {
                id: 1,
                code: 'BUD-MED-001',
                name: 'Medical Supplies',
                department: 'Medical',
                allocated: 2500000,
                utilized: 2100000,
                remaining: 400000,
                percentage_used: 84,
                status: 'warning',
            },
            {
                id: 2,
                code: 'BUD-MED-002',
                name: 'Surgical Equipment',
                department: 'Medical',
                allocated: 2000000,
                utilized: 1700000,
                remaining: 300000,
                percentage_used: 85,
                status: 'warning',
            },
            {
                id: 3,
                code: 'BUD-OPS-001',
                name: 'Operational Expenses',
                department: 'Operations',
                allocated: 1800000,
                utilized: 1600000,
                remaining: 200000,
                percentage_used: 88.9,
                status: 'critical',
            },
            {
                id: 4,
                code: 'BUD-OPS-002',
                name: 'Facility Maintenance',
                department: 'Operations',
                allocated: 1400000,
                utilized: 1200000,
                remaining: 200000,
                percentage_used: 85.7,
                status: 'warning',
            },
            {
                id: 5,
                code: 'BUD-FIN-001',
                name: 'Financial Services',
                department: 'Finance',
                allocated: 1500000,
                utilized: 1100000,
                remaining: 400000,
                percentage_used: 73.3,
                status: 'on_track',
            },
            {
                id: 6,
                code: 'BUD-HR-001',
                name: 'Staff Development',
                department: 'Human Resources',
                allocated: 800000,
                utilized: 600000,
                remaining: 200000,
                percentage_used: 75,
                status: 'on_track',
            },
            {
                id: 7,
                code: 'BUD-HR-002',
                name: 'Recruitment',
                department: 'Human Resources',
                allocated: 400000,
                utilized: 350000,
                remaining: 50000,
                percentage_used: 87.5,
                status: 'critical',
            },
            {
                id: 8,
                code: 'BUD-IT-001',
                name: 'IT Infrastructure',
                department: 'IT',
                allocated: 600000,
                utilized: 450000,
                remaining: 150000,
                percentage_used: 75,
                status: 'on_track',
            },
            {
                id: 9,
                code: 'BUD-IT-002',
                name: 'Software Licenses',
                department: 'IT',
                allocated: 400000,
                utilized: 300000,
                remaining: 100000,
                percentage_used: 75,
                status: 'on_track',
            },
            {
                id: 10,
                code: 'BUD-PROC-001',
                name: 'Procurement Services',
                department: 'Procurement',
                allocated: 800000,
                utilized: 620000,
                remaining: 180000,
                percentage_used: 77.5,
                status: 'on_track',
            },
        ],
        top_budget_lines: [
            {
                id: 1,
                code: 'BUD-MED-001',
                name: 'Medical Supplies',
                department: 'Medical',
                allocated: 2500000,
                utilized: 2100000,
                remaining: 400000,
                percentage_used: 84,
                status: 'warning',
            },
            {
                id: 2,
                code: 'BUD-MED-002',
                name: 'Surgical Equipment',
                department: 'Medical',
                allocated: 2000000,
                utilized: 1700000,
                remaining: 300000,
                percentage_used: 85,
                status: 'warning',
            },
            {
                id: 3,
                code: 'BUD-OPS-001',
                name: 'Operational Expenses',
                department: 'Operations',
                allocated: 1800000,
                utilized: 1600000,
                remaining: 200000,
                percentage_used: 88.9,
                status: 'critical',
            },
            {
                id: 4,
                code: 'BUD-OPS-002',
                name: 'Facility Maintenance',
                department: 'Operations',
                allocated: 1400000,
                utilized: 1200000,
                remaining: 200000,
                percentage_used: 85.7,
                status: 'warning',
            },
            {
                id: 5,
                code: 'BUD-FIN-001',
                name: 'Financial Services',
                department: 'Finance',
                allocated: 1500000,
                utilized: 1100000,
                remaining: 400000,
                percentage_used: 73.3,
                status: 'on_track',
            },
        ],

        // Revenue
        total_revenue: 3500000,
        monthly_revenue: [
            { month: 'Jan', amount: 250000 },
            { month: 'Feb', amount: 280000 },
            { month: 'Mar', amount: 310000 },
            { month: 'Apr', amount: 290000 },
            { month: 'May', amount: 340000 },
            { month: 'Jun', amount: 380000 },
            { month: 'Jul', amount: 360000 },
            { month: 'Aug', amount: 420000 },
            { month: 'Sep', amount: 390000 },
            { month: 'Oct', amount: 410000 },
            { month: 'Nov', amount: 430000 },
            { month: 'Dec', amount: 440000 },
        ],
        revenue_by_source: [
            { source: 'Sales', amount: 1500000 },
            { source: 'Services', amount: 800000 },
            { source: 'Grants', amount: 600000 },
            { source: 'Donations', amount: 400000 },
            { source: 'Other', amount: 200000 },
        ],

        // Inventory
        total_items: 2543,
        low_stock_items: 67,
        out_of_stock_items: 23,
        total_value: 4200000,
        inventory_by_category: [
            { category: 'Medical Supplies', count: 850 },
            { category: 'Surgical Equipment', count: 320 },
            { category: 'Pharmaceuticals', count: 450 },
            { category: 'IT Equipment', count: 280 },
            { category: 'Office Supplies', count: 350 },
            { category: 'Facility Items', count: 293 },
        ],

        // Approvals
        pending_approvals: 28,
        pending_purchase_orders: 12,
        pending_requisitions: 8,
        pending_adjustments: 3,
        pending_refunds: 2,
        pending_user_requests: 3,

        // Users
        user_stats: {
            total: 156,
            active: 142,
            inactive: 14,
            new_this_month: 8,
            by_role: [
                { role: 'Admin', count: 5 },
                { role: 'Supervisor', count: 12 },
                { role: 'Manager', count: 28 },
                { role: 'Staff', count: 89 },
                { role: 'Finance', count: 22 },
            ],
            recent_users: [
                {
                    id: 1,
                    name: 'John Mwansa',
                    email: 'john.mwansa@zms.co.zm',
                    role: 'Manager',
                    avatar: '',
                    joined_at: '2024-11-15T10:30:00Z',
                    status: 'active',
                },
                {
                    id: 2,
                    name: 'Sarah Phiri',
                    email: 'sarah.phiri@zms.co.zm',
                    role: 'Staff',
                    avatar: '',
                    joined_at: '2024-11-20T14:20:00Z',
                    status: 'active',
                },
                {
                    id: 3,
                    name: 'David Banda',
                    email: 'david.banda@zms.co.zm',
                    role: 'Supervisor',
                    avatar: '',
                    joined_at: '2024-11-25T09:15:00Z',
                    status: 'active',
                },
                {
                    id: 4,
                    name: 'Grace Mwape',
                    email: 'grace.mwape@zms.co.zm',
                    role: 'Finance',
                    avatar: '',
                    joined_at: '2024-11-28T16:45:00Z',
                    status: 'active',
                },
                {
                    id: 5,
                    name: 'Peter Zulu',
                    email: 'peter.zulu@zms.co.zm',
                    role: 'Staff',
                    avatar: '',
                    joined_at: '2024-12-01T11:00:00Z',
                    status: 'inactive',
                },
            ],
        },

        // Recent Activity
        recent_activities: [
            {
                id: 1,
                type: 'Purchase Order',
                description: 'PO #PO-2024-0045 approved for Medical Supplies',
                status: 'approved',
                date: '2024-12-03T14:30:00Z',
                user: 'John Mwansa',
            },
            {
                id: 2,
                type: 'Requisition',
                description:
                    'Requisition #REQ-2024-0023 rejected - Budget exceeded',
                status: 'rejected',
                date: '2024-12-03T13:20:00Z',
                user: 'Sarah Phiri',
            },
            {
                id: 3,
                type: 'Stock Adjustment',
                description: 'Stock adjustment completed for Surgical Gloves',
                status: 'completed',
                date: '2024-12-03T11:45:00Z',
                user: 'David Banda',
            },
            {
                id: 4,
                type: 'User Request',
                description: 'New user account requested for IT Department',
                status: 'pending',
                date: '2024-12-03T10:15:00Z',
                user: 'Grace Mwape',
            },
            {
                id: 5,
                type: 'Refund',
                description:
                    'Refund #REF-2024-0012 processed for damaged items',
                status: 'approved',
                date: '2024-12-02T16:00:00Z',
                user: 'Peter Zulu',
            },
            {
                id: 6,
                type: 'Purchase Order',
                description: 'PO #PO-2024-0046 sent to supplier',
                status: 'sent',
                date: '2024-12-02T14:30:00Z',
                user: 'John Mwansa',
            },
            {
                id: 7,
                type: 'Requisition',
                description: 'Requisition #REQ-2024-0024 awaiting approval',
                status: 'pending',
                date: '2024-12-02T11:20:00Z',
                user: 'Sarah Phiri',
            },
        ],
    };

    const [stats, setStats] = useState<DashboardStats>(dummyStats);

    const COLORS = [
        '#3b82f6',
        '#8b5cf6',
        '#ec4899',
        '#f59e0b',
        '#10b981',
        '#ef4444',
        '#6366f1',
    ];

    // ============================================
    // FETCH DASHBOARD DATA (using dummy data)
    // ============================================

    const fetchDashboardData = useCallback(async () => {
        setLoading(true);
        try {
            // Simulate API call
            await new Promise((resolve) => setTimeout(resolve, 800));

            // In production, uncomment this:
            // const response = await Http.get('/admin/dashboard', {
            //     params: { time_range: selectedTimeRange },
            // });
            // setStats(response.data);

            setStats(dummyStats);
        } catch (error) {
            console.error('Failed to fetch dashboard data:', error);
            toast.error('Failed to load dashboard data');
        } finally {
            setLoading(false);
        }
    }, [selectedTimeRange]);

    useEffect(() => {
        fetchDashboardData();
    }, [fetchDashboardData]);

    const handleRefresh = () => {
        fetchDashboardData();
        toast.success('Dashboard refreshed');
    };

    // ============================================
    // FORMAT HELPERS
    // ============================================

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-ZM', {
            style: 'currency',
            currency: 'ZMW',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
        }).format(amount);
    };

    const formatDate = (date: string) => {
        return new Date(date).toLocaleDateString('en-ZM', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    const getStatusColor = (status: string) => {
        const colors = {
            on_track:
                'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
            warning:
                'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
            critical:
                'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
            exceeded:
                'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
        };
        return colors[status as keyof typeof colors] || colors.on_track;
    };

    const getInitials = (name: string) => {
        return name
            .split(' ')
            .map((n) => n[0])
            .join('')
            .toUpperCase()
            .slice(0, 2);
    };

    // ============================================
    // RENDER
    // ============================================

    return (
        <AppLayout
            breadcrumbs={[
                { title: 'Home', href: '/' },
                { title: 'Dashboard', href: '/admin/dashboard' },
            ]}
        >
            <div className="bg-blue-50">
                <Container>
                    {/* Header */}
                    {/* <PageHeader
                        title="Admin Dashboard"
                        subtitle="Complete overview of financial management, inventory, approvals, and user metrics"
                        actions={[
                            {
                                label: 'Refresh',
                                icon: <RefreshCw className="h-4 w-4" />,
                                onClick: handleRefresh,
                                variant: 'outline',
                                loading: loading,
                            },
                            {
                                label: 'Export Report',
                                icon: <Download className="h-4 w-4" />,
                                onClick: () => {
                                    toast.success('Exporting report...');
                                },
                                variant: 'default',
                            },
                        ]}
                    /> */}

                    {/* ========================================== */}
                    {/* FINANCIAL MANAGEMENT SECTION */}
                    {/* ========================================== */}
                    <div className="mt-8">
                        <div className="mb-3 flex items-center gap-2">
                            <DollarSign className="h-4 w-4 text-blue-600" />
                            <h2 className="text-base font-semibold text-slate-800 dark:text-slate-200">
                                Financial Management
                            </h2>
                            <Badge
                                variant="outline"
                                className="px-1.5 py-0 text-[10px]"
                            >
                                Budget & Revenue
                            </Badge>
                        </div>

                        {/* Financial Management - Compact Cards */}
                        <div className="grid grid-cols-2 gap-2 sm:grid-cols-2 lg:grid-cols-4">
                            <CompactStatCard
                                title="Total Budget"
                                value={formatCurrency(stats.total_budget)}
                                subtitle="Annual allocation"
                                icon={<Wallet className="h-3.5 w-3.5" />}
                                color="bg-blue-500 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400"
                                size="xs"
                            />
                            <CompactStatCard
                                title="Utilized"
                                value={formatCurrency(stats.total_utilized)}
                                subtitle={`${stats.budget_utilization_percentage.toFixed(1)}%`}
                                icon={<TrendingUp className="h-3.5 w-3.5" />}
                                color="bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400"
                                progress={stats.budget_utilization_percentage}
                                progressColor={
                                    stats.budget_utilization_percentage > 80
                                        ? 'bg-red-500'
                                        : stats.budget_utilization_percentage >
                                            60
                                          ? 'bg-yellow-500'
                                          : 'bg-emerald-500'
                                }
                                size="xs"
                            />
                            <CompactStatCard
                                title="Remaining"
                                value={formatCurrency(stats.total_remaining)}
                                subtitle="Available"
                                icon={<PiggyBank className="h-3.5 w-3.5" />}
                                color="bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400"
                                size="xs"
                            />
                            <CompactStatCard
                                title="Revenue"
                                value={formatCurrency(stats.total_revenue)}
                                subtitle="YTD"
                                icon={<TrendingUp className="h-3.5 w-3.5" />}
                                color="bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400"
                                trend={{ value: 12.5, isUp: true }}
                                size="xs"
                            />
                        </div>

                        {/* Charts Row - 3 columns */}
                        <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
                            {/* Budget Usage Donut Chart */}
                            <Card>
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-sm">
                                        Budget Usage
                                    </CardTitle>
                                    <CardDescription className="text-xs">
                                        Overall budget utilization
                                    </CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <div className="h-52">
                                        <ResponsiveContainer
                                            width="100%"
                                            height="100%"
                                        >
                                            <RePieChart>
                                                <Pie
                                                    data={[
                                                        {
                                                            name: 'Utilized',
                                                            value: stats.total_utilized,
                                                        },
                                                        {
                                                            name: 'Remaining',
                                                            value: stats.total_remaining,
                                                        },
                                                    ]}
                                                    dataKey="value"
                                                    nameKey="name"
                                                    cx="50%"
                                                    cy="50%"
                                                    innerRadius={45}
                                                    outerRadius={70}
                                                    label={(entry) =>
                                                        `${entry.name}: ${((entry.value / stats.total_budget) * 100).toFixed(1)}%`
                                                    }
                                                    fontSize={10}
                                                >
                                                    <Cell fill="#3b82f6" />
                                                    <Cell fill="#94a3b8" />
                                                </Pie>
                                                <Tooltip
                                                    formatter={(value) =>
                                                        formatCurrency(
                                                            value as number,
                                                        )
                                                    }
                                                />
                                            </RePieChart>
                                        </ResponsiveContainer>
                                    </div>
                                    <div className="mt-1 flex justify-center gap-4">
                                        <div className="flex items-center gap-1.5">
                                            <div className="h-2.5 w-2.5 rounded-full bg-blue-500" />
                                            <span className="text-xs">
                                                Utilized (
                                                {stats.budget_utilization_percentage.toFixed(
                                                    1,
                                                )}
                                                %)
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-1.5">
                                            <div className="h-2.5 w-2.5 rounded-full bg-slate-300 dark:bg-slate-600" />
                                            <span className="text-xs">
                                                Remaining (
                                                {(
                                                    (stats.total_remaining /
                                                        stats.total_budget) *
                                                    100
                                                ).toFixed(1)}
                                                %)
                                            </span>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Monthly Spending */}
                            <Card>
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-sm">
                                        Monthly Spending
                                    </CardTitle>
                                    <CardDescription className="text-xs">
                                        Budget utilization over time
                                    </CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <div className="h-52">
                                        <ResponsiveContainer
                                            width="100%"
                                            height="100%"
                                        >
                                            <AreaChart
                                                data={stats.monthly_spending}
                                            >
                                                <CartesianGrid
                                                    strokeDasharray="3 3"
                                                    stroke="#e2e8f0"
                                                />
                                                <XAxis
                                                    dataKey="month"
                                                    tick={{ fontSize: 10 }}
                                                />
                                                <YAxis
                                                    tickFormatter={(value) =>
                                                        formatCurrency(value)
                                                    }
                                                    tick={{ fontSize: 10 }}
                                                />
                                                <Tooltip
                                                    formatter={(value) =>
                                                        formatCurrency(
                                                            value as number,
                                                        )
                                                    }
                                                />
                                                <Area
                                                    type="monotone"
                                                    dataKey="amount"
                                                    stroke="#3b82f6"
                                                    fill="#3b82f6"
                                                    fillOpacity={0.2}
                                                />
                                            </AreaChart>
                                        </ResponsiveContainer>
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Revenue by Source */}
                            <Card>
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-sm">
                                        Revenue by Source
                                    </CardTitle>
                                    <CardDescription className="text-xs">
                                        Breakdown of revenue streams
                                    </CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <div className="h-52">
                                        <ResponsiveContainer
                                            width="100%"
                                            height="100%"
                                        >
                                            <RePieChart>
                                                <Pie
                                                    data={
                                                        stats.revenue_by_source
                                                    }
                                                    dataKey="amount"
                                                    nameKey="source"
                                                    cx="50%"
                                                    cy="50%"
                                                    outerRadius={65}
                                                    label={(entry) =>
                                                        entry.source
                                                    }
                                                    fontSize={10}
                                                >
                                                    {stats.revenue_by_source.map(
                                                        (_, index) => (
                                                            <Cell
                                                                key={`cell-${index}`}
                                                                fill={
                                                                    COLORS[
                                                                        index %
                                                                            COLORS.length
                                                                    ]
                                                                }
                                                            />
                                                        ),
                                                    )}
                                                </Pie>
                                                <Tooltip
                                                    formatter={(value) =>
                                                        formatCurrency(
                                                            value as number,
                                                        )
                                                    }
                                                />
                                                <Legend
                                                    wrapperStyle={{
                                                        fontSize: '10px',
                                                    }}
                                                />
                                            </RePieChart>
                                        </ResponsiveContainer>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>

                        {/* Budget by Department */}
                        <div className="mt-4">
                            <Card>
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-sm">
                                        Budget by Department
                                    </CardTitle>
                                    <CardDescription className="text-xs">
                                        Allocation and utilization across
                                        departments
                                    </CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <div className="h-56">
                                        <ResponsiveContainer
                                            width="100%"
                                            height="100%"
                                        >
                                            <BarChart
                                                data={
                                                    stats.budget_by_department
                                                }
                                            >
                                                <CartesianGrid
                                                    strokeDasharray="3 3"
                                                    stroke="#e2e8f0"
                                                />
                                                <XAxis
                                                    dataKey="department"
                                                    tick={{ fontSize: 10 }}
                                                />
                                                <YAxis
                                                    tickFormatter={(value) =>
                                                        formatCurrency(value)
                                                    }
                                                    tick={{ fontSize: 10 }}
                                                />
                                                <Tooltip
                                                    formatter={(value) =>
                                                        formatCurrency(
                                                            value as number,
                                                        )
                                                    }
                                                />
                                                <Legend
                                                    wrapperStyle={{
                                                        fontSize: '10px',
                                                    }}
                                                />
                                                <Bar
                                                    dataKey="allocated"
                                                    fill="#3b82f6"
                                                    name="Allocated"
                                                />
                                                <Bar
                                                    dataKey="utilized"
                                                    fill="#f59e0b"
                                                    name="Utilized"
                                                />
                                            </BarChart>
                                        </ResponsiveContainer>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>

                        {/* Top 5 Budget Lines */}
                        <div className="mt-4">
                            <Card>
                                <CardHeader className="pb-2">
                                    <CardTitle className="flex items-center justify-between text-sm">
                                        <span>Top Budget Lines</span>
                                        <Badge
                                            variant="outline"
                                            className="text-[10px]"
                                        >
                                            Highest Remaining
                                        </Badge>
                                    </CardTitle>
                                    <CardDescription className="text-xs">
                                        Top 5 budget lines with remaining
                                        balances
                                    </CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <div className="overflow-x-auto">
                                        <Table>
                                            <TableHeader>
                                                <TableRow className="text-xs">
                                                    <TableHead className="text-xs">
                                                        Code
                                                    </TableHead>
                                                    <TableHead className="text-xs">
                                                        Name
                                                    </TableHead>
                                                    <TableHead className="text-xs">
                                                        Dept
                                                    </TableHead>
                                                    <TableHead className="text-right text-xs">
                                                        Allocated
                                                    </TableHead>
                                                    <TableHead className="text-right text-xs">
                                                        Utilized
                                                    </TableHead>
                                                    <TableHead className="text-right text-xs">
                                                        Remaining
                                                    </TableHead>
                                                    <TableHead className="text-right text-xs">
                                                        Usage
                                                    </TableHead>
                                                    <TableHead className="text-center text-xs">
                                                        Status
                                                    </TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {stats.top_budget_lines.map(
                                                    (line) => (
                                                        <TableRow
                                                            key={line.id}
                                                            className="text-xs"
                                                        >
                                                            <TableCell className="font-mono text-[10px]">
                                                                {line.code}
                                                            </TableCell>
                                                            <TableCell className="text-xs font-medium">
                                                                {line.name}
                                                            </TableCell>
                                                            <TableCell className="text-xs">
                                                                {
                                                                    line.department
                                                                }
                                                            </TableCell>
                                                            <TableCell className="text-right text-xs">
                                                                {formatCurrency(
                                                                    line.allocated,
                                                                )}
                                                            </TableCell>
                                                            <TableCell className="text-right text-xs">
                                                                {formatCurrency(
                                                                    line.utilized,
                                                                )}
                                                            </TableCell>
                                                            <TableCell className="text-right text-xs font-semibold text-green-600">
                                                                {formatCurrency(
                                                                    line.remaining,
                                                                )}
                                                            </TableCell>
                                                            <TableCell className="text-right">
                                                                <div className="flex items-center justify-end gap-1">
                                                                    <span className="text-[10px]">
                                                                        {line.percentage_used.toFixed(
                                                                            1,
                                                                        )}
                                                                        %
                                                                    </span>
                                                                    <Progress
                                                                        value={
                                                                            line.percentage_used
                                                                        }
                                                                        className="h-1.5 w-12"
                                                                    />
                                                                </div>
                                                            </TableCell>
                                                            <TableCell className="text-center">
                                                                <Badge
                                                                    className={`${getStatusColor(line.status)} px-1.5 py-0 text-[9px]`}
                                                                >
                                                                    {line.status
                                                                        .replace(
                                                                            '_',
                                                                            ' ',
                                                                        )
                                                                        .toUpperCase()}
                                                                </Badge>
                                                            </TableCell>
                                                        </TableRow>
                                                    ),
                                                )}
                                            </TableBody>
                                        </Table>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    </div>

                    {/* ========================================== */}
                    {/* INVENTORY OVERSIGHT SECTION */}
                    {/* ========================================== */}
                    <div className="mt-8">
                        <div className="mb-3 flex items-center gap-2">
                            <Package className="h-4 w-4 text-orange-600" />
                            <h2 className="text-base font-semibold text-slate-800 dark:text-slate-200">
                                Inventory Oversight
                            </h2>
                            <Badge
                                variant="outline"
                                className="px-1.5 py-0 text-[10px]"
                            >
                                Stock Management
                            </Badge>
                        </div>

                        {/* Inventory Oversight - Compact Cards */}
                        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                            <CompactStatCard
                                title="Total Items"
                                value={stats.total_items}
                                subtitle="Active"
                                icon={<Package className="h-3.5 w-3.5" />}
                                color="bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400"
                                size="xs"
                            />
                            <CompactStatCard
                                title="Low Stock"
                                value={stats.low_stock_items}
                                subtitle="Below reorder"
                                icon={<AlertTriangle className="h-3.5 w-3.5" />}
                                color="bg-yellow-100 text-yellow-600 dark:bg-yellow-900/30 dark:text-yellow-400"
                                progress={
                                    (stats.low_stock_items /
                                        stats.total_items) *
                                    100
                                }
                                progressColor="bg-yellow-500"
                                size="xs"
                            />
                            <CompactStatCard
                                title="Out of Stock"
                                value={stats.out_of_stock_items}
                                subtitle="Zero qty"
                                icon={<XCircle className="h-3.5 w-3.5" />}
                                color="bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400"
                                size="xs"
                            />
                            <CompactStatCard
                                title="Total Value"
                                value={formatCurrency(stats.total_value)}
                                subtitle="Stock value"
                                icon={<DollarSign className="h-3.5 w-3.5" />}
                                color="bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400"
                                size="xs"
                            />
                        </div>

                        {/* Inventory Charts */}
                        <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
                            <Card>
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-sm">
                                        Inventory by Category
                                    </CardTitle>
                                    <CardDescription className="text-xs">
                                        Distribution of items across categories
                                    </CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <div className="h-56">
                                        <ResponsiveContainer
                                            width="100%"
                                            height="100%"
                                        >
                                            <BarChart
                                                data={
                                                    stats.inventory_by_category
                                                }
                                            >
                                                <CartesianGrid
                                                    strokeDasharray="3 3"
                                                    stroke="#e2e8f0"
                                                />
                                                <XAxis
                                                    dataKey="category"
                                                    tick={{ fontSize: 10 }}
                                                />
                                                <YAxis
                                                    tick={{ fontSize: 10 }}
                                                />
                                                <Tooltip />
                                                <Legend
                                                    wrapperStyle={{
                                                        fontSize: '10px',
                                                    }}
                                                />
                                                <Bar
                                                    dataKey="count"
                                                    fill="#8b5cf6"
                                                    name="Items"
                                                />
                                            </BarChart>
                                        </ResponsiveContainer>
                                    </div>
                                </CardContent>
                            </Card>

                            <Card>
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-sm">
                                        Inventory Status
                                    </CardTitle>
                                    <CardDescription className="text-xs">
                                        Current stock health overview
                                    </CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-3">
                                        <div>
                                            <div className="mb-0.5 flex justify-between text-xs">
                                                <span>In Stock</span>
                                                <span className="font-medium">
                                                    {(
                                                        ((stats.total_items -
                                                            stats.low_stock_items -
                                                            stats.out_of_stock_items) /
                                                            stats.total_items) *
                                                        100
                                                    ).toFixed(1)}
                                                    %
                                                </span>
                                            </div>
                                            <Progress
                                                value={
                                                    ((stats.total_items -
                                                        stats.low_stock_items -
                                                        stats.out_of_stock_items) /
                                                        stats.total_items) *
                                                    100
                                                }
                                                className="h-2"
                                                indicatorClassName="bg-emerald-500"
                                            />
                                        </div>
                                        <div>
                                            <div className="mb-0.5 flex justify-between text-xs">
                                                <span>Low Stock</span>
                                                <span className="font-medium">
                                                    {(
                                                        (stats.low_stock_items /
                                                            stats.total_items) *
                                                        100
                                                    ).toFixed(1)}
                                                    %
                                                </span>
                                            </div>
                                            <Progress
                                                value={
                                                    (stats.low_stock_items /
                                                        stats.total_items) *
                                                    100
                                                }
                                                className="h-2"
                                                indicatorClassName="bg-yellow-500"
                                            />
                                        </div>
                                        <div>
                                            <div className="mb-0.5 flex justify-between text-xs">
                                                <span>Out of Stock</span>
                                                <span className="font-medium">
                                                    {(
                                                        (stats.out_of_stock_items /
                                                            stats.total_items) *
                                                        100
                                                    ).toFixed(1)}
                                                    %
                                                </span>
                                            </div>
                                            <Progress
                                                value={
                                                    (stats.out_of_stock_items /
                                                        stats.total_items) *
                                                    100
                                                }
                                                className="h-2"
                                                indicatorClassName="bg-red-500"
                                            />
                                        </div>
                                        <div className="mt-3 border-t border-slate-200 pt-3 dark:border-slate-700">
                                            <div className="flex justify-between text-sm">
                                                <span className="text-slate-500">
                                                    Health Score
                                                </span>
                                                <span className="font-bold text-emerald-600">
                                                    {(
                                                        ((stats.total_items -
                                                            stats.low_stock_items -
                                                            stats.out_of_stock_items) /
                                                            stats.total_items) *
                                                        100
                                                    ).toFixed(0)}
                                                    %
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    </div>

                    {/* ========================================== */}
                    {/* APPROVALS SECTION */}
                    {/* ========================================== */}
                    <div className="mt-8">
                        <div className="mb-3 flex items-center gap-2">
                            <Shield className="h-4 w-4 text-purple-600" />
                            <h2 className="text-base font-semibold text-slate-800 dark:text-slate-200">
                                Approvals
                            </h2>
                            <Badge
                                variant="outline"
                                className="px-1.5 py-0 text-[10px]"
                            >
                                Pending Actions
                            </Badge>
                        </div>

                        {/* Approvals - Compact Cards */}
                        <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
                            <CompactStatCard
                                title="Pending"
                                value={stats.pending_approvals}
                                subtitle="Total"
                                icon={<Clock className="h-3.5 w-3.5" />}
                                color="bg-yellow-100 text-yellow-600 dark:bg-yellow-900/30 dark:text-yellow-400"
                                size="xs"
                            />
                            <CompactStatCard
                                title="PO"
                                value={stats.pending_purchase_orders}
                                subtitle="Orders"
                                icon={<ShoppingCart className="h-3.5 w-3.5" />}
                                color="bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400"
                                size="xs"
                            />
                            <CompactStatCard
                                title="Req"
                                value={stats.pending_requisitions}
                                subtitle="Requisitions"
                                icon={<FileText className="h-3.5 w-3.5" />}
                                color="bg-cyan-100 text-cyan-600 dark:bg-cyan-900/30 dark:text-cyan-400"
                                size="xs"
                            />
                            <CompactStatCard
                                title="Adj"
                                value={stats.pending_adjustments}
                                subtitle="Adjustments"
                                icon={<Boxes className="h-3.5 w-3.5" />}
                                color="bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400"
                                size="xs"
                            />
                            <CompactStatCard
                                title="Ref"
                                value={stats.pending_refunds}
                                subtitle="Refunds"
                                icon={<Undo className="h-3.5 w-3.5" />}
                                color="bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400"
                                size="xs"
                            />
                            <CompactStatCard
                                title="Users"
                                value={stats.pending_user_requests}
                                subtitle="Requests"
                                icon={<User className="h-3.5 w-3.5" />}
                                color="bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400"
                                size="xs"
                            />
                        </div>

                        {/* Quick Action Buttons */}
                        <div className="mt-4 flex flex-wrap gap-2">
                            <Button
                                variant="default"
                                size="sm"
                                className="h-8 gap-1.5 text-xs"
                            >
                                <Check className="h-3.5 w-3.5" />
                                Review POs
                                <Badge className="ml-1 bg-white/20 px-1.5 text-[9px] text-white">
                                    12
                                </Badge>
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                className="h-8 gap-1.5 text-xs"
                            >
                                <FileText className="h-3.5 w-3.5" />
                                Review Reqs
                                <Badge className="ml-1 px-1.5 text-[9px]">
                                    8
                                </Badge>
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                className="h-8 gap-1.5 text-xs"
                            >
                                <Boxes className="h-3.5 w-3.5" />
                                Review Adj
                                <Badge className="ml-1 px-1.5 text-[9px]">
                                    3
                                </Badge>
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                className="h-8 gap-1.5 text-xs"
                            >
                                <Undo className="h-3.5 w-3.5" />
                                Review Ref
                                <Badge className="ml-1 px-1.5 text-[9px]">
                                    2
                                </Badge>
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                className="h-8 gap-1.5 text-xs"
                            >
                                <User className="h-3.5 w-3.5" />
                                Review Users
                                <Badge className="ml-1 px-1.5 text-[9px]">
                                    3
                                </Badge>
                            </Button>
                        </div>
                    </div>

                    {/* ========================================== */}
                    {/* USER STATISTICS SECTION */}
                    {/* ========================================== */}
                    <div className="mt-8">
                        <div className="mb-3 flex items-center gap-2">
                            <Users className="h-4 w-4 text-indigo-600" />
                            <h2 className="text-base font-semibold text-slate-800 dark:text-slate-200">
                                User Statistics
                            </h2>
                            <Badge
                                variant="outline"
                                className="px-1.5 py-0 text-[10px]"
                            >
                                System Users
                            </Badge>
                        </div>

                        {/* User Statistics - Compact Cards */}
                        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                            <CompactStatCard
                                title="Total Users"
                                value={stats.user_stats.total}
                                subtitle={`${stats.user_stats.active} active`}
                                icon={<Users className="h-3.5 w-3.5" />}
                                color="bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400"
                                size="xs"
                            />
                            <CompactStatCard
                                title="New"
                                value={stats.user_stats.new_this_month}
                                subtitle="This month"
                                icon={<UserPlus className="h-3.5 w-3.5" />}
                                color="bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400"
                                trend={{ value: 15, isUp: true }}
                                size="xs"
                            />
                            <CompactStatCard
                                title="Active"
                                value={stats.user_stats.active}
                                subtitle={`${((stats.user_stats.active / stats.user_stats.total) * 100).toFixed(0)}%`}
                                icon={<UserCheck className="h-3.5 w-3.5" />}
                                color="bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400"
                                progress={
                                    (stats.user_stats.active /
                                        stats.user_stats.total) *
                                    100
                                }
                                progressColor="bg-green-500"
                                size="xs"
                            />
                            <CompactStatCard
                                title="Inactive"
                                value={stats.user_stats.inactive}
                                subtitle="Need attention"
                                icon={<UserMinus className="h-3.5 w-3.5" />}
                                color="bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400"
                                size="xs"
                            />
                        </div>

                        {/* User Charts */}
                        <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
                            {/* Users by Role */}
                            <Card>
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-sm">
                                        Users by Role
                                    </CardTitle>
                                    <CardDescription className="text-xs">
                                        Distribution of users across roles
                                    </CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <div className="h-52">
                                        <ResponsiveContainer
                                            width="100%"
                                            height="100%"
                                        >
                                            <RePieChart>
                                                <Pie
                                                    data={
                                                        stats.user_stats.by_role
                                                    }
                                                    dataKey="count"
                                                    nameKey="role"
                                                    cx="50%"
                                                    cy="50%"
                                                    outerRadius={65}
                                                    label={(entry) =>
                                                        `${entry.role} (${entry.count})`
                                                    }
                                                    fontSize={10}
                                                >
                                                    {stats.user_stats.by_role.map(
                                                        (_, index) => (
                                                            <Cell
                                                                key={`cell-${index}`}
                                                                fill={
                                                                    COLORS[
                                                                        index %
                                                                            COLORS.length
                                                                    ]
                                                                }
                                                            />
                                                        ),
                                                    )}
                                                </Pie>
                                                <Tooltip />
                                                <Legend
                                                    wrapperStyle={{
                                                        fontSize: '10px',
                                                    }}
                                                />
                                            </RePieChart>
                                        </ResponsiveContainer>
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Recent Users */}
                            <Card>
                                <CardHeader className="pb-2">
                                    <CardTitle className="flex items-center justify-between text-sm">
                                        <span>Recent Users</span>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="h-7 gap-0.5 text-xs"
                                        >
                                            View All{' '}
                                            <ChevronRight className="h-3.5 w-3.5" />
                                        </Button>
                                    </CardTitle>
                                    <CardDescription className="text-xs">
                                        Latest user registrations
                                    </CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-2">
                                        {stats.user_stats.recent_users.map(
                                            (user) => (
                                                <div
                                                    key={user.id}
                                                    className="flex items-center justify-between"
                                                >
                                                    <div className="flex items-center gap-2">
                                                        <Avatar className="h-7 w-7">
                                                            <AvatarFallback className="bg-blue-100 text-[10px] text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">
                                                                {getInitials(
                                                                    user.name,
                                                                )}
                                                            </AvatarFallback>
                                                        </Avatar>
                                                        <div>
                                                            <p className="text-xs font-medium text-slate-800 dark:text-slate-200">
                                                                {user.name}
                                                            </p>
                                                            <p className="text-[10px] text-slate-500 dark:text-slate-400">
                                                                {user.email}
                                                            </p>
                                                        </div>
                                                    </div>
                                                    <div className="text-right">
                                                        <Badge
                                                            variant="outline"
                                                            className="px-1.5 py-0 text-[9px]"
                                                        >
                                                            {user.role}
                                                        </Badge>
                                                        <p className="mt-0.5 text-[9px] text-slate-400">
                                                            {formatDate(
                                                                user.joined_at,
                                                            )}
                                                        </p>
                                                    </div>
                                                </div>
                                            ),
                                        )}
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    </div>

                    {/* ========================================== */}
                    {/* RECENT ACTIVITY */}
                    {/* ========================================== */}
                    <div className="mt-8">
                        <div className="mb-3 flex items-center gap-2">
                            <Activity className="h-4 w-4 text-slate-600" />
                            <h2 className="text-base font-semibold text-slate-800 dark:text-slate-200">
                                Recent Activity
                            </h2>
                            <Badge
                                variant="outline"
                                className="px-1.5 py-0 text-[10px]"
                            >
                                Latest Updates
                            </Badge>
                        </div>

                        <Card>
                            <CardContent className="p-0">
                                <div className="divide-y divide-slate-200 dark:divide-slate-700">
                                    {stats.recent_activities.map((activity) => (
                                        <div
                                            key={activity.id}
                                            className="flex items-center justify-between px-3 py-2 transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/50"
                                        >
                                            <div className="flex min-w-0 flex-1 items-center gap-2">
                                                {activity.status ===
                                                    'approved' && (
                                                    <CheckCircle className="h-4 w-4 flex-shrink-0 text-green-500" />
                                                )}
                                                {activity.status ===
                                                    'rejected' && (
                                                    <XCircle className="h-4 w-4 flex-shrink-0 text-red-500" />
                                                )}
                                                {activity.status ===
                                                    'pending' && (
                                                    <Clock className="h-4 w-4 flex-shrink-0 text-yellow-500" />
                                                )}
                                                {activity.status === 'sent' && (
                                                    <Send className="h-4 w-4 flex-shrink-0 text-purple-500" />
                                                )}
                                                {activity.status ===
                                                    'completed' && (
                                                    <CheckCircle className="h-4 w-4 flex-shrink-0 text-emerald-500" />
                                                )}
                                                {![
                                                    'approved',
                                                    'rejected',
                                                    'pending',
                                                    'sent',
                                                    'completed',
                                                ].includes(activity.status) && (
                                                    <Activity className="h-4 w-4 flex-shrink-0 text-blue-500" />
                                                )}
                                                <div className="min-w-0 flex-1">
                                                    <p className="truncate text-xs font-medium text-slate-800 dark:text-slate-200">
                                                        {activity.description}
                                                    </p>
                                                    <div className="flex flex-wrap items-center gap-1.5">
                                                        <Badge
                                                            variant="outline"
                                                            className="px-1.5 py-0 text-[9px]"
                                                        >
                                                            {activity.type}
                                                        </Badge>
                                                        <Badge
                                                            variant={
                                                                activity.status ===
                                                                    'approved' ||
                                                                activity.status ===
                                                                    'completed'
                                                                    ? 'success'
                                                                    : activity.status ===
                                                                        'rejected'
                                                                      ? 'destructive'
                                                                      : activity.status ===
                                                                          'pending'
                                                                        ? 'warning'
                                                                        : 'default'
                                                            }
                                                            className="px-1.5 py-0 text-[9px]"
                                                        >
                                                            {activity.status}
                                                        </Badge>
                                                        <span className="text-[9px] text-slate-400">
                                                            •
                                                        </span>
                                                        <span className="text-[9px] text-slate-500 dark:text-slate-400">
                                                            {activity.user}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                            <span className="ml-2 flex-shrink-0 text-[9px] text-slate-500 dark:text-slate-400">
                                                {formatDate(activity.date)}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                            <CardFooter className="border-t border-slate-200 px-3 py-2 dark:border-slate-700">
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="ml-auto h-7 gap-0.5 text-xs"
                                >
                                    View All Activity{' '}
                                    <ChevronRight className="h-3.5 w-3.5" />
                                </Button>
                            </CardFooter>
                        </Card>
                    </div>
                </Container>
            </div>
        </AppLayout>
    );
}
