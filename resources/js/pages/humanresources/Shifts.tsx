import React, { useState, useEffect, useCallback } from 'react';
import { Head, usePage } from '@inertiajs/react';
import AppLayout from "@/layouts/app-layout";
import Container from '@/components/container';
import PageHeader from '@/components/PageHeader';
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
    Shield,
    UserCog,
    ClipboardList,
    Timer,
    AlertCircle,
    Bell,
    Mail,
    Phone,
    MapPin,
    Building2,
    Layers
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ReusableTable, Column, Action } from '@/components/ReusableTable';
import { toast } from 'react-hot-toast';
import Http from '@/utils/Http';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';

// ============================================
// TYPES
// ============================================

interface Shift {
    id: number;
    shift_code: string;
    shift_name: string;
    department_id: number;
    department_name: string;
    start_time: string;
    end_time: string;
    break_start: string;
    break_end: string;
    total_hours: number;
    description: string;
    status: 'active' | 'inactive';
    assigned_employees: number;
    created_at: string;
    updated_at: string;
}

interface ShiftAssignment {
    id: number;
    employee_id: number;
    employee_name: string;
    employee_position: string;
    shift_id: number;
    shift_name: string;
    shift_code: string;
    department_id: number;
    department_name: string;
    start_date: string;
    end_date: string;
    status: 'pending' | 'approved' | 'rejected' | 'completed' | 'cancelled';
    approved_by?: number;
    approved_by_name?: string;
    approved_at?: string;
    rejection_reason?: string;
    notes?: string;
    created_at: string;
    updated_at: string;
}

interface ShiftStats {
    total_shifts: number;
    active_shifts: number;
    pending_assignments: number;
    approved_assignments: number;
    completed_assignments: number;
    total_employees_assigned: number;
    departments_with_shifts: number;
}

interface DepartmentShiftStats {
    department_name: string;
    total_shifts: number;
    active_shifts: number;
    assigned_employees: number;
    pending_approvals: number;
}

// ============================================
// STATUS CONFIG
// ============================================

const ASSIGNMENT_STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
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
    completed: {
        label: 'Completed',
        color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
        icon: <CheckCircle className="h-3 w-3" />,
    },
    cancelled: {
        label: 'Cancelled',
        color: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
        icon: <XCircle className="h-3 w-3" />,
    },
};

const SHIFT_STATUS_CONFIG: Record<string, { label: string; color: string }> = {
    active: {
        label: 'Active',
        color: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
    },
    inactive: {
        label: 'Inactive',
        color: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
    },
};

// ============================================
// MAIN COMPONENT
// ============================================

