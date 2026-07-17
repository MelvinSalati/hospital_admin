// ============================================================
// StatCard — Summary metric card (Ultra Compact)
// ============================================================
import React from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import type { TrendData } from '../../types';

interface StatCardProps {
    title: string;
    value: string | number;
    icon: React.ReactNode;
    trend?: TrendData;
    loading?: boolean;
    colorScheme?: 'blue' | 'yellow' | 'green' | 'purple';
}

const trendConfig = {
    up: {
        icon: TrendingUp,
        color: 'text-emerald-600',
        bg: 'bg-emerald-50 dark:bg-emerald-900/20',
    },
    down: {
        icon: TrendingDown,
        color: 'text-red-500',
        bg: 'bg-red-50 dark:bg-red-900/20',
    },
    neutral: {
        icon: Minus,
        color: 'text-slate-400',
        bg: 'bg-slate-100 dark:bg-slate-800',
    },
};

const colorSchemes = {
    blue: 'bg-blue-50 border-blue-200 dark:bg-blue-950/30 dark:border-blue-800',
    yellow: 'bg-yellow-50 border-yellow-200 dark:bg-yellow-950/30 dark:border-yellow-800',
    green: 'bg-green-50 border-green-200 dark:bg-green-950/30 dark:border-green-800',
    purple: 'bg-purple-50 border-purple-200 dark:bg-purple-950/30 dark:border-purple-800',
};

export function StatCard({
    title,
    value,
    icon,
    trend,
    loading = false,
    colorScheme = '',
}: StatCardProps) {
    const trendInfo = trend ? trendConfig[trend.direction] : null;
    const TrendIcon = trendInfo?.icon;
    console.log('StatCard rendering with colorScheme:', colorScheme);
    if (loading) {
        return (
            <div className="animate-pulse rounded-lg border border-slate-200 bg-white p-2 dark:border-slate-700 dark:bg-slate-800">
                <div className="h-3 w-20 rounded bg-slate-200 dark:bg-slate-700" />
                <div className="mt-1 h-5 w-28 rounded bg-slate-200 dark:bg-slate-700" />
            </div>
        );
    }

    return (
        <div className={`rounded-md`}>
            <div className="flex items-center justify-between gap-2">
                <div className="min-w-0 flex-1 bg-red-800">
                    <p className="truncate text-[10px] font-medium tracking-wide text-slate-500 uppercase dark:text-slate-400">
                        {title}
                    </p>

                    <div className="mt-1">
                        <span className="text-base font-bold text-slate-900 dark:text-white">
                            {value}
                        </span>
                    </div>

                    {trend && TrendIcon && (
                        <div className="mt-1">
                            <span
                                className={`inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[9px] font-medium ${trendInfo.bg} ${trendInfo.color}`}
                            >
                                <TrendIcon className="h-2.5 w-2.5" />
                                <span>
                                    {typeof trend === 'object'
                                        ? trend.percentage
                                        : trend}
                                    %
                                </span>
                            </span>
                        </div>
                    )}
                </div>

                <div className="flex-shrink-0 rounded-full bg-white/60 p-1.5 shadow-sm dark:bg-slate-800/60">
                    {React.cloneElement(icon as React.ReactElement, {
                        className: 'h-3.5 w-3.5',
                    })}
                </div>
            </div>
        </div>
    );
}
