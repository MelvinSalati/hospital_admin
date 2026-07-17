import { Breadcrumbs } from '@/components/breadcrumbs';
import { SidebarTrigger } from '@/components/ui/sidebar';
import type { BreadcrumbItem as BreadcrumbItemType } from '@/types';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
    Bell,
    User,
    LogOut,
    Check,
    MessageCircle,
    CheckCircle2,
    Calendar,
} from 'lucide-react';
import { useState } from 'react';
import { usePage, router } from '@inertiajs/react';

const mockNotifications = [
    {
        id: 1,
        title: 'New message',
        description: 'You have a new message from John',
        time: '5 min ago',
        read: false,
        type: 'message',
    },
    {
        id: 2,
        title: 'Task completed',
        description: 'Project milestone reached',
        time: '1 hour ago',
        read: false,
        type: 'success',
    },
    {
        id: 3,
        title: 'Meeting reminder',
        description: 'Team meeting in 30 minutes',
        time: '2 hours ago',
        read: true,
        type: 'calendar',
    },
];

const notificationIconMap: Record<
    string,
    { icon: React.ReactNode; bg: string; color: string }
> = {
    message: {
        icon: <MessageCircle className="h-3.5 w-3.5" />,
        bg: 'bg-violet-100 dark:bg-violet-900/40',
        color: 'text-violet-600 dark:text-violet-400',
    },
    success: {
        icon: <CheckCircle2 className="h-3.5 w-3.5" />,
        bg: 'bg-emerald-100 dark:bg-emerald-900/40',
        color: 'text-emerald-600 dark:text-emerald-400',
    },
    calendar: {
        icon: <Calendar className="h-3.5 w-3.5" />,
        bg: 'bg-sky-100 dark:bg-sky-900/40',
        color: 'text-sky-600 dark:text-sky-400',
    },
};

