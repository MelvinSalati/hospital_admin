// resources/js/components/NotificationProvider.tsx
import { ReactNode, useEffect } from 'react';
import { usePage } from '@inertiajs/react';
import { useEcho } from '@/components/context/EchoContext';
import { toast } from 'react-hot-toast';
import { router } from '@inertiajs/react';

interface NotificationProviderProps {
    children: ReactNode;
}

interface Notification {
    id: string;
    title?: string;
    message?: string;
    data?: any;
    read_at?: string | null;
    created_at?: string;
    type?: string;
    url?: string;
    adjustment_id?: number;
    adjustment_number?: string;
}

export function NotificationProvider({ children }: NotificationProviderProps) {
    const { props } = usePage();
    const userId = props.auth?.user?.id;
    const { echo, isConnected } = useEcho();

    useEffect(() => {
        if (!userId || !echo || !isConnected) {
            console.log('⏳ Waiting for Echo to be ready...');
            return;
        }

        console.log('🔔 Setting up Echo notifications for user:', userId);

        try {
            // Subscribe to private channel
            const channel = echo.private(`App.Models.User.${userId}`);

            // Listen for notifications
            channel.notification((notification: Notification) => {
                console.log('📨 Real-time notification received:', notification);

                // Dispatch custom event for other components
                window.dispatchEvent(
                    new CustomEvent('new-notification', {
                        detail: notification,
                    })
                );

                // Show toast notification
                toast.success(notification.title || 'New Notification', {
                    duration: 5000,
                    position: 'top-right',
                    onClick: () => {
                        if (notification.url) {
                            router.visit(notification.url);
                        }
                    },
                });

                // Show browser notification
                if ('Notification' in window && Notification.permission === 'granted') {
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
                }
            });

            // Also listen for broadcast events
            channel.listen('.Illuminate\\Notifications\\Events\\BroadcastNotificationCreated', (data: any) => {
                console.log('📢 Broadcast notification event:', data);
            });

        } catch (error) {
            console.error('❌ Failed to setup Echo notifications:', error);
        }

        // Cleanup
        return () => {
            if (echo && userId) {
                try {
                    echo.leaveChannel(`App.Models.User.${userId}`);
                } catch (e) {
                    // Ignore
                }
            }
        };
    }, [userId, echo, isConnected]);

    // Request notification permission
    useEffect(() => {
        if ('Notification' in window && Notification.permission === 'default') {
            Notification.requestPermission();
        }
    }, []);

    return <>{children}</>;
}