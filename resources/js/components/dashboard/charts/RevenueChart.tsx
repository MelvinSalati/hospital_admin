// components/dashboard/charts/RevenueChart.tsx
import React from 'react';
import {
    LineChart,
    Line,
    AreaChart,
    Area,
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
    ComposedChart
} from 'recharts';
import { BaseChart } from './BaseChart';
import type { RevenueTrendData } from '@/types/dashboard';

interface RevenueChartProps {
    data: RevenueTrendData[];
    showExpenses?: boolean;
    title?: string;
    icon?: string;
    height?: number;
}

export const RevenueChart: React.FC<RevenueChartProps> = ({
    data,
    showExpenses = false,
    title = 'Revenue Trend',
    icon = '📈',
    height = 300
}) => {
    const CustomTooltip = ({ active, payload, label }: any) => {
        if (active && payload && payload.length) {
            return (
                <div className="rounded-lg border border-gray-200 bg-white p-3 shadow-lg dark:border-gray-700 dark:bg-gray-800">
                    <p className="font-medium text-gray-900 dark:text-white">{label}</p>
                    {payload.map((entry: any, index: number) => (
                        <p key={index} style={{ color: entry.color }} className="text-sm">
                            {entry.name}: ₦{entry.value.toLocaleString()}
                        </p>
                    ))}
                </div>
            );
        }
        return null;
    };

    return (
        <BaseChart title={title} icon={icon} height={height}>
            <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={data}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200 dark:stroke-gray-700" />
                    <XAxis
                        dataKey="month"
                        className="text-xs text-gray-600 dark:text-gray-400"
                    />
                    <YAxis
                        className="text-xs text-gray-600 dark:text-gray-400"
                        tickFormatter={(value) => `₦${(value / 1000)}k`}
                    />
                    <Tooltip content={CustomTooltip} />
                    <Legend />
                    <Area
                        type="monotone"
                        dataKey="revenue"
                        fill="#3b82f6"
                        stroke="#2563eb"
                        fillOpacity={0.3}
                        name="Revenue"
                    />
                    {showExpenses && (
                        <>
                            <Bar dataKey="expenses" fill="#ef4444" name="Expenses" barSize={20} />
                            <Line
                                type="monotone"
                                dataKey="profit"
                                stroke="#10b981"
                                strokeWidth={2}
                                name="Profit"
                            />
                        </>
                    )}
                </ComposedChart>
            </ResponsiveContainer>
        </BaseChart>
    );
};