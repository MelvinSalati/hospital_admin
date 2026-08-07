import { Head, usePage } from '@inertiajs/react';
import { 
    Plus, 
    Eye, 
    Edit, 
    Trash2, 
    Download, 
    Printer, 
    RefreshCw,
    CheckCircle,
    XCircle,
    Clock,
    AlertTriangle,
    FileText,
    User,
    Calendar,
    Users,
    Filter,
    Search,
    ChevronDown,
    MoreVertical,
    UserCheck,
    UserX,
    Briefcase,
    CalendarDays,
    MessageSquare,
    Check,
    X,
    Heart
} from 'lucide-react';
import React, { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-hot-toast';
import Container from '@/components/container';
import PageHeader from '@/components/PageHeader';
import { ReusableTable } from '@/components/ReusableTable';
import type { Column, Action } from '@/components/ReusableTable';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import AppLayout from "@/layouts/app-layout";
import Http from '@/utils/Http';

// ============================================
// TYPES
// ============================================

interface LeaveApplication {
    id: number;
    employee_id: number;
    employee_name: string;
    employee_department: string;
    employee_position: string;
    leave_type: 'annual' | 'sick' | 'maternity' | 'paternity' | 'study' | 'compassionate' | 'other';
    start_date: string;
    end_date: string;
    total_days: number;
    reason: string;
    status: 'pending' | 'approved' | 'rejected' | 'cancelled';
    approved_by?: number;
    approved_by_name?: string;
    approved_at?: string;
    rejection_reason?: string;
    created_at: string;
    updated_at: string;
    attachments?: string[];
    contact_number?: string;
    alternative_email?: string;
    is_paid?: boolean;
    leave_balance_used?: number;
}

// ============================================
// LEAVE TYPE CONFIG
// ============================================

const LEAVE_TYPE_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
    annual: {
        label: 'Annual',
        color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
        icon: <Briefcase className="h-3 w-3" />,
    },
    sick: {
        label: 'Sick',
        color: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
        icon: <AlertTriangle className="h-3 w-3" />,
    },
    maternity: {
        label: 'Maternity',
        color: 'bg-pink-100 text-pink-800 dark:bg-pink-900/30 dark:text-pink-400',
        icon: <Users className="h-3 w-3" />,
    },
    paternity: {
        label: 'Paternity',
        color: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
        icon: <Users className="h-3 w-3" />,
    },
    study: {
        label: 'Study',
        color: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
        icon: <FileText className="h-3 w-3" />,
    },
    compassionate: {
        label: 'Compassionate',
        color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
        icon: <Heart className="h-3 w-3" />,
    },
    other: {
        label: 'Other',
        color: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
        icon: <Clock className="h-3 w-3" />,
    },
};

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
    pending: {
        label: 'Pending',
        color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
        icon: <Clock className="h-3 w-3" />,
    },
    approved: {
        label: 'Approved',
        color: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
        icon: <CheckCircle className="h-3 w-3" />,
    },
    rejected: {
        label: 'Rejected',
        color: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
        icon: <XCircle className="h-3 w-3" />,
    },
    cancelled: {
        label: 'Cancelled',
        color: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
        icon: <XCircle className="h-3 w-3" />,
    },
};

// ============================================
// MAIN COMPONENT
// ============================================

