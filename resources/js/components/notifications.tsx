// resources/js/components/Notifications.tsx

import { usePage, router } from '@inertiajs/react';
import { 
    Bell, 
    Package, 
    AlertCircle, 
    CheckCircle2,
    Calendar,
    MessageCircle,
    Check,
    X,
    FileText,
    ShoppingBag,
    Users,
    DollarSign,
    Clock,
    ArrowRight
} from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useEcho } from './EchoProvider';

// Types
interface Notification {
    id: string;
    title: string;
    message: string;
    time: string;
    read: boolean;
    type: 'message' | 'success' | 'calendar' | 'info' | 'adjustment' | 'warning' | 'purchase_request' | 'purchase_order' | 'user' | 'payment';
    url?: string;
    adjustment_number?: string;
    adjustment_id?: number;
    pr_number?: string;
    total_amount?: number;
}

// Icon mapping with health blue accents
const iconMap: Record<string, { icon: React.ReactNode; bg: string; color: string }> = {
    purchase_request: { 
        icon: <FileText className="h-3.5 w-3.5" />, 
        bg: 'bg-blue-50 dark:bg-blue-950/30', 
        color: 'text-blue-600 dark:text-blue-400' 
    },
    purchase_order: { 
        icon: <ShoppingBag className="h-3.5 w-3.5" />, 
        bg: 'bg-blue-50 dark:bg-blue-950/30', 
        color: 'text-blue-600 dark:text-blue-400' 
    },
    adjustment: { 
        icon: <Package className="h-3.5 w-3.5" />, 
        bg: 'bg-blue-50 dark:bg-blue-950/30', 
        color: 'text-blue-600 dark:text-blue-400' 
    },
    success: { 
        icon: <CheckCircle2 className="h-3.5 w-3.5" />, 
        bg: 'bg-emerald-50 dark:bg-emerald-950/30', 
        color: 'text-emerald-600 dark:text-emerald-400' 
    },
    calendar: { 
        icon: <Calendar className="h-3.5 w-3.5" />, 
        bg: 'bg-blue-50 dark:bg-blue-950/30', 
        color: 'text-blue-600 dark:text-blue-400' 
    },
    message: { 
        icon: <MessageCircle className="h-3.5 w-3.5" />, 
        bg: 'bg-blue-50 dark:bg-blue-950/30', 
        color: 'text-blue-600 dark:text-blue-400' 
    },
    warning: { 
        icon: <AlertCircle className="h-3.5 w-3.5" />, 
        bg: 'bg-amber-50 dark:bg-amber-950/30', 
        color: 'text-amber-600 dark:text-amber-400' 
    },
    user: { 
        icon: <Users className="h-3.5 w-3.5" />, 
        bg: 'bg-blue-50 dark:bg-blue-950/30', 
        color: 'text-blue-600 dark:text-blue-400' 
    },
    payment: { 
        icon: <DollarSign className="h-3.5 w-3.5" />, 
        bg: 'bg-emerald-50 dark:bg-emerald-950/30', 
        color: 'text-emerald-600 dark:text-emerald-400' 
    },
    info: { 
        icon: <Bell className="h-3.5 w-3.5" />, 
        bg: 'bg-blue-50 dark:bg-blue-950/30', 
        color: 'text-blue-600 dark:text-blue-400' 
    },
};

