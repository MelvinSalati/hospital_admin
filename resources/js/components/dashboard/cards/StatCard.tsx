import React from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface StatCardProps {
    title: string;
    value: string | number;
    icon: React.ReactNode;
    trend?: {
        value: number;
        direction: 'up' | 'down' | 'stable';
        label?: string;
    };
    subtitle?: string;
    color?: 'blue' | 'green' | 'red' | 'yellow' | 'purple' | 'amber';
    bgGradient?: boolean;
}

const colorConfig = {
    blue: { bg: 'bg-blue-100', light: 'text-gray-600' },
    green: { bg: 'bg-green-100', light: 'text-green-600' },
    red: { bg: 'from-red-600 to-red-400', light: 'bg-red-50 text-red-600' },
    yellow: { bg: 'bg-yellow-100', light: 'bg-yellow-50 text-yellow-600' },
    purple: { bg: 'bg-purple-100', light: 'bg-purple-50 text-purple-600' },
    amber: { bg: 'bg-amber-100', light: 'bg-amber-50 text-amber-600' }
};

export const StatCard: React.FC<StatCardProps> = ({
    title,
    value,
    icon,
    trend,
    subtitle,
    color = 'blue',
    bgGradient = true
}) => {

    const TrendIcon = () => {
        if (!trend) return null;
        switch (trend.direction) {
            case 'up':
                return <TrendingUp className="h-3 w-3" />;
            case 'down':
                return <TrendingDown className="h-3 w-3" />;
            default:
                return <Minus className="h-3 w-3" />;
        }
    };

    const trendColor =
        trend?.direction === 'up'
            ? 'text-green-600'
            : trend?.direction === 'down'
            ? 'text-red-600'
            : 'text-gray-500';

    if (bgGradient) {
        return (
            <div className={`relative overflow-hidden rounded-lg bg-gradient-to-br ${colorConfig[color].bg} p-3 text-white shadow-md`}>

                <div className="flex items-center justify-between">
                    <p className="text-xs font-medium text-gray-600">{title}</p>
                    <div className="text-xl text-gray-600">{icon}</div>
                </div>
                <p className="mt-1 text-xl text-gray-600">{value}</p>

                {trend && (
                    <div className="flex items-center gap-1 text-[10px] text-white/80">
                        <TrendIcon />
                        <span>{trend.value}% {trend.label || ''}</span>
                    </div>
                )}

                {subtitle && (
                    <p className="text-[10px] text-white/70">{subtitle}</p>
                )}
            </div>
        );
    }

    return (
        <div className="rounded-lg border border-gray-200 bg-white p-3 shadow-sm dark:border-gray-700 dark:bg-gray-800">

            <div className="flex items-center justify-between">

                <div>
                    <p className="text-xs font-medium text-gray-500 dark:text-gray-400">
                        {title}
                    </p>

                    <p className="mt-1 text-xl font-bold text-gray-900 dark:text-white">
                        {value}
                    </p>

                    {trend && (
                        <div className={`mt-1 flex items-center gap-1 text-[10px] ${trendColor}`}>
                            <TrendIcon />
                            <span>{trend.value}% {trend.label || ''}</span>
                        </div>
                    )}

                    {subtitle && (
                        <p className="text-[10px] text-gray-500">
                            {subtitle}
                        </p>
                    )}
                </div>

                <div className={`rounded-md ${colorConfig[color].light} p-2 text-lg`}>
                    {icon}
                </div>

            </div>

        </div>
    );
};