export default function LeaveManagement() {
    const { props } = usePage();
    const [loading, setLoading] = useState(false);
    const [leaves, setLeaves] = useState<LeaveApplication[]>([]);
    const [selectedLeave, setSelectedLeave] = useState<LeaveApplication | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<string>('');
    const [leaveTypeFilter, setLeaveTypeFilter] = useState<string>('');
    const [pagination, setPagination] = useState({
        currentPage: 1,
        pageSize: 10,
        totalItems: 0,
        totalPages: 1,
    });

    // Modal states
    const [showDetailModal, setShowDetailModal] = useState(false);
    const [showApprovalModal, setShowApprovalModal] = useState(false);
    const [showRejectionModal, setShowRejectionModal] = useState(false);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [rejectionReason, setRejectionReason] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);
    const [activeTab, setActiveTab] = useState<string>('all');

    // Create form state
    const [createForm, setCreateForm] = useState({
        leave_type: 'annual',
        start_date: '',
        end_date: '',
        reason: '',
        contact_number: '',
        alternative_email: '',
        is_paid: true,
    });

    const { auth } = usePage().props;
    const userRole = auth?.user?.is_admin ? 'admin' : auth?.user?.is_supervisor ? 'supervisor' : 'staff';
    const isManager = userRole === 'admin' || userRole === 'supervisor';

    // Stats
    const [stats, setStats] = useState({
        total: 0,
        pending: 0,
        approved: 0,
        rejected: 0,
        cancelled: 0,
        totalDays: 0,
        pendingDays: 0,
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
        });
    };

    const formatDateTime = (date: string) => {
        if (!date) return 'N/A';
        return new Date(date).toLocaleDateString('en-ZM', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    const calculateDays = (start: string, end: string) => {
        if (!start || !end) return 0;
        const startDate = new Date(start);
        const endDate = new Date(end);
        const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
        return diffDays;
    };

    // ============================================
    // FETCH LEAVE APPLICATIONS
    // ============================================

    const fetchLeaveApplications = useCallback(async () => {
        setLoading(true);
        try {
            const params: any = {
                page: pagination.currentPage,
                page_size: pagination.pageSize,
            };

            if (searchTerm) params.search = searchTerm;
            if (statusFilter) params.status = statusFilter;
            if (activeTab !== 'all') params.status = activeTab;
            if (leaveTypeFilter) params.leave_type = leaveTypeFilter;

            const response = await Http.get('/humanresources/leave', { params });
            const data = response.data;

            setLeaves(data.data || []);
            
            if (data.stats) {
                setStats(data.stats);
            } else {
                const allLeaves = data.data || [];
                setStats({
                    total: allLeaves.length,
                    pending: allLeaves.filter((l: any) => l.status === 'pending').length,
                    approved: allLeaves.filter((l: any) => l.status === 'approved').length,
                    rejected: allLeaves.filter((l: any) => l.status === 'rejected').length,
                    cancelled: allLeaves.filter((l: any) => l.status === 'cancelled').length,
                    totalDays: allLeaves.reduce((sum: number, l: any) => sum + (l.total_days || 0), 0),
                    pendingDays: allLeaves.filter((l: any) => l.status === 'pending')
                        .reduce((sum: number, l: any) => sum + (l.total_days || 0), 0),
                });
            }

            setPagination((prev) => ({
                ...prev,
                totalItems: data.total || data.data?.length || 0,
                totalPages: data.last_page || 1,
            }));
        } catch (error) {
            console.error('Failed to fetch leave applications:', error);
            toast.error('Failed to load leave applications');
        } finally {
            setLoading(false);
        }
    }, [pagination.currentPage, pagination.pageSize, searchTerm, statusFilter, leaveTypeFilter, activeTab]);

    useEffect(() => {
        fetchLeaveApplications();
    }, [fetchLeaveApplications]);

    // ============================================
    // HANDLERS
    // ============================================

    const handleTabChange = (tab: string) => {
        setActiveTab(tab);
        setStatusFilter('');
        setLeaveTypeFilter('');
        setPagination((prev) => ({ ...prev, currentPage: 1 }));
    };

    const handleView = (leave: LeaveApplication) => {
        setSelectedLeave(leave);
        setShowDetailModal(true);
    };

    const handleApprove = (leave: LeaveApplication) => {
        setSelectedLeave(leave);
        setShowApprovalModal(true);
    };

    const handleReject = (leave: LeaveApplication) => {
        setSelectedLeave(leave);
        setRejectionReason('');
        setShowRejectionModal(true);
    };

    const handleConfirmApproval = async () => {
        if (!selectedLeave) return;
        setIsProcessing(true);
        try {
            const response = await Http.post(`/humanresources/leave/${selectedLeave.id}/approve`, {
                approved_by: auth.user.id,
                approved_by_name: auth.user.name,
            });

            if (response.data.success) {
                toast.success('Leave application approved successfully');
                await fetchLeaveApplications();
                setShowApprovalModal(false);
                setSelectedLeave(null);
            } else {
                throw new Error(response.data.message || 'Approval failed');
            }
        } catch (error: any) {
            console.error('Approval failed:', error);
            toast.error(error.response?.data?.message || 'Failed to approve leave');
        } finally {
            setIsProcessing(false);
        }
    };

    const handleConfirmRejection = async () => {
        if (!selectedLeave) return;
        if (!rejectionReason.trim()) {
            toast.error('Please provide a reason for rejection');
            return;
        }
        setIsProcessing(true);
        try {
            const response = await Http.post(`/humanresources/leave/${selectedLeave.id}/reject`, {
                rejection_reason: rejectionReason,
                rejected_by: auth.user.id,
                rejected_by_name: auth.user.name,
            });

            if (response.data.success) {
                toast.success('Leave application rejected');
                await fetchLeaveApplications();
                setShowRejectionModal(false);
                setSelectedLeave(null);
                setRejectionReason('');
            } else {
                throw new Error(response.data.message || 'Rejection failed');
            }
        } catch (error: any) {
            console.error('Rejection failed:', error);
            toast.error(error.response?.data?.message || 'Failed to reject leave');
        } finally {
            setIsProcessing(false);
        }
    };

    const handleCancel = async (id: number) => {
        if (!confirm('Are you sure you want to cancel this leave application?')) return;
        try {
            const response = await Http.post(`/humanresources/leave/${id}/cancel`);
            if (response.data.success) {
                toast.success('Leave application cancelled');
                await fetchLeaveApplications();
            }
        } catch (error) {
            console.error('Cancel failed:', error);
            toast.error('Failed to cancel leave');
        }
    };

    const handleDelete = async (id: number) => {
        if (!confirm('Are you sure you want to delete this leave application? This action cannot be undone.')) return;
        try {
            const response = await Http.delete(`/humanresources/leave/${id}`);
            if (response.data.success) {
                toast.success('Leave application deleted');
                await fetchLeaveApplications();
            }
        } catch (error) {
            console.error('Delete failed:', error);
            toast.error('Failed to delete leave');
        }
    };

    const handleCreate = () => {
        setCreateForm({
            leave_type: 'annual',
            start_date: '',
            end_date: '',
            reason: '',
            contact_number: '',
            alternative_email: '',
            is_paid: true,
        });
        setShowCreateModal(true);
    };

    const handleCreateSubmit = async () => {
        // Validate form
        if (!createForm.start_date || !createForm.end_date) {
            toast.error('Please select start and end dates');
            return;
        }
        if (!createForm.reason.trim()) {
            toast.error('Please provide a reason for leave');
            return;
        }

        const totalDays = calculateDays(createForm.start_date, createForm.end_date);
        if (totalDays <= 0) {
            toast.error('Invalid date range');
            return;
        }

        setIsProcessing(true);
        try {
            const response = await Http.post('/humanresources/leave', {
                ...createForm,
                total_days: totalDays,
                employee_id: auth.user.id,
                employee_name: auth.user.name,
                employee_department: auth.user.department || '',
                employee_position: auth.user.position || '',
            });

            if (response.data.success) {
                toast.success('Leave application submitted successfully');
                setShowCreateModal(false);
                await fetchLeaveApplications();
                setCreateForm({
                    leave_type: 'annual',
                    start_date: '',
                    end_date: '',
                    reason: '',
                    contact_number: '',
                    alternative_email: '',
                    is_paid: true,
                });
            } else {
                throw new Error(response.data.message || 'Submission failed');
            }
        } catch (error: any) {
            console.error('Create failed:', error);
            toast.error(error.response?.data?.message || 'Failed to submit leave application');
        } finally {
            setIsProcessing(false);
        }
    };

    const handleExport = () => {
        toast.success('Exporting leave applications...');
        // Implement export logic
    };

    const handleRefresh = () => {
        fetchLeaveApplications();
        toast.success('Leave applications refreshed');
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

    const columns: Column<LeaveApplication>[] = [
        {
            id: 'employee_name',
            label: 'Employee',
            minWidth: 150,
            format: (value, row) => (
                <div>
                    <div className="flex items-center gap-2 text-sm font-medium text-slate-800 dark:text-slate-200">
                        <User className="h-4 w-4 text-slate-400" />
                        {row.employee_name}
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">
                        {row.employee_position} • {row.employee_department}
                    </div>
                </div>
            ),
            sortable: true,
        },
        {
            id: 'leave_type',
            label: 'Leave Type',
            minWidth: 120,
            format: (value) => {
                const config = LEAVE_TYPE_CONFIG[value] || LEAVE_TYPE_CONFIG.other;
                return (
                    <span
                        className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${config.color}`}
                    >
                        {config.icon}
                        {config.label}
                    </span>
                );
            },
            filterType: 'select',
            sortable: true,
        },
        {
            id: 'start_date',
            label: 'Date Range',
            minWidth: 150,
            format: (value, row) => (
                <div>
                    <div className="flex items-center gap-1 text-sm text-slate-700 dark:text-slate-300">
                        <Calendar className="h-3 w-3 text-slate-400" />
                        {formatDate(row.start_date)}
                    </div>
                    <div className="flex items-center gap-1 text-sm text-slate-700 dark:text-slate-300">
                        <Calendar className="h-3 w-3 text-slate-400" />
                        {formatDate(row.end_date)}
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">
                        {row.total_days} days
                    </div>
                </div>
            ),
        },
        {
            id: 'status',
            label: 'Status',
            minWidth: 100,
            filterType: 'status',
            statusColors: {
                pending: 'warning',
                approved: 'success',
                rejected: 'error',
                cancelled: 'default',
            },
            format: (value) => {
                const config = STATUS_CONFIG[value] || STATUS_CONFIG.pending;
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
            id: 'reason',
            label: 'Reason',
            minWidth: 150,
            format: (value) => (
                <span className="text-sm text-slate-600 dark:text-slate-400">
                    {value?.length > 50 ? `${value.substring(0, 50)}...` : value || 'N/A'}
                </span>
            ),
        },
        {
            id: 'created_at',
            label: 'Applied On',
            minWidth: 120,
            format: (value) => (
                <div>
                    <div className="text-sm text-slate-700 dark:text-slate-300">
                        {formatDate(value)}
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">
                        {formatDateTime(value)}
                    </div>
                </div>
            ),
            sortable: true,
        },
    ];

    const actions: Action<LeaveApplication>[] = [
        {
            label: 'View',
            icon: <Eye className="h-4 w-4" />,
            color: 'primary',
            onClick: handleView,
        },
        {
            label: 'Approve',
            icon: <CheckCircle className="h-4 w-4" />,
            color: 'success',
            onClick: (row) => handleApprove(row),
            show: (row) => row.status === 'pending' && isManager,
        },
        {
            label: 'Reject',
            icon: <XCircle className="h-4 w-4" />,
            color: 'error',
            onClick: (row) => handleReject(row),
            show: (row) => row.status === 'pending' && isManager,
        },
        {
            label: 'Cancel',
            icon: <XCircle className="h-4 w-4" />,
            color: 'warning',
            onClick: (row) => handleCancel(row.id),
            show: (row) => row.status === 'pending' || row.status === 'approved',
        },
        {
            label: 'Delete',
            icon: <Trash2 className="h-4 w-4" />,
            color: 'error',
            onClick: (row) => handleDelete(row.id),
            show: (row) => row.status === 'pending' || row.status === 'cancelled',
        },
    ];

    // Status options for filtering
    const statusOptions = Object.entries(STATUS_CONFIG).map(([key, value]) => ({
        value: key,
        label: value.label,
    }));

    const leaveTypeOptions = Object.entries(LEAVE_TYPE_CONFIG).map(([key, value]) => ({
        value: key,
        label: value.label,
    }));

    // Tabs
    const tabs = [
        { key: 'all', label: 'All', count: stats.total, icon: <FileText className="h-4 w-4" /> },
        { key: 'pending', label: 'Pending', count: stats.pending, icon: <Clock className="h-4 w-4" /> },
        { key: 'approved', label: 'Approved', count: stats.approved, icon: <CheckCircle className="h-4 w-4" /> },
        { key: 'rejected', label: 'Rejected', count: stats.rejected, icon: <XCircle className="h-4 w-4" /> },
        { key: 'cancelled', label: 'Cancelled', count: stats.cancelled, icon: <XCircle className="h-4 w-4" /> },
    ];

    // ============================================
    // RENDER
    // ============================================

    return (
        <AppLayout
            breadcrumbs={[
                { title: 'Home', href: '/' },
                { title: 'HR', href: '/humanresources' },
                { title: 'Leave Management', href: '' },
            ]}
        >
            <Head title="Leave Management" />
            
            <div className="min-h-screen bg-slate-100 px-4 py-6 dark:bg-slate-900">
                <Container>
                    {/* Header */}
                    <PageHeader
                        title="Leave Management"
                        subtitle="Manage and track employee leave applications"
                        actions={[
                            {
                                label: 'Apply Leave',
                                icon: <Plus className="h-4 w-4" />,
                                onClick: handleCreate,
                                variant: 'primary',
                            },
                            {
                                label: 'Export',
                                icon: <Download className="h-4 w-4" />,
                                onClick: handleExport,
                                variant: 'outline',
                            },
                            {
                                label: 'Refresh',
                                icon: <RefreshCw className="h-4 w-4" />,
                                onClick: handleRefresh,
                                variant: 'outline',
                                loading: loading,
                            },
                        ]}
                    />

                    {/* Stats Cards */}
                    <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
                        <StatCard
                            title="Total Applications"
                            value={stats.total}
                            color="bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400"
                            icon={<FileText className="h-5 w-5" />}
                            subtitle={`${stats.totalDays} total days`}
                        />
                        <StatCard
                            title="Pending"
                            value={stats.pending}
                            color="bg-yellow-100 text-yellow-600 dark:bg-yellow-900/30 dark:text-yellow-400"
                            icon={<Clock className="h-5 w-5" />}
                            subtitle={`${stats.pendingDays} days pending`}
                        />
                        <StatCard
                            title="Approved"
                            value={stats.approved}
                            color="bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400"
                            icon={<CheckCircle className="h-5 w-5" />}
                        />
                        <StatCard
                            title="Rejected"
                            value={stats.rejected}
                            color="bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400"
                            icon={<XCircle className="h-5 w-5" />}
                        />
                        <StatCard
                            title="Cancelled"
                            value={stats.cancelled}
                            color="bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300"
                            icon={<XCircle className="h-5 w-5" />}
                        />
                        <StatCard
                            title="Leave Balance"
                            value="N/A"
                            color="bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400"
                            icon={<CalendarDays className="h-5 w-5" />}
                            subtitle="Check your balance"
                        />
                    </div>

                    {/* Tabs */}
                    <div className="mt-6 flex flex-wrap gap-2 border-b border-slate-200 pb-2 dark:border-slate-700">
                        {tabs.map((tab) => (
                            <button
                                key={tab.key}
                                onClick={() => handleTabChange(tab.key)}
                                className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                                    activeTab === tab.key
                                        ? 'bg-blue-600 text-white shadow-sm'
                                        : 'text-slate-600 hover:bg-slate-200 dark:text-slate-300 dark:hover:bg-slate-700'
                                }`}
                            >
                                {tab.icon}
                                {tab.label}
                                {tab.count > 0 && (
                                    <span
                                        className={`ml-1 rounded-full px-2 py-0.5 text-xs ${
                                            activeTab === tab.key
                                                ? 'bg-white/20 text-white'
                                                : 'bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-300'
                                        }`}
                                    >
                                        {tab.count}
                                    </span>
                                )}
                            </button>
                        ))}
                    </div>

                    {/* Table */}
                    <div className="mt-6">
                        <ReusableTable
                            columns={columns}
                            data={leaves}
                            actions={actions}
                            loading={loading}
                            title="Leave Applications"
                            rowsPerPageOptions={[10, 25, 50, 100]}
                            defaultRowsPerPage={10}
                            defaultOrderBy="created_at"
                            defaultOrder="desc"
                            filterPlaceholder="Search by employee, reason, or department..."
                            statusFilterKey="status"
                            statusOptions={statusOptions}
                            additionalFilters={[
                                {
                                    key: 'leave_type',
                                    label: 'Leave Type',
                                    options: leaveTypeOptions,
                                    value: leaveTypeFilter,
                                    onChange: setLeaveTypeFilter,
                                },
                            ]}
                            emptyMessage="No leave applications found"
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

            {/* ========================================== */}
            {/* VIEW DETAIL MODAL */}
            {/* ========================================== */}
            <Dialog open={showDetailModal} onOpenChange={setShowDetailModal}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <FileText className="h-5 w-5 text-blue-600" />
                            Leave Application Details
                        </DialogTitle>
                        <DialogDescription>
                            View complete details of the leave application
                        </DialogDescription>
                    </DialogHeader>
                    {selectedLeave && (
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <Label className="text-xs text-slate-500">Employee</Label>
                                    <p className="font-medium text-slate-800 dark:text-slate-200">
                                        {selectedLeave.employee_name}
                                    </p>
                                    <p className="text-sm text-slate-500">
                                        {selectedLeave.employee_position} • {selectedLeave.employee_department}
                                    </p>
                                </div>
                                <div>
                                    <Label className="text-xs text-slate-500">Leave Type</Label>
                                    <p className="font-medium text-slate-800 dark:text-slate-200">
                                        {LEAVE_TYPE_CONFIG[selectedLeave.leave_type]?.label || selectedLeave.leave_type}
                                    </p>
                                </div>
                                <div>
                                    <Label className="text-xs text-slate-500">Start Date</Label>
                                    <p className="font-medium text-slate-800 dark:text-slate-200">
                                        {formatDate(selectedLeave.start_date)}
                                    </p>
                                </div>
                                <div>
                                    <Label className="text-xs text-slate-500">End Date</Label>
                                    <p className="font-medium text-slate-800 dark:text-slate-200">
                                        {formatDate(selectedLeave.end_date)}
                                    </p>
                                </div>
                                <div>
                                    <Label className="text-xs text-slate-500">Total Days</Label>
                                    <p className="font-medium text-slate-800 dark:text-slate-200">
                                        {selectedLeave.total_days} days
                                    </p>
                                </div>
                                <div>
                                    <Label className="text-xs text-slate-500">Status</Label>
                                    <div className="mt-1">
                                        <span
                                            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${
                                                STATUS_CONFIG[selectedLeave.status]?.color || ''
                                            }`}
                                        >
                                            {STATUS_CONFIG[selectedLeave.status]?.icon}
                                            {STATUS_CONFIG[selectedLeave.status]?.label}
                                        </span>
                                    </div>
                                </div>
                            </div>
                            
                            <div>
                                <Label className="text-xs text-slate-500">Reason</Label>
                                <p className="text-sm text-slate-700 dark:text-slate-300">
                                    {selectedLeave.reason || 'N/A'}
                                </p>
                            </div>

                            {selectedLeave.rejection_reason && (
                                <div>
                                    <Label className="text-xs text-red-500">Rejection Reason</Label>
                                    <p className="text-sm text-red-600 dark:text-red-400">
                                        {selectedLeave.rejection_reason}
                                    </p>
                                </div>
                            )}

                            {selectedLeave.approved_by_name && (
                                <div>
                                    <Label className="text-xs text-slate-500">Approved By</Label>
                                    <p className="text-sm text-slate-700 dark:text-slate-300">
                                        {selectedLeave.approved_by_name}
                                        {selectedLeave.approved_at && ` on ${formatDateTime(selectedLeave.approved_at)}`}
                                    </p>
                                </div>
                            )}

                            <div>
                                <Label className="text-xs text-slate-500">Applied On</Label>
                                <p className="text-sm text-slate-600 dark:text-slate-400">
                                    {formatDateTime(selectedLeave.created_at)}
                                </p>
                            </div>
                        </div>
                    )}
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowDetailModal(false)}>
                            Close
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* ========================================== */}
            {/* APPROVAL MODAL */}
            {/* ========================================== */}
            <Dialog open={showApprovalModal} onOpenChange={setShowApprovalModal}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <CheckCircle className="h-5 w-5 text-green-600" />
                            Approve Leave Application
                        </DialogTitle>
                        <DialogDescription>
                            Are you sure you want to approve this leave application?
                        </DialogDescription>
                    </DialogHeader>
                    {selectedLeave && (
                        <div className="space-y-4">
                            <div className="rounded-lg bg-green-50 p-4 dark:bg-green-900/20">
                                <p className="text-sm text-green-800 dark:text-green-300">
                                    <strong>Employee:</strong> {selectedLeave.employee_name}
                                </p>
                                <p className="text-sm text-green-800 dark:text-green-300">
                                    <strong>Leave Type:</strong> {LEAVE_TYPE_CONFIG[selectedLeave.leave_type]?.label}
                                </p>
                                <p className="text-sm text-green-800 dark:text-green-300">
                                    <strong>Total Days:</strong> {selectedLeave.total_days} days
                                </p>
                                <p className="text-sm text-green-800 dark:text-green-300">
                                    <strong>Period:</strong> {formatDate(selectedLeave.start_date)} - {formatDate(selectedLeave.end_date)}
                                </p>
                            </div>
                        </div>
                    )}
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowApprovalModal(false)}>
                            Cancel
                        </Button>
                        <Button 
                            variant="success" 
                            onClick={handleConfirmApproval}
                            disabled={isProcessing}
                            className="bg-green-600 hover:bg-green-700"
                        >
                            {isProcessing ? 'Approving...' : 'Approve'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* ========================================== */}
            {/* REJECTION MODAL */}
            {/* ========================================== */}
            <Dialog open={showRejectionModal} onOpenChange={setShowRejectionModal}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <XCircle className="h-5 w-5 text-red-600" />
                            Reject Leave Application
                        </DialogTitle>
                        <DialogDescription>
                            Please provide a reason for rejecting this leave application.
                        </DialogDescription>
                    </DialogHeader>
                    {selectedLeave && (
                        <div className="space-y-4">
                            <div className="rounded-lg bg-red-50 p-4 dark:bg-red-900/20">
                                <p className="text-sm text-red-800 dark:text-red-300">
                                    <strong>Employee:</strong> {selectedLeave.employee_name}
                                </p>
                                <p className="text-sm text-red-800 dark:text-red-300">
                                    <strong>Leave Type:</strong> {LEAVE_TYPE_CONFIG[selectedLeave.leave_type]?.label}
                                </p>
                                <p className="text-sm text-red-800 dark:text-red-300">
                                    <strong>Total Days:</strong> {selectedLeave.total_days} days
                                </p>
                            </div>
                            <div>
                                <Label htmlFor="rejectionReason" className="text-sm font-medium">
                                    Rejection Reason *
                                </Label>
                                <Textarea
                                    id="rejectionReason"
                                    placeholder="Please explain why this leave application is being rejected..."
                                    value={rejectionReason}
                                    onChange={(e) => setRejectionReason(e.target.value)}
                                    rows={4}
                                    className="mt-1"
                                />
                            </div>
                        </div>
                    )}
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowRejectionModal(false)}>
                            Cancel
                        </Button>
                        <Button 
                            variant="error" 
                            onClick={handleConfirmRejection}
                            disabled={isProcessing || !rejectionReason.trim()}
                            className="bg-red-600 hover:bg-red-700"
                        >
                            {isProcessing ? 'Rejecting...' : 'Reject'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* ========================================== */}
            {/* CREATE LEAVE MODAL */}
            {/* ========================================== */}
            <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Plus className="h-5 w-5 text-blue-600" />
                            Apply for Leave
                        </DialogTitle>
                        <DialogDescription>
                            Submit a new leave application
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div>
                            <Label htmlFor="leaveType">Leave Type *</Label>
                            <Select
                                value={createForm.leave_type}
                                onValueChange={(value) => setCreateForm({ ...createForm, leave_type: value })}
                            >
                                <SelectTrigger className="mt-1">
                                    <SelectValue placeholder="Select leave type" />
                                </SelectTrigger>
                                <SelectContent>
                                    {leaveTypeOptions.map((option) => (
                                        <SelectItem key={option.value} value={option.value}>
                                            {option.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <Label htmlFor="startDate">Start Date *</Label>
                                <Input
                                    id="startDate"
                                    type="date"
                                    value={createForm.start_date}
                                    onChange={(e) => setCreateForm({ ...createForm, start_date: e.target.value })}
                                    className="mt-1"
                                    min={new Date().toISOString().split('T')[0]}
                                />
                            </div>
                            <div>
                                <Label htmlFor="endDate">End Date *</Label>
                                <Input
                                    id="endDate"
                                    type="date"
                                    value={createForm.end_date}
                                    onChange={(e) => setCreateForm({ ...createForm, end_date: e.target.value })}
                                    className="mt-1"
                                    min={createForm.start_date || new Date().toISOString().split('T')[0]}
                                />
                            </div>
                        </div>

                        {createForm.start_date && createForm.end_date && (
                            <div className="text-sm text-slate-500">
                                Total days: <span className="font-semibold text-slate-700">
                                    {calculateDays(createForm.start_date, createForm.end_date)} days
                                </span>
                            </div>
                        )}

                        <div>
                            <Label htmlFor="reason">Reason *</Label>
                            <Textarea
                                id="reason"
                                placeholder="Please provide a reason for your leave request..."
                                value={createForm.reason}
                                onChange={(e) => setCreateForm({ ...createForm, reason: e.target.value })}
                                rows={3}
                                className="mt-1"
                            />
                        </div>

                        <div>
                            <Label htmlFor="contactNumber">Contact Number</Label>
                            <Input
                                id="contactNumber"
                                type="tel"
                                placeholder="Enter contact number..."
                                value={createForm.contact_number}
                                onChange={(e) => setCreateForm({ ...createForm, contact_number: e.target.value })}
                                className="mt-1"
                            />
                        </div>

                        <div>
                            <Label htmlFor="alternativeEmail">Alternative Email</Label>
                            <Input
                                id="alternativeEmail"
                                type="email"
                                placeholder="Enter alternative email..."
                                value={createForm.alternative_email}
                                onChange={(e) => setCreateForm({ ...createForm, alternative_email: e.target.value })}
                                className="mt-1"
                            />
                        </div>

                        <div className="flex items-center gap-2">
                            <input
                                type="checkbox"
                                id="isPaid"
                                checked={createForm.is_paid}
                                onChange={(e) => setCreateForm({ ...createForm, is_paid: e.target.checked })}
                                className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                            />
                            <Label htmlFor="isPaid" className="text-sm font-normal">
                                This is a paid leave
                            </Label>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowCreateModal(false)}>
                            Cancel
                        </Button>
                        <Button 
                            onClick={handleCreateSubmit}
                            disabled={isProcessing || !createForm.start_date || !createForm.end_date || !createForm.reason.trim()}
                            className="bg-blue-600 hover:bg-blue-700"
                        >
                            {isProcessing ? 'Submitting...' : 'Submit Application'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </AppLayout>
    );
}