export function Notifications() {
    const { props } = usePage();
    const userId = props.auth?.user?.id;
    
    // Safely use Echo with try/catch
    let echo = null;
    let isConnected = false;
    
    try {
        const echoContext = useEcho();
        echo = echoContext.echo;
        isConnected = echoContext.isConnected;
    } catch (error) {
        console.warn('⚠️ Echo not available, notifications will use polling');
    }
    
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [showDropdown, setShowDropdown] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const unreadCount = notifications.filter(n => !n.read).length;
    const soundRef = useRef<HTMLAudioElement | null>(null);
    const notificationSoundUrl = '/notification.mp3';

    // Load sound
    useEffect(() => {
        try {
            soundRef.current = new Audio(notificationSoundUrl);
        } catch (error) {
            console.warn('⚠️ Could not load notification sound:', error);
        }
    }, []);

    // Fetch notifications from database
    const fetchNotifications = async () => {
        try {
            const response = await fetch('/notifications/unread');
            if (!response.ok) throw new Error('Failed to fetch notifications');
            const data = await response.json();
            setNotifications(data);
        } catch (error) {
            console.error('❌ Failed to fetch notifications:', error);
        } finally {
            setIsLoading(false);
        }
    };

    // Initial fetch and polling
    useEffect(() => {
        if (userId) {
            fetchNotifications();
            const interval = setInterval(fetchNotifications, 30000);
            return () => clearInterval(interval);
        }
    }, [userId]);

    // REAL-TIME NOTIFICATIONS via Echo
    useEffect(() => {
        if (!userId || !echo || !isConnected) {
            console.log('⏳ Waiting for Echo connection...');
            return;
        }

        console.log('🔔 Listening for notifications for user:', userId);

        try {
            const channel = echo.private(`App.Models.User.${userId}`);
            
            channel.notification((notification: any) => {
                console.log('📨 New notification received:', notification);
                
                const newNotif: Notification = {
                    id: notification.id || Date.now().toString(),
                    title: notification.title || 'New Notification',
                    message: notification.message || '',
                    time: 'Just now',
                    read: false,
                    type: notification.type || 'info',
                    url: notification.url,
                    adjustment_number: notification.adjustment_number,
                    adjustment_id: notification.adjustment_id,
                    pr_number: notification.pr_number,
                    total_amount: notification.total_amount,
                };
                
                setNotifications(prev => [newNotif, ...prev]);
                
                try {
                    soundRef.current?.play().catch(() => {});
                } catch (error) {
                    // Ignore sound errors
                }
                
                if ('Notification' in window && Notification.permission === 'granted') {
                    try {
                        const browserNotif = new Notification(
                            notification.title || 'New Notification',
                            {
                                body: notification.message || '',
                                icon: '/favicon.ico',
                            }
                        );
                        
                        browserNotif.onclick = () => {
                            window.focus();
                            if (notification.url) {
                                router.visit(notification.url);
                            }
                        };
                    } catch (error) {
                        console.warn('⚠️ Could not show browser notification:', error);
                    }
                }
            });
            
            return () => {
                try {
                    echo.leaveChannel(`App.Models.User.${userId}`);
                } catch (error) {
                    // Ignore cleanup errors
                }
            };
        } catch (error) {
            console.error('❌ Echo error:', error);
        }
    }, [userId, echo, isConnected]);

    // Mark notification as read
    const markAsRead = async (id: string) => {
        try {
            const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '';
            
            const response = await fetch(`/notifications/${id}/mark-as-read`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': csrfToken,
                },
            });

            if (!response.ok) throw new Error('Failed to mark as read');

            setNotifications(prev => 
                prev.map(n => n.id === id ? { ...n, read: true } : n)
            );
        } catch (error) {
            console.error('❌ Failed to mark as read:', error);
        }
    };

    // Mark all as read
    const markAllAsRead = async () => {
        try {
            const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '';
            
            const response = await fetch('/notifications/mark-all-as-read', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': csrfToken,
                },
            });

            if (!response.ok) throw new Error('Failed to mark all as read');

            setNotifications(prev => 
                prev.map(n => ({ ...n, read: true }))
            );
        } catch (error) {
            console.error('❌ Failed to mark all as read:', error);
        }
    };

    // Delete notification
    const deleteNotification = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        
        try {
            const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '';
            
            const response = await fetch(`/notifications/${id}`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': csrfToken,
                },
            });

            if (!response.ok) throw new Error('Failed to delete notification');

            setNotifications(prev => prev.filter(n => n.id !== id));
        } catch (error) {
            console.error('❌ Failed to delete notification:', error);
        }
    };

    // Handle notification click
    const handleNotificationClick = (notification: Notification) => {
        if (!notification.read) {
            markAsRead(notification.id);
        }
        
        if (notification.url) {
            router.visit(notification.url);
        } else if (notification.adjustment_id) {
            router.visit(`/adjustments/${notification.adjustment_id}`);
        }
        
        setShowDropdown(false);
    };

    // Navigate to all notifications
    const handleViewAll = () => {
        router.visit('/notifications');
        setShowDropdown(false);
    };

    // Request notification permission
    useEffect(() => {
        if ('Notification' in window && Notification.permission === 'default') {
            Notification.requestPermission().then(permission => {
                console.log('🔔 Notification permission:', permission);
            });
        }
    }, []);

    // Format currency
    const formatCurrency = (amount?: number) => {
        if (!amount) return '';
        return new Intl.NumberFormat('en-ZM', {
            style: 'currency',
            currency: 'ZMW',
            minimumFractionDigits: 2,
        }).format(amount);
    };

    return (
        <DropdownMenu open={showDropdown} onOpenChange={setShowDropdown}>
            <DropdownMenuTrigger asChild>
                <Button 
                    variant="ghost" 
                    size="icon" 
                    className="relative h-9 w-9 rounded-lg transition-colors hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                    <Bell className="h-[18px] w-[18px] text-slate-600 dark:text-slate-400" />
                    {unreadCount > 0 && (
                        <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-600 text-[10px] font-medium text-white shadow-sm">
                            {unreadCount > 99 ? '99+' : unreadCount}
                        </span>
                    )}
                </Button>
            </DropdownMenuTrigger>
            
            <DropdownMenuContent 
                align="end" 
                className="w-[380px] overflow-hidden rounded-lg border border-slate-200 bg-white p-0 shadow-lg dark:border-slate-700 dark:bg-slate-900"
            >
                {/* Header */}
                <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3 dark:border-slate-800">
                    <div className="flex items-center gap-2.5">
                        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-50 dark:bg-blue-950/30">
                            <Bell className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div>
                            <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                                Notifications
                            </p>
                            {unreadCount > 0 && (
                                <p className="text-[11px] text-blue-600 dark:text-blue-400">
                                    {unreadCount} unread
                                </p>
                            )}
                        </div>
                    </div>
                    {unreadCount > 0 && (
                        <button 
                            onClick={markAllAsRead}
                            className="flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium text-blue-600 transition-colors hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-950/30"
                        >
                            <Check className="h-3 w-3" />
                            Mark all read
                        </button>
                    )}
                </div>
                
                {/* Notification List */}
                <div className="max-h-[340px] overflow-y-auto">
                    {isLoading ? (
                        <div className="flex items-center justify-center py-10">
                            <div className="h-5 w-5 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
                        </div>
                    ) : notifications.length === 0 ? (
                        <div className="flex flex-col items-center justify-center gap-2 py-10 text-center">
                            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-800">
                                <Bell className="h-5 w-5 text-slate-400 dark:text-slate-500" />
                            </div>
                            <p className="text-sm text-slate-500 dark:text-slate-400">
                                No notifications
                            </p>
                        </div>
                    ) : (
                        notifications.map(notification => {
                            const icon = iconMap[notification.type] || iconMap.info;
                            return (
                                <div
                                    key={notification.id}
                                    onClick={() => handleNotificationClick(notification)}
                                    className={`group relative flex cursor-pointer items-start gap-3 border-b border-slate-100 px-4 py-3 transition-colors last:border-0 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800/50 ${
                                        !notification.read ? 'bg-blue-50/30 dark:bg-blue-950/10' : ''
                                    }`}
                                >
                                    {/* ✅ Green dot - visible and contained */}
                                    {!notification.read && (
                                        <div className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center justify-center">
                                            <div className="h-2 w-2 rounded-full bg-emerald-500 shadow-sm shadow-emerald-500/50 ring-2 ring-emerald-500/20 dark:ring-emerald-400/20"></div>
                                        </div>
                                    )}
                                    
                                    {/* Content - with padding to accommodate dot */}
                                    <div className="flex-1 min-w-0 pl-5">
                                        <div className="flex items-start justify-between gap-2">
                                            <div className="flex items-start gap-3">
                                                {/* Icon */}
                                                <div className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${icon.bg} ${icon.color}`}>
                                                    {icon.icon}
                                                </div>
                                                
                                                {/* Text Content */}
                                                <div className="min-w-0 flex-1">
                                                    <div className="flex items-start justify-between gap-2">
                                                        <p className={`text-sm leading-snug ${
                                                            !notification.read 
                                                                ? 'font-medium text-slate-900 dark:text-slate-100' 
                                                                : 'text-slate-700 dark:text-slate-300'
                                                        }`}>
                                                            {notification.title}
                                                        </p>
                                                        <span className="mt-0.5 shrink-0 text-[11px] text-slate-400 dark:text-slate-500">
                                                            {notification.time}
                                                        </span>
                                                    </div>
                                                    {notification.message && (
                                                        <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                                                            {notification.message}
                                                        </p>
                                                    )}
                                                    {(notification.pr_number || notification.adjustment_number) && (
                                                        <div className="mt-1 flex items-center gap-2 text-xs font-mono text-blue-600 dark:text-blue-400">
                                                            <span>{notification.pr_number || notification.adjustment_number}</span>
                                                            {notification.total_amount && (
                                                                <>
                                                                    <span className="text-slate-300 dark:text-slate-600">•</span>
                                                                    <span>{formatCurrency(notification.total_amount)}</span>
                                                                </>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    
                                    {/* Delete button */}
                                    <button
                                        onClick={(e) => deleteNotification(notification.id, e)}
                                        className="absolute right-2 top-2 rounded p-1 opacity-0 transition-opacity hover:bg-slate-100 group-hover:opacity-100 dark:hover:bg-slate-800"
                                    >
                                        <X className="h-3.5 w-3.5 text-slate-400 dark:text-slate-500" />
                                    </button>
                                </div>
                            );
                        })
                    )}
                </div>
                
                {/* Footer - View All */}
                <div className="border-t border-slate-100 dark:border-slate-800">
                    <button
                        onClick={handleViewAll}
                        className="flex w-full items-center justify-between px-4 py-2.5 text-sm font-medium text-blue-600 transition-colors hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-950/30"
                    >
                        <span>View all notifications</span>
                        <ArrowRight className="h-4 w-4" />
                    </button>
                </div>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}