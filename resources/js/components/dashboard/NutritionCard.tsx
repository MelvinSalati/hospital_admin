import React from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';

interface Category {
    name: string;
    count: number;
    percentage: number;
    status: 'normal' | 'warning' | 'critical' | 'info';
}

interface NutritionCardProps {
    title: string;
    icon: React.ReactNode;
    categories: Category[];
    trend?: number;
}

export function NutritionCard({
    title,
    icon,
    categories,
    trend,
}: NutritionCardProps) {
    const getStatusColor = (status: string) => {
        switch (status) {
            case 'critical':
                return 'text-red-600';
            case 'warning':
                return 'text-amber-600';
            case 'info':
                return 'text-blue-600';
            default:
                return 'text-green-600';
        }
    };

    return (
        <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800">
            <div className="mb-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <div className="text-slate-500 dark:text-slate-400">
                        {icon}
                    </div>
                    <h3 className="font-semibold text-slate-900 dark:text-slate-100">
                        {title}
                    </h3>
                </div>
                {trend !== undefined && (
                    <div
                        className={`flex items-center gap-1 text-xs ${trend >= 0 ? 'text-red-600' : 'text-green-600'}`}
                    >
                        {trend >= 0 ? (
                            <TrendingUp className="h-3 w-3" />
                        ) : (
                            <TrendingDown className="h-3 w-3" />
                        )}
                        <span>{Math.abs(trend)}%</span>
                    </div>
                )}
            </div>
            <div className="grid grid-cols-2 gap-3">
                {categories.map((cat, idx) => (
                    <div key={idx} className="text-center">
                        <div
                            className={`text-2xl font-bold ${getStatusColor(cat.status)}`}
                        >
                            {cat.count}
                        </div>
                        <div className="text-xs text-slate-500 dark:text-slate-400">
                            {cat.name}
                        </div>
                        <div className="mt-1 text-xs text-slate-600 dark:text-slate-500">
                            {cat.percentage}% of total
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
