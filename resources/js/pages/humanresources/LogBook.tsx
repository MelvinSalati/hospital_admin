import React, { useState, useEffect } from 'react';
import { Head, usePage } from '@inertiajs/react';
import AppLayout from "@/layouts/app-layout";
import Container from '@/components/Container';
import PageHeader from '@/components/PageHeader';
import { 
    Plus, 
    Eye, 
    Edit, 
    Trash2, 
    Download, 
    Printer, 
    RefreshCw,
    Search,
    Filter,
    Clock,
    CheckCircle,
    XCircle,
    AlertTriangle,
    FileText,
    User,
    Calendar,
    Activity
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ReusableTable, Column, Action } from '@/components/ReusableTable';
import { toast } from 'react-hot-toast';
import Http from '@/utils/Http';

// ============================================
// TYPES
// ============================================

interface LogEntry {
    id: number;
    user_id: number;
    user_name: string;
    action: string;
    module: string;
    description: string;
    ip_address: string;
    user_agent: string;
    status: 'success' | 'error' | 'warning' | 'info';
    created_at: string;
    updated_at: string;
}

// ============================================
// STATUS CONFIG
// ============================================

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
    success: {
        label: 'Success',
        color: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
        icon: <CheckCircle className="h-3 w-3" />,
    },
    error: {
        label: 'Error',
        color: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
        icon: <XCircle className="h-3 w-3" />,
    },
    warning: {
        label: 'Warning',
        color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
        icon: <AlertTriangle className="h-3 w-3" />,
    },
    info: {
        label: 'Info',
        color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
        icon: <Activity className="h-3 w-3" />,
    },
};

// ============================================
// MAIN COMPONENT
// ============================================

