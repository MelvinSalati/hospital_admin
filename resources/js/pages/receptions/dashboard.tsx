// resources/js/pages/reception/Dashboard.tsx
import {  router } from '@inertiajs/react';
import {
    Users,
    WalletCards,
    Banknote,
    CircleAlert,
    CircleCheck,
    UserPlus,
    Receipt,
    Search,
    Printer,
    RefreshCw,
    CalendarDays,
    ArrowUpRight,
    ArrowDownRight,
    AlertCircle,
    Clock,
    CheckCircle2,
    XCircle,
    UserRound,
    ClipboardList,
    Pill,
    Stethoscope,
    Syringe,
    Activity,
    Bed,
    CreditCard,
    Landmark,
    Smartphone,
    Coins,
    AlertTriangle,
    Info,
    Check,
    Eye,
    CalendarClock,
    UserCog,
    FileText,
    ReceiptText,
    CalendarPlus,
    UserCheck,
    Bell,
    TrendingUp,
    TrendingDown,
    Minus,
} from 'lucide-react';
import React, { useMemo, useState, useEffect } from 'react';
import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip as RechartsTooltip,
    ResponsiveContainer,
    BarChart,
    Bar,
    Cell,
    PieChart,
    Pie,
    Legend,
    LineChart,
    Line,
} from 'recharts';
import PageHeader from '@/components/PageHeader';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from '@/components/ui/tooltip';
import AppLayout from '@/layouts/app/app-header-layout';
import { cn } from '@/lib/utils';

// ============================================
// TYPES
// ============================================

interface AppointmentSummary {
    id: string;
    time: string;
    patient: string;
    provider: string;
    department: string;
    status:
        | 'scheduled'
        | 'checked_in'
        | 'waiting'
        | 'consulting'
        | 'completed'
        | 'no_show'
        | 'cancelled';
    arrivalTime?: string;
    waitTime?: number;
}

interface QueueSummary {
    department: string;
    waiting: number;
    averageWaitTime: number;
    longestWait: number;
    icon: React.ReactNode;
    color: string;
}

interface OutstandingBalance {
    id: string;
    patient: string;
    account: string;
    payer: string;
    total: number;
    paid: number;
    balance: number;
    age: number;
    status: 'current' | 'overdue' | 'partial' | 'pending_insurance';
    action: string;
}

interface RecentPayment {
    id: string;
    receipt: string;
    patient: string;
    invoice: string;
    method: string;
    amount: number;
    time: string;
    status: 'completed' | 'pending' | 'refunded' | 'failed';
}

interface AttentionItem {
    id: string;
    message: string;
    action: string;
    severity: 'critical' | 'warning' | 'info' | 'success';
    timestamp?: string;
}

interface InsuranceStatus {
    pendingVerification: number;
    authorizationRequired: number;
    claimsPending: number;
    rejectedClaims: number;
    unpaidCoPay: number;
}

interface CashierStatus {
    cash: number;
    mobileMoney: number;
    card: number;
    bank: number;
    insurance: number;
    expected: number;
    collected: number;
    variance: number;
    isReconciled: boolean;
}

interface DashboardData {
    overview: {
        registered: number;
        checkedIn: number;
        waiting: number;
        consulting: number;
        completed: number;
        cancelled: number;
        noShow: number;
    };
    appointments: AppointmentSummary[];
    queue: QueueSummary[];
    billing: {
        billed: number;
        collected: number;
        outstanding: number;
        partiallyPaid: number;
        overdue: number;
        insurancePending: number;
        refunds: number;
        discounts: number;
        collectionRate: number;
    };
    cashier: CashierStatus;
    insurance: InsuranceStatus;
    alerts: AttentionItem[];
    outstandingAccounts: OutstandingBalance[];
    recentPayments: RecentPayment[];
    dailyTrend: {
        date: string;
        patients: number;
        revenue: number;
    }[];
}

// ============================================
// MOCK DATA GENERATOR (Production: Remove this)
// ============================================

