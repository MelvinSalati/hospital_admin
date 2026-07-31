import React, { useState, useEffect, useCallback } from 'react';
import { Head, usePage } from '@inertiajs/react';
import AppLayout from "@/layouts/app-layout";
import Container from '@/components/Container';
import PageHeader from '@/components/PageHeader';
import { 
    Plus, 
    Users, 
    UserCheck, 
    UserX, 
    Clock, 
    Calendar, 
    Activity,
    TrendingUp,
    TrendingDown,
    AlertCircle,
    CheckCircle,
    XCircle,
    FileText,
    Eye,
    RefreshCw,
    Download,
    Printer,
    BarChart3,
    PieChart,
    CalendarDays,
    Briefcase,
    User,
    LogIn,
    LogOut,
    Timer,
    AlertTriangle,
    Bell,
    Mail,
    Phone
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import Http from '@/utils/Http';
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import {
    LineChart,
    Line,
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
    PieChart as RePieChart,
    Pie,
    Cell
} from 'recharts';

// ============================================
// TYPES
// ============================================

interface LeaveStats {
    total_employees: number;
    on_leave_today: number;
    on_leave_this_week: number;
    pending_approvals: number;
    approved_this_month: number;
    rejected_this_month: number;
    leave_balance_avg: number;
}

interface AttendanceStats {
    checked_in_today: number;
    checked_out_today: number;
    late_arrivals: number;
    early_departures: number;
    absent_today: number;
    on_time_percentage: number;
    average_arrival_time: string;
    average_departure_time: string;
}

interface LogbookStats {
    total_logs_today: number;
    active_users_today: number;
    system_errors_today: number;
    warnings_today: number;
    successful_operations: number;
    peak_activity_hour: string;
}

interface ReportingTimeStats {
    on_time_reports: number;
    late_reports: number;
    pending_reports: number;
    submitted_reports: number;
    average_submission_time: string;
    compliance_rate: number;
}

interface DepartmentStats {
    name: string;
    employees: number;
    on_leave: number;
    present: number;
    late: number;
}

interface DailyActivity {
    hour: string;
    logins: number;
    actions: number;
    errors: number;
}

// ============================================
// MAIN COMPONENT
// ============================================

export default function HRDashboard() {
    const { props } = usePage();
    const [loading, setLoading] = useState(false);
    const [leaveStats, setLeaveStats] = useState<LeaveStats>({
        total_employees: 0,
        on_leave_today: 0,
        on_leave_this_week: 0,
        pending_approvals: 0,
        approved_this_month: 0,
        rejected_this_month: 0,
        leave_balance_avg: 0
    });
    const [attendanceStats, setAttendanceStats] = useState<AttendanceStats>({
        checked_in_today: 0,
        checked_out_today: 0,
        late_arrivals: 0,
        early_departures: 0,
        absent_today: 0,
        on_time_percentage: 0,
        average_arrival_time: '08:00',
        average_departure_time: '17:00'
    });
    const [logbookStats, setLogbookStats] = useState<LogbookStats>({
        total_logs_today: 0,
        active_users_today: 0,
        system_errors_today: 0,
        warnings_today: 0,
        successful_operations: 0,
        peak_activity_hour: '10:00'
    });
    const [reportingStats, setReportingStats] = useState<ReportingTimeStats>({
        on_time_reports: 0,
        late_reports: 0,
        pending_reports: 0,
        submitted_reports: 0,
        average_submission_time: '09:30',
        compliance_rate: 0
    });
    const [departmentStats, setDepartmentStats] = useState<DepartmentStats[]>([]);
    const [dailyActivity, setDailyActivity] = useState<DailyActivity[]>([]);
    const [recentLeaves, setRecentLeaves] = useState<any[]>([]);
    const [recentLogs, setRecentLogs] = useState<any[]>([]);

    const { auth } = usePage().props;

    // ============================================
    // FETCH DASHBOARD DATA
    // ============================================

    const fetchDashboardData = useCallback(async () => {
        setLoading(true);
        try {
            const response = await Http.get('/humanresources/dashboard-data');
            const data = response.data;

            // Update all stats
            if (data.leave_stats) setLeaveStats(data.leave_stats);
            if (data.attendance_stats) setAttendanceStats(data.attendance_stats);
            if (data.logbook_stats) setLogbookStats(data.logbook_stats);
            if (data.reporting_stats) setReportingStats(data.reporting_stats);
            if (data.department_stats) setDepartmentStats(data.department_stats);
            if (data.daily_activity) setDailyActivity(data.daily_activity);
            if (data.recent_leaves) setRecentLeaves(data.recent_leaves);
            if (data.recent_logs) setRecentLogs(data.recent_logs);

        } catch (error) {
            console.error('Failed to fetch dashboard data:', error);
            toast.error('Failed to load dashboard data');
            
            // Set demo data for testing
            setDemoData();
        } finally {
            setLoading(false);
        }
    }, []);

    const setDemoData = () => {
        setLeaveStats({
            total_employees: 45,
            on_leave_today: 3,
            on_leave_this_week: 8,
            pending_approvals: 5,
            approved_this_month: 12,
            rejected_this_month: 2,
            leave_balance_avg: 12.5
        });
        setAttendanceStats({
            checked_in_today: 38,
            checked_out_today: 32,
            late_arrivals: 4,
            early_departures: 2,
            absent_today: 7,
            on_time_percentage: 85,
            average_arrival_time: '08:15',
            average_departure_time: '16:45'
        });
        setLogbookStats({
            total_logs_today: 156,
            active_users_today: 28,
            system_errors_today: 3,
            warnings_today: 8,
            successful_operations: 145,
            peak_activity_hour: '10:00'
        });
        setReportingStats({
            on_time_reports: 18,
            late_reports: 4,
            pending_reports: 6,
            submitted_reports: 22,
            average_submission_time: '09:15',
            compliance_rate: 82
        });
        setDepartmentStats([
            { name: 'Administration', employees: 8, on_leave: 1, present: 7, late: 0 },
            { name: 'Finance', employees: 6, on_leave: 0, present: 5, late: 1 },
            { name: 'Human Resources', employees: 5, on_leave: 1, present: 4, late: 0 },
            { name: 'IT Department', employees: 7, on_leave: 0, present: 6, late: 1 },
            { name: 'Operations', employees: 10, on_leave: 1, present: 8, late: 2 },
            { name: 'Medical', employees: 9, on_leave: 0, present: 8, late: 0 }
        ]);
        setDailyActivity([
            { hour: '06:00', logins: 2, actions: 5, errors: 0 },
            { hour: '07:00', logins: 5, actions: 15, errors: 0 },
            { hour: '08:00', logins: 12, actions: 35, errors: 1 },
            { hour: '09:00', logins: 8, actions: 42, errors: 2 },
            { hour: '10:00', logins: 6, actions: 38, errors: 0 },
            { hour: '11:00', logins: 3, actions: 28, errors: 0 },
            { hour: '12:00', logins: 2, actions: 15, errors: 0 },
            { hour: '13:00', logins: 4, actions: 22, errors: 0 },
            { hour: '14:00', logins: 5, actions: 30, errors: 1 },
            { hour: '15:00', logins: 3, actions: 25, errors: 0 },
            { hour: '16:00', logins: 2, actions: 18, errors: 0 },
            { hour: '17:00', logins: 1, actions: 8, errors: 0 }
        ]);
        setRecentLeaves([
            { id: 1, employee: 'John Doe', type: 'Annual', start: '2024-01-15', end: '2024-01-20', status: 'pending' },
            { id: 2, employee: 'Jane Smith', type: 'Sick', start: '2024-01-16', end: '2024-01-17', status: 'approved' },
            { id: 3, employee: 'Mike Johnson', type: 'Maternity', start: '2024-01-10', end: '2024-03-10', status: 'approved' }
        ]);
        setRecentLogs([
            { id: 1, user: 'John Doe', action: 'Login', time: '08:00', status: 'success' },
            { id: 2, user: 'Jane Smith', action: 'Updated Leave', time: '08:15', status: 'success' },
            { id: 3, user: 'Mike Johnson', action: 'Login', time: '08:30', status: 'error' }
        ]);
    };

    useEffect(() => {
        fetchDashboardData();
        // Refresh every 5 minutes
        const interval = setInterval(fetchDashboardData, 300000);
        return () => clearInterval(interval);
    }, [fetchDashboardData]);

    // ============================================
    // HELPER FUNCTIONS
    // ============================================

    const formatDate = (date: string) => {
        if (!date) return 'N/A';
        return new Date(date).toLocaleDateString('en-ZM', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
        });
    };

    const formatTime = (time: string) => {
        if (!time) return 'N/A';
        return new Date(`1970-01-01T${time}`).toLocaleTimeString('en-ZM', {
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'approved': return 'text-green-600 bg-green-100 dark:bg-green-900/30 dark:text-green-400';
            case 'pending': return 'text-yellow-600 bg-yellow-100 dark:bg-yellow-900/30 dark:text-yellow-400';
            case 'rejected': return 'text-red-600 bg-red-100 dark:bg-red-900/30 dark:text-red-400';
            default: return 'text-gray-600 bg-gray-100 dark:bg-gray-700 dark:text-gray-300';
        }
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'success': return <CheckCircle className="h-4 w-4" />;
            case 'error': return <XCircle className="h-4 w-4" />;
            case 'warning': return <AlertTriangle className="h-4 w-4" />;
            default: return <AlertCircle className="h-4 w-4" />;
        }
    };

    // COLORS for charts
    const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];

    // ============================================
    // STAT CARDS
    // ============================================

    const StatCard = ({ title, value, color, icon, subtitle, loading }: any) => (
        <Card className="border-slate-200 dark:border-slate-700">
            <CardContent className="p-6">
                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
                            {title}
                        </p>
                        {loading ? (
                            <div className="h-8 w-20 animate-pulse rounded bg-slate-200 dark:bg-slate-700 mt-1"></div>
                        ) : (
                            <p className="text-2xl font-bold text-slate-800 dark:text-slate-200">
                                {value}
                            </p>
                        )}
                        {subtitle && (
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                                {subtitle}
                            </p>
                        )}
                    </div>
                    <div className={`rounded-full p-2 ${color}`}>
                        {icon}
                    </div>
                </div>
            </CardContent>
        </Card>
    );

    // ============================================
    // RENDER
    // ============================================

    return (
        <AppLayout 
            breadcrumbs={[
                { title: 'Home', href: '/' },
                { title: 'HR', href: '/humanresources' },
                { title: 'Dashboard', href: '' }
            ]}
        >
            <Head title="HR Dashboard" />
            
            <div className="min-h-screen bg-slate-100 px-4 py-6 dark:bg-slate-900">
                <Container>
                    {/* Header */}
                    <PageHeader 
                        title="Human Resource Dashboard" 
                        subtitle="Monitor HR Operations, Leave, Attendance, and System Activity" 
                        actions={[
                            {
                                label: 'Refresh',
                                icon: <RefreshCw className="h-4 w-4" />,
                                onClick: fetchDashboardData,
                                variant: 'outline',
                                loading: loading
                            },
                            {
                                label: 'Export Report',
                                icon: <Download className="h-4 w-4" />,
                                onClick: () => toast.success('Exporting report...'),
                                variant: 'outline'
                            },
                            {
                                label: 'Add Employee',
                                icon: <Plus className="h-4 w-4" />,
                                onClick: () => console.log('Add employee'),
                                variant: 'primary'
                            }
                        ]}
                    />

                    {/* ========================================== */}
                    {/* LEAVE STATISTICS */}
                    {/* ========================================== */}
                    <div className="mt-6">
                        <h3 className="mb-4 text-lg font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                            <CalendarDays className="h-5 w-5 text-blue-600" />
                            Leave Management
                        </h3>
                        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
                            <StatCard
                                title="Total Employees"
                                value={leaveStats.total_employees}
                                color="bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400"
                                icon={<Users className="h-5 w-5" />}
                                loading={loading}
                            />
                            <StatCard
                                title="On Leave Today"
                                value={leaveStats.on_leave_today}
                                color="bg-yellow-100 text-yellow-600 dark:bg-yellow-900/30 dark:text-yellow-400"
                                icon={<UserX className="h-5 w-5" />}
                                subtitle={`${leaveStats.on_leave_this_week} this week`}
                                loading={loading}
                            />
                            <StatCard
                                title="Pending Approvals"
                                value={leaveStats.pending_approvals}
                                color="bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400"
                                icon={<Clock className="h-5 w-5" />}
                                loading={loading}
                            />
                            <StatCard
                                title="Approved (Month)"
                                value={leaveStats.approved_this_month}
                                color="bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400"
                                icon={<CheckCircle className="h-5 w-5" />}
                                loading={loading}
                            />
                            <StatCard
                                title="Rejected (Month)"
                                value={leaveStats.rejected_this_month}
                                color="bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400"
                                icon={<XCircle className="h-5 w-5" />}
                                loading={loading}
                            />
                            <StatCard
                                title="Avg Leave Balance"
                                value={`${leaveStats.leave_balance_avg}d`}
                                color="bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400"
                                icon={<Briefcase className="h-5 w-5" />}
                                loading={loading}
                            />
                        </div>
                    </div>

                    {/* ========================================== */}
                    {/* ATTENDANCE & REPORTING TIME */}
                    {/* ========================================== */}
                    <div className="mt-8">
                        <h3 className="mb-4 text-lg font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                            <Clock className="h-5 w-5 text-green-600" />
                            Attendance & Reporting Time
                        </h3>
                        <div className="grid grid-cols-2 gap-4 md:grid-cols-4 lg:grid-cols-6">
                            <StatCard
                                title="Checked In Today"
                                value={attendanceStats.checked_in_today}
                                color="bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400"
                                icon={<LogIn className="h-5 w-5" />}
                                loading={loading}
                            />
                            <StatCard
                                title="Checked Out"
                                value={attendanceStats.checked_out_today}
                                color="bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400"
                                icon={<LogOut className="h-5 w-5" />}
                                loading={loading}
                            />
                            <StatCard
                                title="Late Arrivals"
                                value={attendanceStats.late_arrivals}
                                color="bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400"
                                icon={<Timer className="h-5 w-5" />}
                                loading={loading}
                            />
                            <StatCard
                                title="Absent Today"
                                value={attendanceStats.absent_today}
                                color="bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300"
                                icon={<UserX className="h-5 w-5" />}
                                loading={loading}
                            />
                            <StatCard
                                title="On-Time Rate"
                                value={`${attendanceStats.on_time_percentage}%`}
                                color="bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400"
                                icon={<CheckCircle className="h-5 w-5" />}
                                loading={loading}
                            />
                            <StatCard
                                title="Avg Arrival"
                                value={formatTime(attendanceStats.average_arrival_time)}
                                color="bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400"
                                icon={<Clock className="h-5 w-5" />}
                                loading={loading}
                            />
                        </div>
                    </div>

                    {/* ========================================== */}
                    {/* LOGBOOK & SYSTEM ACTIVITY */}
                    {/* ========================================== */}
                    <div className="mt-8">
                        <h3 className="mb-4 text-lg font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                            <Activity className="h-5 w-5 text-purple-600" />
                            Logbook & System Activity
                        </h3>
                        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
                            <StatCard
                                title="Total Logs Today"
                                value={logbookStats.total_logs_today}
                                color="bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400"
                                icon={<FileText className="h-5 w-5" />}
                                loading={loading}
                            />
                            <StatCard
                                title="Active Users"
                                value={logbookStats.active_users_today}
                                color="bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400"
                                icon={<UserCheck className="h-5 w-5" />}
                                loading={loading}
                            />
                            <StatCard
                                title="System Errors"
                                value={logbookStats.system_errors_today}
                                color="bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400"
                                icon={<AlertCircle className="h-5 w-5" />}
                                loading={loading}
                            />
                            <StatCard
                                title="Warnings"
                                value={logbookStats.warnings_today}
                                color="bg-yellow-100 text-yellow-600 dark:bg-yellow-900/30 dark:text-yellow-400"
                                icon={<AlertTriangle className="h-5 w-5" />}
                                loading={loading}
                            />
                            <StatCard
                                title="Successful Ops"
                                value={logbookStats.successful_operations}
                                color="bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400"
                                icon={<CheckCircle className="h-5 w-5" />}
                                loading={loading}
                            />
                            <StatCard
                                title="Peak Hour"
                                value={logbookStats.peak_activity_hour}
                                color="bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400"
                                icon={<Clock className="h-5 w-5" />}
                                loading={loading}
                            />
                        </div>
                    </div>

                    {/* ========================================== */}
                    {/* REPORTING TIME STATISTICS */}
                    {/* ========================================== */}
                    <div className="mt-8">
                        <h3 className="mb-4 text-lg font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                            <BarChart3 className="h-5 w-5 text-indigo-600" />
                            Reporting Time & Compliance
                        </h3>
                        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
                            <StatCard
                                title="On-Time Reports"
                                value={reportingStats.on_time_reports}
                                color="bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400"
                                icon={<CheckCircle className="h-5 w-5" />}
                                loading={loading}
                            />
                            <StatCard
                                title="Late Reports"
                                value={reportingStats.late_reports}
                                color="bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400"
                                icon={<AlertCircle className="h-5 w-5" />}
                                loading={loading}
                            />
                            <StatCard
                                title="Pending Reports"
                                value={reportingStats.pending_reports}
                                color="bg-yellow-100 text-yellow-600 dark:bg-yellow-900/30 dark:text-yellow-400"
                                icon={<Clock className="h-5 w-5" />}
                                loading={loading}
                            />
                            <StatCard
                                title="Submitted"
                                value={reportingStats.submitted_reports}
                                color="bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400"
                                icon={<FileText className="h-5 w-5" />}
                                loading={loading}
                            />
                            <StatCard
                                title="Avg Submission"
                                value={formatTime(reportingStats.average_submission_time)}
                                color="bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400"
                                icon={<Clock className="h-5 w-5" />}
                                loading={loading}
                            />
                            <StatCard
                                title="Compliance Rate"
                                value={`${reportingStats.compliance_rate}%`}
                                color="bg-teal-100 text-teal-600 dark:bg-teal-900/30 dark:text-teal-400"
                                icon={<TrendingUp className="h-5 w-5" />}
                                loading={loading}
                            />
                        </div>
                    </div>

                    {/* ========================================== */}
                    {/* CHARTS SECTION */}
                    {/* ========================================== */}
                    <div className="mt-8 grid gap-6 lg:grid-cols-2">
                        {/* Daily Activity Chart */}
                        <Card className="border-slate-200 dark:border-slate-700">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Activity className="h-5 w-5 text-blue-600" />
                                    Daily Activity Pattern
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="h-64">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <LineChart data={dailyActivity}>
                                            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                                            <XAxis dataKey="hour" stroke="#6b7280" />
                                            <YAxis stroke="#6b7280" />
                                            <Tooltip />
                                            <Legend />
                                            <Line 
                                                type="monotone" 
                                                dataKey="logins" 
                                                stroke="#3B82F6" 
                                                strokeWidth={2}
                                                dot={{ fill: '#3B82F6' }}
                                            />
                                            <Line 
                                                type="monotone" 
                                                dataKey="actions" 
                                                stroke="#10B981" 
                                                strokeWidth={2}
                                                dot={{ fill: '#10B981' }}
                                            />
                                            <Line 
                                                type="monotone" 
                                                dataKey="errors" 
                                                stroke="#EF4444" 
                                                strokeWidth={2}
                                                dot={{ fill: '#EF4444' }}
                                            />
                                        </LineChart>
                                    </ResponsiveContainer>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Department Statistics Chart */}
                        <Card className="border-slate-200 dark:border-slate-700">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Users className="h-5 w-5 text-purple-600" />
                                    Department Overview
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="h-64">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={departmentStats}>
                                            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                                            <XAxis dataKey="name" stroke="#6b7280" fontSize={10} />
                                            <YAxis stroke="#6b7280" />
                                            <Tooltip />
                                            <Legend />
                                            <Bar dataKey="employees" fill="#3B82F6" name="Total" />
                                            <Bar dataKey="present" fill="#10B981" name="Present" />
                                            <Bar dataKey="on_leave" fill="#F59E0B" name="On Leave" />
                                            <Bar dataKey="late" fill="#EF4444" name="Late" />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* ========================================== */}
                    {/* RECENT LEAVES & LOGS */}
                    {/* ========================================== */}
                    <div className="mt-8 grid gap-6 lg:grid-cols-2">
                        {/* Recent Leave Applications */}
                        <Card className="border-slate-200 dark:border-slate-700">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <CalendarDays className="h-5 w-5 text-blue-600" />
                                    Recent Leave Applications
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                {recentLeaves.length === 0 ? (
                                    <p className="text-center text-slate-500 dark:text-slate-400">
                                        No recent leave applications
                                    </p>
                                ) : (
                                    <div className="space-y-3">
                                        {recentLeaves.slice(0, 5).map((leave) => (
                                            <div key={leave.id} className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-700">
                                                <div>
                                                    <p className="font-medium text-slate-800 dark:text-slate-200">
                                                        {leave.employee}
                                                    </p>
                                                    <p className="text-sm text-slate-500 dark:text-slate-400">
                                                        {leave.type} • {formatDate(leave.start)} - {formatDate(leave.end)}
                                                    </p>
                                                </div>
                                                <span className={`rounded-full px-2 py-1 text-xs font-medium ${getStatusColor(leave.status)}`}>
                                                    {leave.status}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        {/* Recent Logbook Activity */}
                        <Card className="border-slate-200 dark:border-slate-700">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <FileText className="h-5 w-5 text-purple-600" />
                                    Recent Logbook Activity
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                {recentLogs.length === 0 ? (
                                    <p className="text-center text-slate-500 dark:text-slate-400">
                                        No recent log activity
                                    </p>
                                ) : (
                                    <div className="space-y-3">
                                        {recentLogs.slice(0, 5).map((log) => (
                                            <div key={log.id} className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-700">
                                                <div className="flex items-center gap-3">
                                                    <User className="h-4 w-4 text-slate-400" />
                                                    <div>
                                                        <p className="font-medium text-slate-800 dark:text-slate-200">
                                                            {log.user}
                                                        </p>
                                                        <p className="text-sm text-slate-500 dark:text-slate-400">
                                                            {log.action}
                                                        </p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-sm text-slate-500 dark:text-slate-400">
                                                        {log.time}
                                                    </span>
                                                    <span className={`${log.status === 'success' ? 'text-green-500' : log.status === 'error' ? 'text-red-500' : 'text-yellow-500'}`}>
                                                        {getStatusIcon(log.status)}
                                                    </span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>

                    {/* ========================================== */}
                    {/* SUMMARY FOOTER */}
                    {/* ========================================== */}
                    <div className="mt-8 rounded-lg bg-gradient-to-r from-blue-600 to-purple-600 p-6 text-white">
                        <div className="grid gap-4 md:grid-cols-4">
                            <div>
                                <p className="text-sm opacity-80">Total Employees</p>
                                <p className="text-2xl font-bold">{leaveStats.total_employees}</p>
                            </div>
                            <div>
                                <p className="text-sm opacity-80">Attendance Rate</p>
                                <p className="text-2xl font-bold">{attendanceStats.on_time_percentage}%</p>
                            </div>
                            <div>
                                <p className="text-sm opacity-80">System Uptime</p>
                                <p className="text-2xl font-bold">99.8%</p>
                            </div>
                            <div>
                                <p className="text-sm opacity-80">Compliance Rate</p>
                                <p className="text-2xl font-bold">{reportingStats.compliance_rate}%</p>
                            </div>
                        </div>
                    </div>
                </Container>
            </div>
        </AppLayout>
    );
}