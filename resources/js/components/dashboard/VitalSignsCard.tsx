import React from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';

interface VitalValue {
    range: string;
    count: number;
    percentage: number;
    status?: 'normal' | 'warning' | 'critical';
}

interface VitalSignsCardProps {
    title: string;
    icon: React.ReactNode;
    normalRange: string;
    values: VitalValue[];
    trend?: number;
}

export function VitalSignsCard({
    title,
    icon,
    normalRange,
    values,
    trend,
}: VitalSignsCardProps) {
    const getBarColor = (status?: string) => {
        switch (status) {
            case 'critical':
                return 'bg-red-500';
            case 'warning':
                return 'bg-amber-500';
            default:
                return 'bg-green-500';
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
            <div className="mb-2 text-xs text-slate-500 dark:text-slate-400">
                Normal range: {normalRange}
            </div>
            <div className="space-y-2">
                {values.map((value, idx) => (
                    <div key={idx}>
                        <div className="mb-1 flex justify-between text-xs">
                            <span className="text-slate-600 dark:text-slate-400">
                                {value.range}
                            </span>
                            <span className="font-medium text-slate-900 dark:text-slate-100">
                                {value.count} ({value.percentage}%)
                            </span>
                        </div>
                        <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
                            <div
                                className={`h-full rounded-full ${getBarColor(value.status)}`}
                                style={{ width: `${value.percentage}%` }}
                            />
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
