// resources/js/pages/Notifications/Index.tsx
import { useState } from 'react';
import { usePage, router } from '@inertiajs/react';
import { Bell, Package, CheckCircle2, AlertCircle, Calendar, MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export default function NotificationsIndex() {
    const { notifications } = usePage().props as any;
    const [loading, setLoading] = useState(false);

    const handleMarkAsRead = async (id: string) => {
        setLoading(true);
        try {
            await fetch(`/notifications/${id}/mark-as-read`, {
                method: 'POST',
                headers: {
                    'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '',
                },
            });
            router.reload();
        } catch (error) {
            console.error('Failed to mark as read:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Delete this notification?')) return;
        
        setLoading(true);
        try {
            await fetch(`/notifications/${id}`, {
                method: 'DELETE',
                headers: {
                    'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '',
                },
            });
            router.reload();
        } catch (error) {
            console.error('Failed to delete:', error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="container mx-auto py-8 max-w-4xl">
            <h1 className="text-2xl font-bold mb-6 flex items-center gap-2">
                <Bell className="h-6 w-6" />
                Notifications
            </h1>

            <div className="space-y-4">
                {notifications.data.map((notification: any) => {
                    const data = notification.data;
                    return (
                        <Card key={notification.id} className="p-4 relative">
                            <div className="flex items-start gap-4">
                                <div className="mt-1">
                                    {data.type === 'adjustment' && <Package className="h-5 w-5 text-amber-500" />}
                                    {data.type === 'success' && <CheckCircle2 className="h-5 w-5 text-emerald-500" />}
                                    {data.type === 'warning' && <AlertCircle className="h-5 w-5 text-red-500" />}
                                    {data.type === 'calendar' && <Calendar className="h-5 w-5 text-sky-500" />}
                                    {data.type === 'message' && <MessageCircle className="h-5 w-5 text-violet-500" />}
                                    {!data.type && <Bell className="h-5 w-5 text-gray-500" />}
                                </div>

                                <div className="flex-1">
                                    <h3 className="font-semibold">{data.title}</h3>
                                    <p className="text-sm text-muted-foreground">{data.message}</p>
                                    <span className="text-xs text-muted-foreground">
                                        {new Date(notification.created_at).toLocaleString()}
                                    </span>
                                </div>

                                <div className="flex items-center gap-2">
                                    {!notification.read_at && (
                                        <Badge className="bg-violet-500">Unread</Badge>
                                    )}
                                    <div className="flex gap-1">
                                        {!notification.read_at && (
                                            <Button
                                                size="sm"
                                                variant="ghost"
                                                onClick={() => handleMarkAsRead(notification.id)}
                                                disabled={loading}
                                            >
                                                Mark as read
                                            </Button>
                                        )}
                                        <Button
                                            size="sm"
                                            variant="ghost"
                                            className="text-red-500 hover:text-red-700"
                                            onClick={() => handleDelete(notification.id)}
                                            disabled={loading}
                                        >
                                            Delete
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        </Card>
                    );
                })}
            </div>
        </div>
    );
}