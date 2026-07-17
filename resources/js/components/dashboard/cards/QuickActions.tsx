// components/dashboard/cards/QuickActions.tsx
import React from 'react';
import { Link } from '@inertiajs/react';
import { DashboardCard } from './DashboardCard';

interface QuickAction {
    icon: React.ReactNode;
    label: string;
    href: string;
    color?: 'blue' | 'green' | 'yellow' | 'purple' | 'red';
    badge?: number;
}

interface QuickActionsProps {
    actions: QuickAction[];
    columns?: 2 | 3 | 4;
    title?: string;
    icon?: string;
}

const colorClasses = {
    blue: 'bg-blue-50 text-blue-700 hover:bg-blue-100 dark:bg-blue-900/20 dark:text-blue-300',
    green: 'bg-green-50 text-green-700 hover:bg-green-100 dark:bg-green-900/20 dark:text-green-300',
    yellow: 'bg-yellow-50 text-yellow-700 hover:bg-yellow-100 dark:bg-yellow-900/20 dark:text-yellow-300',
    purple: 'bg-purple-50 text-purple-700 hover:bg-purple-100 dark:bg-purple-900/20 dark:text-purple-300',
    red: 'bg-red-50 text-red-700 hover:bg-red-100 dark:bg-red-900/20 dark:text-red-300'
};

export const QuickActions: React.FC<QuickActionsProps> = ({
    actions,
    columns = 4,
    title = 'Quick Actions',
    icon = '⚡'
}) => {
    const gridCols = {
        2: 'grid-cols-2',
        3: 'grid-cols-3',
        4: 'grid-cols-4'
    };

    return (
       <></>
    );
};