export function AppSidebarHeader({
    breadcrumbs = [],
}: {
    breadcrumbs?: BreadcrumbItemType[];
}) {
    const [notifications, setNotifications] = useState(mockNotifications);
    const [showNotifications, setShowNotifications] = useState(false);

    const unreadCount = notifications.filter((n) => !n.read).length;

    const markAsRead = (id: number) => {
        setNotifications(
            notifications.map((n) => (n.id === id ? { ...n, read: true } : n)),
        );
    };

    const markAllAsRead = () => {
        setNotifications(notifications.map((n) => ({ ...n, read: true })));
    };

    const { props } = usePage();

    const handleLogout = () => router.post('/logout');
    const handleProfile = () => router.visit('/profile');
    const handleViewAllNotifications = () => {
        router.visit('/notifications');
        setShowNotifications(false);
    };
    return (
        <header className="flex h-16 shrink-0 items-center justify-between gap-2 border-b border-sidebar-border/50 px-6 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12 md:px-4">
            <div className="flex items-center gap-2">
                <SidebarTrigger className="-ml-1" />
                <Breadcrumbs breadcrumbs={breadcrumbs} />
            </div>

            <div className="flex items-center gap-3">
                {/* Notifications Dropdown */}
                <DropdownMenu
                    open={showNotifications}
                    onOpenChange={setShowNotifications}
                >
                    <DropdownMenuTrigger asChild>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="relative h-9 w-9 rounded-xl transition-colors hover:bg-violet-50 dark:hover:bg-violet-950/30"
                        >
                            <Bell className="h-[18px] w-[18px] text-muted-foreground" />
                            {unreadCount > 0 && (
                                <span className="absolute -top-0.5 -right-0.5 flex h-[18px] w-[18px] items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500 text-[10px] font-semibold text-white shadow-sm ring-2 shadow-violet-500/40 ring-background">
                                    {unreadCount}
                                </span>
                            )}
                        </Button>
                    </DropdownMenuTrigger>

                    <DropdownMenuContent
                        align="end"
                        className="w-[340px] overflow-hidden rounded-2xl border border-border/60 bg-background p-0 shadow-xl shadow-black/10 dark:shadow-black/30"
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between border-b border-border/50 bg-gradient-to-r from-violet-500/10 via-fuchsia-500/5 to-transparent px-4 py-3.5">
                            <div className="flex items-center gap-2.5">
                                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500 to-fuchsia-500 shadow-sm shadow-violet-500/30">
                                    <Bell className="h-3.5 w-3.5 text-white" />
                                </div>
                                <div>
                                    <p className="text-sm leading-none font-semibold">
                                        Notifications
                                    </p>
                                    {unreadCount > 0 && (
                                        <p className="mt-0.5 text-[11px] leading-none text-muted-foreground">
                                            {unreadCount} unread
                                        </p>
                                    )}
                                </div>
                            </div>
                            {unreadCount > 0 && (
                                <button
                                    onClick={markAllAsRead}
                                    className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-[11px] font-medium text-violet-600 transition-colors hover:bg-violet-100 dark:text-violet-400 dark:hover:bg-violet-900/40"
                                >
                                    <Check className="h-3 w-3" />
                                    Mark all read
                                </button>
                            )}
                        </div>

                        {/* Notification list */}
                        <div className="max-h-[340px] overflow-y-auto">
                            {notifications.length > 0 ? (
                                <div className="divide-y divide-border/40">
                                    {notifications.map((notification) => {
                                        const meta =
                                            notificationIconMap[
                                                notification.type
                                            ] ?? notificationIconMap['message'];
                                        return (
                                            <div
                                                key={notification.id}
                                                onClick={() =>
                                                    markAsRead(notification.id)
                                                }
                                                className={`group relative flex cursor-pointer items-start gap-3 px-4 py-3.5 transition-colors hover:bg-muted/50 ${
                                                    !notification.read
                                                        ? 'bg-violet-50/50 dark:bg-violet-950/20'
                                                        : ''
                                                }`}
                                            >
                                                {/* Unread indicator */}
                                                {!notification.read && (
                                                    <span className="absolute top-1/2 left-2 h-1.5 w-1.5 -translate-y-1/2 rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500" />
                                                )}

                                                {/* Icon */}
                                                <div
                                                    className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${meta.bg} ${meta.color}`}
                                                >
                                                    {meta.icon}
                                                </div>

                                                {/* Content */}
                                                <div className="min-w-0 flex-1">
                                                    <div className="flex items-start justify-between gap-2">
                                                        <p
                                                            className={`text-sm leading-snug ${!notification.read ? 'font-semibold' : 'font-medium'}`}
                                                        >
                                                            {notification.title}
                                                        </p>
                                                        <span className="mt-0.5 shrink-0 text-[11px] whitespace-nowrap text-muted-foreground">
                                                            {notification.time}
                                                        </span>
                                                    </div>
                                                    <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                                                        {
                                                            notification.description
                                                        }
                                                    </p>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            ) : (
                                <div className="flex flex-col items-center justify-center gap-2 py-10 text-center">
                                    <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-muted">
                                        <Bell className="h-5 w-5 text-muted-foreground/50" />
                                    </div>
                                    <p className="text-sm text-muted-foreground">
                                        You're all caught up!
                                    </p>
                                </div>
                            )}
                        </div>

                        {/* Footer */}
                        <div className="border-t border-border/50 bg-muted/20 px-4 py-2.5">
                            <button
                                onClick={handleViewAllNotifications}
                                className="w-full rounded-lg py-1.5 text-center text-xs font-medium text-violet-600 transition-colors hover:text-violet-700 dark:text-violet-400 dark:hover:text-violet-300"
                            >
                                View all notifications →
                            </button>
                        </div>
                    </DropdownMenuContent>
                </DropdownMenu>

                {/* Profile Dropdown */}
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <button className="flex items-center gap-2 rounded-full focus:ring-2 focus:ring-sidebar-ring focus:outline-none">
                            <Avatar className="h-9 w-9 ring-2 ring-violet-200 dark:ring-violet-800/50">
                                <AvatarImage
                                    src="/avatars/user.jpg"
                                    alt="User"
                                />
                                <AvatarFallback className="bg-gradient-to-br from-violet-500 to-fuchsia-500 text-sm font-semibold text-white">
                                    {props.auth.user.name
                                        .charAt(0)
                                        .toUpperCase()}
                                </AvatarFallback>
                            </Avatar>
                            <span className="text-sm font-medium">
                                {props.auth.user.name}
                            </span>
                        </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                        align="end"
                        className="w-56 rounded-xl bg-background shadow-xl shadow-black/10"
                    >
                        <DropdownMenuLabel className="text-center font-semibold">
                            Manage Account
                        </DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                            onClick={handleProfile}
                            className="mt-2 cursor-pointer rounded-lg"
                        >
                            <User className="mr-2 h-4 w-4" />
                            <span>Profile manager</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem
                            onClick={handleLogout}
                            className="mt-1 mb-2 cursor-pointer rounded-lg text-red-500 focus:text-red-500"
                        >
                            <LogOut className="mr-2 h-4 w-4" />
                            <span>Logout</span>
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
        </header>
    );
}
