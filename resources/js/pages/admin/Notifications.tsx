// resources/js/pages/admin/Notifications.tsx

import { router } from '@inertiajs/react';
import { usePage } from '@inertiajs/react';
import { 
    Bell, 
    Eye, 
    Check, 
    X, 
    CheckCircle2, 
    Clock, 
    AlertCircle, 
    Package, 
    FileText, 
    Users, 
    DollarSign,
    User,
    MessageCircle,
    Calendar as CalendarIcon
} from 'lucide-react';
import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import PageHeader from '@/components/PageHeader';
import type { Column, Action } from '@/components/ReusableTable';
import { ReusableTable } from '@/components/ReusableTable';
import AppLayout from '@/layouts/app-layout';
import Http from '@/utils/Http';
import NotificationDetailsModal from './components/NotificationDetailsModal';

// ============================================
// TYPES
// ============================================

interface NotificationItem {
    id: string;
    title: string;
    message: string;
    type: string;
    read: boolean;
    read_at: string | null;
    created_at: string;
    time: string;
    url?: string;
    data?: Record<string, any>;
    notifiable_type?: string;
    notifiable_id?: number;
}

// ============================================
// TYPE CONFIG
// ============================================

const TYPE_CONFIG: Record<string, { label: string; color: string; icon: any }> = {
    purchase_request: {
        label: 'Purchase Request',
        color: 'bg-blue-50 text-blue-600 dark:bg-blue-950/30 dark:text-blue-400',
        icon: FileText,
    },
    purchase_order: {
        label: 'Purchase Order',
        color: 'bg-indigo-50 text-indigo-600 dark:bg-indigo-950/30 dark:text-indigo-400',
        icon: Package,
    },
    adjustment: {
        label: 'Adjustment',
        color: 'bg-amber-50 text-amber-600 dark:bg-amber-950/30 dark:text-amber-400',
        icon: Package,
    },
    supervisor_approval: {
        label: 'Supervisor Approval',
        color: 'bg-blue-50 text-blue-600 dark:bg-blue-950/30 dark:text-blue-400',
        icon: User,
    },
    supervisor_approved: {
        label: 'Supervisor Approved',
        color: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/30 dark:text-emerald-400',
        icon: CheckCircle2,
    },
    admin_approval: {
        label: 'Admin Approval',
        color: 'bg-amber-50 text-amber-600 dark:bg-amber-950/30 dark:text-amber-400',
        icon: DollarSign,
    },
    admin_approved: {
        label: 'Admin Approved',
        color: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/30 dark:text-emerald-400',
        icon: CheckCircle2,
    },
    funds_released: {
        label: 'Funds Released',
        color: 'bg-green-50 text-green-600 dark:bg-green-950/30 dark:text-green-400',
        icon: DollarSign,
    },
    rejected: {
        label: 'Rejected',
        color: 'bg-red-50 text-red-600 dark:bg-red-950/30 dark:text-red-400',
        icon: AlertCircle,
    },
    success: {
        label: 'Success',
        color: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/30 dark:text-emerald-400',
        icon: CheckCircle2,
    },
    warning: {
        label: 'Warning',
        color: 'bg-red-50 text-red-600 dark:bg-red-950/30 dark:text-red-400',
        icon: AlertCircle,
    },
    info: {
        label: 'Information',
        color: 'bg-blue-50 text-blue-600 dark:bg-blue-950/30 dark:text-blue-400',
        icon: Bell,
    },
    user: {
        label: 'User Update',
        color: 'bg-purple-50 text-purple-600 dark:bg-purple-950/30 dark:text-purple-400',
        icon: Users,
    },
    payment: {
        label: 'Payment',
        color: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/30 dark:text-emerald-400',
        icon: DollarSign,
    },
    calendar: {
        label: 'Calendar',
        color: 'bg-cyan-50 text-cyan-600 dark:bg-cyan-950/30 dark:text-cyan-400',
        icon: CalendarIcon,
    },
    message: {
        label: 'Message',
        color: 'bg-violet-50 text-violet-600 dark:bg-violet-950/30 dark:text-violet-400',
        icon: MessageCircle,
    },
};

// ============================================
// MAIN COMPONENT
// ============================================

