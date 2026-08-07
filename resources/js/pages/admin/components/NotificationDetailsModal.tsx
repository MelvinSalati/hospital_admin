// resources/js/pages/Notifications/components/NotificationDetailsModal.tsx

import {
    Dialog,
    DialogPanel,
    DialogTitle,
    Transition,
    TransitionChild,
} from '@headlessui/react';
import { format } from 'date-fns';
import { 
    X, 
    Check, 
    Trash2, 
    ExternalLink, 
    Bell, 
    Clock, 
    Calendar,
    FileText,
    Package,
    AlertCircle,
    CheckCircle2,
    Users,
    DollarSign,
    MessageCircle,
    Calendar as CalendarIcon,
    Copy,
     User,
    Check as CheckIcon
} from 'lucide-react';
import React, { Fragment, useMemo, useState } from 'react';

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
    data?: any;
    notifiable_type?: string;
    notifiable_id?: number;
}

interface NotificationDetailsModalProps {
    isOpen: boolean;
    onClose: () => void;
    notification: NotificationItem | null;
    onMarkAsRead: () => void;
    onNavigate: (url?: string) => void;
    onDelete: () => void;
}

// ============================================
// TYPE ICON MAP
// ============================================

const typeIconMap: Record<string, { icon: React.ReactNode; label: string; color: string }> = {
    purchase_request: {
        icon: <FileText className="h-4 w-4" />,
        label: 'Purchase Request',
        color: 'text-blue-600 dark:text-blue-400',
    },
    purchase_order: {
        icon: <Package className="h-4 w-4" />,
        label: 'Purchase Order',
        color: 'text-indigo-600 dark:text-indigo-400',
    },
    adjustment: {
        icon: <Package className="h-4 w-4" />,
        label: 'Stock Adjustment',
        color: 'text-amber-600 dark:text-amber-400',
    },
    supervisor_approval: {
        icon: <User className="h-4 w-4" />,
        label: 'Supervisor Approval',
        color: 'text-blue-600 dark:text-blue-400',
    },
    supervisor_approved: {
        icon: <CheckCircle2 className="h-4 w-4" />,
        label: 'Supervisor Approved',
        color: 'text-emerald-600 dark:text-emerald-400',
    },
    admin_approval: {
        icon: <DollarSign className="h-4 w-4" />,
        label: 'Admin Approval',
        color: 'text-amber-600 dark:text-amber-400',
    },
    admin_approved: {
        icon: <CheckCircle2 className="h-4 w-4" />,
        label: 'Admin Approved',
        color: 'text-emerald-600 dark:text-emerald-400',
    },
    funds_released: {
        icon: <DollarSign className="h-4 w-4" />,
        label: 'Funds Released',
        color: 'text-green-600 dark:text-green-400',
    },
    rejected: {
        icon: <AlertCircle className="h-4 w-4" />,
        label: 'Rejected',
        color: 'text-red-600 dark:text-red-400',
    },
    success: {
        icon: <CheckCircle2 className="h-4 w-4" />,
        label: 'Success',
        color: 'text-emerald-600 dark:text-emerald-400',
    },
    warning: {
        icon: <AlertCircle className="h-4 w-4" />,
        label: 'Warning',
        color: 'text-red-600 dark:text-red-400',
    },
    info: {
        icon: <Bell className="h-4 w-4" />,
        label: 'Information',
        color: 'text-blue-600 dark:text-blue-400',
    },
    user: {
        icon: <Users className="h-4 w-4" />,
        label: 'User Update',
        color: 'text-purple-600 dark:text-purple-400',
    },
    payment: {
        icon: <DollarSign className="h-4 w-4" />,
        label: 'Payment',
        color: 'text-emerald-600 dark:text-emerald-400',
    },
    calendar: {
        icon: <CalendarIcon className="h-4 w-4" />,
        label: 'Calendar',
        color: 'text-cyan-600 dark:text-cyan-400',
    },
    message: {
        icon: <MessageCircle className="h-4 w-4" />,
        label: 'Message',
        color: 'text-violet-600 dark:text-violet-400',
    },
};

// ============================================
// MAIN COMPONENT
// ============================================