const generateMockData = (): DashboardData => {
    const departments = ['OPD', 'Dental', 'Laboratory', 'Pharmacy', 'Cashier'];
    const departmentIcons = {
        OPD: <Stethoscope className="h-4 w-4" />,
        Dental: <Activity className="h-4 w-4" />,
        Laboratory: <Syringe className="h-4 w-4" />,
        Pharmacy: <Pill className="h-4 w-4" />,
        Cashier: <Coins className="h-4 w-4" />,
    };
    const departmentColors = {
        OPD: '#1976D2',
        Dental: '#22C55E',
        Laboratory: '#8B5CF6',
        Pharmacy: '#F59E0B',
        Cashier: '#EC4899',
    };

    const now = new Date();
    const appointments: AppointmentSummary[] = [
        {
            id: '1',
            time: '08:00',
            patient: 'John Banda',
            provider: 'Dr. Phiri',
            department: 'OPD',
            status: 'completed',
        },
        {
            id: '2',
            time: '08:30',
            patient: 'Mary Zulu',
            provider: 'Dr. Mwansa',
            department: 'Dental',
            status: 'waiting',
            waitTime: 18,
        },
        {
            id: '3',
            time: '09:00',
            patient: 'Peter Tembo',
            provider: 'Dr. Banda',
            department: 'OPD',
            status: 'checked_in',
        },
        {
            id: '4',
            time: '09:30',
            patient: 'Jane Phiri',
            provider: 'Dr. Chanda',
            department: 'Laboratory',
            status: 'no_show',
        },
        {
            id: '5',
            time: '10:00',
            patient: 'David Mwale',
            provider: 'Dr. Phiri',
            department: 'OPD',
            status: 'consulting',
            waitTime: 12,
        },
        {
            id: '6',
            time: '10:30',
            patient: 'Sarah Nyirenda',
            provider: 'Dr. Mwansa',
            department: 'Dental',
            status: 'scheduled',
        },
        {
            id: '7',
            time: '11:00',
            patient: 'Michael Banda',
            provider: 'Dr. Chanda',
            department: 'Laboratory',
            status: 'checked_in',
        },
        {
            id: '8',
            time: '11:30',
            patient: 'Grace Tembo',
            provider: 'Dr. Phiri',
            department: 'OPD',
            status: 'scheduled',
        },
        {
            id: '9',
            time: '12:00',
            patient: 'Robert Zulu',
            provider: 'Dr. Banda',
            department: 'OPD',
            status: 'completed',
        },
        {
            id: '10',
            time: '13:00',
            patient: 'Elizabeth Mwale',
            provider: 'Dr. Mwansa',
            department: 'Dental',
            status: 'scheduled',
        },
    ];

    const queue: QueueSummary[] = departments.map((dept) => ({
        department: dept,
        waiting: Math.floor(Math.random() * 10) + 1,
        averageWaitTime: Math.floor(Math.random() * 15) + 5,
        longestWait: Math.floor(Math.random() * 30) + 15,
        icon: departmentIcons[dept as keyof typeof departmentIcons] || (
            <Users className="h-4 w-4" />
        ),
        color:
            departmentColors[dept as keyof typeof departmentColors] ||
            '#6B7280',
    }));

    const outstandingAccounts: OutstandingBalance[] = [
        {
            id: '1',
            patient: 'John Banda',
            account: 'ACC-00123',
            payer: 'Cash',
            total: 1500,
            paid: 650,
            balance: 850,
            age: 2,
            status: 'partial',
            action: 'Collect',
        },
        {
            id: '2',
            patient: 'Mary Zulu',
            account: 'ACC-00124',
            payer: 'Insurance',
            total: 3200,
            paid: 800,
            balance: 2400,
            age: 8,
            status: 'pending_insurance',
            action: 'Verify',
        },
        {
            id: '3',
            patient: 'Peter Tembo',
            account: 'ACC-00125',
            payer: 'Cash',
            total: 1200,
            paid: 0,
            balance: 1200,
            age: 31,
            status: 'overdue',
            action: 'Collect',
        },
        {
            id: '4',
            patient: 'Jane Phiri',
            account: 'ACC-00126',
            payer: 'Mobile Money',
            total: 560,
            paid: 0,
            balance: 560,
            age: 5,
            status: 'partial',
            action: 'Collect',
        },
        {
            id: '5',
            patient: 'David Mwale',
            account: 'ACC-00127',
            payer: 'Insurance',
            total: 2400,
            paid: 550,
            balance: 1850,
            age: 3,
            status: 'pending_insurance',
            action: 'Verify',
        },
        {
            id: '6',
            patient: 'Sarah Nyirenda',
            account: 'ACC-00128',
            payer: 'Cash',
            total: 850,
            paid: 850,
            balance: 0,
            age: 1,
            status: 'current',
            action: '',
        },
    ];

    const recentPayments: RecentPayment[] = [
        {
            id: '1',
            receipt: 'RCT-00182',
            patient: 'John Banda',
            invoice: 'INV-00482',
            method: 'Cash',
            amount: 650,
            time: '14:32',
            status: 'completed',
        },
        {
            id: '2',
            receipt: 'RCT-00183',
            patient: 'Peter Tembo',
            invoice: 'INV-00483',
            method: 'Mobile Money',
            amount: 1200,
            time: '14:15',
            status: 'completed',
        },
        {
            id: '3',
            receipt: 'RCT-00184',
            patient: 'Mary Zulu',
            invoice: 'INV-00484',
            method: 'Insurance',
            amount: 800,
            time: '13:58',
            status: 'pending',
        },
        {
            id: '4',
            receipt: 'RCT-00185',
            patient: 'David Mwale',
            invoice: 'INV-00485',
            method: 'Card',
            amount: 550,
            time: '13:30',
            status: 'completed',
        },
        {
            id: '5',
            receipt: 'RCT-00186',
            patient: 'Grace Tembo',
            invoice: 'INV-00486',
            method: 'Cash',
            amount: 340,
            time: '12:47',
            status: 'refunded',
        },
    ];

    const dailyTrend = [];
    for (let i = 6; i >= 0; i--) {
        const d = new Date(now);
        d.setDate(d.getDate() - i);
        dailyTrend.push({
            date: d.toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
            }),
            patients: 80 + Math.floor(Math.random() * 120),
            revenue: 15000 + Math.random() * 35000,
        });
    }

    return {
        overview: {
            registered: 248,
            checkedIn: 231,
            waiting: 18,
            consulting: 27,
            completed: 174,
            cancelled: 4,
            noShow: 9,
        },
        appointments,
        queue,
        billing: {
            billed: 245800,
            collected: 185420,
            outstanding: 42300,
            partiallyPaid: 12480,
            overdue: 8200,
            insurancePending: 31200,
            refunds: 2400,
            discounts: 8200,
            collectionRate: 75.4,
        },
        cashier: {
            cash: 85420,
            mobileMoney: 52800,
            card: 24600,
            bank: 9200,
            insurance: 13400,
            expected: 185420,
            collected: 182420,
            variance: 3000,
            isReconciled: false,
        },
        insurance: {
            pendingVerification: 12,
            authorizationRequired: 7,
            claimsPending: 18,
            rejectedClaims: 3,
            unpaidCoPay: 9,
        },
        alerts: [
            {
                id: '1',
                message: '3 insurance claims rejected today',
                action: 'Review claims',
                severity: 'critical',
            },
            {
                id: '2',
                message: 'Cashier variance: K3,000 discrepancy detected',
                action: 'Reconcile cash',
                severity: 'critical',
            },
            {
                id: '3',
                message: '12 overdue patient accounts require collection',
                action: 'Review accounts',
                severity: 'critical',
            },
            {
                id: '4',
                message: '8 payments awaiting reconciliation',
                action: 'Review payments',
                severity: 'warning',
            },
            {
                id: '5',
                message: '7 insurance authorizations pending approval',
                action: 'Verify authorizations',
                severity: 'warning',
            },
            {
                id: '6',
                message: '18 patients waiting >30 minutes',
                action: 'Check queue',
                severity: 'warning',
            },
            {
                id: '7',
                message: '14 appointments arriving within 30 minutes',
                action: 'Prepare for arrivals',
                severity: 'info',
            },
            {
                id: '8',
                message: 'All critical services operational',
                action: 'View status',
                severity: 'success',
            },
        ],
        outstandingAccounts,
        recentPayments,
        dailyTrend,
    };
};

// ============================================
// HELPERS
// ============================================

const formatCurrency = (amount: number) => {
    if (amount >= 1000000) {
        return `K${(amount / 1000000).toFixed(1)}M`;
    }
    if (amount >= 1000) {
        return `K${amount.toLocaleString()}`;
    }
    return `K${amount.toFixed(2)}`;
};

