// components/dashboard/charts/BaseChart.tsx
import React from 'react';

interface BaseChartProps {
    title: string;
    icon?: string;
    children: React.ReactNode;
    height?: number;
    action?: { label: string; href: string };
}

export const BaseChart: React.FC<BaseChartProps> = ({
    title,
    icon,
    children,
    height = 300,
    action
}) => (
    <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
        <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
                {icon && <span className="text-2xl">{icon}</span>}
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{title}</h3>
            </div>
            {action && (
                <a
                    href={action.href}
                    className="text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400"
                >
                    {action.label} →
                </a>
            )}
        </div>
        <div style={{ height: `${height}px` }} className="w-full">
            {children}
        </div>
    </div>
);