export default function NotificationDetailsModal({
    isOpen,
    onClose,
    notification,
    onMarkAsRead,
    onNavigate,
    onDelete,
}: NotificationDetailsModalProps) {
    // Return null if notification is null
    if (!notification) return null;

    const [copied, setCopied] = useState(false);

    const formatDate = (date: string) => {
        if (!date) return 'N/A';
        try {
            return format(new Date(date), 'dd MMM yyyy, hh:mm a');
        } catch {
            return 'Invalid date';
        }
    };

    // ==========================================
    // ✅ PARSE NOTIFICATION DATA
    // ==========================================
    
    const parsedData = useMemo(() => {
        if (!notification.data) return null;
        
        // If data is already an object, return it
        if (typeof notification.data === 'object' && notification.data !== null) {
            return notification.data;
        }
        
        // If data is a string, try to parse it as JSON
        if (typeof notification.data === 'string') {
            try {
                if (notification.data.startsWith('{') || notification.data.startsWith('[')) {
                    return JSON.parse(notification.data);
                }
                return { raw: notification.data };
            } catch (error) {
                console.warn('Failed to parse notification data:', error);
                return { raw: notification.data };
            }
        }
        
        return notification.data;
    }, [notification.data]);

    // ==========================================
    // ✅ GET MESSAGE - Check multiple sources
    // ==========================================
    
    const displayMessage = useMemo(() => {
        // First check if notification has message directly
        if (notification.message) {
            return notification.message;
        }
        
        // Then check parsed data for message
        if (parsedData) {
            if (parsedData.message) {
                return parsedData.message;
            }
            if (parsedData.raw) {
                return parsedData.raw;
            }
        }
        
        return 'No message content';
    }, [notification.message, parsedData]);

    // ==========================================
    // ✅ GET TITLE - Check multiple sources
    // ==========================================
    
    const displayTitle = useMemo(() => {
        if (notification.title) {
            return notification.title;
        }
        if (parsedData && parsedData.title) {
            return parsedData.title;
        }
        return 'Notification';
    }, [notification.title, parsedData]);

    // Get type config
    const typeConfig = typeIconMap[notification.type] || typeIconMap.info;

    // Get extra data (excluding standard fields)
    const extraData = useMemo(() => {
        if (!parsedData) return [];
        
        const excludedFields = ['title', 'message', 'type', 'url', 'raw'];
        
        return Object.entries(parsedData)
            .filter(([key]) => !excludedFields.includes(key))
            .map(([key, value]) => {
                let displayValue = value;
                if (value === null || value === undefined) {
                    displayValue = 'N/A';
                } else if (typeof value === 'boolean') {
                    displayValue = value ? 'Yes' : 'No';
                } else if (typeof value === 'object') {
                    displayValue = JSON.stringify(value);
                }
                return { key, value: displayValue };
            });
    }, [parsedData]);

    // Format key for display
    const formatKey = (key: string): string => {
        return key
            .replace(/_/g, ' ')
            .replace(/([A-Z])/g, ' $1')
            .trim()
            .replace(/\b\w/g, (l) => l.toUpperCase());
    };

    // Check if there are any important fields
    const importantFields = extraData.filter(({ key }) => 
        ['pr_number', 'requisition_id', 'adjustment_id', 'order_number', 'amount', 'total', 'total_amount', 'requester', 'department', 'priority', 'status'].includes(key)
    );

    const otherFields = extraData.filter(({ key }) => 
        !['pr_number', 'requisition_id', 'adjustment_id', 'order_number', 'amount', 'total', 'total_amount', 'requester', 'department', 'priority', 'status'].includes(key)
    );

    // Copy to clipboard
    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        });
    };

    // Format currency
    const formatCurrency = (value: any) => {
        if (!value) return 'N/A';
        const num = parseFloat(value);
        if (isNaN(num)) return String(value);
        return new Intl.NumberFormat('en-ZM', {
            style: 'currency',
            currency: 'ZMW',
            minimumFractionDigits: 2,
        }).format(num);
    };

    // Get priority badge color
    const getPriorityColor = (priority: string) => {
        const colors: Record<string, string> = {
            low: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
            medium: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
            high: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
            urgent: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
        };
        return colors[priority] || 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
    };

    return (
        <Transition show={isOpen} as={Fragment}>
            <Dialog as="div" className="relative z-50" onClose={onClose}>
                <TransitionChild
                    as={Fragment}
                    enter="ease-out duration-300"
                    enterFrom="opacity-0"
                    enterTo="opacity-100"
                    leave="ease-in duration-200"
                    leaveFrom="opacity-100"
                    leaveTo="opacity-0"
                >
                    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" />
                </TransitionChild>

                <div className="fixed inset-0 overflow-y-auto">
                    <div className="flex min-h-full items-center justify-center p-4">
                        <TransitionChild
                            as={Fragment}
                            enter="ease-out duration-300"
                            enterFrom="opacity-0 scale-95"
                            enterTo="opacity-100 scale-100"
                            leave="ease-in duration-200"
                            leaveFrom="opacity-100 scale-100"
                            leaveTo="opacity-0 scale-95"
                        >
                            <DialogPanel className="relative w-full max-w-2xl transform overflow-hidden rounded-xl bg-white dark:bg-slate-900 shadow-2xl transition-all max-h-[90vh] flex flex-col">
                                {/* ========================================== */}
                                {/* HEADER */}
                                {/* ========================================== */}
                                <div className="flex-shrink-0 border-b border-slate-100 px-6 py-4 dark:border-slate-800">
                                    <div className="flex items-start justify-between">
                                        <div className="flex items-center gap-3 min-w-0">
                                            <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800 ${typeConfig.color}`}>
                                                {typeConfig.icon}
                                            </div>
                                            <div className="min-w-0">
                                                <DialogTitle className="text-base font-semibold text-slate-900 dark:text-slate-100 truncate">
                                                    {displayTitle}
                                                </DialogTitle>
                                                <div className="flex flex-wrap items-center gap-2 mt-0.5">
                                                    <span className="text-xs text-slate-500 dark:text-slate-400">
                                                        {typeConfig.label}
                                                    </span>
                                                    {!notification.read && (
                                                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-600 dark:bg-emerald-950/30 dark:text-emerald-400">
                                                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500"></span>
                                                            Unread
                                                        </span>
                                                    )}
                                                    {notification.read && (
                                                        <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                                                            <Check className="h-3 w-3" />
                                                            Read
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                        <button
                                            onClick={onClose}
                                            className="shrink-0 rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-300"
                                        >
                                            <X className="h-5 w-5" />
                                        </button>
                                    </div>
                                </div>

                                {/* ========================================== */}
                                {/* SCROLLABLE CONTENT */}
                                {/* ========================================== */}
                                <div className="flex-1 overflow-y-auto p-6">
                                    {/* ========================================== */}
                                    {/* ✅ MESSAGE - Now shows the actual message */}
                                    {/* ========================================== */}
                                    <div className="mb-6">
                                        <h4 className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-2 uppercase tracking-wider">
                                            Message
                                        </h4>
                                        <div className="rounded-lg border border-slate-100 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-800/50">
                                            <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">
                                                {displayMessage}
                                            </p>
                                        </div>
                                    </div>

                                    {/* ========================================== */}
                                    {/* ✅ IMPORTANT FIELDS */}
                                    {/* ========================================== */}
                                    {importantFields.length > 0 && (
                                        <div className="mb-6">
                                            <h4 className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-2 uppercase tracking-wider">
                                                Key Information
                                            </h4>
                                            <div className="grid grid-cols-2 gap-3">
                                                {importantFields.map(({ key, value }) => {
                                                    // Special formatting for specific fields
                                                    let displayValue = String(value);
                                                    if (key === 'total_amount' || key === 'amount' || key === 'total') {
                                                        displayValue = formatCurrency(value);
                                                    }
                                                    if (key === 'priority') {
                                                        return (
                                                            <div key={key} className="rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800/30">
                                                                <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                                                                    {formatKey(key)}
                                                                </span>
                                                                <div className="mt-1">
                                                                    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${getPriorityColor(String(value))}`}>
                                                                        {String(value).toUpperCase()}
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        );
                                                    }
                                                    return (
                                                        <div key={key} className="rounded-lg border border-blue-100 bg-blue-50 p-3 dark:border-blue-900/30 dark:bg-blue-900/20">
                                                            <span className="text-[10px] font-medium text-blue-600 dark:text-blue-400 uppercase tracking-wider">
                                                                {formatKey(key)}
                                                            </span>
                                                            <p className="text-sm font-semibold text-blue-900 dark:text-blue-300 font-mono break-all">
                                                                {displayValue}
                                                            </p>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    )}

                                    {/* ========================================== */}
                                    {/* ✅ OTHER FIELDS */}
                                    {/* ========================================== */}
                                    {otherFields.length > 0 && (
                                        <div className="mb-6">
                                            <div className="flex items-center justify-between mb-2">
                                                <h4 className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                                                    Additional Details
                                                </h4>
                                                <button
                                                    onClick={() => copyToClipboard(JSON.stringify(parsedData, null, 2))}
                                                    className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400"
                                                >
                                                    {copied ? (
                                                        <>
                                                            <CheckIcon className="h-3 w-3" />
                                                            Copied!
                                                        </>
                                                    ) : (
                                                        <>
                                                            <Copy className="h-3 w-3" />
                                                            Copy All
                                                        </>
                                                    )}
                                                </button>
                                            </div>
                                            <div className="rounded-lg border border-slate-100 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-800/50">
                                                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                                    {otherFields.map(({ key, value }) => (
                                                        <div key={key} className="flex flex-col">
                                                            <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                                                                {formatKey(key)}
                                                            </span>
                                                            <span className="text-sm text-slate-900 dark:text-slate-100 font-mono break-all">
                                                                {typeof value === 'string' && value.length > 100 
                                                                    ? value.substring(0, 100) + '...' 
                                                                    : String(value)}
                                                            </span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* Raw Data */}
                                    {parsedData && (
                                        <div className="mb-6">
                                            <h4 className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-2 uppercase tracking-wider">
                                                Raw Data
                                            </h4>
                                            <div className="rounded-lg border border-slate-200 bg-slate-100 p-3 dark:border-slate-700 dark:bg-slate-800/30">
                                                <pre className="text-xs text-slate-600 dark:text-slate-400 whitespace-pre-wrap break-all font-mono max-h-32 overflow-y-auto">
                                                    {JSON.stringify(parsedData, null, 2)}
                                                </pre>
                                            </div>
                                        </div>
                                    )}

                                    {/* Timestamps */}
                                    <div className="mb-4">
                                        <h4 className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-2 uppercase tracking-wider">
                                            Timeline
                                        </h4>
                                        <div className="flex flex-col gap-2 rounded-lg border border-slate-100 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-800/50">
                                            <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
                                                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-blue-50 dark:bg-blue-900/20">
                                                    <Calendar className="h-3.5 w-3.5 text-blue-500" />
                                                </div>
                                                <span>
                                                    Created: <span className="font-medium text-slate-700 dark:text-slate-300">
                                                        {formatDate(notification.created_at)}
                                                    </span>
                                                </span>
                                            </div>
                                            {notification.read_at && (
                                                <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
                                                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-emerald-50 dark:bg-emerald-900/20">
                                                        <Check className="h-3.5 w-3.5 text-emerald-500" />
                                                    </div>
                                                    <span>
                                                        Read: <span className="font-medium text-slate-700 dark:text-slate-300">
                                                            {formatDate(notification.read_at)}
                                                        </span>
                                                    </span>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* URL */}
                                    {notification.url && (
                                        <div className="rounded-lg border border-blue-100 bg-blue-50 p-4 dark:border-blue-900/30 dark:bg-blue-900/20">
                                            <button
                                                onClick={() => onNavigate(notification.url)}
                                                className="inline-flex items-center gap-2 text-sm font-medium text-blue-600 transition-colors hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                                            >
                                                <ExternalLink className="h-4 w-4" />
                                                View Related Item
                                            </button>
                                        </div>
                                    )}
                                </div>

                                {/* ========================================== */}
                                {/* FOOTER */}
                                {/* ========================================== */}
                                <div className="flex-shrink-0 flex items-center justify-between gap-3 border-t border-slate-100 px-6 py-4 dark:border-slate-800">
                                    <button
                                        onClick={onDelete}
                                        className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-red-600 transition-colors hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/30"
                                    >
                                        <Trash2 className="h-4 w-4" />
                                        Delete
                                    </button>
                                    <div className="flex items-center gap-2">
                                        {!notification.read && (
                                            <button
                                                onClick={onMarkAsRead}
                                                className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700"
                                            >
                                                <Check className="h-4 w-4" />
                                                Mark as Read
                                            </button>
                                        )}
                                        <button
                                            onClick={onClose}
                                            className="rounded-lg px-4 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
                                        >
                                            Close
                                        </button>
                                    </div>
                                </div>
                            </DialogPanel>
                        </TransitionChild>
                    </div>
                </div>
            </Dialog>
        </Transition>
    );
}