export default function NotificationsPage() {
    const { props } = usePage();
    const auth = props.auth;
    
    const [notifications, setNotifications] = useState<NotificationItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedNotification, setSelectedNotification] = useState<NotificationItem | null>(null);
    const [showDetailsModal, setShowDetailsModal] = useState(false);
    
    // Pagination state
    const [pagination, setPagination] = useState({
        currentPage: 1,
        pageSize: 10,
        totalItems: 0,
        totalPages: 1,
    });

    // ============================================
    // FETCH NOTIFICATIONS
    // ============================================

    const fetchNotifications = async () => {
        if (!auth?.user?.id) {
            setLoading(false);
            return;
        }

        setLoading(true);
        try {
            const response = await Http.get(`/notifications/${auth.user.id}`);
            const data = response.data;

            // ✅ Transform data with proper title and type
            const transformed = data.data?.map((item: any) => {
                // Get the notification data
                const notificationData = item.data || {};
                
                return {
                    id: item.id,
                    title: notificationData.title || 'Notification',
                    message: notificationData.message || '',
                    type: notificationData.type || 'info',
                    read: item.read_at !== null,
                    read_at: item.read_at,
                    created_at: item.created_at,
                    time: new Date(item.created_at).toLocaleDateString('en-ZM', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                    }),
                    url: notificationData.url || null,
                    data: notificationData,
                    notifiable_type: item.notifiable_type,
                    notifiable_id: item.notifiable_id,
                };
            }) || [];

            setNotifications(transformed);
            setPagination({
                ...pagination,
                totalItems: data.total || 0,
                totalPages: data.last_page || 1,
            });
        } catch (error) {
            console.error('Failed to fetch notifications:', error);
            toast.error('Failed to load notifications');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchNotifications();
    }, [auth?.user?.id, pagination.currentPage, pagination.pageSize]);

    // ============================================
    // HANDLERS
    // ============================================

    const handleMarkAsRead = async (id: string) => {
        try {
         
            const response = await Http.post(`/notifications/${id}/mark-as-read`);

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || 'Failed to mark as read');
            }

            setNotifications(prev =>
                prev.map(n => n.id === id ? { ...n, read: true, read_at: new Date().toISOString() } : n)
            );

            toast.success('Notification marked as read');
        } catch (error) {
            console.error('Failed to mark as read:', error);
            toast.error('Failed to mark as read');
        }
    };

    const handleMarkAllAsRead = async () => {
        try {
            const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '';
            
            const response = await fetch('/notifications/mark-all-as-read', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': csrfToken,
                    'X-Requested-With': 'XMLHttpRequest',
                },
            });

            if (!response.ok) throw new Error('Failed to mark all as read');

            setNotifications(prev =>
                prev.map(n => ({ ...n, read: true, read_at: new Date().toISOString() }))
            );

            toast.success('All notifications marked as read');
        } catch (error) {
            console.error('Failed to mark all as read:', error);
            toast.error('Failed to mark all as read');
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this notification?')) return;

        try {
            const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '';
            
            const response = await fetch(`/notifications/${id}`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': csrfToken,
                    'X-Requested-With': 'XMLHttpRequest',
                },
            });

            if (!response.ok) throw new Error('Failed to delete notification');

            setNotifications(prev => prev.filter(n => n.id !== id));
            toast.success('Notification deleted');
        } catch (error) {
            console.error('Failed to delete notification:', error);
            toast.error('Failed to delete notification');
        }
    };

    const handleViewDetails = (notification: NotificationItem) => {
        setSelectedNotification(notification);
        setShowDetailsModal(true);
    };

    const handleNavigate = (url?: string) => {
        if (url) {
            router.visit(url);
        }
    };

    // ============================================
    // TABLE DEFINITIONS
    // ============================================

    const columns: Column<NotificationItem>[] = [
        {
            id: 'status',
            label: '',
            minWidth: 40,
            format: (value, row) => (
                !row.read ? (
                    <div className="flex items-center justify-center">
                        <div className="h-2 w-2 rounded-full bg-emerald-500 shadow-sm shadow-emerald-500/50 ring-2 ring-emerald-500/20 dark:ring-emerald-400/20"></div>
                    </div>
                ) : null
            ),
        },
        {
            id: 'title',
            label: 'Notification',
            minWidth: 200,
            sortable: true,
            format: (value, row) => (
                <div>
                    <p className={`text-sm ${!row.read ? 'font-semibold text-slate-900 dark:text-slate-100' : 'text-slate-700 dark:text-slate-300'}`}>
                        {row.title}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 truncate max-w-xs">
                        {row.message}
                    </p>
                </div>
            ),
        },
        {
            id: 'type',
            label: 'Type',
            minWidth: 140,
            filterType: 'select',
            filterOptions: Object.entries(TYPE_CONFIG).map(([key, value]) => ({
                value: key,
                label: value.label,
            })),
            format: (value, row) => {
                // ✅ Get config for the type, fallback to 'info'
                const config = TYPE_CONFIG[row.type] || TYPE_CONFIG.info;
                const Icon = config.icon;
                return (
                    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${config.color}`}>
                        <Icon className="h-3 w-3" />
                        {config.label}
                    </span>
                );
            },
        },
        {
            id: 'read',
            label: 'Status',
            minWidth: 80,
            filterType: 'select',
            filterOptions: [
                { value: 'true', label: 'Read' },
                { value: 'false', label: 'Unread' },
            ],
            format: (value, row) => (
                <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${
                    row.read
                        ? 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                        : 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/30 dark:text-emerald-400'
                }`}>
                    {row.read ? (
                        <Check className="h-3 w-3" />
                    ) : (
                        <Clock className="h-3 w-3" />
                    )}
                    {row.read ? 'Read' : 'Unread'}
                </span>
            ),
        },
        {
            id: 'time',
            label: 'Received',
            minWidth: 120,
            sortable: true,
            format: (value) => (
                <div className="text-xs text-slate-500 dark:text-slate-400">
                    {value}
                </div>
            ),
        },
    ];

    const actions: Action<NotificationItem>[] = [
        {
            label: 'View Details',
            icon: <Eye className="h-4 w-4" />,
            color: 'primary',
            variant: 'text',
            onClick: handleViewDetails,
        },
        {
            label: 'Mark as Read',
            icon: <Check className="h-4 w-4" />,
            color: 'success',
            variant: 'text',
            onClick: (row) => handleMarkAsRead(row.id),
            show: (row) => !row.read,
        },
        {
            label: 'Delete',
            icon: <X className="h-4 w-4" />,
            color: 'error',
            variant: 'text',
            onClick: (row) => handleDelete(row.id),
        },
    ];

    // ============================================
    // RENDER
    // ============================================

    return (
        <AppLayout
            breadcrumbs={[
                {
                    title: 'Home',
                    href: '/dashboard',
                },
                {
                    title: 'Notifications',
                    href: '',
                },
            ]}
        >
            <div className="px-4 py-6 sm:px-6 lg:px-8 bg-slate-100">
                <PageHeader
                    title="Notifications"
                    subtitle="Get notified for system updates, requests for approvals, and more"
                    icon={<Bell className="h-6 w-6" />}
                    actions={[
                        {
                            label: 'Mark All as Read',
                            icon: <Check className="h-4 w-4" />,
                            onClick: handleMarkAllAsRead,
                            variant: 'outline',
                            size: 'sm',
                            show: notifications.some(n => !n.read),
                        },
                        {
                            label: 'Refresh',
                            icon: <Clock className="h-4 w-4" />,
                            onClick: fetchNotifications,
                            variant: 'outline',
                            size: 'sm',
                            loading: loading,
                        },
                    ]}
                />

                <div className="mt-6">
                    <ReusableTable
                        columns={columns}
                        data={notifications}
                        actions={actions}
                        loading={loading}
                        rowsPerPageOptions={[5, 10, 25, 50]}
                        defaultRowsPerPage={10}
                        defaultOrderBy="created_at"
                        defaultOrder="desc"
                        filterPlaceholder="Search notifications..."
                        statusFilterKey="status"
                        statusOptions={[
                            { value: 'read', label: 'Read' },
                            { value: 'unread', label: 'Unread' },
                        ]}
                        emptyMessage="No notifications found"
                        onRowClick={(row) => handleViewDetails(row)}
                        className="bg-white dark:bg-slate-800"
                    />
                </div>

                {/* Notification Details Modal */}
                <NotificationDetailsModal
                    isOpen={showDetailsModal}
                    onClose={() => {
                        setShowDetailsModal(false);
                        setSelectedNotification(null);
                    }}
                    notification={selectedNotification}
                    onMarkAsRead={() => {
                        if (selectedNotification && !selectedNotification.read) {
                            handleMarkAsRead(selectedNotification.id);
                            setSelectedNotification({ ...selectedNotification, read: true });
                        }
                    }}
                    onNavigate={handleNavigate}
                    onDelete={() => {
                        if (selectedNotification) {
                            handleDelete(selectedNotification.id);
                            setShowDetailsModal(false);
                            setSelectedNotification(null);
                        }
                    }}
                />
            </div>
        </AppLayout>
    );
}