const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return num.toLocaleString();
    return num.toString();
};

const getStatusBadge = (status: string) => {
    const map: Record<
        string,
        {
            variant:
                | 'default'
                | 'secondary'
                | 'destructive'
                | 'outline'
                | 'success';
            label: string;
        }
    > = {
        completed: { variant: 'default', label: 'Completed' },
        checked_in: { variant: 'secondary', label: 'Checked In' },
        waiting: { variant: 'outline', label: 'Waiting' },
        consulting: { variant: 'secondary', label: 'Consulting' },
        scheduled: { variant: 'outline', label: 'Scheduled' },
        no_show: { variant: 'destructive', label: 'No Show' },
        cancelled: { variant: 'destructive', label: 'Cancelled' },
        paid: { variant: 'default', label: 'Paid' },
        pending: { variant: 'secondary', label: 'Pending' },
        partially_paid: { variant: 'outline', label: 'Partially Paid' },
        overdue: { variant: 'destructive', label: 'Overdue' },
        refunded: { variant: 'outline', label: 'Refunded' },
        current: { variant: 'default', label: 'Current' },
        pending_insurance: { variant: 'secondary', label: 'Pending Insurance' },
        partial: { variant: 'outline', label: 'Partial' },
        failed: { variant: 'destructive', label: 'Failed' },
    };
    return map[status] || map.scheduled;
};

const getSeverityStyles = (severity: AttentionItem['severity']) => {
    const map = {
        critical: {
            border: 'border-red-500',
            bg: 'bg-red-50 dark:bg-red-950/20',
            icon: AlertTriangle,
            iconColor: 'text-red-600',
            textColor: 'text-red-700 dark:text-red-400',
        },
        warning: {
            border: 'border-amber-500',
            bg: 'bg-amber-50 dark:bg-amber-950/20',
            icon: AlertCircle,
            iconColor: 'text-amber-600',
            textColor: 'text-amber-700 dark:text-amber-400',
        },
        info: {
            border: 'border-blue-500',
            bg: 'bg-blue-50 dark:bg-blue-950/20',
            icon: Info,
            iconColor: 'text-blue-600',
            textColor: 'text-blue-700 dark:text-blue-400',
        },
        success: {
            border: 'border-green-500',
            bg: 'bg-green-50 dark:bg-green-950/20',
            icon: Check,
            iconColor: 'text-green-600',
            textColor: 'text-green-700 dark:text-green-400',
        },
    };
    return map[severity];
};

// ============================================
// COMPONENTS
// ============================================

// --- Dashboard Header ---
const DashboardHeader: React.FC<{
    onRefresh: () => void;
    onDateChange: (range: string) => void;
    loading: boolean;
    lastUpdated: Date;
}> = ({ onRefresh, onDateChange, loading, lastUpdated }) => {
    const [dateRange, setDateRange] = useState('today');

    const handleDateChange = (value: string) => {
        setDateRange(value);
        onDateChange(value);
    };

    return (
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
                <PageHeader
                    icon={<Users className="h-5 w-5" />}
                    title="Reception Dashboard"
                    subtitle="Operational control centre for patient flow, billing, and exceptions"
                />
                <p className="mt-0.5 text-xs text-muted-foreground">
                    Last updated: {lastUpdated.toLocaleTimeString()}
                </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
                <Tabs
                    value={dateRange}
                    onValueChange={handleDateChange}
                    className="w-auto"
                >
                    <TabsList className="grid h-9 grid-cols-4">
                        <TabsTrigger value="today" className="text-xs">
                            Today
                        </TabsTrigger>
                        <TabsTrigger value="week" className="text-xs">
                            Week
                        </TabsTrigger>
                        <TabsTrigger value="month" className="text-xs">
                            Month
                        </TabsTrigger>
                        <TabsTrigger value="custom" className="text-xs">
                            Custom
                        </TabsTrigger>
                    </TabsList>
                </Tabs>
                <Button
                    variant="outline"
                    size="sm"
                    onClick={onRefresh}
                    disabled={loading}
                    className="gap-1"
                >
                    <RefreshCw
                        className={cn('h-3.5 w-3.5', loading && 'animate-spin')}
                    />
                    <span className="hidden sm:inline">
                        {loading ? 'Refreshing...' : 'Refresh'}
                    </span>
                </Button>
            </div>
        </div>
    );
};

// --- Core KPI Cards ---
const CoreKPIs: React.FC<{
    overview: DashboardData['overview'];
    billing: DashboardData['billing'];
}> = ({ overview, billing }) => {
    const cards = [
        {
            title: 'Patients Today',
            value: overview.registered,
            subtitle: `${overview.checkedIn} checked in`,
            icon: <Users className="h-5 w-5" />,
            color: 'bg-blue-500',
            trend: 12.4,
        },
        {
            title: 'Appointments',
            value: overview.registered - overview.cancelled - overview.noShow,
            subtitle: `${overview.consulting} in consultation`,
            icon: <CalendarClock className="h-5 w-5" />,
            color: 'bg-emerald-500',
            trend: 5.2,
        },
        {
            title: 'Waiting Now',
            value: overview.waiting,
            subtitle: 'Avg 18 min wait',
            icon: <Clock className="h-5 w-5" />,
            color: 'bg-amber-500',
            trend: -8.1,
        },
        {
            title: 'Collections',
            value: formatCurrency(billing.collected),
            subtitle: `+8.4% today`,
            icon: <Banknote className="h-5 w-5" />,
            color: 'bg-green-500',
            trend: 8.4,
        },
    ];

    return (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
            {cards.map((card) => (
                <Card
                    key={card.title}
                    className="transition-shadow hover:shadow-md"
                >
                    <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                            <div>
                                <p className="text-xs font-medium text-muted-foreground sm:text-sm">
                                    {card.title}
                                </p>
                                <p className="mt-1 text-xl font-bold tracking-tight sm:text-2xl">
                                    {card.value}
                                </p>
                                <div className="mt-1.5 flex items-center gap-1.5">
                                    {card.trend !== undefined && (
                                        <span
                                            className={cn(
                                                'flex items-center gap-0.5 text-xs font-medium',
                                                card.trend >= 0
                                                    ? 'text-green-600'
                                                    : 'text-red-600',
                                            )}
                                        >
                                            {card.trend >= 0 ? (
                                                <ArrowUpRight className="h-3 w-3" />
                                            ) : (
                                                <ArrowDownRight className="h-3 w-3" />
                                            )}
                                            {Math.abs(card.trend)}%
                                        </span>
                                    )}
                                    <span className="text-xs text-muted-foreground">
                                        {card.subtitle}
                                    </span>
                                </div>
                            </div>
                            <div
                                className={cn(
                                    'rounded-lg p-2 text-white',
                                    card.color,
                                )}
                            >
                                {card.icon}
                            </div>
                        </div>
                    </CardContent>
                </Card>
            ))}
        </div>
    );
};