export default function Logbook() {
    const { props } = usePage();
    const [loading, setLoading] = useState(false);
    const [logs, setLogs] = useState<LogEntry[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<string>('');
    const [pagination, setPagination] = useState({
        currentPage: 1,
        pageSize: 10,
        totalItems: 0,
        totalPages: 1,
    });

    const { auth } = props;
    const userRole = auth?.user?.is_admin ? 'admin' : 'staff';

    // Stats
    const [stats, setStats] = useState({
        total: 0,
        success: 0,
        error: 0,
        warning: 0,
        info: 0,
        today: 0,
    });

    // ============================================
    // HELPER FUNCTIONS
    // ============================================

    const formatDate = (date: string) => {
        if (!date) return 'N/A';
        return new Date(date).toLocaleDateString('en-ZM', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    const formatTimeAgo = (date: string) => {
        const diff = Date.now() - new Date(date).getTime();
        const minutes = Math.floor(diff / 60000);
        const hours = Math.floor(diff / 3600000);
        const days = Math.floor(diff / 86400000);

        if (minutes < 1) return 'Just now';
        if (minutes < 60) return `${minutes}m ago`;
        if (hours < 24) return `${hours}h ago`;
        return `${days}d ago`;
    };

    // ============================================
    // FETCH LOGS
    // ============================================

    const fetchLogs = async () => {
        setLoading(true);
        try {
            const params = {
                page: pagination.currentPage,
                page_size: pagination.pageSize,
                search: searchTerm,
                status: statusFilter || '',
            };

            // Remove empty params
            Object.keys(params).forEach((key) => {
                if (params[key as keyof typeof params] === '') {
                    delete params[key as keyof typeof params];
                }
            });

            const response = await Http.get('/logbook', { params });
            const data = response.data;

            setLogs(data.data || []);
            
            if (data.stats) {
                setStats(data.stats);
            } else {
                // Calculate stats from data
                const allLogs = data.data || [];
                setStats({
                    total: allLogs.length,
                    success: allLogs.filter((l: any) => l.status === 'success').length,
                    error: allLogs.filter((l: any) => l.status === 'error').length,
                    warning: allLogs.filter((l: any) => l.status === 'warning').length,
                    info: allLogs.filter((l: any) => l.status === 'info').length,
                    today: allLogs.filter((l: any) => {
                        const today = new Date().toDateString();
                        return new Date(l.created_at).toDateString() === today;
                    }).length,
                });
            }

            setPagination((prev) => ({
                ...prev,
                totalItems: data.total || allLogs.length,
                totalPages: data.last_page || 1,
            }));
        } catch (error) {
            console.error('Failed to fetch logs:', error);
            toast.error('Failed to load log entries');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchLogs();
    }, [pagination.currentPage, pagination.pageSize, searchTerm, statusFilter]);

    // ============================================
    // HANDLERS
    // ============================================

    const handleRefresh = () => {
        fetchLogs();
        toast.success('Logbook refreshed');
    };

    const handleExport = () => {
        toast.success('Exporting logs...');
        // Implement export logic
    };

    const handlePrint = () => {
        window.print();
    };

    const handleClearLogs = () => {
        if (!confirm('Are you sure you want to clear all logs? This action cannot be undone.')) return;
        // Implement clear logs logic
        toast.success('Logs cleared');
    };

    const handleViewLog = (log: LogEntry) => {
        // Navigate to log detail or open modal
        toast.info(`Viewing log #${log.id}`);
    };

    // ============================================
    // STATS CARDS
    // ============================================

    const StatCard = ({ title, value, color, icon, subtitle }: any) => (
        <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800">
            <div className="flex items-center justify-between">
                <div>
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                        {title}
                    </p>
                    <p className="text-2xl font-bold text-slate-800 dark:text-slate-200">
                        {value}
                    </p>
                    {subtitle && (
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                            {subtitle}
                        </p>
                    )}
                </div>
                <div className={`rounded-full p-2 ${color}`}>{icon}</div>
            </div>
        </div>
    );

    // ============================================
    // TABLE DEFINITIONS
    // ============================================

    const columns: Column<LogEntry>[] = [
        {
            id: 'id',
            label: 'ID',
            minWidth: 60,
            format: (value) => (
                <span className="font-mono text-xs text-slate-500 dark:text-slate-400">
                    #{value}
                </span>
            ),
            sortable: true,
        },
        {
            id: 'user_name',
            label: 'User',
            minWidth: 130,
            format: (value, row) => (
                <div>
                    <div className="flex items-center gap-2 text-sm font-medium text-slate-800 dark:text-slate-200">
                        <User className="h-4 w-4 text-slate-400" />
                        {row.user_name || 'System'}
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">
                        ID: {row.user_id}
                    </div>
                </div>
            ),
            sortable: true,
        },
        {
            id: 'module',
            label: 'Module',
            minWidth: 120,
            format: (value) => (
                <span className="inline-flex items-center rounded-full bg-blue-100 px-2.5 py-1 text-xs font-medium text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">
                    {value}
                </span>
            ),
            sortable: true,
        },
        {
            id: 'action',
            label: 'Action',
            minWidth: 150,
            format: (value) => (
                <span className="font-medium text-slate-700 dark:text-slate-300">
                    {value}
                </span>
            ),
            sortable: true,
        },
        {
            id: 'description',
            label: 'Description',
            minWidth: 200,
            format: (value) => (
                <span className="text-sm text-slate-600 dark:text-slate-400">
                    {value}
                </span>
            ),
        },
        {
            id: 'status',
            label: 'Status',
            minWidth: 100,
            filterType: 'status',
            statusColors: {
                success: 'success',
                error: 'error',
                warning: 'warning',
                info: 'info',
            },
            format: (value) => {
                const config = STATUS_CONFIG[value] || STATUS_CONFIG.info;
                return (
                    <span
                        className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${config.color}`}
                    >
                        {config.icon}
                        {config.label}
                    </span>
                );
            },
            sortable: true,
        },
        {
            id: 'ip_address',
            label: 'IP Address',
            minWidth: 120,
            format: (value) => (
                <span className="font-mono text-xs text-slate-500 dark:text-slate-400">
                    {value || 'N/A'}
                </span>
            ),
        },
        {
            id: 'created_at',
            label: 'Timestamp',
            minWidth: 160,
            format: (value, row) => (
                <div>
                    <div className="text-sm text-slate-700 dark:text-slate-300">
                        {formatDate(value)}
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">
                        {formatTimeAgo(value)}
                    </div>
                </div>
            ),
            sortable: true,
        },
    ];

    const actions: Action<LogEntry>[] = [
        {
            label: 'View',
            icon: <Eye className="h-4 w-4" />,
            color: 'primary',
            onClick: handleViewLog,
        },
    ];

    // Status options for filtering
    const statusOptions = Object.entries(STATUS_CONFIG).map(([key, value]) => ({
        value: key,
        label: value.label,
    }));

    // ============================================
    // RENDER
    // ============================================

    return (
        <AppLayout
            breadcrumbs={[
                { title: 'Home', href: '/' },
                { title: 'Logbook', href: '' },
            ]}
        >
            <Head title="Logbook" />
            
            <div className="min-h-screen bg-slate-100 px-4 py-6 dark:bg-slate-900">
                <Container>
                    {/* Header */}
                    <PageHeader
                        title="System Logbook"
                        subtitle="Monitor and track all system activities and events"
                        actions={[
                            {
                                label: 'Refresh',
                                icon: <RefreshCw className="h-4 w-4" />,
                                onClick: handleRefresh,
                                variant: 'outline',
                                loading: loading,
                            },
                            {
                                label: 'Export',
                                icon: <Download className="h-4 w-4" />,
                                onClick: handleExport,
                                variant: 'outline',
                            },
                            {
                                label: 'Print',
                                icon: <Printer className="h-4 w-4" />,
                                onClick: handlePrint,
                                variant: 'outline',
                            },
                            ...(userRole === 'admin' ? [{
                                label: 'Clear Logs',
                                icon: <Trash2 className="h-4 w-4" />,
                                onClick: handleClearLogs,
                                variant: 'danger' as const,
                            }] : []),
                        ]}
                    />

                    {/* Stats Cards */}
                    <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
                        <StatCard
                            title="Total"
                            value={stats.total}
                            color="bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300"
                            icon={<FileText className="h-5 w-5" />}
                        />
                        <StatCard
                            title="Success"
                            value={stats.success}
                            color="bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400"
                            icon={<CheckCircle className="h-5 w-5" />}
                        />
                        <StatCard
                            title="Errors"
                            value={stats.error}
                            color="bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400"
                            icon={<XCircle className="h-5 w-5" />}
                        />
                        <StatCard
                            title="Warnings"
                            value={stats.warning}
                            color="bg-yellow-100 text-yellow-600 dark:bg-yellow-900/30 dark:text-yellow-400"
                            icon={<AlertTriangle className="h-5 w-5" />}
                        />
                        <StatCard
                            title="Info"
                            value={stats.info}
                            color="bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400"
                            icon={<Activity className="h-5 w-5" />}
                        />
                        <StatCard
                            title="Today"
                            value={stats.today}
                            color="bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400"
                            icon={<Calendar className="h-5 w-5" />}
                        />
                    </div>

                    {/* Table */}
                    <div className="mt-6">
                        <ReusableTable
                            columns={columns}
                            data={logs}
                            actions={actions}
                            loading={loading}
                            title="Log Entries"
                            rowsPerPageOptions={[10, 25, 50, 100]}
                            defaultRowsPerPage={10}
                            defaultOrderBy="created_at"
                            defaultOrder="desc"
                            filterPlaceholder="Search by user, action, module, or description..."
                            statusFilterKey="status"
                            statusOptions={statusOptions}
                            emptyMessage="No log entries found"
                            onSearchChange={(value) => {
                                setSearchTerm(value);
                                setPagination((prev) => ({
                                    ...prev,
                                    currentPage: 1,
                                }));
                            }}
                            onPageChange={(page) => {
                                setPagination((prev) => ({
                                    ...prev,
                                    currentPage: page,
                                }));
                            }}
                            onPageSizeChange={(size) => {
                                setPagination((prev) => ({
                                    ...prev,
                                    pageSize: size,
                                    currentPage: 1,
                                }));
                            }}
                            pagination={{
                                currentPage: pagination.currentPage,
                                pageSize: pagination.pageSize,
                                totalItems: pagination.totalItems,
                                totalPages: pagination.totalPages,
                            }}
                        />
                    </div>
                </Container>
            </div>
        </AppLayout>
    );
}