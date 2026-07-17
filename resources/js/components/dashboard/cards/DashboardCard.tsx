// components/dashboard/cards/DashboardCard.tsx
import React from 'react';
import { Link } from '@inertiajs/react';

interface DashboardCardProps {
    title: string;
    icon?: React.ReactNode | string;
    children: React.ReactNode;
    action?: {
        label: string;
        href: string;
    };
    className?: string;
}

export const DashboardCard: React.FC<DashboardCardProps> = ({
    title,
    icon,
    children,
    action,
    className = ''
}) => {
    return (
        <div className={`rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800 ${className}`}>
            <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    {icon && (
                        typeof icon === 'string' 
                            ? <span className="text-2xl">{icon}</span>
                            : <span className="text-xl">{icon}</span>
                    )}
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{title}</h3>
                </div>
                {action && (
                    <Link 
                        href={action.href} 
                        className="text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400 transition-colors"
                    >
                        {action.label} →
                    </Link>
                )}
            </div>
            {children}
        </div>
    );
};