// --- Patient Flow Strip ---
const PatientFlowStrip: React.FC<{ overview: DashboardData['overview'] }> = ({
    overview,
}) => {
    const steps = [
        { label: 'Registered', value: overview.registered, color: '#1976D2' },
        { label: 'Checked-in', value: overview.checkedIn, color: '#22C55E' },
        { label: 'Waiting', value: overview.waiting, color: '#F59E0B' },
        { label: 'Consulting', value: overview.consulting, color: '#8B5CF6' },
        { label: 'Completed', value: overview.completed, color: '#6B7280' },
        { label: 'No-show', value: overview.noShow, color: '#EF4444' },
        { label: 'Cancelled', value: overview.cancelled, color: '#9CA3AF' },
    ];

    const maxValue = Math.max(...steps.map((s) => s.value), 1);

    return (
        <Card>
            <CardHeader className="pb-2">
                <CardTitle className="text-base">
                    Today's Patient Flow
                </CardTitle>
                <CardDescription>
                    Real-time patient journey tracking
                </CardDescription>
            </CardHeader>
            <CardContent>
                <div className="grid grid-cols-3 gap-2 sm:grid-cols-7">
                    {steps.map((step, index) => (
                        <div key={step.label} className="space-y-1">
                            <div className="flex items-center justify-between text-xs">
                                <span className="font-medium">
                                    {step.label}
                                </span>
                                <span className="font-bold">{step.value}</span>
                            </div>
                            <div className="h-1.5 w-full overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
                                <div
                                    className="h-full rounded-full transition-all"
                                    style={{
                                        width: `${(step.value / maxValue) * 100}%`,
                                        backgroundColor: step.color,
                                    }}
                                />
                            </div>
                            {index < steps.length - 1 && (
                                <div className="hidden text-center text-xs text-muted-foreground sm:block">
                                    →
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>
    );
};

// --- Today's Appointments ---
const TodayAppointments: React.FC<{
    appointments: AppointmentSummary[];
    onAction: (action: string, id: string) => void;
}> = ({ appointments, onAction }) => {
    const statusColors = {
        completed:
            'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
        checked_in:
            'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
        waiting:
            'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
        consulting:
            'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
        scheduled:
            'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400',
        no_show: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
        cancelled:
            'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400',
    };

    const statusLabels = {
        completed: 'Completed',
        checked_in: 'Checked-in',
        waiting: 'Waiting',
        consulting: 'Consulting',
        scheduled: 'Scheduled',
        no_show: 'No-show',
        cancelled: 'Cancelled',
    };

    return (
        <Card>
            <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle className="text-base">
                            Today's Appointments
                        </CardTitle>
                        <CardDescription>
                            Upcoming and current appointments
                        </CardDescription>
                    </div>
                    <Button variant="outline" size="sm" className="text-xs">
                        View All
                    </Button>
                </div>
            </CardHeader>
            <CardContent className="p-0">
                <div className="overflow-x-auto">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="text-xs">Time</TableHead>
                                <TableHead className="text-xs">
                                    Patient
                                </TableHead>
                                <TableHead className="hidden text-xs sm:table-cell">
                                    Provider
                                </TableHead>
                                <TableHead className="hidden text-xs md:table-cell">
                                    Department
                                </TableHead>
                                <TableHead className="text-xs">
                                    Status
                                </TableHead>
                                <TableHead className="text-right text-xs">
                                    Actions
                                </TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {appointments.slice(0, 8).map((appt) => (
                                <TableRow key={appt.id}>
                                    <TableCell className="font-mono text-sm font-medium">
                                        {appt.time}
                                        {appt.waitTime !== undefined &&
                                            appt.waitTime > 0 && (
                                                <span className="ml-1 text-xs text-amber-600">
                                                    (+{appt.waitTime}m)
                                                </span>
                                            )}
                                    </TableCell>
                                    <TableCell className="text-sm font-medium">
                                        {appt.patient}
                                    </TableCell>
                                    <TableCell className="hidden text-sm sm:table-cell">
                                        {appt.provider}
                                    </TableCell>
                                    <TableCell className="hidden text-sm md:table-cell">
                                        {appt.department}
                                    </TableCell>
                                    <TableCell>
                                        <Badge
                                            className={cn(
                                                'text-xs',
                                                statusColors[appt.status],
                                            )}
                                        >
                                            {statusLabels[appt.status] ||
                                                appt.status}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex items-center justify-end gap-1">
                                            {appt.status === 'scheduled' && (
                                                <TooltipProvider>
                                                    <Tooltip>
                                                        <TooltipTrigger asChild>
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                className="h-7 w-7 p-0"
                                                                onClick={() =>
                                                                    onAction(
                                                                        'check-in',
                                                                        appt.id,
                                                                    )
                                                                }
                                                            >
                                                                <UserCheck className="h-3.5 w-3.5 text-blue-600" />
                                                            </Button>
                                                        </TooltipTrigger>
                                                        <TooltipContent>
                                                            Check-in
                                                        </TooltipContent>
                                                    </Tooltip>
                                                </TooltipProvider>
                                            )}
                                            <TooltipProvider>
                                                <Tooltip>
                                                    <TooltipTrigger asChild>
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            className="h-7 w-7 p-0"
                                                            onClick={() =>
                                                                onAction(
                                                                    'view',
                                                                    appt.id,
                                                                )
                                                            }
                                                        >
                                                            <Eye className="h-3.5 w-3.5 text-gray-500" />
                                                        </Button>
                                                    </TooltipTrigger>
                                                    <TooltipContent>
                                                        View
                                                    </TooltipContent>
                                                </Tooltip>
                                            </TooltipProvider>
                                            {appt.status === 'scheduled' && (
                                                <>
                                                    <TooltipProvider>
                                                        <Tooltip>
                                                            <TooltipTrigger
                                                                asChild
                                                            >
                                                                <Button
                                                                    variant="ghost"
                                                                    size="sm"
                                                                    className="h-7 w-7 p-0"
                                                                    onClick={() =>
                                                                        onAction(
                                                                            'reschedule',
                                                                            appt.id,
                                                                        )
                                                                    }
                                                                >
                                                                    <CalendarClock className="h-3.5 w-3.5 text-amber-600" />
                                                                </Button>
                                                            </TooltipTrigger>
                                                            <TooltipContent>
                                                                Reschedule
                                                            </TooltipContent>
                                                        </Tooltip>
                                                    </TooltipProvider>
                                                    <TooltipProvider>
                                                        <Tooltip>
                                                            <TooltipTrigger
                                                                asChild
                                                            >
                                                                <Button
                                                                    variant="ghost"
                                                                    size="sm"
                                                                    className="h-7 w-7 p-0"
                                                                    onClick={() =>
                                                                        onAction(
                                                                            'cancel',
                                                                            appt.id,
                                                                        )
                                                                    }
                                                                >
                                                                    <XCircle className="h-3.5 w-3.5 text-red-600" />
                                                                </Button>
                                                            </TooltipTrigger>
                                                            <TooltipContent>
                                                                Cancel
                                                            </TooltipContent>
                                                        </Tooltip>
                                                    </TooltipProvider>
                                                </>
                                            )}
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            </CardContent>
        </Card>
    );
};

// --- Queue Status ---
const QueueStatus: React.FC<{ queue: QueueSummary[] }> = ({ queue }) => {
    const longestWaiting = queue.reduce((max, q) =>
        q.longestWait > max.longestWait ? q : max,
    );
    const totalWaiting = queue.reduce((sum, q) => sum + q.waiting, 0);

    return (
        <Card>
            <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle className="text-base">
                            Queue Status
                        </CardTitle>
                        <CardDescription>
                            Current departmental queues
                        </CardDescription>
                    </div>
                    <div className="text-right">
                        <p className="text-sm font-bold">
                            {totalWaiting} waiting
                        </p>
                        <p className="text-xs text-muted-foreground">
                            Longest: {longestWaiting.longestWait} min
                        </p>
                    </div>
                </div>
            </CardHeader>
            <CardContent>
                <div className="space-y-3">
                    {queue.map((dept) => (
                        <div key={dept.department} className="space-y-1">
                            <div className="flex items-center justify-between text-sm">
                                <div className="flex items-center gap-2">
                                    <span style={{ color: dept.color }}>
                                        {dept.icon}
                                    </span>
                                    <span className="font-medium">
                                        {dept.department}
                                    </span>
                                    <span className="text-xs text-muted-foreground">
                                        avg {dept.averageWaitTime} min
                                    </span>
                                </div>
                                <div className="flex items-center gap-3">
                                    <span className="font-bold">
                                        {dept.waiting}
                                    </span>
                                    <span className="text-xs text-muted-foreground">
                                        waiting
                                    </span>
                                </div>
                            </div>
                            <Progress
                                value={
                                    (dept.waiting /
                                        Math.max(
                                            ...queue.map((q) => q.waiting),
                                        )) *
                                    100
                                }
                                className="h-1.5"
                                style={{ backgroundColor: `${dept.color}20` }}
                                indicatorColor={dept.color}
                            />
                        </div>
                    ))}
                </div>
                <div className="mt-3 rounded-lg bg-amber-50 p-2 text-center dark:bg-amber-950/20">
                    <p className="text-sm font-medium text-amber-700 dark:text-amber-400">
                        ⏱ Longest waiting patient: {longestWaiting.longestWait}{' '}
                        minutes
                    </p>
                </div>
            </CardContent>
        </Card>
    );
};

// --- Billing Control ---
const BillingControl: React.FC<{ billing: DashboardData['billing'] }> = ({
    billing,
}) => {
    const items = [
        {
            label: 'Billed today',
            value: billing.billed,
            color: 'text-blue-600',
        },
        {
            label: 'Collected',
            value: billing.collected,
            color: 'text-green-600',
        },
        { label: 'Unpaid', value: billing.outstanding, color: 'text-red-600' },
        {
            label: 'Partially paid',
            value: billing.partiallyPaid,
            color: 'text-amber-600',
        },
        {
            label: 'Insurance pending',
            value: billing.insurancePending,
            color: 'text-purple-600',
        },
        { label: 'Refunds', value: billing.refunds, color: 'text-orange-600' },
        {
            label: 'Discounts',
            value: billing.discounts,
            color: 'text-pink-600',
        },
    ];

    return (
        <Card>
            <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle className="text-base">
                            Billing Control
                        </CardTitle>
                        <CardDescription>
                            Real-time billing overview
                        </CardDescription>
                    </div>
                    <div className="text-right">
                        <p className="text-sm font-bold text-green-600">
                            {billing.collectionRate}% Collection Rate
                        </p>
                    </div>
                </div>
            </CardHeader>
            <CardContent>
                <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
                    {items.map((item) => (
                        <div
                            key={item.label}
                            className="rounded-lg bg-muted/30 p-2 text-center transition-colors hover:bg-muted/50"
                        >
                            <p className={cn('text-sm font-bold', item.color)}>
                                {formatCurrency(item.value)}
                            </p>
                            <p className="text-[10px] text-muted-foreground">
                                {item.label}
                            </p>
                        </div>
                    ))}
                </div>
                <div className="mt-3">
                    <div className="mb-1 flex justify-between text-xs">
                        <span className="text-muted-foreground">
                            Collection Progress
                        </span>
                        <span className="font-medium">
                            {billing.collectionRate}%
                        </span>
                    </div>
                    <Progress value={billing.collectionRate} className="h-2" />
                </div>
                <p className="mt-2 text-center text-xs text-muted-foreground">
                    ⚠ Billed ≠ Collected — Track the difference
                </p>
            </CardContent>
        </Card>
    );
};

// --- Insurance Monitoring ---
const InsuranceMonitoring: React.FC<{ insurance: InsuranceStatus }> = ({
    insurance,
}) => {
    const items = [
        {
            label: 'Pending Verification',
            value: insurance.pendingVerification,
            color: 'bg-blue-500',
        },
        {
            label: 'Authorization Required',
            value: insurance.authorizationRequired,
            color: 'bg-amber-500',
        },
        {
            label: 'Claims Pending',
            value: insurance.claimsPending,
            color: 'bg-purple-500',
        },
        {
            label: 'Rejected Claims',
            value: insurance.rejectedClaims,
            color: 'bg-red-500',
        },
        {
            label: 'Unpaid Co-pay',
            value: insurance.unpaidCoPay,
            color: 'bg-orange-500',
        },
    ];

    const total = items.reduce((sum, item) => sum + item.value, 0);

    return (
        <Card>
            <CardHeader className="pb-2">
                <CardTitle className="text-base">Insurance / Scheme</CardTitle>
                <CardDescription>Monitoring and alerts</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
                    {items.map((item) => (
                        <div
                            key={item.label}
                            className="rounded-lg bg-muted/30 p-2 text-center transition-colors hover:bg-muted/50"
                        >
                            <p className="text-lg font-bold">{item.value}</p>
                            <p className="text-[10px] text-muted-foreground">
                                {item.label}
                            </p>
                        </div>
                    ))}
                </div>
                {insurance.rejectedClaims > 0 && (
                    <div className="mt-3 rounded-lg bg-red-50 p-2 text-center dark:bg-red-950/20">
                        <p className="text-sm font-medium text-red-600 dark:text-red-400">
                            ⚠ {insurance.rejectedClaims} insurance claims
                            rejected today
                        </p>
                    </div>
                )}
            </CardContent>
        </Card>
    );
};

// --- Cashier Reconciliation ---
const CashierReconciliation: React.FC<{ cashier: CashierStatus }> = ({
    cashier,
}) => {
    const methods = [
        {
            label: 'Cash',
            value: cashier.cash,
            icon: <Coins className="h-4 w-4" />,
        },
        {
            label: 'Mobile Money',
            value: cashier.mobileMoney,
            icon: <Smartphone className="h-4 w-4" />,
        },
        {
            label: 'Card',
            value: cashier.card,
            icon: <CreditCard className="h-4 w-4" />,
        },
        {
            label: 'Bank',
            value: cashier.bank,
            icon: <Landmark className="h-4 w-4" />,
        },
        {
            label: 'Insurance',
            value: cashier.insurance,
            icon: <FileText className="h-4 w-4" />,
        },
    ];

    return (
        <Card>
            <CardHeader className="pb-2">
                <CardTitle className="text-base">
                    Cashier / Reconciliation
                </CardTitle>
                <CardDescription>Payment reconciliation status</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="space-y-1.5">
                    {methods.map((method) => (
                        <div
                            key={method.label}
                            className="flex items-center justify-between text-sm"
                        >
                            <div className="flex items-center gap-2">
                                <span className="text-muted-foreground">
                                    {method.icon}
                                </span>
                                <span className="text-muted-foreground">
                                    {method.label}
                                </span>
                            </div>
                            <span className="font-medium tabular-nums">
                                {formatCurrency(method.value)}
                            </span>
                        </div>
                    ))}
                    <Separator className="my-2" />
                    <div className="flex items-center justify-between text-sm font-bold">
                        <span>Expected</span>
                        <span className="tabular-nums">
                            {formatCurrency(cashier.expected)}
                        </span>
                    </div>
                    <div className="flex items-center justify-between text-sm font-bold">
                        <span>Reconciled</span>
                        <span className="tabular-nums">
                            {formatCurrency(cashier.collected)}
                        </span>
                    </div>
                    <div
                        className={cn(
                            'flex items-center justify-between rounded-lg p-2 text-sm font-bold',
                            cashier.isReconciled
                                ? 'bg-green-50 text-green-700 dark:bg-green-950/30'
                                : 'bg-red-50 text-red-700 dark:bg-red-950/30',
                        )}
                    >
                        <span>Difference</span>
                        <span className="tabular-nums">
                            {formatCurrency(cashier.variance)}
                            {!cashier.isReconciled && ' ⚠'}
                        </span>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
};

// --- Outstanding Accounts ---
const OutstandingAccounts: React.FC<{ accounts: OutstandingBalance[] }> = ({
    accounts,
}) => {
    const totalBalance = accounts.reduce((sum, acc) => sum + acc.balance, 0);

    return (
        <Card>
            <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle className="text-base">
                            Outstanding Accounts
                        </CardTitle>
                        <CardDescription>
                            Patient billing balances
                        </CardDescription>
                    </div>
                    <div className="text-right">
                        <p className="text-lg font-bold text-red-600">
                            {formatCurrency(totalBalance)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                            Total Outstanding
                        </p>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="p-0">
                <div className="overflow-x-auto">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="text-xs">
                                    Patient
                                </TableHead>
                                <TableHead className="hidden text-xs sm:table-cell">
                                    Account
                                </TableHead>
                                <TableHead className="hidden text-xs md:table-cell">
                                    Payer
                                </TableHead>
                                <TableHead className="text-right text-xs">
                                    Total
                                </TableHead>
                                <TableHead className="text-right text-xs">
                                    Paid
                                </TableHead>
                                <TableHead className="text-right text-xs">
                                    Balance
                                </TableHead>
                                <TableHead className="hidden text-xs lg:table-cell">
                                    Age
                                </TableHead>
                                <TableHead className="text-xs">
                                    Status
                                </TableHead>
                                <TableHead className="text-right text-xs">
                                    Action
                                </TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {accounts
                                .filter((acc) => acc.balance > 0)
                                .map((acc) => {
                                    const status = getStatusBadge(acc.status);
                                    return (
                                        <TableRow key={acc.id}>
                                            <TableCell className="text-sm font-medium">
                                                {acc.patient}
                                            </TableCell>
                                            <TableCell className="hidden font-mono text-sm sm:table-cell">
                                                {acc.account}
                                            </TableCell>
                                            <TableCell className="hidden text-sm md:table-cell">
                                                {acc.payer}
                                            </TableCell>
                                            <TableCell className="text-right text-sm tabular-nums">
                                                {formatCurrency(acc.total)}
                                            </TableCell>
                                            <TableCell className="text-right text-sm text-green-600 tabular-nums">
                                                {formatCurrency(acc.paid)}
                                            </TableCell>
                                            <TableCell className="text-right text-sm font-bold text-red-600 tabular-nums">
                                                {formatCurrency(acc.balance)}
                                            </TableCell>
                                            <TableCell className="hidden text-sm lg:table-cell">
                                                {acc.age} days
                                            </TableCell>
                                            <TableCell>
                                                <Badge
                                                    variant={status.variant}
                                                    className="text-xs"
                                                >
                                                    {status.label}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                {acc.action && (
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="h-7 text-xs"
                                                    >
                                                        {acc.action}
                                                    </Button>
                                                )}
                                            </TableCell>
                                        </TableRow>
                                    );
                                })}
                        </TableBody>
                    </Table>
                </div>
                <div className="p-3 text-center">
                    <Button variant="outline" size="sm" className="text-xs">
                        View All Accounts
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
};

// --- Recent Payments ---
const RecentPayments: React.FC<{ payments: RecentPayment[] }> = ({
    payments,
}) => {
    return (
        <Card>
            <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle className="text-base">
                            Recent Payments
                        </CardTitle>
                        <CardDescription>
                            Latest receipts and transactions
                        </CardDescription>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="p-0">
                <div className="overflow-x-auto">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="text-xs">
                                    Receipt
                                </TableHead>
                                <TableHead className="text-xs">
                                    Patient
                                </TableHead>
                                <TableHead className="hidden text-xs sm:table-cell">
                                    Invoice
                                </TableHead>
                                <TableHead className="hidden text-xs md:table-cell">
                                    Method
                                </TableHead>
                                <TableHead className="text-right text-xs">
                                    Amount
                                </TableHead>
                                <TableHead className="hidden text-xs lg:table-cell">
                                    Time
                                </TableHead>
                                <TableHead className="text-xs">
                                    Status
                                </TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {payments.map((payment) => {
                                const status = getStatusBadge(payment.status);
                                return (
                                    <TableRow key={payment.id}>
                                        <TableCell className="font-mono text-sm">
                                            {payment.receipt}
                                        </TableCell>
                                        <TableCell className="text-sm">
                                            {payment.patient}
                                        </TableCell>
                                        <TableCell className="hidden font-mono text-sm sm:table-cell">
                                            {payment.invoice}
                                        </TableCell>
                                        <TableCell className="hidden text-sm md:table-cell">
                                            {payment.method}
                                        </TableCell>
                                        <TableCell className="text-right text-sm font-medium tabular-nums">
                                            {formatCurrency(payment.amount)}
                                        </TableCell>
                                        <TableCell className="hidden text-sm text-muted-foreground lg:table-cell">
                                            {payment.time}
                                        </TableCell>
                                        <TableCell>
                                            <Badge
                                                variant={status.variant}
                                                className="text-xs"
                                            >
                                                {status.label}
                                            </Badge>
                                        </TableCell>
                                    </TableRow>
                                );
                            })}
                        </TableBody>
                    </Table>
                </div>
                <div className="p-3 text-center">
                    <Button variant="outline" size="sm" className="text-xs">
                        View All Payments
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
};

// --- Attention Required ---
const AttentionRequired: React.FC<{ alerts: AttentionItem[] }> = ({
    alerts,
}) => {
    const grouped = alerts.reduce(
        (acc, alert) => {
            if (!acc[alert.severity]) acc[alert.severity] = [];
            acc[alert.severity].push(alert);
            return acc;
        },
        {} as Record<AttentionItem['severity'], AttentionItem[]>,
    );

    const severityOrder: AttentionItem['severity'][] = [
        'critical',
        'warning',
        'info',
        'success',
    ];
    const severityLabels = {
        critical: 'Critical',
        warning: 'Warning',
        info: 'Information',
        success: 'Success',
    };

    return (
        <Card>
            <CardHeader className="pb-2">
                <CardTitle className="text-base">Attention Required</CardTitle>
                <CardDescription>
                    Actionable items needing review
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
                {severityOrder.map((severity) => {
                    const items = grouped[severity] || [];
                    if (items.length === 0) return null;
                    const styles = getSeverityStyles(severity);
                    const Icon = styles.icon;

                    return (
                        <div key={severity} className="space-y-1.5">
                            <p className="text-xs font-medium tracking-wider text-muted-foreground uppercase">
                                {severityLabels[severity]}
                            </p>
                            {items.map((item) => (
                                <div
                                    key={item.id}
                                    className={cn(
                                        'flex items-center justify-between rounded-lg border-l-4 p-2.5 transition-colors hover:bg-muted/50',
                                        styles.border,
                                        styles.bg,
                                    )}
                                >
                                    <div className="flex items-center gap-2.5">
                                        <Icon
                                            className={cn(
                                                'h-4 w-4 shrink-0',
                                                styles.iconColor,
                                            )}
                                        />
                                        <div>
                                            <p
                                                className={cn(
                                                    'text-sm font-medium',
                                                    styles.textColor,
                                                )}
                                            >
                                                {item.message}
                                            </p>
                                            <p className="text-xs text-muted-foreground">
                                                {item.action}
                                            </p>
                                        </div>
                                    </div>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-7 shrink-0 text-xs"
                                    >
                                        Review
                                    </Button>
                                </div>
                            ))}
                        </div>
                    );
                })}
            </CardContent>
        </Card>
    );
};

// --- Quick Actions ---
const QuickActions: React.FC = () => {
    const actions = [
        {
            icon: UserPlus,
            label: 'Register Patient',
            color: 'text-blue-600',
            route: '/patients/register',
        },
        {
            icon: CalendarPlus,
            label: 'Book Appointment',
            color: 'text-emerald-600',
            route: '/appointments/book',
        },
        {
            icon: UserCheck,
            label: 'Check-in Patient',
            color: 'text-green-600',
            route: '/check-in',
        },
        {
            icon: Search,
            label: 'Search Patient',
            color: 'text-purple-600',
            route: '/patients/search',
        },
        {
            icon: ReceiptText,
            label: 'Create Bill',
            color: 'text-amber-600',
            route: '/billing/create',
        },
        {
            icon: Banknote,
            label: 'Receive Payment',
            color: 'text-teal-600',
            route: '/payments/receive',
        },
        {
            icon: Printer,
            label: 'Print Receipt',
            color: 'text-gray-600',
            route: '/payments/print',
        },
        {
            icon: WalletCards,
            label: 'Outstanding Balances',
            color: 'text-red-600',
            route: '/billing/outstanding',
        },
    ];

    return (
        <Card>
            <CardHeader className="pb-2">
                <CardTitle className="text-base">Quick Actions</CardTitle>
                <CardDescription>
                    Common reception and billing tasks
                </CardDescription>
            </CardHeader>
            <CardContent>
                <div className="grid grid-cols-4 gap-2 sm:grid-cols-8">
                    {actions.map((action) => (
                        <TooltipProvider key={action.label}>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button
                                        variant="outline"
                                        className="flex h-auto flex-col items-center justify-center gap-1.5 px-1 py-3 transition-colors hover:border-primary/50 hover:bg-muted/50 sm:px-2"
                                        onClick={() =>
                                            router.visit(action.route)
                                        }
                                    >
                                        <action.icon
                                            className={cn(
                                                'h-4 w-4 sm:h-5 sm:w-5',
                                                action.color,
                                            )}
                                        />
                                        <span className="text-center text-[8px] leading-tight text-muted-foreground sm:text-[10px]">
                                            {action.label}
                                        </span>
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent side="bottom">
                                    <p className="text-xs">{action.label}</p>
                                </TooltipContent>
                            </Tooltip>
                        </TooltipProvider>
                    ))}
                </div>
            </CardContent>
        </Card>
    );
};

// --- Daily Trend Chart ---
const DailyTrendChart: React.FC<{ data: DashboardData['dailyTrend'] }> = ({
    data,
}) => {
    return (
        <Card>
            <CardHeader className="pb-2">
                <CardTitle className="text-base">Daily Trend</CardTitle>
                <CardDescription>
                    Patients and revenue over time
                </CardDescription>
            </CardHeader>
            <CardContent>
                <div className="h-[200px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart
                            data={data}
                            margin={{ top: 10, right: 20, left: 0, bottom: 0 }}
                        >
                            <CartesianGrid
                                strokeDasharray="3 3"
                                stroke="#e5e7eb"
                                vertical={false}
                            />
                            <XAxis
                                dataKey="date"
                                tick={{ fontSize: 11 }}
                                tickLine={false}
                                axisLine={false}
                            />
                            <YAxis
                                yAxisId="left"
                                tick={{ fontSize: 11 }}
                                tickLine={false}
                                axisLine={false}
                                tickFormatter={(v) => formatNumber(v)}
                            />
                            <YAxis
                                yAxisId="right"
                                orientation="right"
                                tick={{ fontSize: 11 }}
                                tickLine={false}
                                axisLine={false}
                                tickFormatter={(v) => `K${v / 1000}k`}
                            />
                            <RechartsTooltip
                                formatter={(value: number, name: string) => {
                                    if (name === 'Patients')
                                        return formatNumber(value);
                                    return formatCurrency(value);
                                }}
                                contentStyle={{
                                    backgroundColor: 'white',
                                    border: '1px solid #e5e7eb',
                                    borderRadius: '8px',
                                    fontSize: '12px',
                                    padding: '8px 12px',
                                }}
                            />
                            <Line
                                yAxisId="left"
                                type="monotone"
                                dataKey="patients"
                                stroke="#1976D2"
                                strokeWidth={2}
                                dot={{ r: 3 }}
                            />
                            <Line
                                yAxisId="right"
                                type="monotone"
                                dataKey="revenue"
                                stroke="#22C55E"
                                strokeWidth={2}
                                dot={{ r: 3 }}
                            />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            </CardContent>
        </Card>
    );
};

// ============================================
// MAIN DASHBOARD COMPONENT
// ============================================

export default function Dashboard() {
    const [data, setData] = useState<DashboardData>(generateMockData);
    const [loading, setLoading] = useState(false);
    const [lastUpdated, setLastUpdated] = useState(new Date());

    const handleRefresh = () => {
        setLoading(true);
        // In production, this would fetch from Laravel API
        setTimeout(() => {
            setData(generateMockData());
            setLastUpdated(new Date());
            setLoading(false);
        }, 800);
    };

    const handleDateChange = (range: string) => {
        console.log('Date range changed:', range);
        // In production, this would trigger a data fetch
    };

    const handleAppointmentAction = (action: string, id: string) => {
        console.log(`Appointment ${action}: ${id}`);
        // In production, this would navigate or trigger a modal
    };

    const {
        overview,
        appointments,
        queue,
        billing,
        cashier,
        insurance,
        alerts,
        outstandingAccounts,
        recentPayments,
        dailyTrend,
    } = data;

    return (
        <AppLayout
            breadcrumbs={[
                { title: 'Dashboard', href: '/' },
                { title: 'Reception', href: '/reception' },
            ]}
        >
            <div className="h-full space-y-4 bg-blue-50 p-3 sm:space-y-6 sm:p-6">
                {/* Header */}
                <DashboardHeader
                    onRefresh={handleRefresh}
                    onDateChange={handleDateChange}
                    loading={loading}
                    lastUpdated={lastUpdated}
                />

                {/* Core KPIs */}
                <CoreKPIs overview={overview} billing={billing} />

                {/* Patient Flow */}
                <PatientFlowStrip overview={overview} />

                {/* Appointments & Queue */}
                <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
                    <div className="lg:col-span-2">
                        <TodayAppointments
                            appointments={appointments}
                            onAction={handleAppointmentAction}
                        />
                    </div>
                    <div>
                        <QueueStatus queue={queue} />
                    </div>
                </div>

                {/* Billing & Insurance */}
                <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
                    <div className="lg:col-span-2">
                        <BillingControl billing={billing} />
                    </div>
                    <div>
                        <InsuranceMonitoring insurance={insurance} />
                    </div>
                </div>

                {/* Cashier & Daily Trend */}
                <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
                    <div>
                        <CashierReconciliation cashier={cashier} />
                    </div>
                    <div className="lg:col-span-2">
                        <DailyTrendChart data={dailyTrend} />
                    </div>
                </div>

                {/* Outstanding Accounts */}
                <OutstandingAccounts accounts={outstandingAccounts} />

                {/* Recent Payments */}
                <RecentPayments payments={recentPayments} />

                {/* Attention Required & Quick Actions */}
                <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
                    <div className="lg:col-span-2">
                        <AttentionRequired alerts={alerts} />
                    </div>
                    <div>
                        <QuickActions />
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}
