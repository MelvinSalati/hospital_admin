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
    Settings,
    Check,
    X,
    ChevronDown,
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { usePage, Link, router } from '@inertiajs/react';
import { motion, AnimatePresence } from 'framer-motion';

// Mock notifications - replace with real data from your backend
const mockNotifications = [
    {
        id: 1,
        title: 'New message',
        description: 'You have a new message from John',
        time: '5 min ago',
        read: false,
    },
    {
        id: 2,
        title: 'Task completed',
        description: 'Project milestone reached',
        time: '1 hour ago',
        read: false,
    },
    {
        id: 3,
        title: 'Meeting reminder',
        description: 'Team meeting in 30 minutes',
        time: '2 hours ago',
        read: true,
    },
];

export function AppSidebarHeader({
    breadcrumbs = [],
}: {
    breadcrumbs?: BreadcrumbItemType[];
}) {
    const [notifications, setNotifications] = useState(mockNotifications);
    const [showNotifications, setShowNotifications] = useState(false);
    const [newNotification, setNewNotification] = useState<
        (typeof mockNotifications)[0] | null
    >(null);

    const unreadCount = notifications.filter((n) => !n.read).length;

    const markAsRead = (id: number) => {
        setNotifications(
            notifications.map((n) => (n.id === id ? { ...n, read: true } : n)),
        );
    };

    const markAllAsRead = () => {
        setNotifications(notifications.map((n) => ({ ...n, read: true })));
    };

    // Simulate new notification (for demo purposes)
    useEffect(() => {
        const interval = setInterval(() => {
            if (Math.random() > 0.7) {
                // 30% chance every 10 seconds
                const newNotif = {
                    id: Date.now(),
                    title: 'New alert',
                    description: 'This is a slide-up notification',
                    time: 'just now',
                    read: false,
                };
                setNewNotification(newNotif);
                setNotifications((prev) => [newNotif, ...prev]);

                // Clear the slide-up notification after animation
                setTimeout(() => {
                    setNewNotification(null);
                }, 3000);
            }
        }, 10000);

        return () => clearInterval(interval);
    }, []);

    const { props } = usePage();
    const authUser = props.auth?.user;

    const getFullName = () => {
        if (!authUser) return 'User';
        // Combine first name and last name if they exist, otherwise use name
        if (authUser.first_name && authUser.last_name) {
            return `${authUser.first_name} ${authUser.last_name}`;
        }
        return authUser.name || 'User';
    };

    const handleLogout = (e: React.MouseEvent) => {
        // e.preventDefault();
        router.post('/logout');
    };

    const handleViewAllNotifications = (e: React.MouseEvent) => {
        // e.preventDefault();
        router.get('/notifications');
    };

    return (
        <header className="flex h-16 shrink-0 items-center justify-between gap-2 border-b border-sidebar-border/50 px-6 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12 md:px-4">
            <div className="flex items-center gap-2">
                <SidebarTrigger className="-ml-1" />
                <Breadcrumbs breadcrumbs={breadcrumbs} />
            </div>

            <div className="flex items-center">
                {/* Notifications Dropdown */}
                <DropdownMenu
                    open={showNotifications}
                    onOpenChange={setShowNotifications}
                >
                    <DropdownMenuTrigger asChild>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="relative"
                        >
                            <Bell className="h-5 w-5" />
                            {unreadCount > 0 && (
                                <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs text-white">
                                    {unreadCount}
                                </span>
                            )}
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-80">
                        <DropdownMenuLabel className="flex items-center justify-between">
                            <span>Notifications</span>
                            {unreadCount > 0 && (
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-auto text-xs"
                                    onClick={markAllAsRead}
                                >
                                    <Check className="mr-1 h-3 w-3" />
                                    Mark all as read
                                </Button>
                            )}
                        </DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <div className="max-h-96 overflow-y-auto">
                            {notifications.length > 0 ? (
                                notifications.map((notification) => (
                                    <DropdownMenuItem
                                        key={notification.id}
                                        className={`flex cursor-pointer flex-col items-start p-3 ${
                                            !notification.read
                                                ? 'bg-muted/50'
                                                : ''
                                        }`}
                                        onClick={() =>
                                            markAsRead(notification.id)
                                        }
                                    >
                                        <div className="flex w-full items-center justify-between">
                                            <span className="font-medium">
                                                {notification.title}
                                            </span>
                                            <span className="text-xs text-muted-foreground">
                                                {notification.time}
                                            </span>
                                        </div>
                                        <p className="text-sm text-muted-foreground">
                                            {notification.description}
                                        </p>
                                    </DropdownMenuItem>
                                ))
                            ) : (
                                <div className="p-4 text-center text-sm text-muted-foreground">
                                    No notifications
                                </div>
                            )}
                        </div>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                            className="justify-center text-sm text-muted-foreground cursor-pointer"
                            onClick={handleViewAllNotifications}
                        >
                            View all notifications
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>

                {/* 180px spacer */}
                <div className="w-[180px]" />

                {/* Profile Dropdown */}
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <button className="flex items-center gap-3 rounded-full px-2 py-1 transition-colors hover:bg-sidebar-accent/50 focus:ring-2 focus:ring-sidebar-ring focus:outline-none">
                            <Avatar className="h-10 w-10 bg-gray-600">
                                <AvatarImage
                                    src={authUser?.avatar || '/avatars/default.jpg'}
                                    alt={getFullName()}
                                />
                                <AvatarFallback>
                                    {getFullName().charAt(0).toUpperCase()}
                                </AvatarFallback>
                            </Avatar>
                            <div className="flex flex-col items-start text-sm">
                                <span className="leading-none font-medium">
                                    {getFullName()}
                                </span>
                                {authUser?.email && (
                                    <span className="mt-1 text-xs text-muted-foreground">
                                        {authUser.email}
                                    </span>
                                )}
                            </div>
                            <ChevronDown className="h-4 w-4 text-muted-foreground" />
                        </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-64">
                        <DropdownMenuLabel className="font-normal">
                            <div className="flex flex-col space-y-1">
                                <p className="text-sm leading-none font-medium">
                                    {getFullName()}
                                </p>
                                <p className="text-xs leading-none text-muted-foreground">
                                    {authUser?.email || 'No email provided'}
                                </p>
                            </div>
                        </DropdownMenuLabel>
                        {/* <DropdownMenuSeparator /> */}
                        
                        {/* Account Link - Fixed version */}
                        <DropdownMenuItem  className='p-2'>
                            <Link
                                href="/users/account-manager"
                                className="flex w-full items-center cursor-pointer"
                            >
                                <User className="mr-2 h-4 w-4" />
                                <span className="font-bold">Account</span>
                            </Link>
                        </DropdownMenuItem>
                        
                        {/* <DropdownMenuSeparator /> */}

                        {/* Settings Link */}
                        <DropdownMenuItem asChild>
                            <Link
                                href="/settings"
                                className="flex w-full items-center cursor-pointer"
                            >
                                <Settings className="mr-2 h-4 w-4" />
                                <span>Settings</span>
                            </Link>
                        </DropdownMenuItem>
                        
                        {/* <DropdownMenuSeparator /> */}

                        {/* Logout Button */}
                        <DropdownMenuItem
                            className="cursor-pointer text-red-600 focus:text-red-600"
                            onClick={()=>router.post('/logout')}
                        >
                            <LogOut className="mr-2 h-4 w-4" />
                            <span>Logout</span>
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>

            {/* Slide-up Notification */}
            <AnimatePresence>
                {newNotification && (
                    <motion.div
                        initial={{ y: 50, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: -50, opacity: 0 }}
                        transition={{
                            type: 'spring',
                            stiffness: 500,
                            damping: 30,
                        }}
                        className="fixed right-4 bottom-4 z-50 max-w-sm rounded-lg bg-sidebar-primary text-sidebar-primary-foreground shadow-lg"
                    >
                        <div className="p-4">
                            <div className="flex items-start gap-3">
                                <Bell className="mt-0.5 h-5 w-5" />
                                <div className="flex-1">
                                    <h4 className="font-medium">
                                        {newNotification.title}
                                    </h4>
                                    <p className="text-sm opacity-90">
                                        {newNotification.description}
                                    </p>
                                    <p className="mt-1 text-xs opacity-75">
                                        {newNotification.time}
                                    </p>
                                </div>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-6 w-6 text-sidebar-primary-foreground/70 hover:bg-sidebar-primary/90 hover:text-sidebar-primary-foreground"
                                    onClick={() => setNewNotification(null)}
                                >
                                    <X className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </header>
    );
}