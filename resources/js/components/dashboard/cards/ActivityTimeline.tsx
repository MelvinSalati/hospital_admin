// components/dashboard/cards/ActivityTimeline.tsx
import React from 'react';
import { Clock, AlertCircle, CheckCircle, XCircle } from 'lucide-react';
import { DashboardCard } from './DashboardCard';

interface ActivityItem {
    id: string;
    user: string;
    action: string;
    department: string;
    time: string;
    icon: React.ReactNode;
    type?: 'info' | 'warning' | 'success' | 'error';
    amount?: string;
}

interface ActivityTimelineProps {
    activities: ActivityItem[];
    title?: string;
    icon?: string;
    maxItems?: number;
}

export const ActivityTimeline: React.FC<ActivityTimelineProps> = ({
    activities,
    title = 'Recent Activity',
    icon = '⏱️',
    maxItems = 5
}) => {
    const getTypeStyles = (type?: string) => {
        switch (type) {
            case 'warning':
                return 'bg-yellow-100 text-yellow-600 dark:bg-yellow-900/20';
            case 'success':
                return 'bg-green-100 text-green-600 dark:bg-green-900/20';
            case 'error':
                return 'bg-red-100 text-red-600 dark:bg-red-900/20';
            default:
                return 'bg-blue-100 text-blue-600 dark:bg-blue-900/20';
        }
    };

    return (
        <DashboardCard title={title} icon={icon}>
            <div className="space-y-4">
                {activities.slice(0, maxItems).map((activity) => (
                    <div
                        key={activity.id}
                        className="flex items-start gap-3 border-b border-gray-100 pb-3 last:border-0 dark:border-gray-700"
                    >
                        <div className={`rounded-full p-2 ${getTypeStyles(activity.type)}`}>
                            {activity.icon}
                        </div>
                        <div className="flex-1">
                            <div className="flex items-center justify-between">
                                <p className="font-medium text-gray-900 dark:text-white">
                                    {activity.user}
                                </p>
                                <div className="flex items-center gap-1 text-xs text-gray-500">
                                    <Clock className="h-3 w-3" />
                                    <span>{activity.time}</span>
                                </div>
                            </div>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                                {activity.action}
                            </p>
                            <p className="text-xs text-gray-500">
                                {activity.department}
                                {activity.amount && (
                                    <span className="ml-2 font-medium text-green-600">
                                        {activity.amount}
                                    </span>
                                )}
                            </p>
                        </div>
                    </div>
                ))}
            </div>
        </DashboardCard>
    );
};