export default function ShiftManagement() {
    const { props } = usePage();
    const [loading, setLoading] = useState(false);
    const [shifts, setShifts] = useState<Shift[]>([]);
    const [assignments, setAssignments] = useState<ShiftAssignment[]>([]);
    const [selectedShift, setSelectedShift] = useState<Shift | null>(null);
    const [selectedAssignment, setSelectedAssignment] = useState<ShiftAssignment | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<string>('');
    const [departmentFilter, setDepartmentFilter] = useState<string>('');
    const [activeTab, setActiveTab] = useState<string>('assignments');
    const [pagination, setPagination] = useState({
        currentPage: 1,
        pageSize: 10,
        totalItems: 0,
        totalPages: 1,
    });

    // Modal states
    const [showShiftModal, setShowShiftModal] = useState(false);
    const [showAssignmentModal, setShowAssignmentModal] = useState(false);
    const [showDetailModal, setShowDetailModal] = useState(false);
    const [showApprovalModal, setShowApprovalModal] = useState(false);
    const [showRejectionModal, setShowRejectionModal] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [rejectionReason, setRejectionReason] = useState('');

    // Form states
    const [shiftForm, setShiftForm] = useState({
        shift_name: '',
        shift_code: '',
        department_id: '',
        start_time: '',
        end_time: '',
        break_start: '',
        break_end: '',
        description: '',
        status: 'active'
    });

    const [assignmentForm, setAssignmentForm] = useState({
        shift_id: '',
        employee_id: '',
        start_date: '',
        end_date: '',
        notes: ''
    });

    const { auth } = usePage().props;
    const userRole = auth?.user?.is_admin ? 'admin' : auth?.user?.is_supervisor ? 'supervisor' : 'staff';
    const isManager = userRole === 'admin' || userRole === 'supervisor';

    // Stats
    const [stats, setStats] = useState<ShiftStats>({
        total_shifts: 0,
        active_shifts: 0,
        pending_assignments: 0,
        approved_assignments: 0,
        completed_assignments: 0,
        total_employees_assigned: 0,
        departments_with_shifts: 0
    });

    const [departmentStats, setDepartmentStats] = useState<DepartmentShiftStats[]>([]);

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

    // ============================================
    // FETCH DATA
    // ============================================

    const fetchShifts = useCallback(async () => {
        setLoading(true);
        try {
            const params = {
                page: pagination.currentPage,
                page_size: pagination.pageSize,
                search: searchTerm,
                status: statusFilter,
                department: departmentFilter,
            };

            Object.keys(params).forEach((key) => {
                if (params[key as keyof typeof params] === '') {
                    delete params[key as keyof typeof params];
                }
            });

            const response = await Http.get('/humanresources/shifts', { params });
            const data = response.data;

            setShifts(data.shifts || []);
            setAssignments(data.assignments || []);
            
            if (data.stats) {
                setStats(data.stats);
            }
            if (data.department_stats) {
                setDepartmentStats(data.department_stats);
            }

            setPagination((prev) => ({
                ...prev,
                totalItems: data.total || 0,
                totalPages: data.last_page || 1,
            }));
        } catch (error) {
            console.error('Failed to fetch shifts:', error);
            toast.error('Failed to load shift data');
            setDemoData();
        } finally {
            setLoading(false);
        }
    }, [pagination.currentPage, pagination.pageSize, searchTerm, statusFilter, departmentFilter]);

    const setDemoData = () => {
        setShifts([
            {
                id: 1,
                shift_code: 'MORN-001',
                shift_name: 'Morning Shift',
                department_id: 1,
                department_name: 'Operations',
                start_time: '06:00',
                end_time: '14:00',
                break_start: '10:00',
                break_end: '10:30',
                total_hours: 8,
                description: 'Morning shift for operations team',
                status: 'active',
                assigned_employees: 12,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            },
            {
                id: 2,
                shift_code: 'AFT-001',
                shift_name: 'Afternoon Shift',
                department_id: 1,
                department_name: 'Operations',
                start_time: '14:00',
                end_time: '22:00',
                break_start: '18:00',
                break_end: '18:30',
                total_hours: 8,
                description: 'Afternoon shift for operations team',
                status: 'active',
                assigned_employees: 8,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            },
            {
                id: 3,
                shift_code: 'NIGHT-001',
                shift_name: 'Night Shift',
                department_id: 2,
                department_name: 'Medical',
                start_time: '22:00',
                end_time: '06:00',
                break_start: '02:00',
                break_end: '02:30',
                total_hours: 8,
                description: 'Night shift for medical team',
                status: 'active',
                assigned_employees: 6,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            }
        ]);

        setAssignments([
            {
                id: 1,
                employee_id: 1,
                employee_name: 'John Doe',
                employee_position: 'Operations Manager',
                shift_id: 1,
                shift_name: 'Morning Shift',
                shift_code: 'MORN-001',
                department_id: 1,
                department_name: 'Operations',
                start_date: new Date().toISOString(),
                end_date: new Date(Date.now() + 7 * 86400000).toISOString(),
                status: 'approved',
                approved_by: 99,
                approved_by_name: 'Admin User',
                approved_at: new Date().toISOString(),
                notes: '',
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            },
            {
                id: 2,
                employee_id: 2,
                employee_name: 'Jane Smith',
                employee_position: 'Senior Nurse',
                shift_id: 3,
                shift_name: 'Night Shift',
                shift_code: 'NIGHT-001',
                department_id: 2,
                department_name: 'Medical',
                start_date: new Date().toISOString(),
                end_date: new Date(Date.now() + 14 * 86400000).toISOString(),
                status: 'pending',
                notes: 'Requested night shift for better schedule',
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            }
        ]);

        setStats({
            total_shifts: 5,
            active_shifts: 4,
            pending_assignments: 3,
            approved_assignments: 12,
            completed_assignments: 8,
            total_employees_assigned: 23,
            departments_with_shifts: 4
        });

        setDepartmentStats([
            { department_name: 'Operations', total_shifts: 2, active_shifts: 2, assigned_employees: 12, pending_approvals: 1 },
            { department_name: 'Medical', total_shifts: 1, active_shifts: 1, assigned_employees: 6, pending_approvals: 2 },
            { department_name: 'Finance', total_shifts: 1, active_shifts: 0, assigned_employees: 3, pending_approvals: 0 },
            { department_name: 'HR', total_shifts: 1, active_shifts: 1, assigned_employees: 2, pending_approvals: 0 }
        ]);
    };

    useEffect(() => {
        fetchShifts();
    }, [fetchShifts]);

    // ============================================
    // HANDLERS
    // ============================================

    const handleTabChange = (tab: string) => {
        setActiveTab(tab);
        setStatusFilter('');
        setPagination((prev) => ({ ...prev, currentPage: 1 }));
    };

    const handleCreateShift = () => {
        setShiftForm({
            shift_name: '',
            shift_code: '',
            department_id: '',
            start_time: '',
            end_time: '',
            break_start: '',
            break_end: '',
            description: '',
            status: 'active'
        });
        setShowShiftModal(true);
    };

    const handleCreateAssignment = () => {
        setAssignmentForm({
            shift_id: '',
            employee_id: '',
            start_date: '',
            end_date: '',
            notes: ''
        });
        setShowAssignmentModal(true);
    };

    const handleViewShift = (shift: Shift) => {
        setSelectedShift(shift);
        setShowDetailModal(true);
    };

    const handleViewAssignment = (assignment: ShiftAssignment) => {
        setSelectedAssignment(assignment);
        setShowDetailModal(true);
    };

    const handleApprove = (assignment: ShiftAssignment) => {
        setSelectedAssignment(assignment);
        setShowApprovalModal(true);
    };

    const handleReject = (assignment: ShiftAssignment) => {
        setSelectedAssignment(assignment);
        setRejectionReason('');
        setShowRejectionModal(true);
    };

    const handleConfirmApproval = async () => {
        if (!selectedAssignment) return;
        setIsProcessing(true);
        try {
            const response = await Http.post(`/humanresources/shifts/assignments/${selectedAssignment.id}/approve`, {
                approved_by: auth.user.id,
                approved_by_name: auth.user.name,
            });

            if (response.data.success) {
                toast.success('Shift assignment approved successfully');
                await fetchShifts();
                setShowApprovalModal(false);
                setSelectedAssignment(null);
            }
        } catch (error: any) {
            console.error('Approval failed:', error);
            toast.error(error.response?.data?.message || 'Failed to approve assignment');
        } finally {
            setIsProcessing(false);
        }
    };

    const handleConfirmRejection = async () => {
        if (!selectedAssignment) return;
        if (!rejectionReason.trim()) {
            toast.error('Please provide a reason for rejection');
            return;
        }
        setIsProcessing(true);
        try {
            const response = await Http.post(`/humanresources/shifts/assignments/${selectedAssignment.id}/reject`, {
                rejection_reason: rejectionReason,
                rejected_by: auth.user.id,
                rejected_by_name: auth.user.name,
            });

            if (response.data.success) {
                toast.success('Shift assignment rejected');
                await fetchShifts();
                setShowRejectionModal(false);
                setSelectedAssignment(null);
                setRejectionReason('');
            }
        } catch (error: any) {
            console.error('Rejection failed:', error);
            toast.error(error.response?.data?.message || 'Failed to reject assignment');
        } finally {
            setIsProcessing(false);
        }
    };

    const handleCancelAssignment = async (id: number) => {
        if (!confirm('Are you sure you want to cancel this assignment?')) return;
        try {
            const response = await Http.post(`/humanresources/shifts/assignments/${id}/cancel`);
            if (response.data.success) {
                toast.success('Assignment cancelled');
                await fetchShifts();
            }
        } catch (error) {
            console.error('Cancel failed:', error);
            toast.error('Failed to cancel assignment');
        }
    };

    const handleDeleteShift = async (id: number) => {
        if (!confirm('Are you sure you want to delete this shift?')) return;
        try {
            const response = await Http.delete(`/humanresources/shifts/${id}`);
            if (response.data.success) {
                toast.success('Shift deleted');
                await fetchShifts();
            }
        } catch (error) {
            console.error('Delete failed:', error);
            toast.error('Failed to delete shift');
        }
    };

    const handleSubmitShift = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsProcessing(true);
        try {
            const response = await Http.post('/humanresources/shifts', shiftForm);
            if (response.data.success) {
                toast.success('Shift created successfully');
                setShowShiftModal(false);
                await fetchShifts();
            }
        } catch (error) {
            console.error('Create failed:', error);
            toast.error('Failed to create shift');
        } finally {
            setIsProcessing(false);
        }
    };

    const handleSubmitAssignment = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsProcessing(true);
        try {
            const response = await Http.post('/humanresources/shifts/assignments', assignmentForm);
            if (response.data.success) {
                toast.success('Shift assignment created successfully');
                setShowAssignmentModal(false);
                await fetchShifts();
            }
        } catch (error) {
            console.error('Assignment failed:', error);
            toast.error('Failed to create assignment');
        } finally {
            setIsProcessing(false);
        }
    };

    const handleRefresh = () => {
        fetchShifts();
        toast.success('Data refreshed');
    };

    // ============================================
    // STATS CARDS
    // ============================================

    const StatCard = ({ title, value, color, icon, subtitle }: any) => (
        <Card className="border-slate-200 dark:border-slate-700">
            <CardContent className="p-6">
                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
                            {title}
                        </p>
                        <p className="text-2xl font-bold text-slate-800 dark:text-slate-200">
                            {loading ? '...' : value}
                        </p>
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
    // TABLE DEFINITIONS
    // ============================================

    const shiftColumns: Column<Shift>[] = [
        {
            id: 'shift_code',
            label: 'Code',
            minWidth: 100,
            format: (value) => (
                <span className="font-mono text-sm font-medium text-blue-600 dark:text-blue-400">
                    {value}
                </span>
            ),
            sortable: true,
        },
        {
            id: 'shift_name',
            label: 'Shift Name',
            minWidth: 150,
            format: (value) => (
                <span className="font-medium text-slate-800 dark:text-slate-200">
                    {value}
                </span>
            ),
            sortable: true,
        },
        {
            id: 'department_name',
            label: 'Department',
            minWidth: 130,
            format: (value) => (
                <span className="inline-flex items-center gap-1 text-sm">
                    <Building2 className="h-3 w-3 text-slate-400" />
                    {value}
                </span>
            ),
            sortable: true,
        },
        {
            id: 'start_time',
            label: 'Time',
            minWidth: 150,
            format: (value, row) => (
                <div>
                    <div className="flex items-center gap-1 text-sm">
                        <Clock className="h-3 w-3 text-slate-400" />
                        {formatTime(row.start_time)} - {formatTime(row.end_time)}
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">
                        Break: {formatTime(row.break_start)} - {formatTime(row.break_end)}
                    </div>
                </div>
            ),
        },
        {
            id: 'total_hours',
            label: 'Hours',
            minWidth: 80,
            format: (value) => (
                <span className="font-medium text-slate-700 dark:text-slate-300">
                    {value}h
                </span>
            ),
            sortable: true,
        },
        {
            id: 'assigned_employees',
            label: 'Assigned',
            minWidth: 100,
            format: (value) => (
                <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2.5 py-1 text-xs font-medium text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">
                    <Users className="h-3 w-3" />
                    {value} employees
                </span>
            ),
            sortable: true,
        },
        {
            id: 'status',
            label: 'Status',
            minWidth: 100,
            format: (value) => {
                const config = SHIFT_STATUS_CONFIG[value] || SHIFT_STATUS_CONFIG.inactive;
                return (
                    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${config.color}`}>
                        {config.label}
                    </span>
                );
            },
            sortable: true,
        },
    ];

    const assignmentColumns: Column<ShiftAssignment>[] = [
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
                        {row.employee_position}
                    </div>
                </div>
            ),
            sortable: true,
        },
        {
            id: 'shift_name',
            label: 'Shift',
            minWidth: 130,
            format: (value, row) => (
                <div>
                    <div className="font-medium text-slate-700 dark:text-slate-300">
                        {row.shift_name}
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">
                        {row.shift_code}
                    </div>
                </div>
            ),
            sortable: true,
        },
        {
            id: 'department_name',
            label: 'Department',
            minWidth: 120,
            format: (value) => (
                <span className="text-sm text-slate-600 dark:text-slate-400">
                    {value}
                </span>
            ),
            sortable: true,
        },
        {
            id: 'start_date',
            label: 'Period',
            minWidth: 150,
            format: (value, row) => (
                <div>
                    <div className="text-sm text-slate-700 dark:text-slate-300">
                        {formatDate(row.start_date)}
                    </div>
                    <div className="text-sm text-slate-700 dark:text-slate-300">
                        {formatDate(row.end_date)}
                    </div>
                </div>
            ),
        },
        {
            id: 'status',
            label: 'Status',
            minWidth: 110,
            format: (value) => {
                const config = ASSIGNMENT_STATUS_CONFIG[value] || ASSIGNMENT_STATUS_CONFIG.pending;
                return (
                    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${config.color}`}>
                        {config.icon}
                        {config.label}
                    </span>
                );
            },
            sortable: true,
        },
        {
            id: 'created_at',
            label: 'Requested',
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

    const shiftActions: Action<Shift>[] = [
        {
            label: 'View',
            icon: <Eye className="h-4 w-4" />,
            color: 'primary',
            onClick: handleViewShift,
        },
        {
            label: 'Edit',
            icon: <Edit className="h-4 w-4" />,
            color: 'warning',
            onClick: (row) => console.log('Edit shift', row.id),
            show: (row) => isManager,
        },
        {
            label: 'Delete',
            icon: <Trash2 className="h-4 w-4" />,
            color: 'error',
            onClick: (row) => handleDeleteShift(row.id),
            show: (row) => isManager && row.assigned_employees === 0,
        },
    ];

    const assignmentActions: Action<ShiftAssignment>[] = [
        {
            label: 'View',
            icon: <Eye className="h-4 w-4" />,
            color: 'primary',
            onClick: handleViewAssignment,
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
            onClick: (row) => handleCancelAssignment(row.id),
            show: (row) => row.status === 'pending' || row.status === 'approved',
        },
    ];

    // Status options
    const statusOptions = Object.entries(ASSIGNMENT_STATUS_CONFIG).map(([key, value]) => ({
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
                { title: 'HR', href: '/humanresources' },
                { title: 'Shift Management', href: '' },
            ]}
        >
            <Head title="Shift Management" />
            
            <div className="min-h-screen bg-slate-100 px-4 py-6 dark:bg-slate-900">
                <Container>
                    {/* Header */}
                    <PageHeader
                        title="Shift Management"
                        subtitle="Manage shifts, assignments, and approvals by department"
                        actions={[
                            {
                                label: 'Create Shift',
                                icon: <Plus className="h-4 w-4" />,
                                onClick: handleCreateShift,
                                variant: 'primary',
                            },
                            {
                                label: 'Assign Shift',
                                icon: <UserCheck className="h-4 w-4" />,
                                onClick: handleCreateAssignment,
                                variant: 'secondary',
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
                    <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-7">
                        <StatCard
                            title="Total Shifts"
                            value={stats.total_shifts}
                            color="bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400"
                            icon={<Layers className="h-5 w-5" />}
                        />
                        <StatCard
                            title="Active Shifts"
                            value={stats.active_shifts}
                            color="bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400"
                            icon={<CheckCircle className="h-5 w-5" />}
                        />
                        <StatCard
                            title="Pending Approvals"
                            value={stats.pending_assignments}
                            color="bg-yellow-100 text-yellow-600 dark:bg-yellow-900/30 dark:text-yellow-400"
                            icon={<Clock className="h-5 w-5" />}
                        />
                        <StatCard
                            title="Approved"
                            value={stats.approved_assignments}
                            color="bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400"
                            icon={<CheckCircle className="h-5 w-5" />}
                        />
                        <StatCard
                            title="Completed"
                            value={stats.completed_assignments}
                            color="bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400"
                            icon={<CheckCircle className="h-5 w-5" />}
                        />
                        <StatCard
                            title="Assigned Employees"
                            value={stats.total_employees_assigned}
                            color="bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400"
                            icon={<Users className="h-5 w-5" />}
                        />
                        <StatCard
                            title="Departments"
                            value={stats.departments_with_shifts}
                            color="bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400"
                            icon={<Building2 className="h-5 w-5" />}
                        />
                    </div>

                    {/* Department Shift Stats */}
                    <div className="mt-6">
                        <h3 className="mb-4 text-lg font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                            <Building2 className="h-5 w-5 text-indigo-600" />
                            Department Shift Overview
                        </h3>
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
                            {departmentStats.map((dept, index) => (
                                <Card key={index} className="border-slate-200 dark:border-slate-700">
                                    <CardContent className="p-4">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <p className="font-medium text-slate-800 dark:text-slate-200">
                                                    {dept.department_name}
                                                </p>
                                                <div className="mt-1 space-y-1 text-sm">
                                                    <p className="text-slate-500 dark:text-slate-400">
                                                        Shifts: {dept.total_shifts} ({dept.active_shifts} active)
                                                    </p>
                                                    <p className="text-slate-500 dark:text-slate-400">
                                                        Employees: {dept.assigned_employees}
                                                    </p>
                                                    {dept.pending_approvals > 0 && (
                                                        <p className="text-yellow-600 dark:text-yellow-400 flex items-center gap-1">
                                                            <Clock className="h-3 w-3" />
                                                            {dept.pending_approvals} pending
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                            <div className={`rounded-full p-2 ${
                                                dept.pending_approvals > 0 
                                                    ? 'bg-yellow-100 text-yellow-600 dark:bg-yellow-900/30 dark:text-yellow-400'
                                                    : 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400'
                                            }`}>
                                                {dept.pending_approvals > 0 ? (
                                                    <AlertCircle className="h-5 w-5" />
                                                ) : (
                                                    <CheckCircle className="h-5 w-5" />
                                                )}
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    </div>

                    {/* Tabs */}
                    <div className="mt-8 flex flex-wrap gap-2 border-b border-slate-200 pb-2 dark:border-slate-700">
                        <button
                            onClick={() => handleTabChange('assignments')}
                            className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                                activeTab === 'assignments'
                                    ? 'bg-blue-600 text-white shadow-sm'
                                    : 'text-slate-600 hover:bg-slate-200 dark:text-slate-300 dark:hover:bg-slate-700'
                            }`}
                        >
                            <ClipboardList className="h-4 w-4" />
                            Assignments
                            <span className="ml-1 rounded-full bg-white/20 px-2 py-0.5 text-xs">
                                {stats.pending_assignments + stats.approved_assignments}
                            </span>
                        </button>
                        <button
                            onClick={() => handleTabChange('shifts')}
                            className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                                activeTab === 'shifts'
                                    ? 'bg-blue-600 text-white shadow-sm'
                                    : 'text-slate-600 hover:bg-slate-200 dark:text-slate-300 dark:hover:bg-slate-700'
                            }`}
                        >
                            <Layers className="h-4 w-4" />
                            Shifts
                            <span className="ml-1 rounded-full bg-white/20 px-2 py-0.5 text-xs">
                                {stats.total_shifts}
                            </span>
                        </button>
                    </div>

                    {/* Tables */}
                    <div className="mt-6">
                        {activeTab === 'assignments' ? (
                            <ReusableTable
                                columns={assignmentColumns}
                                data={assignments}
                                actions={assignmentActions}
                                loading={loading}
                                title="Shift Assignments"
                                rowsPerPageOptions={[10, 25, 50, 100]}
                                defaultRowsPerPage={10}
                                defaultOrderBy="created_at"
                                defaultOrder="desc"
                                filterPlaceholder="Search by employee, shift, or department..."
                                statusFilterKey="status"
                                statusOptions={statusOptions}
                                emptyMessage="No shift assignments found"
                                onSearchChange={(value) => {
                                    setSearchTerm(value);
                                    setPagination((prev) => ({ ...prev, currentPage: 1 }));
                                }}
                                onPageChange={(page) => {
                                    setPagination((prev) => ({ ...prev, currentPage: page }));
                                }}
                                onPageSizeChange={(size) => {
                                    setPagination((prev) => ({ ...prev, pageSize: size, currentPage: 1 }));
                                }}
                                pagination={{
                                    currentPage: pagination.currentPage,
                                    pageSize: pagination.pageSize,
                                    totalItems: pagination.totalItems,
                                    totalPages: pagination.totalPages,
                                }}
                            />
                        ) : (
                            <ReusableTable
                                columns={shiftColumns}
                                data={shifts}
                                actions={shiftActions}
                                loading={loading}
                                title="Shifts"
                                rowsPerPageOptions={[10, 25, 50, 100]}
                                defaultRowsPerPage={10}
                                defaultOrderBy="created_at"
                                defaultOrder="desc"
                                filterPlaceholder="Search by shift code, name, or department..."
                                statusFilterKey="status"
                                statusOptions={Object.entries(SHIFT_STATUS_CONFIG).map(([key, value]) => ({
                                    value: key,
                                    label: value.label,
                                }))}
                                emptyMessage="No shifts found"
                                onSearchChange={(value) => {
                                    setSearchTerm(value);
                                    setPagination((prev) => ({ ...prev, currentPage: 1 }));
                                }}
                                onPageChange={(page) => {
                                    setPagination((prev) => ({ ...prev, currentPage: page }));
                                }}
                                onPageSizeChange={(size) => {
                                    setPagination((prev) => ({ ...prev, pageSize: size, currentPage: 1 }));
                                }}
                                pagination={{
                                    currentPage: pagination.currentPage,
                                    pageSize: pagination.pageSize,
                                    totalItems: pagination.totalItems,
                                    totalPages: pagination.totalPages,
                                }}
                            />
                        )}
                    </div>
                </Container>
            </div>

            {/* ========================================== */}
            {/* CREATE SHIFT MODAL */}
            {/* ========================================== */}
            <Dialog open={showShiftModal} onOpenChange={setShowShiftModal}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Plus className="h-5 w-5 text-blue-600" />
                            Create New Shift
                        </DialogTitle>
                        <DialogDescription>
                            Define a new shift schedule for a department
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleSubmitShift}>
                        <div className="space-y-4">
                            <div>
                                <Label htmlFor="shift_name">Shift Name *</Label>
                                <Input
                                    id="shift_name"
                                    placeholder="e.g., Morning Shift"
                                    value={shiftForm.shift_name}
                                    onChange={(e) => setShiftForm({ ...shiftForm, shift_name: e.target.value })}
                                    required
                                />
                            </div>
                            <div>
                                <Label htmlFor="shift_code">Shift Code *</Label>
                                <Input
                                    id="shift_code"
                                    placeholder="e.g., MORN-001"
                                    value={shiftForm.shift_code}
                                    onChange={(e) => setShiftForm({ ...shiftForm, shift_code: e.target.value })}
                                    required
                                />
                            </div>
                            <div>
                                <Label htmlFor="department_id">Department *</Label>
                                <Select
                                    value={shiftForm.department_id}
                                    onValueChange={(value) => setShiftForm({ ...shiftForm, department_id: value })}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select department" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="1">Operations</SelectItem>
                                        <SelectItem value="2">Medical</SelectItem>
                                        <SelectItem value="3">Finance</SelectItem>
                                        <SelectItem value="4">Human Resources</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <Label htmlFor="start_time">Start Time *</Label>
                                    <Input
                                        id="start_time"
                                        type="time"
                                        value={shiftForm.start_time}
                                        onChange={(e) => setShiftForm({ ...shiftForm, start_time: e.target.value })}
                                        required
                                    />
                                </div>
                                <div>
                                    <Label htmlFor="end_time">End Time *</Label>
                                    <Input
                                        id="end_time"
                                        type="time"
                                        value={shiftForm.end_time}
                                        onChange={(e) => setShiftForm({ ...shiftForm, end_time: e.target.value })}
                                        required
                                    />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <Label htmlFor="break_start">Break Start</Label>
                                    <Input
                                        id="break_start"
                                        type="time"
                                        value={shiftForm.break_start}
                                        onChange={(e) => setShiftForm({ ...shiftForm, break_start: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <Label htmlFor="break_end">Break End</Label>
                                    <Input
                                        id="break_end"
                                        type="time"
                                        value={shiftForm.break_end}
                                        onChange={(e) => setShiftForm({ ...shiftForm, break_end: e.target.value })}
                                    />
                                </div>
                            </div>
                            <div>
                                <Label htmlFor="description">Description</Label>
                                <Textarea
                                    id="description"
                                    placeholder="Describe the shift..."
                                    value={shiftForm.description}
                                    onChange={(e) => setShiftForm({ ...shiftForm, description: e.target.value })}
                                    rows={2}
                                />
                            </div>
                        </div>
                        <DialogFooter className="mt-6">
                            <Button variant="outline" type="button" onClick={() => setShowShiftModal(false)}>
                                Cancel
                            </Button>
                            <Button type="submit" disabled={isProcessing}>
                                {isProcessing ? 'Creating...' : 'Create Shift'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* ========================================== */}
            {/* CREATE ASSIGNMENT MODAL */}
            {/* ========================================== */}
            <Dialog open={showAssignmentModal} onOpenChange={setShowAssignmentModal}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <UserCheck className="h-5 w-5 text-blue-600" />
                            Assign Shift to Employee
                        </DialogTitle>
                        <DialogDescription>
                            Assign an employee to a shift schedule
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleSubmitAssignment}>
                        <div className="space-y-4">
                            <div>
                                <Label htmlFor="shift_id">Select Shift *</Label>
                                <Select
                                    value={assignmentForm.shift_id}
                                    onValueChange={(value) => setAssignmentForm({ ...assignmentForm, shift_id: value })}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select shift" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {shifts.filter(s => s.status === 'active').map((shift) => (
                                            <SelectItem key={shift.id} value={String(shift.id)}>
                                                {shift.shift_name} ({shift.shift_code})
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div>
                                <Label htmlFor="employee_id">Select Employee *</Label>
                                <Select
                                    value={assignmentForm.employee_id}
                                    onValueChange={(value) => setAssignmentForm({ ...assignmentForm, employee_id: value })}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select employee" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="1">John Doe - Operations Manager</SelectItem>
                                        <SelectItem value="2">Jane Smith - Senior Nurse</SelectItem>
                                        <SelectItem value="3">Mike Johnson - Accountant</SelectItem>
                                        <SelectItem value="4">Sarah Brown - HR Coordinator</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <Label htmlFor="start_date">Start Date *</Label>
                                    <Input
                                        id="start_date"
                                        type="date"
                                        value={assignmentForm.start_date}
                                        onChange={(e) => setAssignmentForm({ ...assignmentForm, start_date: e.target.value })}
                                        required
                                    />
                                </div>
                                <div>
                                    <Label htmlFor="end_date">End Date *</Label>
                                    <Input
                                        id="end_date"
                                        type="date"
                                        value={assignmentForm.end_date}
                                        onChange={(e) => setAssignmentForm({ ...assignmentForm, end_date: e.target.value })}
                                        required
                                    />
                                </div>
                            </div>
                            <div>
                                <Label htmlFor="notes">Notes</Label>
                                <Textarea
                                    id="notes"
                                    placeholder="Any additional notes..."
                                    value={assignmentForm.notes}
                                    onChange={(e) => setAssignmentForm({ ...assignmentForm, notes: e.target.value })}
                                    rows={2}
                                />
                            </div>
                        </div>
                        <DialogFooter className="mt-6">
                            <Button variant="outline" type="button" onClick={() => setShowAssignmentModal(false)}>
                                Cancel
                            </Button>
                            <Button type="submit" disabled={isProcessing}>
                                {isProcessing ? 'Assigning...' : 'Assign Shift'}
                            </Button>
                        </DialogFooter>
                    </form>
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
                            Approve Shift Assignment
                        </DialogTitle>
                        <DialogDescription>
                            Are you sure you want to approve this shift assignment?
                        </DialogDescription>
                    </DialogHeader>
                    {selectedAssignment && (
                        <div className="space-y-4">
                            <div className="rounded-lg bg-green-50 p-4 dark:bg-green-900/20">
                                <p className="text-sm text-green-800 dark:text-green-300">
                                    <strong>Employee:</strong> {selectedAssignment.employee_name}
                                </p>
                                <p className="text-sm text-green-800 dark:text-green-300">
                                    <strong>Shift:</strong> {selectedAssignment.shift_name} ({selectedAssignment.shift_code})
                                </p>
                                <p className="text-sm text-green-800 dark:text-green-300">
                                    <strong>Department:</strong> {selectedAssignment.department_name}
                                </p>
                                <p className="text-sm text-green-800 dark:text-green-300">
                                    <strong>Period:</strong> {formatDate(selectedAssignment.start_date)} - {formatDate(selectedAssignment.end_date)}
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
                            Reject Shift Assignment
                        </DialogTitle>
                        <DialogDescription>
                            Please provide a reason for rejecting this assignment.
                        </DialogDescription>
                    </DialogHeader>
                    {selectedAssignment && (
                        <div className="space-y-4">
                            <div className="rounded-lg bg-red-50 p-4 dark:bg-red-900/20">
                                <p className="text-sm text-red-800 dark:text-red-300">
                                    <strong>Employee:</strong> {selectedAssignment.employee_name}
                                </p>
                                <p className="text-sm text-red-800 dark:text-red-300">
                                    <strong>Shift:</strong> {selectedAssignment.shift_name}
                                </p>
                            </div>
                            <div>
                                <Label htmlFor="rejectionReason" className="text-sm font-medium">
                                    Rejection Reason *
                                </Label>
                                <Textarea
                                    id="rejectionReason"
                                    placeholder="Explain why this assignment is being rejected..."
                                    value={rejectionReason}
                                    onChange={(e) => setRejectionReason(e.target.value)}
                                    rows={3}
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
            {/* DETAIL VIEW MODAL */}
            {/* ========================================== */}
            <Dialog open={showDetailModal} onOpenChange={setShowDetailModal}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            {activeTab === 'shifts' ? (
                                <Layers className="h-5 w-5 text-blue-600" />
                            ) : (
                                <ClipboardList className="h-5 w-5 text-blue-600" />
                            )}
                            {activeTab === 'shifts' ? 'Shift Details' : 'Assignment Details'}
                        </DialogTitle>
                        <DialogDescription>
                            Complete details of the {activeTab === 'shifts' ? 'shift' : 'assignment'}
                        </DialogDescription>
                    </DialogHeader>
                    {activeTab === 'shifts' && selectedShift && (
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <Label className="text-xs text-slate-500">Shift Code</Label>
                                    <p className="font-mono font-medium text-blue-600 dark:text-blue-400">
                                        {selectedShift.shift_code}
                                    </p>
                                </div>
                                <div>
                                    <Label className="text-xs text-slate-500">Shift Name</Label>
                                    <p className="font-medium text-slate-800 dark:text-slate-200">
                                        {selectedShift.shift_name}
                                    </p>
                                </div>
                                <div>
                                    <Label className="text-xs text-slate-500">Department</Label>
                                    <p className="font-medium text-slate-800 dark:text-slate-200">
                                        {selectedShift.department_name}
                                    </p>
                                </div>
                                <div>
                                    <Label className="text-xs text-slate-500">Status</Label>
                                    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${
                                        SHIFT_STATUS_CONFIG[selectedShift.status]?.color || ''
                                    }`}>
                                        {SHIFT_STATUS_CONFIG[selectedShift.status]?.label || selectedShift.status}
                                    </span>
                                </div>
                                <div>
                                    <Label className="text-xs text-slate-500">Start Time</Label>
                                    <p className="font-medium text-slate-800 dark:text-slate-200">
                                        {formatTime(selectedShift.start_time)}
                                    </p>
                                </div>
                                <div>
                                    <Label className="text-xs text-slate-500">End Time</Label>
                                    <p className="font-medium text-slate-800 dark:text-slate-200">
                                        {formatTime(selectedShift.end_time)}
                                    </p>
                                </div>
                                <div>
                                    <Label className="text-xs text-slate-500">Break</Label>
                                    <p className="font-medium text-slate-800 dark:text-slate-200">
                                        {formatTime(selectedShift.break_start)} - {formatTime(selectedShift.break_end)}
                                    </p>
                                </div>
                                <div>
                                    <Label className="text-xs text-slate-500">Total Hours</Label>
                                    <p className="font-medium text-slate-800 dark:text-slate-200">
                                        {selectedShift.total_hours} hours
                                    </p>
                                </div>
                            </div>
                            <div>
                                <Label className="text-xs text-slate-500">Description</Label>
                                <p className="text-sm text-slate-600 dark:text-slate-400">
                                    {selectedShift.description || 'N/A'}
                                </p>
                            </div>
                            <div>
                                <Label className="text-xs text-slate-500">Assigned Employees</Label>
                                <p className="font-medium text-slate-800 dark:text-slate-200">
                                    {selectedShift.assigned_employees} employees
                                </p>
                            </div>
                        </div>
                    )}
                    {activeTab === 'assignments' && selectedAssignment && (
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <Label className="text-xs text-slate-500">Employee</Label>
                                    <p className="font-medium text-slate-800 dark:text-slate-200">
                                        {selectedAssignment.employee_name}
                                    </p>
                                    <p className="text-sm text-slate-500">
                                        {selectedAssignment.employee_position}
                                    </p>
                                </div>
                                <div>
                                    <Label className="text-xs text-slate-500">Shift</Label>
                                    <p className="font-medium text-slate-800 dark:text-slate-200">
                                        {selectedAssignment.shift_name}
                                    </p>
                                    <p className="text-sm text-slate-500">
                                        {selectedAssignment.shift_code}
                                    </p>
                                </div>
                                <div>
                                    <Label className="text-xs text-slate-500">Department</Label>
                                    <p className="font-medium text-slate-800 dark:text-slate-200">
                                        {selectedAssignment.department_name}
                                    </p>
                                </div>
                                <div>
                                    <Label className="text-xs text-slate-500">Status</Label>
                                    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${
                                        ASSIGNMENT_STATUS_CONFIG[selectedAssignment.status]?.color || ''
                                    }`}>
                                        {ASSIGNMENT_STATUS_CONFIG[selectedAssignment.status]?.icon}
                                        {ASSIGNMENT_STATUS_CONFIG[selectedAssignment.status]?.label}
                                    </span>
                                </div>
                                <div>
                                    <Label className="text-xs text-slate-500">Start Date</Label>
                                    <p className="font-medium text-slate-800 dark:text-slate-200">
                                        {formatDate(selectedAssignment.start_date)}
                                    </p>
                                </div>
                                <div>
                                    <Label className="text-xs text-slate-500">End Date</Label>
                                    <p className="font-medium text-slate-800 dark:text-slate-200">
                                        {formatDate(selectedAssignment.end_date)}
                                    </p>
                                </div>
                            </div>
                            {selectedAssignment.notes && (
                                <div>
                                    <Label className="text-xs text-slate-500">Notes</Label>
                                    <p className="text-sm text-slate-600 dark:text-slate-400">
                                        {selectedAssignment.notes}
                                    </p>
                                </div>
                            )}
                            {selectedAssignment.rejection_reason && (
                                <div>
                                    <Label className="text-xs text-red-500">Rejection Reason</Label>
                                    <p className="text-sm text-red-600 dark:text-red-400">
                                        {selectedAssignment.rejection_reason}
                                    </p>
                                </div>
                            )}
                            {selectedAssignment.approved_by_name && (
                                <div>
                                    <Label className="text-xs text-slate-500">Approved By</Label>
                                    <p className="text-sm text-slate-700 dark:text-slate-300">
                                        {selectedAssignment.approved_by_name}
                                        {selectedAssignment.approved_at && ` on ${formatDateTime(selectedAssignment.approved_at)}`}
                                    </p>
                                </div>
                            )}
                            <div>
                                <Label className="text-xs text-slate-500">Requested On</Label>
                                <p className="text-sm text-slate-600 dark:text-slate-400">
                                    {formatDateTime(selectedAssignment.created_at)}
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
        </AppLayout>
    );
}